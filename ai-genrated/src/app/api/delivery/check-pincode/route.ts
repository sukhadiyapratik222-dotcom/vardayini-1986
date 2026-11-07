import { NextResponse } from "next/server";
import { db, ensureDbMigrations } from "@/db";
import { serviceablePincodes, unserviceablePincodeLogs, stores } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidPincode } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureDbMigrations();
    const url = new URL(request.url);
    const rawPin = url.searchParams.get("pincode") || url.searchParams.get("query") || "";
    const cleanPin = rawPin.trim().replace(/\D/g, "");

    // Accept exactly 6 digits & validate Indian pincode format
    if (!cleanPin || cleanPin.length !== 6 || !isValidPincode(cleanPin)) {
      return NextResponse.json(
        {
          isDeliverable: false,
          pincode: cleanPin,
          error: "Please enter a valid 6-digit Indian PIN code.",
          message: "Please enter a valid 6-digit Indian PIN code.",
        },
        { status: 400 }
      );
    }

    // Check against serviceable pincodes database
    const matchingPins = await db
      .select({
        id: serviceablePincodes.id,
        pincode: serviceablePincodes.pincode,
        storeId: serviceablePincodes.storeId,
        city: serviceablePincodes.city,
        state: serviceablePincodes.state,
        deliveryEnabled: serviceablePincodes.deliveryEnabled,
        deliveryCharge: serviceablePincodes.deliveryCharge,
        minimumOrder: serviceablePincodes.minimumOrder,
        estimatedDeliveryTime: serviceablePincodes.estimatedDeliveryTime,
        isExpress: serviceablePincodes.isExpress,
      })
      .from(serviceablePincodes)
      .where(
        and(
          eq(serviceablePincodes.pincode, cleanPin),
          eq(serviceablePincodes.deliveryEnabled, true)
        )
      )
      .limit(1);

    if (matchingPins.length > 0) {
      const pinRecord = matchingPins[0];
      let assignedStore: any = null;

      if (pinRecord.storeId) {
        const storeRows = await db
          .select({
            id: stores.id,
            name: stores.name,
            address: stores.address,
            city: stores.city,
            pincode: stores.pincode,
            phone: stores.phone,
            hours: stores.hours,
            pickupRadiusKm: stores.pickupRadiusKm,
            prepTimeMinutes: stores.prepTimeMinutes,
          })
          .from(stores)
          .where(and(eq(stores.id, pinRecord.storeId), eq(stores.isActive, true)))
          .limit(1);

        if (storeRows.length > 0) {
          assignedStore = storeRows[0];
        }
      }

      return NextResponse.json({
        isDeliverable: true,
        pincode: cleanPin,
        city: pinRecord.city,
        state: pinRecord.state,
        message: "✓ Home Delivery Available in your area!",
        estimatedDeliveryTime: pinRecord.estimatedDeliveryTime || "Today by 6:30 PM",
        deliveryCharge: pinRecord.deliveryCharge ?? 49,
        freeDeliveryThreshold: 799,
        minimumOrder: pinRecord.minimumOrder ?? 0,
        isExpress: Boolean(pinRecord.isExpress),
        assignedStore,
        options: [
          {
            type: pinRecord.isExpress ? "same_day" : "standard",
            title: pinRecord.isExpress ? "Same-Day Fresh Delivery" : "Express Air Shipping",
            badge: pinRecord.isExpress ? "⚡ Same-Day (Hot & Fresh)" : "🚚 Express Courier",
            estimatedDelivery: pinRecord.estimatedDeliveryTime || "Today by 6:30 PM",
            feeText: `FREE over ₹799 (₹${pinRecord.deliveryCharge ?? 49} standard)`,
            details: "Fresh handcrafted Gujarati mithai packed warm in aroma-lock sealed containers.",
            icon: pinRecord.isExpress ? "⚡" : "🚚",
          },
          {
            type: "standard",
            title: "Scheduled Delivery Slot",
            badge: "Flexible Slots",
            estimatedDelivery: "Evening 5:00–7:00 PM or 7:00–9:00 PM",
            feeText: "FREE over ₹799",
            details: "Choose your preferred evening or morning dispatch slot at checkout.",
            icon: "🕒",
          },
        ],
      });
    }

    // Pincode is NOT in the active serviceable database:
    // Log the unserviceable attempt for analytics
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    try {
      await db.insert(unserviceablePincodeLogs).values({
        pincode: cleanPin,
        ipAddress: ip.split(",")[0].trim(),
        source: url.searchParams.get("source") || "pincode_checker",
      });
    } catch {}

    return NextResponse.json({
      isDeliverable: false,
      pincode: cleanPin,
      message: "Sorry! Home delivery is not available in your area.",
      deliveryCharge: null,
      pickupAlternativeAvailable: true,
      pickupMessage: "Store Pickup is available if you visit any of our sweet mart branches in Vadodara or Kalol.",
    });
  } catch (err: unknown) {
    console.error("[Pincode Checker API Error]", err);
    return NextResponse.json(
      { error: "Internal error checking delivery availability." },
      { status: 500 }
    );
  }
}
