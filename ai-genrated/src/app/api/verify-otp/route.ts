import { NextResponse } from "next/server";
import {
  isValidEmail,
  normalizeEmail,
  emailOtpStore,
  timingSafeCompare,
  signSessionJwt,
} from "@/lib/email-otp";
import { setAuthCookie } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const email = normalizeEmail(body?.email || "");
    const rawOtp = typeof body?.otp === "string" ? body.otp.trim() : "";

    // 1. Basic validation
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!rawOtp || !/^\d{6}$/.test(rawOtp)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit verification code." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const record = emailOtpStore.get(email);
    if (!record) {
      return NextResponse.json(
        { error: "Verification code expired or not found. Please request a new code." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const now = Date.now();

    // 2. Expiry check (5 minutes)
    if (now > record.expiresAt) {
      emailOtpStore.delete(email);
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 3. Brute-force lockout check (max 5 wrong attempts)
    if (record.attempts >= 5) {
      emailOtpStore.delete(email);
      return NextResponse.json(
        {
          error: "Too many failed attempts. For your security, this verification code has been revoked. Please request a fresh code.",
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 4. Timing-safe cryptographic comparison
    const isMatch = timingSafeCompare(rawOtp, record);

    if (!isMatch) {
      record.attempts += 1;
      const remainingAttempts = 5 - record.attempts;

      if (remainingAttempts <= 0) {
        emailOtpStore.delete(email);
        return NextResponse.json(
          {
            error: "Too many failed attempts. Code has been revoked. Please request a fresh code.",
          },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      return NextResponse.json(
        {
          error: `Incorrect verification code. ${remainingAttempts} attempt${
            remainingAttempts === 1 ? "" : "s"
          } remaining.`,
          attemptsRemaining: remainingAttempts,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 5. Single-use enforcement: Delete OTP immediately upon successful verification
    emailOtpStore.delete(email);

    // 6. Check if user exists in database to hydrate user ID & role
    let userId: number | null = null;
    let role = "customer";
    let name = "Customer";

    try {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser) {
        userId = existingUser.id;
        role = existingUser.role;
        name = existingUser.name || name;
      }
    } catch {}

    // 7. Issue session JWT
    const token = signSessionJwt(email, {
      userId: userId || undefined,
      role,
      verifiedEmail: true,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Email verification successful.",
        token,
        user: {
          email,
          role,
          name,
          isEmailVerified: true,
        },
      },
      { status: 200, headers: CORS_HEADERS }
    );

    // 8. Set secure HTTP-only session cookie
    if (userId) {
      try {
        await setAuthCookie(userId, { email, role, name });
      } catch {}
    } else {
      response.cookies.set("vs_email_auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[POST /api/verify-otp Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during verification." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
