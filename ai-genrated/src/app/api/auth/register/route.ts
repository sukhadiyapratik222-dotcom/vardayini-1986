import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { mergeGuestCart } from "@/lib/cart";
import { setAuthCookie } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";

export async function POST(request: Request) {
  await ensureSeeded();
  const body = await readJsonSafe<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
  }>(request);

  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) return Response.json({ error: "Please enter your name." }, { status: 400 });
  if (!email.includes("@")) return Response.json({ error: "Enter a valid email." }, { status: 400 });
  if (phone.length < 10) return Response.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (password.length < 6) return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const [exists] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (exists) return Response.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash, role: "customer" })
    .returning();
  await setAuthCookie(user.id);
  await mergeGuestCart(user.id);
  return Response.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
}
