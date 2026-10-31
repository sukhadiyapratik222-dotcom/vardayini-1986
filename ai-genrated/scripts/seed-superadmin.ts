import { ensureDbMigrations } from "../src/db";
import { forceReseed } from "../src/db/seed";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function main() {
  console.log("1. Running ensureDbMigrations()...");
  await ensureDbMigrations();
  console.log("ensureDbMigrations completed.");

  console.log("2. Running forceReseed()...");
  await forceReseed();
  console.log("forceReseed completed.");

  // Direct check and guarantee in MySQL
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "vardayini_sweets",
  });

  const superAdminHash = await bcrypt.hash("Pratik@#123", 10);
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

  const [allUsers] = await conn.query("SELECT id, name, email, role, phone FROM users");
  console.log("\n--- USERS IN MYSQL (vardayini_sweets) ---");
  console.table(allUsers);

  // Test bcrypt comparison
  const [pratik] = (await conn.query("SELECT password_hash FROM users WHERE email = ?", [
    "pratik222@gmail.com",
  ])) as any;
  const isMatch = await bcrypt.compare("Pratik@#123", pratik[0].password_hash);
  console.log("Super Admin password check (Pratik@#123):", isMatch ? "VALID MATCH ✓" : "FAILED ✗");

  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding:", err);
  process.exit(1);
});
