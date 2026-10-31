import { sql } from "drizzle-orm";
import { db } from "@/db";
import { adminNotifications } from "@/db/schema";

let tableEnsured = false;

export async function ensureNotificationTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`admin_notifications\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`type\` varchar(40) NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`message\` text NOT NULL,
        \`data\` text,
        \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn("ensureNotificationTable notice:", err);
  }
}

export interface NotificationPayload {
  type: "order_created" | "order_cancelled" | "user_login" | "user_registered" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

export async function recordAdminNotification(payload: NotificationPayload) {
  try {
    await ensureNotificationTable();
    let notifId: number | null = null;
    try {
      const [res] = await db.insert(adminNotifications).values({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ? JSON.stringify(payload.data) : null,
        isRead: false,
      });
      if ((res as any)?.insertId) {
        notifId = Number((res as any).insertId);
      }
    } catch (dbErr) {
      console.warn("[Notifications] Local DB insert notice:", dbErr);
    }

    // Maintain in MongoDB (background async)
    import("./mongodb")
      .then(({ syncNotificationToMongo }) => {
        syncNotificationToMongo({
          id: notifId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data ?? null,
          isRead: false,
          createdAt: new Date(),
        }).catch(() => {});
      })
      .catch(() => {});

    // Maintain in MySQL (background async)
    import("./mysql")
      .then(({ syncNotificationToMysql }) => {
        syncNotificationToMysql({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data ?? null,
        }).catch(() => {});
      })
      .catch(() => {});
  } catch (err) {
    console.error("Failed to record admin notification:", err);
  }
}
