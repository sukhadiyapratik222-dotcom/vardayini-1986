import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, rolePermissions, permissions as permissionsTable, users } from "@/db/schema";
import { requireAdmin, logActivity } from "@/lib/auth";
import { SYSTEM_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/roles
 * Lists all system and custom roles with their permissions and user count.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req, "admins:view");
  if (auth.error) return auth.error;

  try {
    const roleRows = await db.select().from(roles);
    const allRolePerms = await db
      .select({
        roleId: rolePermissions.roleId,
        permissionSlug: permissionsTable.slug,
      })
      .from(rolePermissions)
      .innerJoin(permissionsTable, eq(rolePermissions.permissionId, permissionsTable.id));

    const permMap = new Map<number, string[]>();
    for (const rp of allRolePerms) {
      const list = permMap.get(rp.roleId) || [];
      list.push(rp.permissionSlug);
      permMap.set(rp.roleId, list);
    }

    // Count users per role
    const allUsers = await db.select({ role: users.role, id: users.id }).from(users);
    const userCountMap = new Map<string, number>();
    for (const u of allUsers) {
      if (u.role) {
        userCountMap.set(u.role, (userCountMap.get(u.role) || 0) + 1);
      }
    }

    const enrichedRoles = roleRows.map((r) => {
      const assignedPerms = r.slug === "super_admin" ? ["*"] : permMap.get(r.id) || [];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        isActive: Boolean(r.isActive ?? true),
        isSystem: Boolean(r.isSystem || SYSTEM_ROLES.some((sr) => sr.slug === r.slug)),
        permissions: assignedPerms,
        userCount: userCountMap.get(r.slug) || 0,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      roles: enrichedRoles,
    });
  } catch (err: any) {
    console.error("[GetRoles] Error:", err);
    return NextResponse.json({ error: "Failed to retrieve roles" }, { status: 500 });
  }
}

/**
 * POST /api/admin/roles
 * Super Admin creates a new custom role with custom permissions.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req, "admins:create");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, slug, description, permissions = [] } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!cleanSlug) {
      return NextResponse.json({ error: "Invalid role slug" }, { status: 400 });
    }

    // Check slug uniqueness
    const [existing] = await db.select().from(roles).where(eq(roles.slug, cleanSlug)).limit(1);
    if (existing) {
      return NextResponse.json({ error: `A role with slug '${cleanSlug}' already exists.` }, { status: 409 });
    }

    // Insert new role
    const [inserted] = await db.insert(roles).values({
      name: name.trim(),
      slug: cleanSlug,
      description: description?.trim() || null,
      isActive: true,
      isSystem: false,
    });

    const newRoleId = inserted.insertId;

    // Link permissions
    if (Array.isArray(permissions) && permissions.length > 0) {
      const dbPerms = await db.select().from(permissionsTable);
      const permMap = new Map(dbPerms.map((p) => [p.slug, p.id]));

      for (const pSlug of permissions) {
        const pid = permMap.get(pSlug);
        if (pid) {
          try {
            await db.insert(rolePermissions).values({
              roleId: newRoleId,
              permissionId: pid,
            });
          } catch {}
        }
      }
    }

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "CREATE_ROLE",
      module: "admins",
      recordId: newRoleId,
      updatedValue: { name, slug: cleanSlug, permissionsCount: permissions.length },
      details: `Created new custom role: ${name} (${cleanSlug}) with ${permissions.length} permissions`,
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Role "${name}" created successfully.`,
        role: {
          id: newRoleId,
          name: name.trim(),
          slug: cleanSlug,
          description: description?.trim() || null,
          isActive: true,
          isSystem: false,
          permissions,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[CreateRole] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create role" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/roles
 * Updates role name, description, active status, or permissions.
 */
export async function PUT(req: Request) {
  const auth = await requireAdmin(req, "admins:edit");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, name, description, isActive, permissions } = body;

    const roleId = Number(id);
    if (!roleId || isNaN(roleId)) {
      return NextResponse.json({ error: "Valid Role ID is required" }, { status: 400 });
    }

    const [targetRole] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!targetRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Super Admin role protection
    if (targetRole.slug === "super_admin") {
      if (isActive === false) {
        return NextResponse.json({ error: "The Super Admin role cannot be deactivated." }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {};
    if (name && typeof name === "string") updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    if (Object.keys(updateData).length > 0) {
      await db.update(roles).set(updateData).where(eq(roles.id, roleId));
    }

    // Update permissions if provided (and not super_admin which has full wildcard)
    if (Array.isArray(permissions) && targetRole.slug !== "super_admin") {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      const dbPerms = await db.select().from(permissionsTable);
      const permMap = new Map(dbPerms.map((p) => [p.slug, p.id]));

      for (const pSlug of permissions) {
        const pid = permMap.get(pSlug);
        if (pid) {
          try {
            await db.insert(rolePermissions).values({
              roleId,
              permissionId: pid,
            });
          } catch {}
        }
      }
    }

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "UPDATE_ROLE",
      module: "admins",
      recordId: roleId,
      previousValue: { name: targetRole.name, isActive: targetRole.isActive },
      updatedValue: updateData,
      details: `Updated role ${targetRole.name} (${targetRole.slug})`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Role "${targetRole.name}" updated successfully.`,
    });
  } catch (err: any) {
    console.error("[UpdateRole] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update role" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roles?id=...
 * Deletes an unused custom role. Protects system roles and in-use roles.
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req, "admins:delete");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid Role ID is required" }, { status: 400 });
    }

    const [targetRole] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!targetRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // System roles protection
    if (targetRole.isSystem || SYSTEM_ROLES.some((sr) => sr.slug === targetRole.slug)) {
      return NextResponse.json({ error: `System role "${targetRole.name}" cannot be deleted.` }, { status: 403 });
    }

    // Check if role is assigned to any active user
    const assignedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, targetRole.slug));

    if (assignedUsers.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete role "${targetRole.name}" because it is currently assigned to ${assignedUsers.length} user(s). Reassign them first.` },
        { status: 400 }
      );
    }

    // Delete permissions link and role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await db.delete(roles).where(eq(roles.id, id));

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "DELETE_ROLE",
      module: "admins",
      recordId: id,
      previousValue: { name: targetRole.name, slug: targetRole.slug },
      details: `Deleted custom role: ${targetRole.name} (${targetRole.slug})`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Role "${targetRole.name}" deleted successfully.`,
    });
  } catch (err: any) {
    console.error("[DeleteRole] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete role" }, { status: 500 });
  }
}
