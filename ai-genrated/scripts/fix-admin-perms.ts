import { db } from "../src/db";
import { users, adminPermissions, permissions as permissionsTable } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const perms = await db.select().from(permissionsTable);
  console.log("=== SYSTEM PERMISSIONS ===");
  for (const p of perms) {
    console.log(`Slug: ${p.slug} | Name: ${p.name} | Module: ${p.module}`);
  }

  // Check admin@vardayini.com
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@vardayini.com"));
  console.log("Current admin user:", admin);

  // Update admin@vardayini.com to accessType = 'full'
  await db.update(users).set({ accessType: "full" }).where(eq(users.email, "admin@vardayini.com"));

  // Also add orders:manage and customers:manage to adminPermissions just in case
  const existingPerms = await db.select().from(adminPermissions).where(eq(adminPermissions.userId, admin.id));
  const existingSlugs = new Set(existingPerms.map(p => p.permissionSlug));
  
  const allNeededSlugs = [
    "products:manage",
    "categories:manage",
    "orders:manage",
    "customers:manage",
    "inventory:manage",
    "coupons:manage",
    "reviews:manage",
    "banners:manage",
    "stores:manage",
    "settings:manage",
    "*"
  ];

  for (const slug of allNeededSlugs) {
    if (!existingSlugs.has(slug)) {
      try {
        await db.insert(adminPermissions).values({
          userId: admin.id,
          permissionSlug: slug
        });
        console.log(`Inserted permission: ${slug}`);
      } catch (e) {
        // ignore unique violation
      }
    }
  }

  const [updatedAdmin] = await db.select().from(users).where(eq(users.email, "admin@vardayini.com"));
  console.log("Updated admin user:", updatedAdmin);
}

main().catch(console.error);
