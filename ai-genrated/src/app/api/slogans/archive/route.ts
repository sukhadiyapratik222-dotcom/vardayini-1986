import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { getPastSlogansArchive } from "@/lib/slogans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const pastSlogans = await getPastSlogansArchive(20);

    return NextResponse.json({
      ok: true,
      archive: pastSlogans,
    });
  } catch (err) {
    console.error("[api/slogans/archive] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load slogans archive" },
      { status: 500 }
    );
  }
}
