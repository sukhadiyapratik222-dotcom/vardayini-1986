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

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
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
      ...(result.otp ? { devOtp: result.otp } : {}),
    });
  } catch (error: any) {
    console.error("[API /api/auth/send-otp Error]:", error);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
