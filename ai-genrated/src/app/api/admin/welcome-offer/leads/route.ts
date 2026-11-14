import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exportCsv = searchParams.get("format") === "csv";

    const sqlite = getSqliteDb();
    const leads = sqlite
      .prepare(
        "SELECT id, contact, contact_type, coupon_code, discount_percent, marketing_consent, source_url, status, claimed_at FROM welcome_offer_leads ORDER BY id DESC"
      )
      .all() as any[];

    if (exportCsv) {
      const header = "ID,Contact,Type,Coupon Code,Discount (%),Marketing Consent,Source URL,Status,Claimed At\n";
      const rows = leads
        .map((l) =>
          [
            l.id,
            `"${String(l.contact).replace(/"/g, '""')}"`,
            l.contact_type,
            l.coupon_code,
            l.discount_percent,
            l.marketing_consent ? "Yes" : "No",
            `"${String(l.source_url || "/").replace(/"/g, '""')}"`,
            l.status,
            `"${l.claimed_at}"`,
          ].join(",")
        )
        .join("\n");

      return new Response(header + rows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="welcome-offer-leads.csv"',
        },
      });
    }

    const totalLeads = leads.length;
    const emailLeads = leads.filter((l) => l.contact_type === "email").length;
    const phoneLeads = leads.filter((l) => l.contact_type === "phone").length;

    return NextResponse.json({
      ok: true,
      stats: {
        totalLeads,
        emailLeads,
        phoneLeads,
      },
      leads: leads.slice(0, 50), // Return recent 50 leads
    });
  } catch (err: any) {
    console.error("[WelcomeOffer] Admin leads error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch leads" }, { status: 500 });
  }
}
