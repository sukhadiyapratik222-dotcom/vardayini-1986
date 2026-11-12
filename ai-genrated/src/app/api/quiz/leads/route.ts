import { NextRequest } from "next/server";
import { db } from "@/db";
import { quizLeads } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leads = await db
      .select()
      .from(quizLeads)
      .orderBy(desc(quizLeads.createdAt))
      .limit(100);

    return Response.json({
      success: true,
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name || "Anonymous Sweet Lover",
        phone: l.phone || "-",
        email: l.email || "-",
        marketingConsent: Boolean(l.marketingConsent),
        personalitySlug: l.personalitySlug || "standard",
        answers: l.answers ? JSON.parse(l.answers) : {},
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
      })),
      totalCount: leads.length,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load leads" }, { status: 500 });
  }
}

