import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyOTP } from "@/lib/otp-service";
import { setAuthCookie } from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart";
import { normalizeIndianPhone, sanitizeString } from "@/lib/security";
import { recordAdminNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const phoneNumber = sanitizeString(body?.phoneNumber || body?.phone || "");
    const userOtp = sanitizeString(body?.userOtp || body?.otp || "");
    const trigger = (sanitizeString(body?.trigger || "login") || "login");
    const otpProof = sanitizeString(body?.otpProof || "");
    const providedName = sanitizeString(body?.name || body?.fullName || "").trim();
    const providedEmail = sanitizeString(body?.email || "").trim().toLowerCase();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!userOtp) {
      return NextResponse.json({ error: "OTP code is required" }, { status: 400 });
    }

    const cleanPhone = normalizeIndianPhone(phoneNumber);

    // Verify OTP using database persistent store (MongoDB Atlas + SQLite) and signed proof fallback
    const verifyResult = await verifyOTP(cleanPhone, userOtp, trigger, otpProof);

    if (!verifyResult.success) {
      const errorMsg = verifyResult.error?.toLowerCase() || "";
      if (errorMsg.includes("expired")) {
        return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
      }
      if (errorMsg.includes("no active otp")) {
        return NextResponse.json({ error: "OTP not found" }, { status: 400 });
      }
      return NextResponse.json(
        {
          error: verifyResult.error || "Invalid OTP",
          isLocked: verifyResult.isLocked || false,
          remainingAttempts: verifyResult.remainingAttempts,
        },
        { status: verifyResult.isLocked ? 429 : 400 }
      );
    }

    // If trigger is not login (e.g. register verification or standalone check), return verification success directly
    if (trigger !== "login") {
      return NextResponse.json({
        success: true,
        message: "OTP verified successfully!",
      });
    }

    // OTP verification successful for login! Resolve user in SQLite or MongoDB Atlas
    let [user] = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
    let isNewUser = false;

    // Check MongoDB Atlas if not in local SQLite cache (e.g. fresh lambda container)
    if (!user) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mongoUser = await mongo.collection("users").findOne({ phone: cleanPhone });
          if (mongoUser) {
            const { getSqliteDb } = await import("@/db");
            const sqlite = getSqliteDb();
            sqlite.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, status, access_type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mongoUser.id || undefined,
              mongoUser.name || `Patron ${cleanPhone.slice(-4)}`,
              mongoUser.email || `${cleanPhone}@patron.vardayini.com`,
              cleanPhone,
              mongoUser.passwordHash || "",
              mongoUser.role || "customer",
              mongoUser.status || "active",
              mongoUser.accessType || "full"
            );
            [user] = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
          }
        }
      } catch (mongoErr) {
        console.warn("[Verify OTP] Mongo lookup notice:", mongoErr);
      }
    }

    // If user still does not exist, auto-provision customer account
    if (!user) {
      isNewUser = true;
      const initialName = providedName && providedName.length >= 2 ? providedName : `Patron ${cleanPhone.slice(-4)}`;
      const initialEmail = providedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providedEmail)
        ? providedEmail
        : `${cleanPhone}@patron.vardayini.com`;

      try {
        const [insertRes] = await db.insert(users).values({
          name: initialName,
          email: initialEmail,
          phone: cleanPhone,
          passwordHash: "",
          role: "customer",
        });

        if (insertRes?.insertId) {
          const [created] = await db.select().from(users).where(eq(users.id, insertRes.insertId)).limit(1);
          user = created;
        }
      } catch (insertErr) {
        console.warn("[Verify OTP] User auto-provision notice:", insertErr);
        const [fallbackUser] = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
        user = fallbackUser;
      }
    } else {
      // If user exists and currently has a placeholder name/email, update if provided
      let shouldUpdate = false;
      const updates: { name?: string; email?: string } = {};

      if (user.name.startsWith("Patron ") && providedName && providedName.length >= 2) {
        updates.name = providedName;
        shouldUpdate = true;
      }
      if (user.email.endsWith("@patron.vardayini.com") && providedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providedEmail)) {
        updates.email = providedEmail;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        try {
          await db.update(users).set(updates).where(eq(users.id, user.id));
          const [refreshed] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
          if (refreshed) user = refreshed;
        } catch (updateErr) {
          console.warn("[Verify OTP] User update notice:", updateErr);
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to establish user account. Please try again." },
        { status: 500 }
      );
    }

    // Determine if customer profile still needs completion
    const isGenericPatron =
      !user.name ||
      user.name.startsWith("Patron ") ||
      !user.email ||
      user.email.endsWith("@patron.vardayini.com");
    const needsProfileCompletion = isNewUser || isGenericPatron;

    // Synchronize user to MongoDB Atlas so all serverless functions recognize this customer
    try {
      const { syncUserToMongo } = await import("@/lib/mongodb");
      await syncUserToMongo({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash || "",
        role: user.role,
        status: user.status || "active",
        accessType: user.accessType || "full",
      });
    } catch {}

    // Generate signed HMAC session token and set HTTP-only cookie with verified user payload
    const token = await setAuthCookie(user.id, {
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });
    await mergeGuestCart(user.id);

    // Record login/registration activity
    try {
      void recordAdminNotification({
        type: isNewUser ? "user_registered" : "user_login",
        title: isNewUser ? "New Customer via Mobile OTP 🌟" : "Customer Logged In via OTP 📱",
        message: `${user.name} (${cleanPhone}) successfully authenticated via OTP.`,
        data: { userId: user.id, phone: cleanPhone, isNewUser },
      }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Verification successful",
      token,
      isNewUser,
      needsProfileCompletion,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[API /api/auth/verify-otp Error]:", error);
    return NextResponse.json({ error: "Failed to process verification" }, { status: 500 });
  }
}
