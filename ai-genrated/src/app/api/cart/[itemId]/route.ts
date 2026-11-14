import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, productVariants } from "@/db/schema";
import { getCartIdentity, loadCartLines } from "@/lib/cart";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, parsePositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function ownedItem(itemId: number) {
  // Multi-container synchronization: Ensure fresh lambda hydrates latest items from MongoDB Atlas
  await loadCartLines();
  const { user, sessionId } = await getCartIdentity();

  // 1. Try matching by local SQLite cart_items.id
  let [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.id, itemId),
        user
          ? or(eq(cartItems.userId, user.id), eq(cartItems.sessionId, sessionId))
          : eq(cartItems.sessionId, sessionId),
      ),
    )
    .limit(1);

  // 2. Fallback: match by variantId if client passed variantId
  if (!item) {
    const [byVariant] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.variantId, itemId),
          user
            ? or(eq(cartItems.userId, user.id), eq(cartItems.sessionId, sessionId))
            : eq(cartItems.sessionId, sessionId),
        ),
      )
      .limit(1);
    item = byVariant;
  }

  // 3. Fallback: Direct MongoDB Atlas lookup if container SQLite is cold
  if (!item) {
    try {
      const { getMongoCartItems } = await import("@/lib/mongodb");
      const mItems = await getMongoCartItems({ userId: user?.id, sessionId });
      const found = mItems ? mItems.find((m) => m.variantId === itemId) : undefined;
      if (found) {
        const { getSqliteDb } = await import("@/db");
        const sqlite = getSqliteDb();
        const res = sqlite
          .prepare(
            "INSERT INTO cart_items (user_id, session_id, variant_id, quantity) VALUES (?, ?, ?, ?)"
          )
          .run(
            user?.id ?? null,
            user ? null : sessionId,
            found.variantId,
            found.quantity
          );
        item = {
          id: Number(res.lastInsertRowid),
          userId: user?.id ?? null,
          sessionId: user ? null : sessionId,
          variantId: found.variantId,
          quantity: found.quantity,
          createdAt: new Date(),
        } as any;
      }
    } catch {}
  }

  return item;
}

export async function PUT(request: Request, context: { params: Promise<{ itemId: string }> }) {
  await ensureSeeded();
  const { itemId: rawId } = await context.params;
  const itemId = parsePositiveInt(rawId);
  if (!itemId) {
    return Response.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const body = await readJsonSafe<{ quantity?: unknown }>(request);
  if (!body || body.quantity === undefined) {
    return Response.json({ error: "Invalid JSON or missing quantity" }, { status: 400 });
  }

  const q = body.quantity;
  if (typeof q !== "number" || !Number.isInteger(q) || !Number.isSafeInteger(q) || isNaN(q) || q < 0) {
    return Response.json({ error: "Quantity must be a non-negative integer" }, { status: 400 });
  }

  const item = await ownedItem(itemId);
  if (!item) {
    // If reducing quantity to 0 on an already-deleted item, return 200 idempotent success
    if (q === 0) {
      try {
        const { removeMongoCartItem } = await import("@/lib/mongodb");
        const { user, sessionId } = await getCartIdentity();
        await removeMongoCartItem({ userId: user?.id, sessionId, variantId: itemId });
      } catch {}
      const cart = await loadCartLines();
      return Response.json({
        items: cart.lines,
        totals: cart.totals,
        count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
      });
    }
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  if (q === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
    try {
      const { removeMongoCartItem } = await import("@/lib/mongodb");
      const { user, sessionId } = await getCartIdentity();
      await removeMongoCartItem({ userId: user?.id, sessionId, variantId: item.variantId });
    } catch {}
  } else {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, item.variantId))
      .limit(1);

    if (!variant || q > variant.stock) {
      return Response.json({ error: "Not enough stock" }, { status: 400 });
    }
    await db.update(cartItems).set({ quantity: q }).where(eq(cartItems.id, item.id));
    try {
      const { updateMongoCartItemQuantity } = await import("@/lib/mongodb");
      const { user, sessionId } = await getCartIdentity();
      await updateMongoCartItemQuantity({ userId: user?.id, sessionId, variantId: item.variantId, quantity: q });
    } catch {}
  }

  const cart = await loadCartLines();
  return Response.json({
    items: cart.lines,
    totals: cart.totals,
    count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
  });
}

export const PATCH = PUT;

export async function DELETE(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  await ensureSeeded();
  const { itemId: rawId } = await context.params;
  const itemId = parsePositiveInt(rawId);
  if (!itemId) {
    return Response.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const item = await ownedItem(itemId);
  if (!item) {
    // Idempotent DELETE: If item is not found in local cart, ensure it is cleaned from MongoDB as well
    try {
      const { removeMongoCartItem } = await import("@/lib/mongodb");
      const { user, sessionId } = await getCartIdentity();
      await removeMongoCartItem({ userId: user?.id, sessionId, variantId: itemId });
    } catch {}

    const cart = await loadCartLines();
    return Response.json({
      items: cart.lines,
      totals: cart.totals,
      count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    });
  }

  await db.delete(cartItems).where(eq(cartItems.id, item.id));
  try {
    const { removeMongoCartItem } = await import("@/lib/mongodb");
    const { user, sessionId } = await getCartIdentity();
    await removeMongoCartItem({ userId: user?.id, sessionId, variantId: item.variantId });
  } catch {}
  const cart = await loadCartLines();
  return Response.json({
    items: cart.lines,
    totals: cart.totals,
    count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
  });
}
