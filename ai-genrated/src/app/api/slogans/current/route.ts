import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { getActiveWeeklySlogan } from "@/lib/slogans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const result = await getActiveWeeklySlogan();

    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[api/slogans/current] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to fetch weekly slogan" },
      { status: 500 }
    );
  }
}
