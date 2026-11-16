import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isValidEmail,
  normalizeEmail,
  checkRateLimit,
  generateSecureOtp,
  hashOtp,
  emailOtpStore,
  sendEmailOtp,
} from "@/lib/email-otp";

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
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

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

    // 1. Email format validation
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. IP-based rate limiting (max 10 requests per 10 minutes)
    const ipCheck = checkRateLimit(`ip:${clientIp}`, 10, 10 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts from this network. Please retry in ${ipCheck.retryAfter} seconds.`,
          retryAfter: ipCheck.retryAfter,
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 3. Email-based rate limiting (max 3 requests per 10 minutes)
    const emailCheck = checkRateLimit(`email:${email}`, 3, 10 * 60 * 1000);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification requests for this email. Please wait ${emailCheck.retryAfter} seconds.`,
          retryAfter: emailCheck.retryAfter,
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 4. 60-second resend cooldown per email
    const now = Date.now();
    const existing = emailOtpStore.get(email);
    if (existing && now - existing.lastSentAt < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
          cooldownRemaining: waitSeconds,
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 5. Generate secure 6-digit OTP using crypto.randomInt (not Math.random)
    const rawOtp = generateSecureOtp();
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedOtp = hashOtp(rawOtp, salt);

    // 6. Store only the hashed OTP, salt, attempts, and 5-minute expiry (NEVER plain text)
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes
    emailOtpStore.set(email, {
      email,
      hashedOtp,
      salt,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    });

    // 7. Dispatch clean, branded HTML email
    const emailResult = await sendEmailOtp(email, rawOtp);

    // 8. Generic response that avoids revealing account existence
    return NextResponse.json(
      {
        success: true,
        message: "If an account matches this email, a 6-digit verification code has been sent.",
        expiresInSeconds: 300,
        cooldownSeconds: 60,
        // In local development or test without live SMTP, expose devOtp for quick testing
        ...(process.env.NODE_ENV !== "production" && emailResult.mode === "dev_simulated"
          ? { devOtp: rawOtp }
          : {}),
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("[POST /api/send-otp Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while processing verification code." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
