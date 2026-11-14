import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin, logActivity } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";
import {
  getAllSlogansAdmin,
  saveSloganAdmin,
  deleteSloganAdmin,
  checkScheduleConflict,
} from "@/lib/slogans";

export const dynamic = "force-dynamic";

async function requireSlogansAdmin(request: Request, action: "view" | "manage" = "manage") {
  const auth = await requireAdmin(request, `slogans:${action}`);
  if (!auth.error) return auth;
  // Fallbacks: allow super_admin or products/settings managers
  const authProducts = await requireAdmin(request, `products:${action}`);
  if (!authProducts.error) return authProducts;
  const authSettings = await requireAdmin(request, `settings:${action}`);
  if (!authSettings.error) return authSettings;
  return auth;
}

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireSlogansAdmin(request, "view");
    if (auth.error) return auth.error;

    const result = await getAllSlogansAdmin();

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("[api/admin/slogans] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load slogans" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireSlogansAdmin(request, "manage");
    if (auth.error) return auth.error;

    const body = await readJsonSafe<any>(request);
    if (!body || !body.text || !body.text.trim()) {
      return NextResponse.json({ ok: false, error: "Main slogan text is required" }, { status: 400 });
    }

    if (body.text.trim().length > 120) {
      return NextResponse.json({ ok: false, error: "Slogan text exceeds maximum character length (120)" }, { status: 400 });
    }

    // Check for scheduling conflict if status is active or scheduled
    if (body.startAt && body.endAt && (body.status === "active" || body.status === "scheduled")) {
      const conflict = await checkScheduleConflict(body.startAt, body.endAt);
      if (conflict) {
        if (body.replaceExisting || body.overrideConflict) {
          const { getSqliteDb } = await import("@/db");
          const sqlite = getSqliteDb();
          sqlite
            .prepare(
              "UPDATE slogans SET status = 'draft' WHERE (status = 'active' OR status = 'scheduled') AND NOT (end_at <= ? OR start_at >= ?)"
            )
            .run(body.startAt, body.endAt);
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: `Schedule conflict: overlaps with existing slogan "${conflict.text}" (${new Date(conflict.startAt).toLocaleDateString()} - ${new Date(conflict.endAt).toLocaleDateString()})`,
              conflict,
            },
            { status: 409 }
          );
        }
      }
    }

    const created = await saveSloganAdmin({
      ...body,
      createdBy: auth.user.id,
    });

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "slogan:create",
      module: "slogans",
      recordId: created.id,
      details: `Created weekly slogan: "${created.text}"`,
    });

    return NextResponse.json({ ok: true, slogan: created });
  } catch (err) {
    console.error("[api/admin/slogans] POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create slogan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireSlogansAdmin(request, "manage");
    if (auth.error) return auth.error;

    const body = await readJsonSafe<any>(request);
    if (!body || !body.id) {
      return NextResponse.json({ ok: false, error: "Slogan id is required for update" }, { status: 400 });
    }

    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ ok: false, error: "Main slogan text is required" }, { status: 400 });
    }

    // Check for scheduling conflict
    if (body.startAt && body.endAt && (body.status === "active" || body.status === "scheduled")) {
      const conflict = await checkScheduleConflict(body.startAt, body.endAt, Number(body.id));
      if (conflict) {
        if (body.replaceExisting || body.overrideConflict) {
          const { getSqliteDb } = await import("@/db");
          const sqlite = getSqliteDb();
          sqlite
            .prepare(
              "UPDATE slogans SET status = 'draft' WHERE (status = 'active' OR status = 'scheduled') AND NOT (end_at <= ? OR start_at >= ?) AND id != ?"
            )
            .run(body.startAt, body.endAt, Number(body.id));
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: `Schedule conflict: overlaps with existing slogan "${conflict.text}" (${new Date(conflict.startAt).toLocaleDateString()} - ${new Date(conflict.endAt).toLocaleDateString()})`,
              conflict,
            },
            { status: 409 }
          );
        }
      }
    }

    const updated = await saveSloganAdmin(body);

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "slogan:update",
      module: "slogans",
      recordId: updated.id,
      details: `Updated weekly slogan #${updated.id}: "${updated.text}"`,
    });

    return NextResponse.json({ ok: true, slogan: updated });
  } catch (err) {
    console.error("[api/admin/slogans] PUT error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update slogan" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireSlogansAdmin(request, "manage");
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id || isNaN(id)) {
      return NextResponse.json({ ok: false, error: "Invalid slogan id" }, { status: 400 });
    }

    await deleteSloganAdmin(id);

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "slogan:delete",
      module: "slogans",
      recordId: id,
      details: `Deleted weekly slogan #${id}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/slogans] DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to delete slogan" },
      { status: 500 }
    );
  }
}
