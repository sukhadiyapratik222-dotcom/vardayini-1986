import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { mergeGuestCart } from "@/lib/cart";
import { setAuthCookie } from "@/lib/auth";
import { readJsonSafe, RegisterSchema, formatZodErrors } from "@/lib/validation";
import { recordAdminNotification } from "@/lib/notifications";
import { syncUserToMysql } from "@/lib/mysql";
import { verifyOTP } from "@/lib/otp-service";
import { sanitizeString } from "@/lib/security";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    
    const body = await readJsonSafe(request);
    if (!body) {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Validation failed.";
      return Response.json({ error: firstError, fields: formatZodErrors(result.error) }, { status: 400 });
    }

    const { name, email, phone, password } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    const [exists] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (exists) return Response.json({ error: "An account with this email already exists." }, { status: 409 });

    const [existsPhone] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existsPhone) return Response.json({ error: "An account with this phone number already exists." }, { status: 409 });

    // Customer OTP verification
    const rawOtp = sanitizeString((body as any)?.otp || "");
    if (rawOtp) {
      const verifyResult = await verifyOTP(phone, rawOtp, "register");
      if (!verifyResult.success) {
        return Response.json(
          { error: verifyResult.error || "Invalid or expired OTP code." },
          { status: 400 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      return Response.json(
        { error: "Mobile verification OTP is required to complete registration." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [insertRes] = await db
      .insert(users)
      .values({ name, email: cleanEmail, phone, passwordHash, role: "customer" });

    let user: any = null;
    if (insertRes?.insertId) {
      const [u] = await db.select().from(users).where(eq(users.id, insertRes.insertId)).limit(1);
      user = u;
    }
    if (!user) {
      const [u] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      user = u;
    }

    if (!user) {
      return Response.json(
        { error: "Failed to create customer account. Please try again." },
        { status: 500 }
      );
    }

    await setAuthCookie(user.id);
    await mergeGuestCart(user.id);

    // Synchronize new user to MySQL (phpMyAdmin) & MongoDB
    try {
      await syncUserToMysql({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        role: user.role,
      });
    } catch (syncErr) {
      console.warn("[Register] MySQL/Mongo user sync notice:", syncErr);
    }

    // Notify admin when a new user registers
    try {
      await recordAdminNotification({
        type: "user_registered",
        title: "New Customer Registered! 🌟",
        message: `${user.name} (${user.email}) just created an account. Phone: ${user.phone}`,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Failed to notify admin of new user registration:", err);
    }

    return Response.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error: any) {
    console.error("[Register API Error]:", error);
    return Response.json(
      { error: error?.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

