import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, getSqliteDb } from "@/db";
import { orders, orderItems, stores, orderStatusHistory } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { parseOrderLookup, handlePickupUpdate } from "@/lib/pickup-handlers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "orders:manage");
  if (auth.error) {
    return auth.error;
  }

  const { orderNumber } = await context.params;
  const lookup = parseOrderLookup(orderNumber);

  let [order] = await db
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
      pickupStoreId: orders.pickupStoreId,
      pickupDate: orders.pickupDate,
      pickupSlot: orders.pickupSlot,
      estimatedReadyAt: orders.estimatedReadyAt,
      actualReadyAt: orders.actualReadyAt,
      pickupOtp: orders.pickupOtp,
      pickupVerifiedBy: orders.pickupVerifiedBy,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
      cancelReason: orders.cancelReason,
      storeName: stores.name,
      storeAddress: stores.address,
      storeCity: stores.city,
      storePhone: stores.phone,
      storeLat: stores.lat,
      storeLng: stores.lng,
      storeHours: stores.hours,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.pickupStoreId, stores.id))
    .where(lookup.condition)
    .limit(1);

  // Direct SQLite fallback
  if (!order) {
    try {
      const sqlite = getSqliteDb();
      const sqliteRow = sqlite
        .prepare(`
          SELECT o.*, s.name as store_name, s.address as store_address, s.city as store_city, 
                 s.phone as store_phone, s.lat as store_lat, s.lng as store_lng, s.hours as store_hours
          FROM orders o
          LEFT JOIN stores s ON o.pickup_store_id = s.id
          WHERE o.order_number = ? 
             OR REPLACE(o.order_number, '#', '') = ?
             OR LOWER(o.order_number) = LOWER(?)
             ${lookup.numId ? "OR o.id = ?" : ""}
          LIMIT 1
        `)
        .get(...(lookup.numId ? [lookup.clean, lookup.clean, lookup.clean, lookup.numId] : [lookup.clean, lookup.clean, lookup.clean])) as any;

      if (sqliteRow) {
        order = {
          id: sqliteRow.id,
          orderNumber: sqliteRow.order_number,
          userId: sqliteRow.user_id,
          guestName: sqliteRow.guest_name,
          guestPhone: sqliteRow.guest_phone,
          status: sqliteRow.status,
          subtotal: sqliteRow.subtotal,
          discount: sqliteRow.discount,
          deliveryFee: sqliteRow.delivery_fee,
          tax: sqliteRow.tax,
          total: sqliteRow.total,
          couponCode: sqliteRow.coupon_code,
          addressSnapshot: sqliteRow.address_snapshot,
          deliverySlot: sqliteRow.delivery_slot,
          fulfillmentType: sqliteRow.fulfillment_type || "pickup",
          pickupStoreId: sqliteRow.pickup_store_id,
          pickupDate: sqliteRow.pickup_date,
          pickupSlot: sqliteRow.pickup_slot,
          estimatedReadyAt: sqliteRow.estimated_ready_at,
          actualReadyAt: sqliteRow.actual_ready_at,
          pickupOtp: sqliteRow.pickup_otp,
          pickupVerifiedBy: sqliteRow.pickup_verified_by,
          paymentMethod: sqliteRow.payment_method,
          paymentStatus: sqliteRow.payment_status,
          createdAt: sqliteRow.created_at,
          deliveredAt: sqliteRow.delivered_at,
          cancelledAt: sqliteRow.cancelled_at,
          cancelReason: sqliteRow.cancel_reason,
          storeName: sqliteRow.store_name,
          storeAddress: sqliteRow.store_address,
          storeCity: sqliteRow.store_city,
          storePhone: sqliteRow.store_phone,
          storeLat: sqliteRow.store_lat,
          storeLng: sqliteRow.store_lng,
          storeHours: sqliteRow.store_hours,
        } as any;
      }
    } catch (e) {
      console.warn("[pickups] SQLite fallback query error:", e);
    }
  }

  if (!order) {
    return NextResponse.json({ error: `Pickup order '${lookup.clean}' not found` }, { status: 404 });
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  let history: any[] = [];
  try {
    history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(desc(orderStatusHistory.createdAt));
  } catch {}

  return NextResponse.json({ order: { ...order, items, history } });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await context.params;
  return handlePickupUpdate(request, orderNumber);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await context.params;
  return handlePickupUpdate(request, orderNumber);
}
