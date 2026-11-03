import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readJsonSafe } from "@/lib/validation";
import { syncUserToMysql } from "@/lib/mysql";

export async function POST(request: Request) {
  const body = await readJsonSafe<{ email?: string; password?: string }>(request);
  if (!body || !body.email || !body.password) {
    return Response.json({ error: "Missing email or password" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Find user (SQLite with MongoDB Atlas fallback)
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const m = await mongo.collection("users").findOne({ email });
        if (m) {
          const { getSqliteDb } = await import("@/db");
          const sqlite = getSqliteDb();
          sqlite.prepare(`
            INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, status, access_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            m.id || undefined,
            m.name || "User",
            m.email || email,
            m.phone || "",
            m.passwordHash || "",
            m.role || "customer",
            m.status || "active",
            m.accessType || "full"
          );
          [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        }
      }
    } catch {}
  }

  if (!user) {
    return Response.json({ error: "No account found with this email." }, { status: 404 });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 10);

  // Update user in SQLite
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  // Sync to MongoDB Atlas
  try {
    const { syncUserToMongo } = await import("@/lib/mongodb");
    await syncUserToMongo({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      passwordHash: passwordHash,
      role: user.role,
    });
  } catch {}

  // Sync to MySQL
  await syncUserToMysql({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    passwordHash: passwordHash,
    role: user.role,
  });

  return Response.json({ success: true, message: "Password updated successfully." });
}
