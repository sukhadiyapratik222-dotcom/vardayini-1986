import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { loginHistory } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/security/history
 * Returns recent login history and security events.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req, "admins:view");
  if (auth.error) return auth.error;

  try {
    const history = await db
      .select()
      .from(loginHistory)
      .orderBy(desc(loginHistory.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (err: any) {
    console.error("[GetLoginHistory] Error:", err);
    return NextResponse.json({ error: "Failed to retrieve login history" }, { status: 500 });
  }
}
