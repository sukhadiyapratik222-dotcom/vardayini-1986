import { randomInt } from "crypto";

export interface StorePickupConfig {
  id: number;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  slotIntervalMinutes?: number | null;
  slotCapacity?: number | null;
  prepTimeMinutes?: number | null;
  isActive?: boolean | number | null;
  pickupEnabled?: boolean | number | null;
  holidays?: string | null;
  lat: string | number;
  lng: string | number;
  mapUrl?: string | null;
}

export interface PickupSlotInfo {
  slot: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isFull: boolean;
  bookedCount: number;
  totalCapacity: number;
  remainingCapacity: number;
  unavailabilityReason?: string | null;
}

/**
 * Calculates straight-line distance in km between two lat/lng coordinates (Haversine Formula)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export const calculateDistanceKm = calculateHaversineDistanceKm;

/**
 * Finds the nearest store to the given user coordinates
 */
export function findNearestStore(
  userLat: number,
  userLng: number,
  storesList: StorePickupConfig[]
): { store: StorePickupConfig; distanceKm: number } | null {
  if (!storesList || storesList.length === 0) return null;
  let nearest: { store: StorePickupConfig; distanceKm: number } | null = null;
  for (const store of storesList) {
    const lat = Number(store.lat);
    const lng = Number(store.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const dist = calculateHaversineDistanceKm(userLat, userLng, lat, lng);
      if (!nearest || dist < nearest.distanceKm) {
        nearest = { store, distanceKm: dist };
      }
    }
  }
  return nearest;
}

export const calculatePickupSlotsAvailability = getStoreSlotsWithAvailability;

/**
 * Returns current Date in IST (Asia/Kolkata, UTC+5:30)
 */
export function getNowInIST(): Date {
  const now = new Date();
  // IST offset is +5 hours 30 mins
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

/**
 * Returns YYYY-MM-DD formatted string in IST
 */
export function getISTDateString(d: Date = new Date()): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses time string like "08:00", "8:00 AM", "22:30", "10:30 PM" to minutes from midnight
 */
export function parseTimeToMinutes(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().toUpperCase();
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = parseInt(ampmMatch[2], 10);
    const meridian = ampmMatch[3];
    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  const parts = cleaned.split(":");
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }
  return 0;
}

/**
 * Formats minutes from midnight into 12-hour AM/PM format (e.g. "08:00 AM")
 */
export function formatMinutesToTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const meridian = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${meridian}`;
}

/**
 * Checks whether a given YYYY-MM-DD date is marked as a holiday for the store
 */
export function isStoreHoliday(holidaysStr: string | null | undefined, dateStr: string): boolean {
  if (!holidaysStr || !holidaysStr.trim()) return false;
  const holidays = holidaysStr
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const cleanDate = dateStr.trim().toLowerCase();
  if (holidays.includes(cleanDate)) return true;

  // Check day of week (e.g. "sunday", "monday")
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    if (holidays.includes(dayName)) return true;
  } catch {}

  return false;
}

/**
 * Generates slot definitions based on opening, closing, and interval
 */
export function generateStoreSlots(
  openingStr = "08:00",
  closingStr = "22:30",
  intervalMinutes = 60
): Array<{ slot: string; startMin: number; endMin: number; startTime: string; endTime: string }> {
  const startMin = parseTimeToMinutes(openingStr) || 8 * 60;
  const endMin = parseTimeToMinutes(closingStr) || 22 * 60 + 30;
  const interval = Math.max(15, intervalMinutes || 60);

  const slots = [];
  let cur = startMin;
  while (cur < endMin) {
    const next = Math.min(cur + interval, endMin);
    const startFmt = formatMinutesToTime(cur);
    const endFmt = formatMinutesToTime(next);
    slots.push({
      slot: `${startFmt} – ${endFmt}`,
      startMin: cur,
      endMin: next,
      startTime: startFmt,
      endTime: endFmt,
    });
    cur = next;
  }
  return slots;
}

/**
 * Computes live slot availability for a store on a given date
 */
export function getStoreSlotsWithAvailability({
  store,
  dateStr,
  bookedCountBySlot = {},
  now = getNowInIST(),
}: {
  store: StorePickupConfig;
  dateStr: string;
  bookedCountBySlot?: Record<string, number>;
  now?: Date;
}): {
  isStoreOpen: boolean;
  isHoliday: boolean;
  holidayMessage?: string | null;
  slots: PickupSlotInfo[];
} {
  const isHoliday = isStoreHoliday(store.holidays, dateStr);
  const isActive = store.isActive === true || store.isActive === 1 || store.isActive === undefined;
  const isPickupEnabled =
    store.pickupEnabled === true || store.pickupEnabled === 1 || store.pickupEnabled === undefined;

  if (!isActive || !isPickupEnabled) {
    return {
      isStoreOpen: false,
      isHoliday: false,
      holidayMessage: "Pickup service is currently disabled at this branch.",
      slots: [],
    };
  }

  if (isHoliday) {
    return {
      isStoreOpen: false,
      isHoliday: true,
      holidayMessage: `Branch is closed on ${dateStr} for scheduled holiday / maintenance.`,
      slots: [],
    };
  }

  const rawSlots = generateStoreSlots(
    store.openingTime || "08:00",
    store.closingTime || "22:30",
    store.slotIntervalMinutes || 60
  );

  const todayStr = getISTDateString(now);
  const isToday = dateStr === todayStr;
  const isPastDate = dateStr < todayStr;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const prepTime = store.prepTimeMinutes !== undefined && store.prepTimeMinutes !== null
    ? store.prepTimeMinutes
    : 45;
  const maxCapacity = store.slotCapacity || 10;

  const slots: PickupSlotInfo[] = rawSlots.map((s) => {
    const booked = bookedCountBySlot[s.slot] || 0;
    const remaining = Math.max(0, maxCapacity - booked);
    const isFull = booked >= maxCapacity;

    let isAvailable = true;
    let unavailabilityReason: string | null = null;

    if (isPastDate) {
      isAvailable = false;
      unavailabilityReason = "Selected date has passed.";
    } else if (isToday) {
      if (s.endMin <= nowMinutes) {
        isAvailable = false;
        unavailabilityReason = "Slot time has already passed.";
      } else if (s.startMin < nowMinutes + prepTime) {
        isAvailable = false;
        unavailabilityReason = `Requires ${prepTime} mins preparation time (Ready after ${formatMinutesToTime(nowMinutes + prepTime)}).`;
      }
    }

    if (isAvailable && isFull) {
      isAvailable = false;
      unavailabilityReason = "Slot capacity is full for this window.";
    }

    return {
      slot: s.slot,
      startTime: s.startTime,
      endTime: s.endTime,
      isAvailable,
      isFull,
      bookedCount: booked,
      totalCapacity: maxCapacity,
      remainingCapacity: remaining,
      unavailabilityReason,
    };
  });

  return {
    isStoreOpen: true,
    isHoliday: false,
    slots,
  };
}

/**
 * Calculates estimated ready timestamp and formatted string
 */
export function calculateEstimatedReadyTime({
  store,
  pickupDateStr,
  pickupSlot,
  now = getNowInIST(),
}: {
  store: StorePickupConfig;
  pickupDateStr: string;
  pickupSlot: string;
  now?: Date;
}): {
  estimatedReadyAtISO: string;
  formattedDisplay: string;
} {
  const prepTime = store.prepTimeMinutes || 45;
  const todayStr = getISTDateString(now);
  const isToday = pickupDateStr === todayStr;

  // Extract start time from slot e.g. "05:00 PM – 06:00 PM"
  const parts = pickupSlot.split("–").map((p) => p.trim());
  const startMinutes = parseTimeToMinutes(parts[0] || "17:00");

  let readyDate = new Date(pickupDateStr + "T00:00:00Z");
  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const earliestPrepMin = nowMinutes + prepTime;
    // Ready at the earlier of (now + prepTime) or slot start, but at least earliestPrepMin
    const targetMin = Math.max(earliestPrepMin, startMinutes);
    const hours = Math.floor(targetMin / 60);
    const mins = targetMin % 60;
    readyDate = new Date(pickupDateStr);
    readyDate.setHours(hours, mins, 0, 0);
  } else {
    const hours = Math.floor(startMinutes / 60);
    const mins = startMinutes % 60;
    readyDate = new Date(pickupDateStr);
    readyDate.setHours(hours, mins, 0, 0);
  }

  const hoursFmt = formatMinutesToTime(readyDate.getHours() * 60 + readyDate.getMinutes());
  const formattedDisplay = isToday
    ? `Today at ${hoursFmt}`
    : `${pickupDateStr} at ${hoursFmt}`;

  return {
    estimatedReadyAtISO: readyDate.toISOString(),
    formattedDisplay,
  };
}

/**
 * Generates a secure, 6-digit numeric Pickup OTP
 */
export function generatePickupOtp(): string {
  const code = randomInt(100000, 999999);
  return String(code);
}

/**
 * Generates Google Maps Directions URL
 */
export function getGoogleMapsDirectionsUrl(
  destLat: string | number,
  destLng: string | number,
  originLat?: number,
  originLng?: number
): string {
  const dest = `${destLat},${destLng}`;
  if (originLat !== undefined && originLng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/**
 * Generates Google Maps Search / Location URL
 */
export function getGoogleMapsSearchUrl(name: string, address: string, city: string): string {
  const query = encodeURIComponent(`${name}, ${address}, ${city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
