import { NextResponse } from "next/server";
import { verifyOTP, OtpTrigger } from "@/lib/otp-service";
import { SlidingWindowRateLimiter, sanitizeString } from "@/lib/security";

const verifyIpLimiter = new SlidingWindowRateLimiter(60 * 1000, 15); // 15 verification attempts per minute per IP

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || "unknown-ip";
    const ipCheck = verifyIpLimiter.check(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a moment." },
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
    const otp = sanitizeString(body?.otp || body?.otpCode || "");
    const trigger = (sanitizeString(body?.trigger || "login") || "login") as OtpTrigger;
    const otpProof = sanitizeString(body?.otpProof || "");

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    if (!otp) {
      return NextResponse.json({ error: "OTP code is required." }, { status: 400 });
    }

    const result = await verifyOTP(phone, otp, trigger, otpProof);

    if (!result.success) {
      const statusCode = result.isLocked ? 429 : 400;
      return NextResponse.json(
        {
          error: result.error || "Invalid OTP.",
          isLocked: result.isLocked || false,
          retryAfterSeconds: result.retryAfterSeconds,
          remainingAttempts: result.remainingAttempts,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || "OTP verified successfully!",
    });
  } catch (error: any) {
    console.error("[API /api/otp/verify Error]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying OTP." },
      { status: 500 }
    );
  }
}
