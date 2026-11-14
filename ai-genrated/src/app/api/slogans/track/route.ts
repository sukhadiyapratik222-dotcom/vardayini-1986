import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { recordSloganMetric } from "@/lib/slogans";
import { readJsonSafe } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await readJsonSafe<{ sloganId?: number; eventType?: "view" | "click" | "add_to_cart" }>(request);

    if (!body || !body.sloganId || !body.eventType) {
      return NextResponse.json({ ok: false, error: "Missing sloganId or eventType" }, { status: 400 });
    }

    if (!["view", "click", "add_to_cart"].includes(body.eventType)) {
      return NextResponse.json({ ok: false, error: "Invalid eventType" }, { status: 400 });
    }

    await recordSloganMetric(Number(body.sloganId), body.eventType);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/slogans/track] Error:", err);
    return NextResponse.json({ ok: false, error: "Tracking error" }, { status: 500 });
  }
}
