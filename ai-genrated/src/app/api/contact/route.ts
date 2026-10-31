import { NextResponse } from "next/server";
import { readJsonSafe, isValidPhone } from "@/lib/validation";
import { EMAIL_REGEX } from "@/lib/validation-constants";
import { sanitizeString } from "@/lib/security";
import { recordAdminNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonSafe<{
      name?: unknown;
      email?: unknown;
      phone?: unknown;
      subject?: unknown;
      message?: unknown;
    }>(request);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? sanitizeString(body.name.trim()) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const subject = typeof body.subject === "string" ? sanitizeString(body.subject.trim()) : "General Inquiry";
    const message = typeof body.message === "string" ? sanitizeString(body.message.trim()) : "";

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please enter your name (at least 2 characters)." }, { status: 400 });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: "Please enter a valid Indian mobile number." }, { status: 400 });
    }

    if (!message || message.length < 5) {
      return NextResponse.json({ error: "Please provide your message or inquiry (at least 5 characters)." }, { status: 400 });
    }

    // Record admin notification for instant attention
    try {
      await recordAdminNotification({
        type: "system",
        title: `New Customer Inquiry: ${name}`,
        message: `Inquiry from ${name} (${email}${phone ? `, ${phone}` : ""}): "${message}"`,
        data: {
          name,
          email,
          phone,
          subject,
          message,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (notifErr) {
      console.warn("[Contact API] Notification warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for reaching out to Vardayini Sweet Mart! Our team will get back to you shortly.",
      inquiry: {
        name,
        email,
        phone,
        subject,
        message,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Contact API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit contact inquiry." },
      { status: 500 }
    );
  }
}
