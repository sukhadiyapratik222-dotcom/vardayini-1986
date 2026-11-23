import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, returnRequests, adminNotifications } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe } from "@/lib/validation";
import { logOrderStatusHistory } from "@/lib/invoice";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export const RETURN_WINDOW_HOURS = 24;
export const RETURN_WINDOW_MS = RETURN_WINDOW_HOURS * 60 * 60 * 1000;

export const ELIGIBLE_REASONS: Record<string, string> = {
  wrong_item: "Wrong Item Delivered",
  damaged_packaging: "Damaged Packaging / Broken Seal",
  spoiled_product: "Spoiled Product / Quality Defect",
  missing_items: "Missing Item(s) in Parcel",
};

export const INELIGIBLE_REASONS: Record<string, string> = {
  change_of_mind: "Change of Mind / No Longer Needed",
  opened_eaten: "Opened / Partially Eaten Items",
  wrong_address: "Incorrect Delivery Address Provided",
};

async function verifyOrderAccess(order: any, user: any): Promise<boolean> {
  if (user?.role === "admin" || user?.role === "super_admin") return true;
  if (order.userId && user?.id === order.userId) return true;

  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;
  let orderSession = order.sessionId;
  if (!orderSession && order.addressSnapshot) {
    try {
      const snap = JSON.parse(order.addressSnapshot);
      orderSession = snap.sessionId;
    } catch {}
  }
  if (guestCartId && orderSession && guestCartId === orderSession) return true;
  return false;
}

export async function GET(
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

  const user = await getAuthUser();
  const isAllowed = await verifyOrderAccess(order, user);
  if (!isAllowed) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const isDelivered = order.status === "delivered";
  const deliveryTime = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : order.status === "delivered"
    ? new Date(order.createdAt).getTime()
    : null;

  const timeSinceDelivery = deliveryTime ? Date.now() - deliveryTime : null;
  const isWithin24Hours = timeSinceDelivery !== null && timeSinceDelivery <= RETURN_WINDOW_MS;
  const hoursElapsed = timeSinceDelivery !== null ? Math.floor(timeSinceDelivery / (3600 * 1000)) : 0;
  const hoursRemaining = timeSinceDelivery !== null ? Math.max(0, RETURN_WINDOW_HOURS - hoursElapsed) : 0;

  const hasActiveReturn = Boolean(
    order.returnStatus &&
    order.returnStatus !== "none" &&
    order.returnStatus !== "rejected"
  );

  const isEligible = isDelivered && isWithin24Hours && !hasActiveReturn;

  // Retrieve existing return requests if any
  const existingRequests = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.orderId, order.id))
    .orderBy(desc(returnRequests.requestedAt))
    .limit(1);

  return Response.json({
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    deliveredAt: order.deliveredAt,
    isDelivered,
    isWithin24Hours,
    hoursRemaining,
    hoursElapsed,
    returnWindowHours: RETURN_WINDOW_HOURS,
    isEligible,
    returnStatus: order.returnStatus || "none",
    refundStatus: order.refundStatus || "none",
    refundAmount: order.refundAmount || 0,
    returnReason: order.returnReason || null,
    returnRequest: existingRequests[0] || null,
    eligibleReasons: Object.entries(ELIGIBLE_REASONS).map(([id, label]) => ({ id, label })),
    policyNotice: "Sweets are perishable food items. Exchange/refund is accepted only for wrong items, damaged packaging, spoiled product, or missing items reported within 24 hours of delivery with photographic proof.",
  });
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
  const isAllowed = await verifyOrderAccess(order, user);
  if (!isAllowed) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  // 1. Only delivered orders can be returned or exchanged
  if (order.status !== "delivered") {
    return Response.json(
      {
        error: `Only delivered orders are eligible for return or exchange. Current status: '${order.status}'.`,
      },
      { status: 400 }
    );
  }

  // 2. Strict 24-hour perishable sweets return window
  const deliveryTime = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : new Date(order.createdAt).getTime();
  const timeSinceDelivery = Date.now() - deliveryTime;

  if (timeSinceDelivery > RETURN_WINDOW_MS) {
    const hoursElapsed = Math.floor(timeSinceDelivery / (3600 * 1000));
    return Response.json(
      {
        error: `Return window expired. Due to strict food safety guidelines, perishable sweets can only be claimed for exchange or refund within 24 hours of delivery (${hoursElapsed} hours elapsed).`,
      },
      { status: 400 }
    );
  }

  // 3. Prevent duplicate return requests
  if (order.returnStatus && order.returnStatus !== "none" && order.returnStatus !== "rejected") {
    return Response.json(
      {
        error: `A return request is already in '${order.returnStatus}' status for this order.`,
      },
      { status: 400 }
    );
  }

  const body = (await readJsonSafe<{
    reason?: string;
    type?: "return" | "exchange";
    description?: string;
    comments?: string;
    photo?: string;
    photoUrl?: string;
  }>(request)) || {};

  const reasonKey = body.reason?.trim().toLowerCase() || "";
  const description = (body.description || body.comments || "").trim();
  const photo = (body.photoUrl || body.photo || "").trim();

  // Validate reason
  if (!reasonKey) {
    return Response.json(
      { error: "Please select a valid reason for return or exchange." },
      { status: 400 }
    );
  }

  if (INELIGIBLE_REASONS[reasonKey]) {
    return Response.json(
      {
        error: `Selected reason '${INELIGIBLE_REASONS[reasonKey]}' is not eligible for return. As sweets are perishable food products, returns and refunds are accepted only for wrong item, damaged packaging, spoiled product, or missing items.`,
      },
      { status: 400 }
    );
  }

  const reasonLabel = ELIGIBLE_REASONS[reasonKey] || body.reason?.trim() || "Wrong/Damaged Item";

  // Validate description (minimum 10 characters)
  if (!description || description.length < 10) {
    return Response.json(
      { error: "Please provide a detailed description (at least 10 characters) explaining the issue with your sweets/parcel." },
      { status: 400 }
    );
  }

  // Validate photo proof (mandatory for perishable items)
  if (!photo) {
    return Response.json(
      { error: "A clear photo proof of the damaged or wrong product/package is mandatory for perishable food claims." },
      { status: 400 }
    );
  }

  // Check photo size if data URI (Max 5MB)
  if (photo.startsWith("data:image/")) {
    const base64Data = photo.split(",")[1] || "";
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeInBytes > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Uploaded photo exceeds the maximum size limit of 5MB. Please upload a smaller image." },
        { status: 400 }
      );
    }
  }

  // Extract customer contact details
  let customerName = order.guestName || "Valued Customer";
  let customerPhone = order.guestPhone || "";
  let customerEmail = "";
  if (order.addressSnapshot) {
    try {
      const snap = JSON.parse(order.addressSnapshot);
      if (snap.recipientName) customerName = snap.recipientName;
      if (snap.name) customerName = snap.name;
      if (snap.phone) customerPhone = snap.phone;
      if (snap.email) customerEmail = snap.email;
    } catch {}
  }

  const reqType = body.type === "exchange" ? "Exchange" : "Return";
  const sanitizedReason = `${reqType}: ${reasonLabel} - ${description}`.slice(0, 300);

  // Insert return request record
  const [newRequest] = await db
    .insert(returnRequests)
    .values({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      reason: reasonKey,
      reasonLabel,
      description,
      photoUrl: photo,
      status: "requested",
      refundAmount: 0,
      adminNotes: null,
    })
    .$returningId();

  // Update order return status
  await db
    .update(orders)
    .set({
      returnStatus: "requested",
      returnReason: sanitizedReason,
    })
    .where(eq(orders.id, order.id));

  const [updatedOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  // Log status history
  await logOrderStatusHistory(
    order.id,
    "return_requested",
    `Customer filed ${reqType.toLowerCase()} request: ${reasonLabel}. Photo proof submitted.`,
    "Customer Support Desk",
    user?.role === "super_admin" ? "super_admin" : user?.role === "admin" ? "admin" : "customer"
  );

  // Alert admin notifications
  try {
    await db.insert(adminNotifications).values({
      type: "return_request",
      title: `Return Request: Order #${order.orderNumber}`,
      message: `${customerName} (${customerPhone}) requested an ${reqType.toLowerCase()} for Order #${order.orderNumber} (${reasonLabel}). Needs review within 24 hours.`,
      data: JSON.stringify({
        requestId: newRequest?.id,
        orderNumber: order.orderNumber,
        reason: reasonKey,
        reasonLabel,
      }),
      isRead: false,
    });
  } catch {}

  return Response.json({
    success: true,
    requestId: newRequest?.id,
    order: updatedOrder,
    message: `${reqType} request submitted successfully. Our quality team will review your photos and contact you within 12-24 hours. Approved refunds are processed in 5-7 working days.`,
  });
}
