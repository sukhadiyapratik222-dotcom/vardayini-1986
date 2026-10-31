import bcrypt from "bcryptjs";
import { and, eq, inArray, or, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminPermissions, permissions as permissionsTable, addresses, cartItems, wishlistItems, reviews, orders } from "@/db/schema";
import { requireSuperAdmin, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/admins
 * Lists all Administrators and the Super Admin.
 * Strictly protected: Super Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const adminRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        accessType: users.accessType,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(eq(users.role, "admin"), eq(users.role, "super_admin")));

    // Fetch custom permissions for custom-access admins
    const customAdminIds = adminRows
      .filter((a) => a.role === "admin" && a.accessType === "custom")
      .map((a) => a.id);

    const permsMap = new Map<number, string[]>();
    if (customAdminIds.length > 0) {
      const perms = await db
        .select()
        .from(adminPermissions)
        .where(inArray(adminPermissions.userId, customAdminIds));

      for (const p of perms) {
        const list = permsMap.get(p.userId) || [];
        list.push(p.permissionSlug);
        permsMap.set(p.userId, list);
      }
    }

    const availablePermissions = await db.select().from(permissionsTable);

    const admins = adminRows.map((a) => ({
      ...a,
      mustChangePassword: Boolean(a.mustChangePassword),
      permissions:
        a.role === "super_admin" || a.accessType === "full"
          ? ["*"]
          : permsMap.get(a.id) || [],
    }));

    return NextResponse.json({ admins, availablePermissions });
  } catch (err) {
    console.error("[GetAdmins] Error:", err);
    return NextResponse.json({ error: "Failed to fetch admin accounts" }, { status: 500 });
  }
}

/**
 * POST /api/admin/admins
 * Creates a new Admin account with temporary password & permissions.
 * Strictly protected: Super Admin only.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, email, phone, password, accessType = "full", permissions = [] } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Admin name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing) {
      return NextResponse.json(
        { error: `An account with email ${cleanEmail} already exists.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.insert(users).values({
      name: name.trim(),
      email: cleanEmail,
      phone: (phone || "9000000000").trim(),
      passwordHash,
      role: "admin",
      status: "active",
      mustChangePassword: true, // Force password change on first login
      accessType: accessType === "custom" ? "custom" : "full",
    });

    const newAdminId = result.insertId;

    // If custom permissions, insert them safely
    if (accessType === "custom" && Array.isArray(permissions) && permissions.length > 0) {
      const allDbPerms = await db.select().from(permissionsTable);
      const slugLookup = new Map<string, string>();
      for (const dp of allDbPerms) {
        slugLookup.set(String(dp.id), dp.slug);
        slugLookup.set(dp.slug, dp.slug);
      }

      for (const p of permissions) {
        const key = String(p).trim();
        const resolvedSlug = slugLookup.get(key) || (typeof p === "string" ? key : "");
        if (resolvedSlug && resolvedSlug !== "*" && resolvedSlug !== "admins:manage" && resolvedSlug !== "logs:view") {
          await db.insert(adminPermissions).values({
            userId: newAdminId,
            permissionSlug: resolvedSlug,
          });
        }
      }
    }

    // Record audit activity log
    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "CREATE_ADMIN",
      module: "admin_management",
      details: `Created new admin account for ${name} (${cleanEmail}) with access type: ${accessType}`,
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Admin account created for ${cleanEmail}. They must change their password on first login.`,
        admin: {
          id: newAdminId,
          name: name.trim(),
          email: cleanEmail,
          phone: phone || "9000000000",
          role: "admin",
          status: "active",
          accessType,
          mustChangePassword: true,
          permissions: accessType === "full" ? ["*"] : permissions,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[CreateAdmin] Error:", err);
    return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/admins
 * Updates an Admin account (status, accessType, permissions, name, phone).
 * Strictly protected: Super Admin only.
 * Prevents privilege escalation and tampering with Super Admin.
 */
export async function PUT(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, name, email, phone, status, accessType, permissions } = body;

    const adminId = Number(id);
    if (!adminId || isNaN(adminId)) {
      return NextResponse.json({ error: "Valid Admin ID is required" }, { status: 400 });
    }

    const [target] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Privilege escalation protection: Super Admin cannot be deactivated or altered into regular admin
    if (target.role === "super_admin") {
      if (status && status !== "active") {
        return NextResponse.json(
          { error: "Super Admin account cannot be deactivated." },
          { status: 403 }
        );
      }
    }

    const updateFields: Record<string, any> = {};
    if (name && typeof name === "string") updateFields.name = name.trim();
    if (phone && typeof phone === "string") updateFields.phone = phone.trim();
    if (email && typeof email === "string" && email.includes("@")) {
      const cleanEmail = email.trim().toLowerCase();
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, cleanEmail), ne(users.id, adminId)))
        .limit(1);
      if (existingUser) {
        return NextResponse.json(
          { error: `Email ${cleanEmail} is already in use by another account.` },
          { status: 409 }
        );
      }
      updateFields.email = cleanEmail;
    }

    if (status && ["active", "inactive"].includes(status)) {
      // Cannot deactivate Super Admin
      if (target.role === "super_admin" && status === "inactive") {
        return NextResponse.json(
          { error: "Super Admin cannot be deactivated." },
          { status: 403 }
        );
      }
      updateFields.status = status;
    }

    if (accessType && ["full", "custom"].includes(accessType) && target.role !== "super_admin") {
      updateFields.accessType = accessType;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.update(users).set(updateFields).where(eq(users.id, adminId));
    }

    // Update permissions if custom
    if (target.role === "admin" && accessType === "custom" && Array.isArray(permissions)) {
      await db.delete(adminPermissions).where(eq(adminPermissions.userId, adminId));
      const allDbPerms = await db.select().from(permissionsTable);
      const slugLookup = new Map<string, string>();
      for (const dp of allDbPerms) {
        slugLookup.set(String(dp.id), dp.slug);
        slugLookup.set(dp.slug, dp.slug);
      }

      for (const p of permissions) {
        const key = String(p).trim();
        const resolvedSlug = slugLookup.get(key) || (typeof p === "string" ? key : "");
        if (resolvedSlug && resolvedSlug !== "*" && resolvedSlug !== "admins:manage" && resolvedSlug !== "logs:view") {
          await db.insert(adminPermissions).values({
            userId: adminId,
            permissionSlug: resolvedSlug,
          });
        }
      }
    } else if (target.role === "admin" && accessType === "full") {
      await db.delete(adminPermissions).where(eq(adminPermissions.userId, adminId));
    }

    // Record audit log
    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: status === "inactive" ? "DEACTIVATE_ADMIN" : "UPDATE_ADMIN",
      module: "admin_management",
      details: `Updated admin ${target.email}: ${JSON.stringify(updateFields)}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Admin account ${target.email} updated successfully.`,
    });
  } catch (err) {
    console.error("[UpdateAdmin] Error:", err);
    return NextResponse.json({ error: "Failed to update admin account" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/admins?id=...
 * Deletes an Admin account.
 * Strictly protected: Super Admin only.
 * Immune: Super Admin CANNOT be deleted.
 */
export async function DELETE(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid Admin ID is required" }, { status: 400 });
    }

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Crucial rule: Super Admin CANNOT be deleted
    if (target.role === "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Super Admin account cannot be deleted." },
        { status: 403 }
      );
    }

    if (target.id === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    // Clean up child dependencies safely
    try { await db.delete(addresses).where(eq(addresses.userId, id)); } catch {}
    try { await db.delete(cartItems).where(eq(cartItems.userId, id)); } catch {}
    try { await db.delete(wishlistItems).where(eq(wishlistItems.userId, id)); } catch {}
    try { await db.delete(reviews).where(eq(reviews.userId, id)); } catch {}
    try { await db.update(orders).set({ userId: null }).where(eq(orders.userId, id)); } catch {}

    // Delete custom permissions and user
    try { await db.delete(adminPermissions).where(eq(adminPermissions.userId, id)); } catch {}
    await db.delete(users).where(eq(users.id, id));

    // Audit log
    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "DELETE_ADMIN",
      module: "admin_management",
      details: `Deleted admin account ${target.name} (${target.email})`,
      req,
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: `Admin account for ${target.email} permanently removed.`,
    });
  } catch (err) {
    console.error("[DeleteAdmin] Error:", err);
    return NextResponse.json({ error: "Failed to delete admin account" }, { status: 500 });
  }
}
