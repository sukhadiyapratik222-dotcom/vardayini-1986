import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, stores, users, orderStatusHistory } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { getISTDateString, getNowInIST, parseTimeToMinutes } from "@/lib/pickup";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "orders:view");
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const branchIdParam = searchParams.get("branchId");
  const dateParam = searchParams.get("date"); // "today", "upcoming", "all", or "YYYY-MM-DD"
  const statusParam = searchParams.get("status"); // "all" or specific status
  const searchParam = searchParams.get("search")?.trim();

  const todayIST = getISTDateString();
  const nowIST = getNowInIST();
  const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();

  // 1. Fetch all active stores for branch filters
  const allStores = await db
    .select()
    .from(stores)
    .where(eq(stores.isActive, true))
    .orderBy(stores.name);

  // 2. Fetch all pickup orders with joins
  const baseCondition = or(
    eq(orders.fulfillmentType, "pickup"),
    sql`${orders.pickupStoreId} IS NOT NULL`
  );

  const rawOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
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
      // Store details
      storeName: stores.name,
      storeAddress: stores.address,
      storeCity: stores.city,
      storePincode: stores.pincode,
      storePhone: stores.phone,
      storeLat: stores.lat,
      storeLng: stores.lng,
      storeHours: stores.hours,
      storePrepTime: stores.prepTimeMinutes,
      storeSlotCapacity: stores.slotCapacity,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(stores, eq(orders.pickupStoreId, stores.id))
    .where(baseCondition)
    .orderBy(desc(orders.createdAt));

  // 3. Compute live pickup statistics across all pickup orders
  let todayPickups = 0;
  let upcomingPickups = 0;
  let ordersPreparing = 0;
  let readyForPickup = 0;
  let overduePickups = 0;
  let totalPickedUp = 0;

  for (const o of rawOrders) {
    const isCancelled = o.status === "cancelled";
    const isCompleted = o.status === "picked_up" || o.status === "delivered";

    if (o.status === "preparing") ordersPreparing++;
    if (o.status === "ready_for_pickup") readyForPickup++;
    if (o.status === "picked_up") totalPickedUp++;

    if (!isCancelled && !isCompleted && o.pickupDate) {
      if (o.pickupDate === todayIST) {
        todayPickups++;

        // Check if slot has passed today
        if (o.pickupSlot) {
          const parts = o.pickupSlot.split("-");
          const endPart = parts[1]?.trim();
          if (endPart) {
            const endMins = parseTimeToMinutes(endPart);
            if (endMins !== null && currentMinutes > endMins) {
              overduePickups++;
            }
          }
        }
      } else if (o.pickupDate > todayIST) {
        upcomingPickups++;
      } else if (o.pickupDate < todayIST) {
        overduePickups++;
      }
    }
  }

  // 4. Apply user filters in-memory
  let filtered = rawOrders;

  if (branchIdParam && branchIdParam !== "all") {
    const branchIdNum = parseInt(branchIdParam, 10);
    if (!isNaN(branchIdNum)) {
      filtered = filtered.filter((o) => o.pickupStoreId === branchIdNum);
    }
  }

  if (dateParam && dateParam !== "all") {
    if (dateParam === "today") {
      filtered = filtered.filter((o) => o.pickupDate === todayIST);
    } else if (dateParam === "upcoming") {
      filtered = filtered.filter((o) => (o.pickupDate || "") >= todayIST);
    } else if (dateParam === "overdue") {
      filtered = filtered.filter((o) => {
        if (o.status === "picked_up" || o.status === "cancelled") return false;
        if (!o.pickupDate) return false;
        if (o.pickupDate < todayIST) return true;
        if (o.pickupDate === todayIST && o.pickupSlot) {
          const parts = o.pickupSlot.split("-");
          const endPart = parts[1]?.trim();
          if (endPart) {
            const endMins = parseTimeToMinutes(endPart);
            return endMins !== null && currentMinutes > endMins;
          }
        }
        return false;
      });
    } else {
      // Exact date match
      filtered = filtered.filter((o) => o.pickupDate === dateParam);
    }
  }

  if (statusParam && statusParam !== "all") {
    filtered = filtered.filter((o) => o.status === statusParam);
  }

  if (searchParam) {
    const q = searchParam.toLowerCase();
    filtered = filtered.filter((o) => {
      const numMatch = o.orderNumber?.toLowerCase().includes(q);
      const nameMatch = (o.userName || o.guestName || "").toLowerCase().includes(q);
      const phoneMatch = (o.userPhone || o.guestPhone || "").toLowerCase().includes(q);
      const storeMatch = (o.storeName || "").toLowerCase().includes(q);
      return numMatch || nameMatch || phoneMatch || storeMatch;
    });
  }

  // 5. Fetch line items and history for the filtered orders
  const orderIds = filtered.map((o) => o.id);
  const itemsMap = new Map<number, any[]>();
  const historyMap = new Map<number, any[]>();

  if (orderIds.length > 0) {
    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    for (const it of items) {
      if (!itemsMap.has(it.orderId)) {
        itemsMap.set(it.orderId, []);
      }
      itemsMap.get(it.orderId)!.push(it);
    }

    try {
      const historyRows = await db
        .select()
        .from(orderStatusHistory)
        .where(inArray(orderStatusHistory.orderId, orderIds))
        .orderBy(desc(orderStatusHistory.createdAt));

      for (const h of historyRows) {
        if (!historyMap.has(h.orderId)) {
          historyMap.set(h.orderId, []);
        }
        historyMap.get(h.orderId)!.push(h);
      }
    } catch {
      // history table may be empty
    }
  }

  const enrichedOrders = filtered.map((o) => {
    let snapshotName = "";
    let snapshotPhone = "";
    if (o.addressSnapshot) {
      try {
        const parsed = typeof o.addressSnapshot === "string" ? JSON.parse(o.addressSnapshot) : o.addressSnapshot;
        snapshotName = parsed?.name || parsed?.fullName || "";
        snapshotPhone = parsed?.phone || "";
      } catch {}
    }

    const finalName = o.userName || o.guestName || snapshotName || "Customer";
    const finalPhone = o.userPhone || o.guestPhone || snapshotPhone || "-";

    return {
      ...o,
      customerName: finalName,
      customerPhone: finalPhone,
      items: itemsMap.get(o.id) || [],
      history: historyMap.get(o.id) || [],
    };
  });

  return NextResponse.json({
    stats: {
      todayPickups,
      upcomingPickups,
      ordersPreparing,
      readyForPickup,
      overduePickups,
      totalPickedUp,
      totalOrders: rawOrders.length,
    },
    orders: enrichedOrders,
    stores: allStores,
    todayIST,
  });
}
