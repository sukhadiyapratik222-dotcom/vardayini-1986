import mysql from 'mysql2/promise';

// Connection pool configuration for MySQL (XAMPP / Localhost)
export const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '', // Default XAMPP has no password
  database: process.env.MYSQL_DATABASE || 'vardayini_sweets',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Example query: Fetch all categories sorted by sort_order
 */
export async function getCategories() {
  const [rows] = await dbPool.query('SELECT * FROM categories ORDER BY sort_order ASC');
  return rows;
}

/**
 * Example query: Fetch published products with their category details
 */
export async function getProducts(limit: number = 20) {
  const [rows] = await dbPool.query(
    `SELECT p.*, c.name AS category_name 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     ORDER BY p.id DESC 
     LIMIT ?`,
    [limit]
  );
  return rows;
}

/**
 * Utility helper to test MySQL connectivity
 */
export async function testConnection() {
  try {
    const connection = await dbPool.getConnection();
    const [result] = await connection.query('SELECT 1 + 1 AS solution');
    connection.release();
    return { success: true, message: 'MySQL connected successfully', result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
