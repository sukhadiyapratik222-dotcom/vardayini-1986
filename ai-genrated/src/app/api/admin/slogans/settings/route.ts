import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin, logActivity } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";
import { getSloganSettingsAdmin, updateSloganSettingsAdmin } from "@/lib/slogans";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireAdmin(request, "slogans:view");
    if (auth.error) return auth.error;

    const settings = await getSloganSettingsAdmin();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/admin/slogans/settings] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireAdmin(request, "slogans:manage");
    if (auth.error) return auth.error;

    const body = await readJsonSafe<any>(request);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Settings payload required" }, { status: 400 });
    }

    const updated = await updateSloganSettingsAdmin(body);

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "slogan_settings:update",
      module: "slogans",
      recordId: updated.id,
      details: `Updated weekly slogan section settings (enabled: ${updated.enabled}, location: ${updated.location})`,
    });

    return NextResponse.json({ ok: true, settings: updated });
  } catch (err) {
    console.error("[api/admin/slogans/settings] PUT error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save settings" },
      { status: 500 }
    );
  }
}
