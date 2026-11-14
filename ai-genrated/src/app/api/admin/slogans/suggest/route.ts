import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";
import { generateSloganSuggestions } from "@/lib/slogans";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireAdmin(request, "slogans:manage");
    if (auth.error) return auth.error;

    const body = await readJsonSafe<{ productId?: number; sweetName?: string; festival?: string }>(request);
    if (!body || (!body.productId && !body.sweetName)) {
      return NextResponse.json({ ok: false, error: "Please provide a productId or sweetName" }, { status: 400 });
    }

    const suggestions = await generateSloganSuggestions({
      productId: body.productId,
      sweetName: body.sweetName,
      festival: body.festival,
    });

    return NextResponse.json({
      ok: true,
      suggestions,
    });
  } catch (err) {
    console.error("[api/admin/slogans/suggest] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
