import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, getSqliteDb } from "@/db";
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

    let [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);

    // Multi-container fallback: Check MongoDB Atlas if user was created on another container
    if (!target) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mUser = await mongo.collection("users").findOne({
            $or: [{ id: targetId }, { id: Number(targetId) }, { _id: String(targetId) as any }],
          });
          if (mUser) {
            const sqlite = getSqliteDb();
            sqlite.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, status, must_change_password, access_type, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mUser.id || targetId,
              mUser.name || "Admin",
              (mUser.email || "").toLowerCase().trim(),
              mUser.phone || "9000000000",
              mUser.passwordHash || mUser.password_hash || "",
              mUser.role || "admin",
              mUser.status || "active",
              1,
              mUser.accessType || mUser.access_type || "full",
              mUser.createdAt ? new Date(mUser.createdAt).toISOString() : new Date().toISOString()
            );
            [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
          }
        }
      } catch (mErr) {
        console.warn("[ResetAdminPassword] MongoDB lookup notice:", mErr);
      }
    }

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

    // Multi-container persistence: Sync password reset directly to MongoDB Atlas
    try {
      const { updateAdminInMongo } = await import("@/lib/mongodb");
      await updateAdminInMongo(
        { id: targetId, email: target.email },
        { passwordHash, mustChangePassword: true }
      );
    } catch (mPassErr) {
      console.warn("[ResetAdminPassword] MongoDB update notice:", mPassErr);
    }

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
