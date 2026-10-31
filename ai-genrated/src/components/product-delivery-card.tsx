"use client";

import { useState, useEffect } from "react";
import { checkDeliveryAvailability, DeliveryCheckResult } from "@/lib/delivery";

export function ProductDeliveryCard() {
  const [pincode, setPincode] = useState("390001");
  const [result, setResult] = useState<DeliveryCheckResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedPin = localStorage.getItem("vsm_delivery_pincode") || "390001";
      setPincode(savedPin);
      setResult(checkDeliveryAvailability(savedPin));
    } catch {
      setResult(checkDeliveryAvailability("390001"));
    }
  }, []);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const clean = pincode.trim().replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Please enter a valid 6-digit Indian PIN code.");
      setResult(null);
      return;
    }
    const res = checkDeliveryAvailability(clean);
    setResult(res);
    try {
      localStorage.setItem("vsm_delivery_pincode", clean);
      localStorage.setItem("vsm_delivery_location", res.city);
    } catch {}
  };

  return (
    <div className="mt-5 rounded-2xl border border-[#3b1e54]/15 bg-[#fff8ee]/60 p-3 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#6b1d1d] flex items-center gap-1.5">
          <span>📍</span>
          <span>Delivery Availability</span>
        </span>
        {result?.city && (
          <span className="text-[10px] sm:text-[10.5px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md truncate max-w-[140px]">
            {result.city}
          </span>
        )}
      </div>

      <form onSubmit={handleCheck} className="flex gap-1.5 sm:gap-2">
        <input
          type="text"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value);
            setError("");
          }}
          placeholder="Enter 6-digit PIN code"
          className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-slate-900 outline-none focus:border-[#6b1d1d] focus:ring-1 focus:ring-[#6b1d1d]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#6b1d1d] text-[#fff8ee] text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#852525] active:scale-95 transition cursor-pointer shrink-0"
        >
          Check
        </button>
      </form>

      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}

      {result && result.isDeliverable && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="font-semibold text-emerald-800 flex items-center gap-1 text-[11px] sm:text-xs">
            <span>✓</span>
            <span>{result.message}</span>
          </p>

          <div className="grid gap-1.5 pt-1">
            {result.options.map((opt, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 p-2 rounded-lg bg-white/90 border border-slate-200/80 text-[11px]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{opt.icon}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{opt.title}</p>
                    <p className="text-slate-500 text-[10px] truncate">{opt.details}</p>
                  </div>
                </div>
                <div className="sm:text-right shrink-0 self-end sm:self-auto">
                  <p className="font-semibold text-emerald-700">{opt.estimatedDelivery}</p>
                  <p className="text-[9.5px] text-slate-500">{opt.feeText}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] sm:text-[10.5px] text-slate-600">
            <span>🛡️ Insulated Fresh Packaging</span>
            <span>✨ 100% Shuddh Desi Ghee</span>
          </div>
        </div>
      )}
    </div>
  );
}

