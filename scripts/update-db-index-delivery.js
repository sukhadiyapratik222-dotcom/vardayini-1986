const fs = require('fs');
const path = require('path');

const indexPath = path.resolve('ai-genrated/src/db/index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf-8').replace(/\r\n/g, '\n');

// 1. Add table definitions in sqlite init block
if (!indexContent.includes('CREATE TABLE IF NOT EXISTS serviceable_pincodes')) {
  const tableSql = `
    CREATE TABLE IF NOT EXISTS serviceable_pincodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pincode TEXT NOT NULL,
      store_id INTEGER REFERENCES stores(id),
      city TEXT NOT NULL DEFAULT 'Vadodara',
      state TEXT NOT NULL DEFAULT 'Gujarat',
      delivery_enabled INTEGER NOT NULL DEFAULT 1,
      delivery_charge REAL NOT NULL DEFAULT 49.0,
      minimum_order REAL NOT NULL DEFAULT 0.0,
      estimated_delivery_time TEXT DEFAULT 'Today by 6:30 PM',
      is_express INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_serv_pincode ON serviceable_pincodes(pincode);
    CREATE INDEX IF NOT EXISTS idx_serv_store_id ON serviceable_pincodes(store_id);

    CREATE TABLE IF NOT EXISTS unserviceable_pincode_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pincode TEXT NOT NULL,
      ip_address TEXT,
      source TEXT DEFAULT 'checkout',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`;
  indexContent = indexContent.replace(
    '    CREATE TABLE IF NOT EXISTS otp_logs (',
    `${tableSql}\n    CREATE TABLE IF NOT EXISTS otp_logs (`
  );
}

// 2. Add PRAGMA migration checks for new columns
if (!indexContent.includes('pickup_radius_km')) {
  const pragmaMigrations = `
    // Migration safeguard: Ensure stores table has pickup_radius_km, delivery_enabled, weekly_off, etc.
    try {
      const storeCols = sqlite.prepare("PRAGMA table_info(stores)").all() as any[];
      if (!storeCols.some((c: any) => c.name === "pickup_radius_km")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN pickup_radius_km REAL DEFAULT 10.0");
      }
      if (!storeCols.some((c: any) => c.name === "delivery_enabled")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN delivery_enabled INTEGER NOT NULL DEFAULT 1");
      }
      if (!storeCols.some((c: any) => c.name === "weekly_off")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN weekly_off TEXT DEFAULT ''");
      }
      if (!storeCols.some((c: any) => c.name === "delivery_charge")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN delivery_charge REAL NOT NULL DEFAULT 49.0");
      }
      if (!storeCols.some((c: any) => c.name === "min_order_amount")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN min_order_amount REAL NOT NULL DEFAULT 0.0");
      }
      if (!storeCols.some((c: any) => c.name === "free_delivery_threshold")) {
        sqlite.exec("ALTER TABLE stores ADD COLUMN free_delivery_threshold REAL NOT NULL DEFAULT 799.0");
      }
    } catch (storeMigErr) {
      console.warn("[Stores Migration Notice]", storeMigErr);
    }

    // Migration safeguard: Ensure addresses table has latitude, longitude, address_type
    try {
      const addrCols = sqlite.prepare("PRAGMA table_info(addresses)").all() as any[];
      if (!addrCols.some((c: any) => c.name === "latitude")) {
        sqlite.exec("ALTER TABLE addresses ADD COLUMN latitude REAL DEFAULT NULL");
      }
      if (!addrCols.some((c: any) => c.name === "longitude")) {
        sqlite.exec("ALTER TABLE addresses ADD COLUMN longitude REAL DEFAULT NULL");
      }
      if (!addrCols.some((c: any) => c.name === "address_type")) {
        sqlite.exec("ALTER TABLE addresses ADD COLUMN address_type TEXT DEFAULT 'home'");
      }
    } catch (addrMigErr) {
      console.warn("[Addresses Migration Notice]", addrMigErr);
    }

    // Migration safeguard: Ensure orders table has distance_km, assigned_store_id
    try {
      const ordCols = sqlite.prepare("PRAGMA table_info(orders)").all() as any[];
      if (!ordCols.some((c: any) => c.name === "distance_km")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN distance_km REAL DEFAULT NULL");
      }
      if (!ordCols.some((c: any) => c.name === "assigned_store_id")) {
        sqlite.exec("ALTER TABLE orders ADD COLUMN assigned_store_id INTEGER DEFAULT NULL");
      }
    } catch (ordMigErr) {
      console.warn("[Orders Delivery Migration Notice]", ordMigErr);
    }
`;

  indexContent = indexContent.replace(
    '    // Migration safeguard: Ensure product_variants table has pack_name, is_default, is_active',
    `${pragmaMigrations}\n    // Migration safeguard: Ensure product_variants table has pack_name, is_default, is_active`
  );
}

fs.writeFileSync(indexPath, indexContent, 'utf-8');
console.log('Successfully updated db/index.ts');
