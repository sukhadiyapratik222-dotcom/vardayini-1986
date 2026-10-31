import { NextResponse } from "next/server";
import { getFestivalProductsWithVariants } from "@/db/festivals";
import { ensureSeeded } from "@/db/seed";
import { getUiConfigSafe } from "@/lib/ui-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const items = await getFestivalProductsWithVariants();
    const cfg = getUiConfigSafe();
    const config = cfg?.festivalPage || null;
    return NextResponse.json({ ok: true, items, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load festival items" },
      { status: 500 }
    );
  }
}
