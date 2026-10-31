"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Need to change delivery address or delivery slot",
  "Delivery slot is too late",
  "Want to change items or add more mithai/farsan",
  "Found an alternative / plan changed",
  "Other reason",
];

interface CancelOrderButtonProps {
  orderNumber: string;
  initialStatus?: string;
}

export function CancelOrderButton({ orderNumber, initialStatus }: CancelOrderButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(initialStatus === "cancelled");
  const [successMessage, setSuccessMessage] = useState("");

  if (cancelled) {
    return (
      <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
        <span className="text-base shrink-0">🛑</span>
        <div>
          <p className="font-bold">Order Cancelled</p>
          <p className="text-rose-600 mt-0.5">
            This order has been cancelled and store management has been notified.
          </p>
        </div>
      </div>
    );
  }

  async function handleConfirmCancel() {
    if (!agreedToRules) {
      setError("Please check the box to confirm you agree to the cancellation policy.");
      return;
    }

    setLoading(true);
    setError("");

    const fullReason =
      selectedReason === "Other reason" && customReason.trim()
        ? `Other: ${customReason.trim()}`
        : selectedReason;

    try {
      const guestToken =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("token")
          : null;

      const cancelUrl = guestToken
        ? `/api/orders/${orderNumber}/cancel?token=${encodeURIComponent(guestToken)}`
        : `/api/orders/${orderNumber}/cancel`;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (guestToken) {
        headers["x-guest-token"] = guestToken;
      }

      const res = await fetch(cancelUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: fullReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If order was already cancelled, treat gracefully
        if (data?.isAlreadyCancelled || data?.error?.toLowerCase().includes("already cancelled")) {
          setCancelled(true);
          setIsOpen(false);
          router.refresh();
          return;
        }
        setError(data?.error || "Could not cancel order. Please contact customer support.");
        return;
      }

      setCancelled(true);
      setSuccessMessage(
        "Order successfully cancelled! Store administration and the kitchen desk have been notified."
      );
      setIsOpen(false);
      router.refresh();
    } catch {
      setError("Failed to cancel order due to a network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {successMessage ? (
        <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          ✅ {successMessage}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        disabled={loading}
        className="rounded-full border border-[#6b1d1d]/30 text-[#6b1d1d] hover:text-white hover:bg-[#6b1d1d] px-4 py-2 text-xs font-semibold tracking-wide transition duration-150 disabled:opacity-50 cursor-pointer shadow-xs"
      >
        Cancel Order
      </button>

      {/* Cancellation Rules & Confirmation Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-hidden text-slate-800 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl shrink-0 font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cancel Order #{orderNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Please read our rules &amp; regulations before confirming
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !loading && setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Rules and Regulations Box */}
            <div className="mt-4 p-4 rounded-2xl bg-[#fff8ee] border border-[#f3d2a2] text-[#4a2e12]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9a4214] mb-2 flex items-center gap-1.5">
                <span>📋</span> Vardayini Sweet Mart Cancellation Policy
              </h4>
              <ul className="text-xs space-y-2 text-[#5a3a1a] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#c45c26] font-bold">1.</span>
                  <span>
                    <strong>Fresh Preparation Policy:</strong> All sweets and farsan are prepared fresh on order. Cancellation is allowed only before dispatch.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#c45c26] font-bold">2.</span>
                  <span>
                    <strong>Instant Kitchen &amp; Admin Dispatch:</strong> Once you confirm, an immediate high-priority notification will be sent to the Admin Desk and dispatch team to stop preparation.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#c45c26] font-bold">3.</span>
                  <span>
                    <strong>Refund Terms:</strong> Cash on Delivery (COD) orders require ₹0 payment. Online pre-paid orders will receive a 100% full refund back to the original payment source within 2–4 business days.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#c45c26] font-bold">4.</span>
                  <span>
                    <strong>Irreversible Action:</strong> Once cancelled, this order cannot be reopened. You would need to place a fresh order if needed.
                  </span>
                </li>
              </ul>
            </div>

            {/* Reason Selection */}
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                disabled={loading}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#c45c26] focus:ring-1 focus:ring-[#c45c26]"
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {selectedReason === "Other reason" && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  rows={2}
                  disabled={loading}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:border-[#c45c26] focus:ring-1 focus:ring-[#c45c26]"
                />
              )}
            </div>

            {/* Checkbox agreement */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#6b1d1d] focus:ring-[#6b1d1d]"
                />
                <span>
                  I have read and confirm I agree to the cancellation rules &amp; regulations.
                  Please send notification to the store administration and cancel my order.
                </span>
              </label>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
              >
                Keep My Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={loading || !agreedToRules}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin text-sm">⏳</span>
                    Cancelling &amp; Notifying Admin...
                  </>
                ) : (
                  "Confirm & Cancel Order"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
