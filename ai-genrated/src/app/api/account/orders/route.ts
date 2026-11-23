import { NextResponse } from "next/server";
import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, returnRequests } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  await ensureSeeded();
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch user orders
  const userOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      guestName: orders.guestName,
      guestPhone: orders.guestPhone,
      status: orders.status,
      subtotal: orders.subtotal,
      discount: orders.discount,
      deliveryFee: orders.deliveryFee,
      tax: orders.tax,
      total: orders.total,
      couponCode: orders.couponCode,
      addressSnapshot: orders.addressSnapshot,
      deliverySlot: orders.deliverySlot,
      fulfillmentType: orders.fulfillmentType,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      expectedDeliveryDate: orders.expectedDeliveryDate,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
      cancelReason: orders.cancelReason,
      returnReason: orders.returnReason,
      returnStatus: orders.returnStatus,
      refundStatus: orders.refundStatus,
      refundAmount: orders.refundAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      auth.phone
        ? or(eq(orders.userId, auth.id), eq(orders.guestPhone, auth.phone))
        : eq(orders.userId, auth.id)
    )
    .orderBy(desc(orders.createdAt));

  if (userOrders.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  const orderIds = userOrders.map((o) => o.id);

  // 2. Fetch items for all user orders
  const allOrderItems = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      variantWeight: orderItems.variantWeight,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      imageUrl: orderItems.imageUrl,
      variantId: orderItems.variantId,
    })
    .from(orderItems)
    .where(sql`${orderItems.orderId} IN ${orderIds}`);

  const itemsByOrder = new Map<number, typeof allOrderItems>();
  for (const it of allOrderItems) {
    if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
    itemsByOrder.get(it.orderId)!.push(it);
  }

  // 3. Fetch return requests for these orders
  const returns = await db
    .select({
      id: returnRequests.id,
      orderId: returnRequests.orderId,
      orderNumber: returnRequests.orderNumber,
      reason: returnRequests.reason,
      reasonLabel: returnRequests.reasonLabel,
      description: returnRequests.description,
      status: returnRequests.status,
      photoUrl: returnRequests.photoUrl,
      adminNotes: returnRequests.adminNotes,
      createdAt: returnRequests.requestedAt,
    })
    .from(returnRequests)
    .where(sql`${returnRequests.orderId} IN ${orderIds}`);

  const returnsByOrder = new Map<number, (typeof returns)[0]>();
  for (const r of returns) {
    returnsByOrder.set(r.orderId, r);
  }

  const now = Date.now();

  const enrichedOrders = userOrders.map((ord) => {
    const items = itemsByOrder.get(ord.id) || [];
    const returnReq = returnsByOrder.get(ord.id) || null;

    // Determine 24h return window
    const deliveryTime = ord.deliveredAt ? new Date(ord.deliveredAt).getTime() : 0;
    const isDelivered = (ord.status || "").toLowerCase() === "delivered";
    const within24h = isDelivered && deliveryTime > 0 && now - deliveryTime <= RETURN_WINDOW_MS;
    const canReturn = within24h && !returnReq;

    // Timeline calculation
    const isCancelled = ["cancelled", "canceled"].includes((ord.status || "").toLowerCase());
    const isConfirmed = ["confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"].includes(
      (ord.status || "").toLowerCase()
    );
    const isPacked = ["packed", "ready", "shipped", "out_for_delivery", "delivered"].includes(
      (ord.status || "").toLowerCase()
    );
    const isOutForDelivery = ["shipped", "out_for_delivery", "delivered"].includes(
      (ord.status || "").toLowerCase()
    );

    const createdDate = new Date(ord.createdAt);
    const estDeliveryDate = ord.expectedDeliveryDate
      ? new Date(ord.expectedDeliveryDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Date(createdDate.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

    const timeline = [
      {
        step: "ordered",
        label: "Order Placed",
        date: createdDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        completed: true,
      },
      {
        step: "packed",
        label: "Packed Fresh",
        date: isPacked ? "Quality Sealed" : "In Kitchen Queue",
        completed: isPacked,
      },
      {
        step: "out_for_delivery",
        label: ord.fulfillmentType === "pickup" ? "Ready for Pickup" : "Out for Delivery",
        date: isOutForDelivery ? "Dispatched" : "Awaiting Dispatch",
        completed: isOutForDelivery,
      },
      {
        step: "delivered",
        label: ord.fulfillmentType === "pickup" ? "Picked Up" : "Delivered",
        date: isDelivered ? (ord.deliveredAt ? new Date(ord.deliveredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Delivered") : `Est. ${estDeliveryDate}`,
        completed: isDelivered,
      },
    ];

    return {
      ...ord,
      items,
      timeline,
      isCancelled,
      isDelivered,
      canReturn,
      activeReturn: returnReq,
      estDeliveryDate,
      invoiceUrl: `/orders/${ord.orderNumber}/invoice`,
      trackingUrl: `/orders/${ord.orderNumber}#tracking`,
      returnFormUrl: `/orders/${ord.orderNumber}#return`,
    };
  });

  return NextResponse.json({ orders: enrichedOrders });
}
