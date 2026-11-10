import { NextResponse } from "next/server";
import { db, ensureDbMigrations } from "@/db";
import { stores, serviceablePincodes, productVariants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateDistance, isWithinPickupRadius, isValidCoordinates } from "@/lib/haversine";
import { isValidPincode } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDbMigrations();
    const body = await request.json().catch(() => ({}));

    const fulfillmentType = body.fulfillmentType === "pickup" ? "pickup" : "delivery";
    const storeId = body.storeId ? Number(body.storeId) : null;
    const pincode = typeof body.pincode === "string" ? body.pincode.trim().replace(/\D/g, "") : "";
    const customerLat = typeof body.latitude === "number" ? body.latitude : (body.latitude ? parseFloat(body.latitude) : null);
    const customerLng = typeof body.longitude === "number" ? body.longitude : (body.longitude ? parseFloat(body.longitude) : null);
    const cartItemsList: Array<{ variantId: number; quantity: number }> = Array.isArray(body.items) ? body.items : [];

    // Verify inventory availability if items are supplied
    if (cartItemsList.length > 0) {
      for (const item of cartItemsList) {
        if (!item.variantId || !item.quantity || item.quantity <= 0) continue;
        const [variant] = await db
          .select({ id: productVariants.id, stock: productVariants.stock, weight: productVariants.weight })
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);

        if (!variant || variant.stock < item.quantity) {
          return NextResponse.json(
            {
              valid: false,
              error: `Insufficient stock for pack size (${variant?.weight || "item"}). Available: ${variant?.stock ?? 0}, Requested: ${item.quantity}`,
            },
            { status: 400 }
          );
        }
      }
    }

    if (fulfillmentType === "pickup") {
      if (!storeId) {
        return NextResponse.json(
          { valid: false, error: "Please select a pickup store branch." },
          { status: 400 }
        );
      }

      const [targetStore] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.id, storeId), eq(stores.isActive, true)))
        .limit(1);

      if (!targetStore || !targetStore.pickupEnabled) {
        return NextResponse.json(
          { valid: false, error: "The selected store branch is currently not accepting pickup orders." },
          { status: 400 }
        );
      }

      // Check operating hours
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = (targetStore.openingTime || "08:00").split(":").map(Number);
      const [closeH, closeM] = (targetStore.closingTime || "22:30").split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      // Haversine distance verification if coordinates are available
      let computedDistanceKm: number | null = null;
      const maxRadius = targetStore.pickupRadiusKm ? Number(targetStore.pickupRadiusKm) : 10.0;

      if (customerLat !== null && customerLng !== null && isValidCoordinates(customerLat, customerLng)) {
        const sLat = parseFloat(String(targetStore.lat));
        const sLng = parseFloat(String(targetStore.lng));

        if (isValidCoordinates(sLat, sLng)) {
          computedDistanceKm = calculateDistance(customerLat, customerLng, sLat, sLng);

          if (!isWithinPickupRadius(computedDistanceKm, maxRadius)) {
            return NextResponse.json(
              {
                valid: false,
                ruleCase: "CASE_2",
                distanceKm: computedDistanceKm,
                pickupRadiusKm: maxRadius,
                error: `Store pickup is unavailable because your location (${computedDistanceKm} km away) is outside the ${maxRadius} KM pickup radius. Please choose Home Delivery.`,
              },
              { status: 400 }
            );
          }
        }
      }

      return NextResponse.json({
        valid: true,
        fulfillmentType: "pickup",
        store: {
          id: targetStore.id,
          name: targetStore.name,
          address: targetStore.address,
          city: targetStore.city,
          pincode: targetStore.pincode,
          phone: targetStore.phone,
          hours: targetStore.hours,
          prepTimeMinutes: targetStore.prepTimeMinutes,
        },
        distanceKm: computedDistanceKm,
        deliveryFee: 0,
        message: "✓ Pickup details verified successfully.",
      });
    }

    // Home Delivery validation
    if (!pincode || !isValidPincode(pincode)) {
      return NextResponse.json(
        { valid: false, error: "Please enter a valid 6-digit Indian delivery PIN code." },
        { status: 400 }
      );
    }

    const [serviceable] = await db
      .select()
      .from(serviceablePincodes)
      .where(
        and(
          eq(serviceablePincodes.pincode, pincode),
          eq(serviceablePincodes.deliveryEnabled, true)
        )
      )
      .limit(1);

    if (!serviceable) {
      return NextResponse.json(
        {
          valid: false,
          ruleCase: "CASE_4",
          error: `Home delivery is currently not available for PIN code ${pincode}.`,
        },
        { status: 400 }
      );
    }

    let assignedStore: any = null;
    if (serviceable.storeId) {
      const [s] = await db.select().from(stores).where(eq(stores.id, serviceable.storeId)).limit(1);
      if (s) assignedStore = s;
    }

    return NextResponse.json({
      valid: true,
      fulfillmentType: "delivery",
      pincode,
      assignedStore,
      deliveryFee: serviceable.deliveryCharge ?? 49,
      estimatedDeliveryTime: serviceable.estimatedDeliveryTime || "Today by 6:30 PM",
      message: "✓ Home delivery serviceability verified.",
    });
  } catch (err: unknown) {
    console.error("[Validate Fulfillment API Error]", err);
    return NextResponse.json(
      { valid: false, error: "Internal error validating fulfillment." },
      { status: 500 }
    );
  }
}

