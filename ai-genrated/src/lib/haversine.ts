/**
 * Haversine Straight-line GPS Distance Calculation Utility
 * Vardayini Sweet Mart Smart Multi-Store Delivery & Pickup
 * 
 * Formula:
 * a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
 * c = 2 * atan2(√a, √(1-a))
 * d = R * c (where R = 6371 km)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StoreWithDistance {
  id: number;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  openingTime: string;
  closingTime: string;
  prepTimeMinutes: number;
  pickupRadiusKm: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  isActive: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number;
  isPickupEligible: boolean;
  isDeliveryEligible?: boolean;
}

/**
 * Validates whether latitude and longitude are within standard geographical bounds.
 * Latitude: -90 to +90
 * Longitude: -180 to +180
 */
export function isValidCoordinates(lat: unknown, lon: unknown): boolean {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

/**
 * Computes straight-line Haversine distance between two sets of GPS coordinates in kilometers.
 * Always rounded to 2 decimal places.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinates(lat1, lon1) || !isValidCoordinates(lat2, lon2)) {
    throw new Error("Invalid latitude or longitude coordinates provided to Haversine calculator.");
  }

  const R = 6371; // Earth's mean radius in kilometers
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(2));
}

/**
 * Evaluates whether a given distance falls within a store's configured pickup radius (default 10 KM).
 */
export function isWithinPickupRadius(distanceKm: number, radiusKm: number = 10.0): boolean {
  if (typeof distanceKm !== "number" || isNaN(distanceKm) || distanceKm < 0) return false;
  return distanceKm <= radiusKm;
}

/**
 * Ranks active eligible stores by nearest distance from customer coordinates.
 */
export function rankStoresByDistance<T extends {
  id: number;
  name: string;
  lat: number | string;
  lng: number | string;
  pickupRadiusKm?: number | string | null;
  pickupEnabled?: boolean | number;
  isActive?: boolean | number;
}>(customerLat: number, customerLng: number, storesList: T[]): Array<T & { distanceKm: number; isPickupEligible: boolean }> {
  if (!isValidCoordinates(customerLat, customerLng)) {
    return [];
  }

  const results: Array<T & { distanceKm: number; isPickupEligible: boolean }> = [];

  for (const store of storesList) {
    const sLat = typeof store.lat === "number" ? store.lat : parseFloat(String(store.lat));
    const sLng = typeof store.lng === "number" ? store.lng : parseFloat(String(store.lng));

    if (!isValidCoordinates(sLat, sLng)) continue;

    const dist = calculateDistance(customerLat, customerLng, sLat, sLng);
    const radius = store.pickupRadiusKm ? Number(store.pickupRadiusKm) : 10.0;
    const isPickupEnabled = Boolean(store.pickupEnabled ?? true);
    const isStoreActive = Boolean(store.isActive ?? true);

    const isPickupEligible = isStoreActive && isPickupEnabled && isWithinPickupRadius(dist, radius);

    results.push({
      ...store,
      distanceKm: dist,
      isPickupEligible,
    });
  }

  // Sort ascending by nearest distance
  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results;
}

