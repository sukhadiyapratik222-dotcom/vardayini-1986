import { NextResponse } from "next/server";
import { db, ensureDbMigrations } from "@/db";
import { stores, serviceablePincodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateDistance, isWithinPickupRadius, isValidCoordinates } from "@/lib/haversine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureDbMigrations();
    const url = new URL(request.url);
    const latParam = url.searchParams.get("lat");
    const lngParam = url.searchParams.get("lng");
    const pincodeParam = url.searchParams.get("pincode");

    // Retrieve active stores
    const allActiveStores = await db
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
        isActive: stores.isActive,
        lat: stores.lat,
        lng: stores.lng,
        mapUrl: stores.mapUrl,
      })
      .from(stores)
      .where(and(eq(stores.isActive, true), eq(stores.pickupEnabled, true)));

    if (allActiveStores.length === 0) {
      return NextResponse.json({
        nearestStore: null,
        stores: [],
        hasEligiblePickupStore: false,
        message: "No active store branches currently available for pickup.",
      });
    }

    // Check if coordinates were supplied
    if (latParam && lngParam) {
      const userLat = parseFloat(latParam);
      const userLng = parseFloat(lngParam);

      if (!isValidCoordinates(userLat, userLng)) {
        return NextResponse.json(
          { error: "Invalid GPS coordinates supplied." },
          { status: 400 }
        );
      }

      // Calculate straight-line Haversine distance to each active store
      const ranked = allActiveStores
        .map((s) => {
          const sLat = parseFloat(String(s.lat));
          const sLng = parseFloat(String(s.lng));
          if (!isValidCoordinates(sLat, sLng)) return null;

          const distanceKm = calculateDistance(userLat, userLng, sLat, sLng);
          const radiusKm = s.pickupRadiusKm ? Number(s.pickupRadiusKm) : 10.0;
          const isPickupEligible = isWithinPickupRadius(distanceKm, radiusKm);

          return {
            ...s,
            distanceKm,
            pickupRadiusKm: radiusKm,
            isPickupEligible,
            directionsUrl: s.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${sLat},${sLng}`,
          };
        })
        .filter(Boolean) as Array<typeof allActiveStores[0] & {
          distanceKm: number;
          pickupRadiusKm: number;
          isPickupEligible: boolean;
          directionsUrl: string;
        }>;

      ranked.sort((a, b) => a.distanceKm - b.distanceKm);

      const nearestStore = ranked[0] || null;
      const eligiblePickupStores = ranked.filter((s) => s.isPickupEligible);
      const hasEligiblePickupStore = eligiblePickupStores.length > 0;

      return NextResponse.json({
        customerCoordinates: { latitude: userLat, longitude: userLng },
        nearestStore,
        hasEligiblePickupStore,
        stores: ranked,
        eligibleStores: eligiblePickupStores,
        pickupRadiusDefaultKm: 10,
        message: hasEligiblePickupStore
          ? `📍 Nearest branch is ${nearestStore?.name} (${nearestStore?.distanceKm} km away)`
          : `⚠️ Outside pickup service radius. Nearest branch (${nearestStore?.name}) is ${nearestStore?.distanceKm} km away (limit: ${nearestStore?.pickupRadiusKm || 10} km).`,
      });
    }

    // Fallback: If only pincode is provided
    if (pincodeParam) {
      const cleanPin = pincodeParam.trim().replace(/\D/g, "");
      let preferredStoreId: number | null = null;

      // Find store mapped to this pincode
      const pinMap = await db
        .select()
        .from(serviceablePincodes)
        .where(eq(serviceablePincodes.pincode, cleanPin))
        .limit(1);

      if (pinMap.length > 0 && pinMap[0].storeId) {
        preferredStoreId = pinMap[0].storeId;
      }

      const formatted = allActiveStores.map((s) => ({
        ...s,
        distanceKm: null,
        isPickupEligible: true,
        isPincodeMatched: s.id === preferredStoreId || s.pincode === cleanPin,
        pickupRadiusKm: s.pickupRadiusKm ? Number(s.pickupRadiusKm) : 10.0,
        directionsUrl: s.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.city)}`,
      }));

      // Sort so pincode matched store appears first
      formatted.sort((a, b) => (b.isPincodeMatched ? 1 : 0) - (a.isPincodeMatched ? 1 : 0));

      return NextResponse.json({
        nearestStore: formatted[0] || null,
        stores: formatted,
        hasEligiblePickupStore: true,
        requiresGpsCoordinatesForPreciseRadius: true,
        message: "Branch list mapped to your delivery area. GPS coordinates recommended for exact distance verification.",
      });
    }

    // Default: return all active stores
    const mapped = allActiveStores.map((s) => ({
      ...s,
      distanceKm: null,
      isPickupEligible: true,
      pickupRadiusKm: s.pickupRadiusKm ? Number(s.pickupRadiusKm) : 10.0,
      directionsUrl: s.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.city)}`,
    }));

    return NextResponse.json({
      nearestStore: mapped[0] || null,
      stores: mapped,
      hasEligiblePickupStore: true,
      message: "Active sweet shop counters loaded.",
    });
  } catch (err: unknown) {
    console.error("[Nearest Store API Error]", err);
    return NextResponse.json(
      { error: "Internal error locating nearest store branch." },
      { status: 500 }
    );
  }
}
