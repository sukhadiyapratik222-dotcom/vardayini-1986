import mysql from "mysql2/promise";

// Connection pool configuration for MySQL (XAMPP / Localhost / phpMyAdmin 5.2.1)
export const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "", // Default XAMPP has no password
  database: process.env.MYSQL_DATABASE || "vardayini_sweets",
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Ensures all required tables (including admin_notifications) exist in MySQL
 */
export async function ensureMysqlTables() {
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
    console.warn("MySQL table check notice:", err);
  }
}

/**
 * Synchronize a user directly to MySQL
 */
export async function syncUserToMysql(user: {
  id?: number | null;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role?: string;
}) {
  try {
    await dbPool.query(
      `INSERT INTO users (id, name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password_hash = VALUES(password_hash),
         role = VALUES(role)`,
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
    console.warn("MySQL user sync notice:", err);
  }
}

/**
 * Synchronize an order directly to MySQL
 */
export async function syncOrderToMysql(order: {
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
  addressSnapshot?: string | null;
  deliverySlot?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}) {
  try {
    await dbPool.query(
      `INSERT INTO orders (
        order_number, user_id, guest_name, guest_phone, status,
        subtotal, discount, delivery_fee, tax, total, coupon_code,
        address_snapshot, delivery_slot, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        payment_status = VALUES(payment_status),
        total = VALUES(total)`,
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
  } catch (err) {
    console.warn("MySQL order sync notice:", err);
  }
}

/**
 * Synchronize notification directly to MySQL
 */
export async function syncNotificationToMysql(notification: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}) {
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
  } catch (err) {
    console.warn("MySQL notification sync notice:", err);
  }
}

/**
 * Delete user from MySQL
 */
export async function deleteUserFromMysql(id: number) {
  try {
    await dbPool.query("DELETE FROM addresses WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM cart_items WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM wishlist_items WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM reviews WHERE user_id = ?", [id]);
    await dbPool.query("UPDATE orders SET user_id = NULL WHERE user_id = ?", [id]);
    await dbPool.query("DELETE FROM users WHERE id = ?", [id]);
  } catch (err) {
    console.warn("MySQL user delete notice:", err);
  }
}

/**
 * Utility helper to test MySQL connectivity
 */
export async function testConnection() {
  try {
    const connection = await dbPool.getConnection();
    const [result] = await connection.query("SELECT 1 + 1 AS solution");
    connection.release();
    return { success: true, message: "MySQL connected successfully", result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
