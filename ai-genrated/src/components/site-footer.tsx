"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface SiteFooterProps {
  initialConfig?: any;
}

export function SiteFooter({ initialConfig }: SiteFooterProps = {}) {
  const [uiConfig, setUiConfig] = useState<any>(initialConfig || null);
  const [currentTheme, setCurrentTheme] = useState<"warm-cream" | "classic">("warm-cream");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const readTheme = () => {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlTheme = params.get("ui") || params.get("theme");
          if (urlTheme === "classic" || urlTheme === "warm-cream") {
            setCurrentTheme(urlTheme);
            return;
          }
        }
        const saved = localStorage.getItem("vsm_ui_design_theme");
        if (saved === "classic" || saved === "warm-cream") {
          setCurrentTheme(saved);
        }
      } catch {}
    };

    readTheme();
    window.addEventListener("vsm_ui_theme_change", readTheme);
    window.addEventListener("storage", readTheme);
    return () => {
      window.removeEventListener("vsm_ui_theme_change", readTheme);
      window.removeEventListener("storage", readTheme);
    };
  }, []);

  const handleToggleUi = () => {
    const nextTheme = currentTheme === "warm-cream" ? "classic" : "warm-cream";
    setCurrentTheme(nextTheme);
    try {
      localStorage.setItem("vsm_ui_design_theme", nextTheme);
      window.dispatchEvent(new Event("vsm_ui_theme_change"));
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = `/?ui=${nextTheme}`;
      }
    } catch {}
  };

  useEffect(() => {
    fetch("/api/ui-config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setUiConfig(data);
        }
      })
      .catch(() => {});
  }, []);

  const sweetsMenu = [
    { label: "Kaju Sweets", href: "/shop?category=kaju-sweets" },
    { label: "Mawa Sweets", href: "/shop?category=mawa-sweets" },
    { label: "Penda", href: "/shop?search=penda" },
    { label: "Sugarless Sweets", href: "/shop?category=sugarless-sweets" },
    { label: "Gift Hampers", href: "/shop?category=gift-hampers" },
    { label: "Indian Ghee Sweets", href: "/shop?category=indian-ghee-sweets" },
  ];

  const namkeenMenu = [
    { label: "Gujarati Farsan", href: "/shop?category=namkeen-farsan" },
    { label: "Millet", href: "/shop?category=millet" },
    { label: "Farali", href: "/shop?category=farali" },
    { label: "Khakhra", href: "/shop?category=khakhra" },
    { label: "Roasted", href: "/shop?category=roasted" },
    { label: "Mixture", href: "/shop?category=mixture" },
    { label: "Indian", href: "/shop?category=indian" },
    { label: "Daal/Lentil", href: "/shop?category=daal-lentil" },
    { label: "Sev", href: "/shop?category=sev" },
    { label: "Chips and Puris", href: "/shop?category=chips-and-puris" },
  ];

  const bakeryMenu = [
    { label: "Biscuits and Cookies", href: "/shop?category=biscuits-and-cookies" },
    { label: "Toast and Khari", href: "/shop?category=toast-and-khari" },
  ];

  const policiesMenu = [
    { label: "Terms & Conditions", href: "/policies?tab=terms" },
    { label: "Shipping Policy (Free > ₹799)", href: "/policies?tab=shipping" },
    { label: "Privacy Policy", href: "/policies?tab=privacy" },
    { label: "Cancellation Policy", href: "/policies?tab=cancellation" },
    { label: "Returns Policy", href: "/policies?tab=returns" },
    { label: "Refund Policy", href: "/policies?tab=refund" },
  ];

  return (
    <footer className="mt-14 sm:mt-20 border-t border-[#0b2f8a]/10 bg-[#071c54] text-white">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-8 sm:pb-12 space-y-8 sm:space-y-12">
        {/* Top Tier: Brand Story & Visit Our Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-8 sm:pb-10 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              {uiConfig?.logo?.type === "image" && uiConfig?.logo?.imageUrl ? (
                <div className="relative h-12 w-12 rounded-full overflow-hidden border border-[#dfb755]/70 shadow-md shrink-0 bg-white">
                  <img
                    src={uiConfig.logo.imageUrl}
                    alt={uiConfig.logo.brandName || "Logo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full shadow-md font-bold text-xl shrink-0"
                  style={{
                    backgroundColor: uiConfig?.logo?.crestBgColor || "#dfb755",
                    color: uiConfig?.logo?.crestTextColor || "#071c54",
                    border: uiConfig?.logo?.crestBorderColor
                      ? `2px solid ${uiConfig.logo.crestBorderColor}`
                      : "none",
                  }}
                >
                  {uiConfig?.logo?.crestLetter || "વ"}
                </div>
              )}
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {uiConfig?.storeInfo?.name || "વરદાયિની સ્વીટ માર્ટ"}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-[#dfb755] font-semibold">
                  {uiConfig?.logo?.brandSubtitle ||
                    `${uiConfig?.logo?.brandName || "Vardayini Sweet Mart"} · Since ${
                      uiConfig?.storeInfo?.established || "1976"
                    }`}
                </p>
              </div>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-white/75">
              {uiConfig?.storeInfo?.tagline ||
                "Authentic Gujarati mithai and fresh morning farsan from Vadodara. Pure shuddh desi ghee, saffron, and patience — rolled and packed fresh for our customers."}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#dfb755] font-medium pt-1">
              <span>✓ 100% Desi Ghee</span>
              <span>•</span>
              <span>✓ FSSAI Certified</span>
              <span>•</span>
              <span>✓ Made Fresh Daily</span>
            </div>
          </div>

          {/* Visit Our Stores & Contact */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dfb755]">
              Visit Our Store &amp; Orders
            </p>
            <div className="space-y-2.5 text-sm text-white/80 leading-relaxed">
              <div>
                <p className="font-semibold text-white">
                  {uiConfig?.storeInfo?.city ? `${uiConfig.storeInfo.city} Counter` : "Mandvi Main Counter & Flagship"}
                </p>
                <p className="text-xs text-white/70 mt-0.5 leading-normal">
                  {uiConfig?.storeInfo?.address || "Mandvi Main Counter & Alkapuri Flagship, Vadodara, Gujarat 390001"}
                </p>
              </div>
              <div className="pt-1 space-y-1.5 border-t border-white/10">
                <p className="text-xs text-[#dfb755] font-medium flex items-center gap-1.5">
                  <span>🕒</span>
                  <span>Open {uiConfig?.storeInfo?.hours || "7:00 AM – 8:30 PM (All 7 Days)"}</span>
                </p>
                <div className="text-xs text-white/80 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {uiConfig?.storeInfo?.phone && (
                    <span className="flex items-center gap-1">
                      <span>📞</span>
                      <span>Support:</span>
                      <a
                        href={`tel:${uiConfig.storeInfo.phone}`}
                        className="text-white font-semibold hover:text-[#dfb755] transition underline underline-offset-2"
                      >
                        {uiConfig.storeInfo.phone}
                      </a>
                    </span>
                  )}
                  {uiConfig?.storeInfo?.whatsapp && (
                    <span className="flex items-center gap-1">
                      <span>💬</span>
                      <span>WhatsApp:</span>
                      <a
                        href={`https://wa.me/${uiConfig.storeInfo.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 font-semibold hover:underline"
                      >
                        {uiConfig.storeInfo.whatsapp}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explore Categories Menu */}
        <div>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
            {/* Column 1: Sweets */}
            <div>
              <h3 className="font-bold text-lg text-white">Sweets</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {sweetsMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Namkeen */}
            <div>
              <h3 className="font-bold text-lg text-white">Namkeen</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {namkeenMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Bakery */}
            <div>
              <h3 className="font-bold text-lg text-white">Bakery</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {bakeryMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Policies */}
            <div>
              <h3 className="font-bold text-lg text-white">Policies</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {policiesMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Line */}
      <div className="gold-line" />

      {/* Bottom Copyright Bar with Change UI Button */}
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5 text-xs text-white/60">
        <p>
          © {uiConfig?.storeInfo?.established || "1976"} – {new Date().getFullYear()}{" "}
          {uiConfig?.storeInfo?.name || "Vardayini Sweet Mart"}. All rights reserved.
        </p>

        {/* Change UI Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleUi}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-[#dfb755]/50 hover:border-[#dfb755] text-white text-[11px] font-semibold shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
            title="Toggle between 2026 Warm Cream Edition and Classic Royal Navy UI"
            aria-label="Change Homepage UI Design"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#dfb755] text-[#071c54] text-[10px] font-bold shadow-xs transition-transform group-hover:rotate-180 duration-300">
              ⚡
            </span>
            <span>
              UI:{" "}
              <strong className="text-[#dfb755]">
                {mounted && currentTheme === "classic" ? "Classic Royal Navy" : "2026 Warm Cream"}
              </strong>
            </span>
            <span className="ml-1 text-[10px] text-white/70 bg-white/10 px-1.5 py-0.5 rounded-full border border-white/10 group-hover:text-white transition">
              Change UI ⇄
            </span>
          </button>
        </div>

        <p className="text-center sm:text-right">
          Handcrafted with pure devotion in {uiConfig?.storeInfo?.city || "Gujarat"}.
        </p>
      </div>
    </footer>
  );
}
