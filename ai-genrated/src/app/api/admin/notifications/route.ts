import { desc, eq, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { adminNotifications } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";
import { ensureNotificationTable } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDbMigrations();
  await ensureNotificationTable();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam || 50, 1), 100);

  const notifications = await db
    .select()
    .from(adminNotifications)
    .orderBy(desc(adminNotifications.createdAt))
    .limit(limit);

  const [unreadResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminNotifications)
    .where(eq(adminNotifications.isRead, false));

  return Response.json({
    notifications,
    unreadCount: unreadResult?.count || 0,
  });
}

export async function PUT(request: Request) {
  await ensureDbMigrations();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe<{ id?: number; all?: boolean }>(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (body.all) {
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    return Response.json({ success: true, message: "All notifications marked as read." });
  }

  if (body.id && typeof body.id === "number") {
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, body.id));
    return Response.json({ success: true, message: "Notification marked as read." });
  }

  return Response.json({ error: "Specify id or all: true" }, { status: 400 });
}

export async function DELETE(request: Request) {
  await ensureDbMigrations();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  const allParam = url.searchParams.get("all");

  if (allParam === "true") {
    await db.delete(adminNotifications);
    return Response.json({ success: true, message: "All notifications deleted." });
  }

  if (idParam) {
    const id = parseInt(idParam, 10);
    if (!isNaN(id)) {
      await db.delete(adminNotifications).where(eq(adminNotifications.id, id));
      return Response.json({ success: true, message: "Notification deleted." });
    }
  }

  const body = await readJsonSafe<{ id?: number; all?: boolean }>(request);
  if (body?.all) {
    await db.delete(adminNotifications);
    return Response.json({ success: true, message: "All notifications deleted." });
  }
  if (body?.id) {
    await db.delete(adminNotifications).where(eq(adminNotifications.id, body.id));
    return Response.json({ success: true, message: "Notification deleted." });
  }

  return Response.json({ error: "Specify id or all: true" }, { status: 400 });
}
