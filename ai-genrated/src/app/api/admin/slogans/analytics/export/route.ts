import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { exportSloganAnalyticsCsv } from "@/lib/slogans";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireAdmin(request, "slogans:view");
    if (auth.error) return auth.error;

    const csvContent = await exportSloganAnalyticsCsv();
    const filename = `vardayini-weekly-slogans-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/admin/slogans/analytics/export] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to export CSV" },
      { status: 500 }
    );
  }
}
