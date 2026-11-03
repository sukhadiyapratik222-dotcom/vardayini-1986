import { NextResponse } from "next/server";
import { sendOTP } from "@/lib/otp-service";
import { SlidingWindowRateLimiter, sanitizeString } from "@/lib/security";

const ipLimiter = new SlidingWindowRateLimiter(60 * 1000, 10);

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || "unknown-ip";
    const ipCheck = ipLimiter.check(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait a minute." },
        { status: 429 }
      );
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const phoneNumber = sanitizeString(body?.phoneNumber || body?.phone || "");
    const trigger = (sanitizeString(body?.trigger || "login") || "login");
    const incomingEmail = sanitizeString(body?.email || "").toLowerCase().trim();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Pre-validation for registration to avoid sending pointless OTPs for accounts that already exist
    if (trigger === "register" && incomingEmail) {
      try {
        const { db } = await import("@/db");
        const { users } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        let [existingUser] = await db.select().from(users).where(eq(users.email, incomingEmail)).limit(1);
        if (!existingUser) {
          const { getMongoDb } = await import("@/lib/mongodb");
          const mongo = await getMongoDb();
          if (mongo) {
            const m = await mongo.collection("users").findOne({ email: incomingEmail });
            if (m) existingUser = m as any;
          }
        }

        if (existingUser && (existingUser.role === "super_admin" || existingUser.role === "admin" || existingUser.role === "staff")) {
          return NextResponse.json(
            {
              error: `An administrator account with email "${incomingEmail}" already exists. Please sign in directly at the login desk.`,
              accountExists: true,
              fields: { email: "An account with this email already exists. Please log in instead." },
              existingEmail: incomingEmail,
              role: existingUser.role,
            },
            { status: 409 }
          );
        }
      } catch (checkErr) {
        console.warn("[send-otp] Early user existence check notice:", checkErr);
      }
    }

    // 6-digit OTP as specified in the implementation design
    const result = await sendOTP(phoneNumber, trigger, { length: 6 });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send SMS" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.isSimulated
        ? `Test OTP generated: ${result.otp}`
        : "SMS OTP sent successfully",
      isSimulated: result.isSimulated || false,
      expiresAt: result.expiresAt,
      ...(result.otp ? { devOtp: result.otp } : {}),
      ...(result.otpProof ? { otpProof: result.otpProof } : {}),
    });
  } catch (error: any) {
    console.error("[API /api/auth/send-otp Error]:", error);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
