import { ensureDbMigrations } from "../src/db";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function main() {
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!superAdminPassword) {
    throw new Error("Set SUPER_ADMIN_PASSWORD before running the super-admin seeder.");
  }

  console.log("1. Running ensureDbMigrations()...");
  await ensureDbMigrations();
  console.log("ensureDbMigrations completed.");

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "vardayini_sweets",
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  await conn.query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = 'super_admin'`,
    [
      "Pratik Sukhadiya (Super Admin)",
      "pratik222@gmail.com",
      "9876543210",
      superAdminHash,
      "super_admin",
    ]
  );

  const [pratik] = (await conn.query("SELECT password_hash FROM users WHERE email = ?", [
    "pratik222@gmail.com",
  ])) as any;
  const isMatch = await bcrypt.compare(superAdminPassword, pratik[0].password_hash);
  if (!isMatch) throw new Error("Super-admin password verification failed.");
  console.log("Super-admin account configured and password hash verified.");

  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding:", err);
  process.exit(1);
});
