import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, coupons, productVariants, products } from "@/db/schema";
import { getAuthUser, getCartSessionId, getCouponCode, setCouponCode } from "@/lib/auth";
import { calcTotals, unitPrice } from "@/lib/money";
import { ensureSeeded } from "@/db/seed";

export type CartLine = {
  id: number;
  variantId: number;
  productId: number;
  name: string;
  slug: string;
  imageUrl: string;
  weight: string;
  quantity: number;
  price: number;
  discountedPrice: number | null;
  unit: number;
  lineTotal: number;
  stock: number;
};

export async function getCartIdentity() {
  const user = await getAuthUser();
  const sessionId = await getCartSessionId();
  return { user, sessionId };
}

export async function loadCartLines() {
  await ensureSeeded();
  const { user, sessionId } = await getCartIdentity();

  // Multi-container persistence: Hydrate cart items from MongoDB Atlas into local cache
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    try {
      const { getMongoCartItems } = await import("@/lib/mongodb");
      const mongoItems = await getMongoCartItems({ userId: user?.id, sessionId });
      const { getSqliteDb } = await import("@/db");
      const sqlite = getSqliteDb();

      if (mongoItems && mongoItems.length > 0) {
        // Upsert into local SQLite preserving existing auto-increment IDs
        for (const mItem of mongoItems) {
          const existingRow = sqlite
            .prepare(
              user
                ? "SELECT id FROM cart_items WHERE (user_id = ? OR session_id = ?) AND variant_id = ? LIMIT 1"
                : "SELECT id FROM cart_items WHERE session_id = ? AND variant_id = ? LIMIT 1"
            )
            .get(...(user ? [user.id, sessionId, mItem.variantId] : [sessionId, mItem.variantId])) as any;

          if (existingRow) {
            sqlite.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(mItem.quantity, existingRow.id);
          } else {
            sqlite
              .prepare("INSERT INTO cart_items (user_id, session_id, variant_id, quantity) VALUES (?, ?, ?, ?)")
              .run(
                user?.id ?? mItem.userId ?? null,
                user ? null : sessionId,
                mItem.variantId,
                mItem.quantity
              );
          }
        }

        // Clean up any local rows that are no longer in MongoDB
        const mongoVariantIds = mongoItems.map((m) => m.variantId);
        const placeholders = mongoVariantIds.map(() => "?").join(",");
        sqlite
          .prepare(
            user
              ? `DELETE FROM cart_items WHERE (user_id = ? OR session_id = ?) AND variant_id NOT IN (${placeholders})`
              : `DELETE FROM cart_items WHERE session_id = ? AND variant_id NOT IN (${placeholders})`
          )
          .run(...(user ? [user.id, sessionId, ...mongoVariantIds] : [sessionId, ...mongoVariantIds]));
      } else if (mongoItems && mongoItems.length === 0) {
        if (user) {
          sqlite.prepare("DELETE FROM cart_items WHERE user_id = ? OR session_id = ?").run(user.id, sessionId);
        } else {
          sqlite.prepare("DELETE FROM cart_items WHERE session_id = ?").run(sessionId);
        }
      }
    } catch (mErr) {
      console.warn("[loadCartLines] MongoDB cart hydration notice:", mErr);
    }
  }

  const rows = await db
    .select({
      id: cartItems.id,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      weight: productVariants.weight,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      stock: productVariants.stock,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      user
        ? or(eq(cartItems.userId, user.id), eq(cartItems.sessionId, sessionId))
        : eq(cartItems.sessionId, sessionId),
    );

  const lines: CartLine[] = rows.map((row) => {
    const unit = unitPrice(row.price, row.discountedPrice);
    return {
      ...row,
      unit,
      lineTotal: unit * row.quantity,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  let couponCode = await getCouponCode();
  let discount = 0;
  let freeDelivery = false;
  let couponLabel: string | null = null;

  if (couponCode) {
    let [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, couponCode.toUpperCase()))
      .limit(1);

    if (!coupon && couponCode.toUpperCase() === "WELCOME10") {
      try {
        await db.insert(coupons).values({
          code: "WELCOME10",
          description: "Flat 10% off on your first order",
          type: "percent",
          value: 10,
          minOrder: 0,
        });
        const [freshCoupon] = await db
          .select()
          .from(coupons)
          .where(eq(coupons.code, "WELCOME10"))
          .limit(1);
        coupon = freshCoupon;
      } catch {}
    }

    if (coupon && coupon.active && subtotal >= coupon.minOrder) {
      couponLabel = coupon.description;
      if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
      if (coupon.type === "flat") discount = coupon.value;
      if (coupon.type === "free_delivery") freeDelivery = true;
    } else {
      // Subtotal dropped below minOrder or coupon became invalid -> drop coupon!
      await setCouponCode(null);
      couponCode = null;
    }
  }

  const totals = calcTotals(subtotal, discount, freeDelivery);
  return { lines, totals, couponCode, couponLabel, user };
}

export async function mergeGuestCart(userId: number) {
  const sessionId = await getCartSessionId();

  // Multi-container persistence: Merge guest cart into user in MongoDB Atlas
  try {
    const { mergeMongoGuestCart } = await import("@/lib/mongodb");
    await mergeMongoGuestCart(userId, sessionId);
  } catch (mErr) {
    console.warn("[mergeGuestCart] MongoDB merge notice:", mErr);
  }

  const guestRows = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));

  for (const row of guestRows) {
    const [variant] = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, row.variantId))
      .limit(1);

    const availableStock = variant ? variant.stock : row.quantity;

    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.variantId, row.variantId)))
      .limit(1);

    if (existing) {
      // Clamp merged quantity to available stock
      const targetQty = Math.min(existing.quantity + row.quantity, availableStock);
      await db
        .update(cartItems)
        .set({ quantity: targetQty })
        .where(eq(cartItems.id, existing.id));
      await db.delete(cartItems).where(eq(cartItems.id, row.id));
    } else {
      const targetQty = Math.min(row.quantity, availableStock);
      await db
        .update(cartItems)
        .set({ userId, sessionId: null, quantity: targetQty })
        .where(eq(cartItems.id, row.id));
    }
  }
}

export async function addToCart(variantId: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || !Number.isSafeInteger(quantity)) {
    throw new Error("Quantity must be a positive integer");
  }

  const { user, sessionId } = await getCartIdentity();
  let [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) {
    // 1. Check if variantId is a legacy festival ID (e.g. 901..910) by SKU FEST-{id}
    const [bySku] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.sku, `FEST-${variantId}`))
      .limit(1);
    if (bySku) {
      variant = bySku;
    }
  }

  if (!variant) {
    // 2. Ensure festival products are seeded into DB and retry
    try {
      const { ensureFestivalProducts } = await import("@/db/festivals");
      await ensureFestivalProducts();

      const [retryVar] = await db
        .select()
        .from(productVariants)
        .where(
          or(
            eq(productVariants.id, variantId),
            eq(productVariants.sku, `FEST-${variantId}`)
          )
        )
        .limit(1);
      if (retryVar) {
        variant = retryVar;
      }
    } catch {}
  }

  if (!variant) {
    // 3. Fallback: check if variantId matches a productId, use its primary variant
    const [byProd] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, variantId))
      .limit(1);
    if (byProd) {
      variant = byProd;
    }
  }

  if (!variant) throw new Error("Variant not found");
  if (variant.stock < quantity) throw new Error("Not enough stock");

  const actualVariantId = variant.id;
  const match = user
    ? and(eq(cartItems.userId, user.id), eq(cartItems.variantId, actualVariantId))
    : and(eq(cartItems.sessionId, sessionId), eq(cartItems.variantId, actualVariantId));

  const [existing] = await db.select().from(cartItems).where(match).limit(1);
  let finalItemId: number;

  if (existing) {
    const nextQty = existing.quantity + quantity;
    if (nextQty > variant.stock) throw new Error("Not enough stock");
    await db.update(cartItems).set({ quantity: nextQty }).where(eq(cartItems.id, existing.id));
    finalItemId = existing.id;
  } else {
    const [created] = await db
      .insert(cartItems)
      .values({
        userId: user?.id ?? null,
        sessionId: user ? null : sessionId,
        variantId: actualVariantId,
        quantity,
      });
    finalItemId = created.insertId;
  }

  // Multi-container persistence: Save into MongoDB Atlas so cart survives across all serverless containers
  try {
    const { upsertMongoCartItem } = await import("@/lib/mongodb");
    await upsertMongoCartItem({
      userId: user?.id ?? null,
      sessionId,
      variantId: actualVariantId,
      quantity,
    });
  } catch (mErr) {
    console.warn("[addToCart] MongoDB cart sync notice:", mErr);
  }

  return finalItemId;
}

export async function clearCartForIdentity() {
  const { user, sessionId } = await getCartIdentity();
  if (user) {
    await db.delete(cartItems).where(or(eq(cartItems.userId, user.id), eq(cartItems.sessionId, sessionId)));
  } else {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  // Multi-container persistence: Clear in MongoDB Atlas as well
  try {
    const { clearMongoCartItems } = await import("@/lib/mongodb");
    await clearMongoCartItems({ userId: user?.id, sessionId });
  } catch (mErr) {
    console.warn("[clearCartForIdentity] MongoDB clear notice:", mErr);
  }
}

export async function decrementStock(
  items: { variantId: number; quantity: number }[],
  txInstance?: any
) {
  // Aggregate quantities by variantId so duplicate cart lines are deducted cumulatively
  const aggregated = new Map<number, number>();
  for (const item of items) {
    aggregated.set(item.variantId, (aggregated.get(item.variantId) || 0) + item.quantity);
  }

  const runDecrement = async (tx: any) => {
    for (const [variantId, totalQty] of aggregated.entries()) {
      // Atomic conditional update: update stock only if stock >= totalQty
      const [updated] = await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${totalQty}` })
        .where(
          and(
            eq(productVariants.id, variantId),
            sql`${productVariants.stock} >= ${totalQty}`
          )
        );

      if (!updated || updated.affectedRows === 0) {
        throw new Error(`Insufficient stock for variant ID ${variantId}`);
      }
    }
  };

  if (txInstance) {
    await runDecrement(txInstance);
  } else {
    await db.transaction(async (tx) => {
      await runDecrement(tx);
    });
  }
}
