"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  time?: string | null;
  completed: boolean;
  current: boolean;
  media?: any[];
}

interface OrderItem {
  id: number;
  productName: string;
  variantWeight: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

interface PickupDetails {
  storeId: number;
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storePincode: string;
  storePhone: string;
  storeHours: string;
  pickupDate?: string | null;
  pickupSlot?: string | null;
  estimatedReadyAt?: string | null;
  actualReadyAt?: string | null;
  pickupOtp?: string | null;
  pickupVerifiedBy?: string | null;
  googleMapsUrl?: string;
  directionsUrl?: string;
  instructions?: string[];
  latitude?: string;
  longitude?: string;
}

interface OrderTrackingData {
  id: number;
  orderNumber: string;
  status: string;
  fulfillmentType?: "pickup" | "delivery";
  isCancelled: boolean;
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  expectedDeliveryDate?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  kitchenCamToken?: string | null;
  kitchenCamUrl?: string | null;
  pickupDetails?: PickupDetails | null;
  courier?: {
    name?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  };
  recipient: {
    name: string;
    phone: string;
    city: string;
    state: string;
    pincode: string;
    addressDisplay: string;
  };
  timeline: TimelineStep[];
  currentStepIndex: number;
  items: OrderItem[];
}

export function formatAddressString(raw?: any): string {
  if (!raw) return "Kalol, Gujarat";
  let target = raw;

  // Unwrap any JSON string layers
  for (let i = 0; i < 4; i++) {
    if (typeof target === "string") {
      const trimmed = target.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          target = JSON.parse(trimmed);
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (target && typeof target === "object") {
    const rawLine = (target.line1 || target.address || target.street || target.addressLine1 || "").trim();
    const line1 = rawLine.replace(/,\s*/g, ", ").trim();
    const line2 = (target.line2 || target.addressLine2 || "").trim();
    const landmark = target.landmark ? `Near ${target.landmark}` : "";
    const city = (target.city || "").trim();
    const state = (target.state || "").trim();
    const pincode = (target.pincode || "").trim();

    const parts = [line1, line2, landmark, city, state].filter(Boolean);
    if (parts.length > 0) {
      return pincode ? `${parts.join(", ")} - ${pincode}` : parts.join(", ");
    }
    return target.fullAddress || target.summary || "Kalol, Gujarat";
  }

  const s = String(raw).trim();
  // If string contains raw JSON tokens like {"name":...}, extract cleanly
  if (s.includes("{")) {
    try {
      const lineMatch = s.match(/"(?:line1|address|street)"\s*:\s*"([^"]+)"/);
      const cityMatch = s.match(/"city"\s*:\s*"([^"]+)"/);
      const stateMatch = s.match(/"state"\s*:\s*"([^"]+)"/);
      const pinMatch = s.match(/"pincode"\s*:\s*"([^"]+)"/);
      const parts = [lineMatch?.[1]?.replace(/,\s*/g, ", "), cityMatch?.[1], stateMatch?.[1]].filter(Boolean);
      if (parts.length > 0) {
        return pinMatch?.[1] ? `${parts.join(", ")} - ${pinMatch[1]}` : parts.join(", ");
      }
    } catch {}
  }

  return (s.startsWith("{") || s.includes('"line1"')) ? "Kalol, Gujarat" : s;
}

export function OrderTrackerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderInput, setOrderInput] = useState("");
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [locatingUserRoute, setLocatingUserRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState("");

  const initialOrderId = searchParams.get("orderId") || searchParams.get("id") || "";

  const fetchTracking = async (idToTrack: string) => {
    const clean = idToTrack.trim().replace(/^#/, "");
    if (!clean) {
      setErrorMsg("Please enter an Order ID or Order Number.");
      setOrderData(null);
      return;
    }

    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/orders/track?orderId=${encodeURIComponent(clean)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setErrorMsg(json.error || `Unable to locate order #${clean}.`);
          setOrderData(null);
        } else {
          setOrderData(json.order);
          setErrorMsg(null);
        }
      } catch (err: any) {
        setErrorMsg("Network error connecting to order tracking service. Please try again.");
        setOrderData(null);
      }
    });
  };

  useEffect(() => {
    if (initialOrderId) {
      setOrderInput(initialOrderId);
      fetchTracking(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderInput.trim()) return;
    router.replace(`/track?orderId=${encodeURIComponent(orderInput.trim())}`, { scroll: false });
    fetchTracking(orderInput);
  };

  const handleSampleClick = (sampleId: string) => {
    setOrderInput(sampleId);
    router.replace(`/track?orderId=${encodeURIComponent(sampleId)}`, { scroll: false });
    fetchTracking(sampleId);
  };

  const copyOtp = () => {
    if (orderData?.pickupDetails?.pickupOtp) {
      navigator.clipboard.writeText(orderData.pickupDetails.pickupOtp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  };

  const routeFromCurrentLocation = () => {
    if (!orderData?.pickupDetails) return;
    const dest = orderData.pickupDetails.latitude && orderData.pickupDetails.longitude
      ? `${orderData.pickupDetails.latitude},${orderData.pickupDetails.longitude}`
      : encodeURIComponent(`${orderData.pickupDetails.storeName} ${orderData.pickupDetails.storeAddress} ${orderData.pickupDetails.storeCity}`);

    if (typeof window === "undefined" || !navigator.geolocation) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
      return;
    }

    setLocatingUserRoute(true);
    setRouteMsg("Requesting your location for route calculation...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUserRoute(false);
        setRouteMsg("");
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`,
          "_blank"
        );
      },
      (err) => {
        setLocatingUserRoute(false);
        setRouteMsg("Location access denied or unavailable. Opening directions using store address.");
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
      },
      { timeout: 8000 }
    );
  };

  const getStatusColor = (status: string, isCancelled: boolean) => {
    if (isCancelled) return "bg-rose-100 text-rose-800 border-rose-300";
    switch (status.toLowerCase()) {
      case "picked_up":
      case "delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "ready_for_pickup":
        return "bg-emerald-100 text-emerald-900 border-emerald-400 font-bold ring-2 ring-emerald-300";
      case "shipped":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "processing":
      case "packed":
      case "preparing":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300";
    }
  };

  const getStatusLabel = (status: string, isCancelled: boolean, isPickup?: boolean) => {
    if (isCancelled) return "Order Cancelled";
    switch (status.toLowerCase()) {
      case "picked_up":
        return "Picked Up from Counter ✓";
      case "ready_for_pickup":
        return "Ready for Pickup at Counter 🛍️";
      case "delivered":
        return "Delivered to Doorstep ✓";
      case "shipped":
        return "Out for Delivery / In Transit";
      case "processing":
      case "packed":
        return isPickup ? "Crafted & Boxed" : "Crafted & Sealed";
      case "preparing":
        return "Fresh Handcrafted Prep in Progress";
      case "confirmed":
        return isPickup ? "Pickup Order Confirmed" : "Order Confirmed";
      default:
        return "Order Placed";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Search Box */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2f8a] via-[#09256e] to-[#06184a] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#dfb755]/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dfb755]/20 px-3 py-1 border border-[#dfb755]/30 text-[11px] font-bold uppercase tracking-wider text-[#dfb755]">
            <span>🚚</span>
            <span>Live Dispatch Tracker · ઓર્ડર ટ્રેકિંગ</span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Track Your Mithai Box
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed">
            Enter your Order ID (from SMS or receipt) to see live kitchen crafting, packing seals, and express doorstep delivery updates.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="pt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={orderInput}
                  onChange={(e) => setOrderInput(e.target.value)}
                  placeholder="Enter Order Number or ID (e.g. VSM-20261016-1A17B69D or 3)"
                  enterKeyHint="search"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 pl-11 pr-10 py-3.5 text-sm sm:text-base text-white placeholder-white/50 backdrop-blur-md outline-none focus:border-[#dfb755] focus:bg-white/20 focus:ring-2 focus:ring-[#dfb755]/30 transition"
                />
                {orderInput && (
                  <button
                    type="button"
                    onClick={() => setOrderInput("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white"
                    aria-label="Clear order search input"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending || !orderInput.trim()}
                className="rounded-2xl bg-gradient-to-r from-[#dfb755] to-[#c99f3b] px-6 py-3.5 font-bold text-[#0b2f8a] text-sm shadow-md hover:brightness-105 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0b2f8a] border-t-transparent" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <span>Trace Order</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-white/70">
            <span className="font-semibold text-white/90">Quick samples:</span>
            <button
              type="button"
              onClick={() => handleSampleClick("VSM-20261016-1A17B69D")}
              className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-mono border border-white/10 transition text-[#dfb755] cursor-pointer"
            >
              #VSM-20261016-1A17B69D
            </button>
            <button
              type="button"
              onClick={() => handleSampleClick("3")}
              className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-mono border border-white/10 transition text-[#dfb755] cursor-pointer"
            >
              Order #3
            </button>
            <button
              type="button"
              onClick={() => handleSampleClick("VSM-2026-00101")}
              className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-mono border border-white/10 transition text-[#dfb755] cursor-pointer"
            >
              #VSM-2026-00101
            </button>
          </div>
        </div>
      </section>

      {/* 2. Error State */}
      {errorMsg && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-6 text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-200 text-rose-800 text-lg">
            ⚠️
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Order Not Located</h3>
            <p className="text-xs sm:text-sm text-rose-700">{errorMsg}</p>
            <p className="text-xs text-rose-600 pt-1">
              Need assistance? Call our Mandvi counter support at{" "}
              <a href="tel:+919825019760" className="font-bold underline">
                +91 98250 19760
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* 3. Order Tracking Result Display */}
      {orderData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Status Header Card */}
          <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-mono text-xl sm:text-2xl font-black text-[#0b2f8a]">
                    {orderData.orderNumber}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${getStatusColor(
                      orderData.status,
                      orderData.isCancelled
                    )}`}
                  >
                    {getStatusLabel(
                      orderData.status,
                      orderData.isCancelled,
                      orderData.fulfillmentType === "pickup" || Boolean(orderData.pickupDetails)
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Placed on{" "}
                  {new Date(orderData.createdAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end text-left sm:text-right">
                <div className="mr-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Box Value</p>
                  <p className="text-xl sm:text-2xl font-black text-[#6b1d1d] font-sans">
                    {formatInr(orderData.total)}
                  </p>
                </div>
                {orderData.kitchenCamUrl ? (
                  <Link
                    href={orderData.kitchenCamUrl}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#dfb755] to-[#c89d38] px-3.5 py-2 text-xs font-bold text-[#071c54] shadow-sm hover:brightness-105 active:scale-95 transition"
                  >
                    <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                    <span>🎥 Live Kitchen Cam</span>
                  </Link>
                ) : null}
                <Link
                  href={`/orders/${orderData.orderNumber}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-[#0b2f8a] transition"
                >
                  View Invoice →
                </Link>
              </div>
            </div>

            {/* Live Progress Bar Stepper */}
            <div className="pt-8 pb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#c45c26] mb-6 flex items-center gap-2">
                <span>📍</span>
                <span>Live Crafting & Delivery Stages</span>
              </h3>

              {/* Responsive Stepper Container */}
              <div className="relative">
                {/* Horizontal Desktop View */}
                <div className="hidden md:grid grid-cols-5 gap-2 relative">
                  {/* Connecting track line behind circles from column 1 center (10%) to column 5 center (90%) */}
                  <div className="absolute top-[22px] -translate-y-1/2 left-[10%] right-[10%] h-1 bg-slate-200 z-0 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-[#dfb755] to-emerald-500 transition-all duration-700 rounded-full"
                      style={{
                        width: orderData.isCancelled
                          ? "100%"
                          : `${Math.min(100, Math.max(0, (orderData.currentStepIndex / (orderData.timeline.length - 1 || 4)) * 100))}%`,
                      }}
                    />
                  </div>

                  {orderData.timeline.map((step, idx) => {
                    const isDone = step.completed;
                    const isCurr = step.current;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center relative z-10 px-1">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full font-bold text-sm transition-all duration-300 shadow-sm ${
                            orderData.isCancelled
                              ? idx === 1
                                ? "bg-rose-600 text-white ring-4 ring-rose-200"
                                : "bg-emerald-600 text-white"
                              : isCurr
                              ? "bg-[#0b2f8a] text-white ring-4 ring-[#dfb755]/50 scale-110"
                              : isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {orderData.isCancelled ? (
                            idx === 1 ? "✕" : "✓"
                          ) : isDone && !isCurr ? (
                            "✓"
                          ) : (
                            idx + 1
                          )}
                        </div>

                        <p
                          className={`mt-3 text-xs font-bold leading-tight ${
                            isCurr ? "text-[#0b2f8a]" : isDone ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {step.title}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {step.description}
                        </p>

                        {step.time && (
                          <span
                            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isCurr
                                ? "bg-[#dfb755]/20 text-[#8d6715] font-bold"
                                : isDone
                                ? "bg-slate-100 text-slate-600"
                                : "text-slate-400"
                            }`}
                          >
                            {step.time}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Mobile View */}
                <div className="md:hidden space-y-6 relative border-l-2 border-slate-200 pl-6 ml-4">
                  {orderData.timeline.map((step, idx) => {
                    const isDone = step.completed;
                    const isCurr = step.current;

                    return (
                      <div key={step.key} className="relative">
                        {/* Circle Bullet on line */}
                        <div
                          className={`absolute -left-[35px] top-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-xs ${
                            orderData.isCancelled
                              ? idx === 1
                                ? "bg-rose-600 text-white ring-2 ring-rose-200"
                                : "bg-emerald-600 text-white"
                              : isCurr
                              ? "bg-[#0b2f8a] text-white ring-4 ring-[#dfb755]/40"
                              : isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {orderData.isCancelled ? (
                            idx === 1 ? "✕" : "✓"
                          ) : isDone && !isCurr ? (
                            "✓"
                          ) : (
                            idx + 1
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className={`text-sm font-bold ${
                                isCurr ? "text-[#0b2f8a]" : isDone ? "text-slate-900" : "text-slate-400"
                              }`}
                            >
                              {step.title}
                            </h4>
                            {step.time && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  isCurr
                                    ? "bg-[#dfb755]/20 text-[#8d6715] font-bold"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {step.time}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-normal">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Kitchen Cam & Preparation Updates Section */}
          <div className="rounded-3xl border border-[#dfb755]/40 bg-gradient-to-br from-[#faf8f5] via-white to-[#f7f2e7] p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-900/10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#6b1d1d]">
                  Live Kitchen Cam & Preparation Stream
                </h3>
              </div>
              {orderData.kitchenCamUrl ? (
                <Link
                  href={orderData.kitchenCamUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#dfb755] to-[#c89d38] px-4 py-2 text-xs font-black text-[#071c54] shadow-md hover:brightness-105 active:scale-95 transition w-fit"
                >
                  <span>🎥</span>
                  <span>Watch Order Prepared Live →</span>
                </Link>
              ) : null}
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Every mithai batch is hand-simmered with 100% Shuddh Desi Ghee in our Kalol kitchen. Follow live preparation milestones, halwai photos, and aroma-lock packaging seals.
            </p>

            {/* Media Gallery / Stage Updates */}
            {orderData.timeline.some((s) => s.media && s.media.length > 0) ? (
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {orderData.timeline.flatMap((s) => (s.media || []).map((m: any) => (
                  <div key={m.id} className="group relative rounded-2xl overflow-hidden border border-amber-900/10 bg-white shadow-2xs hover:shadow-md transition">
                    <div className="relative h-28 sm:h-36 w-full">
                      <Image src={m.fileUrl} alt={m.caption || s.title} fill className="object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                    <div className="p-2 bg-white/95 text-[11px]">
                      <span className="font-bold text-[#6b1d1d] block truncate">{s.title}</span>
                      <span className="text-[10px] text-stone-500 block truncate">{m.caption || s.title}</span>
                    </div>
                  </div>
                )))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 text-xl">
                    🍲
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#6b1d1d]">
                      {orderData.status === "preparing"
                        ? "Kitchen Karahi is Active — Fresh Mithai Rolling in Desi Ghee"
                        : orderData.status === "packed"
                        ? "Quality Seal Applied — Your Sweets Box is Packed"
                        : "Order Received — Halwais Prepping Batch"}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Our kitchen staff captures photos as each batch is simmered, tested, and sealed.
                    </p>
                  </div>
                </div>
                {orderData.kitchenCamUrl ? (
                  <Link
                    href={orderData.kitchenCamUrl}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 px-4 py-2 text-xs font-bold text-[#0b2f8a] shadow-2xs transition shrink-0"
                  >
                    <span>View Live Stream</span>
                    <span>↗</span>
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          {/* Dispatch, Courier & Destination Grid OR Your Pickup Details */}
          {orderData.pickupDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Branch & Navigation Card */}
              <div className="rounded-3xl border border-[#c45c26]/20 bg-gradient-to-br from-[#faf8f5] to-[#f5eedb]/60 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#6b1d1d]/10 pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#6b1d1d] flex items-center gap-2">
                    <span>🏪</span>
                    <span>Your Pickup Details</span>
                  </h3>
                  <span className="rounded-full bg-[#c45c26]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#c45c26] border border-[#c45c26]/20">
                    Store Collection
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#2a1a12]/60 text-[11px] block">Branch Outlet</span>
                    <p className="font-bold text-sm text-[#6b1d1d]">{orderData.pickupDetails.storeName}</p>
                    <p className="text-slate-700 mt-0.5 leading-snug">
                      {orderData.pickupDetails.storeAddress}, {orderData.pickupDetails.storeCity} - {orderData.pickupDetails.storePincode}
                    </p>
                  </div>

                  <div className="flex justify-between py-1.5 border-t border-b border-[#6b1d1d]/10">
                    <span className="text-slate-500">Operating Hours</span>
                    <span className="font-semibold text-slate-800">{orderData.pickupDetails.storeHours}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-[#6b1d1d]/10">
                    <span className="text-slate-500">Store Contact</span>
                    <a
                      href={`tel:${orderData.pickupDetails.storePhone}`}
                      className="font-bold text-[#c45c26] hover:underline"
                    >
                      {orderData.pickupDetails.storePhone}
                    </a>
                  </div>
                </div>

                {/* Google Maps Actions */}
                <div className="pt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {orderData.pickupDetails.directionsUrl && (
                      <a
                        href={orderData.pickupDetails.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 flex-1 rounded-2xl bg-[#c45c26] text-white py-2.5 px-4 text-xs font-bold hover:bg-[#a64c1e] transition shadow-xs text-center"
                      >
                        <span>🗺️</span>
                        <span>Get Directions</span>
                      </a>
                    )}
                    {orderData.pickupDetails.googleMapsUrl && (
                      <a
                        href={orderData.pickupDetails.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 rounded-2xl bg-white text-[#6b1d1d] border border-[#6b1d1d]/20 py-2.5 px-3.5 text-xs font-semibold hover:bg-slate-50 transition"
                      >
                        <span>View on Map</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={routeFromCurrentLocation}
                    disabled={locatingUserRoute}
                    className="w-full text-center text-[11px] font-semibold text-[#0b2f8a] hover:underline py-1 disabled:opacity-50"
                  >
                    {locatingUserRoute
                      ? "📍 Requesting location..."
                      : "📍 Calculate route from my current location"}
                  </button>
                  {routeMsg && (
                    <p className="text-[11px] text-[#c45c26] text-center font-medium">{routeMsg}</p>
                  )}
                </div>
              </div>

              {/* Pickup Schedule & OTP Card */}
              <div className="rounded-3xl border border-[#dfb755]/40 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#6b1d1d] flex items-center gap-2">
                    <span>🔑</span>
                    <span>Counter Pickup Verification</span>
                  </h3>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                    Show at Counter
                  </span>
                </div>

                {/* 6-Digit OTP Container */}
                {orderData.pickupDetails.pickupOtp ? (
                  <div className="rounded-2xl border-2 border-dashed border-[#dfb755] bg-[#faf8f5] p-3 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2a1a12]/60 block">
                      6-Digit Pickup Verification OTP
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-mono text-2xl font-black text-[#6b1d1d] tracking-widest">
                        {orderData.pickupDetails.pickupOtp}
                      </span>
                      <button
                        type="button"
                        onClick={copyOtp}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#c45c26] border border-[#c45c26]/30 hover:bg-[#c45c26]/10 transition cursor-pointer shadow-2xs"
                      >
                        {copiedOtp ? "✓ Copied" : "Copy OTP"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Pickup Date</span>
                    <span className="font-semibold text-slate-800">
                      {orderData.pickupDetails.pickupDate || "Today"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Pickup Window</span>
                    <span className="font-semibold text-[#6b1d1d]">
                      {orderData.pickupDetails.pickupSlot || orderData.deliverySlot}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Estimated Ready Time</span>
                    <span className="font-semibold text-[#c45c26]">
                      {orderData.pickupDetails.actualReadyAt
                        ? `Ready (${new Date(orderData.pickupDetails.actualReadyAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`
                        : orderData.pickupDetails.estimatedReadyAt || "As scheduled"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Payment Status</span>
                    <span className="font-semibold capitalize text-slate-800">
                      {orderData.paymentMethod.toUpperCase()} ({orderData.paymentStatus})
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Pickup Instructions
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                    {orderData.pickupDetails.instructions?.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    )) || (
                      <>
                        <li>Show your 6-digit OTP or Order Number at the express counter.</li>
                        <li>Inspect sweet boxes seal before leaving the branch.</li>
                        <li>Pay via UPI, Cash, or Card at counter if not prepaid.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Courier & Dispatch Card */}
              <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#0b2f8a] flex items-center gap-2">
                    <span>🚚</span>
                    <span>Dispatch & Logistics</span>
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {orderData.deliverySlot}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Delivery Partner</span>
                    <span className="font-semibold text-slate-800">
                      {orderData.courier?.name || "Kalol Express Store Fleet"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Waybill / Tracking No.</span>
                    <span className="font-mono font-bold text-[#0b2f8a]">
                      {orderData.courier?.trackingNumber || `VSM-${orderData.id}-EXP`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Payment Status</span>
                    <span className="font-semibold capitalize text-slate-800">
                      {orderData.paymentMethod.toUpperCase()} ({orderData.paymentStatus})
                    </span>
                  </div>
                </div>

                {orderData.courier?.trackingUrl && (
                  <a
                    href={orderData.courier.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded-2xl bg-[#0b2f8a] text-white py-2.5 text-xs font-bold hover:bg-[#071c54] transition shadow-xs"
                  >
                    <span>Open Courier Partner Tracking Portal</span>
                    <span>↗</span>
                  </a>
                )}
              </div>

              {/* Delivery Destination Card */}
              <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#0b2f8a] flex items-center gap-2">
                  <span>📍</span>
                  <span>Delivery Destination</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Recipient</span>
                    <span className="font-semibold text-slate-800">{orderData.recipient.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-mono text-slate-800">{orderData.recipient.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">City / State</span>
                    <span className="font-semibold text-slate-800">
                      {orderData.recipient.city}, {orderData.recipient.state} {orderData.recipient.pincode}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block text-[11px]">Address Summary</span>
                    <p className="font-medium text-slate-700 mt-0.5 leading-snug">
                      {formatAddressString(orderData.recipient.addressDisplay)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sweet Box Items Breakdown */}
          <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#6b1d1d] flex items-center gap-2">
                <span>🍬</span>
                <span>Mithai & Farsan in this Box ({orderData.items.length})</span>
              </h3>
              <span className="text-xs text-slate-500">Packed fresh in Kalol</span>
            </div>

            <div className="divide-y divide-slate-100">
              {orderData.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3.5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-[#faf8f5]">
                    <Image
                      src={item.imageUrl || "/images/motichoor-showcase.jpg"}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{item.productName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Net Weight: <span className="font-semibold text-slate-700">{item.variantWeight}</span> × {item.quantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-sm text-[#0b2f8a]">
                      {formatInr(item.unitPrice * item.quantity)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      ({formatInr(item.unitPrice)} ea)
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown Footer */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-col items-end gap-1 text-xs">
              <div className="flex justify-between w-full sm:w-64 text-slate-500">
                <span>Subtotal</span>
                <span>{formatInr(orderData.subtotal)}</span>
              </div>
              {orderData.discount > 0 && (
                <div className="flex justify-between w-full sm:w-64 text-emerald-600 font-medium">
                  <span>Festive Discount</span>
                  <span>- {formatInr(orderData.discount)}</span>
                </div>
              )}
              <div className="flex justify-between w-full sm:w-64 text-slate-500">
                <span>Delivery Fee</span>
                <span>{orderData.deliveryFee === 0 ? "FREE" : formatInr(orderData.deliveryFee)}</span>
              </div>
              <div className="flex justify-between w-full sm:w-64 pt-2 border-t border-slate-200 text-base font-black text-[#6b1d1d]">
                <span>Total Amount</span>
                <span>{formatInr(orderData.total)}</span>
              </div>
            </div>
          </div>

          {/* Need Help / Customer Support Desk Contact */}
          <div className="rounded-3xl border border-[#dfb755]/40 bg-gradient-to-r from-[#dfb755]/15 via-white to-[#dfb755]/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#0b2f8a] text-[#dfb755] flex items-center justify-center font-bold text-lg shrink-0">
                ☎️
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0b2f8a]">Need help with this delivery?</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Our Mandvi Flagship counter team is available 7:00 AM – 8:30 PM (All 7 Days).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="tel:+919825019760"
                className="rounded-xl bg-[#0b2f8a] text-white px-4 py-2 text-xs font-bold hover:bg-[#071c54] transition shadow-xs flex items-center gap-1.5"
              >
                <span>📞 Call Store</span>
              </a>
              <a
                href={`https://wa.me/919825019760?text=${encodeURIComponent(
                  `Namaste Vardayini Sweets, I am inquiring about my Order #${orderData.orderNumber}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
              >
                <span>💬 WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
