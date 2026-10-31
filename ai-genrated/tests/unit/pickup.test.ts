import { describe, it, expect } from "vitest";
import {
  calculateDistanceKm,
  findNearestStore,
  parseTimeToMinutes,
  formatMinutesToTime,
  isStoreHoliday,
  generateStoreSlots,
  calculatePickupSlotsAvailability,
  calculateEstimatedReadyTime,
  generatePickupOtp,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchUrl,
  StorePickupConfig,
} from "@/lib/pickup";

describe("Pickup System Unit Tests", () => {
  const mockStore: StorePickupConfig = {
    id: 1,
    name: "Vardayini Sweets - Akota Flagship",
    address: "Akota Stadium Road, Near Productivity Council",
    city: "Vadodara",
    pincode: "390020",
    phone: "+91 98250 19760",
    hours: "08:00 AM – 10:00 PM",
    openingTime: "08:00",
    closingTime: "22:00",
    slotIntervalMinutes: 60,
    slotCapacity: 5,
    prepTimeMinutes: 45,
    isActive: true,
    pickupEnabled: true,
    holidays: "2026-11-12, sunday",
    lat: "22.298500",
    lng: "73.167800",
  };

  describe("1. Haversine Distance & Nearest Store Calculation", () => {
    it("calculates distance between two known coordinates accurately", () => {
      // Distance between Akota (22.2985, 73.1678) and Alkapuri (22.3105, 73.1702)
      const distance = calculateDistanceKm(22.2985, 73.1678, 22.3105, 73.1702);
      expect(distance).toBeGreaterThan(1.0);
      expect(distance).toBeLessThan(2.0);
    });

    it("returns 0 for identical coordinates", () => {
      const distance = calculateDistanceKm(22.2985, 73.1678, 22.2985, 73.1678);
      expect(distance).toBe(0);
    });

    it("identifies nearest store from user coordinates", () => {
      const storesList: StorePickupConfig[] = [
        mockStore,
        {
          id: 2,
          name: "Vardayini Sweets - Ahmedabad CG Road",
          address: "CG Road, Navrangpura",
          city: "Ahmedabad",
          pincode: "380009",
          phone: "+91 98250 19761",
          hours: "08:30 AM – 10:30 PM",
          openingTime: "08:30",
          closingTime: "22:30",
          slotIntervalMinutes: 60,
          slotCapacity: 8,
          prepTimeMinutes: 30,
          isActive: true,
          pickupEnabled: true,
          holidays: "",
          lat: "23.030400",
          lng: "72.557400",
        },
      ];

      // User in Vadodara near Akota
      const nearest = findNearestStore(22.3000, 73.1680, storesList);
      expect(nearest).toBeDefined();
      expect(nearest?.store.id).toBe(1);
      expect(nearest?.distanceKm).toBeLessThan(1.0);
    });
  });

  describe("2. Time Parsing & Slot Formatting", () => {
    it("correctly parses 24-hour and 12-hour strings to minutes", () => {
      expect(parseTimeToMinutes("08:00")).toBe(480);
      expect(parseTimeToMinutes("13:30")).toBe(810);
      expect(parseTimeToMinutes("08:00 AM")).toBe(480);
      expect(parseTimeToMinutes("08:00 PM")).toBe(1200);
      expect(parseTimeToMinutes("12:00 PM")).toBe(720);
      expect(parseTimeToMinutes("12:00 AM")).toBe(0);
    });

    it("formats minutes from midnight to readable 12-hour AM/PM string", () => {
      expect(formatMinutesToTime(480)).toBe("08:00 AM");
      expect(formatMinutesToTime(750)).toBe("12:30 PM");
      expect(formatMinutesToTime(1200)).toBe("08:00 PM");
    });
  });

  describe("3. Holiday Detection", () => {
    it("detects exact date holidays", () => {
      expect(isStoreHoliday("2026-11-12, 2026-12-25", "2026-11-12")).toBe(true);
      expect(isStoreHoliday("2026-11-12, 2026-12-25", "2026-11-13")).toBe(false);
    });

    it("detects weekly recurring day holidays (e.g. sunday)", () => {
      // 2026-11-01 was a Sunday
      expect(isStoreHoliday("sunday", "2026-11-01")).toBe(true);
      // 2026-11-02 was a Monday
      expect(isStoreHoliday("sunday", "2026-11-02")).toBe(false);
    });
  });

  describe("4. Store Slots Generation", () => {
    it("generates slots based on opening, closing and interval", () => {
      const slots = generateStoreSlots("09:00", "12:00", 60);
      expect(slots).toHaveLength(3);
      expect(slots[0].slot).toBe("09:00 AM – 10:00 AM");
      expect(slots[1].slot).toBe("10:00 AM – 11:00 AM");
      expect(slots[2].slot).toBe("11:00 AM – 12:00 PM");
    });

    it("handles non-round closing times smoothly", () => {
      const slots = generateStoreSlots("08:00", "10:30", 60);
      expect(slots).toHaveLength(3);
      expect(slots[2].slot).toBe("10:00 AM – 10:30 AM");
    });
  });

  describe("5. Slot Capacity & Availability Calculation", () => {
    it("marks slots as unavailable if branch is inactive or pickup disabled", () => {
      const resInactive = calculatePickupSlotsAvailability({
        store: { ...mockStore, isActive: false },
        dateStr: "2026-10-27",
      });
      expect(resInactive.isStoreOpen).toBe(false);
      expect(resInactive.slots).toHaveLength(0);

      const resDisabled = calculatePickupSlotsAvailability({
        store: { ...mockStore, pickupEnabled: false },
        dateStr: "2026-10-27",
      });
      expect(resDisabled.isStoreOpen).toBe(false);
    });

    it("marks date as closed when it matches store holiday", () => {
      const res = calculatePickupSlotsAvailability({
        store: mockStore,
        dateStr: "2026-11-12",
      });
      expect(res.isHoliday).toBe(true);
      expect(res.slots).toHaveLength(0);
    });

    it("enforces order capacity per slot", () => {
      // Store capacity is 5. If 5 orders are booked, slot should be marked full
      const bookedCount = {
        "10:00 AM – 11:00 AM": 5,
        "11:00 AM – 12:00 PM": 3,
      };

      const res = calculatePickupSlotsAvailability({
        store: mockStore,
        dateStr: "2027-01-06", // Future Wednesday, outside the configured holidays
        bookedCountBySlot: bookedCount,
      });

      const fullSlot = res.slots.find((s) => s.slot === "10:00 AM – 11:00 AM");
      expect(fullSlot).toBeDefined();
      expect(fullSlot?.isFull).toBe(true);
      expect(fullSlot?.isAvailable).toBe(false);
      expect(fullSlot?.remainingCapacity).toBe(0);

      const openSlot = res.slots.find((s) => s.slot === "11:00 AM – 12:00 PM");
      expect(openSlot).toBeDefined();
      expect(openSlot?.isFull).toBe(false);
      expect(openSlot?.isAvailable).toBe(true);
      expect(openSlot?.remainingCapacity).toBe(2);
    });

    it("enforces preparation time for same-day pickups", () => {
      // Simulate today at 10:00 AM (600 mins) with 45 mins prep time.
      // Any slot starting before 10:45 AM should be unavailable.
      const simNow = new Date("2026-10-27T10:00:00.000Z");
      // Set hours on simNow in local time
      simNow.setHours(10, 0, 0, 0);

      const res = calculatePickupSlotsAvailability({
        store: mockStore,
        dateStr: "2026-10-27",
        now: simNow,
      });

      // 08:00 AM – 09:00 AM has already passed
      const pastSlot = res.slots.find((s) => s.slot === "08:00 AM – 09:00 AM");
      expect(pastSlot?.isAvailable).toBe(false);

      // 10:00 AM – 11:00 AM requires 45 mins prep, starting at 10:00 AM which is < 10:45 AM
      const currentSlot = res.slots.find((s) => s.slot === "10:00 AM – 11:00 AM");
      expect(currentSlot?.isAvailable).toBe(false);

      // 11:00 AM – 12:00 PM starts at 11:00 AM (660 mins), which is > 10:45 AM (645 mins)
      const validSlot = res.slots.find((s) => s.slot === "11:00 AM – 12:00 PM");
      expect(validSlot?.isAvailable).toBe(true);
    });
  });

  describe("6. Estimated Ready Time Calculation", () => {
    it("calculates estimated ready time respecting prep time", () => {
      const res = calculateEstimatedReadyTime({
        store: mockStore,
        pickupDateStr: "2026-10-28",
        pickupSlot: "04:00 PM – 05:00 PM",
      });

      expect(res.estimatedReadyAtISO).toBeDefined();
      expect(res.formattedDisplay).toContain("04:00 PM");
    });
  });

  describe("7. Pickup OTP Generation", () => {
    it("generates a 6-digit numeric OTP", () => {
      const otp = generatePickupOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it("generates distinct randomized OTPs", () => {
      const otp1 = generatePickupOtp();
      const otp2 = generatePickupOtp();
      // Extremely low probability of collision
      expect(otp1).not.toBe("");
      expect(otp2).not.toBe("");
    });
  });

  describe("8. Google Maps URL Formatting", () => {
    it("formats navigation directions URL with destination coordinates", () => {
      const dirUrl = getGoogleMapsDirectionsUrl(22.2985, 73.1678);
      expect(dirUrl).toBe("https://www.google.com/maps/dir/?api=1&destination=22.2985,73.1678");
    });

    it("formats turn-by-turn route with origin coordinates when user provides location", () => {
      const routeUrl = getGoogleMapsDirectionsUrl(22.2985, 73.1678, 22.3100, 73.1700);
      expect(routeUrl).toBe(
        "https://www.google.com/maps/dir/?api=1&origin=22.31,73.17&destination=22.2985,73.1678&travelmode=driving"
      );
    });

    it("formats view-on-map search URL", () => {
      const searchUrl = getGoogleMapsSearchUrl("Vardayini Sweets", "Akota", "Vadodara");
      expect(searchUrl).toContain("https://www.google.com/maps/search/?api=1&query=");
      expect(searchUrl).toContain("Vardayini%20Sweets");
    });
  });
});
