import { NextRequest } from "next/server";
import { saveQuizLead } from "@/lib/taste-quiz";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      email,
      marketingConsent,
      personalitySlug,
      answers,
      matchedProductIds,
      userId,
      sessionId,
    } = body;

    if (!name && !phone && !email) {
      return Response.json(
        { error: "Please provide at least a name, phone, or email" },
        { status: 400 }
      );
    }

    const res = await saveQuizLead({
      userId: userId ? Number(userId) : null,
      sessionId: sessionId || null,
      name,
      phone,
      email,
      marketingConsent: Boolean(marketingConsent),
      personalitySlug,
      answers,
      matchedProductIds: Array.isArray(matchedProductIds) ? matchedProductIds : [],
    });

    if (!res.success) {
      return Response.json({ error: res.error || "Failed to save lead" }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Lead recorded successfully. Your personalized match is ready!",
      leadId: res.leadId,
    });
  } catch (err: any) {
    console.error("[Quiz Lead API] Error:", err);
    return Response.json({ error: err.message || "Failed to record lead" }, { status: 500 });
  }
}

