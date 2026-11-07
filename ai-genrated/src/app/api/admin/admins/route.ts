import bcrypt from "bcryptjs";
import { and, eq, inArray, or, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, getSqliteDb } from "@/db";
import { users, stores, roles, rolePermissions, adminPermissions, permissions as permissionsTable, addresses, cartItems, wishlistItems, reviews, orders } from "@/db/schema";
import { requireSuperAdmin, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/admins
 * Lists all Administrators and the Super Admin.
 * Strictly protected: Super Admin only.
 * Multi-container persistence: Hydrates all admin accounts from MongoDB Atlas.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    // Multi-container synchronization: Hydrate admins from MongoDB Atlas into local SQLite cache
    try {
      const { getAdminsFromMongo } = await import("@/lib/mongodb");
      const mAdmins = await getAdminsFromMongo();
      if (mAdmins && mAdmins.length > 0) {
        const sqlite = getSqliteDb();
        const insertUserStmt = sqlite.prepare(`
          INSERT INTO users (id, name, email, phone, password_hash, role, status, must_change_password, access_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            phone = excluded.phone,
            password_hash = CASE WHEN excluded.password_hash != '' THEN excluded.password_hash ELSE users.password_hash END,
            role = excluded.role,
            status = excluded.status,
            must_change_password = excluded.must_change_password,
            access_type = excluded.access_type
        `);
        const delPermStmt = sqlite.prepare(`DELETE FROM admin_permissions WHERE user_id = ?`);
        const insPermStmt = sqlite.prepare(`INSERT OR IGNORE INTO admin_permissions (user_id, permission_slug) VALUES (?, ?)`);

        for (const ma of mAdmins) {
          const maId = ma.id ? Number(ma.id) : (ma._id ? parseInt(String(ma._id).slice(-6), 16) : 9999);
          try {
            insertUserStmt.run(
              maId,
              ma.name || "Admin",
              (ma.email || "").toLowerCase().trim(),
              ma.phone || "9000000000",
              ma.passwordHash || ma.password_hash || "",
              ma.role || "admin",
              ma.status || "active",
              ma.mustChangePassword ? 1 : 0,
              ma.accessType || ma.access_type || "full",
              ma.createdAt ? new Date(ma.createdAt).toISOString() : new Date().toISOString()
            );

            if (Array.isArray(ma.permissions) && ma.permissions.length > 0) {
              delPermStmt.run(maId);
              for (const p of ma.permissions) {
                if (p && p !== "*") {
                  insPermStmt.run(maId, p);
                }
              }
            }
          } catch (e) {
            console.warn("[GetAdmins] Admin SQLite hydration notice:", e);
          }
        }
      }
    } catch (mErr) {
      console.warn("[GetAdmins] MongoDB admin fetch notice:", mErr);
    }

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
        storeId: users.storeId,
        twoFactorEnabled: users.twoFactorEnabled,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, "customer"));

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
    const availableStores = await db.select({ id: stores.id, name: stores.name, city: stores.city }).from(stores);
    const availableRoles = await db.select().from(roles);

    // Map role permissions for all roles
    const allRolePermRows = await db
      .select({ roleId: rolePermissions.roleId, slug: permissionsTable.slug })
      .from(rolePermissions)
      .innerJoin(permissionsTable, eq(rolePermissions.permissionId, permissionsTable.id));

    const rolePermMap = new Map<number, string[]>();
    for (const rp of allRolePermRows) {
      const list = rolePermMap.get(rp.roleId) || [];
      list.push(rp.slug);
      rolePermMap.set(rp.roleId, list);
    }
    const roleBySlug = new Map(availableRoles.map((r) => [r.slug, r]));

    const admins = adminRows.map((a) => {
      let perms: string[] = [];
      if (a.role === "super_admin") {
        perms = ["*"];
      } else {
        const rObj = roleBySlug.get(a.role);
        if (rObj) {
          perms.push(...(rolePermMap.get(rObj.id) || []));
        }
        perms.push(...(permsMap.get(a.id) || []));
        if (a.role === "admin" && a.accessType === "full") {
          perms = ["*"];
        }
      }

      return {
        ...a,
        mustChangePassword: Boolean(a.mustChangePassword),
        twoFactorEnabled: Boolean(a.twoFactorEnabled),
        permissions: Array.from(new Set(perms)),
      };
    });

    return NextResponse.json({
      admins,
      availablePermissions,
      availableStores,
      availableRoles,
    });
  } catch (err) {
    console.error("[GetAdmins] Error:", err);
    return NextResponse.json({ error: "Failed to fetch admin accounts" }, { status: 500 });
  }
}

/**
 * POST /api/admin/admins
 * Creates a new Admin account with temporary password & permissions.
 * Strictly protected: Super Admin only.
 * Multi-container persistence: Synced directly to MongoDB Atlas.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, email, phone, password, role = "admin", storeId = null, accessType = "full", permissions = [] } = body;

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

    // Check if email already exists in SQLite or MongoDB Atlas
    const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    let mongoExisting = null;
    try {
      const { getUserFromMongo } = await import("@/lib/mongodb");
      mongoExisting = await getUserFromMongo(cleanEmail);
    } catch {}

    if (existing || mongoExisting) {
      return NextResponse.json(
        { error: `An account with email ${cleanEmail} already exists.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const sqlite = getSqliteDb();

    const insertResult = sqlite.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, status, must_change_password, access_type, store_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      name.trim(),
      cleanEmail,
      (phone || "9000000000").trim(),
      passwordHash,
      role.trim() || "admin",
      "active",
      1,
      accessType === "custom" ? "custom" : "full",
      storeId ? Number(storeId) : null
    );

    const newAdminId = Number(insertResult.lastInsertRowid);

    // If custom permissions, insert them safely
    const resolvedPerms: string[] = [];
    if (accessType === "custom" && Array.isArray(permissions) && permissions.length > 0) {
      const allDbPerms = await db.select().from(permissionsTable);
      const slugLookup = new Map<string, string>();
      for (const dp of allDbPerms) {
        slugLookup.set(String(dp.id), dp.slug);
        slugLookup.set(dp.slug, dp.slug);
      }

      const permStmt = sqlite.prepare(`INSERT OR IGNORE INTO admin_permissions (user_id, permission_slug) VALUES (?, ?)`);
      for (const p of permissions) {
        const key = String(p).trim();
        const resolvedSlug = slugLookup.get(key) || (typeof p === "string" ? key : "");
        if (resolvedSlug && resolvedSlug !== "*" && resolvedSlug !== "admins:manage" && resolvedSlug !== "logs:view") {
          permStmt.run(newAdminId, resolvedSlug);
          resolvedPerms.push(resolvedSlug);
        }
      }
    }

    // Multi-container persistence: Directly sync created admin account to MongoDB Atlas
    try {
      const { syncUserToMongo } = await import("@/lib/mongodb");
      await syncUserToMongo({
        id: newAdminId,
        name: name.trim(),
        email: cleanEmail,
        phone: (phone || "9000000000").trim(),
        passwordHash,
        role: "admin",
        status: "active",
        accessType: accessType === "custom" ? "custom" : "full",
        permissions: accessType === "full" ? ["*"] : resolvedPerms,
        mustChangePassword: true,
      });
    } catch (mSyncErr) {
      console.warn("[CreateAdmin] MongoDB admin sync notice:", mSyncErr);
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
          permissions: accessType === "full" ? ["*"] : resolvedPerms,
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
 * Multi-container persistence: Synced directly to MongoDB Atlas.
 */
export async function PUT(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, name, email, phone, status, accessType, permissions, mustChangePassword } = body;

    const adminId = Number(id);
    if (!adminId || isNaN(adminId)) {
      return NextResponse.json({ error: "Valid Admin ID is required" }, { status: 400 });
    }

    let [target] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);

    // Multi-container fallback: Check MongoDB Atlas if user was created on another container
    if (!target) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mUser = await mongo.collection("users").findOne({
            $or: [{ id: adminId }, { id: Number(adminId) }, { _id: String(adminId) as any }],
          });
          if (mUser) {
            const sqlite = getSqliteDb();
            sqlite.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, status, must_change_password, access_type, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mUser.id || adminId,
              mUser.name || "Admin",
              (mUser.email || "").toLowerCase().trim(),
              mUser.phone || "9000000000",
              mUser.passwordHash || mUser.password_hash || "",
              mUser.role || "admin",
              mUser.status || "active",
              mUser.mustChangePassword ? 1 : 0,
              mUser.accessType || mUser.access_type || "full",
              mUser.createdAt ? new Date(mUser.createdAt).toISOString() : new Date().toISOString()
            );
            [target] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
          }
        }
      } catch (mErr) {
        console.warn("[UpdateAdmin] MongoDB lookup notice:", mErr);
      }
    }

    if (!target) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Super Admin Immunity Protection
    if (target.role === "super_admin") {
      const isSuspending = status && status === "inactive";
      if (isSuspending) {
        return NextResponse.json(
          { error: "Super Admin cannot be deactivated." },
          { status: 403 }
        );
      }
      const isDemoting = body.role && body.role !== "super_admin";
      if (isDemoting) {
        return NextResponse.json(
          { error: "Super Admin role cannot be demoted." },
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

    if (body.role && typeof body.role === "string" && target.role !== "super_admin") {
      updateFields.role = body.role.trim();
    }

    if (body.storeId !== undefined) {
      updateFields.storeId = body.storeId ? Number(body.storeId) : null;
    }

    if (body.password && typeof body.password === "string" && body.password.length >= 6) {
      updateFields.passwordHash = await bcrypt.hash(body.password, 10);
      updateFields.mustChangePassword = 1;
    }

    if (typeof mustChangePassword === "boolean") {
      updateFields.mustChangePassword = mustChangePassword ? 1 : 0;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.update(users).set(updateFields).where(eq(users.id, adminId));
    }

    // Update permissions if custom
    const resolvedPerms: string[] = [];
    if (target.role === "admin" && (accessType === "custom" || target.accessType === "custom") && Array.isArray(permissions)) {
      await db.delete(adminPermissions).where(eq(adminPermissions.userId, adminId));
      const allDbPerms = await db.select().from(permissionsTable);
      const slugLookup = new Map<string, string>();
      for (const dp of allDbPerms) {
        slugLookup.set(String(dp.id), dp.slug);
        slugLookup.set(dp.slug, dp.slug);
      }

      const sqlite = getSqliteDb();
      const permStmt = sqlite.prepare(`INSERT OR IGNORE INTO admin_permissions (user_id, permission_slug) VALUES (?, ?)`);
      for (const p of permissions) {
        const key = String(p).trim();
        const resolvedSlug = slugLookup.get(key) || (typeof p === "string" ? key : "");
        if (resolvedSlug && resolvedSlug !== "*" && resolvedSlug !== "admins:manage" && resolvedSlug !== "logs:view") {
          permStmt.run(adminId, resolvedSlug);
          resolvedPerms.push(resolvedSlug);
        }
      }
    } else if (target.role === "admin" && accessType === "full") {
      await db.delete(adminPermissions).where(eq(adminPermissions.userId, adminId));
    }

    // Multi-container persistence: Sync update to MongoDB Atlas
    try {
      const { updateAdminInMongo } = await import("@/lib/mongodb");
      await updateAdminInMongo(
        { id: adminId, email: target.email },
        {
          name: updateFields.name,
          email: updateFields.email,
          phone: updateFields.phone,
          status: updateFields.status,
          accessType: updateFields.accessType,
          permissions: (accessType === "full" || target.role === "super_admin") ? ["*"] : resolvedPerms,
          mustChangePassword: typeof mustChangePassword === "boolean" ? mustChangePassword : undefined,
        }
      );
    } catch (mUpErr) {
      console.warn("[UpdateAdmin] MongoDB update notice:", mUpErr);
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

    const [refreshed] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);

    return NextResponse.json({
      success: true,
      message: `Admin account ${target.email} updated successfully.`,
      admin: {
        id: refreshed.id,
        name: refreshed.name,
        email: refreshed.email,
        phone: refreshed.phone,
        role: refreshed.role,
        status: refreshed.status,
        accessType: refreshed.accessType,
        mustChangePassword: Boolean(refreshed.mustChangePassword),
        permissions: (refreshed.role === "super_admin" || refreshed.accessType === "full") ? ["*"] : resolvedPerms,
      },
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
 * Multi-container persistence: Removed from both SQLite and MongoDB Atlas.
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

    let [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      // Check MongoDB Atlas
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mUser = await mongo.collection("users").findOne({
            $or: [{ id }, { id: Number(id) }, { _id: String(id) as any }],
          });
          if (mUser) {
            target = {
              id: mUser.id || id,
              name: mUser.name,
              email: mUser.email,
              role: mUser.role,
            } as any;
          }
        }
      } catch {}
    }

    if (!target) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Crucial rule: Super Admin CANNOT be deleted
    if (target.role === "super_admin") {
      return NextResponse.json(
        { error: "Super Admin account is immune and cannot be deleted." },
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

    // Delete custom permissions and user from SQLite
    try { await db.delete(adminPermissions).where(eq(adminPermissions.userId, id)); } catch {}
    await db.delete(users).where(eq(users.id, id));

    // Multi-container persistence: Delete user from MongoDB Atlas
    try {
      const { deleteUserFromMongo } = await import("@/lib/mongodb");
      await deleteUserFromMongo(id);
      if (target.email) {
        await deleteUserFromMongo(target.email);
      }
    } catch (mDelErr) {
      console.warn("[DeleteAdmin] MongoDB delete notice:", mDelErr);
    }

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
