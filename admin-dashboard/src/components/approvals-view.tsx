"use client";

import { useEffect, useState } from "react";
import { api, ApprovalItem } from "@/lib/api";
import { toast } from "@/lib/toast";

interface ApprovalsViewProps {
  currentUserId?: number;
  currentUserRole?: string;
}

export function ApprovalsView({ currentUserId, currentUserRole }: ApprovalsViewProps) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Review Modal state
  const [reviewingItem, setReviewingItem] = useState<{
    item: ApprovalItem;
    action: "approved" | "rejected";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Submit Modal state
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [newType, setNewType] = useState("product_deletion");
  const [newModule, setNewModule] = useState("products");
  const [newRecordId, setNewRecordId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.getApprovals(filter === "all" ? undefined : filter);
      setApprovals(res.approvals || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const handleReviewSubmit = async () => {
    if (!reviewingItem) return;
    setSubmittingReview(true);
    try {
      await api.reviewApproval({
        id: reviewingItem.item.id,
        status: reviewingItem.action,
        reviewNote: reviewNote.trim() || undefined,
      });
      toast.success(`Request #${reviewingItem.item.id} ${reviewingItem.action} successfully.`);
      setReviewingItem(null);
      setReviewNote("");
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to review request");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) {
      toast.error("Please provide a description of the requested action");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitApproval({
        requestType: newType,
        module: newModule,
        recordId: newRecordId ? Number(newRecordId) : undefined,
        description: newDesc.trim(),
      });
      toast.success("Approval request submitted successfully.");
      setIsSubmitOpen(false);
      setNewDesc("");
      setNewRecordId("");
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit approval request");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "product_deletion":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">🗑️ Product Deletion</span>;
      case "bulk_price_change":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">💰 Bulk Price Change</span>;
      case "large_inventory_adjustment":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">📦 Inventory Adjustment</span>;
      case "large_refund":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">💸 Large Refund</span>;
      case "admin_suspension":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">🚫 Admin Suspension</span>;
      case "permission_escalation":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">⚡ Permission Escalation</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ Approved</span>;
      case "rejected":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">✕ Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">⏳ Pending Review</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h3 className="font-bold text-base text-[#182230]">Administrative Approval Queue</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sensitive actions require authorized multi-admin sign-off. Self-approval is strictly prevented.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold btn-gold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 text-xs">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg capitalize font-bold transition ${
                filter === s
                  ? "bg-white text-[#0b2f8a] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a]"></div>
            <span>Loading approval requests...</span>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No approval requests found in the <strong>{filter}</strong> queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approvals.map((req) => {
              const isRequester = currentUserId && req.requesterId === currentUserId;
              const isPending = req.status === "pending";

              return (
                <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">#{req.id}</span>
                      {getTypeBadge(req.requestType)}
                      {getStatusBadge(req.status)}
                      <span className="text-[10px] text-slate-400">Module: {req.module}</span>
                    </div>

                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {req.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Requester: <strong className="text-slate-700">{req.requesterName}</strong> {isRequester && <span className="text-blue-600 font-bold">(You)</span>}</span>
                      <span>Submitted: {new Date(req.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {req.reviewerName && (
                        <span>Reviewed by: <strong className="text-slate-700">{req.reviewerName}</strong></span>
                      )}
                      {req.reviewNote && (
                        <span className="italic">Note: "{req.reviewNote}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {isRequester ? (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                          ⚠️ Self-Approval Blocked
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setReviewingItem({ item: req, action: "approved" })}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-2xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewingItem({ item: req, action: "rejected" })}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-2xs"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-medium">
                      Resolved {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString("en-IN") : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {reviewingItem.action === "approved" ? "Authorize & Approve Request" : "Reject Approval Request"}
            </h3>
            <p className="text-slate-600 mb-3">
              You are about to mark request <strong>#{reviewingItem.item.id}</strong> ({reviewingItem.item.requestType}) as{" "}
              <strong className={reviewingItem.action === "approved" ? "text-emerald-700" : "text-rose-700"}>
                {reviewingItem.action.toUpperCase()}
              </strong>.
            </p>

            <div className="mb-4">
              <label className="block text-slate-700 font-semibold mb-1">Review Note (Optional)</label>
              <textarea
                rows={2}
                placeholder="Reason or authorization reference..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-none focus:border-[#0b2f8a]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                className={`px-5 py-2 rounded-xl font-bold text-white ${
                  reviewingItem.action === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {submittingReview ? "Processing..." : `Confirm ${reviewingItem.action === "approved" ? "Approval" : "Rejection"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Approval Request Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Submit Action for Approval</h3>
              <button
                type="button"
                onClick={() => setIsSubmitOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Request Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none focus:border-[#0b2f8a]"
                >
                  <option value="product_deletion">Product Deletion</option>
                  <option value="bulk_price_change">Bulk Price Change</option>
                  <option value="large_inventory_adjustment">Large Inventory Adjustment</option>
                  <option value="large_refund">Large Customer Refund</option>
                  <option value="admin_suspension">Admin Suspension</option>
                  <option value="permission_escalation">Permission Escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Record ID (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={newRecordId}
                  onChange={(e) => setNewRecordId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Justification & Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this action is required and any specific values..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#0b2f8a] text-white font-bold hover:bg-[#071c54] disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
