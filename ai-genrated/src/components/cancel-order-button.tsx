"use client";

import Link from "next/link";
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg sm:max-w-xl w-full shadow-2xl border border-slate-200/90 text-slate-800 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* 1. STICKY MODAL HEADER (ALWAYS VISIBLE) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl shrink-0 font-bold shadow-2xs">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Cancel Order #{orderNumber}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review Vardayini cancellation &amp; refund guidelines
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !loading && setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition cursor-pointer"
                aria-label="Close dialog"
              >
                <span className="text-lg leading-none block">✕</span>
              </button>
            </div>

            {/* 2. SCROLLABLE CONTENT BODY WITH SLEEK SCROLLBAR */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 custom-modal-scroll">
              {/* Rules and Regulations Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#fffbf2] to-[#fff6e6] border border-[#f3d2a2]/80 text-[#4a2e12] shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3d2a2]/60 pb-2.5 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9a4214] flex items-center gap-1.5">
                    <span>📋</span> Vardayini Sweet Mart Cancellation Policy
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                    <span>✓</span> FSSAI Certified
                  </span>
                </div>

                <ul className="text-xs space-y-2.5 text-[#5a3a1a] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-base leading-none shrink-0 mt-0.5">🌿</span>
                    <div>
                      <strong className="text-[#9a4214]">Fresh Perishable Sweets &amp; FSSAI Norms:</strong> All sweets and farsan are prepared fresh daily using 100% Shuddh Desi Ghee. In accordance with FSSAI hygiene standards, cancellation is permitted <strong>only before dispatch / counter packaging</strong>. Once dispatched or collected, perishable food cannot be cancelled or returned.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-base leading-none shrink-0 mt-0.5">⏱️</span>
                    <div>
                      <strong className="text-[#9a4214]">Cancellation Window:</strong> You can cancel directly from your order page while status is <strong>Confirmed</strong> or <strong>Preparing</strong>. Once dispatched or out for delivery, cancellations are closed.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-base leading-none shrink-0 mt-0.5">💰</span>
                    <div>
                      <strong className="text-[#9a4214]">100% Refund Terms:</strong>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 pl-1 text-[11px] text-slate-700">
                        <li><strong>Cash on Delivery (COD):</strong> ₹0 payment required; order is cancelled with zero cancellation fees.</li>
                        <li><strong>Prepaid (UPI / Cards / Net Banking):</strong> 100% full refund is initiated automatically back to your original source within <strong>2–4 business days</strong>.</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-base leading-none shrink-0 mt-0.5">⚡</span>
                    <div>
                      <strong className="text-[#9a4214]">Instant Kitchen Alert &amp; Restock:</strong> Once confirmed, an automated high-priority alert is sent to our Kalol Halwai kitchen to stop packing, and item stock is immediately restored.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-base leading-none shrink-0 mt-0.5">📦</span>
                    <div>
                      <strong className="text-[#9a4214]">Damaged Parcel Guarantee:</strong> If your package arrives damaged or with a broken seal, share photo proof within 6 hours on WhatsApp (+91 88661 69447) for an immediate free replacement.
                    </div>
                  </li>
                </ul>

                <div className="mt-3 pt-2.5 border-t border-[#f3d2a2]/60 flex items-center justify-between text-[11px]">
                  <Link
                    href="/policies?tab=cancellation"
                    target="_blank"
                    className="text-[#9a4214] font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Read Complete Store Policies</span>
                    <span>↗</span>
                  </Link>
                  <span className="text-[#7a5528]">Kalol, Gujarat · Est. 1976</span>
                </div>
              </div>

              {/* Reason Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={loading}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#c45c26] focus:ring-1 focus:ring-[#c45c26] cursor-pointer"
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
                    placeholder="Please specify the reason in detail..."
                    rows={2}
                    disabled={loading}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:border-[#c45c26] focus:ring-1 focus:ring-[#c45c26]"
                  />
                )}
              </div>

              {/* Checkbox agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none bg-slate-50 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={agreedToRules}
                    onChange={(e) => setAgreedToRules(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-700 focus:ring-rose-600 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    I have read and confirm I agree to the <strong>cancellation &amp; refund policy</strong>.
                    Please send immediate notification to the store administration and cancel my order.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* 3. STICKY MODAL FOOTER (ALWAYS VISIBLE & PROMINENT) */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/95 rounded-b-3xl flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              >
                Keep My Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={loading || !agreedToRules}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
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
