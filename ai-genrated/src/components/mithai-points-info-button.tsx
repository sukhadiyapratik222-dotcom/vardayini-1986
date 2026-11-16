"use client";

import { useState } from "react";

export function MithaiPointsInfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#0b2f8a]/30 bg-white hover:bg-[#0b2f8a]/5 text-[#0b2f8a] text-xs font-bold px-4 py-2 text-center transition shadow-xs cursor-pointer"
      >
        <span>💡</span>
        <span>How to Get Points?</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-[#dfb755]/30 space-y-3.5 max-h-[92vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2a1a12]/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-lg text-amber-700">
                  🍯
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[#6b1d1d]">
                    How to Get Mithai Points
                  </h3>
                  <p className="text-[11px] text-[#2a1a12]/60">
                    Vardayini Sweet Mart Royal Loyalty Program
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-full bg-[#2a1a12]/5 hover:bg-[#2a1a12]/10 text-[#2a1a12]/60 hover:text-[#2a1a12] flex items-center justify-center text-xs font-bold transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Steps & Info */}
            <div className="space-y-2.5 text-xs text-[#2a1a12]/80">
              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-[11px]">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-xs text-[#6b1d1d]">Order Sweets & Farsan</h4>
                  <p className="mt-0.5 text-[11px] text-[#2a1a12]/75 leading-relaxed">
                    Earn <strong>1 Mithai Point for every ₹20 spent</strong> on any order, whether home delivery across Gujarat or pickup at our Kalol Flagship Store.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0b2f8a] text-white font-bold text-[11px]">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-xs text-[#0b2f8a]">Automatic Credit to Your Account</h4>
                  <p className="mt-0.5 text-[11px] text-[#2a1a12]/75 leading-relaxed">
                    No code needed! Points automatically credit to your verified mobile number or email account as soon as your order is confirmed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-xs text-emerald-900">Redeem for Instant Cash Discounts</h4>
                  <p className="mt-0.5 text-[11px] text-[#2a1a12]/75 leading-relaxed">
                    Redemption rate: <strong className="text-emerald-800">1,000 Points = ₹100 Discount</strong>. Apply your points toward Kaju Katli, Mawa Pedas, or festival gift hampers.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#2a1a12]/10 bg-[#faf8f5] p-3 space-y-1.5">
                <p className="font-bold text-[#6b1d1d] text-xs flex items-center gap-1.5">
                  <span>🎁</span> Extra Ways to Earn Bonus Points:
                </p>
                <ul className="space-y-1 pl-4 list-disc text-[11px] text-[#2a1a12]/70">
                  <li><strong>Welcome Bonus:</strong> 10% off welcome code on your first sweet order.</li>
                  <li><strong>Complete Profile:</strong> Save your verified name and delivery addresses for express 1-click dispatch.</li>
                  <li><strong>Festive Pre-Orders:</strong> Exclusive double point events during Diwali, Raksha Bandhan, and Ganesh Utsav.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-auto rounded-full bg-[#0b2f8a] hover:bg-[#082266] text-white text-xs font-bold px-5 py-2 transition shadow-sm cursor-pointer"
              >
                Got it, Thank You! ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
