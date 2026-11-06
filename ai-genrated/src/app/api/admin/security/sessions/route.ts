import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, users } from "@/db/schema";
import { requireAdmin, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/security/sessions
 * Returns active admin sessions.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req, "admins:view");
  if (auth.error) return auth.error;

  try {
    const sessions = await db
      .select({
        id: adminSessions.id,
        userId: adminSessions.userId,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        ipAddress: adminSessions.ipAddress,
        userAgent: adminSessions.userAgent,
        expiresAt: adminSessions.expiresAt,
        isActive: adminSessions.isActive,
        createdAt: adminSessions.createdAt,
      })
      .from(adminSessions)
      .leftJoin(users, eq(adminSessions.userId, users.id))
      .orderBy(desc(adminSessions.createdAt));

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (err: any) {
    console.error("[GetSessions] Error:", err);
    return NextResponse.json({ error: "Failed to retrieve active sessions" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/security/sessions?id=...
 * Revokes an active session.
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req, "admins:edit");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid Session ID is required" }, { status: 400 });
    }

    await db.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.id, id));

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "REVOKE_SESSION",
      module: "admins",
      recordId: id,
      details: `Revoked admin session #${id}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Session successfully revoked.",
    });
  } catch (err: any) {
    console.error("[RevokeSession] Error:", err);
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
}
