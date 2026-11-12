import { NextRequest } from "next/server";
import { getQuizSettings } from "@/lib/taste-quiz";
import { db } from "@/db";
import { quizSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getQuizSettings();
    return Response.json({ success: true, settings });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const existing = await getQuizSettings();

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (body.isEnabled !== undefined) updatePayload.isEnabled = Boolean(body.isEnabled);
    if (body.leadCaptureEnabled !== undefined) updatePayload.leadCaptureEnabled = Boolean(body.leadCaptureEnabled);
    if (body.leadCaptureHeading) updatePayload.leadCaptureHeading = String(body.leadCaptureHeading);
    if (body.leadCaptureSubheading) updatePayload.leadCaptureSubheading = String(body.leadCaptureSubheading);
    if (body.maxResults) updatePayload.maxResults = Math.min(Math.max(Number(body.maxResults), 3), 5);
    if (body.comboDiscountPercent !== undefined) updatePayload.comboDiscountPercent = Number(body.comboDiscountPercent);
    if (body.allergyDisclaimer) updatePayload.allergyDisclaimer = String(body.allergyDisclaimer);
    if (body.pinnedProductId !== undefined) updatePayload.pinnedProductId = body.pinnedProductId ? Number(body.pinnedProductId) : null;

    if (existing && (existing as any).id) {
      await db
        .update(quizSettings)
        .set(updatePayload)
        .where(eq(quizSettings.id, (existing as any).id));
    } else {
      await db.insert(quizSettings).values({
        isEnabled: updatePayload.isEnabled ?? true,
        leadCaptureEnabled: updatePayload.leadCaptureEnabled ?? true,
        leadCaptureHeading: updatePayload.leadCaptureHeading || "Where should we send your mithai match?",
        leadCaptureSubheading: updatePayload.leadCaptureSubheading || "Save your personalized taste profile & unlock a special festive welcome code.",
        maxResults: updatePayload.maxResults || 4,
        comboDiscountPercent: updatePayload.comboDiscountPercent ?? 10,
        allergyDisclaimer: updatePayload.allergyDisclaimer || "Please check ingredient lists for severe allergies.",
      });
    }

    const refreshed = await getQuizSettings();
    return Response.json({ success: true, settings: refreshed });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}

