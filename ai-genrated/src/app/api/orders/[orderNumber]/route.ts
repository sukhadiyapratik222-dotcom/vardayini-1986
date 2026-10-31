import { and, eq, like, or, sql } from "drizzle-orm";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { orderItems, orders, productVariants, products } from "@/db/schema";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { canCustomerCancel, canTransitionOrder } from "@/lib/order-transitions";
import { readJsonSafe } from "@/lib/validation";
import { recordAdminNotification } from "@/lib/notifications";
import { syncOrderToMysql } from "@/lib/mysql";
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

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  await ensureSeeded();
  const { orderNumber } = await context.params;
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  const user = await getAuthUser();
  const url = new URL(_request.url);
  const guestToken = url.searchParams.get("token") || url.searchParams.get("guestToken") || _request.headers.get("x-guest-token");
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;

  let isAllowed = false;
  if (user?.role === "admin" || user?.role === "super_admin") {
    isAllowed = true;
  } else if (order.userId) {
    if (user?.id === order.userId) {
      isAllowed = true;
    }
  } else {
    // Guest order: timing-safe token validation or legacy matching guest session
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
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  // Fetch status history
  let history: any[] = [];
  try {
    const { orderStatusHistory } = await import("@/db/schema");
    const { asc } = await import("drizzle-orm");
    history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(asc(orderStatusHistory.createdAt));
  } catch {}

  // Fetch payment snapshot
  let paymentRecord: any = null;
  try {
    const { payments } = await import("@/db/schema");
    const [p] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
    paymentRecord = p || null;
  } catch {}

  // Fetch invoice metadata
  let invoiceSummary: any = null;
  try {
    const { invoices } = await import("@/db/schema");
    const [inv] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        grandTotal: invoices.grandTotal,
        pdfUrl: invoices.pdfUrl,
      })
      .from(invoices)
      .where(eq(invoices.orderId, order.id))
      .limit(1);
    invoiceSummary = inv || null;
  } catch {}

  // Calculate return and cancel eligibility
  const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const isDelivered = order.status === "delivered";
  const deliveryTime = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : new Date(order.createdAt).getTime();
  const timeSinceDelivery = Date.now() - deliveryTime;
  const daysSinceDelivery = Math.floor(timeSinceDelivery / (24 * 60 * 60 * 1000));
  const isReturnEligible =
    isDelivered &&
    timeSinceDelivery <= RETURN_WINDOW_MS &&
    (!order.returnStatus || order.returnStatus === "none");
  const returnDaysLeft = isDelivered ? Math.max(0, 7 - daysSinceDelivery) : 0;
  const isCancelEligible = canCustomerCancel(order.status);
  const { guestTokenHash: _discardHash, ...safeOrder } = order;

  return Response.json({
    order: safeOrder,
    items,
    statusHistory: history,
    payment: paymentRecord || {
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      transactionId: `TXN-${order.orderNumber.replace(/[^A-Z0-9]/g, "")}`,
      amount: order.total,
      currency: "INR",
    },
    invoice: invoiceSummary,
    eligibility: {
      canCancel: isCancelEligible,
      canReturn: isReturnEligible,
      returnDaysLeft,
      isDelivered,
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  await ensureSeeded();
  const { orderNumber } = await context.params;
  const body = await readJsonSafe<{ action?: string; reason?: string }>(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (body.action !== "cancel") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  const user = await getAuthUser();
  const url = new URL(request.url);
  const guestToken = url.searchParams.get("token") || url.searchParams.get("guestToken") || request.headers.get("x-guest-token");
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;

  let isAllowed = false;
  if (user?.role === "admin" || user?.role === "super_admin") {
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

  if (order.status === "cancelled") {
    const { guestTokenHash: _discardHash, ...safeOrder } = order;
    return Response.json({
      success: true,
      order: safeOrder,
      message: "This order is already cancelled.",
      isAlreadyCancelled: true,
    });
  }

  // Check state machine: Customer can only cancel before shipped
  if (user?.role !== "admin" && user?.role !== "super_admin") {
    if (!canCustomerCancel(order.status)) {
      return Response.json(
        { error: `Orders in '${order.status}' status cannot be cancelled because your items have already been dispatched.` },
        { status: 400 }
      );
    }
  } else {
    if (!canTransitionOrder(order.status, "cancelled")) {
      return Response.json(
        { error: `Cannot transition order from '${order.status}' to 'cancelled'` },
        { status: 400 }
      );
    }
  }

  // Atomic cancellation & restock inside db.transaction
  const isPaid = order.paymentStatus === "paid" || order.paymentStatus === "completed";
  const updatedOrder = await db.transaction(async (tx) => {
    // Conditional update: only update if current status matches expected status
    const [updateRes] = await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        refundStatus: isPaid ? "pending" : "none",
        refundAmount: isPaid ? order.total : 0,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)));

    if (!updateRes || updateRes.affectedRows === 0) {
      return null;
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      if (item.variantId) {
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      } else if (item.productName && item.variantWeight) {
        // Fallback for legacy items or test items inserted without variantId
        const [matched] = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(
            and(
              or(
                eq(products.name, item.productName),
                like(products.name, `%${item.productName}%`),
                like(products.slug, `%${item.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}%`)
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

    const [freshOrder] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .limit(1);

    return freshOrder;
  });

  if (!updatedOrder) {
    return Response.json({ error: "Order status conflict: order was updated concurrently" }, { status: 409 });
  }

  const reasonText = (body?.reason || "Cancelled by customer").slice(0, 300);

  // Sync to MySQL
  try {
    await syncOrderToMysql({
      orderNumber: updatedOrder.orderNumber,
      userId: updatedOrder.userId,
      guestName: updatedOrder.guestName,
      guestPhone: updatedOrder.guestPhone,
      status: "cancelled",
      total: updatedOrder.total,
      paymentStatus: updatedOrder.paymentStatus,
    });
  } catch (err) {
    console.warn("Failed to sync cancelled order to MySQL:", err);
  }

  // Send admin notification
  try {
    const custName = updatedOrder.guestName || user?.name || "Customer";
    await recordAdminNotification({
      type: "order_cancelled",
      title: `Order Cancelled: ${updatedOrder.orderNumber}`,
      message: `${custName} has cancelled order ${updatedOrder.orderNumber}. Reason: "${reasonText}". Total: ₹${updatedOrder.total}`,
      data: {
        orderNumber: updatedOrder.orderNumber,
        orderId: updatedOrder.id,
        customerName: custName,
        customerPhone: updatedOrder.guestPhone || user?.phone || "",
        total: updatedOrder.total,
        reason: reasonText,
        cancelledAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Failed to record admin notification for cancellation:", err);
  }

  const { guestTokenHash: _discardHash, ...safeCancelled } = updatedOrder;
  return Response.json({
    success: true,
    order: safeCancelled,
    message: "Order cancelled successfully. Store management has been notified.",
  });
}

// ─── Admin: Edit order fields ────────────────────────────────────────────────
export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  await ensureSeeded();
  const { orderNumber } = await context.params;

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe<{
    status?: string;
    guestName?: string;
    guestPhone?: string;
    deliverySlot?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    total?: number;
  }>(request);

  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  // Build update object — only include fields actually sent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFields: Record<string, any> = {};
  if (body.status !== undefined) updateFields.status = body.status;
  // Customer name, phone, and total order price are immutable via admin order edit
  if (body.deliverySlot !== undefined) updateFields.deliverySlot = body.deliverySlot;
  if (body.paymentMethod !== undefined) updateFields.paymentMethod = body.paymentMethod;
  if (body.paymentStatus !== undefined) updateFields.paymentStatus = body.paymentStatus;

  if (body.status && body.status !== order.status) {
    if (!canTransitionOrder(order.status, body.status)) {
      return Response.json(
        { error: `Cannot transition order from '${order.status}' to '${body.status}'` },
        { status: 400 }
      );
    }
    if (body.status === "delivered") {
      updateFields.deliveredAt = new Date();
    }
  }

  // COD is marked as paid ONLY at delivered
  const effectiveMethod = updateFields.paymentMethod || order.paymentMethod;
  const effectiveStatus = updateFields.status || order.status;
  if (effectiveMethod === "cod") {
    if (effectiveStatus === "delivered") {
      updateFields.paymentStatus = "paid";
    } else if (updateFields.paymentStatus === "paid") {
      delete updateFields.paymentStatus;
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updateRes] = await db
    .update(orders)
    .set(updateFields)
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)));

  if (!updateRes || updateRes.affectedRows === 0) {
    return Response.json({ error: "Order status conflict: order was updated concurrently" }, { status: 409 });
  }

  const [updated] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);

  const { guestTokenHash: _discardHash, ...safeUpdated } = updated;
  return Response.json({ order: safeUpdated });
}

// ─── Admin: Delete order ─────────────────────────────────────────────────────
export async function DELETE(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  await ensureSeeded();
  const { orderNumber } = await context.params;

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  // Delete order items first (FK), then the order itself
  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.delete(orders).where(eq(orders.id, order.id));

  return Response.json({ success: true, deleted: orderNumber });
}
