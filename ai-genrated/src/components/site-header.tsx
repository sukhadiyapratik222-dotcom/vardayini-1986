"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Me = { id: number; name: string; role: string } | null;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<Me>(null);
  const [open, setOpen] = useState(false);

  const FALLBACK_CONFIG = {
    announcement: {
      enabled: true,
      text: "Free delivery on orders above ₹799 • Use code FESTIVE15 for 15% off orders above ₹999",
      badge: "FESTIVE SPECIAL",
      linkText: "Order Hampers →",
      linkUrl: "/shop?category=gift-hampers",
    },
    storeInfo: {
      city: "Vadodara, Gujarat",
      established: "1976",
      phone: "+91 98250 19760",
    },
  };

  const [uiConfig, setUiConfig] = useState<any>(FALLBACK_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/ui-config")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setUiConfig(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setConfigLoaded(true);
      });
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setCount(data.count || 0))
      .catch(() => setCount(0));
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("search");
      if (q) {
        setTimeout(() => setQuery(q), 0);
      }
    }
  }, [pathname]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop");
    setOpen(false);
  }

  function toggleGlobalUiDesign() {
    try {
      const current = localStorage.getItem("vsm_ui_design_theme") || "warm-cream";
      const next = current === "warm-cream" ? "classic" : "warm-cream";
      localStorage.setItem("vsm_ui_design_theme", next);
      window.location.reload();
    } catch {
      // ignore
    }
  }

  const navLinks = [
    { href: "/shop", label: "All Items" },
    {
      href: "/new-products",
      label: "New Launches",
      icon: "✨",
      isSpecial: true,
    },
    {
      href: "/festivals",
      label: "Festive Season",
      icon: "🪔",
    },
    { href: "/shop?group=sweets", label: "Sweets" },
    { href: "/shop?category=namkeen-farsan", label: "Namkeen & Farsan" },
    { href: "/shop?group=bakery", label: "Bakery" },
    { href: "/stores", label: "Stores" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#0b2f8a]/10 bg-[#fdfcfa]/95 backdrop-blur-md shadow-sm">
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {configLoaded && uiConfig?.announcement?.enabled !== false && (
        <div className="bg-[#0b1b4f] text-white border-b border-[#dfb755]/20">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
            <p className="hidden sm:block text-slate-300 font-light truncate">
              {uiConfig.storeInfo?.city || "Vadodara, Gujarat"} · Since{" "}
              {uiConfig.storeInfo?.established || "1976"} · 100% Shuddh Desi Ghee
            </p>
            <div className="mx-auto sm:mx-0 text-center font-medium tracking-wide text-[#dfb755] truncate px-2 flex items-center justify-center gap-2">
              <span>
                {uiConfig.announcement?.text ||
                  "Free delivery on orders above ₹799 • Use code FESTIVE15 for 15% off orders above ₹999"}
              </span>
              {uiConfig.announcement?.linkUrl && uiConfig.announcement?.linkText ? (
                <Link
                  href={uiConfig.announcement.linkUrl}
                  className="underline hover:text-white transition ml-1 shrink-0"
                >
                  {uiConfig.announcement.linkText}
                </Link>
              ) : null}
            </div>
            <div className="hidden sm:flex items-center gap-4 text-slate-300 shrink-0">
              <span>Call: {uiConfig.storeInfo?.phone || "+91 98250 19760"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN NAVBAR: Balanced 3-Column Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between gap-4 lg:gap-8">
          {/* Left: Brand Crest & Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            {uiConfig.logo?.type === "image" && uiConfig.logo?.imageUrl ? (
              <div className="relative h-11 w-11 rounded-full overflow-hidden border border-[#dfb755]/60 shadow-sm transition group-hover:scale-105">
                <img
                  src={uiConfig.logo.imageUrl}
                  alt={uiConfig.logo.brandName || "Logo"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="relative flex h-11 w-11 items-center justify-center rounded-full p-0.5 shadow-sm transition group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${
                    uiConfig.logo?.crestBorderColor || "#dfb755"
                  }, #b89130)`,
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-full text-white"
                  style={{
                    backgroundColor: uiConfig.logo?.crestBgColor || "#0b2f8a",
                  }}
                >
                  <span
                    className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight"
                    style={{
                      color: uiConfig.logo?.crestTextColor || "#dfb755",
                    }}
                  >
                    {uiConfig.logo?.crestLetter || "વ"}
                  </span>
                </div>
              </div>
            )}
            <div className="text-left">
              <span className="block font-[family-name:var(--font-display)] text-xl lg:text-2xl font-bold leading-none tracking-tight text-[#0b2f8a]">
                {uiConfig.logo?.brandName || "VARDAYINI"}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b89130]">
                {uiConfig.logo?.brandSubtitle ||
                  `Sweet Mart · ${uiConfig.storeInfo?.established || "1976"}`}
              </span>
            </div>
          </Link>

          {/* Center: Navigation Links (Fluid responsive spacing) */}
          <nav className="hidden xl:flex items-center gap-1 2xl:gap-1.5 text-xs font-semibold text-[#182230]/85">
            {navLinks.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              if (item.isSpecial) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#dfb755]/15 border border-[#dfb755]/50 text-[#0b2f8a] font-bold text-xs hover:bg-[#dfb755]/25 transition whitespace-nowrap shadow-xs ml-0.5"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2 py-1.5 rounded-lg transition whitespace-nowrap hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5 ${
                    isActive ? "text-[#0b2f8a] font-bold bg-[#0b2f8a]/5" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search Bar & Utilities */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Input on Extra Large Screens */}
            <form onSubmit={onSearch} className="relative hidden 2xl:block w-48">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search mithai..."
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#182230] placeholder:text-slate-400 focus:border-[#0b2f8a] focus:ring-1 focus:ring-[#0b2f8a] outline-none shadow-2xs"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-[#0b2f8a]"
                aria-label="Search"
              >
                🔍
              </button>
            </form>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="hidden sm:flex h-8.5 w-8.5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-[#0b2f8a] hover:text-[#0b2f8a] shadow-2xs transition"
              title="Wishlist"
            >
              ♡
            </Link>

            {/* Account / Login */}
            <Link
              href={user ? "/account" : "/login"}
              className="hidden sm:inline-block text-xs font-semibold text-slate-700 hover:text-[#0b2f8a] px-2 py-1 transition whitespace-nowrap"
            >
              {user ? user.name.split(" ")[0] : "Login"}
            </Link>

            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden sm:inline-block rounded-full bg-[#0b2f8a]/10 px-2.5 py-1 text-[11px] font-bold text-[#0b2f8a] whitespace-nowrap"
              >
                Admin
              </Link>
            )}

            {/* UI Design Switcher Option ("one option create in our website i click then change my ui design") */}
            <button
              type="button"
              onClick={toggleGlobalUiDesign}
              className="inline-flex items-center gap-1 rounded-full border border-[#3b1e54]/25 bg-[#faf6ee] hover:bg-[#f5efe1] text-[#3b1e54] px-2.5 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              title="Click to switch website UI design (Warm Cream & Deep-Purple / Royal Heritage)"
            >
              <span>🎨</span>
              <span className="hidden md:inline">Change UI</span>
            </button>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="flex items-center gap-1.5 rounded-full bg-[#0b2f8a] hover:bg-[#071c54] text-white px-3.5 py-1.5 text-xs font-bold shadow-md shadow-[#0b2f8a]/20 transition whitespace-nowrap"
            >
              <span>Cart</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dfb755] text-[10px] font-bold text-slate-950">
                {count}
              </span>
            </Link>

            {/* Mobile / Tablet Hamburger Toggle */}
            <button
              className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 text-lg xl:hidden hover:bg-slate-100 transition"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* 3. MOBILE DRAWER */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden shadow-lg space-y-3">
          <form onSubmit={onSearch} className="mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sweets & farsan..."
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-xs outline-none focus:border-[#0b2f8a]"
            />
          </form>

          <div className="space-y-2 text-xs font-semibold">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-xl transition ${
                  item.isSpecial
                    ? "bg-[#dfb755]/15 text-[#0b2f8a] font-bold border border-[#dfb755]/40"
                    : "text-slate-700 hover:bg-slate-50 hover:text-[#0b2f8a]"
                }`}
                onClick={() => setOpen(false)}
              >
                {item.icon ? `${item.icon} ` : ""}
                {item.label}
              </Link>
            ))}

            <div className="border-t border-slate-100 pt-2 space-y-1">
              <button
                type="button"
                onClick={toggleGlobalUiDesign}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#3b1e54]/10 text-[#3b1e54] font-bold text-xs hover:bg-[#3b1e54]/20 transition cursor-pointer"
              >
                <span>🎨 Switch UI Design (Warm Cream / Classic)</span>
                <span>⇄</span>
              </button>
              <Link
                href="/wishlist"
                onClick={() => setOpen(false)}
                className="block px-3 py-1.5 text-slate-600 hover:text-[#0b2f8a]"
              >
                ♡ Saved Wishlist
              </Link>
              <Link
                href={user ? "/account" : "/login"}
                onClick={() => setOpen(false)}
                className="block px-3 py-1.5 text-slate-600 hover:text-[#0b2f8a]"
              >
                {user ? "👤 My Account" : "🔑 Login / Register"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
