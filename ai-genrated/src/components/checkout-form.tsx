"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { INDIAN_STATES } from "@/lib/validation-constants";
import { AddressSchema, formatZodErrors } from "@/lib/validation";
import { buildApiUrl, getApiHeaders } from "@/lib/api-config";

const DELIVERY_SLOTS = [
  "Today, 5:00–7:00 PM",
  "Today, 7:00–9:00 PM",
  "Tomorrow, 10:00 AM–12:00 PM",
  "Tomorrow, 4:00–7:00 PM",
  "Tomorrow, 7:00–9:00 PM",
];

interface StoreBranch {
  id: number;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  openingTime?: string;
  closingTime?: string;
  slotIntervalMinutes?: number;
  slotCapacity?: number;
  prepTimeMinutes?: number;
  latitude?: string;
  longitude?: string;
  isActive?: boolean;
  pickupEnabled?: boolean;
  holidays?: string[];
  distanceKm?: number;
}

interface SlotInfo {
  slot: string;
  startMinutes: number;
  endMinutes: number;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  isAvailable: boolean;
  unavailabilityReason?: string;
}

// Generate the next 7 pickup dates
function getUpcomingDates(): Array<{ dateStr: string; label: string }> {
  const dates: Array<{ dateStr: string; label: string }> = [];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    let label = d.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    if (i === 0) label = `Today (${label})`;
    else if (i === 1) label = `Tomorrow (${label})`;

    dates.push({ dateStr, label });
  }

  return dates;
}

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function CheckoutForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");

  // General state
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Recipient info
  const [name, setName] = useState(defaultName || "");
  const [phone, setPhone] = useState(defaultPhone || "");

  // Home Delivery fields
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Vadodara");
  const [state, setState] = useState("Gujarat");
  const [pincode, setPincode] = useState("390001");
  const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0]);

  // Store Pickup fields
  const upcomingDates = getUpcomingDates();
  const [stores, setStores] = useState<StoreBranch[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState(upcomingDates[0].dateStr);
  const [pickupSlot, setPickupSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Geolocation & Nearest Branch state
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState("cod");

  // Customer Order OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [orderOtp, setOrderOtp] = useState("");
  const [orderDevOtp, setOrderDevOtp] = useState<string | null>(null);
  const [orderResendTimer, setOrderResendTimer] = useState(0);
  const [orderOtpError, setOrderOtpError] = useState("");
  const [resendingOrderWhatsapp, setResendingOrderWhatsapp] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Countdown timer for Order OTP resend
  useEffect(() => {
    if (orderResendTimer <= 0) return;
    const interval = setInterval(() => {
      setOrderResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [orderResendTimer]);

  // Load active stores on mount
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch("/api/stores");
        if (res.ok) {
          const data = await res.json();
          const storeList: StoreBranch[] = data.stores || [];
          const activePickups = storeList.filter(
            (s) => s.isActive !== false && s.pickupEnabled !== false
          );
          setStores(activePickups);
          if (activePickups.length > 0 && selectedStoreId === null) {
            setSelectedStoreId(activePickups[0].id);
          }
        }
      } catch (err) {
        console.warn("Failed to load stores for checkout:", err);
      }
    }
    loadStores();
  }, []);

  // Fetch slots whenever selected store or pickup date changes
  useEffect(() => {
    if (!selectedStoreId || !pickupDate || fulfillmentType !== "pickup") return;

    let isMounted = true;
    async function fetchSlots() {
      setLoadingSlots(true);
      setIsHoliday(false);
      setHolidayMessage("");
      try {
        const res = await fetch(`/api/stores/slots?storeId=${selectedStoreId}&date=${pickupDate}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.isHoliday) {
              setIsHoliday(true);
              setHolidayMessage(data.holidayMessage || "Selected branch is closed on this date.");
              setAvailableSlots([]);
              setPickupSlot("");
            } else {
              const slots: SlotInfo[] = data.slots || [];
              setAvailableSlots(slots);
              const firstAvail = slots.find((s) => s.isAvailable);
              setPickupSlot(firstAvail ? firstAvail.slot : "");
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch store slots:", err);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedStoreId, pickupDate, fulfillmentType]);

  const selectedStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Voluntary Geolocation to find nearest branch
  const findNearestBranch = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationMessage("Geolocation is not supported by your browser.");
      return;
    }

    setLocatingUser(true);
    setLocationMessage("Locating nearest sweet mart branch...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatingUser(false);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const withDistances = stores.map((s) => {
          const lat = parseFloat(s.latitude || "0");
          const lng = parseFloat(s.longitude || "0");
          const dist = lat && lng ? calculateHaversineDistance(userLat, userLng, lat, lng) : 9999;
          return { ...s, distanceKm: dist };
        });

        withDistances.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
        setStores(withDistances);

        if (withDistances[0] && withDistances[0].distanceKm !== 9999) {
          setSelectedStoreId(withDistances[0].id);
          setLocationMessage(
            `📍 Nearest Branch: ${withDistances[0].name} (${withDistances[0].distanceKm} km away)`
          );
        } else {
          setLocationMessage("Location found, but store coordinates are not mapped.");
        }
      },
      (error) => {
        setLocatingUser(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage("Location permission denied. Please select your branch manually below.");
        } else {
          setLocationMessage("Unable to determine your location. Please select your branch manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setGlobalError("");
    setFieldErrors({});

    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/^(?:\+91|91|0)/, "").replace(/\D/g, "");

    if (!trimmedName) {
      setFieldErrors((prev) => ({ ...prev, fullName: "Recipient name is required" }));
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
      }));
      return;
    }

    if (fulfillmentType === "pickup") {
      if (!selectedStoreId) {
        setGlobalError("Please select a pickup store branch.");
        return;
      }
      if (!pickupDate) {
        setGlobalError("Please choose a pickup date.");
        return;
      }
      if (isHoliday) {
        setGlobalError(holidayMessage || "Selected branch is closed on this date.");
        return;
      }
      if (!pickupSlot) {
        setGlobalError("Please choose an available pickup time slot.");
        return;
      }
    } else {
      // Home Delivery validation
      const validation = AddressSchema.safeParse({
        fullName: trimmedName,
        phone: cleanPhone,
        line1: line1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: "India",
      });

      if (!validation.success) {
        setFieldErrors(formatZodErrors(validation.error));
        return;
      }
    }

    setLoading(true);
    setOrderOtpError("");
    setGlobalError("");

    try {
      // 1. Dispatch Customer Order Verification OTP
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone, trigger: "order" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Failed to dispatch mobile verification OTP. Please try again.");
        return;
      }

      setOrderOtp("");
      if (data.devOtp) setOrderDevOtp(data.devOtp);
      setOrderResendTimer(60);
      setShowOtpModal(true);
    } catch {
      setGlobalError("Network error while initiating verification OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Final Order Placement with Customer OTP Verification
  async function handleConfirmOrderWithOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    if (orderSubmitting) return;
    const cleanOtp = orderOtp.trim();
    if (!cleanOtp || cleanOtp.length < 4 || cleanOtp.length > 6) {
      setOrderOtpError("Please enter the complete 6-digit verification code sent to your phone.");
      return;
    }

    setOrderSubmitting(true);
    setOrderOtpError("");

    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/^(?:\+91|91|0)/, "").replace(/\D/g, "");

    try {
      const payload =
        fulfillmentType === "pickup"
          ? {
              fulfillmentType: "pickup",
              pickupStoreId: selectedStoreId,
              pickupDate,
              pickupSlot,
              name: trimmedName,
              phone: cleanPhone,
              paymentMethod,
              otp: cleanOtp,
            }
          : {
              fulfillmentType: "delivery",
              name: trimmedName,
              phone: cleanPhone,
              line1: line1.trim(),
              city: city.trim(),
              state: state.trim(),
              pincode: pincode.trim(),
              deliverySlot,
              paymentMethod,
              otp: cleanOtp,
            };

      const res = await fetch(buildApiUrl("/api/orders"), {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setOrderOtpError(data.error || "Could not place order. Please try again.");
        return;
      }

      setShowOtpModal(false);
      const confirmUrl = data.guestToken
        ? `/orders/${data.order.orderNumber}?token=${encodeURIComponent(data.guestToken)}`
        : `/orders/${data.order.orderNumber}`;
      router.push(confirmUrl);
      router.refresh();
    } catch {
      setOrderOtpError("An unexpected network error occurred while placing your order.");
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function resendOrderOtp() {
    const cleanPhone = phone.replace(/^(?:\+91|91|0)/, "").replace(/\D/g, "");
    setOrderOtpError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone, trigger: "order" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderOtpError(data.error || "Failed to resend SMS OTP.");
        return;
      }
      if (data.devOtp) setOrderDevOtp(data.devOtp);
      setOrderResendTimer(60);
    } catch {
      setOrderOtpError("Failed to reach SMS gateway. Please try again.");
    }
  }

  async function resendOrderWhatsApp() {
    const cleanPhone = phone.replace(/^(?:\+91|91|0)/, "").replace(/\D/g, "");
    setResendingOrderWhatsapp(true);
    setOrderOtpError("");
    try {
      const res = await fetch("/api/auth/resend-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone, trigger: "order" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderOtpError(data.error || "Failed to resend OTP via WhatsApp.");
        return;
      }
      if (data.devOtp) setOrderDevOtp(data.devOtp);
      setOrderResendTimer(60);
    } catch {
      setOrderOtpError("Failed to reach WhatsApp service.");
    } finally {
      setResendingOrderWhatsapp(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="mithai-card mt-5 sm:mt-8 space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-sm border border-[#6b1d1d]/10">
      {/* 1. Fulfillment Mode Toggle */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#6b1d1d]/10 pb-3">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#6b1d1d]">
              Fulfillment Method
            </h3>
            <p className="text-xs text-[#2a1a12]/65">
              Choose how you would like to receive your fresh mithai & namkeen
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
            {fulfillmentType === "pickup" ? "Free Pickup (₹0 Fee)" : "Standard Delivery"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setFulfillmentType("pickup")}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 sm:p-4 text-center transition border ${
              fulfillmentType === "pickup"
                ? "border-[#c45c26] bg-[#c45c26]/10 text-[#6b1d1d] font-bold shadow-sm"
                : "border-[#6b1d1d]/15 bg-white text-[#2a1a12]/70 hover:border-[#c45c26]/50"
            }`}
          >
            <span className="text-2xl">🏪</span>
            <span className="text-sm font-semibold">Store Pickup</span>
            <span className="text-[11px] text-[#2a1a12]/60">Click & Collect from branch</span>
          </button>

          <button
            type="button"
            onClick={() => setFulfillmentType("delivery")}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 sm:p-4 text-center transition border ${
              fulfillmentType === "delivery"
                ? "border-[#c45c26] bg-[#c45c26]/10 text-[#6b1d1d] font-bold shadow-sm"
                : "border-[#6b1d1d]/15 bg-white text-[#2a1a12]/70 hover:border-[#c45c26]/50"
            }`}
          >
            <span className="text-2xl">🚚</span>
            <span className="text-sm font-semibold">Home Delivery</span>
            <span className="text-[11px] text-[#2a1a12]/60">Fresh to your doorstep</span>
          </button>
        </div>
      </div>

      {/* 2. Store Pickup Selection */}
      {fulfillmentType === "pickup" && (
        <div className="space-y-4 rounded-2xl bg-[#faf8f5] p-4 border border-[#6b1d1d]/10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#6b1d1d]/10 pb-2.5">
            <div>
              <h4 className="text-sm font-bold text-[#6b1d1d]">
                Select Pickup Branch & Schedule
              </h4>
              <p className="text-xs text-[#2a1a12]/60">
                Freshly prepared and packed for you at the counter
              </p>
            </div>
            <button
              type="button"
              onClick={findNearestBranch}
              disabled={locatingUser}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#c45c26] shadow-sm border border-[#c45c26]/30 hover:bg-[#c45c26]/10 transition disabled:opacity-50"
            >
              <span>📍</span>
              <span>{locatingUser ? "Locating..." : "Find Nearest Branch"}</span>
            </button>
          </div>

          {locationMessage && (
            <p className="text-xs font-medium text-[#c45c26] bg-[#c45c26]/5 px-3 py-1.5 rounded-xl border border-[#c45c26]/20">
              {locationMessage}
            </p>
          )}

          {/* Branch Selector Dropdown / Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
              Pickup Store Branch *
            </label>
            <select
              value={selectedStoreId || ""}
              onChange={(e) => setSelectedStoreId(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-2xl border border-[#6b1d1d]/20 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#c45c26]"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.address}, {s.city} {s.distanceKm ? `(${s.distanceKm} km away)` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Store Information Card */}
          {selectedStore && (
            <div className="rounded-xl border border-[#6b1d1d]/15 bg-white p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#6b1d1d] text-sm">{selectedStore.name}</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200 text-[10px]">
                  Prep: ~{selectedStore.prepTimeMinutes || 30} mins
                </span>
              </div>
              <p className="text-[#2a1a12]/80">{selectedStore.address}, {selectedStore.city} - {selectedStore.pincode}</p>
              <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-[#2a1a12]/60">
                <span>🕒 Hours: {selectedStore.hours || `${selectedStore.openingTime || "08:00"} - ${selectedStore.closingTime || "22:00"}`}</span>
                <span>📞 {selectedStore.phone}</span>
              </div>
              {selectedStore.latitude && selectedStore.longitude && (
                <div className="pt-1.5 border-t border-[#6b1d1d]/10 flex gap-3 text-[11px]">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.latitude},${selectedStore.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#c45c26] hover:underline inline-flex items-center gap-1"
                  >
                    <span>🗺️</span> Get Directions
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedStore.latitude},${selectedStore.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2a1a12]/70 hover:underline"
                  >
                    View on Map
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Date & Slot Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
                Pickup Date *
              </label>
              <select
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#6b1d1d]/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#c45c26]"
              >
                {upcomingDates.map((d) => (
                  <option key={d.dateStr} value={d.dateStr}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
                Pickup Time Slot *
              </label>
              {loadingSlots ? (
                <div className="mt-1 flex items-center justify-center rounded-2xl border border-dashed border-[#6b1d1d]/20 bg-white py-2.5 text-xs text-[#2a1a12]/60">
                  Checking real-time branch slot capacity...
                </div>
              ) : isHoliday ? (
                <div className="mt-1 rounded-2xl bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-700">
                  {holidayMessage || "Store is closed on this date (Holiday)"}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="mt-1 rounded-2xl bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">
                  No pickup slots available for this date.
                </div>
              ) : (
                <select
                  value={pickupSlot}
                  onChange={(e) => setPickupSlot(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[#6b1d1d]/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#c45c26]"
                >
                  {availableSlots.map((s) => (
                    <option
                      key={s.slot}
                      value={s.slot}
                      disabled={!s.isAvailable}
                    >
                      {s.slot} {s.isAvailable ? `(${s.remainingCapacity} slots left)` : `(Full / Unavailable)`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Preparation & Pickup Assurance */}
          {pickupSlot && !isHoliday && (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-[#2a1a12]/80 flex items-start gap-2">
              <span className="text-base">⏳</span>
              <div>
                <p className="font-semibold text-[#6b1d1d]">
                  Fresh Preparation Timeline
                </p>
                <p className="text-[11px] text-[#2a1a12]/70">
                  Your sweets will be handcrafted ~{selectedStore?.prepTimeMinutes || 30} mins prior to collection.
                  Upon placing the order, you will receive a 6-digit Pickup OTP to present at the counter.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Recipient Contact Info */}
      <div className="space-y-4">
        <div className="border-b border-[#6b1d1d]/10 pb-1.5">
          <h4 className="text-sm font-bold text-[#6b1d1d]">
            {fulfillmentType === "pickup" ? "Customer Contact Information" : "Delivery Address & Contact"}
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
              Full Name *
            </label>
            <input
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("fullName");
              }}
              placeholder="e.g. Pratik Patel"
              className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
                fieldErrors.fullName
                  ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                  : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
              }`}
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.fullName}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
              Mobile Phone (10 digits) *
            </label>
            <div className="relative mt-1 flex items-center">
              <span className="absolute left-3 font-mono text-xs font-bold text-[#2a1a12]/50">+91</span>
              <input
                name="phone"
                maxLength={10}
                value={phone.replace(/^(?:\+91|91|0)/, "")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setPhone(digits);
                  clearFieldError("phone");
                }}
                placeholder="9876543210"
                className={`w-full rounded-2xl border bg-white pl-12 pr-3.5 py-2.5 text-sm font-mono outline-none transition ${
                  fieldErrors.phone
                    ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                    : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
                }`}
              />
            </div>
            {fieldErrors.phone && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Home Delivery Address Fields (Only when Home Delivery is selected) */}
      {fulfillmentType === "delivery" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
              Delivery Address (House, street, landmark) *
            </label>
            <input
              name="line1"
              value={line1}
              onChange={(e) => {
                setLine1(e.target.value);
                clearFieldError("line1");
              }}
              placeholder="e.g. 14, Heritage Enclave, Near Mandvi Gate, Mandvi"
              className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
                fieldErrors.line1
                  ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                  : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
              }`}
            />
            {fieldErrors.line1 && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.line1}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
                City *
              </label>
              <input
                name="city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  clearFieldError("city");
                }}
                placeholder="Vadodara"
                className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
                  fieldErrors.city
                    ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                    : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.city && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
                State *
              </label>
              <select
                name="state"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  clearFieldError("state");
                }}
                className="mt-1 w-full rounded-2xl border border-[#6b1d1d]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#c45c26]"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
                Pincode (6 digits) *
              </label>
              <input
                name="pincode"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setPincode(digits);
                  clearFieldError("pincode");
                }}
                placeholder="390001"
                className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm font-mono outline-none transition ${
                  fieldErrors.pincode
                    ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                    : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.pincode}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
              Delivery Slot *
            </label>
            <select
              name="deliverySlot"
              value={deliverySlot}
              onChange={(e) => setDeliverySlot(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#6b1d1d]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#c45c26]"
            >
              {DELIVERY_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 5. Payment Method */}
      <fieldset className="rounded-2xl border border-[#6b1d1d]/10 p-4 text-sm bg-white">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-[#6b1d1d]">
          Payment Method
        </legend>
        <div className="mt-2 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="accent-[#c45c26]"
            />
            <span>
              {fulfillmentType === "pickup"
                ? "Pay at Store Counter (Cash / Card / UPI upon collection)"
                : "Cash on Delivery (COD)"}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-[#2a1a12]/80">
            <input
              type="radio"
              name="paymentMethod"
              value="upi"
              checked={paymentMethod === "upi"}
              onChange={() => setPaymentMethod("upi")}
              className="accent-[#c45c26]"
            />
            <span>Instant UPI (GPay / PhonePe / Paytm QR)</span>
          </label>
        </div>
      </fieldset>

      {/* Error Banner */}
      {globalError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{globalError}</span>
        </div>
      )}

      {/* Submit Action */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-full py-4 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition"
      >
        {loading
          ? "Sending Verification OTP..."
          : fulfillmentType === "pickup"
          ? "Confirm Store Pickup Order"
          : "Confirm & Place Fresh Order"}
      </button>
    </form>

    {/* 6. Customer Mobile OTP Verification Modal */}
    {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#faf8f5] p-6 sm:p-8 shadow-2xl border border-[#d4af37]/40 relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowOtpModal(false);
                setOrderOtp("");
                setOrderOtpError("");
              }}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-slate-200/80 text-slate-700 hover:bg-slate-300 flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="text-3xl">📱</span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d]">
                Confirm Your Order
              </h3>
              <p className="text-xs text-[#2a1a12]/70 mt-1">
                Enter the 6-digit verification code sent to
              </p>
              <p className="font-bold text-[#6b1d1d] text-sm mt-0.5">
                +91 {phone.replace(/^(?:\+91|91|0)/, "").replace(/\D/g, "")}
              </p>
            </div>

            {/* Order Snapshot Pill */}
            <div className="mt-4 rounded-2xl bg-white p-3.5 border border-[#6b1d1d]/10 text-xs space-y-1.5 shadow-2xs">
              <div className="flex justify-between text-[#2a1a12]/80">
                <span className="text-[#2a1a12]/60">Recipient:</span>
                <span className="font-semibold text-[#6b1d1d]">{name}</span>
              </div>
              <div className="flex justify-between text-[#2a1a12]/80">
                <span className="text-[#2a1a12]/60">Fulfillment:</span>
                <span className="font-semibold text-right">
                  {fulfillmentType === "pickup"
                    ? `🏪 Store Pickup (${selectedStore?.name || "Store"})`
                    : `🚚 Home Delivery`}
                </span>
              </div>
              {fulfillmentType === "pickup" && (
                <div className="flex justify-between text-[#2a1a12]/80">
                  <span className="text-[#2a1a12]/60">Scheduled Slot:</span>
                  <span className="font-medium text-emerald-800">{pickupDate} ({pickupSlot})</span>
                </div>
              )}
              <div className="flex justify-between text-[#2a1a12]/80">
                <span className="text-[#2a1a12]/60">Payment Method:</span>
                <span className="font-bold text-[#c45c26] uppercase">
                  {paymentMethod === "cod"
                    ? fulfillmentType === "pickup" ? "Pay at Store" : "Cash on Delivery"
                    : "UPI Payment"}
                </span>
              </div>
            </div>

            {/* Dev Mode Simulation Badge */}
            {orderDevOtp && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs text-amber-900">
                <span className="font-bold">🧪 Test Simulation OTP:</span>{" "}
                <code className="rounded bg-amber-200 px-2 py-0.5 font-mono font-bold tracking-widest text-amber-950">
                  {orderDevOtp}
                </code>
              </div>
            )}

            {/* Error Message */}
            {orderOtpError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center text-xs text-rose-700">
                {orderOtpError}
              </div>
            )}

            {/* OTP Input Container */}
            <div className="mt-4 space-y-4">
              <div>
                <input
                  type="text"
                  value={orderOtp}
                  onChange={(e) => setOrderOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmOrderWithOtp();
                    }
                  }}
                  placeholder="• • • • • •"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-2xl border border-[#6b1d1d]/20 px-3 py-3 bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
                />
                <p className="text-[11px] text-[#2a1a12]/50 text-center mt-1">
                  Valid for 5 minutes
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setOrderOtp("");
                    setOrderOtpError("");
                  }}
                  className="w-1/3 rounded-full border border-[#6b1d1d]/20 bg-white py-3 text-xs font-semibold text-[#2a1a12]/70 hover:bg-slate-50 transition cursor-pointer"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmOrderWithOtp()}
                  disabled={orderSubmitting || orderOtp.length < 4}
                  className="btn-primary w-2/3 rounded-full py-3 text-xs font-bold shadow-md disabled:opacity-50 transition cursor-pointer"
                >
                  {orderSubmitting ? "Verifying..." : "Verify & Confirm Order 🎉"}
                </button>
              </div>

              {/* Resend Actions */}
              <div className="pt-1 flex flex-col gap-1.5 text-center text-xs">
                {orderResendTimer > 0 ? (
                  <span className="text-[#2a1a12]/60 text-[11px]">
                    Resend SMS OTP in <strong className="text-[#6b1d1d]">{orderResendTimer}s</strong>
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={resendOrderOtp}
                      className="font-semibold text-[#c45c26] hover:underline"
                    >
                      Resend SMS
                    </button>
                    <span className="text-[#2a1a12]/20">|</span>
                    <button
                      type="button"
                      onClick={resendOrderWhatsApp}
                      disabled={resendingOrderWhatsapp}
                      className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>💬</span> {resendingOrderWhatsapp ? "Sending..." : "Resend via WhatsApp"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
