import { NextResponse } from "next/server";
import { sendOTP, OtpTrigger } from "@/lib/otp-service";
import { SlidingWindowRateLimiter, sanitizeString } from "@/lib/security";

const ipLimiter = new SlidingWindowRateLimiter(60 * 1000, 10); // 10 requests per minute per IP

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const clientIp = request.headers.get("x-forwarded-for") || "unknown-ip";
    const ipCheck = ipLimiter.check(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting another OTP." },
        { status: 429 }
      );
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const phone = sanitizeString(body?.phone || body?.phoneNumber || "");
    const trigger = (sanitizeString(body?.trigger || "login") || "login") as OtpTrigger;
    const length = body?.length === 6 ? 6 : 4;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const validTriggers = ["register", "login", "order", "pickup_verification"];
    if (!validTriggers.includes(trigger)) {
      return NextResponse.json(
        { error: "Invalid trigger. Must be register, login, order, or pickup_verification." },
        { status: 400 }
      );
    }

    const result = await sendOTP(phone, trigger, { length });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch OTP." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      otpSent: true,
      isSimulated: result.isSimulated || false,
      message: result.message || "OTP has been sent to your mobile number.",
      expiresAt: result.expiresAt,
      // In development mode, provide OTP to assist frontend developer testing
      ...(process.env.NODE_ENV !== "production" && result.otp ? { devOtp: result.otp } : {}),
    });
  } catch (error: any) {
    console.error("[API /api/otp/send Error]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending OTP." },
      { status: 500 }
    );
  }
}
