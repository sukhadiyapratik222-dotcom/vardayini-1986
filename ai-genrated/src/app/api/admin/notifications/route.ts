import { count, desc, eq } from "drizzle-orm";
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

  let notifications = await db
    .select()
    .from(adminNotifications)
    .orderBy(desc(adminNotifications.createdAt))
    .limit(limit);

  // If local list is empty, hydrate from MongoDB
  if (notifications.length === 0) {
    try {
      const { getNotificationsFromMongo } = await import("@/lib/mongodb");
      const mongoNotifs = await getNotificationsFromMongo(limit);
      if (mongoNotifs && mongoNotifs.length > 0) {
        for (const n of mongoNotifs) {
          try {
            await db.insert(adminNotifications).values({
              id: n.id || undefined,
              type: n.type || "system",
              title: n.title || "",
              message: n.message || "",
              data: typeof n.data === "object" ? JSON.stringify(n.data) : (n.data || null),
              isRead: Boolean(n.isRead),
            });
          } catch {}
        }
        notifications = await db
          .select()
          .from(adminNotifications)
          .orderBy(desc(adminNotifications.createdAt))
          .limit(limit);
      }
    } catch {}
  }

  const [unreadResult] = await db
    .select({ count: count() })
    .from(adminNotifications)
    .where(eq(adminNotifications.isRead, false));

  return Response.json({
    notifications,
    unreadCount: Number(unreadResult?.count || 0),
  });
}

export async function PUT(request: Request) {
  await ensureDbMigrations();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  const allParam = url.searchParams.get("all");

  const { markNotificationReadInMongo } = await import("@/lib/mongodb");

  if (allParam === "true") {
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    try { await markNotificationReadInMongo(null, true); } catch {}
    return Response.json({ success: true, message: "All notifications marked as read." });
  }

  if (idParam) {
    const id = parseInt(idParam, 10);
    if (!isNaN(id)) {
      await db
        .update(adminNotifications)
        .set({ isRead: true })
        .where(eq(adminNotifications.id, id));
      try { await markNotificationReadInMongo(id, false); } catch {}
      return Response.json({ success: true, message: "Notification marked as read." });
    }
  }

  const body = await readJsonSafe<{ id?: number; all?: boolean }>(request);
  if (body?.all) {
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    try { await markNotificationReadInMongo(null, true); } catch {}
    return Response.json({ success: true, message: "All notifications marked as read." });
  }

  if (body?.id && (typeof body.id === "number" || !isNaN(Number(body.id)))) {
    const targetId = Number(body.id);
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, targetId));
    try { await markNotificationReadInMongo(targetId, false); } catch {}
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

  const { deleteNotificationFromMongo } = await import("@/lib/mongodb");

  if (allParam === "true") {
    await db.delete(adminNotifications);
    try { await deleteNotificationFromMongo(null, true); } catch {}
    return Response.json({ success: true, message: "All notifications deleted." });
  }

  if (idParam) {
    const id = parseInt(idParam, 10);
    if (!isNaN(id)) {
      await db.delete(adminNotifications).where(eq(adminNotifications.id, id));
      try { await deleteNotificationFromMongo(id, false); } catch {}
      return Response.json({ success: true, message: "Notification deleted." });
    }
  }

  const body = await readJsonSafe<{ id?: number; all?: boolean }>(request);
  if (body?.all) {
    await db.delete(adminNotifications);
    try { await deleteNotificationFromMongo(null, true); } catch {}
    return Response.json({ success: true, message: "All notifications deleted." });
  }
  if (body?.id) {
    const targetId = Number(body.id);
    await db.delete(adminNotifications).where(eq(adminNotifications.id, targetId));
    try { await deleteNotificationFromMongo(targetId, false); } catch {}
    return Response.json({ success: true, message: "Notification deleted." });
  }

  return Response.json({ error: "Specify id or all: true" }, { status: 400 });
}
