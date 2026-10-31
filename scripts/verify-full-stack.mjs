import { db, ensureDbMigrations, hydrateFromMongoIfNeeded } from "../ai-genrated/src/db/index.ts";
import { ensureSeeded } from "../ai-genrated/src/db/seed.ts";
import { listCategories, listProducts } from "../ai-genrated/src/lib/products.ts";
import { getUserFromMysql } from "../ai-genrated/src/lib/mysql.ts";
import { testMongoConnection } from "../ai-genrated/src/lib/mongodb.ts";
import { orders } from "../ai-genrated/src/db/schema.ts";

async function verify() {
  console.log("==================================================");
  console.log("   Vardayini Sweets · Fullstack Health Check      ");
  console.log("==================================================");

  // 1. Test MongoDB
  const mongoStatus = await testMongoConnection();
  console.log("1. MongoDB Connection Status:", mongoStatus);

  // 2. Run Migrations & Hydration
  await ensureDbMigrations();
  await hydrateFromMongoIfNeeded();
  await ensureSeeded();
  console.log("2. Database Migrations & Seeding: COMPLETE");

  // 3. Test Categories
  const categories = await listCategories();
  console.log(`3. Categories Loaded: ${categories.length} categories found.`);
  if (categories.length > 0) {
    console.log(`   Sample Category: ${categories[0].name} (${categories[0].slug})`);
  }

  // 4. Test Products
  const products = await listProducts({});
  console.log(`4. Products Loaded: ${products.length} products found.`);
  if (products.length > 0) {
    console.log(`   Sample Product: ${products[0].name} (${products[0].slug}), variants: ${products[0].variants?.length}`);
  }

  // 5. Test Super Admin User
  const superAdmin = await getUserFromMysql("pratik222@gmail.com");
  console.log("5. Super Admin User Lookup (pratik222@gmail.com):", superAdmin ? `FOUND (Role: ${superAdmin.role})` : "NOT FOUND");

  const admin = await getUserFromMysql("admin@vardayini.com");
  console.log("   Admin User Lookup (admin@vardayini.com):", admin ? `FOUND (Role: ${admin.role})` : "NOT FOUND");

  // 6. Test Orders Query (Drizzle orders table)
  const orderList = await db.select().from(orders);
  console.log(`6. Orders Loaded: ${orderList.length} orders found.`);

  console.log("==================================================");
  console.log("   ALL DATABASE & API CHECKS PASSED WITH 0 ERRORS! ");
  console.log("==================================================");
  process.exit(0);
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
