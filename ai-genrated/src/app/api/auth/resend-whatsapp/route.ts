import { NextResponse } from "next/server";
import { resendWhatsAppOTP } from "@/lib/otp-service";
import { SlidingWindowRateLimiter, sanitizeString } from "@/lib/security";

const ipLimiter = new SlidingWindowRateLimiter(60 * 1000, 10);

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || "unknown-ip";
    const ipCheck = ipLimiter.check(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
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

    const result = await resendWhatsAppOTP(phoneNumber, trigger);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send WhatsApp message" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp OTP sent successfully",
      isSimulated: result.isSimulated || false,
      ...(process.env.NODE_ENV !== "production" && result.otp ? { devOtp: result.otp } : {}),
    });
  } catch (error: any) {
    console.error("[API /api/auth/resend-whatsapp Error]:", error);
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 500 });
  }
}
