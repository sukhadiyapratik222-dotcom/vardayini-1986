import { and, eq, ilike, or, sql } from "drizzle-orm";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { orderItems, orders, productVariants, products } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { canCancelOrder, canTransitionOrder } from "@/lib/order-transitions";
import { readJsonSafe } from "@/lib/validation";
import { logOrderStatusHistory } from "@/lib/invoice";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isValidGuestToken(incomingToken: string | null | undefined, storedHash: string | null | undefined): boolean {
  if (!incomingToken || !storedHash) return false;
  try {
    const computedHash = createHash("sha256").update(incomingToken.trim()).digest("hex");
    const bufA = Buffer.from(computedHash, "utf8");
    const bufB = Buffer.from(storedHash, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  await ensureSeeded();
  const { orderNumber } = await context.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  // Authorization / IDOR Protection
  const user = await getAuthUser();
  const url = new URL(request.url);
  const guestToken = url.searchParams.get("token") || url.searchParams.get("guestToken") || request.headers.get("x-guest-token");
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;

  let isAllowed = false;
  if (user?.role === "admin") {
    isAllowed = true;
  } else if (order.userId) {
    if (user?.id === order.userId) {
      isAllowed = true;
    }
  } else {
    let orderSession = order.sessionId;
    if (!orderSession && order.addressSnapshot) {
      try {
        const snap = JSON.parse(order.addressSnapshot);
        orderSession = snap.sessionId;
      } catch {}
    }
    if (order.guestTokenHash) {
      if (isValidGuestToken(guestToken, order.guestTokenHash)) {
        isAllowed = true;
      }
    } else if (guestCartId && orderSession && guestCartId === orderSession) {
      isAllowed = true;
    }
  }

  if (!isAllowed) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  // State machine check: can only cancel before shipping
  if (!canCancelOrder(order.status)) {
    return Response.json(
      {
        error: `Orders in '${order.status}' status cannot be cancelled. Cancellation is only allowed before order is shipped.`,
      },
      { status: 400 }
    );
  }

  const body = (await readJsonSafe<{ reason?: string }>(request)) || {};
  const reasonText = (body.reason || "Cancelled by customer before dispatch").slice(0, 300);

  const updatedOrder = await db.transaction(async (tx) => {
    const isPaid = order.paymentStatus === "paid" || order.paymentStatus === "completed";
    const [updated] = await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reasonText,
        refundStatus: isPaid ? "pending" : "none",
        refundAmount: isPaid ? order.total : 0,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();

    if (!updated) return null;

    // Restock items atomically in the same transaction
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      if (item.variantId) {
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      } else if (item.productName && item.variantWeight) {
        const [matched] = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(
            and(
              or(
                eq(products.name, item.productName),
                ilike(products.name, `%${item.productName}%`),
                ilike(products.slug, `%${item.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}%`)
              ),
              eq(productVariants.weight, item.variantWeight)
            )
          )
          .limit(1);
        if (matched) {
          await tx
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
            .where(eq(productVariants.id, matched.id));
        }
      }
    }

    // Log status history
    await logOrderStatusHistory(
      order.id,
      "cancelled",
      `Order cancelled: ${reasonText}`,
      "Vadodara Fulfilment Center",
      user?.role === "admin" ? "admin" : "customer",
      tx as any
    );

    return updated;
  });

  if (!updatedOrder) {
    return Response.json({ error: "Order status conflict: order was updated concurrently" }, { status: 409 });
  }

  const { guestTokenHash: _discardHash, ...safeUpdatedOrder } = updatedOrder;

  return Response.json({
    success: true,
    order: safeUpdatedOrder,
    message: "Order cancelled successfully. Inventory has been restocked.",
  });
}
