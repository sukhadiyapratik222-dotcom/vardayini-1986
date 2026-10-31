"use client";

import { useState } from "react";
import { checkDeliveryAvailability, DeliveryCheckResult } from "@/lib/delivery";

export function PincodeDeliveryChecker() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<DeliveryCheckResult | { isDeliverable: false; message: string } | null>(null);

  function checkPincode(e: React.FormEvent) {
    e.preventDefault();
    const clean = pincode.trim().replace(/\D/g, "");

    if (clean.length !== 6) {
      setResult({
        isDeliverable: false,
        message: "Please enter a valid 6-digit Indian PIN code.",
      });
      return;
    }

    const check = checkDeliveryAvailability(clean);
    setResult(check);
    try {
      localStorage.setItem("vsm_delivery_pincode", clean);
      localStorage.setItem("vsm_delivery_location", check.city);
    } catch {}
  }

  return (
    <div className="rounded-2xl bg-white border border-[#3b1e54]/10 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[#b45309]">
        <span>📍</span>
        <span>Delivery Availability Check</span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#24142e]">
        Check Delivery in Your Area
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        Enter your 6-digit postal pincode to view same-day delivery slots and express shipping availability.
      </p>

      <form onSubmit={checkPincode} className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="e.g. 390001 or 380001"
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-[#faf6ee]/40 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:border-[#3b1e54] focus:ring-1 focus:ring-[#3b1e54]"
          />
          {pincode && (
            <button
              type="button"
              aria-label="Clear pincode"
              onClick={() => {
                setPincode("");
                setResult(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          className="btn-purple shrink-0 min-h-[44px] rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs flex items-center justify-center"
        >
          Check Pincode
        </button>
      </form>

      {/* Result Card */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
            result.isDeliverable
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="font-bold flex items-center justify-between text-sm mb-2">
            <span>{result.message}</span>
            {"city" in result && result.city && (
              <span className="text-[10px] font-semibold bg-white/90 px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-900">
                {result.city}
              </span>
            )}
          </div>

          {"options" in result && result.options && result.options.length > 0 && (
            <div className="mt-3 space-y-2 pt-2 border-t border-emerald-200/60">
              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                Available Delivery Options:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {result.options.map((opt, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-white/90 border border-emerald-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <span>{opt.icon}</span>
                          <span>{opt.title}</span>
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{opt.details}</p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                      <span className="font-semibold text-emerald-700">{opt.estimatedDelivery}</span>
                      <span className="text-slate-500 font-medium">{opt.feeText}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
