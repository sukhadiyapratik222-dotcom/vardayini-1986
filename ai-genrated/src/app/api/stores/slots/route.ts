import { NextResponse } from "next/server";
import { eq, and, ne, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { stores, orders } from "@/db/schema";
import { getISTDateString, getStoreSlotsWithAvailability } from "@/lib/pickup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureDbMigrations();
    const url = new URL(request.url);
    const storeIdParam = url.searchParams.get("storeId");
    const dateParam = url.searchParams.get("date") || getISTDateString();

    if (!storeIdParam) {
      return NextResponse.json(
        { error: "storeId parameter is required" },
        { status: 400 }
      );
    }

    const storeId = parseInt(storeIdParam, 10);
    if (isNaN(storeId) || storeId <= 0) {
      return NextResponse.json(
        { error: "Invalid storeId" },
        { status: 400 }
      );
    }

    // Validate YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Count non-cancelled pickup orders for this store and date per slot
    let bookedCountBySlot: Record<string, number> = {};
    try {
      const bookedRows = await db
        .select({
          slot: orders.pickupSlot,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.pickupStoreId, storeId),
            eq(orders.pickupDate, dateParam),
            ne(orders.status, "cancelled")
          )
        )
        .groupBy(orders.pickupSlot);

      for (const row of bookedRows) {
        if (row.slot) {
          bookedCountBySlot[row.slot] = Number(row.count) || 0;
        }
      }
    } catch (countErr) {
      console.warn("[Slots API] Booked count query notice:", countErr);
    }

    const availability = getStoreSlotsWithAvailability({
      store,
      dateStr: dateParam,
      bookedCountBySlot,
    });

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        city: store.city,
        pincode: store.pincode,
        phone: store.phone,
        hours: store.hours,
        openingTime: store.openingTime,
        closingTime: store.closingTime,
        slotIntervalMinutes: store.slotIntervalMinutes,
        slotCapacity: store.slotCapacity,
        prepTimeMinutes: store.prepTimeMinutes,
        isActive: store.isActive,
        pickupEnabled: store.pickupEnabled,
        lat: store.lat,
        lng: store.lng,
      },
      date: dateParam,
      ...availability,
    });
  } catch (error: any) {
    console.error("[Slots API Error]", error);
    return NextResponse.json(
      { error: "Failed to calculate store pickup slots" },
      { status: 500 }
    );
  }
}
