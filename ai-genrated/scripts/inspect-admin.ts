import { db } from "../src/db";
import { users, adminPermissions } from "../src/db/schema";

async function main() {
  const allUsers = await db.select().from(users);
  console.log("=== USERS ===");
  for (const u of allUsers) {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role} | AccessType: ${u.accessType} | Status: ${u.status}`);
  }

  const allPerms = await db.select().from(adminPermissions);
  console.log("=== PERMISSIONS ===");
  for (const p of allPerms) {
    console.log(`User ID: ${p.userId} | Perm: ${p.permissionSlug}`);
  }
}

main().catch(console.error);
