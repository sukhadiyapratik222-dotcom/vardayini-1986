import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, productVariants } from "@/db/schema";
import { getCartIdentity, loadCartLines } from "@/lib/cart";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, parsePositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function ownedItem(itemId: number) {
  const { user, sessionId } = await getCartIdentity();
  const [item] = await db
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
  return item;
}

export async function PUT(request: Request, context: { params: Promise<{ itemId: string }> }) {
  await ensureSeeded();
  const { itemId: rawId } = await context.params;
  const itemId = parsePositiveInt(rawId);
  if (!itemId) {
    return Response.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const item = await ownedItem(itemId);
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  const body = await readJsonSafe<{ quantity?: unknown }>(request);
  if (!body || body.quantity === undefined) {
    return Response.json({ error: "Invalid JSON or missing quantity" }, { status: 400 });
  }

  const q = body.quantity;
  if (typeof q !== "number" || !Number.isInteger(q) || !Number.isSafeInteger(q) || isNaN(q) || q < 0) {
    return Response.json({ error: "Quantity must be a non-negative integer" }, { status: 400 });
  }

  if (q === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
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
  }

  const cart = await loadCartLines();
  return Response.json({ items: cart.lines, totals: cart.totals });
}

export async function DELETE(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  await ensureSeeded();
  const { itemId: rawId } = await context.params;
  const itemId = parsePositiveInt(rawId);
  if (!itemId) {
    return Response.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const item = await ownedItem(itemId);
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  await db.delete(cartItems).where(eq(cartItems.id, item.id));
  const cart = await loadCartLines();
  return Response.json({ items: cart.lines, totals: cart.totals });
}
