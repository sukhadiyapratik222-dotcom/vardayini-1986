import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { getOrCreateInvoice } from "@/lib/invoice";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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
  if (user?.role === "admin" || user?.role === "super_admin") {
    isAllowed = true;
  } else if (order.userId) {
    if (user?.id === order.userId) {
      isAllowed = true;
    }
  } else {
    // Guest order: session check
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
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const { invoice } = await getOrCreateInvoice(order.id);

    const safeSeller = invoice.sellerSnapshot ? JSON.parse(invoice.sellerSnapshot) : null;
    const safeBuyer = invoice.buyerSnapshot ? JSON.parse(invoice.buyerSnapshot) : null;
    const safeItems = invoice.itemsSnapshot ? JSON.parse(invoice.itemsSnapshot) : [];

    return Response.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        orderId: invoice.orderId,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        placeOfSupply: invoice.placeOfSupply,
        isInterState: invoice.isInterState,
        seller: safeSeller,
        buyer: safeBuyer,
        items: safeItems,
        taxableValue: Number(invoice.taxableValue),
        cgst: Number(invoice.cgst),
        sgst: Number(invoice.sgst),
        igst: Number(invoice.igst),
        discount: Number(invoice.discount),
        deliveryFee: Number(invoice.deliveryFee),
        roundOff: Number(invoice.roundOff),
        grandTotal: Number(invoice.grandTotal),
        totalInWords: invoice.totalInWords,
        status: invoice.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliverySlot: order.deliverySlot,
      },
    });
  } catch (err: any) {
    console.error("Error generating invoice for order:", err);
    return Response.json(
      { error: "Failed to generate or retrieve invoice" },
      { status: 500 }
    );
  }
}
