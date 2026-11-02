"use client";

import { useEffect, useState } from "react";
import {
  api,
  PickupOrder,
  PickupStats,
  AdminStoreOutlet,
} from "@/lib/api";

export function PickupsTab() {
  const [stats, setStats] = useState<PickupStats>({
    todayPickups: 0,
    upcomingPickups: 0,
    ordersPreparing: 0,
    readyForPickup: 0,
    overduePickups: 0,
    totalPickedUp: 0,
    totalOrders: 0,
  });

  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [stores, setStores] = useState<AdminStoreOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioningOrderId, setTransitioningOrderId] = useState<string | null>(null);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [historyOrder, setHistoryOrder] = useState<PickupOrder | null>(null);

  // OTP Verification Modal
  const [otpModalOrder, setOtpModalOrder] = useState<PickupOrder | null>(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [verifyByOrderNumber, setVerifyByOrderNumber] = useState(false);
  const [otpVerifyError, setOtpVerifyError] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Edit Ready Time Modal
  const [readyTimeOrder, setReadyTimeOrder] = useState<PickupOrder | null>(null);
  const [newReadyTime, setNewReadyTime] = useState("");
  const [readyTimeSaving, setReadyTimeSaving] = useState(false);

  // Cancel Modal
  const [cancelOrder, setCancelOrder] = useState<PickupOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Action feedback
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getPickups({
        branchId: selectedBranch !== "all" ? selectedBranch : undefined,
        date: selectedDate !== "all" ? selectedDate : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
      });
      setStats(res.stats);
      setOrders(res.orders);
      setStores(res.stores);
    } catch (err: any) {
      setActionNotice({
        type: "error",
        message: err.message || "Failed to load pickup orders",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, selectedDate, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const showNotice = (type: "success" | "error", message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Quick Status Transition (e.g. Start Prep, Mark Ready)
  const handleTransitionStatus = async (order: PickupOrder, targetStatus: string) => {
    try {
      setTransitioningOrderId(order.orderNumber);
      await api.updatePickupOrder(order.orderNumber, {
        action: "update_status",
        status: targetStatus,
        expectedStatus: order.status,
      });
      showNotice("success", `Order #${order.orderNumber.replace(/^#/, "")} transitioned to '${targetStatus}'.`);
      await loadData();
    } catch (err: any) {
      showNotice("error", err.message || "Status update failed");
    } finally {
      setTransitioningOrderId(null);
    }
  };

  // Handle Picked Up Handover with OTP or Staff Override
  const handleConfirmHandover = async () => {
    if (!otpModalOrder) return;
    setOtpVerifyError("");

    if (!verifyByOrderNumber && (!enteredOtp || enteredOtp.trim().length !== 6)) {
      setOtpVerifyError("Please enter the customer's 6-digit OTP or check the override box.");
      return;
    }

    try {
      setOtpVerifying(true);
      await api.updatePickupOrder(otpModalOrder.orderNumber, {
        action: "update_status",
        status: "picked_up",
        otp: verifyByOrderNumber ? undefined : enteredOtp.trim(),
        verifyByOrderNumber,
      });

      showNotice("success", `Order #${otpModalOrder.orderNumber} successfully marked as Picked Up! Counter handover complete.`);
      setOtpModalOrder(null);
      setEnteredOtp("");
      setVerifyByOrderNumber(false);
      loadData();
    } catch (err: any) {
      setOtpVerifyError(err.message || "Failed to verify handover");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Handle Ready Time Save
  const handleSaveReadyTime = async () => {
    if (!readyTimeOrder || !newReadyTime.trim()) return;

    try {
      setReadyTimeSaving(true);
      await api.updatePickupOrder(readyTimeOrder.orderNumber, {
        action: "update_ready_time",
        estimatedReadyAt: newReadyTime.trim(),
      });
      showNotice("success", `Estimated ready time for #${readyTimeOrder.orderNumber} updated and customer notified via SMS.`);
      setReadyTimeOrder(null);
      setNewReadyTime("");
      loadData();
    } catch (err: any) {
      showNotice("error", err.message || "Failed to update ready time");
    } finally {
      setReadyTimeSaving(false);
    }
  };

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelOrder) return;
    try {
      setCancelling(true);
      await api.updatePickupOrder(cancelOrder.orderNumber, {
        action: "update_status",
        status: "cancelled",
        cancelReason: cancelReason.trim() || "Cancelled by store staff",
      });
      showNotice("success", `Order #${cancelOrder.orderNumber} has been cancelled and stock restored to inventory.`);
      setCancelOrder(null);
      setCancelReason("");
      loadData();
    } catch (err: any) {
      showNotice("error", err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "picked_up":
        return <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold">Picked Up ✓</span>;
      case "ready_for_pickup":
        return <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-400 px-2.5 py-0.5 text-xs font-bold animate-pulse">Ready for Pickup 🛍️</span>;
      case "preparing":
        return <span className="rounded-full bg-orange-100 text-orange-800 border border-orange-300 px-2.5 py-0.5 text-xs font-bold">Preparing Fresh 👨‍🍳</span>;
      case "confirmed":
        return <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 text-xs font-bold">Confirmed</span>;
      case "cancelled":
        return <span className="rounded-full bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 text-xs font-bold">Cancelled 🛑</span>;
      default:
        return <span className="rounded-full bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Alert */}
      {actionNotice && (
        <div
          className={`rounded-2xl p-4 text-sm font-semibold flex items-center justify-between border shadow-sm ${
            actionNotice.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionNotice.type === "success" ? "✓" : "⚠️"}</span>
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>🏪</span>
            <span>Store-Wise Pickup Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track fresh batch kitchen preparation, verify customer counter OTPs, and manage branch capacity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || Boolean(transitioningOrderId)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 text-xs font-bold transition disabled:opacity-50"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span>
          <span>Refresh Pickups</span>
        </button>
      </div>

      {/* KPI Stats Counter Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => {
            setSelectedDate("today");
            setSelectedStatus("all");
          }}
          className={`rounded-2xl p-4 text-left transition border shadow-xs ${
            selectedDate === "today"
              ? "bg-[#6b1d1d] text-white border-[#6b1d1d]"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Today's Pickups</div>
          <div className="mt-2 text-2xl font-extrabold">{stats.todayPickups}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Scheduled for today</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDate("upcoming");
            setSelectedStatus("all");
          }}
          className={`rounded-2xl p-4 text-left transition border shadow-xs ${
            selectedDate === "upcoming"
              ? "bg-[#6b1d1d] text-white border-[#6b1d1d]"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Upcoming</div>
          <div className="mt-2 text-2xl font-extrabold">{stats.upcomingPickups}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Future dates</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedStatus("preparing");
            setSelectedDate("all");
          }}
          className={`rounded-2xl p-4 text-left transition border shadow-xs ${
            selectedStatus === "preparing"
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">In Kitchen Prep</div>
          <div className="mt-2 text-2xl font-extrabold text-orange-600 group-hover:text-white">
            {stats.ordersPreparing}
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Sweet halwais crafting</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedStatus("ready_for_pickup");
            setSelectedDate("all");
          }}
          className={`rounded-2xl p-4 text-left transition border shadow-xs ${
            selectedStatus === "ready_for_pickup"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Ready at Counter</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-700">
            {stats.readyForPickup}
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Awaiting customer OTP</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDate("overdue");
            setSelectedStatus("all");
          }}
          className={`rounded-2xl p-4 text-left transition border shadow-xs ${
            selectedDate === "overdue"
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Overdue Slots</div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600">
            {stats.overduePickups}
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Past scheduled slot</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedStatus("picked_up");
            setSelectedDate("all");
          }}
          className={`rounded-2xl p-4 text-left transition border shadow-xs ${
            selectedStatus === "picked_up"
              ? "bg-emerald-700 text-white border-emerald-700"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Completed</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {stats.totalPickedUp}
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Handed over</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Branch Filter */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Store Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#6b1d1d] focus:bg-white"
            >
              <option value="all">🏢 All Branches ({stores.length})</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="min-w-[150px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Date Filter
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#6b1d1d] focus:bg-white"
            >
              <option value="all">📅 All Dates</option>
              <option value="today">Today's Pickups</option>
              <option value="upcoming">Upcoming Pickups</option>
              <option value="overdue">Overdue Pickups</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[160px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#6b1d1d] focus:bg-white"
            >
              <option value="all">⚡ All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">In Kitchen Prep</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="picked_up">Picked Up</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search Orders
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order #, Customer, Phone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#6b1d1d] focus:bg-white"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#6b1d1d] px-4 py-2 text-xs font-bold text-white hover:bg-[#521616] transition shrink-0"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Orders List / Cards */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            Showing {orders.length} Pickup Orders
          </div>
          {(selectedBranch !== "all" || selectedDate !== "all" || selectedStatus !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBranch("all");
                setSelectedDate("all");
                setSelectedStatus("all");
                setSearchQuery("");
              }}
              className="text-xs text-[#c45c26] hover:underline font-semibold"
            >
              Clear all filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6b1d1d] border-t-transparent mx-auto mb-2" />
            Loading pickup orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <span className="text-3xl block mb-2">📦</span>
            <p className="font-bold text-slate-700 text-sm">No pickup orders match your current filters.</p>
            <p className="text-slate-400 mt-1">Try resetting the branch or date filters above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((o) => {
              const isExpanded = expandedOrderId === o.id;

              return (
                <div key={o.id} className="p-4 hover:bg-slate-50/70 transition">
                  {/* Top Bar: Order #, Branch, Status, Total */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-[#6b1d1d]">
                        #{o.orderNumber}
                      </span>
                      {getStatusBadge(o.status)}
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        🏪 {o.storeName || "Branch Store"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-900 font-[family-name:var(--font-display)]">
                        ₹{o.total}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">
                        {o.paymentMethod.toUpperCase()} ({o.paymentStatus})
                      </span>
                    </div>
                  </div>

                  {/* Customer, Date & Slot Grid */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Customer Info */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Customer</span>
                      <p className="font-bold text-slate-800">{o.customerName}</p>
                      <a href={`tel:${o.customerPhone}`} className="text-[#c45c26] hover:underline font-mono">
                        📞 {o.customerPhone}
                      </a>
                    </div>

                    {/* Scheduled Slot */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Pickup Date & Slot</span>
                      <p className="font-bold text-[#6b1d1d]">📅 {o.pickupDate || "Today"}</p>
                      <p className="text-slate-600">⏰ {o.pickupSlot || o.deliverySlot}</p>
                    </div>

                    {/* Estimated Ready Time */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Ready Time</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {o.actualReadyAt
                            ? `Ready (${new Date(o.actualReadyAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`
                            : o.estimatedReadyAt || "Not set"}
                        </span>
                        {o.status !== "picked_up" && o.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => {
                              setReadyTimeOrder(o);
                              setNewReadyTime(o.estimatedReadyAt || "");
                            }}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                            title="Edit Ready Time"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {o.actualReadyAt ? "Freshly packed at counter" : "Auto-calculated with prep time"}
                      </p>
                    </div>

                    {/* Counter Verification OTP Preview */}
                    <div className="space-y-0.5 bg-amber-50/60 p-2 rounded-xl border border-amber-200/50">
                      <span className="text-[10px] uppercase font-bold text-amber-800">Counter OTP</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-extrabold text-[#6b1d1d]">
                          {o.pickupOtp || "------"}
                        </span>
                        {o.pickupVerifiedBy && (
                          <span className="text-[9px] text-emerald-700 font-semibold" title={`Verified by ${o.pickupVerifiedBy}`}>
                            ✓ Handed over
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Step 1: Start Prep */}
                      {o.status === "confirmed" && (
                        <button
                          type="button"
                          disabled={transitioningOrderId === o.orderNumber}
                          onClick={() => handleTransitionStatus(o, "preparing")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{transitioningOrderId === o.orderNumber ? "⏳" : "👨‍🍳"}</span>
                          <span>{transitioningOrderId === o.orderNumber ? "Starting Prep…" : "Start Kitchen Prep"}</span>
                        </button>
                      )}

                      {/* Step 2: Mark Ready for Pickup */}
                      {o.status === "preparing" && (
                        <button
                          type="button"
                          disabled={transitioningOrderId === o.orderNumber}
                          onClick={() => handleTransitionStatus(o, "ready_for_pickup")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{transitioningOrderId === o.orderNumber ? "⏳" : "🛍️"}</span>
                          <span>{transitioningOrderId === o.orderNumber ? "Marking Ready…" : "Mark Ready for Pickup"}</span>
                        </button>
                      )}

                      {/* Step 3: Verify OTP & Mark Picked Up */}
                      {o.status === "ready_for_pickup" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpModalOrder(o);
                            setEnteredOtp("");
                            setVerifyByOrderNumber(false);
                            setOtpVerifyError("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs ring-2 ring-emerald-300"
                        >
                          <span>🔑</span>
                          <span>Verify OTP & Mark Picked Up</span>
                        </button>
                      )}

                      {/* Cancel action */}
                      {o.status !== "picked_up" && o.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelOrder(o);
                            setCancelReason("");
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold border border-rose-200 transition"
                        >
                          <span>🛑</span>
                          <span>Cancel</span>
                        </button>
                      )}

                      {/* View Status Audit History */}
                      <button
                        type="button"
                        onClick={() => setHistoryOrder(o)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold transition"
                      >
                        <span>📋</span>
                        <span>Audit Timeline ({o.history?.length || 0})</span>
                      </button>
                    </div>

                    {/* Expand Items Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      {isExpanded ? "▲ Hide Items" : `▼ View Items (${o.items?.length || 0})`}
                    </button>
                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-2 animate-in fade-in duration-200">
                      <div className="font-bold text-slate-700 border-b border-slate-200 pb-1 flex justify-between">
                        <span>Product Items</span>
                        <span>Line Total</span>
                      </div>
                      {o.items?.map((it) => (
                        <div key={it.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-b-0">
                          <div>
                            <span className="font-semibold text-slate-800">{it.productName}</span>{" "}
                            <span className="text-slate-500">({it.variantWeight} × {it.quantity})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-700">₹{it.unitPrice * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: OTP Verification & Handover */}
      {otpModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#6b1d1d] flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>Counter Pickup Verification</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Order #{otpModalOrder.orderNumber} · {otpModalOrder.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOtpModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Payment Collection Alert */}
            {otpModalOrder.paymentStatus !== "paid" && (
              <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 block">
                  💰 Payment Due at Counter: ₹{otpModalOrder.total}
                </span>
                <p className="text-amber-800 text-[11px]">
                  Please collect payment via UPI QR, Cash, or Card before handing over the sweet box.
                </p>
              </div>
            )}

            {/* OTP Entry */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Customer 6-Digit OTP *
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                disabled={verifyByOrderNumber}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 748291"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-center font-mono text-2xl font-black tracking-widest text-[#6b1d1d] outline-none focus:border-[#6b1d1d] focus:bg-white disabled:opacity-40"
              />
              <p className="text-[11px] text-slate-500 text-center">
                Ask customer to show the 6-digit OTP displayed on their order confirmation page.
              </p>
            </div>

            {/* Override Option */}
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={verifyByOrderNumber}
                onChange={(e) => setVerifyByOrderNumber(e.target.checked)}
                className="rounded accent-[#6b1d1d]"
              />
              <span>Customer cannot access phone (Verify by Order Number match)</span>
            </label>

            {otpVerifyError && (
              <p className="rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                ⚠️ {otpVerifyError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOtpModalOrder(null)}
                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={otpVerifying}
                className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm"
              >
                {otpVerifying ? "Verifying..." : "Confirm & Mark Picked Up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Estimated Ready Time */}
      {readyTimeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#6b1d1d]">Edit Estimated Ready Time</h3>
                <p className="text-xs text-slate-500">Order #{readyTimeOrder.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setReadyTimeOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                New Estimated Ready Time *
              </label>
              <input
                type="text"
                value={newReadyTime}
                onChange={(e) => setNewReadyTime(e.target.value)}
                placeholder="e.g. Today, 5:45 PM"
                className="w-full rounded-2xl border border-slate-300 p-3 text-sm font-semibold outline-none focus:border-[#6b1d1d]"
              />
              <p className="text-[11px] text-slate-500">
                This will automatically update the customer's tracking page and log an SMS alert.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReadyTimeOrder(null)}
                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReadyTime}
                disabled={readyTimeSaving || !newReadyTime.trim()}
                className="flex-1 rounded-2xl bg-[#6b1d1d] hover:bg-[#521616] py-3 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm"
              >
                {readyTimeSaving ? "Saving..." : "Save & Update Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Cancel Order */}
      {cancelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-rose-700">Cancel Pickup Order</h3>
                <p className="text-xs text-slate-500">Order #{cancelOrder.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setCancelOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Cancellation Reason *
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer cancelled via phone / Kitchen out of stock"
                className="w-full rounded-2xl border border-slate-300 p-3 text-sm outline-none focus:border-rose-600"
              />
              <p className="text-[11px] text-slate-500">
                Cancelling will automatically restore product items to the inventory and notify the customer.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelOrder(null)}
                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Status Audit Trail */}
      {historyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#6b1d1d] flex items-center gap-2">
                  <span>📋</span>
                  <span>Order Audit Timeline</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Order #{historyOrder.orderNumber} · {historyOrder.storeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {historyOrder.history?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No historical notes recorded yet.</p>
              ) : (
                <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 ml-2">
                  {historyOrder.history.map((h, i) => (
                    <div key={h.id || i} className="relative">
                      <div className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full bg-[#6b1d1d] ring-4 ring-white" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wider text-slate-800">
                            {h.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(h.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 leading-snug">{h.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setHistoryOrder(null)}
                className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-bold text-slate-700 transition"
              >
                Close Audit Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
