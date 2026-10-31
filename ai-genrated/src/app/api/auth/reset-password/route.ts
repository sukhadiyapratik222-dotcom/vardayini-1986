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

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return Response.json({ error: "No account found with this email." }, { status: 404 });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 10);

  // Update user
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

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
