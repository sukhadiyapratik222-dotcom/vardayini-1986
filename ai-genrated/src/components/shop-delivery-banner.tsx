"use client";

import { useState, useEffect } from "react";
import { checkDeliveryAvailability, DeliveryCheckResult } from "@/lib/delivery";

export function ShopDeliveryBanner() {
  const [locationName, setLocationName] = useState("Vadodara, Gujarat");
  const [pincode, setPincode] = useState("390001");
  const [result, setResult] = useState<DeliveryCheckResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputPin, setInputPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem("vsm_delivery_location") || "Vadodara, Gujarat";
      const savedPin = localStorage.getItem("vsm_delivery_pincode") || "390001";
      setLocationName(savedLoc);
      setPincode(savedPin);
      setResult(checkDeliveryAvailability(savedPin));
    } catch {
      setResult(checkDeliveryAvailability("390001"));
    }
  }, []);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const clean = inputPin.trim().replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Please enter a valid 6-digit Indian PIN code.");
      return;
    }
    const res = checkDeliveryAvailability(clean);
    setResult(res);
    setPincode(clean);
    setLocationName(res.city);
    try {
      localStorage.setItem("vsm_delivery_pincode", clean);
      localStorage.setItem("vsm_delivery_location", res.city);
    } catch {}
    setIsOpen(false);
  };

  const primaryOption = result?.options[0];

  return (
    <div className="relative mb-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-[#140638] to-[#250d4f] px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs text-white shadow-sm border border-[#f5c518]/30">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-sm sm:text-base shrink-0">📍</span>
          <div className="min-w-0">
            <span className="text-white/70 text-[11px] sm:text-xs">Delivering to: </span>
            <span className="font-bold text-[#f5c518] text-[11px] sm:text-xs truncate">
              {locationName} {pincode ? `(${pincode})` : ""}
            </span>
          </div>
          {primaryOption && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#f5c518]">
              {primaryOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden md:inline text-[11px] text-white/80">
            {primaryOption ? primaryOption.estimatedDelivery : "Same-day & Express available"}
          </span>
          <button
            type="button"
            onClick={() => {
              setInputPin(pincode);
              setIsOpen((prev) => !prev);
            }}
            className="rounded-lg bg-[#f5c518] px-2 sm:px-2.5 py-1 text-[10.5px] sm:text-[11px] font-bold text-[#140638] hover:brightness-105 active:scale-95 transition cursor-pointer"
          >
            Check PIN
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-40 w-[calc(100vw-24px)] max-w-xs sm:w-80 rounded-2xl bg-[#140638] p-3.5 sm:p-4 text-white shadow-2xl border-2 border-[#f5c518]/50 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#f5c518] uppercase tracking-wider">
              Change Delivery Location
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-white/70 mb-2.5">
            Enter your 6-digit postal PIN code to see available delivery slots &amp; shipping speed:
          </p>
          <form onSubmit={handleCheck} className="flex gap-1.5">
            <input
              type="text"
              maxLength={6}
              value={inputPin}
              onChange={(e) => {
                setInputPin(e.target.value);
                setError("");
              }}
              placeholder="e.g. 390001, 380001"
              className="flex-1 rounded-xl bg-white/10 border border-white/20 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#f5c518]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#f5c518] px-3 py-1.5 text-xs font-bold text-[#140638] hover:brightness-105 cursor-pointer"
            >
              Apply
            </button>
          </form>
          {error && <p className="mt-1 text-[10.5px] text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}

