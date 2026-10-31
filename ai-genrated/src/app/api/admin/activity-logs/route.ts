import { desc, eq, like, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/activity-logs
 * Retrieves administrative audit trail logs.
 * Strictly protected: Super Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const moduleFilter = searchParams.get("module")?.trim();
    const search = searchParams.get("search")?.trim();

    let query = db.select().from(activityLogs).$dynamic();

    const conditions = [];
    if (moduleFilter && moduleFilter !== "all") {
      conditions.push(eq(activityLogs.module, moduleFilter));
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          like(activityLogs.userName, pattern),
          like(activityLogs.userEmail, pattern),
          like(activityLogs.action, pattern),
          like(activityLogs.details, pattern)
        )
      );
    }

    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(sql`${conditions[0]} AND ${conditions[1]}`);
    }

    const logs = await query
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count for pagination
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs);

    return NextResponse.json({
      logs,
      total: Number(countRow?.count || 0),
      limit,
      offset,
    });
  } catch (err) {
    console.error("[GetActivityLogs] Error:", err);
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}
