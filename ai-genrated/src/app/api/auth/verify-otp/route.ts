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

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!userOtp) {
      return NextResponse.json({ error: "OTP code is required" }, { status: 400 });
    }

    const cleanPhone = normalizeIndianPhone(phoneNumber);

    // Verify OTP using database persistent store with 5-minute expiration
    const verifyResult = await verifyOTP(cleanPhone, userOtp, trigger);

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

    // OTP verification successful for login! Resolve session / JWT token creation
    let [user] = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
    let isNewUser = false;

    // If user does not exist by phone, automatically provision a customer account
    if (!user) {
      isNewUser = true;
      const autoEmail = `${cleanPhone}@patron.vardayini.com`;
      try {
        const [insertRes] = await db.insert(users).values({
          name: `Patron ${cleanPhone.slice(-4)}`,
          email: autoEmail,
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
        // Fallback query if email or race condition occurred
        const [fallbackUser] = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
        user = fallbackUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to establish user account. Please try again." },
        { status: 500 }
      );
    }

    // Generate signed HMAC session token and set HTTP-only cookie
    const token = await setAuthCookie(user.id);
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
