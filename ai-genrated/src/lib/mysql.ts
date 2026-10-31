import mysql from "mysql2/promise";
import {
  syncUserToMongo,
  getUserFromMongo,
  deleteUserFromMongo,
  syncOrderToMongo,
  updateOrderDetailsInMongo,
  deleteOrderFromMongo,
  syncProductToMongo,
  deleteProductFromMongo,
  syncProductVariantToMongo,
  updateVariantStockInMongo,
  syncCategoryToMongo,
  deleteCategoryFromMongo,
  syncStoreToMongo,
  deleteStoreFromMongo,
  syncNotificationToMongo,
  testMongoConnection,
} from "./mongodb";

let mysqlOfflineUntil = 0;
const MYSQL_COOLDOWN_MS = 30000;

function isMysqlReachable(): boolean {
  return Date.now() >= mysqlOfflineUntil;
}

function handleMysqlError(err: unknown) {
  const code = (err as any)?.code;
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EHOSTUNREACH") {
    mysqlOfflineUntil = Date.now() + MYSQL_COOLDOWN_MS;
  }
}

// Optional MySQL pool (attempted when MySQL server is running)
export const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE || "vardayini_sweets",
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 500,
});

/**
 * Ensures all required tables and missing columns exist in MySQL (if online)
 */
export async function ensureMysqlTables() {
  if (!isMysqlReachable()) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`admin_notifications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`type\` VARCHAR(40) NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`data\` TEXT DEFAULT NULL,
        \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    handleMysqlError(err);
  }
}

// ============================================================================
// USERS & CUSTOMERS CRUD (Syncs to MongoDB + MySQL)
// ============================================================================

export async function syncUserToMysql(user: {
  id?: number | null;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role?: string;
}) {
  // Always synchronize directly with MongoDB (background)
  try {
    await syncUserToMongo(user);
  } catch {}

  // Sync to MySQL if available
  if (!isMysqlReachable()) return;
  try {
    await dbPool.query(
      `INSERT INTO users (id, name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password_hash = VALUES(password_hash),
         role = CASE WHEN users.role IN ('admin', 'super_admin') AND VALUES(role) = 'customer' THEN users.role ELSE VALUES(role) END`,
      [
        user.id || null,
        user.name,
        user.email.toLowerCase(),
        user.phone,
        user.passwordHash,
        user.role || "customer",
      ]
    );
  } catch (err) {
    handleMysqlError(err);
  }
}

export async function getUserFromMysql(email: string) {
  // Try MySQL if reachable
  if (isMysqlReachable()) {
    try {
      const [rows] = (await dbPool.query(
        "SELECT id, name, email, phone, password_hash, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [email.trim()]
      )) as [Array<{ id: number; name: string; email: string; phone: string; password_hash: string; role: string }>, any];
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      handleMysqlError(err);
    }
  }

  // Seamless fallback to MongoDB
  try {
    const mongoUser = await getUserFromMongo(email);
    if (mongoUser) return mongoUser;
  } catch {}

  return null;
}

export async function deleteUserFromMysql(id: number) {
  try {
    await deleteUserFromMongo(id);
  } catch {}

  try {
    await dbPool.query("DELETE FROM addresses WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM cart_items WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM wishlist_items WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM reviews WHERE user_id = ?", [id]);
    await dbPool.query("UPDATE orders SET user_id = NULL WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM users WHERE id = ?", [id]);
  } catch {}
}

// ============================================================================
// ORDERS & ORDER ITEMS CRUD (Syncs to MongoDB + MySQL)
// ============================================================================

export interface MysqlOrderItemInput {
  productName: string;
  variantWeight?: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export async function syncOrderToMysql(
  order: {
    orderNumber: string;
    userId?: number | null;
    guestName?: string | null;
    guestPhone?: string | null;
    status?: string;
    subtotal?: number;
    discount?: number;
    deliveryFee?: number;
    tax?: number;
    total?: number;
    couponCode?: string | null;
    addressSnapshot?: string | null | Record<string, unknown>;
    deliverySlot?: string;
    paymentMethod?: string;
    paymentStatus?: string;
  },
  items?: MysqlOrderItemInput[]
) {
  // Always synchronize to MongoDB
  try {
    await syncOrderToMongo(order, items);
  } catch {}

  // Sync to MySQL if available
  try {
    await dbPool.query(
      `INSERT INTO orders (
        order_number, user_id, guest_name, guest_phone, status,
        subtotal, discount, delivery_fee, tax, total, coupon_code,
        address_snapshot, delivery_slot, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        guest_name = VALUES(guest_name),
        guest_phone = VALUES(guest_phone),
        delivery_slot = VALUES(delivery_slot),
        payment_method = VALUES(payment_method),
        payment_status = VALUES(payment_status),
        total = VALUES(total),
        discount = VALUES(discount),
        subtotal = VALUES(subtotal)`,
      [
        order.orderNumber,
        order.userId || null,
        order.guestName || null,
        order.guestPhone || null,
        order.status || "confirmed",
        order.subtotal || 0,
        order.discount || 0,
        order.deliveryFee || 0,
        order.tax || 0,
        order.total || 0,
        order.couponCode || null,
        typeof order.addressSnapshot === "string"
          ? order.addressSnapshot
          : JSON.stringify(order.addressSnapshot || {}),
        order.deliverySlot || "",
        order.paymentMethod || "cod",
        order.paymentStatus || "pending",
      ]
    );

    if (items && items.length > 0) {
      const [rows] = (await dbPool.query(
        "SELECT id FROM orders WHERE order_number = ? LIMIT 1",
        [order.orderNumber]
      )) as [Array<{ id: number }>, any];
      if (rows && rows.length > 0) {
        const orderId = rows[0].id;
        await dbPool.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
        for (const item of items) {
          await dbPool.query(
            `INSERT INTO order_items (order_id, product_name, variant_weight, unit_price, quantity, image_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.productName,
              item.variantWeight || "500g",
              item.unitPrice,
              item.quantity,
              item.imageUrl || "/images/mithai-platter-showcase.jpg",
            ]
          );
        }
      }
    }
  } catch {}
}

export async function updateOrderDetailsInMysql(
  orderNumber: string,
  fields: {
    status?: string;
    guestName?: string;
    guestPhone?: string;
    deliverySlot?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    total?: number;
  }
) {
  try {
    await updateOrderDetailsInMongo(orderNumber, fields);
  } catch {}

  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (fields.status !== undefined) { updates.push("status = ?"); values.push(fields.status); }
    if (fields.guestName !== undefined) { updates.push("guest_name = ?"); values.push(fields.guestName); }
    if (fields.guestPhone !== undefined) { updates.push("guest_phone = ?"); values.push(fields.guestPhone); }
    if (fields.deliverySlot !== undefined) { updates.push("delivery_slot = ?"); values.push(fields.deliverySlot); }
    if (fields.paymentMethod !== undefined) { updates.push("payment_method = ?"); values.push(fields.paymentMethod); }
    if (fields.paymentStatus !== undefined) { updates.push("payment_status = ?"); values.push(fields.paymentStatus); }
    if (fields.total !== undefined) { updates.push("total = ?"); values.push(fields.total); }

    if (updates.length > 0) {
      values.push(orderNumber);
      await dbPool.query(`UPDATE orders SET ${updates.join(", ")} WHERE order_number = ?`, values);
    }
  } catch {}
}

export async function deleteOrderFromMysql(orderNumber: string) {
  try {
    await deleteOrderFromMongo(orderNumber);
  } catch {}

  try {
    const [rows] = (await dbPool.query(
      "SELECT id FROM orders WHERE order_number = ? LIMIT 1",
      [orderNumber]
    )) as [Array<{ id: number }>, any];
    if (rows && rows.length > 0) {
      const orderId = rows[0].id;
      await dbPool.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
      await dbPool.query("DELETE FROM orders WHERE id = ?", [orderId]);
    } else {
      await dbPool.query("DELETE FROM orders WHERE order_number = ?", [orderNumber]);
    }
  } catch {}
}

// ============================================================================
// PRODUCTS & VARIANTS CRUD (Syncs to MongoDB + MySQL)
// ============================================================================

export async function syncProductToMysql(product: {
  id?: number | null;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  tags?: string | null;
  isFeatured?: boolean;
}) {
  try {
    await syncProductToMongo(product);
  } catch {}

  try {
    await dbPool.query(
      `INSERT INTO products (id, category_id, name, slug, description, image_url, tags, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         category_id = VALUES(category_id),
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         image_url = VALUES(image_url),
         tags = VALUES(tags),
         is_featured = VALUES(is_featured)`,
      [
        product.id || null,
        product.categoryId,
        product.name,
        product.slug,
        product.description,
        product.imageUrl,
        product.tags || "popular",
        product.isFeatured ? 1 : 0,
      ]
    );
  } catch {}
}

export async function deleteProductFromMysql(productId: number) {
  try {
    await deleteProductFromMongo(productId);
  } catch {}

  try {
    await dbPool.query("DELETE FROM product_variants WHERE product_id = ?", [productId]);
    await dbPool.query("DELETE FROM products WHERE id = ?", [productId]);
  } catch {}
}

export async function syncProductVariantToMysql(variant: {
  id?: number | null;
  productId: number;
  weight: string;
  sku: string;
  price: number;
  discountedPrice?: number | null;
  stock: number;
}) {
  try {
    await syncProductVariantToMongo(variant);
  } catch {}

  try {
    await dbPool.query(
      `INSERT INTO product_variants (id, product_id, weight, sku, price, discounted_price, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         product_id = VALUES(product_id),
         weight = VALUES(weight),
         sku = VALUES(sku),
         price = VALUES(price),
         discounted_price = VALUES(discounted_price),
         stock = VALUES(stock)`,
      [
        variant.id || null,
        variant.productId,
        variant.weight,
        variant.sku,
        variant.price,
        variant.discountedPrice ?? null,
        variant.stock,
      ]
    );
  } catch {}
}

export async function updateVariantStockInMysql(
  variantId: number,
  fields: { stock?: number; price?: number; discountedPrice?: number | null; weight?: string }
) {
  try {
    await updateVariantStockInMongo(variantId, fields);
  } catch {}

  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (fields.stock !== undefined) { updates.push("stock = ?"); values.push(fields.stock); }
    if (fields.price !== undefined) { updates.push("price = ?"); values.push(fields.price); }
    if (fields.discountedPrice !== undefined) { updates.push("discounted_price = ?"); values.push(fields.discountedPrice); }
    if (fields.weight !== undefined) { updates.push("weight = ?"); values.push(fields.weight); }
    if (updates.length > 0) {
      values.push(variantId);
      await dbPool.query(`UPDATE product_variants SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch {}
}

// ============================================================================
// CATEGORIES CRUD (Syncs to MongoDB + MySQL)
// ============================================================================

export async function syncCategoryToMysql(category: {
  id?: number | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder?: number;
}) {
  try {
    await syncCategoryToMongo(category);
  } catch {}

  try {
    await dbPool.query(
      `INSERT INTO categories (id, name, slug, description, image_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         image_url = VALUES(image_url),
         sort_order = VALUES(sort_order)`,
      [
        category.id || null,
        category.name,
        category.slug,
        category.description,
        category.imageUrl,
        category.sortOrder ?? 0,
      ]
    );
  } catch {}
}

export async function deleteCategoryFromMysql(categoryId: number) {
  try {
    await deleteCategoryFromMongo(categoryId);
  } catch {}

  try {
    const [prods] = (await dbPool.query("SELECT id FROM products WHERE category_id = ?", [categoryId])) as [Array<{ id: number }>, any];
    for (const p of prods || []) {
      await dbPool.query("DELETE FROM product_variants WHERE product_id = ?", [p.id]);
    }
    await dbPool.query("DELETE FROM products WHERE category_id = ?", [categoryId]);
    await dbPool.query("DELETE FROM categories WHERE id = ?", [categoryId]);
  } catch {}
}

// ============================================================================
// STORES & OUTLETS CRUD (Syncs to MongoDB + MySQL)
// ============================================================================

export async function syncStoreToMysql(store: {
  id?: number | null;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  lat: string | number;
  lng: string | number;
  mapUrl?: string | null;
}) {
  try {
    await syncStoreToMongo(store);
  } catch {}

  try {
    await ensureMysqlTables();
    await dbPool.query(
      `INSERT INTO stores (id, name, address, city, pincode, phone, hours, lat, lng, map_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         address = VALUES(address),
         city = VALUES(city),
         pincode = VALUES(pincode),
         phone = VALUES(phone),
         hours = VALUES(hours),
         lat = VALUES(lat),
         lng = VALUES(lng),
         map_url = VALUES(map_url)`,
      [
        store.id || null,
        store.name,
        store.address,
        store.city,
        store.pincode,
        store.phone,
        store.hours,
        store.lat,
        store.lng,
        store.mapUrl || null,
      ]
    );
  } catch {}
}

export async function deleteStoreFromMysql(storeId: number) {
  try {
    await deleteStoreFromMongo(storeId);
  } catch {}

  try {
    await dbPool.query("DELETE FROM stores WHERE id = ?", [storeId]);
  } catch {}
}

// ============================================================================
// NOTIFICATIONS & UTILITIES
// ============================================================================

export async function syncNotificationToMysql(notification: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}) {
  try {
    await syncNotificationToMongo(notification);
  } catch {}

  try {
    await ensureMysqlTables();
    await dbPool.query(
      `INSERT INTO admin_notifications (type, title, message, data)
       VALUES (?, ?, ?, ?)`,
      [
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null,
      ]
    );
  } catch {}
}

/**
 * Utility helper to test database connectivity (MongoDB + MySQL)
 */
export async function testConnection() {
  const mongoStatus = await testMongoConnection();
  let mysqlStatus = { success: false, error: "MySQL offline" };

  try {
    const connection = await dbPool.getConnection();
    const [result] = await connection.query("SELECT 1 + 1 AS solution");
    connection.release();
    mysqlStatus = { success: true, error: "" };
  } catch (error) {
    mysqlStatus = { success: false, error: (error as Error).message };
  }

  return {
    success: mongoStatus.success || mysqlStatus.success,
    mongodb: mongoStatus,
    mysql: mysqlStatus,
  };
}
