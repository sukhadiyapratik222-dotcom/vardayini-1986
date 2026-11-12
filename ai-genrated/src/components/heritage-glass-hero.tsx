"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkDeliveryAvailability, DeliveryCheckResult } from "@/lib/delivery";

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

interface HeritageGlassHeroProps {
  onOpenPincodeModal?: () => void;
}

export function HeritageGlassHero({ onOpenPincodeModal }: HeritageGlassHeroProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Vadodara, Gujarat");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState("");
  const [pincodeResult, setPincodeResult] = useState<DeliveryCheckResult | null>(null);
  const [pincodeError, setPincodeError] = useState("");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLoc = localStorage.getItem("vsm_delivery_location");
      const savedPin = localStorage.getItem("vsm_delivery_pincode");
      if (savedLoc) {
        setSelectedLocation(savedPin ? `${savedLoc} (${savedPin})` : savedLoc);
      }
    } catch {}
  }, []);

  // Lock body scroll and listen for Escape key when delivery modal is open
  useEffect(() => {
    if (showDeliveryModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowDeliveryModal(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showDeliveryModal]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
      }
    }
    if (isLocationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLocationDropdownOpen]);

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setPincodeError("");
    const clean = pincodeInput.trim().replace(/\D/g, "");
    if (clean.length !== 6) {
      setPincodeError("Please enter a valid 6-digit Indian PIN code.");
      setPincodeResult(null);
      return;
    }
    const res = checkDeliveryAvailability(clean);
    setPincodeResult(res);
  };

  const applyDeliveryLocation = (locName: string, pin?: string) => {
    const display = pin ? `${locName} (${pin})` : locName;
    setSelectedLocation(display);
    setIsLocationDropdownOpen(false);
    try {
      localStorage.setItem("vsm_delivery_location", locName);
      if (pin) localStorage.setItem("vsm_delivery_pincode", pin);
    } catch {}
  };

  const availableCities = [
    { name: "Vadodara, Gujarat", pincode: "390001", badge: "⚡ Same-Day Delivery" },
    { name: "Ahmedabad, Gujarat", pincode: "380001", badge: "🚚 Next-Day Express" },
    { name: "Surat, Gujarat", pincode: "395001", badge: "🚚 Next-Day Express" },
    { name: "Anand, Gujarat", pincode: "388001", badge: "🚚 Next-Day Express" },
    { name: "All India Delivery", pincode: "", badge: "📦 2-3 Days Fresh-Lock" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    const pinMatch = q.match(/\b\d{6}\b/);
    if (pinMatch) {
      const pin = pinMatch[0];
      const res = checkDeliveryAvailability(pin);
      setPincodeResult(res);
      applyDeliveryLocation(res.city, res.pincode);
      setShowDeliveryModal(true);
      return;
    }
    if (q) {
      router.push(`/shop?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/shop");
    }
  };

  return (
    <section className="relative overflow-visible z-20 bg-gradient-to-b from-[#1a0845] via-[#120430] to-[#0c0220] text-white pt-5 pb-5 sm:pt-6 sm:pb-6 selection:bg-[#f5c518] selection:text-[#171122]">
      {/* ─────────────────────────────────────────────────────────────
          Background Gradients and Radiant Glows
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[360px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-4 left-1/4 w-64 h-64 bg-[#f5c518]/15 rounded-full blur-[85px]" />
        <div className="absolute top-14 right-1/4 w-[280px] h-[280px] bg-[#d946ef]/15 rounded-full blur-[95px]" />
        <div className="absolute bottom-4 left-1/3 w-48 h-48 bg-[#3b1e54]/30 rounded-full blur-[75px]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Floating Decorative Sweets & Snacks (Left Side - Desktop Only)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex absolute left-3 md:left-6 lg:left-8 xl:left-12 top-6 sm:top-8 md:top-12 flex-col gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-5 z-10 pointer-events-none">
        {/* Floating Card 1: Silver Vark Kaju Katli */}
        <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 lg:w-18 lg:h-18 rounded-2xl vardayini-glass-card p-1 sm:p-1.5 animate-float flex items-center justify-center shadow-xl ring-1 ring-white/10">
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 ring-2 ring-white/20">
            <Image
              src="/images/float/kaju-katli.jpg"
              alt="Diamond silver-foiled Kaju Katli"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 44px, (max-width: 1024px) 60px, 72px"
            />
          </div>
        </div>

        {/* Floating Card 2: Traditional Lit Brass Diya */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 lg:w-16 lg:h-16 rounded-2xl vardayini-glass-card p-1 sm:p-1.5 animate-float flex items-center justify-center shadow-xl ml-1 sm:ml-2 ring-1 ring-white/10"
          style={{ animationDelay: "1.5s" }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 ring-2 ring-white/20">
            <Image
              src="/images/float/brass-diya.jpg"
              alt="Traditional Lit Brass Diya"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40px, (max-width: 1024px) 52px, 64px"
            />
          </div>
        </div>

        {/* Floating Card 3: Motichoor Ladoo with Pistachios */}
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 lg:w-18 lg:h-18 rounded-2xl vardayini-glass-card p-1 sm:p-1.5 animate-float flex items-center justify-center shadow-xl ring-1 ring-white/10"
          style={{ animationDelay: "3s" }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 ring-2 ring-white/20">
            <Image
              src="/images/float/motichoor.jpg"
              alt="Pure Desi Ghee Motichoor Ladoo"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 44px, (max-width: 1024px) 60px, 72px"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Floating Decorative Sweets & Snacks (Right Side - Desktop Only)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex absolute right-3 md:right-6 lg:right-8 xl:right-12 top-6 sm:top-8 md:top-12 flex-col gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-5 z-10 pointer-events-none">
        {/* Floating Card 4: Bhavnagari Gathiya / Namkeen */}
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 lg:w-18 lg:h-18 rounded-2xl vardayini-glass-card p-1 sm:p-1.5 animate-float flex items-center justify-center shadow-xl ring-1 ring-white/10"
          style={{ animationDelay: "0.8s" }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 ring-2 ring-white/20">
            <Image
              src="/images/float/gathiya.jpg"
              alt="Crisp Bhavnagari Gathiya"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 44px, (max-width: 1024px) 60px, 72px"
            />
          </div>
        </div>

        {/* Floating Card 5: Crispy Roasted Methi Khakhra */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 lg:w-16 lg:h-16 rounded-2xl vardayini-glass-card p-1 sm:p-1.5 animate-float flex items-center justify-center shadow-xl mr-1 sm:mr-2 ring-1 ring-white/10"
          style={{ animationDelay: "2.2s" }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 ring-2 ring-white/20">
            <Image
              src="/images/float/khakhra.jpg"
              alt="Crispy Roasted Methi Khakhra"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40px, (max-width: 1024px) 52px, 64px"
            />
          </div>
        </div>

        {/* Floating Card 6: Premium Royal Dry Fruit Hamper */}
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 lg:w-18 lg:h-18 rounded-2xl vardayini-glass-card p-1 sm:p-1.5 animate-float flex items-center justify-center shadow-xl ring-1 ring-white/10"
          style={{ animationDelay: "3.7s" }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 ring-2 ring-white/20">
            <Image
              src="/images/float/dryfruits.jpg"
              alt="Assorted Dry Fruits Platter"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 44px, (max-width: 1024px) 60px, 72px"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Central Hero Content (Responsive on all screens down to 320px)
         ───────────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col items-center justify-center px-2.5 sm:px-6 md:px-8 lg:px-12 max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto w-full text-center">
        {/* Small Gold Pill Badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#f5c518]/10 border border-[#f5c518]/30 px-2.5 sm:px-3 py-0.5 rounded-full mb-2 shadow-inner backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f5c518] animate-pulse" />
          <span className="text-[9.5px] sm:text-[11px] font-semibold tracking-wide text-[#f5c518]">
            Since 1976 • 100% Shuddh Desi Ghee
          </span>
        </div>

        {/* Big Headline */}
        <h1 className="font-[family-name:var(--font-display)] text-lg sm:text-2xl md:text-[2rem] lg:text-[2.35rem] font-bold tracking-tight text-white mb-2 leading-[1.18]">
          Order sweets &amp; snacks.
          <br />
          Discover heritage flavours.
          <br />
          <span className="italic text-[#f5c518] drop-shadow-sm font-serif">Vardayini it!</span>
        </h1>

        {/* Subline */}
        <p className="font-[family-name:var(--font-display)] italic text-[11px] sm:text-xs md:text-[13.5px] text-[#f5c518]/90 font-medium mb-3.5 sm:mb-4 max-w-md mx-auto leading-relaxed">
          Tradition Preserved Since 1976 — Pure Desi Ghee, Zero Compromise
        </p>

        {/* ─────────────────────────────────────────────────────────────
            Swiggy-Style Dual Frosted-Glass Search & Location Bar
           ───────────────────────────────────────────────────────────── */}
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl vardayini-glass-card p-1 sm:p-1.5 md:p-2 rounded-2xl md:rounded-full flex flex-col md:flex-row items-center gap-1.5 shadow-2xl mb-4 relative z-30">
          {/* Location Selector */}
          <div ref={locationDropdownRef} className="relative w-full md:w-auto md:max-w-[210px] lg:max-w-[240px] shrink-0">
            <button
              type="button"
              onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-1.5 md:py-2 rounded-xl md:rounded-l-full bg-white/10 hover:bg-white/15 border border-white/15 hover:border-[#f5c518]/50 transition-colors cursor-pointer text-left"
              aria-label={`Deliver to ${selectedLocation} - Select delivery city`}
              aria-expanded={isLocationDropdownOpen}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPinIcon className="w-3.5 h-3.5 text-[#f5c518] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8.5px] text-white/60 font-medium leading-tight">Deliver to</p>
                  <p className="text-[11px] sm:text-xs font-semibold text-white tracking-wide truncate">
                    {selectedLocation}
                  </p>
                </div>
              </div>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 shrink-0 ml-1 ${
                  isLocationDropdownOpen ? "rotate-180 text-[#f5c518]" : ""
                }`}
              />
            </button>

            {/* City Dropdown Menu */}
            {isLocationDropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 mt-2 w-[calc(100vw-24px)] max-w-sm rounded-2xl bg-[#140638]/98 backdrop-blur-2xl border-2 border-[#f5c518]/50 shadow-[0_25px_60px_rgba(0,0,0,0.75)] py-2.5 z-50 text-left overflow-hidden">
                <div className="px-3.5 pb-2 text-[10px] font-bold text-[#f5c518] uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                  <span>📍 Check Delivery Availability</span>
                  <button
                    type="button"
                    onClick={() => setIsLocationDropdownOpen(false)}
                    className="text-white/60 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Direct Pincode Input */}
                <div className="p-3 border-b border-white/10 bg-white/5">
                  <p className="text-[10px] text-white/70 font-medium mb-1.5">
                    Enter your 6-digit postal PIN code:
                  </p>
                  <form onSubmit={handlePincodeCheck} className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={pincodeInput}
                      onChange={(e) => {
                        setPincodeInput(e.target.value);
                        setPincodeError("");
                      }}
                      placeholder="e.g. 382721, 382630, 390001"
                      className="flex-1 bg-white/10 border border-white/20 focus:border-[#f5c518] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-[#f5c518] text-[#140638] font-bold text-[11px] px-3 py-1.5 rounded-xl hover:brightness-105 active:scale-95 transition cursor-pointer shrink-0"
                    >
                      Check
                    </button>
                  </form>

                  {pincodeError && (
                    <p className="mt-1.5 text-[10.5px] text-rose-300 font-medium">
                      {pincodeError}
                    </p>
                  )}

                  {pincodeResult && (
                    <div className="mt-2 p-2 rounded-xl bg-white/10 border border-[#f5c518]/30 text-[10.5px] leading-relaxed">
                      <p className="font-bold text-[#f5c518] flex items-center justify-between">
                        <span>{pincodeResult.city}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f5c518]/20 text-[#f5c518]">
                          {pincodeResult.options[0]?.badge || "Deliverable"}
                        </span>
                      </p>
                      <p className="text-white/80 mt-0.5 text-[10px]">
                        {pincodeResult.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                        <span className="text-[9.5px] text-white/60">
                          {pincodeResult.options[0]?.estimatedDelivery}
                        </span>
                        <button
                          type="button"
                          onClick={() => applyDeliveryLocation(pincodeResult.city, pincodeResult.pincode)}
                          className="bg-[#f5c518] text-[#140638] font-bold text-[10px] px-2.5 py-1 rounded-lg hover:brightness-105 cursor-pointer"
                        >
                          Deliver to {pincodeResult.pincode} ✓
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Popular City Presets */}
                <div className="p-2 space-y-1">
                  <p className="px-2 pt-1 text-[9px] font-semibold text-white/50 uppercase tracking-wider">
                    Or select your delivery region:
                  </p>
                  {availableCities.map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => applyDeliveryLocation(city.name, city.pincode)}
                      className={`w-full px-3 py-2 rounded-xl text-[11px] sm:text-xs flex items-center justify-between transition cursor-pointer ${
                        selectedLocation.includes(city.name)
                          ? "bg-[#f5c518]/25 text-[#f5c518] font-bold border border-[#f5c518]/40"
                          : "text-white hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="truncate mr-2 font-medium">{city.name}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/15 text-[#f5c518] font-semibold whitespace-nowrap shrink-0">
                        {city.badge}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Delivery Options Modal trigger */}
                <div className="p-2 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationDropdownOpen(false);
                      setShowDeliveryModal(true);
                    }}
                    className="w-full text-center py-1.5 text-[10.5px] font-semibold text-[#f5c518] hover:underline cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>View All Delivery Options &amp; Express Slots →</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Input & Explore Button */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 w-full min-w-0 flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl md:rounded-r-full bg-white/10 border border-white/15 focus-within:border-[#f5c518] transition-colors"
          >
            <SearchIcon className="w-3.5 h-3.5 text-white/60 mr-1.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sweets, namkeen, hampers..."
              className="heritage-hero-search-input flex-1 min-w-0 bg-transparent border-none text-white placeholder:text-white/60 text-xs sm:text-sm focus:outline-none focus:ring-0 p-0"
              style={{ background: "transparent", border: 0, boxShadow: "none" }}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#f5c518] to-[#d4a801] hover:brightness-105 active:scale-95 text-[#171122] font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-xl md:rounded-full transition-all shadow-md ml-1.5 shrink-0 cursor-pointer"
            >
              Explore
            </button>
          </form>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            Two Glass Option Cards (Order Online & Gift Hampers)
           ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full text-left max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
          {/* Card 1: Order Online */}
          <Link
            href="/shop"
            className="vardayini-glass-card rounded-2xl p-3.5 sm:p-4 relative overflow-hidden group transition-all duration-300 flex flex-col justify-between min-h-[115px] sm:min-h-[125px] hover:border-[#f5c518]/50 hover:shadow-xl cursor-pointer"
          >
            {/* Visual Image Backdrop on bottom right */}
            <div className="absolute right-0 bottom-0 w-24 sm:w-28 h-24 sm:h-28 opacity-90 group-hover:scale-105 transition-transform duration-500 pointer-events-none rounded-tl-2xl overflow-hidden">
              <Image
                src="/images/float/kaju-katli.jpg"
                alt="Silver-leaf Kaju Katli Sweets"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 96px, 112px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <div className="relative z-10 max-w-[190px] sm:max-w-[220px]">
              <div className="inline-block bg-[#f5c518]/20 text-[#f5c518] text-[8.5px] font-bold px-2 py-0.5 rounded-full border border-[#f5c518]/30 mb-1 tracking-wider">
                FREE DELIVERY ABOVE ₹799
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-white mb-0.5 group-hover:text-[#f5c518] transition-colors tracking-tight">
                ORDER ONLINE
              </h2>
              <p className="text-white/70 text-[9.5px] sm:text-[10.5px] font-medium mb-1.5 tracking-wide">
                FRESH SWEETS &amp; FARSAN
              </p>
            </div>

            <div className="relative z-10 pt-1">
              <span className="inline-flex items-center gap-1 text-white font-semibold text-[10.5px] sm:text-[11.5px] group-hover:text-[#f5c518] transition-colors">
                <span>Explore Sweets</span>
                <span className="flex items-center -space-x-1">
                  <ArrowRightIcon className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform duration-200" />
                  <ArrowRightIcon className="w-2.5 h-2.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </span>
              </span>
            </div>
          </Link>

          {/* Card 2: Gift Hampers */}
          <Link
            href="/festivals"
            className="vardayini-glass-card rounded-2xl p-3.5 sm:p-4 relative overflow-hidden group transition-all duration-300 flex flex-col justify-between min-h-[115px] sm:min-h-[125px] hover:border-[#f5c518]/50 hover:shadow-xl cursor-pointer"
          >
            {/* Visual Image Backdrop on bottom right with smooth mask */}
            <div className="absolute right-0 bottom-0 w-24 sm:w-28 h-24 sm:h-28 opacity-90 group-hover:scale-105 transition-transform duration-500 pointer-events-none rounded-tl-2xl overflow-hidden [mask-image:linear-gradient(to_left,black_60%,transparent_100%)]">
              <Image
                src="/images/float/dryfruits.jpg"
                alt="Festive Mithai & Dry Fruit Hampers"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 96px, 112px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <div className="relative z-10 max-w-[190px] sm:max-w-[220px]">
              <div className="inline-block bg-[#f5c518]/20 text-[#f5c518] text-[8.5px] font-bold px-2 py-0.5 rounded-full border border-[#f5c518]/30 mb-1 tracking-wider">
                UPTO 15% OFF
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-white mb-0.5 group-hover:text-[#f5c518] transition-colors tracking-tight">
                GIFT HAMPERS
              </h2>
              <p className="text-white/70 text-[9.5px] sm:text-[10.5px] font-medium mb-1.5 tracking-wide">
                FESTIVE &amp; CORPORATE BOXES
              </p>
            </div>

            <div className="relative z-10 pt-1">
              <span className="inline-flex items-center gap-1 text-white font-semibold text-[10.5px] sm:text-[11.5px] group-hover:text-[#f5c518] transition-colors">
                <span>Explore Hampers</span>
                <span className="flex items-center -space-x-1">
                  <ArrowRightIcon className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform duration-200" />
                  <ArrowRightIcon className="w-2.5 h-2.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </span>
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Full Delivery Options & Express Availability Modal
         ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          Full Delivery Options & Express Availability Modal (Portaled)
         ───────────────────────────────────────────────────────────── */}
      {mounted &&
        showDeliveryModal &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delivery Options and Coverage"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowDeliveryModal(false)}
          >
            <div
              className="relative w-full max-w-xl max-h-[86vh] rounded-3xl bg-[#140638] border-2 border-[#f5c518]/60 shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-4 sm:p-6 text-left text-white overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pinned Modal Header: Always visible with title and close button */}
              <div className="pb-3 border-b border-white/10 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#f5c518] mb-1">
                    <span>🚚</span>
                    <span>Vardayini Sweets Delivery Services</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Delivery Options &amp; Coverage
                  </h3>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Handcrafted in Vadodara with 100% Shuddh Desi Ghee. Express delivery options to your doorstep:
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="text-white/70 hover:text-white h-9 w-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer shrink-0"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Options List */}
              <div className="flex-1 overflow-y-auto py-3.5 space-y-3 pr-1">
                {/* Option 1: Same-Day Delivery */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 hover:border-[#f5c518]/50 transition">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-[#f5c518] flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>Same-Day Fresh Delivery</span>
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#f5c518] text-[#140638]">
                      Vadodara &amp; Suburbs
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed mb-2">
                    Orders placed before <strong>2:00 PM</strong> are freshly packed warm and delivered by <strong>6:30 PM today</strong>. Available for PIN codes <strong>390xxx</strong> and <strong>391xxx</strong>.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-white/10 text-white/60">
                    <span>Slot choices: 5:00–7:00 PM or 7:00–9:00 PM</span>
                    <span className="text-[#f5c518] font-semibold">FREE on orders over ₹799</span>
                  </div>
                </div>

                {/* Option 2: Next-Day Express */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 hover:border-[#f5c518]/50 transition">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-[#f5c518] flex items-center gap-1.5">
                      <span>🚚</span>
                      <span>Next-Day Express Dispatch</span>
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-[#f5c518]">
                      Across Gujarat
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed mb-2">
                    Delivered in <strong>24–36 hours</strong> via Blue Dart Express in insulated vacuum packaging with ice gel packs. Available for Ahmedabad, Surat, Anand, Rajkot, Bhavnagar, Bharuch, and all Gujarat PIN codes (<strong>36/37/38/39xxxx</strong>).
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-white/10 text-white/60">
                    <span>Dispatched same day if ordered before 3:00 PM</span>
                    <span className="text-[#f5c518] font-semibold">FREE on orders over ₹799</span>
                  </div>
                </div>

                {/* Option 3: Pan-India Delivery */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 hover:border-[#f5c518]/50 transition">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-[#f5c518] flex items-center gap-1.5">
                      <span>📦</span>
                      <span>Pan-India Air Courier (2–3 Days)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-[#f5c518]">
                      All Over India
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed mb-2">
                    Shipped in food-grade vacuum-sealed tin boxes with oxygen scavengers and tamper-evident thermal seals. Delivered to your doorstep anywhere in India within <strong>2 to 3 business days</strong>.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-white/10 text-white/60">
                    <span>Safe for transit • 15+ Days fresh retention</span>
                    <span className="text-[#f5c518] font-semibold">FREE on orders over ₹799</span>
                  </div>
                </div>

                {/* Option 4: Store Pickup */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 hover:border-[#f5c518]/50 transition">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-[#f5c518] flex items-center gap-1.5">
                      <span>🏬</span>
                      <span>Instant In-Store Pickup (Free)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white">
                      Ready in 30 Mins
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed mb-2">
                    Skip the delivery queue and collect your order directly from any of our 3 Vadodara heritage counters:
                  </p>
                  <ul className="text-[11px] text-white/70 space-y-1 list-disc list-inside">
                    <li>Mandvi Heritage Flagship (Near Mandvi Gate, Vadodara)</li>
                    <li>Alkapuri Express Counter (RC Dutt Road, Alkapuri)</li>
                    <li>Karelibaug Royal Outlet (Opp. Mahalaxmi Temple, Karelibaug)</li>
                  </ul>
                  <div className="flex items-center justify-between text-[11px] pt-2 mt-2 border-t border-white/10 text-white/60">
                    <span>Open 8:00 AM – 10:00 PM daily</span>
                    <span className="text-emerald-400 font-semibold">Always ₹0 Free</span>
                  </div>
                </div>
              </div>

              {/* Pinned Modal Footer: Always visible */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] text-white/60 hidden sm:inline">
                  All sweets vacuum-sealed with insulated fresh-lock packs.
                </span>
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="w-full sm:w-auto bg-[#f5c518] text-[#140638] font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl hover:brightness-105 active:scale-95 transition cursor-pointer shadow-md ml-auto"
                >
                  Got It, Thanks!
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
