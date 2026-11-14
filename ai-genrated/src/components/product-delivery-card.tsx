"use client";

import { useState, useEffect } from "react";
import { checkDeliveryAvailability, DeliveryCheckResult } from "@/lib/delivery";

export function ProductDeliveryCard() {
  const [pincode, setPincode] = useState("382721");
  const [result, setResult] = useState<DeliveryCheckResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedPin = localStorage.getItem("vsm_delivery_pincode") || "382721";
      setPincode(savedPin);
      setResult(checkDeliveryAvailability(savedPin));
    } catch {
      setResult(checkDeliveryAvailability("382721"));
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
    <div className="mt-5 rounded-2xl border border-amber-900/15 bg-gradient-to-br from-[#fffdf9] via-[#fbf7ee] to-[#f7f0df]/60 p-3.5 sm:p-4 shadow-xs w-full max-w-full overflow-hidden box-border">
      <div className="flex flex-wrap items-center justify-between mb-2.5 gap-2 min-w-0">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#140638] flex items-center gap-1.5 shrink-0">
          <span className="text-amber-600">📍</span>
          <span>Delivery Availability</span>
        </span>
        {result?.city && (
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300/60 px-2 py-0.5 rounded-md truncate max-w-full">
            {result.city}
          </span>
        )}
      </div>

      <form onSubmit={handleCheck} className="flex items-stretch gap-2 w-full min-w-0">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="Enter 6-digit Pincode (e.g. 382721)"
          className="flex-1 min-w-0 rounded-xl border border-amber-900/20 bg-white px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#dfb755] focus:ring-2 focus:ring-[#dfb755]/25 shadow-xs"
        />
        <button
          type="submit"
          className="shrink-0 px-4 py-2 sm:py-2.5 rounded-xl bg-[#140638] text-[#dfb755] hover:bg-[#250d54] text-xs font-bold tracking-wide transition active:scale-95 flex items-center justify-center cursor-pointer shadow-xs whitespace-nowrap"
        >
          Check
        </button>
      </form>

      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}

      {result && result.isDeliverable && (
        <div className="mt-3 space-y-2 text-xs min-w-0">
          <p className="font-semibold text-emerald-800 flex items-center gap-1.5 text-[11px] sm:text-xs min-w-0">
            <span className="shrink-0">✓</span>
            <span className="break-words">{result.message.replace(/^[✓✔]\s*/, "")}</span>
          </p>

          <div className="grid gap-1.5 pt-1 min-w-0">
            {result.options.map((opt, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 p-2.5 rounded-xl bg-white/95 border border-amber-900/10 text-[11px] shadow-2xs min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
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

          <div className="mt-2.5 pt-2 border-t border-amber-900/10 flex items-center justify-between text-[10px] sm:text-[10.5px] text-slate-600 min-w-0 flex-wrap gap-1">
            <span>🛡️ Insulated Fresh Packaging</span>
            <span>✨ 100% Shuddh Desi Ghee</span>
          </div>
        </div>
      )}
    </div>
  );
}

