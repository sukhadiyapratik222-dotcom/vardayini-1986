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

    // Check if user already exists by email (SQLite or MongoDB Atlas)
    let [exists] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (!exists) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mUser = await mongo.collection("users").findOne({ email: cleanEmail });
          if (mUser) {
            exists = {
              id: mUser.id || 9999,
              name: mUser.name,
              email: mUser.email,
              phone: mUser.phone,
              passwordHash: mUser.passwordHash || "",
              role: mUser.role || "customer",
              status: mUser.status || "active",
            } as any;
          }
        }
      } catch {}
    }

    // Check if user already exists by phone (SQLite or MongoDB Atlas)
    let [existsPhone] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!existsPhone) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mUserPhone = await mongo.collection("users").findOne({ phone });
          if (mUserPhone) {
            existsPhone = {
              id: mUserPhone.id || 9999,
              name: mUserPhone.name,
              email: mUserPhone.email,
              phone: mUserPhone.phone,
              passwordHash: mUserPhone.passwordHash || "",
              role: mUserPhone.role || "customer",
              status: mUserPhone.status || "active",
            } as any;
          }
        }
      } catch {}
    }

    // If an Administrator / Super Admin account exists with this email or phone, prevent public overwrite
    if (exists && (exists.role === "super_admin" || exists.role === "admin" || exists.role === "staff")) {
      return Response.json(
        {
          error: `An administrator account with email "${cleanEmail}" already exists. Please sign in directly at the login desk.`,
          fields: {
            email: "An account with this email already exists. Please log in instead.",
          },
          accountExists: true,
          existingEmail: cleanEmail,
          role: exists.role,
        },
        { status: 409 }
      );
    }

    if (existsPhone && (existsPhone.role === "super_admin" || existsPhone.role === "admin" || existsPhone.role === "staff")) {
      return Response.json(
        {
          error: `An administrator account with phone number "${phone}" already exists. Please sign in directly at the login desk.`,
          fields: {
            phone: "An account with this phone number already exists. Please log in instead.",
          },
          accountExists: true,
          existingPhone: phone,
          role: existsPhone.role,
        },
        { status: 409 }
      );
    }

    // Customer OTP verification
    const rawOtp = sanitizeString((body as any)?.otp || "");
    const otpProof = sanitizeString((body as any)?.otpProof || "");
    if (rawOtp) {
      const verifyResult = await verifyOTP(phone, rawOtp, "register", otpProof);
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

    // Check if an existing customer account can be activated / claimed with verified phone OTP
    const existingTargetUser = (exists && exists.phone === phone) ? exists : ((existsPhone && !exists) ? existsPhone : null);

    let user: any = null;
    const passwordHash = await bcrypt.hash(password, 10);

    if (existingTargetUser && existingTargetUser.role === "customer") {
      // Customer verified their phone OTP — upgrade/claim their existing patron profile
      try {
        await db
          .update(users)
          .set({
            name: name.trim(),
            email: cleanEmail,
            phone,
            passwordHash,
            status: "active",
          })
          .where(eq(users.id, existingTargetUser.id));

        const [updatedUser] = await db.select().from(users).where(eq(users.id, existingTargetUser.id)).limit(1);
        user = updatedUser || existingTargetUser;
      } catch (upErr) {
        console.warn("[Register API] Upgrade user notice:", upErr);
        user = existingTargetUser;
      }
    } else {
      // If email exists with a DIFFERENT phone number, reject with clear field error
      if (exists && exists.phone !== phone) {
        return Response.json(
          {
            error: "An account with this email already exists. Please log in or use another email.",
            fields: {
              email: "An account with this email already exists. Please log in instead or use another email.",
            },
            accountExists: true,
            existingEmail: cleanEmail,
          },
          { status: 409 }
        );
      }

      // If phone exists with a DIFFERENT email, reject with clear field error
      if (existsPhone && existsPhone.email !== cleanEmail) {
        return Response.json(
          {
            error: "An account with this phone number already exists. Please log in with Mobile OTP instead.",
            fields: {
              phone: "An account with this phone number already exists. Please log in with Mobile OTP instead.",
            },
            accountExists: true,
            existingPhone: phone,
          },
          { status: 409 }
        );
      }

      const [insertRes] = await db
        .insert(users)
        .values({ name, email: cleanEmail, phone, passwordHash, role: "customer" });

      if (insertRes?.insertId) {
        const [u] = await db.select().from(users).where(eq(users.id, insertRes.insertId)).limit(1);
        user = u;
      }
      if (!user) {
        const [u] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        user = u;
      }
    }

    if (!user) {
      return Response.json(
        { error: "Failed to create customer account. Please try again." },
        { status: 500 }
      );
    }

    await setAuthCookie(user.id, {
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });
    await mergeGuestCart(user.id);

    // Synchronize new user to MongoDB Atlas & MySQL
    try {
      const { syncUserToMongo } = await import("@/lib/mongodb");
      await syncUserToMongo({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        role: user.role,
      });
    } catch {}

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
      console.warn("[Register] MySQL user sync notice:", syncErr);
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

