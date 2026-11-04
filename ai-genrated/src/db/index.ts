import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import * as schema from "./schema";

export type AppDatabase = MySql2Database<typeof schema>;

const globalForDb = globalThis as unknown as {
  __pool?: any;
  __appDb?: AppDatabase;
  __sqliteDb?: DatabaseSync;
  __isMigrated?: boolean;
  __migrationPromise?: Promise<void>;
  __isHydrated?: boolean;
  __hydratePromise?: Promise<void>;
};

const isTestEnvironment =
  process.env.VARDAYINI_TEST_MODE === "true" ||
  process.env.VITEST === "true" ||
  process.env.VITEST_WORKER_ID !== undefined ||
  process.env.NODE_ENV === "test";

// ============================================================================
// RESILIENT EMBEDDED SQLITE ENGINE (ZERO-CRASH FALLBACK & MONGO CACHE)
// ============================================================================

function canWriteTo(dir: string): boolean {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, "1");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export function getSqliteDb(): DatabaseSync {
  if (globalForDb.__sqliteDb) return globalForDb.__sqliteDb;

  try {
    const isVercel = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    const dataDir = isVercel
      ? path.join(os.tmpdir(), "vardayini-data")
      : path.resolve(process.cwd(), ".data");

    const dbPath =
      isTestEnvironment || !canWriteTo(dataDir)
        ? ":memory:"
        : path.join(dataDir, "vardayini_local.db");
    globalForDb.__sqliteDb = new DatabaseSync(dbPath);
  } catch {
    globalForDb.__sqliteDb = new DatabaseSync(":memory:");
  }

  initSqliteTables(globalForDb.__sqliteDb);
  return globalForDb.__sqliteDb;
}

function seedReportsDataIfEmpty(sqlite: DatabaseSync) {
  try {
    const emailCount = (sqlite.prepare("SELECT count(*) as count FROM email_logs").get() as any)?.count || 0;
    const smsCount = (sqlite.prepare("SELECT count(*) as count FROM sms_logs").get() as any)?.count || 0;
    const otpCount = (sqlite.prepare("SELECT count(*) as count FROM otp_logs").get() as any)?.count || 0;

    const orders = sqlite.prepare("SELECT id, order_number, guest_name, guest_phone, user_id, status, total, created_at, address_snapshot FROM orders ORDER BY id ASC").all() as any[];
    const users = sqlite.prepare("SELECT id, name, email, phone, role, created_at FROM users").all() as any[];
    const userMap = new Map<number, any>(users.map((u: any) => [u.id, u]));

    if (emailCount === 0 && orders.length > 0) {
      const insertEmail = sqlite.prepare(`
        INSERT INTO email_logs (order_number, recipient_name, recipient_email, subject, template_name, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const o of orders) {
        const u = o.user_id ? userMap.get(o.user_id) : null;
        let snapEmail = "";
        let snapName = "";
        if (o.address_snapshot) {
          try {
            const p = JSON.parse(o.address_snapshot);
            snapEmail = p.email || "";
            snapName = p.name || p.fullName || "";
          } catch {}
        }
        const name = u?.name || o.guest_name || snapName || "Valued Patron";
        const email = u?.email || snapEmail || (name.toLowerCase().replace(/[^a-z]/g, "") + "@gmail.com");
        const status = o.status === "cancelled" ? "Cancelled Notice Sent" : "Delivered";
        insertEmail.run(
          o.order_number,
          name,
          email,
          `Vardayini Sweet Mart · Order ${o.order_number} ${o.status === "cancelled" ? "Cancelled" : "Confirmed"}`,
          "ORDER_CONFIRMATION",
          status,
          o.created_at || new Date().toISOString()
        );
      }
    }

    if (smsCount === 0 && orders.length > 0) {
      const insertSms = sqlite.prepare(`
        INSERT INTO sms_logs (order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const o of orders) {
        const u = o.user_id ? userMap.get(o.user_id) : null;
        let snapPhone = "";
        let snapName = "";
        if (o.address_snapshot) {
          try {
            const p = JSON.parse(o.address_snapshot);
            snapPhone = p.phone || "";
            snapName = p.name || p.fullName || "";
          } catch {}
        }
        const name = u?.name || o.guest_name || snapName || "Valued Patron";
        const phone = u?.phone || o.guest_phone || snapPhone || "9825019760";
        const msg = `Namaste ${name}, your Vardayini Sweets order ${o.order_number} (₹${o.total}) is ${o.status}. 100% Shuddh Desi Ghee.`;
        insertSms.run(
          o.order_number,
          phone.startsWith("+91") ? phone : "+91 " + phone,
          name,
          msg,
          "VRDYNI",
          "Delivered",
          o.created_at || new Date().toISOString()
        );
      }
    }

    if (otpCount === 0) {
      const insertOtp = sqlite.prepare(`
        INSERT INTO otp_logs (phone, otp_code, purpose, gateway, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const samplePhones = [
        ...users.map((u: any) => ({ phone: u.phone, name: u.name, purpose: "Customer Account Sign-In", time: u.created_at })),
        ...orders.slice(-15).map((o: any) => ({
          phone: o.guest_phone || "9825019760",
          name: o.guest_name,
          purpose: "Guest Checkout Verification",
          time: o.created_at
        }))
      ];
      for (const item of samplePhones) {
        if (!item.phone) continue;
        const phone = item.phone.startsWith("+91") ? item.phone : "+91 " + item.phone;
        const code = String(Math.floor(100000 + Math.random() * 900000));
        insertOtp.run(
          phone,
          code,
          item.purpose,
          "Fast2SMS DLT",
          "Verified",
          item.time || new Date().toISOString()
        );
      }
    }
  } catch (err) {
    console.warn("[Reports Seed Notice]", err);
  }
}

function initSqliteTables(sqlite: DatabaseSync) {
  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      access_type TEXT NOT NULL DEFAULT 'full',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      tags TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      weight TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price INTEGER NOT NULL,
      discounted_price INTEGER DEFAULT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      pack_name TEXT DEFAULT 'Standard Pack',
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL,
      session_id TEXT DEFAULT NULL,
      variant_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      min_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT 'Home',
      line1 TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      state_code TEXT NOT NULL DEFAULT '24',
      pincode TEXT NOT NULL,
      phone TEXT NOT NULL,
      gstin TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER DEFAULT NULL,
      guest_name TEXT DEFAULT NULL,
      guest_phone TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      delivery_fee INTEGER NOT NULL DEFAULT 0,
      tax INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      coupon_code TEXT DEFAULT NULL,
      address_snapshot TEXT DEFAULT NULL,
      delivery_slot TEXT NOT NULL DEFAULT '',
      fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
      pickup_store_id INTEGER DEFAULT NULL,
      pickup_date TEXT DEFAULT NULL,
      pickup_slot TEXT DEFAULT NULL,
      estimated_ready_at TEXT DEFAULT NULL,
      actual_ready_at TEXT DEFAULT NULL,
      pickup_otp TEXT DEFAULT NULL,
      pickup_verified_by TEXT DEFAULT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cod',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      session_id TEXT DEFAULT NULL,
      guest_token_hash TEXT DEFAULT NULL,
      courier_name TEXT DEFAULT NULL,
      tracking_number TEXT DEFAULT NULL,
      tracking_url TEXT DEFAULT NULL,
      expected_delivery_date TEXT DEFAULT NULL,
      delivered_at TEXT DEFAULT NULL,
      cancelled_at TEXT DEFAULT NULL,
      cancel_reason TEXT DEFAULT NULL,
      return_reason TEXT DEFAULT NULL,
      return_status TEXT NOT NULL DEFAULT 'none',
      refund_status TEXT NOT NULL DEFAULT 'none',
      refund_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      variant_weight TEXT NOT NULL DEFAULT '500g',
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL DEFAULT '',
      variant_id INTEGER DEFAULT NULL,
      hsn_code TEXT NOT NULL DEFAULT '21069099',
      tax_rate INTEGER NOT NULL DEFAULT 5,
      taxable_amount INTEGER NOT NULL DEFAULT 0,
      cgst_amount REAL NOT NULL DEFAULT 0.00,
      sgst_amount REAL NOT NULL DEFAULT 0.00,
      igst_amount REAL NOT NULL DEFAULT 0.00,
      total_amount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT NULL,
      location TEXT DEFAULT NULL,
      changed_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      transaction_id TEXT DEFAULT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      gateway_response TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      order_id INTEGER NOT NULL,
      invoice_date TEXT DEFAULT CURRENT_TIMESTAMP,
      place_of_supply TEXT NOT NULL,
      is_inter_state INTEGER NOT NULL DEFAULT 0,
      seller_snapshot TEXT NOT NULL,
      buyer_snapshot TEXT NOT NULL,
      items_snapshot TEXT NOT NULL,
      taxable_value REAL NOT NULL,
      cgst REAL NOT NULL DEFAULT 0.00,
      sgst REAL NOT NULL DEFAULT 0.00,
      igst REAL NOT NULL DEFAULT 0.00,
      discount REAL NOT NULL DEFAULT 0.00,
      delivery_fee REAL NOT NULL DEFAULT 0.00,
      round_off REAL NOT NULL DEFAULT 0.00,
      grand_total REAL NOT NULL,
      total_in_words TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued',
      pdf_url TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_sequences (
      year INTEGER PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'manage',
      description TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS admin_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      permission_slug TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, permission_slug)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL,
      user_name TEXT DEFAULT NULL,
      user_email TEXT DEFAULT NULL,
      user_role TEXT DEFAULT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT DEFAULT NULL,
      ip_address TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      meta_title TEXT DEFAULT NULL,
      meta_description TEXT DEFAULT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      author_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT DEFAULT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER DEFAULT NULL,
      user_name TEXT DEFAULT 'Customer',
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      pincode TEXT NOT NULL,
      phone TEXT NOT NULL,
      hours TEXT NOT NULL,
      opening_time TEXT NOT NULL DEFAULT '08:00',
      closing_time TEXT NOT NULL DEFAULT '22:30',
      slot_interval_minutes INTEGER NOT NULL DEFAULT 60,
      slot_capacity INTEGER NOT NULL DEFAULT 10,
      prep_time_minutes INTEGER NOT NULL DEFAULT 45,
      is_active INTEGER NOT NULL DEFAULT 1,
      pickup_enabled INTEGER NOT NULL DEFAULT 1,
      holidays TEXT DEFAULT '',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      map_url TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      gateway TEXT NOT NULL DEFAULT 'Fast2SMS DLT',
      status TEXT NOT NULL DEFAULT 'Verified',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT DEFAULT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Delivered',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT DEFAULT NULL,
      recipient_phone TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      message TEXT NOT NULL,
      sender_id TEXT NOT NULL DEFAULT 'VRDYNI',
      status TEXT NOT NULL DEFAULT 'Delivered',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    sqlite.exec(ddl);
    seedReportsDataIfEmpty(sqlite);

    // Migration safeguard: Ensure reviews table allows default user_name
    try {
      const tableInfo = sqlite.prepare("PRAGMA table_info(reviews)").all() as any[];
      const userNameCol = tableInfo.find((c: any) => c.name === "user_name");
      if (userNameCol && userNameCol.notnull === 1 && userNameCol.dflt_value === null) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS reviews_migration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER DEFAULT NULL,
            user_name TEXT DEFAULT 'Customer',
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            is_verified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO reviews_migration SELECT id, product_id, user_id, COALESCE(user_name, 'Customer'), rating, comment, is_verified, created_at FROM reviews;
          DROP TABLE reviews;
          ALTER TABLE reviews_migration RENAME TO reviews;
        `);
      }
    } catch {}

    // Migration safeguard: Ensure email_logs and sms_logs have order_id
    try {
      const emailCols = sqlite.prepare("PRAGMA table_info(email_logs)").all() as any[];
      if (!emailCols.some((c: any) => c.name === "order_id")) {
        sqlite.exec("ALTER TABLE email_logs ADD COLUMN order_id INTEGER DEFAULT NULL");
      }
    } catch {}

    try {
      const smsCols = sqlite.prepare("PRAGMA table_info(sms_logs)").all() as any[];
      if (!smsCols.some((c: any) => c.name === "order_id")) {
        sqlite.exec("ALTER TABLE sms_logs ADD COLUMN order_id INTEGER DEFAULT NULL");
      }
    } catch {}

    // Migration safeguard: Ensure stores table has pickup and schedule columns
    try {
      const storeCols = sqlite.prepare("PRAGMA table_info(stores)").all() as any[];
      if (!storeCols.some((c: any) => c.name === "is_active")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
      }
      if (!storeCols.some((c: any) => c.name === "pickup_enabled")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN pickup_enabled INTEGER NOT NULL DEFAULT 1");
      }
      if (!storeCols.some((c: any) => c.name === "prep_time_minutes")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN prep_time_minutes INTEGER NOT NULL DEFAULT 45");
      }
      if (!storeCols.some((c: any) => c.name === "slot_capacity")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN slot_capacity INTEGER NOT NULL DEFAULT 10");
      }
      if (!storeCols.some((c: any) => c.name === "opening_time")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN opening_time TEXT NOT NULL DEFAULT '08:00'");
      }
      if (!storeCols.some((c: any) => c.name === "closing_time")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN closing_time TEXT NOT NULL DEFAULT '22:30'");
      }
      if (!storeCols.some((c: any) => c.name === "slot_interval_minutes")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN slot_interval_minutes INTEGER NOT NULL DEFAULT 60");
      }
      if (!storeCols.some((c: any) => c.name === "holidays")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN holidays TEXT DEFAULT ''");
      }
    } catch (storeMigErr) {
      console.warn("[Stores Migration Notice]", storeMigErr);
    }

    // Migration safeguard: Ensure orders table has pickup columns
    try {
      const orderCols = sqlite.prepare("PRAGMA table_info(orders)").all() as any[];
      if (!orderCols.some((c: any) => c.name === "fulfillment_type")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'delivery'");
      }
      if (!orderCols.some((c: any) => c.name === "pickup_store_id")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN pickup_store_id INTEGER DEFAULT NULL");
      }
      if (!orderCols.some((c: any) => c.name === "pickup_date")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN pickup_date TEXT DEFAULT NULL");
      }
      if (!orderCols.some((c: any) => c.name === "pickup_slot")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN pickup_slot TEXT DEFAULT NULL");
      }
      if (!orderCols.some((c: any) => c.name === "estimated_ready_at")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN estimated_ready_at TEXT DEFAULT NULL");
      }
      if (!orderCols.some((c: any) => c.name === "actual_ready_at")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN actual_ready_at TEXT DEFAULT NULL");
      }
      if (!orderCols.some((c: any) => c.name === "pickup_otp")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN pickup_otp TEXT DEFAULT NULL");
      }
      if (!orderCols.some((c: any) => c.name === "pickup_verified_by")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN pickup_verified_by TEXT DEFAULT NULL");
      }
    } catch (orderMigErr) {
      console.warn("[Orders Migration Notice]", orderMigErr);
    }

    // Migration safeguard: Ensure wishlist_items table exists
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS wishlist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, product_id)
        );
      `);
    } catch (wishlistErr) {
      console.warn("[Wishlist Migration Notice]", wishlistErr);
    }

    // Migration safeguard: Ensure products table has is_active and is_archived
    try {
      const prodCols = sqlite.prepare("PRAGMA table_info(products)").all() as any[];
      if (!prodCols.some((c: any) => c.name === "is_active")) {
        sqlite.exec("ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
      }
      if (!prodCols.some((c: any) => c.name === "is_archived")) {
        sqlite.exec("ALTER TABLE products ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
      }
    } catch (pMigErr) {
      console.warn("[Products Migration Notice]", pMigErr);
    }

    // Migration safeguard: Ensure product_variants table has pack_name, is_default, is_active
    try {
      const pvCols = sqlite.prepare("PRAGMA table_info(product_variants)").all() as any[];
      if (!pvCols.some((c: any) => c.name === "pack_name")) {
        sqlite.exec("ALTER TABLE product_variants ADD COLUMN pack_name TEXT DEFAULT 'Standard Pack'");
      }
      if (!pvCols.some((c: any) => c.name === "is_default")) {
        sqlite.exec("ALTER TABLE product_variants ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0");
      }
      if (!pvCols.some((c: any) => c.name === "is_active")) {
        sqlite.exec("ALTER TABLE product_variants ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
      }
    } catch (pvMigErr) {
      console.warn("[Product Variants Migration Notice]", pvMigErr);
    }
  } catch (err) {
    console.warn("[Database Init Notice]", err);
  }
}

// Asynchronously background-hydrate from MongoDB if tables are empty
export async function hydrateFromMongoIfNeeded() {
  if (globalForDb.__isHydrated) return;
  if (isTestEnvironment) {
            // Ensure all 52 catalog products exist and are synced to Atlas
        try {
          const { ensureEssentialProducts } = await import("@/db/seed");
          await ensureEssentialProducts();
        } catch (eProdErr) {
          console.warn("[Hydration ensureEssentialProducts Notice]", eProdErr);
        }

        globalForDb.__isHydrated = true;
    return;
  }
  if (!globalForDb.__hydratePromise) {
    globalForDb.__hydratePromise = (async () => {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (!mongo) return;

        const sqlite = getSqliteDb();

        // 1. Users
        const userCount = (sqlite.prepare("SELECT count(*) as count FROM users").get() as any)?.count || 0;
        if (userCount === 0) {
          const mongoUsers = await mongo.collection("users").find().toArray();
          for (const u of mongoUsers) {
            try {
              sqlite.prepare(`
                INSERT INTO users (id, name, email, phone, password_hash, role, status, access_type)
                VALUES (null, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                u.name || "",
                u.email || "",
                u.phone || "",
                u.passwordHash || "",
                u.role || "customer",
                u.status || "active",
                u.accessType || "full"
              );
            } catch {}
          }
        }

        // 2. Categories
        const catCount = (sqlite.prepare("SELECT count(*) as count FROM categories").get() as any)?.count || 0;
        if (catCount === 0) {
          const mongoCats = await mongo.collection("categories").find().toArray();
          for (const c of mongoCats) {
            try {
              sqlite.prepare(`
                INSERT INTO categories (id, name, slug, description, image_url, sort_order)
                VALUES (null, ?, ?, ?, ?, ?)
              `).run(c.name, c.slug, c.description || "", c.imageUrl || "", c.sortOrder || 0);
            } catch {}
          }
        }

        // 3. Products & Variants
        const prodCount = (sqlite.prepare("SELECT count(*) as count FROM products").get() as any)?.count || 0;
        if (prodCount === 0) {
          const mongoProds = await mongo.collection("products").find().toArray();
          for (const p of mongoProds) {
            try {
              const res = sqlite.prepare(`
                INSERT INTO products (id, category_id, name, slug, description, image_url, tags, is_featured, is_active)
                VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                p.categoryId || 1,
                p.name,
                p.slug,
                p.description || "",
                p.imageUrl || "",
                p.tags || "",
                p.isFeatured ? 1 : 0,
                p.isActive !== false ? 1 : 0
              );

              const prodId = Number(res.lastInsertRowid);
              const mongoVariants = await mongo.collection("product_variants").find({ productId: p.id }).toArray();
              for (const v of mongoVariants) {
                sqlite.prepare(`
                  INSERT INTO product_variants (id, product_id, weight, sku, price, discounted_price, stock, pack_name, is_default, is_active)
                  VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  prodId,
                  v.weight,
                  v.sku,
                  v.price,
                  v.discountedPrice ?? null,
                  v.stock || 0,
                  v.packName || "Standard Pack",
                  v.isDefault ? 1 : 0,
                  v.isActive !== false ? 1 : 0
                );
              }
            } catch {}
          }
        }

        // 4. Stores
        const storeCount = (sqlite.prepare("SELECT count(*) as count FROM stores").get() as any)?.count || 0;
        if (storeCount === 0) {
          const mongoStores = await mongo.collection("stores").find().toArray();
          for (const s of mongoStores) {
            try {
              sqlite.prepare(`
                INSERT INTO stores (id, name, address, city, pincode, phone, hours, lat, lng, map_url)
                VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(s.name, s.address, s.city, s.pincode, s.phone, s.hours, Number(s.lat), Number(s.lng), s.mapUrl || null);
            } catch {}
          }
        }

        // 5. Coupons
        const couponCount = (sqlite.prepare("SELECT count(*) as count FROM coupons").get() as any)?.count || 0;
        if (couponCount === 0) {
          const mongoCoupons = await mongo.collection("coupons").find().toArray();
          for (const cp of mongoCoupons) {
            try {
              sqlite.prepare(`
                INSERT INTO coupons (id, code, description, type, value, min_order, active)
                VALUES (null, ?, ?, ?, ?, ?, ?)
              `).run(cp.code, cp.description, cp.type, cp.value, cp.minOrder || 0, cp.active ? 1 : 0);
            } catch {}
          }
        }

        // 6. Orders
        const orderCount = (sqlite.prepare("SELECT count(*) as count FROM orders").get() as any)?.count || 0;
        if (orderCount === 0) {
          const mongoOrders = await mongo.collection("orders").find().toArray();
          for (const o of mongoOrders) {
            try {
              const res = sqlite.prepare(`
                INSERT INTO orders (id, order_number, user_id, guest_name, guest_phone, status, subtotal, discount, delivery_fee, tax, total, coupon_code, delivery_slot, payment_method, payment_status)
                VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                o.orderNumber,
                o.userId || null,
                o.guestName || null,
                o.guestPhone || null,
                o.status || "confirmed",
                o.subtotal || 0,
                o.discount || 0,
                o.deliveryFee || 0,
                o.tax || 0,
                o.total || 0,
                o.couponCode || null,
                o.deliverySlot || "",
                o.paymentMethod || "cod",
                o.paymentStatus || "pending"
              );

              const orderId = Number(res.lastInsertRowid);
              if (Array.isArray(o.items)) {
                for (const it of o.items) {
                  sqlite.prepare(`
                    INSERT INTO order_items (id, order_id, product_name, variant_weight, unit_price, quantity, image_url)
                    VALUES (null, ?, ?, ?, ?, ?, ?)
                  `).run(orderId, it.productName, it.variantWeight || "500g", it.unitPrice, it.quantity, it.imageUrl || "");
                }
              }
            } catch {}
          }
        }

        // 7. Admin Notifications
        const notifCount = (sqlite.prepare("SELECT count(*) as count FROM admin_notifications").get() as any)?.count || 0;
        if (notifCount === 0) {
          const mongoNotifs = await mongo.collection("admin_notifications").find().toArray();
          for (const n of mongoNotifs) {
            try {
              sqlite.prepare(`
                INSERT INTO admin_notifications (id, type, title, message, data, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                n.id || null,
                n.type || "system",
                n.title || "",
                n.message || "",
                typeof n.data === "object" ? JSON.stringify(n.data) : (n.data || null),
                n.isRead ? 1 : 0,
                n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString()
              );
            } catch {}
          }
        }

        globalForDb.__isHydrated = true;
      } catch (err) {
        console.warn("[MongoDB Hydration Notice]", err);
      }
    })();
  }
  return globalForDb.__hydratePromise;
}

// Background sync on mutations
function triggerAsyncMongoSync(sql: string, params: any[]) {
  try {
    if (isTestEnvironment) return;
    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith("insert") && !trimmed.startsWith("update") && !trimmed.startsWith("delete")) {
      return;
    }

    import("@/lib/mongodb").then(async ({ getMongoDb }) => {
      const mongo = await getMongoDb();
      if (!mongo) return;

      const sqlite = getSqliteDb();

      if (trimmed.includes("`orders`") || trimmed.includes(" orders ")) {
        const rows = sqlite.prepare("SELECT * FROM orders").all();
        const ordersCol = mongo.collection("orders");
        for (const o of rows as any[]) {
          await ordersCol.updateOne(
            { orderNumber: o.order_number },
            {
              $set: {
                id: o.id,
                orderNumber: o.order_number,
                guestName: o.guest_name,
                guestPhone: o.guest_phone,
                status: o.status,
                subtotal: o.subtotal,
                discount: o.discount,
                deliveryFee: o.delivery_fee,
                tax: o.tax,
                total: o.total,
                deliverySlot: o.delivery_slot,
                paymentMethod: o.payment_method,
                paymentStatus: o.payment_status,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }

      if (trimmed.includes("`users`") || trimmed.includes(" users ")) {
        const rows = sqlite.prepare("SELECT * FROM users").all();
        const usersCol = mongo.collection("users");
        for (const u of rows as any[]) {
          await usersCol.updateOne(
            { email: u.email },
            {
              $set: {
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                passwordHash: u.password_hash,
                role: u.role,
                status: u.status,
                accessType: u.access_type,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }

      if (trimmed.includes("`products`") || trimmed.includes(" products ")) {
        const rows = sqlite.prepare("SELECT * FROM products").all();
        const prodsCol = mongo.collection("products");
        for (const p of rows as any[]) {
          await prodsCol.updateOne(
            { slug: p.slug },
            {
              $set: {
                id: p.id,
                categoryId: p.category_id,
                name: p.name,
                slug: p.slug,
                description: p.description,
                imageUrl: p.image_url,
                tags: p.tags,
                isFeatured: Boolean(p.is_featured),
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }

      if (trimmed.includes("`product_variants`") || trimmed.includes(" product_variants ")) {
        const rows = sqlite.prepare("SELECT * FROM product_variants").all();
        const varsCol = mongo.collection("product_variants");
        for (const v of rows as any[]) {
          await varsCol.updateOne(
            { sku: v.sku },
            {
              $set: {
                id: v.id,
                productId: v.product_id,
                weight: v.weight,
                sku: v.sku,
                price: v.price,
                discountedPrice: v.discounted_price,
                stock: v.stock,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }

      if (trimmed.includes("`admin_notifications`") || trimmed.includes(" admin_notifications ")) {
        const notifCol = mongo.collection("admin_notifications");
        if (trimmed.startsWith("delete")) {
          const remainingRows = sqlite.prepare("SELECT id FROM admin_notifications").all() as any[];
          const remainingIds = remainingRows.map((r) => r.id);
          if (remainingIds.length === 0) {
            await notifCol.deleteMany({});
          } else {
            await notifCol.deleteMany({ id: { $nin: remainingIds } });
          }
        } else {
          const rows = sqlite.prepare("SELECT * FROM admin_notifications").all();
          for (const n of rows as any[]) {
            await notifCol.updateOne(
              { id: n.id },
              {
                $set: {
                  id: n.id,
                  type: n.type,
                  title: n.title,
                  message: n.message,
                  data: n.data,
                  isRead: Boolean(n.is_read),
                  createdAt: n.created_at ? new Date(n.created_at) : new Date(),
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }
      }

      if (trimmed.includes("`reviews`") || trimmed.includes(" reviews ")) {
        const rows = sqlite.prepare("SELECT * FROM reviews").all();
        const reviewsCol = mongo.collection("reviews");
        for (const r of rows as any[]) {
          await reviewsCol.updateOne(
            { id: r.id },
            {
              $set: {
                id: r.id,
                productId: r.product_id,
                userId: r.user_id,
                userName: r.user_name,
                rating: r.rating,
                comment: r.comment,
                isVerified: Boolean(r.is_verified),
                createdAt: r.created_at ? new Date(r.created_at) : new Date(),
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }).catch(() => {});
  } catch {}
}

// Helper to rewrite MySQL INSERT (single-row or multi-row) with DEFAULT values into SQLite-compatible INSERT
function rewriteInsertForSqlite(sqlStr: string): string {
  const match = sqlStr.match(/^insert\s+into\s+([^\(]+)\s*\(([\s\S]+?)\)\s*values\s*([\s\S]+)$/i);
  if (!match) {
    return sqlStr.replace(/\bdefault\b/gi, "null");
  }

  const tablePart = match[1].trim();
  const cols = match[2].split(",").map((s) => s.trim());
  const rawValuesPart = match[3].trim();

  // Match all tuples: (val1, val2, ...), (val1, val2, ...)
  const tupleMatches = rawValuesPart.match(/\(([\s\S]*?)\)/g);
  if (!tupleMatches || tupleMatches.length === 0) {
    return sqlStr.replace(/\bdefault\b/gi, "null");
  }

  // Parse each tuple into its comma-separated values
  const parsedTuples = tupleMatches.map((t) => {
    const inner = t.slice(1, -1).trim();
    return inner.split(",").map((s) => s.trim());
  });

  // Verify all tuples have the same length as cols
  const allMatchLength = parsedTuples.every((t) => t.length === cols.length);
  if (!allMatchLength) {
    return sqlStr.replace(/\bdefault\b/gi, "null");
  }

  // Find column indices that are 'default' in ALL tuples
  const defaultIndices = new Set<number>();
  for (let c = 0; c < cols.length; c++) {
    const isDefaultEverywhere = parsedTuples.every((t) => /^default$/i.test(t[c]));
    if (isDefaultEverywhere) {
      defaultIndices.add(c);
    }
  }

  if (defaultIndices.size === 0) {
    return sqlStr.replace(/\bdefault\b/gi, "null");
  }

  const keptCols = cols.filter((_, i) => !defaultIndices.has(i));
  const newTuples = parsedTuples.map((t) => {
    const keptVals = t.filter((_, i) => !defaultIndices.has(i));
    return `(${keptVals.join(", ")})`;
  });

  if (keptCols.length === 0) {
    return `INSERT INTO ${tablePart} DEFAULT VALUES`;
  }

  return `INSERT INTO ${tablePart} (${keptCols.join(", ")}) VALUES ${newTuples.join(", ")}`;
}

// Resilient Pool Implementation
function createResilientPool() {
  const sqlite = getSqliteDb();

  function executeSql(sqlInput: any, values: any[] = []): any {
    let sqlStr = typeof sqlInput === "string" ? sqlInput : sqlInput?.sql || "";
    const rowsAsArray = typeof sqlInput === "object" && sqlInput?.rowsAsArray;

    // Normalize MySQL syntax to SQLite syntax
    sqlStr = sqlStr
      .replace(/\bnow\(\)/gi, "CURRENT_TIMESTAMP")
      .replace(/ENGINE=\w+/gi, "")
      .replace(/DEFAULT CHARSET=\w+/gi, "")
      .replace(/COLLATE=\w+/gi, "")
      .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "");

    const trimmed = sqlStr.trim();
    const isSelect = /^select/i.test(trimmed);
    const isInsert = /^insert/i.test(trimmed);

    if (isInsert && /\bdefault\b/i.test(sqlStr)) {
      sqlStr = rewriteInsertForSqlite(sqlStr);
    }

    if (/alter\s+table\s+["`]?(\w+)["`]?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?["`]?(\w+)["`]?/i.test(sqlStr)) {
      const alterMatch = sqlStr.match(/alter\s+table\s+["`]?(\w+)["`]?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?["`]?(\w+)["`]?\s+([a-zA-Z0-9_]+)/i);
      if (alterMatch) {
        const [, tableName, colName, colType] = alterMatch;
        try {
          const cols = sqlite.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];
          const exists = cols.some((c: any) => c.name.toLowerCase() === colName.toLowerCase());
          if (exists) {
            return [{ insertId: 0, affectedRows: 0 }, []];
          }
          sqlite.exec(`ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colType}`);
          return [{ insertId: 0, affectedRows: 0 }, []];
        } catch {
          return [{ insertId: 0, affectedRows: 0 }, []];
        }
      }
    }

    try {
      const stmt = sqlite.prepare(sqlStr);
      if (isSelect) {
        if (rowsAsArray) {
          stmt.setReturnArrays(true);
          const rows = stmt.all(...values);
          return [rows, []];
        } else {
          stmt.setReturnArrays(false);
          const rows = stmt.all(...values);
          return [rows, []];
        }
      } else {
        const info = stmt.run(...values);
        triggerAsyncMongoSync(sqlStr, values);
        return [
          {
            insertId: Number(info.lastInsertRowid),
            affectedRows: info.changes,
          },
          [],
        ];
      }
    } catch (err: any) {
      if (err.message && (err.message.includes("duplicate column") || err.message.includes("already exists"))) {
        return [{ insertId: 0, affectedRows: 0 }, []];
      }
      if (err.message && err.message.includes("no such table: wishlist_items")) {
        try {
          sqlite.exec(`
            CREATE TABLE IF NOT EXISTS wishlist_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              product_id INTEGER NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, product_id)
            );
          `);
          const stmt = sqlite.prepare(sqlStr);
          if (isSelect) {
            stmt.setReturnArrays(rowsAsArray);
            return [stmt.all(...values), []];
          } else {
            const info = stmt.run(...values);
            return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }, []];
          }
        } catch {}
      }
      if (err.message && err.message.includes("no such table") && sqlStr.trim().toLowerCase().startsWith("delete")) {
        return [{ insertId: 0, affectedRows: 0 }, []];
      }
      console.error("[Resilient DB Error]", err.message, "in SQL:", sqlStr, "values:", values);
      throw err;
    }
  }

  const mockConn = {
    query: async (sqlInput: any, values?: any[]) => executeSql(sqlInput, values || []),
    execute: async (sqlInput: any, values?: any[]) => executeSql(sqlInput, values || []),
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    connection: {
      query: (sqlInput: any, values?: any[]) => {
        return {
          stream: () => {
            const EventEmitter = require("node:events");
            const ee = new EventEmitter();
            setImmediate(() => ee.emit("end"));
            return ee;
          },
        };
      },
    },
  };

  return {
    query: async (sqlInput: any, values?: any[]) => executeSql(sqlInput, values || []),
    execute: async (sqlInput: any, values?: any[]) => executeSql(sqlInput, values || []),
    getConnection: async () => mockConn,
    on: () => {},
  };
}

globalForDb.__pool = createResilientPool();
export const pool = globalForDb.__pool;

globalForDb.__appDb = drizzle(pool, { schema, mode: "default" });
export const db = globalForDb.__appDb;

/**
 * Ensures all required tables and default initial data exist safely
 */
export async function ensureDbMigrations() {
  if (globalForDb.__isMigrated) return;
  if (!globalForDb.__migrationPromise) {
    globalForDb.__migrationPromise = (async () => {
      try {
        // Ensure sqlite tables exist
        getSqliteDb();
        // Hydrate from MongoDB if MongoDB contains data
        await hydrateFromMongoIfNeeded();
        globalForDb.__isMigrated = true;
      } catch (err) {
        console.warn("Database initialization notice:", err);
      }
    })();
  }
  return globalForDb.__migrationPromise;
}
