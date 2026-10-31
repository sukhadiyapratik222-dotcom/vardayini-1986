import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSuperAdmin, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { adminId, newPassword } = body;

    const targetId = Number(adminId);
    if (!targetId || isNaN(targetId)) {
      return NextResponse.json({ error: "Valid adminId is required" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New temporary password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true, // Forces password change on login
      })
      .where(eq(users.id, targetId));

    // Audit log
    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "RESET_ADMIN_PASSWORD",
      module: "admin_management",
      details: `Super Admin reset password for ${target.email}. Forced change enabled.`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${target.email}. They will be required to change it on their next login.`,
    });
  } catch (err) {
    console.error("[ResetAdminPassword] Error:", err);
    return NextResponse.json({ error: "Failed to reset admin password" }, { status: 500 });
  }
}
