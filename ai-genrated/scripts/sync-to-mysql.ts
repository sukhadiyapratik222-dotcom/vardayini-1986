import mysql from "mysql2/promise";
import { db } from "../src/db";
import { forceReseed } from "../src/db/seed";
import {
  addresses,
  categories,
  products,
  productVariants,
  coupons,
  stores,
  users,
  orders,
  orderItems,
} from "../src/db/schema";

async function main() {
  console.log("1. Ensuring PGlite is migrated and freshly seeded with addresses...");
  await forceReseed();

  console.log("2. Connecting to MySQL (localhost:3306 / vardayini_sweets)...");
  const mysqlConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE || "vardayini_sweets",
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  console.log("Connected to MySQL!");

  // Temporarily disable foreign key checks for clean batch load
  await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 0");

  try {
    // 1. Truncate existing tables
    const tablesToClean = [
      "order_items",
      "orders",
      "cart_items",
      "wishlist_items",
      "reviews",
      "addresses",
      "product_variants",
      "products",
      "categories",
      "stores",
      "coupons",
      "users",
    ];

    for (const t of tablesToClean) {
      await mysqlConn.query(`TRUNCATE TABLE \`${t}\``);
    }
    console.log("Truncated tables in MySQL.");

    // 2. Fetch from Drizzle
    const catRows = await db.select().from(categories);
    const prodRows = await db.select().from(products);
    const variantRows = await db.select().from(productVariants);
    const couponRows = await db.select().from(coupons);
    const storeRows = await db.select().from(stores);
    const userRows = await db.select().from(users);
    const addressRows = await db.select().from(addresses);
    const orderRows = await db.select().from(orders);
    const orderItemRows = await db.select().from(orderItems);

    console.log(
      `Fetched ${catRows.length} categories, ${prodRows.length} products, ${variantRows.length} variants, ${userRows.length} users, ${addressRows.length} addresses, ${orderRows.length} orders from source.`
    );

    // 3. Insert Categories
    for (const c of catRows) {
      await mysqlConn.query(
        "INSERT INTO categories (id, name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [c.id, c.name, c.slug, c.description, c.imageUrl, c.sortOrder]
      );
    }
    console.log(`Synced ${catRows.length} categories to MySQL.`);

    // 4. Insert Products
    for (const p of prodRows) {
      await mysqlConn.query(
        "INSERT INTO products (id, category_id, name, slug, description, image_url, tags, is_featured, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          p.id,
          p.categoryId,
          p.name,
          p.slug,
          p.description,
          p.imageUrl,
          p.tags,
          p.isFeatured ? 1 : 0,
          p.createdAt ? new Date(p.createdAt) : new Date(),
        ]
      );
    }
    console.log(`Synced ${prodRows.length} products to MySQL.`);

    // 5. Insert Variants
    for (const v of variantRows) {
      await mysqlConn.query(
        "INSERT INTO product_variants (id, product_id, weight, sku, price, discounted_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [v.id, v.productId, v.weight, v.sku, v.price, v.discountedPrice ?? null, v.stock]
      );
    }
    console.log(`Synced ${variantRows.length} product variants to MySQL.`);

    // 6. Insert Coupons
    for (const cp of couponRows) {
      await mysqlConn.query(
        "INSERT INTO coupons (id, code, description, type, value, min_order, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [cp.id, cp.code, cp.description, cp.type, cp.value, cp.minOrder, cp.active ? 1 : 0]
      );
    }
    console.log(`Synced ${couponRows.length} coupons to MySQL.`);

    // 7. Insert Stores
    for (const s of storeRows) {
      await mysqlConn.query(
        "INSERT INTO stores (id, name, address, city, pincode, phone, hours, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [s.id, s.name, s.address, s.city, s.pincode, s.phone, s.hours, s.lat, s.lng]
      );
    }
    console.log(`Synced ${storeRows.length} stores to MySQL.`);

    // 8. Insert Users
    for (const u of userRows) {
      await mysqlConn.query(
        "INSERT INTO users (id, name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [u.id, u.name, u.email, u.phone, u.passwordHash, u.role, u.createdAt ? new Date(u.createdAt) : new Date()]
      );
    }
    console.log(`Synced ${userRows.length} users to MySQL.`);

    // 9. Insert User Addresses
    for (const a of addressRows) {
      await mysqlConn.query(
        "INSERT INTO addresses (id, user_id, label, line1, city, state, pincode, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [a.id, a.userId, a.label, a.line1, a.city, a.state, a.pincode, a.phone]
      );
    }
    console.log(`Synced ${addressRows.length} user delivery addresses to MySQL.`);

    // 10. Insert Orders
    for (const o of orderRows) {
      await mysqlConn.query(
        `INSERT INTO orders (
          id, order_number, user_id, guest_name, guest_phone, status,
          subtotal, discount, delivery_fee, tax, total, coupon_code,
          address_snapshot, delivery_slot, payment_method, payment_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          o.id,
          o.orderNumber,
          o.userId,
          o.guestName,
          o.guestPhone,
          o.status,
          o.subtotal,
          o.discount,
          o.deliveryFee,
          o.tax,
          o.total,
          o.couponCode,
          o.addressSnapshot,
          o.deliverySlot,
          o.paymentMethod,
          o.paymentStatus,
          o.createdAt ? new Date(o.createdAt) : new Date(),
        ]
      );
    }
    console.log(`Synced ${orderRows.length} orders to MySQL.`);

    // 11. Insert Order Items if any
    for (const oi of orderItemRows) {
      await mysqlConn.query(
        "INSERT INTO order_items (id, order_id, product_name, variant_weight, unit_price, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [oi.id, oi.orderId, oi.productName, oi.variantWeight, oi.unitPrice, oi.quantity, oi.imageUrl]
      );
    }

    console.log("ALL DATA INCLUDING USER ADDRESSES SUCCESSFULLY SEEDED INTO MYSQL (vardayini_sweets)!");
  } finally {
    await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 1");
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Migration to MySQL failed:", err);
  process.exit(1);
});
