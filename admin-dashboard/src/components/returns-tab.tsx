"use client";

import { useState, useEffect, useMemo } from "react";
import { api, ReturnRequestItem, ReturnStatus } from "@/lib/api";
import { toast } from "@/lib/toast";

const STATUS_CONFIG: Record<
  ReturnStatus,
  { label: string; badgeClass: string; icon: string }
> = {
  requested: {
    label: "Requested",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    icon: "⏳",
  },
  under_review: {
    label: "Under Review",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
    icon: "🔍",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    icon: "✓",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
    icon: "✕",
  },
  replaced: {
    label: "Replaced",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    icon: "🔄",
  },
  refunded: {
    label: "Refunded",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-300",
    icon: "💳",
  },
};

export default function ReturnsTab() {
  const [items, setItems] = useState<ReturnRequestItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review / Status Edit Modal State
  const [activeItem, setActiveItem] = useState<ReturnRequestItem | null>(null);
  const [editStatus, setEditStatus] = useState<ReturnStatus>("requested");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [editRefundAmount, setEditRefundAmount] = useState<number>(0);
  const [savingAction, setSavingAction] = useState(false);

  // Photo Preview Modal State
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Return Policy Settings Modal State
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyTitle, setPolicyTitle] = useState("");
  const [policyHours, setPolicyHours] = useState(24);
  const [policyOverview, setPolicyOverview] = useState("");
  const [policyTurnaround, setPolicyTurnaround] = useState("5-7 working days after approval");
  const [policyNoticeNote, setPolicyNoticeNote] = useState("");
  const [policyPhone, setPolicyPhone] = useState("+91 63521 19329");
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Fetch returns
  const loadReturns = async () => {
    setLoading(true);
    try {
      const res = await api.getReturns({
        status: selectedStatus,
        search: searchQuery,
      });
      setItems(res.items || []);
      setCounts(res.counts || {});
    } catch (err: any) {
      toast.error(err.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [selectedStatus]);

  // Load UI config for Return Policy on mount
  useEffect(() => {
    api
      .getUiConfig()
      .then((cfg: any) => {
        const pol = cfg?.returnPolicy || {};
        setPolicyTitle(pol.title || "24-Hour Perishable Sweets Exchange & Return Policy");
        setPolicyHours(pol.windowHours || 24);
        setPolicyOverview(
          pol.overview ||
            "Sweets and farsan are perishable food items prepared fresh daily with 100% pure desi cow ghee. Under FSSAI guidelines, exchanges or refunds are accepted exclusively for wrong items, damaged packaging, spoiled product, or missing items reported within 24 hours of delivery with photographic proof."
        );
        setPolicyTurnaround(pol.refundTurnaround || "5-7 working days after approval");
        setPolicyNoticeNote(
          pol.noticeNote ||
            "All claims require order number and photo proof within 24 hours of delivery. Refunds are processed in 5-7 working days upon approval."
        );
        setPolicyPhone(pol.supportPhone || "+91 63521 19329");
      })
      .catch(() => {});
  }, []);

  // Filter items locally by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.orderNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.reasonLabel.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Handle open review modal
  const handleOpenReview = (item: ReturnRequestItem) => {
    setActiveItem(item);
    setEditStatus(item.status);
    setEditAdminNotes(item.adminNotes || "");
    setEditRefundAmount(item.refundAmount || item.orderTotal || 0);
  };

  // Submit status update
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    setSavingAction(true);
    try {
      const res = await api.updateReturnStatus(activeItem.id, {
        status: editStatus,
        adminNotes: editAdminNotes.trim(),
        refundAmount: Number(editRefundAmount) || 0,
      });

      toast.success(res.message || `Claim updated to '${editStatus}'.`);
      setActiveItem(null);
      loadReturns();
    } catch (err: any) {
      toast.error(err.message || "Failed to update return request");
    } finally {
      setSavingAction(false);
    }
  };

  // Save return policy settings
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      await api.updateUiConfig({
        returnPolicy: {
          title: policyTitle.trim(),
          windowHours: Number(policyHours) || 24,
          overview: policyOverview.trim(),
          refundTurnaround: policyTurnaround.trim(),
          noticeNote: policyNoticeNote.trim(),
          supportPhone: policyPhone.trim(),
        },
      });
      toast.success("Return Policy settings saved successfully!");
      setShowPolicyModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save return policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  const pendingCount = (counts.requested || 0) + (counts.under_review || 0);

  return (
    <div className="space-y-6">
      {/* Header Tier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Returns &amp; Exchanges Desk
            </h1>
            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-xs font-bold">
              24-Hour Perishable SLA
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review customer claims, verify defect photo proof, manage replacements, and issue refunds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPolicyModal(true)}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>Edit Policy Text</span>
          </button>
          <button
            type="button"
            onClick={loadReturns}
            className="rounded-xl bg-[#0b2f8a] hover:bg-[#071c54] text-white px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requests</p>
          <p className="text-2xl font-black text-slate-900">{counts.total || 0}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Review</p>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-900">{pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Under Review</p>
          <p className="text-2xl font-black text-blue-900">{counts.under_review || 0}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Approved</p>
          <p className="text-2xl font-black text-emerald-900">{counts.approved || 0}</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Replaced</p>
          <p className="text-2xl font-black text-purple-900">{counts.replaced || 0}</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Refunded</p>
          <p className="text-2xl font-black text-teal-900">{counts.refunded || 0}</p>
        </div>
      </div>

      {/* Filter Pills & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All", count: counts.total || 0 },
            { id: "requested", label: "Requested", count: counts.requested || 0 },
            { id: "under_review", label: "Under Review", count: counts.under_review || 0 },
            { id: "approved", label: "Approved", count: counts.approved || 0 },
            { id: "replaced", label: "Replaced", count: counts.replaced || 0 },
            { id: "refunded", label: "Refunded", count: counts.refunded || 0 },
            { id: "rejected", label: "Rejected", count: counts.rejected || 0 },
          ].map((pill) => {
            const isActive = selectedStatus === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedStatus(pill.id)}
                className={`rounded-full px-3 py-1.5 font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-[#0b2f8a] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by order #, phone, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0b2f8a] focus:outline-hidden shadow-2xs"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="text-2xl animate-spin">⏳</span>
            <span>Loading return requests...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <span className="text-3xl block">🛡️</span>
            <p className="font-bold text-slate-700">No return requests found</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No requests match "${searchQuery}".`
                : selectedStatus !== "all"
                ? `No requests currently in '${selectedStatus}' status.`
                : "All delivered perishable sweets orders are in good standing."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Reason &amp; Description</th>
                  <th className="py-3.5 px-4 text-center">Photo Proof</th>
                  <th className="py-3.5 px-4">Date Filed</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      {/* Order Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block font-mono">
                          #{item.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Total: ₹{item.orderTotal || 0}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.customerName}</p>
                        <a
                          href={`tel:${item.customerPhone}`}
                          className="text-[11px] font-mono text-[#0b2f8a] hover:underline"
                        >
                          {item.customerPhone}
                        </a>
                      </td>

                      {/* Reason & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="inline-block font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-[11px] mb-1">
                          {item.reasonLabel || item.reason}
                        </span>
                        <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </td>

                      {/* Photo Proof */}
                      <td className="py-3.5 px-4 text-center">
                        {item.photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoUrl(item.photoUrl)}
                            className="group relative inline-block h-12 w-12 rounded-xl overflow-hidden border border-slate-200 hover:border-[#dfb755] transition shadow-2xs"
                          >
                            <img
                              src={item.photoUrl}
                              alt="Defect proof"
                              className="h-full w-full object-cover group-hover:scale-105 transition"
                            />
                            <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                              🔍
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No photo</span>
                        )}
                      </td>

                      {/* Date Filed */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {item.requestedAt ? (
                          <>
                            <p className="font-medium text-slate-700">
                              {new Date(item.requestedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(item.requestedAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                        {item.refundAmount > 0 && (
                          <p className="text-[10px] font-bold text-teal-700 mt-1">
                            Refund: ₹{item.refundAmount}
                          </p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item)}
                          className="rounded-xl border border-slate-200 hover:border-[#0b2f8a] bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0b2f8a] px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                        >
                          Review &amp; Update →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: REVIEW & UPDATE STATUS MODAL
         ───────────────────────────────────────────────────────────── */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>🛡️</span>
                  <span>Review Claim #{activeItem.orderNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Customer: {activeItem.customerName} ({activeItem.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Claim Details Summary */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Reason:</span>
                <span className="font-semibold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {activeItem.reasonLabel || activeItem.reason}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Customer Description:</span>
                <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] leading-relaxed">
                  {activeItem.description}
                </p>
              </div>

              {activeItem.photoUrl && (
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-700">Photo Proof:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewPhotoUrl(activeItem.photoUrl)}
                    className="text-xs text-[#0b2f8a] font-bold underline hover:text-[#071c54] flex items-center gap-1"
                  >
                    <span>📷 View Full Image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Status Change Form */}
            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Update Status Flow <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      "requested",
                      "under_review",
                      "approved",
                      "rejected",
                      "replaced",
                      "refunded",
                    ] as ReturnStatus[]
                  ).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isCurrent = editStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={`rounded-xl p-2 border font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                          isCurrent
                            ? "border-[#0b2f8a] bg-[#0b2f8a] text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm">{cfg.icon}</span>
                        <span className="text-[10px]">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Refund Amount (Active when approved or refunded) */}
              {(editStatus === "approved" || editStatus === "refunded") && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5 space-y-1.5">
                  <label className="font-bold text-teal-900 block">
                    Refund Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editRefundAmount}
                    onChange={(e) => setEditRefundAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-900 focus:outline-hidden"
                    placeholder="Enter refund amount"
                  />
                  <p className="text-[10px] text-teal-700">
                    Policy SLA: Refunds are processed within 5-7 working days.
                  </p>
                </div>
              )}

              {/* Admin Note */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Admin Inspection Note / Resolution Remarks
                </label>
                <textarea
                  rows={3}
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Add internal notes on parcel condition, quality inspection, or courier communication..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-[#0b2f8a] focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  disabled={savingAction}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="rounded-xl bg-[#0b2f8a] hover:bg-[#071c54] text-white px-5 py-2 font-bold shadow-md transition disabled:opacity-50"
                >
                  {savingAction ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: HIGH-RES PHOTO PROOF PREVIEW
         ───────────────────────────────────────────────────────────── */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative max-w-2xl w-full rounded-3xl bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">
                Customer Photo Proof Inspection
              </h4>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewPhotoUrl}
                alt="Defect proof preview"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: RETURN POLICY SETTINGS EDITOR MODAL
         ───────────────────────────────────────────────────────────── */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <h3 className="font-bold text-base text-slate-900">
                  Edit Return Policy Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Policy Title
                </label>
                <input
                  type="text"
                  value={policyTitle}
                  onChange={(e) => setPolicyTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-[#0b2f8a] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Claim Window (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={policyHours}
                  onChange={(e) => setPolicyHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-[#0b2f8a] focus:outline-hidden"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Perishable sweets standard is 24 hours.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Overview / Policy Description
                </label>
                <textarea
                  rows={3}
                  value={policyOverview}
                  onChange={(e) => setPolicyOverview(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-[#0b2f8a] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Refund Turnaround SLA
                </label>
                <input
                  type="text"
                  value={policyTurnaround}
                  onChange={(e) => setPolicyTurnaround(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b2f8a] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Notice Note (Checkout &amp; Confirmation)
                </label>
                <input
                  type="text"
                  value={policyNoticeNote}
                  onChange={(e) => setPolicyNoticeNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b2f8a] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Support Contact Number
                </label>
                <input
                  type="text"
                  value={policyPhone}
                  onChange={(e) => setPolicyPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b2f8a] focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  disabled={savingPolicy}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="rounded-xl bg-[#0b2f8a] hover:bg-[#071c54] text-white px-5 py-2 font-bold shadow-md transition disabled:opacity-50"
                >
                  {savingPolicy ? "Saving Policy..." : "Save Policy Text"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
