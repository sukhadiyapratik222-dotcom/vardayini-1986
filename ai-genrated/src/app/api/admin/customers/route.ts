import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  addresses,
  cartItems,
  orders,
  reviews,
  users,
  wishlistItems,
} from "@/db/schema";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { parsePositiveInt, readJsonSafe } from "@/lib/validation";
import { dbPool } from "@/lib/mysql";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers
 * Returns all registered customers with their delivery addresses, order counts, and lifetime spend.
 */
export async function GET(request: Request) {
  const authorized = await isAuthorizedAdmin(request);
  if (!authorized) {
    return Response.json({ error: "Unauthorized access" }, { status: 403 });
  }

  try {
    // 1. Fetch all users
    const allUsers = await db.select().from(users);

    // 2. Fetch all addresses and orders to aggregate customer stats
    const allAddresses = await db.select().from(addresses);
    const allOrders = await db.select().from(orders);

    const customerList = allUsers.map((u) => {
      const userAddresses = allAddresses.filter((a) => a.userId === u.id);
      const userOrders = allOrders.filter(
        (o) => o.userId === u.id || (u.phone && o.guestPhone === u.phone)
      );
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
        name: u.name,
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

    // 2. Security rule: Admin accounts cannot be deleted through customer management
    if (existingUser.role === "admin") {
      return Response.json(
        {
          error:
            "Security Policy: Administrator accounts cannot be deleted from the customer desk.",
        },
        { status: 400 }
      );
    }

    // 3. Transactional cascade in Drizzle ORM
    await db.transaction(async (tx) => {
      // Clean up child tables referencing users.id
      await tx.delete(addresses).where(eq(addresses.userId, id!));
      await tx.delete(cartItems).where(eq(cartItems.userId, id!));
      await tx.delete(wishlistItems).where(eq(wishlistItems.userId, id!));
      await tx.delete(reviews).where(eq(reviews.userId, id!));

      // Disassociate historical orders so sales and accounting records remain intact
      await tx
        .update(orders)
        .set({ userId: null })
        .where(eq(orders.userId, id!));

      // Delete the user record
      await tx.delete(users).where(eq(users.id, id!));
    });

    // 4. Also synchronize deletion to MySQL (vardayini_sweets) if online
    try {
      await dbPool.query("DELETE FROM addresses WHERE user_id = ?", [id]);
      await dbPool.query("DELETE FROM cart_items WHERE user_id = ?", [id]);
      await dbPool.query("DELETE FROM wishlist_items WHERE user_id = ?", [id]);
      await dbPool.query("DELETE FROM reviews WHERE user_id = ?", [id]);
      await dbPool.query("UPDATE orders SET user_id = NULL WHERE user_id = ?", [id]);
      await dbPool.query("DELETE FROM users WHERE id = ?", [id]);
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
