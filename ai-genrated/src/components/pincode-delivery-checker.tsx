"use client";

import { useState } from "react";

export function PincodeDeliveryChecker() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<{
    status: "success" | "warning" | "error" | null;
    message: string;
    details?: string;
    city?: string;
  }>({ status: null, message: "" });

  function checkPincode(e: React.FormEvent) {
    e.preventDefault();
    const clean = pincode.trim().replace(/\D/g, "");

    if (clean.length !== 6) {
      setResult({
        status: "error",
        message: "Please enter a valid 6-digit Indian PIN code.",
      });
      return;
    }

    // Vadodara City PIN codes (390xxx)
    if (clean.startsWith("390") || clean.startsWith("391")) {
      setResult({
        status: "success",
        city: "Vadodara City & Suburbs",
        message: "⚡ Same-Day Fresh Dispatch Available!",
        details:
          "Orders placed before 2:00 PM are packed warm and delivered by 6:30 PM today. Free shipping on orders over ₹799.",
      });
      return;
    }

    // Gujarat state (36xxxx, 37xxxx, 38xxxx, 39xxxx)
    if (
      clean.startsWith("36") ||
      clean.startsWith("37") ||
      clean.startsWith("38") ||
      clean.startsWith("39")
    ) {
      setResult({
        status: "success",
        city: "Gujarat Express Hub",
        message: "✓ Next-Day Express Delivery Available",
        details:
          "Dispatched directly via Blue Dart Express in insulated vacuum boxes. Delivered in 24–36 hours.",
      });
      return;
    }

    // Rest of India
    setResult({
      status: "success",
      city: "National Delivery",
      message: "✓ Pan-India Delivery Available (2–3 Days)",
      details:
        "Shipped in food-safe vacuum-sealed tin boxes with temperature protection. Free shipping on orders over ₹799.",
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-[#3b1e54]/10 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[#d97706]">
        <span>📍</span>
        <span>Delivery Availability Check</span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#24142e]">
        Check Delivery in Your Area
      </h3>
      <p className="mt-1 text-xs text-slate-500">
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
            className="w-full rounded-xl border border-slate-200 bg-[#faf6ee]/40 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:border-[#3b1e54] focus:ring-1 focus:ring-[#3b1e54]"
          />
          {pincode && (
            <button
              type="button"
              onClick={() => {
                setPincode("");
                setResult({ status: null, message: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          className="btn-purple shrink-0 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
        >
          Check Pincode
        </button>
      </form>

      {/* Result Card */}
      {result.status && (
        <div
          className={`mt-3.5 p-3.5 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
            result.status === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>{result.message}</span>
            {result.city && (
              <span className="text-[10px] font-semibold bg-white/80 px-2 py-0.5 rounded-md border border-emerald-300">
                {result.city}
              </span>
            )}
          </div>
          {result.details && <p className="mt-1 text-slate-600">{result.details}</p>}
        </div>
      )}
    </div>
  );
}
