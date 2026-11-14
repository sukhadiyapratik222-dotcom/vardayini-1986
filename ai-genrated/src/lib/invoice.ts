import { eq, sql } from "drizzle-orm";
import { db, type AppDatabase } from "@/db";
import {
  invoices,
  invoiceSequences,
  orderItems,
  orders,
  orderStatusHistory,
} from "@/db/schema";
import {
  calculateGst,
  GstCalculationResult,
  resolveStateCode,
  roundToTwo,
  SELLER_DETAILS,
} from "@/lib/gst";

/**
 * Atomically generates a sequential, non-skipping, non-repeating GST invoice number
 * Format: INV-YYYY-00001 (e.g., INV-2026-00001)
 *
 * Implemented with an atomic counter increment + insert-if-missing so the same
 * code path works on MySQL and on the embedded SQLite fallback (which does not
 * understand MySQL's `ON DUPLICATE KEY UPDATE` syntax).
 */
export async function generateSequentialInvoiceNumber(
  customDb: AppDatabase = db,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const [updateResult] = await customDb
      .update(invoiceSequences)
      .set({ lastNumber: sql`${invoiceSequences.lastNumber} + 1` })
      .where(eq(invoiceSequences.year, year));

    if (Number((updateResult as any)?.affectedRows ?? 0) > 0) {
      return readFormattedInvoiceNumber(customDb, year);
    }

    // No counter row for this year yet: create it. A concurrent request may
    // have created it between the update and insert, so swallow that conflict
    // and loop to increment the row that now exists.
    try {
      await customDb.insert(invoiceSequences).values({ year, lastNumber: 1 });
      return formatInvoiceNumber(year, 1);
    } catch {
      // Counter created concurrently; retry the atomic increment.
    }
  }

  return readFormattedInvoiceNumber(customDb, year);
}

function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(5, "0")}`;
}

async function readFormattedInvoiceNumber(
  customDb: AppDatabase,
  year: number
): Promise<string> {
  const [row] = await customDb
    .select()
    .from(invoiceSequences)
    .where(eq(invoiceSequences.year, year))
    .limit(1);

  const sequence = row?.lastNumber ?? 0;
  if (sequence <= 0) {
    throw new Error(`Invoice sequence for ${year} could not be initialized`);
  }

  return formatInvoiceNumber(year, sequence);
}

/**
 * Appends a verified status history event for an order
 */
export async function logOrderStatusHistory(
  orderId: number,
  status: string,
  note?: string,
  location?: string,
  changedBy: "customer" | "admin" | "system" | "super_admin" = "system",
  customDb: AppDatabase = db
) {
  try {
    await customDb.insert(orderStatusHistory).values({
      orderId,
      status,
      note: note || `Status updated to ${status}`,
      location: location || "Kalol Distribution Hub, Gujarat",
      changedBy,
    });
  } catch (err) {
    console.warn("Could not log order status history:", err);
  }
}

export interface BuyerSnapshot {
  name: string;
  phone: string;
  email?: string;
  billingAddress: string;
  shippingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin?: string;
}

/**
 * Returns existing immutable GST invoice or issues a fresh sequential one.
 * Never recalculates old invoices with new prices or tax rates!
 */
export async function getOrCreateInvoice(orderId: number, customDb: AppDatabase = db) {
  // 1. Check if invoice already exists
  const [existingInvoice] = await customDb
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId))
    .limit(1);

  if (existingInvoice) {
    return {
      invoice: existingInvoice,
      isNew: false,
    };
  }

  // 2. Fetch order and items
  const [order] = await customDb.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new Error(`Order #${orderId} not found`);
  }

  const items = await customDb
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  // 3. Extract buyer details from order and addressSnapshot
  let parsedAddress: any = {};
  try {
    if (order.addressSnapshot) {
      parsedAddress = JSON.parse(order.addressSnapshot);
    }
  } catch {}

  const stateInfo = resolveStateCode(
    parsedAddress.state || "Gujarat",
    parsedAddress.stateCode
  );

  const buyerSnapshot: BuyerSnapshot = {
    name: parsedAddress.name || order.guestName || "Valued Customer",
    phone: parsedAddress.phone || order.guestPhone || "",
    email: parsedAddress.email || undefined,
    billingAddress: parsedAddress.line1 || "Kalol",
    shippingAddress: parsedAddress.line1 || "Kalol",
    city: parsedAddress.city || "Kalol",
    state: stateInfo.state,
    stateCode: stateInfo.stateCode,
    pincode: parsedAddress.pincode || "390001",
    gstin: parsedAddress.gstin || undefined,
  };

  // 4. Calculate GST using engine
  const gstResult: GstCalculationResult = calculateGst({
    items: items.map((it) => ({
      productName: it.productName,
      variantWeight: it.variantWeight,
      hsnCode: it.hsnCode || "21069099",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRatePercent: it.taxRate || 5,
    })),
    buyerState: buyerSnapshot.state,
    buyerStateCode: buyerSnapshot.stateCode,
    orderDiscount: order.discount,
    deliveryFee: order.deliveryFee,
  });

  // 5. Generate sequential invoice number
  const invoiceNumber = await generateSequentialInvoiceNumber(customDb, order.createdAt);

  // 6. Insert new immutable invoice record
  await customDb
    .insert(invoices)
    .values({
      invoiceNumber,
      orderId: order.id,
      invoiceDate: order.createdAt,
      placeOfSupply: gstResult.placeOfSupply,
      isInterState: gstResult.isInterState,
      sellerSnapshot: JSON.stringify(SELLER_DETAILS),
      buyerSnapshot: JSON.stringify(buyerSnapshot),
      itemsSnapshot: JSON.stringify(gstResult.items),
      taxableValue: gstResult.totalTaxableAmount.toFixed(2),
      cgst: gstResult.totalCgst.toFixed(2),
      sgst: gstResult.totalSgst.toFixed(2),
      igst: gstResult.totalIgst.toFixed(2),
      discount: gstResult.totalDiscount.toFixed(2),
      deliveryFee: gstResult.deliveryFee.toFixed(2),
      roundOff: gstResult.roundOff.toFixed(2),
      grandTotal: gstResult.grandTotal.toFixed(2),
      totalInWords: gstResult.totalInWords,
      status: order.status === "cancelled" ? "cancelled" : "issued",
      pdfUrl: `/api/orders/${order.orderNumber}/invoice.pdf`,
    });

  const [createdInvoice] = await customDb
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, order.id))
    .limit(1);

  return {
    invoice: createdInvoice,
    isNew: true,
  };
}
