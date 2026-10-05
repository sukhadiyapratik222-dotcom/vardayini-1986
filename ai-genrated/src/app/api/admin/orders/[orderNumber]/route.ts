import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, productVariants } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { canTransitionOrder } from "@/lib/order-transitions";
import { readJsonSafe } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe<{
    status?: string;
    expectedStatus?: string;
    guestName?: string;
    guestPhone?: string;
    deliverySlot?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    cancelReason?: string;
    total?: number;
  }>(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { orderNumber } = await context.params;

  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const expectedStatus = body.expectedStatus || existingOrder.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};

  if (body.guestName !== undefined) patch.guestName = body.guestName;
  if (body.guestPhone !== undefined) patch.guestPhone = body.guestPhone;
  if (body.deliverySlot !== undefined) patch.deliverySlot = body.deliverySlot;
  if (body.paymentMethod !== undefined) patch.paymentMethod = body.paymentMethod;
  if (body.paymentStatus !== undefined) patch.paymentStatus = body.paymentStatus;
  if (body.total !== undefined) patch.total = body.total;

  const targetStatus = body.status;

  if (targetStatus && targetStatus !== existingOrder.status) {
    // Validate state machine transition graph
    if (!canTransitionOrder(existingOrder.status, targetStatus)) {
      return NextResponse.json(
        { error: `Cannot transition order from '${existingOrder.status}' to '${targetStatus}'` },
        { status: 400 }
      );
    }

    patch.status = targetStatus;

    if (targetStatus === "delivered") {
      patch.deliveredAt = new Date();
    }

    // COD is marked as paid ONLY at delivered
    const effectivePaymentMethod = patch.paymentMethod || existingOrder.paymentMethod;
    if (effectivePaymentMethod === "cod") {
      if (targetStatus === "delivered") {
        patch.paymentStatus = "paid";
      } else if (patch.paymentStatus === "paid") {
        delete patch.paymentStatus;
      }
    }

    // If transitioning to cancelled: execute atomic conditional cancellation, stock restoration, and refund marking
    if (targetStatus === "cancelled" && existingOrder.status !== "cancelled") {
      const isPaid = existingOrder.paymentStatus === "paid" || existingOrder.paymentStatus === "completed";

      const updated = await db.transaction(async (tx) => {
        const [order] = await tx
          .update(orders)
          .set({
            ...patch,
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: body.cancelReason || "Cancelled by administrator",
            refundStatus: isPaid ? "pending" : "none",
            refundAmount: isPaid ? existingOrder.total : 0,
          })
          .where(and(eq(orders.id, existingOrder.id), eq(orders.status, expectedStatus)))
          .returning();

        if (!order) return null;

        // Restore stock once in the same cancellation transaction
        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, existingOrder.id));

        for (const item of items) {
          if (item.variantId) {
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
              .where(eq(productVariants.id, item.variantId));
          }
        }

        return order;
      });

      if (!updated) {
        return NextResponse.json(
          { error: "Order status conflict: order was updated concurrently" },
          { status: 409 }
        );
      }

      const { guestTokenHash: _discardHash1, ...safeUpdated1 } = updated;
      return NextResponse.json({ order: safeUpdated1 });
    }
  } else {
    // If not transitioning status, still enforce COD paid only at delivered
    const effectivePaymentMethod = patch.paymentMethod || existingOrder.paymentMethod;
    const effectiveStatus = existingOrder.status;
    if (effectivePaymentMethod === "cod") {
      if (effectiveStatus === "delivered") {
        patch.paymentStatus = "paid";
      } else if (patch.paymentStatus === "paid") {
        delete patch.paymentStatus;
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Conditional update on expected status; return 409 on conflict
  const [updated] = await db
    .update(orders)
    .set(patch)
    .where(and(eq(orders.id, existingOrder.id), eq(orders.status, expectedStatus)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Order status conflict: order was updated concurrently" },
      { status: 409 }
    );
  }

  const { guestTokenHash: _discardHash2, ...safeUpdated2 } = updated;
  return NextResponse.json({ order: safeUpdated2 });
}

export async function DELETE(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { orderNumber } = await context.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Delete order items first (foreign key dependency), then the order
  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.delete(orders).where(eq(orders.id, order.id));

  return NextResponse.json({ success: true, deleted: orderNumber });
}
