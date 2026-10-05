import { sql } from "drizzle-orm";
import { db } from "@/db";
import { adminNotifications } from "@/db/schema";

let tableEnsured = false;

export async function ensureNotificationTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "admin_notifications" (
        "id" serial PRIMARY KEY,
        "type" varchar(40) NOT NULL,
        "title" varchar(200) NOT NULL,
        "message" text NOT NULL,
        "data" text,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn("ensureNotificationTable notice:", err);
  }
}

export interface NotificationPayload {
  type: "order_created" | "user_login" | "user_registered" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

export async function recordAdminNotification(payload: NotificationPayload) {
  try {
    await ensureNotificationTable();
    await db.insert(adminNotifications).values({
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data ? JSON.stringify(payload.data) : null,
      isRead: false,
    });
  } catch (err) {
    console.error("Failed to record admin notification:", err);
  }
}
