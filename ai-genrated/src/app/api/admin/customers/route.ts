import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  adminPermissions,
  addresses,
  cartItems,
  orders,
  reviews,
  users,
  wishlistItems,
} from "@/db/schema";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { parsePositiveInt, readJsonSafe } from "@/lib/validation";
import { deleteUserFromMysql } from "@/lib/mysql";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers
 * Returns all registered customers with their delivery addresses, order counts, and lifetime spend.
 */
export async function GET(request: Request) {
  const authorized = await isAuthorizedAdmin(request, "customers:view");
  if (!authorized) {
    return Response.json({ error: "Forbidden: Customer Directory access required" }, { status: 403 });
  }

  try {
    // 1. Fetch all users with MongoDB Atlas hydration fallback
    let allUsers = await db.select().from(users);
    if (!allUsers || allUsers.length === 0) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const mUsers = await mongo.collection("users").find({}).toArray();
          if (mUsers && mUsers.length > 0) {
            allUsers = mUsers.map((u: any) => ({
              id: u.id || 1,
              name: u.name || "Customer",
              email: u.email || "",
              phone: u.phone || "",
              role: u.role || "customer",
              status: u.status || "active",
              passwordHash: u.passwordHash || "",
              mustChangePassword: Boolean(u.mustChangePassword),
              accessType: u.accessType || "full",
              storeId: u.storeId || null,
              twoFactorEnabled: Boolean(u.twoFactorEnabled),
              twoFactorSecret: u.twoFactorSecret || null,
              twoFactorMethod: u.twoFactorMethod || "totp",
              lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
            })) as any;
          }
        }
      } catch (mErr) {
        console.warn("[AdminCustomers] MongoDB fallback notice:", mErr);
      }
    }

    // 2. Fetch all addresses and orders to aggregate customer stats
    const allAddresses = await db.select().from(addresses);
    const allOrders = await db.select().from(orders);

    const customerList = allUsers.map((u) => {
      let userAddresses = allAddresses.filter((a) => a.userId === u.id);
      const userOrders = allOrders.filter(
        (o) => o.userId === u.id || (u.phone && o.guestPhone === u.phone)
      );

      // If user has no saved addresses in addresses table, extract from their order history
      if (userAddresses.length === 0 && userOrders.length > 0) {
        const extracted: typeof allAddresses = [];
        const seenLines = new Set<string>();
        for (const ord of userOrders) {
          if (ord.addressSnapshot) {
            try {
              const snap = typeof ord.addressSnapshot === "string" ? JSON.parse(ord.addressSnapshot) : ord.addressSnapshot;
              if (snap && snap.line1 && !seenLines.has(snap.line1)) {
                seenLines.add(snap.line1);
                extracted.push({
                  id: 900000 + ord.id,
                  userId: u.id,
                  label: "Order Delivery",
                  line1: snap.line1,
                  city: snap.city || "Kalol",
                  state: snap.state || "Gujarat",
                  stateCode: "24",
                  pincode: snap.pincode || "390001",
                  phone: snap.phone || u.phone || "",
                  gstin: null,
                  latitude: null,
                  longitude: null,
                  addressType: "home",
                });
              }
            } catch {}
          }
        }
        if (extracted.length > 0) {
          userAddresses = extracted;
        }
      }

      // If user name is placeholder Patron XXXX, resolve from order history if available
      let resolvedName = u.name;
      if (!resolvedName || resolvedName.startsWith("Patron ")) {
        for (const ord of userOrders) {
          if (ord.guestName && !ord.guestName.startsWith("Patron ")) {
            resolvedName = ord.guestName;
            break;
          }
          if (ord.addressSnapshot) {
            try {
              const snap = typeof ord.addressSnapshot === "string" ? JSON.parse(ord.addressSnapshot) : ord.addressSnapshot;
              if (snap?.name && !snap.name.startsWith("Patron ")) {
                resolvedName = snap.name;
                break;
              }
            } catch {}
          }
        }
      }

      const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const lastOrder =
        userOrders.length > 0
          ? userOrders.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0].createdAt
          : null;

      return {
        id: u.id,
        name: resolvedName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        addresses: userAddresses,
        totalOrders: userOrders.length,
        totalSpent,
        lastOrder,
      };
    });

    return Response.json({ customers: customerList });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to fetch customer directory",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/customers?id=<id>
 * Safely deletes a customer account:
 * - Prevents deleting admin accounts
 * - Deletes associated addresses, cart items, wishlist items, and reviews
 * - Disassociates past orders (sets userId = NULL) to preserve financial and accounting history
 * - Deletes from users table
 * - Syncs deletion with MySQL database if available
 */
export async function DELETE(request: Request) {
  const authorized = await isAuthorizedAdmin(request);
  if (!authorized) {
    return Response.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const url = new URL(request.url);
  let id = parsePositiveInt(url.searchParams.get("id"));

  if (!id) {
    const body = await readJsonSafe<{ id?: number }>(request);
    id = parsePositiveInt(body?.id);
  }

  if (!id) {
    return Response.json(
      { error: "A valid numeric customer ID is required." },
      { status: 400 }
    );
  }

  try {
    // 1. Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return Response.json({ error: "Customer not found." }, { status: 404 });
    }

    // 2. Security rule: Admin and Super Admin accounts cannot be deleted through customer management
    if (existingUser.role === "admin" || existingUser.role === "super_admin") {
      return Response.json(
        {
          error:
            "Security Policy: Administrator and Super Admin accounts cannot be deleted from the customer desk.",
        },
        { status: 400 }
      );
    }

    // 3. Transactional cascade in Drizzle ORM
    await db.transaction(async (tx) => {
      // Clean up child tables referencing users.id
      try { await tx.delete(addresses).where(eq(addresses.userId, id!)); } catch {}
      try { await tx.delete(cartItems).where(eq(cartItems.userId, id!)); } catch {}
      try { await tx.delete(wishlistItems).where(eq(wishlistItems.userId, id!)); } catch {}
      try { await tx.delete(reviews).where(eq(reviews.userId, id!)); } catch {}
      try { await tx.delete(adminPermissions).where(eq(adminPermissions.userId, id!)); } catch {}

      // Disassociate historical orders so sales and accounting records remain intact
      try {
        await tx
          .update(orders)
          .set({ userId: null })
          .where(eq(orders.userId, id!));
      } catch {}

      // Delete the user record
      await tx.delete(users).where(eq(users.id, id!));
    });

    // 4. Also synchronize deletion to MySQL (vardayini_sweets) if online
    try {
      await deleteUserFromMysql(id!);
    } catch (mysqlErr) {
      console.warn("MySQL sync during customer deletion skipped/non-fatal:", mysqlErr);
    }

    return Response.json({
      success: true,
      message: `Customer "${existingUser.name}" (ID: #${id}) was permanently deleted. Historical order summaries preserved.`,
      deletedUser: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to delete customer.",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/customers
 * Allows Super Admin to manage admin privileges:
 * - Promote customer to admin
 * - Demote admin to customer
 * - Protect super_admin from modification or demotion
 */
export async function PATCH(request: Request) {
  const { requireAdmin } = await import("@/lib/auth");
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  // Only super_admin can change user roles
  if (auth.user.role !== "super_admin") {
    return Response.json(
      { error: "Forbidden: Only Super Admin can manage administrative access." },
      { status: 403 }
    );
  }

  const body = await readJsonSafe<{ id?: number; role?: string }>(request);
  const id = parsePositiveInt(body?.id);
  const newRole = body?.role;

  if (!id || (newRole !== "admin" && newRole !== "customer")) {
    return Response.json(
      { error: "Invalid parameters. Role must be 'admin' or 'customer'." },
      { status: 400 }
    );
  }

  try {
    // Check target user
    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!targetUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Cannot modify super_admin role
    if (targetUser.role === "super_admin" || targetUser.email === "pratik222@gmail.com") {
      return Response.json(
        { error: "Security Policy: Super Admin role is protected and cannot be modified." },
        { status: 400 }
      );
    }

    // Update role in DB
    await db.update(users).set({ role: newRole }).where(eq(users.id, id));

    // Sync to MySQL directly
    try {
      const { syncUserToMysql } = await import("@/lib/mysql");
      await syncUserToMysql({
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        passwordHash: targetUser.passwordHash,
        role: newRole,
      });
    } catch (err) {
      console.warn("MySQL sync role notice:", err);
    }

    return Response.json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) role successfully updated to "${newRole}".`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: newRole,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to update user access level.",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

