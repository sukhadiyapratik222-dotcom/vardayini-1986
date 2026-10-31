import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthUser, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Fetch the user's existing password hash from DB
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If current password provided, verify it
    if (currentPassword) {
      const match = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!match) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    } else if (!dbUser.mustChangePassword) {
      // If user is not flagged for forced change, current password is required
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
      })
      .where(eq(users.id, user.id));

    // Audit log
    await logActivity({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: "PASSWORD_CHANGED",
      module: "auth",
      details: "User changed their password successfully",
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. Your account is now fully secured.",
    });
  } catch (err) {
    console.error("[ChangePassword] Error:", err);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
