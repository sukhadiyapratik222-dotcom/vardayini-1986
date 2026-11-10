import { NextResponse } from "next/server";
import { db, ensureDbMigrations } from "@/db";
import { stores, serviceablePincodes, addresses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateDistance, isWithinPickupRadius, isValidCoordinates } from "@/lib/haversine";
import { isValidPincode } from "@/lib/validation";

export const dynamic = "force-dynamic";

export interface FulfillmentRuleResult {
  ruleCase: "CASE_1" | "CASE_2" | "CASE_3" | "CASE_4" | "CASE_5" | "CASE_6";
  canCheckout: boolean;
  recommendedFulfillment: "pickup" | "delivery" | "none";
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  message: string;
  pickupMessage?: string;
  deliveryMessage?: string;
  nearestStore: any | null;
  distanceKm: number | null;
  pickupRadiusKm: number;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryTime?: string;
}

export async function POST(request: Request) {
  try {
    await ensureDbMigrations();
    const body = await request.json().catch(() => ({}));

    let customerLat: number | null = null;
    let customerLng: number | null = null;
    let pincode = typeof body.pincode === "string" ? body.pincode.trim().replace(/\D/g, "") : "";
    const selectedStoreId = body.storeId ? Number(body.storeId) : null;
    const addressId = body.addressId ? Number(body.addressId) : null;

    // If addressId is provided, populate from saved address
    if (addressId) {
      const [addr] = await db.select().from(addresses).where(eq(addresses.id, addressId)).limit(1);
      if (addr) {
        if (!pincode) pincode = addr.pincode.trim().replace(/\D/g, "");
        if (addr.latitude && addr.longitude) {
          customerLat = parseFloat(String(addr.latitude));
          customerLng = parseFloat(String(addr.longitude));
        }
      }
    }

    if (body.latitude !== undefined && body.longitude !== undefined) {
      const lat = parseFloat(String(body.latitude));
      const lng = parseFloat(String(body.longitude));
      if (isValidCoordinates(lat, lng)) {
        customerLat = lat;
        customerLng = lng;
      }
    }

    // 1. Fetch active pickup stores
    const activeStores = await db
      .select({
        id: stores.id,
        name: stores.name,
        address: stores.address,
        city: stores.city,
        pincode: stores.pincode,
        phone: stores.phone,
        hours: stores.hours,
        openingTime: stores.openingTime,
        closingTime: stores.closingTime,
        prepTimeMinutes: stores.prepTimeMinutes,
        pickupRadiusKm: stores.pickupRadiusKm,
        pickupEnabled: stores.pickupEnabled,
        deliveryEnabled: stores.deliveryEnabled,
        lat: stores.lat,
        lng: stores.lng,
        deliveryCharge: stores.deliveryCharge,
        freeDeliveryThreshold: stores.freeDeliveryThreshold,
      })
      .from(stores)
      .where(and(eq(stores.isActive, true), eq(stores.pickupEnabled, true)));

    // 2. Check Delivery Serviceability by Pincode
    let isDeliveryServiceable = false;
    let deliveryEstimatedTime = "Today by 6:30 PM";
    let deliveryFee = 49;
    let freeThreshold = 799;
    let matchedStoreId: number | null = null;

    if (pincode && isValidPincode(pincode)) {
      const [servPin] = await db
        .select()
        .from(serviceablePincodes)
        .where(
          and(
            eq(serviceablePincodes.pincode, pincode),
            eq(serviceablePincodes.deliveryEnabled, true)
          )
        )
        .limit(1);

      if (servPin) {
        isDeliveryServiceable = true;
        deliveryEstimatedTime = servPin.estimatedDeliveryTime || "Today by 6:30 PM";
        deliveryFee = servPin.deliveryCharge ?? 49;
        matchedStoreId = servPin.storeId ?? null;
      }
    }

    // 3. Evaluate GPS Coordinates and Distance to Stores
    const hasValidCoordinates = customerLat !== null && customerLng !== null && isValidCoordinates(customerLat, customerLng);

    let nearestStore: any = null;
    let minDistance: number | null = null;
    let isWithinAnyStorePickupRadius = false;
    let selectedStoreDistance: number | null = null;

    if (hasValidCoordinates && activeStores.length > 0) {
      const storesWithDist = activeStores.map((s) => {
        const sLat = parseFloat(String(s.lat));
        const sLng = parseFloat(String(s.lng));
        const dist = calculateDistance(customerLat!, customerLng!, sLat, sLng);
        const radius = s.pickupRadiusKm ? Number(s.pickupRadiusKm) : 10.0;
        const isEligible = isWithinPickupRadius(dist, radius);

        return {
          ...s,
          distanceKm: dist,
          pickupRadiusKm: radius,
          isEligible,
        };
      });

      storesWithDist.sort((a, b) => a.distanceKm - b.distanceKm);
      nearestStore = storesWithDist[0];
      minDistance = nearestStore.distanceKm;
      isWithinAnyStorePickupRadius = storesWithDist.some((s) => s.isEligible);

      if (selectedStoreId) {
        const sel = storesWithDist.find((s) => s.id === selectedStoreId);
        if (sel) selectedStoreDistance = sel.distanceKm;
      }
    } else if (activeStores.length > 0) {
      // Coordinates not available
      nearestStore = activeStores.find((s) => s.id === (selectedStoreId || matchedStoreId)) || activeStores[0];
    }

    const defaultRadius = nearestStore?.pickupRadiusKm ? Number(nearestStore.pickupRadiusKm) : 10.0;

    // 4. Implement Exact Rules (Case 1 to Case 6)
    
    // CASE 5: Coordinates unavailable (GPS Denied or no location pin)
    if (!hasValidCoordinates) {
      return NextResponse.json({
        ruleCase: "CASE_5",
        canCheckout: isDeliveryServiceable,
        recommendedFulfillment: isDeliveryServiceable ? "delivery" : "none",
        pickupAvailable: false,
        deliveryAvailable: isDeliveryServiceable,
        message: isDeliveryServiceable
          ? "Home delivery is available for your entered pincode. For store pickup eligibility, please share your GPS location or select a saved address."
          : "Please enter your delivery pincode or share your GPS location to verify available fulfillment options.",
        pickupMessage: "Exact GPS coordinates required to verify 10 KM pickup radius.",
        deliveryMessage: isDeliveryServiceable
          ? `Home delivery available to ${pincode}`
          : "Home delivery serviceability requires a verified 6-digit Indian PIN code.",
        nearestStore,
        distanceKm: null,
        pickupRadiusKm: defaultRadius,
        deliveryCharge: deliveryFee,
        freeDeliveryThreshold: freeThreshold,
        estimatedDeliveryTime: deliveryEstimatedTime,
      } satisfies FulfillmentRuleResult);
    }

    // CASE 1: Customer within 10 KM of an eligible store AND delivery is serviceable
    if (isWithinAnyStorePickupRadius && isDeliveryServiceable) {
      return NextResponse.json({
        ruleCase: "CASE_1",
        canCheckout: true,
        recommendedFulfillment: "pickup",
        pickupAvailable: true,
        deliveryAvailable: true,
        message: `✓ Both Store Pickup (${minDistance} km) and Home Delivery are available for your location!`,
        pickupMessage: `Store Pickup is available at ${nearestStore.name} (${minDistance} km away). Ready in ${nearestStore.prepTimeMinutes || 30} mins.`,
        deliveryMessage: `Home delivery available (${deliveryEstimatedTime}).`,
        nearestStore,
        distanceKm: minDistance,
        pickupRadiusKm: defaultRadius,
        deliveryCharge: deliveryFee,
        freeDeliveryThreshold: freeThreshold,
        estimatedDeliveryTime: deliveryEstimatedTime,
      } satisfies FulfillmentRuleResult);
    }

    // CASE 2: Customer outside 10 KM of all eligible stores BUT delivery is available
    if (!isWithinAnyStorePickupRadius && isDeliveryServiceable) {
      return NextResponse.json({
        ruleCase: "CASE_2",
        canCheckout: true,
        recommendedFulfillment: "delivery",
        pickupAvailable: false,
        deliveryAvailable: true,
        message: `Store pickup is unavailable because your location is outside the 10 KM pickup radius (${minDistance} km from nearest branch). Home delivery has been selected automatically.`,
        pickupMessage: `Store pickup unavailable (${minDistance} km exceeds ${defaultRadius} km pickup limit).`,
        deliveryMessage: `Home delivery confirmed (${deliveryEstimatedTime}).`,
        nearestStore,
        distanceKm: minDistance,
        pickupRadiusKm: defaultRadius,
        deliveryCharge: deliveryFee,
        freeDeliveryThreshold: freeThreshold,
        estimatedDeliveryTime: deliveryEstimatedTime,
      } satisfies FulfillmentRuleResult);
    }

    // CASE 3: Customer within 10 KM BUT pincode is NOT delivery-serviceable
    if (isWithinAnyStorePickupRadius && !isDeliveryServiceable) {
      return NextResponse.json({
        ruleCase: "CASE_3",
        canCheckout: true,
        recommendedFulfillment: "pickup",
        pickupAvailable: true,
        deliveryAvailable: false,
        message: `Home delivery is currently not serviceable for pincode ${pincode || "in this area"}, but Store Pickup is available at our nearby counter (${minDistance} km away).`,
        pickupMessage: `Store Pickup ready in ${nearestStore.prepTimeMinutes || 30} mins at ${nearestStore.name}.`,
        deliveryMessage: "Sorry! Home delivery is not available in your area.",
        nearestStore,
        distanceKm: minDistance,
        pickupRadiusKm: defaultRadius,
        deliveryCharge: deliveryFee,
        freeDeliveryThreshold: freeThreshold,
        estimatedDeliveryTime: deliveryEstimatedTime,
      } satisfies FulfillmentRuleResult);
    }

    // CASE 4: Customer outside 10 KM AND pincode is NOT delivery-serviceable
    return NextResponse.json({
      ruleCase: "CASE_4",
      canCheckout: false,
      recommendedFulfillment: "none",
      pickupAvailable: false,
      deliveryAvailable: false,
      message: `Sorry! Both Store Pickup and Home Delivery are unavailable for your area. Your location (${minDistance} km away) is outside the 10 KM pickup radius and pincode ${pincode || ""} is not serviceable for delivery.`,
      pickupMessage: `Outside 10 KM pickup limit (${minDistance} km away).`,
      deliveryMessage: "Home delivery is not available in your area.",
      nearestStore,
      distanceKm: minDistance,
      pickupRadiusKm: defaultRadius,
      deliveryCharge: deliveryFee,
      freeDeliveryThreshold: freeThreshold,
    } satisfies FulfillmentRuleResult);
  } catch (err: unknown) {
    console.error("[Location Verification API Error]", err);
    return NextResponse.json(
      { error: "Internal error processing location verification." },
      { status: 500 }
    );
  }
}

