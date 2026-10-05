import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe } from "@/lib/validation";
import { logOrderStatusHistory } from "@/lib/invoice";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const RETURN_WINDOW_DAYS = 7;
const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

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
    if (guestCartId && orderSession && guestCartId === orderSession) {
      isAllowed = true;
    }
  }

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

  // 2. Check 7-day return window
  const deliveryTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.createdAt).getTime();
  const timeSinceDelivery = Date.now() - deliveryTime;

  if (timeSinceDelivery > RETURN_WINDOW_MS) {
    const daysElapsed = Math.floor(timeSinceDelivery / (24 * 60 * 60 * 1000));
    return Response.json(
      {
        error: `Return window expired. Returns and exchanges are only accepted within ${RETURN_WINDOW_DAYS} days of delivery (${daysElapsed} days elapsed).`,
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
    comments?: string;
    items?: number[];
  }>(request)) || {};

  if (!body.reason || !body.reason.trim()) {
    return Response.json(
      { error: "Please select or provide a reason for return/exchange." },
      { status: 400 }
    );
  }

  const reqType = body.type === "exchange" ? "Exchange" : "Return";
  const sanitizedReason = `${reqType}: ${body.reason.trim()}${body.comments ? ` - ${body.comments.trim()}` : ""}`.slice(0, 300);

  const [updatedOrder] = await db
    .update(orders)
    .set({
      returnStatus: "requested",
      returnReason: sanitizedReason,
    })
    .where(eq(orders.id, order.id))
    .returning();

  // Log status history
  await logOrderStatusHistory(
    order.id,
    "return_requested",
    `Customer initiated ${reqType.toLowerCase()} request: ${sanitizedReason}`,
    "Customer Support Desk",
    user?.role === "admin" ? "admin" : "customer"
  );

  return Response.json({
    success: true,
    order: updatedOrder,
    message: `${reqType} request submitted successfully. Our team will review and arrange reverse pickup within 24-48 hours.`,
  });
}
