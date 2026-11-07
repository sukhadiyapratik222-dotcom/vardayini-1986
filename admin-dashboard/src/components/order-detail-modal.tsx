"use client";

import { useEffect, useState } from "react";
import {
  api,
  formatAddressSnapshot,
  FullOrderDetail,
  OrderItem,
  OrderStatusHistoryItem,
  UpdateOrderTrackingPayload,
} from "@/lib/api";
import { toast } from "@/lib/toast";

interface OrderDetailModalProps {
  orderNumber: string;
  initialOrder?: OrderItem | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: "⏳",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: "✓",
  },
  preparing: {
    label: "Kitchen Preparing",
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    icon: "👨‍🍳",
  },
  packed: {
    label: "Packed & Ready",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: "📦",
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-400",
    icon: "🛍️",
  },
  shipped: {
    label: "Out for Delivery",
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    border: "border-cyan-200",
    icon: "🚚",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: "🎉",
  },
  picked_up: {
    label: "Picked Up",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-300",
    icon: "🤝",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: "🛑",
  },
};

const COURIER_PRESETS = [
  { name: "Delhivery", urlPrefix: "https://www.delhivery.com/track/package/" },
  { name: "Blue Dart", urlPrefix: "https://www.bluedart.com/tracking?trackNumber=" },
  { name: "DTDC", urlPrefix: "https://www.dtdc.in/tracking.asp?tracking_no=" },
  { name: "Shadowfax", urlPrefix: "https://tracker.shadowfax.in/#/track/" },
  { name: "Dunzo Express", urlPrefix: "" },
  { name: "Vrdayini Direct Express", urlPrefix: "" },
  { name: "Other Courier", urlPrefix: "" },
];

export function OrderDetailModal({
  orderNumber,
  initialOrder,
  onClose,
  onUpdated,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<FullOrderDetail | null>(
    initialOrder ? (initialOrder as FullOrderDetail) : null
  );
  const [loading, setLoading] = useState(!initialOrder);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Tracking Management Form
  const [targetStatus, setTargetStatus] = useState<string>(initialOrder?.status || "");
  const [statusNote, setStatusNote] = useState<string>("");

  // Courier Form
  const [courierName, setCourierName] = useState<string>(initialOrder?.courierName || "");
  const [trackingNumber, setTrackingNumber] = useState<string>(initialOrder?.trackingNumber || "");
  const [trackingUrl, setTrackingUrl] = useState<string>(initialOrder?.trackingUrl || "");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");

  // Pickup Counter Verification Form
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [counterStaffName, setCounterStaffName] = useState<string>("");

  // Quick Tracking Note Form
  const [customNote, setCustomNote] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<string>("");

  // Payment Status Form
  const [paymentStatus, setPaymentStatus] = useState<string>(initialOrder?.paymentStatus || "pending");
  const [paymentMethod, setPaymentMethod] = useState<string>(initialOrder?.paymentMethod || "upi");

  // Active Tab in Management Box
  const [activeManagerTab, setActiveManagerTab] = useState<
    "status" | "shipping" | "pickup" | "payment" | "notes"
  >("status");

  const loadOrder = async () => {
    try {
      if (!order) setLoading(true);
      const data = await api.getOrder(orderNumber);
      if (data) {
        setOrder((prev) => ({
          ...(prev || {}),
          ...data,
          items: data.items || prev?.items || [],
          history: data.history || prev?.history || [],
        }));

        // Populate local state
        setTargetStatus(data.status || "pending");
        if (data.courierName) setCourierName(data.courierName);
        if (data.trackingNumber) setTrackingNumber(data.trackingNumber);
        if (data.trackingUrl) setTrackingUrl(data.trackingUrl);
        if (data.paymentStatus) setPaymentStatus(data.paymentStatus);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);

        if (data.expectedDeliveryDate) {
          try {
            const d = new Date(data.expectedDeliveryDate);
            setExpectedDeliveryDate(d.toISOString().slice(0, 10));
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn("Failed to load full order tracking:", err);
      if (!order && !initialOrder) {
        toast.error(err.message || "Failed to load order details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder) {
      setTargetStatus(initialOrder.status || "pending");
      setPaymentStatus(initialOrder.paymentStatus || "pending");
      setPaymentMethod(initialOrder.paymentMethod || "upi");
    }
    loadOrder();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [orderNumber]);

  const copyToClipboard = (text: string, type: "id" | "otp" | "tracking") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === "otp") {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } else if (type === "tracking") {
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  // Courier Preset change helper
  const handleCourierChange = (name: string) => {
    setCourierName(name);
    const preset = COURIER_PRESETS.find((p) => p.name === name);
    if (preset && preset.urlPrefix && trackingNumber) {
      setTrackingUrl(`${preset.urlPrefix}${trackingNumber.trim()}`);
    }
  };

  const handleTrackingNumberChange = (awb: string) => {
    setTrackingNumber(awb);
    const preset = COURIER_PRESETS.find((p) => p.name === courierName);
    if (preset && preset.urlPrefix && awb.trim()) {
      setTrackingUrl(`${preset.urlPrefix}${awb.trim()}`);
    }
  };

  // Update Status Action
  const handleSaveStatus = async () => {
    if (!order) return;
    try {
      setIsPending(true);
      const updated = await api.updateOrderTracking(order.orderNumber, {
        status: targetStatus,
        expectedStatus: order.status,
        note: statusNote.trim() || undefined,
      });
      setOrder(updated);
      setStatusNote("");
      toast.success(`Order status updated to ${targetStatus.toUpperCase()}`);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status");
    } finally {
      setIsPending(false);
    }
  };

  // Update Shipping & Courier Action
  const handleSaveShipping = async () => {
    if (!order) return;
    try {
      setIsPending(true);
      const updated = await api.updateOrderTracking(order.orderNumber, {
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        note: trackingNumber
          ? `Dispatched via ${courierName || "Courier"} (AWB: ${trackingNumber})`
          : "Shipping details updated",
      });
      setOrder(updated);
      toast.success("Shipping & Courier tracking information saved!");
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save shipping info");
    } finally {
      setIsPending(false);
    }
  };

  // Verify Pickup Counter Action
  const handleVerifyPickup = async (overrideWithOrderNumber = false) => {
    if (!order) return;

    if (!overrideWithOrderNumber && order.pickupOtp) {
      if (!enteredOtp.trim()) {
        toast.error("Please enter the 6-digit customer pickup OTP.");
        return;
      }
      if (enteredOtp.trim() !== order.pickupOtp.trim()) {
        toast.error("Incorrect OTP. Please check the customer's order screen.");
        return;
      }
    }

    try {
      setIsPending(true);
      const staff = counterStaffName.trim() || "Store Counter Staff";
      const updated = await api.updateOrderTracking(order.orderNumber, {
        status: "picked_up",
        expectedStatus: order.status,
        verifyPickup: true,
        pickupVerifiedBy: staff,
        note: `Customer pickup verified by ${staff} (${
          overrideWithOrderNumber ? "Verified by Order ID" : "Verified via OTP"
        })`,
      });
      setOrder(updated);
      setEnteredOtp("");
      toast.success(`Order marked as PICKED UP! Handover complete.`);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify pickup");
    } finally {
      setIsPending(false);
    }
  };

  // Post Custom Tracking Milestone Note
  const handlePostNote = async () => {
    if (!order || !customNote.trim()) {
      toast.error("Please write a milestone note first.");
      return;
    }
    try {
      setIsPending(true);
      const updated = await api.updateOrderTracking(order.orderNumber, {
        note: customNote.trim(),
        location: customLocation.trim() || undefined,
      });
      setOrder(updated);
      setCustomNote("");
      setCustomLocation("");
      toast.success("Tracking milestone note logged into order history!");
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to log note");
    } finally {
      setIsPending(false);
    }
  };

  // Update Payment Details
  const handleSavePayment = async () => {
    if (!order) return;
    try {
      setIsPending(true);
      const updated = await api.updateOrderTracking(order.orderNumber, {
        paymentStatus,
        paymentMethod,
        note: `Payment updated: ${paymentMethod.toUpperCase()} (${paymentStatus})`,
      });
      setOrder(updated);
      toast.success("Payment details updated!");
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment");
    } finally {
      setIsPending(false);
    }
  };

  const isPickup =
    order?.fulfillmentType === "pickup" || Boolean(order?.pickupStoreId);
  const statusInfo =
    STATUS_CONFIG[order?.status || "pending"] || STATUS_CONFIG.pending;

  // Tracking Journey Stepper Milestones
  const deliverySteps = [
    { key: "pending", label: "Placed", icon: "📝" },
    { key: "confirmed", label: "Confirmed", icon: "👨‍🍳" },
    { key: "packed", label: "Packed", icon: "📦" },
    { key: "shipped", label: "Out for Delivery", icon: "🚚" },
    { key: "delivered", label: "Delivered", icon: "🏡" },
  ];

  const pickupSteps = [
    { key: "pending", label: "Placed", icon: "📝" },
    { key: "confirmed", label: "Confirmed", icon: "👨‍🍳" },
    { key: "preparing", label: "Kitchen Prep", icon: "🍳" },
    { key: "ready_for_pickup", label: "Ready at Store", icon: "🛍️" },
    { key: "picked_up", label: "Picked Up", icon: "🎉" },
  ];

  const activeSteps = isPickup ? pickupSteps : deliverySteps;
  const currentStepIndex = activeSteps.findIndex(
    (s) => s.key === (order?.status || "pending")
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-[#0b2f8a]/15 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gradient-to-r from-[#0b2f8a] via-[#09256e] to-[#071d57] text-white shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
              <span className="text-xs uppercase tracking-wider text-[#dfb755] font-bold">
                Order
              </span>
              <span className="font-mono font-black text-sm tracking-wide text-white">
                {orderNumber}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(orderNumber, "id")}
                title="Copy Order ID"
                className="text-white/70 hover:text-white transition p-0.5 rounded cursor-pointer"
              >
                {copiedId ? "✓" : "📋"}
              </button>
            </div>

            {/* Order Type Badge */}
            {isPickup ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-[#dfb755] text-[#182230] shadow-sm">
                <span>🏪</span>
                <span>STORE PICKUP</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-sky-400 text-[#071d57] shadow-sm">
                <span>🚚</span>
                <span>HOME DELIVERY</span>
              </span>
            )}

            {/* Current Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
            >
              <span>{statusInfo.icon}</span>
              <span>{statusInfo.label.toUpperCase()}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/10 text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-[#dfb755] animate-ping" />
                Syncing...
              </span>
            )}
            <button
              type="button"
              onClick={loadOrder}
              disabled={loading || isPending}
              title="Refresh order"
              className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-xs text-white transition cursor-pointer disabled:opacity-50"
            >
              <span className={loading ? "animate-spin inline-block" : ""}>🔄</span>
            </button>

            {order && (
              <a
                href={`/orders/${order.orderNumber}/invoice`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer border border-white/20"
              >
                <span>🧾</span>
                <span>Tax Invoice</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 hover:bg-white/25 p-2 text-white transition cursor-pointer h-8 w-8 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading && !order ? (
            <div className="py-20 text-center text-[#5e6d82]">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0b2f8a] border-t-transparent mx-auto mb-3" />
              <p className="font-semibold text-sm">Loading full order details &amp; tracking...</p>
            </div>
          ) : !order ? (
            <div className="py-16 text-center text-rose-600">
              <span className="text-3xl block mb-2">⚠️</span>
              <p className="font-bold text-base">Order details could not be found.</p>
              <button
                type="button"
                onClick={loadOrder}
                className="mt-3 px-4 py-2 bg-[#0b2f8a] text-white rounded-xl text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Visual Tracking Progress Stepper */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#0b2f8a]">
                      📍 Live Order Tracking Journey
                    </span>
                    <span className="text-xs text-[#5e6d82]">
                      ({isPickup ? "Store Pickup Lifecycle" : "Home Delivery Dispatch"})
                    </span>
                  </div>
                  {order.createdAt && (
                    <span className="text-xs text-[#5e6d82]">
                      Booked on:{" "}
                      <strong className="text-slate-800">
                        {new Date(order.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </strong>
                    </span>
                  )}
                </div>

                {order.status === "cancelled" ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🛑</span>
                      <div>
                        <p className="font-black text-sm uppercase tracking-wide">
                          Order Cancelled
                        </p>
                        <p className="text-xs text-rose-700">
                          Reason: {order.cancelReason || "Cancelled by store administrator"}
                        </p>
                      </div>
                    </div>
                    {order.cancelledAt && (
                      <span className="text-xs text-rose-600 font-mono">
                        {new Date(order.cancelledAt).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2 relative">
                    {/* Progress Bar Track */}
                    <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0" />
                    <div
                      className="absolute top-4 left-6 h-1 bg-emerald-500 transition-all duration-500 -z-0"
                      style={{
                        width: `${
                          currentStepIndex >= 0
                            ? (currentStepIndex / (activeSteps.length - 1)) * 92
                            : 0
                        }%`,
                      }}
                    />

                    {activeSteps.map((step, idx) => {
                      const isCompleted =
                        currentStepIndex > idx || order.status === "delivered" || order.status === "picked_up";
                      const isCurrent = currentStepIndex === idx;

                      return (
                        <div
                          key={step.key}
                          className="flex flex-col items-center text-center relative z-10"
                        >
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                              isCurrent
                                ? "bg-[#0b2f8a] text-white ring-4 ring-[#dfb755]/50 scale-110"
                                : isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-white border-2 border-slate-300 text-slate-400"
                            }`}
                          >
                            {isCompleted ? "✓" : step.icon}
                          </div>
                          <span
                            className={`mt-2 text-xs font-bold ${
                              isCurrent
                                ? "text-[#0b2f8a]"
                                : isCompleted
                                ? "text-emerald-800"
                                : "text-slate-400"
                            }`}
                          >
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 animate-pulse">
                              Active Stage
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2-Column Responsive Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Order Details (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Fulfillment Card: Pickup vs Delivery */}
                  {isPickup ? (
                    <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏪</span>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                              Pickup Outlet Branch
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              {order.store?.name || "Main Retail Sweet Outlet"}
                            </h3>
                          </div>
                        </div>

                        {order.pickupOtp && (
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs text-right">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                              Counter Pickup OTP
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-base font-black text-[#0b2f8a]">
                                {order.pickupOtp}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(order.pickupOtp!, "otp")}
                                title="Copy OTP"
                                className="text-xs text-slate-400 hover:text-slate-800 cursor-pointer"
                              >
                                {copiedOtp ? "✓" : "📋"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-slate-500 block font-medium">Branch Address:</span>
                          <p className="font-semibold text-slate-800">
                            {order.store?.address || "R.V. Desai Road, Navapura, Vadodara, Gujarat"}
                          </p>
                          {order.store?.phone && (
                            <a
                              href={`tel:${order.store.phone}`}
                              className="text-amber-900 hover:underline font-bold inline-flex items-center gap-1 mt-0.5"
                            >
                              📞 {order.store.phone}
                            </a>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-500 block font-medium">Scheduled Pickup:</span>
                          <p className="font-bold text-[#0b2f8a]">
                            📅 {order.pickupDate || "Today"}
                          </p>
                          <p className="font-semibold text-slate-700">
                            ⏰ {order.pickupSlot || order.deliverySlot || "Standard Store Hours"}
                          </p>
                          {order.actualReadyAt ? (
                            <span className="inline-block mt-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              Kitchen Prepared at:{" "}
                              {new Date(order.actualReadyAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : order.estimatedReadyAt ? (
                            <span className="inline-block mt-1 text-[11px] font-medium text-amber-800">
                              Estimated Ready: {new Date(order.estimatedReadyAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {order.pickupVerifiedBy && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                          <span>
                            ✅ Picked up &amp; verified by:{" "}
                            <strong>{order.pickupVerifiedBy}</strong>
                          </span>
                          {order.deliveredAt && (
                            <span className="text-[11px] text-emerald-700 font-mono">
                              {new Date(order.deliveredAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Home Delivery Shipping Card */
                    <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🚚</span>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                              Home Delivery Destination
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              {order.parsedAddress?.name ||
                                order.parsedAddress?.fullName ||
                                order.customerName ||
                                order.guestName ||
                                "Customer Address"}
                            </h3>
                          </div>
                        </div>

                        {order.deliverySlot && (
                          <span className="px-2.5 py-1 rounded-xl bg-white text-[#0b2f8a] border border-blue-200 font-bold text-xs shadow-2xs">
                            ⏰ {order.deliverySlot}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-slate-500 block font-medium">Shipping Address:</span>
                          <p className="font-semibold text-slate-800 leading-snug">
                            {formatAddressSnapshot(order.parsedAddress || order.addressSnapshot)}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500 block font-medium">
                            Courier &amp; Tracking:
                          </span>
                          {order.courierName || order.trackingNumber ? (
                            <div className="space-y-1 mt-0.5">
                              <p className="font-bold text-[#0b2f8a]">
                                📦 {order.courierName || "Courier Partner"}
                              </p>
                              {order.trackingNumber && (
                                <div className="flex items-center gap-1 font-mono text-slate-800">
                                  <span>AWB: {order.trackingNumber}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(order.trackingNumber!, "tracking")}
                                    className="text-xs text-slate-400 hover:text-slate-800 cursor-pointer"
                                  >
                                    {copiedTracking ? "✓" : "📋"}
                                  </button>
                                </div>
                              )}
                              {order.trackingUrl && (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                                >
                                  <span>Track on Courier Site</span>
                                  <span>↗</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">
                              No courier tracking assigned yet. Use the Tracking Manager on the right to assign one.
                            </p>
                          )}
                        </div>
                      </div>

                      {order.deliveredAt && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                          <span>✅ Delivered Successfully</span>
                          <span className="text-[11px] text-emerald-700 font-mono">
                            {new Date(order.deliveredAt).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Information Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Customer Contact &amp; Profile
                      </span>
                      {order.userId ? (
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                          Registered User #{order.userId}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                          Guest Checkout
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Name:</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {order.customerName ||
                            order.userName ||
                            order.guestName ||
                            order.parsedAddress?.name ||
                            "Customer"}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Phone:</span>
                        <p className="font-mono font-bold text-slate-800">
                          {order.customerPhone ||
                            order.userPhone ||
                            order.guestPhone ||
                            order.parsedAddress?.phone ||
                            "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {(order.customerPhone ||
                            order.userPhone ||
                            order.guestPhone ||
                            order.parsedAddress?.phone) && (
                            <>
                              <a
                                href={`tel:${
                                  order.customerPhone ||
                                  order.userPhone ||
                                  order.guestPhone ||
                                  order.parsedAddress?.phone
                                }`}
                                className="text-[11px] font-bold text-[#0b2f8a] hover:underline"
                              >
                                📞 Call
                              </a>
                              <span className="text-slate-300">•</span>
                              <a
                                href={`https://wa.me/91${(
                                  order.customerPhone ||
                                  order.userPhone ||
                                  order.guestPhone ||
                                  order.parsedAddress?.phone ||
                                  ""
                                ).replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-emerald-700 hover:underline"
                              >
                                💬 WhatsApp
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Email:</span>
                        <p className="font-semibold text-slate-800 truncate">
                          {order.userEmail || order.parsedAddress?.email || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Purchased Mithai & Farsan Items */}
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Purchased Items ({order.items?.length || 0})
                      </h4>
                      <span className="text-xs font-mono font-bold text-[#0b2f8a]">
                        Total Weight / Units
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-200 overflow-hidden flex items-center justify-center shrink-0">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg">🍬</span>
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-slate-900 leading-tight">
                                  {item.productName}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                    {item.variantWeight}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    ₹{item.unitPrice} × {item.quantity}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-mono font-bold text-sm text-[#0b2f8a]">
                                ₹{item.unitPrice * item.quantity}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : loading ? (
                        <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0b2f8a] border-t-transparent animate-spin inline-block" />
                          <span>Loading purchased items...</span>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No item records attached to this order.
                        </div>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">₹{order.subtotal}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>
                            Discount {order.couponCode && `(${order.couponCode})`}:
                          </span>
                          <span className="font-mono">-₹{order.discount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery / Packaging Fee:</span>
                        <span className="font-mono">
                          {order.deliveryFee > 0 ? `₹${order.deliveryFee}` : "FREE"}
                        </span>
                      </div>
                      {order.tax !== undefined && order.tax > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Applicable GST:</span>
                          <span className="font-mono">₹{order.tax}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-[#0b2f8a]">
                        <span>Grand Total:</span>
                        <span className="font-mono text-base">₹{order.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Whole Tracking & Operations Management (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="rounded-2xl bg-white border border-[#0b2f8a]/15 shadow-md overflow-hidden">
                    {/* Management Box Header */}
                    <div className="bg-[#0b2f8a] p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#dfb755] tracking-wider block">
                            Operations Control Desk
                          </span>
                          <h3 className="font-bold text-base flex items-center gap-1.5">
                            <span>🛠️</span>
                            <span>Order &amp; Tracking Manager</span>
                          </h3>
                        </div>
                      </div>

                      {/* Navigation Pills */}
                      <div className="flex gap-1 mt-3 bg-black/20 p-1 rounded-xl text-xs overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setActiveManagerTab("status")}
                          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center whitespace-nowrap cursor-pointer ${
                            activeManagerTab === "status"
                              ? "bg-white text-[#0b2f8a] shadow-xs"
                              : "text-white/80 hover:text-white"
                          }`}
                        >
                          Status
                        </button>
                        {!isPickup && (
                          <button
                            type="button"
                            onClick={() => setActiveManagerTab("shipping")}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center whitespace-nowrap cursor-pointer ${
                              activeManagerTab === "shipping"
                                ? "bg-white text-[#0b2f8a] shadow-xs"
                                : "text-white/80 hover:text-white"
                            }`}
                          >
                            Courier
                          </button>
                        )}
                        {isPickup && (
                          <button
                            type="button"
                            onClick={() => setActiveManagerTab("pickup")}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center whitespace-nowrap cursor-pointer ${
                              activeManagerTab === "pickup"
                                ? "bg-white text-[#0b2f8a] shadow-xs"
                                : "text-white/80 hover:text-white"
                            }`}
                          >
                            Counter OTP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveManagerTab("payment")}
                          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center whitespace-nowrap cursor-pointer ${
                            activeManagerTab === "payment"
                              ? "bg-white text-[#0b2f8a] shadow-xs"
                              : "text-white/80 hover:text-white"
                          }`}
                        >
                          Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveManagerTab("notes")}
                          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center whitespace-nowrap cursor-pointer ${
                            activeManagerTab === "notes"
                              ? "bg-white text-[#0b2f8a] shadow-xs"
                              : "text-white/80 hover:text-white"
                          }`}
                        >
                          Milestones
                        </button>
                      </div>
                    </div>

                    {/* Tab 1: Status Lifecycle Controller */}
                    {activeManagerTab === "status" && (
                      <div className="p-5 space-y-4 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Transition Order Status:
                          </label>
                          <select
                            value={targetStatus}
                            onChange={(e) => setTargetStatus(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 bg-white font-semibold focus:border-[#0b2f8a] outline-none shadow-2xs cursor-pointer text-sm"
                          >
                            <option value="pending">Pending (Awaiting Confirmation)</option>
                            <option value="confirmed">Confirmed (Accepted)</option>
                            {isPickup ? (
                              <>
                                <option value="preparing">Preparing Fresh in Kitchen</option>
                                <option value="ready_for_pickup">Ready for Pickup (At Counter)</option>
                                <option value="picked_up">Picked Up (Handed Over to Customer)</option>
                              </>
                            ) : (
                              <>
                                <option value="packed">Packed &amp; Sealed</option>
                                <option value="shipped">Out for Delivery (Dispatched)</option>
                                <option value="delivered">Delivered to Doorstep</option>
                              </>
                            )}
                            <option value="cancelled">Cancelled (Restock &amp; Refund)</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Status Note / Customer Reason:
                          </label>
                          <input
                            type="text"
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            placeholder="e.g. Fresh batch packed with dry ice cooling"
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none focus:border-[#0b2f8a]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveStatus}
                          disabled={isPending || targetStatus === order.status}
                          className="w-full rounded-xl bg-[#0b2f8a] hover:bg-[#09256e] text-white py-2.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          {isPending ? (
                            <>
                              <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              <span>Updating Status…</span>
                            </>
                          ) : (
                            <span>Save Status Transition</span>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Tab 2: Courier & Shipping Info */}
                    {activeManagerTab === "shipping" && !isPickup && (
                      <div className="p-5 space-y-4 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Select Courier Partner:
                          </label>
                          <select
                            value={courierName}
                            onChange={(e) => handleCourierChange(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 bg-white font-semibold outline-none cursor-pointer"
                          >
                            <option value="">Select Courier...</option>
                            {COURIER_PRESETS.map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Tracking / AWB Number:
                          </label>
                          <input
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => handleTrackingNumberChange(e.target.value)}
                            placeholder="e.g. DEL789123456"
                            className="w-full rounded-xl border border-slate-300 p-2 font-mono text-slate-800 outline-none focus:border-[#0b2f8a]"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Direct Tracking URL:
                          </label>
                          <input
                            type="url"
                            value={trackingUrl}
                            onChange={(e) => setTrackingUrl(e.target.value)}
                            placeholder="https://tracker.courier.com/..."
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 outline-none focus:border-[#0b2f8a]"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Estimated Delivery Date:
                          </label>
                          <input
                            type="date"
                            value={expectedDeliveryDate}
                            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 outline-none focus:border-[#0b2f8a] bg-white cursor-pointer"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveShipping}
                          disabled={isPending}
                          className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white py-2.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          {isPending ? "Saving Tracking…" : "Save Courier & Tracking Info"}
                        </button>
                      </div>
                    )}

                    {/* Tab 3: Pickup Counter OTP Verification */}
                    {activeManagerTab === "pickup" && isPickup && (
                      <div className="p-5 space-y-4 text-xs">
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] uppercase font-bold text-amber-900 block">
                            Customer Pickup Security
                          </span>
                          <p className="text-slate-600 mt-0.5">
                            Customer will present their 6-digit OTP displayed on their order screen upon reaching the store.
                          </p>
                          {order.pickupOtp && (
                            <div className="mt-2 flex items-center gap-2 font-mono font-bold text-slate-800 bg-white p-2 rounded-lg border border-amber-200">
                              <span>Customer OTP on file:</span>
                              <span className="text-amber-800 text-sm font-black tracking-widest">
                                {order.pickupOtp}
                              </span>
                            </div>
                          )}
                        </div>

                        {order.status === "picked_up" ? (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-center">
                            ✅ Order already handed over and verified.
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">
                                Enter Customer's 6-Digit OTP:
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                value={enteredOtp}
                                onChange={(e) => setEnteredOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-center text-lg tracking-widest text-[#0b2f8a] font-black outline-none focus:border-[#0b2f8a]"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-slate-700 block mb-1">
                                Verifying Staff Name:
                              </label>
                              <input
                                type="text"
                                value={counterStaffName}
                                onChange={(e) => setCounterStaffName(e.target.value)}
                                placeholder="Staff Name"
                                className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 outline-none focus:border-[#0b2f8a]"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleVerifyPickup(false)}
                                disabled={isPending || !enteredOtp.trim()}
                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                              >
                                {isPending ? "Verifying…" : "Verify OTP & Handover"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerifyPickup(true)}
                                disabled={isPending}
                                className="rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2.5 font-medium transition cursor-pointer"
                                title="Bypass OTP check using Order Number"
                              >
                                Override By Order #
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Payment Manager */}
                    {activeManagerTab === "payment" && (
                      <div className="p-5 space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">
                              Payment Method:
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 bg-white font-semibold outline-none cursor-pointer"
                            >
                              <option value="upi">UPI / QR</option>
                              <option value="cod">Cash on Delivery</option>
                              <option value="counter">Pay at Counter</option>
                              <option value="card">Credit / Debit Card</option>
                              <option value="netbanking">Net Banking</option>
                            </select>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">
                              Payment Status:
                            </label>
                            <select
                              value={paymentStatus}
                              onChange={(e) => setPaymentStatus(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 bg-white font-semibold outline-none cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>
                        </div>

                        {order.payment?.transactionId && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[11px]">
                            Transaction ID: {order.payment.transactionId}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSavePayment}
                          disabled={isPending}
                          className="w-full rounded-xl bg-[#0b2f8a] hover:bg-[#09256e] text-white py-2.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isPending ? "Updating Payment…" : "Save Payment Details"}
                        </button>
                      </div>
                    )}

                    {/* Tab 5: Milestone Note Logger */}
                    {activeManagerTab === "notes" && (
                      <div className="p-5 space-y-4 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Milestone Tracking Note:
                          </label>
                          <textarea
                            rows={3}
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            placeholder="e.g. Package handed over to delivery driver Suresh with temperature check complete."
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none focus:border-[#0b2f8a]"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Current Location / Facility:
                          </label>
                          <input
                            type="text"
                            value={customLocation}
                            onChange={(e) => setCustomLocation(e.target.value)}
                            placeholder="e.g. Vadodara Central Packing Station"
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 outline-none focus:border-[#0b2f8a]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handlePostNote}
                          disabled={isPending || !customNote.trim()}
                          className="w-full rounded-xl bg-[#0b2f8a] hover:bg-[#09256e] text-white py-2.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isPending ? "Logging Milestone…" : "Log Tracking Milestone"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Audit Trail: Status History Log */}
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Tracking Milestone Audit Trail
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {order.history?.length || 0} events
                      </span>
                    </div>

                    <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                      {order.history && order.history.length > 0 ? (
                        order.history.map((h, i) => (
                          <div
                            key={h.id || i}
                            className="flex items-start gap-2.5 text-xs pb-2.5 border-b border-slate-100 last:border-b-0 last:pb-0"
                          >
                            <span className="h-2 w-2 rounded-full bg-[#0b2f8a] mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 uppercase text-[11px]">
                                  {h.status.replace(/_/g, " ")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(h.createdAt).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] mt-0.5">
                                {h.note || "Status updated"}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                <span>By: {h.changedBy || "System"}</span>
                                {h.location && (
                                  <>
                                    <span>•</span>
                                    <span>📍 {h.location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : loading ? (
                        <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0b2f8a] border-t-transparent animate-spin inline-block" />
                          <span>Loading tracking history...</span>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-slate-400">
                          Initial order placed. No subsequent milestones recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Vrdayini Operations Management Suite</span>
            <span>•</span>
            <span className="font-mono">{orderNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
