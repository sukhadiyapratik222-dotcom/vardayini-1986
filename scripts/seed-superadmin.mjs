import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

// Connection config
const host = process.env.MYSQL_HOST || "localhost";
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD ?? "";
const database = process.env.MYSQL_DATABASE || "vardayini_sweets";
const port = Number(process.env.MYSQL_PORT) || 3306;

// Parse CLI args
const args = process.argv.slice(2);
let superAdminEmail = "pratik222@gmail.com";
let superAdminPassword = "Pratik@#123";
let superAdminName = "Pratik Sukhadiya";
let forceChange = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--email" && args[i + 1]) superAdminEmail = args[++i];
  if (args[i] === "--password" && args[i + 1]) superAdminPassword = args[++i];
  if (args[i] === "--name" && args[i + 1]) superAdminName = args[++i];
  if (args[i] === "--no-force-change") forceChange = false;
  if (args[i] === "--force-change") forceChange = true;
}

async function run() {
  console.log("==================================================");
  console.log("   Vardayini Sweets · Super Admin Initializer    ");
  console.log("==================================================");
  console.log(`• Target Email:          ${superAdminEmail}`);
  console.log(`• Initial Password:      ${superAdminPassword}`);
  console.log(`• Full Name:             ${superAdminName}`);
  console.log(`• Force Password Change: ${forceChange ? "YES (Required on 1st login)" : "NO"}`);
  console.log("--------------------------------------------------");

  let conn;
  try {
    conn = await mysql.createConnection({ host, user, password, database, port });
    console.log("✓ Connected to MySQL database:", database);

    // Ensure columns exist on users table
    const colsToAdd = [
      "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) NOT NULL DEFAULT 'active'",
      "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `access_type` VARCHAR(20) NOT NULL DEFAULT 'full'",
    ];
    for (const c of colsToAdd) {
      try {
        await conn.query(c);
      } catch {
        const rawSql = c.replace(" IF NOT EXISTS", "");
        try { await conn.query(rawSql); } catch {}
      }
    }

    // Ensure roles table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`roles\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(80) NOT NULL,
        \`slug\` VARCHAR(80) NOT NULL UNIQUE,
        \`description\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure permissions table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`permissions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(120) NOT NULL,
        \`slug\` VARCHAR(120) NOT NULL UNIQUE,
        \`module\` VARCHAR(80) NOT NULL,
        \`action\` VARCHAR(40) NOT NULL DEFAULT 'manage',
        \`description\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure activity_logs table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`activity_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT DEFAULT NULL,
        \`user_name\` VARCHAR(120) DEFAULT NULL,
        \`user_email\` VARCHAR(160) DEFAULT NULL,
        \`user_role\` VARCHAR(40) DEFAULT NULL,
        \`action\` VARCHAR(80) NOT NULL,
        \`module\` VARCHAR(80) NOT NULL,
        \`details\` TEXT DEFAULT NULL,
        \`ip_address\` VARCHAR(60) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Hash password
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);

    // Check if user exists
    const [existing] = await conn.query("SELECT id, email, role FROM users WHERE email = ? LIMIT 1", [
      superAdminEmail,
    ]);

    let superAdminId;
    if (Array.isArray(existing) && existing.length > 0) {
      superAdminId = existing[0].id;
      await conn.query(
        "UPDATE users SET name = ?, role = 'super_admin', status = 'active', access_type = 'full', password_hash = ?, must_change_password = ? WHERE id = ?",
        [superAdminName, passwordHash, forceChange ? 1 : 0, superAdminId]
      );
      console.log(`✓ Existing user ID #${superAdminId} upgraded to active Super Admin with role = 'super_admin'!`);
    } else {
      const [insertResult] = await conn.query(
        "INSERT INTO users (name, email, phone, password_hash, role, status, access_type, must_change_password) VALUES (?, ?, '9876543210', ?, 'super_admin', 'active', 'full', ?)",
        [superAdminName, superAdminEmail, passwordHash, forceChange ? 1 : 0]
      );
      superAdminId = insertResult.insertId;
      console.log(`✓ Created new Super Admin user ID #${superAdminId}!`);
    }

    // Record activity log
    await conn.query(
      "INSERT INTO activity_logs (user_id, user_name, user_email, user_role, action, module, details, ip_address) VALUES (?, ?, ?, 'super_admin', 'SEED_SUPER_ADMIN', 'auth', 'Super admin account initialized via CLI seeder', '127.0.0.1')",
      [superAdminId, superAdminName, superAdminEmail]
    );

    console.log("--------------------------------------------------");
    console.log("🎉 SUCCESS: Super Admin is ready!");
    console.log(`   Email:    ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Role:     super_admin`);
    console.log(`   Status:   active`);
    console.log(`   Access:   Full unrestricted access (owner)`);
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Error initializing Super Admin:", err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
