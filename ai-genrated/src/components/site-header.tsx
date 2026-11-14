"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type Me = { id: number; name: string; role: string } | null;

interface CategoryGroup {
  title: string;
  items: { name: string; href: string; icon?: string }[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: "Artisan Sweets (મિઠાઈ)",
    items: [
      { name: "Kaju Sweets", href: "/shop?category=kaju-sweets", icon: "✨" },
      { name: "Mawa Sweets", href: "/shop?category=mawa-sweets", icon: "🥛" },
      { name: "Penda", href: "/shop?category=penda", icon: "🟡" },
      { name: "Desi Ghee", href: "/shop?category=indian-ghee-sweets", icon: "🍯" },
      { name: "Dry Fruit Bites & Rolls", href: "/shop?category=dryfruit-bites", icon: "🥜" },
      { name: "Sugar-Free Sweets", href: "/shop?category=sugarless-sweets", icon: "🌱" },
      { name: "Bengali Rasgulla & Delights", href: "/shop?category=bengali-sweets", icon: "⚪" },
    ],
  },
  {
    title: "Namkeen & Farsan (નમકીન - ફરસાણ)",
    items: [
      { name: "Gujarati Farsan", href: "/shop?group=namkeen", icon: "🥟" },
      { name: "Nylon Khaman & Dhokla", href: "/shop?group=namkeen", icon: "🧆" },
      { name: "Sev, Bhavnagari & Gathiya", href: "/shop?category=farsan-snacks", icon: "🥢" },
      { name: "Crispy Roasted Khakhra", href: "/shop?category=khakhra", icon: "🫓" },
      { name: "Spiced Mixtures & Chewda", href: "/shop?group=namkeen", icon: "🌶️" },
      { name: "Farali Fasting Snacks", href: "/shop?group=namkeen", icon: "🥔" },
      { name: "Wafers & Crispy Chips", href: "/shop?group=namkeen", icon: "🥔" },
    ],
  },
  {
    title: "Bakery & Gifting (બેકરી અને ભેટ)",
    items: [
      { name: "Kalol Nankhatai & Cookies", href: "/shop?category=biscuits-and-cookies", icon: "🍪" },
      { name: "Flaky Butter Khari & Toast", href: "/shop?category=toast-and-khari", icon: "🥐" },
      { name: "Royal Festive Hampers", href: "/shop?category=gift-hampers", icon: "🎁" },
      { name: "Premium Dry Fruit Boxes", href: "/shop?category=premium-dry-fruits", icon: "🌰" },
      { name: "Special Festive Season", href: "/festivals", icon: "🪔" },
      { name: "New Chef Launches", href: "/new-products", icon: "⭐" },
    ],
  },
];

interface SweetDropdownItem {
  label: string;
  href: string;
  icon: string;
  desc: string;
  badge?: string;
}

const SWEET_DROPDOWN_ITEMS: SweetDropdownItem[] = [
  {
    label: "Kaju Sweets",
    href: "/shop?category=kaju-sweets",
    icon: "✨",
    desc: "Kaju Katli, cashew rolls & diamonds",
    badge: "Bestseller",
  },
  {
    label: "Mawa Sweets",
    href: "/shop?category=mawa-sweets",
    icon: "🥛",
    desc: "Pure khoya, barfi & rich milk sweets",
  },
  {
    label: "Penda",
    href: "/shop?category=penda",
    icon: "🟡",
    desc: "Mathura, kesar & traditional pedas",
    badge: "Signature",
  },
  {
    label: "Desi Ghee",
    href: "/shop?category=indian-ghee-sweets",
    icon: "🍯",
    desc: "Pure ghee mithai, mohanthal & ladoo",
    badge: "100% Ghee",
  },
  {
    label: "Dry Fruit Sweets",
    href: "/shop?category=dryfruit-bites",
    icon: "🥜",
    desc: "Sugarless anjeer & dry fruit bites",
  },
  {
    label: "Bengali Sweets",
    href: "/shop?category=bengali-sweets",
    icon: "⚪",
    desc: "Rasgulla, cham cham & rajbhog",
  },
];

interface MenuBarLink {
  href: string;
  label: string;
  icon?: string;
  isPill?: boolean;
  isDropdown?: boolean;
}

const MENU_BAR_LINKS: MenuBarLink[] = [
  { href: "/shop", label: "All Items" },
  { href: "/new-products", label: "New Launches", icon: "✨", isPill: true },
  { href: "/find-your-mithai", label: "Taste Quiz", icon: "🪄", isPill: true },
  { href: "/festivals", label: "Festive Season", icon: "🪔" },
  { href: "/shop?group=sweets", label: "Sweets", isDropdown: true },
  { href: "/shop?group=namkeen", label: "Namkeen & Farsan" },
  { href: "/shop?group=bakery", label: "Bakery" },
  { href: "/stores", label: "Stores", icon: "📍" },
];

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function MenuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function HeartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function BagIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function UserSvgIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PhoneIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function StoreIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

export interface SiteHeaderProps {
  initialConfig?: any;
}

export function SiteHeader({ initialConfig }: SiteHeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const [sweetsDropdownOpen, setSweetsDropdownOpen] = useState(false);
  const sweetsDropdownRef = useRef<HTMLDivElement | null>(null);
  const [currentSearch, setCurrentSearch] = useState("");

  const FALLBACK_CONFIG = {
    announcement: {
      enabled: true,
      text: "Free delivery on orders above ₹799 • Use code FESTIVE15 for 15% off orders above ₹999",
      badge: "FESTIVE SPECIAL",
      linkText: "Order Hampers →",
      linkUrl: "/shop?category=gift-hampers",
    },
    storeInfo: {
      city: "Kalol, Gujarat",
      established: "1976",
      phone: "+91 63531 19329",
    },
  };

  const [uiConfig, setUiConfig] = useState<any>(initialConfig || FALLBACK_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(Boolean(initialConfig));

  useEffect(() => {
    fetch("/api/ui-config", { cache: "no-store" })
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

    const fetchCart = () => {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.count === "number") {
            setCount(data.count);
          }
        })
        .catch(() => setCount(0));
    };

    fetchCart();

    const handleCartUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setCount(customEvent.detail.count);
      } else {
        fetchCart();
      }
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    window.addEventListener("focus", fetchCart);

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setCurrentSearch(window.location.search);
      const q = sp.get("search");
      if (q) {
        setTimeout(() => setQuery(q), 0);
      }
    }

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
      window.removeEventListener("focus", fetchCart);
    };
  }, [pathname]);

  // Click outside to close sweets dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sweetsDropdownRef.current &&
        !sweetsDropdownRef.current.contains(event.target as Node)
      ) {
        setSweetsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile drawer and sweets dropdown on route change
  useEffect(() => {
    setOpen(false);
    setSweetsDropdownOpen(false);
  }, [pathname]);

  const isSweetsActive =
    pathname === "/shop" &&
    (currentSearch.includes("group=sweets") ||
      currentSearch.includes("category=kaju-sweets") ||
      currentSearch.includes("category=mawa-sweets") ||
      currentSearch.includes("category=penda") ||
      currentSearch.includes("category=indian-ghee-sweets") ||
      currentSearch.includes("category=dryfruit-bites") ||
      currentSearch.includes("category=bengali-sweets") ||
      currentSearch.includes("category=sugarless-sweets"));

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

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm">
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {configLoaded && uiConfig?.announcement?.enabled !== false && (
        <div className="bg-[#0b1b4f] text-white border-b border-[#dfb755]/20 overflow-hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-4 py-1.5 text-xs">
            <p className="hidden sm:flex items-center gap-2 text-slate-300 font-light truncate">
              <span>{uiConfig.storeInfo?.city || "Kalol, Gujarat"}</span>
              <span className="text-[#dfb755]">·</span>
              <span>Since {uiConfig.storeInfo?.established || "1976"}</span>
              <span className="text-[#dfb755]">·</span>
              <span className="text-[#dfb755] font-medium">100% Shuddh Desi Ghee</span>
            </p>
            <div className="mx-auto sm:mx-0 text-center font-medium tracking-wide text-[#dfb755] text-[11px] sm:text-xs truncate px-1 flex items-center justify-center gap-1.5 min-w-0 max-w-full">
              <span className="truncate">
                {uiConfig.announcement?.text ||
                  "Free delivery on orders above ₹799 • Use code FESTIVE15 for 15% off orders above ₹999"}
              </span>
              {uiConfig.announcement?.linkUrl && uiConfig.announcement?.linkText ? (
                <Link
                  href={uiConfig.announcement.linkUrl}
                  className="underline hover:text-white transition ml-1 shrink-0 font-bold"
                >
                  {uiConfig.announcement.linkText}
                </Link>
              ) : null}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-300 shrink-0 text-xs">
              <PhoneIcon className="h-3 w-3 text-[#dfb755]" />
              <span>Call: {uiConfig.storeInfo?.phone || "+91 98250 19760"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN HEADER BAR (Brand Logo + Search + Utilities with Frosted Glass) */}
      <div className="glass-header-frosted transition-all duration-300">
        <div className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-20 items-center justify-between gap-1.5 sm:gap-6">
            {/* Left: Brand Crest & Logo */}
            <Link href="/" className="flex items-center gap-1.5 sm:gap-3 shrink-0 group min-w-0">
              {uiConfig.logo?.type === "image" && uiConfig.logo?.imageUrl ? (
                <div className="relative h-8 w-8 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-[#dfb755]/60 shadow-sm transition group-hover:scale-105 shrink-0">
                  <img
                    src={uiConfig.logo.imageUrl}
                    alt={uiConfig.logo.brandName || "Logo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="relative flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full p-0.5 shadow-sm transition group-hover:scale-105 shrink-0"
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
                      className="font-[family-name:var(--font-display)] text-lg sm:text-2xl font-bold tracking-tight"
                      style={{
                        color: uiConfig.logo?.crestTextColor || "#dfb755",
                      }}
                    >
                      {uiConfig.logo?.crestLetter || "વ"}
                    </span>
                  </div>
                </div>
              )}
              <div className="text-left min-w-0">
                <span className="block font-[family-name:var(--font-display)] text-lg sm:text-2xl lg:text-3xl font-bold leading-none tracking-tight text-[#0b2f8a]">
                  {uiConfig.logo?.brandName || "VARDAYINI"}
                </span>
                <span className="text-[8.5px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.24em] text-[#b89130] block mt-0.5 truncate">
                  {uiConfig.logo?.brandSubtitle ||
                    `SWEET MART · ${uiConfig.storeInfo?.established || "1976"}`}
                </span>
              </div>
            </Link>

            {/* Center: Search Bar (Visible on tablets & desktops) */}
            <form
              onSubmit={onSearch}
              className="hidden md:flex flex-1 max-w-md lg:max-w-lg xl:max-w-xl mx-2 relative"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sweets, kaju katli, farsan, dry fruits..."
                  className="w-full rounded-full border border-slate-200 bg-white/90 pl-10 pr-24 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0b2f8a] focus:ring-2 focus:ring-[#0b2f8a]/15 focus:bg-white outline-none shadow-xs transition"
                />
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#0b2f8a] hover:bg-[#071c54] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Right: Actions & Utilities */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="hidden sm:flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#0b2f8a] hover:text-[#0b2f8a] shadow-xs transition"
                title="View Wishlist"
              >
                <HeartIcon className="h-4 w-4" />
              </Link>

              {/* User Account / Login */}
              <Link
                href={user ? "/account" : "/login"}
                className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-[#0b2f8a] px-3 py-2 rounded-full hover:bg-slate-100 transition whitespace-nowrap"
              >
                <UserSvgIcon className="h-4 w-4 text-slate-600" />
                <span>{user ? user.name.split(" ")[0] : "Login"}</span>
              </Link>

              {/* Admin / Super Admin Badge */}
              {(user?.role === "admin" || user?.role === "super_admin") && (
                <Link
                  href="/admin"
                  className={`hidden sm:inline-block rounded-full px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                    user.role === "super_admin"
                      ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                      : "bg-[#0b2f8a]/10 text-[#0b2f8a] hover:bg-[#0b2f8a]/20"
                  }`}
                >
                  {user.role === "super_admin" ? "👑 Super Admin" : "Admin"}
                </Link>
              )}

              {/* Developer Theme Switcher - Restricted to Super Admin only */}
              {user?.role === "super_admin" && (
                <button
                  type="button"
                  onClick={toggleGlobalUiDesign}
                  className="hidden lg:inline-flex items-center gap-1 rounded-full border border-[#3b1e54]/25 bg-[#faf6ee] hover:bg-[#f5efe1] text-[#3b1e54] px-2.5 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                  title="Switch UI Theme (Admin Only)"
                >
                  <span>🎨</span>
                  <span className="hidden xl:inline">Change UI</span>
                </button>
              )}

              {/* Cart Button */}
              <Link
                href="/cart"
                className="flex min-h-[38px] sm:min-h-[44px] items-center gap-1 sm:gap-2 rounded-full bg-[#0b2f8a] hover:bg-[#071c54] text-white px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold shadow-md shadow-[#0b2f8a]/20 transition whitespace-nowrap"
              >
                <BagIcon className="h-4 w-4 text-[#dfb755]" />
                <span className="hidden sm:inline">Cart</span>
                <span className="flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#dfb755] text-[9.5px] sm:text-[10px] font-extrabold text-slate-950">
                  {count}
                </span>
              </Link>

              {/* Mobile Menu Button */}
              <button
                className="flex min-h-[38px] min-w-[38px] h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-800 lg:hidden hover:bg-slate-100 transition shrink-0 cursor-pointer"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle navigation menu"
              >
                {open ? <CloseIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <MenuIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DEDICATED CATEGORY NAVIGATION BAR (Desktop & Mobile) */}
      <nav className="hidden lg:block bg-[#faf8f5] border-b border-[#0b2f8a]/10 text-xs font-semibold text-slate-800 relative z-30">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-10 sm:h-11 items-center justify-between gap-4">
            {/* Category Navigation Links (Scrollable horizontally on mobile, nicely spaced on desktop) */}
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 overflow-x-auto sm:overflow-visible no-scrollbar py-1">
              {MENU_BAR_LINKS.map((item) => {
                if (item.isDropdown && item.label === "Sweets") {
                  return (
                    <div
                      key="sweets-dropdown"
                      ref={sweetsDropdownRef}
                      className="relative shrink-0"
                      onMouseEnter={() => setSweetsDropdownOpen(true)}
                      onMouseLeave={() => setSweetsDropdownOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setSweetsDropdownOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer hover:text-[#0b2f8a] hover:bg-slate-200/50 ${
                          isSweetsActive
                            ? "text-[#0b2f8a] font-bold bg-[#0b2f8a]/10"
                            : "text-slate-800 font-semibold"
                        }`}
                        aria-expanded={sweetsDropdownOpen}
                        aria-haspopup="true"
                      >
                        <span>Sweets</span>
                        <ChevronDownIcon
                          className={`h-3 w-3 text-[#b89130] transition-transform duration-200 ${
                            sweetsDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Desktop Dropdown Column */}
                      <div
                        className={`hidden sm:block absolute top-full left-0 pt-1 z-50 transition-all duration-200 ${
                          sweetsDropdownOpen
                            ? "opacity-100 translate-y-0 visible pointer-events-auto"
                            : "opacity-0 -translate-y-2 invisible pointer-events-none"
                        }`}
                      >
                        <div className="w-80 rounded-2xl bg-white border border-[#dfb755]/35 shadow-2xl shadow-[#0b2f8a]/15 p-2 backdrop-blur-md">
                          {/* Header */}
                          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0b2f8a]">
                              Artisan Sweets · મિઠાઈ
                            </span>
                            <span className="text-[9px] font-bold text-[#8d6715] bg-[#dfb755]/20 px-2 py-0.5 rounded-full">
                              100% Desi Ghee
                            </span>
                          </div>

                          {/* Items Column */}
                          <div className="py-1 space-y-0.5">
                            {SWEET_DROPDOWN_ITEMS.map((subItem) => {
                              const isSubActive =
                                pathname === "/shop" &&
                                currentSearch.includes(subItem.href.replace("/shop?", ""));

                              return (
                                <Link
                                  key={subItem.label}
                                  href={subItem.href}
                                  onClick={() => setSweetsDropdownOpen(false)}
                                  className={`group/item flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 ${
                                    isSubActive
                                      ? "bg-[#0b2f8a]/10 text-[#0b2f8a]"
                                      : "text-slate-700 hover:bg-[#0b2f8a]/5 hover:text-[#0b2f8a]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#faf8f5] border border-slate-200/80 text-sm group-hover/item:scale-110 group-hover/item:border-[#dfb755]/60 transition-transform shrink-0">
                                      {subItem.icon}
                                    </span>
                                    <div className="text-left">
                                      <div className="text-xs font-bold text-slate-900 group-hover/item:text-[#0b2f8a] flex items-center gap-1.5">
                                        <span>{subItem.label}</span>
                                        {subItem.badge && (
                                          <span className="text-[9px] font-extrabold text-[#b89130] bg-[#dfb755]/20 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                            {subItem.badge}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] font-normal text-slate-500 group-hover/item:text-slate-600 line-clamp-1">
                                        {subItem.desc}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-slate-300 group-hover/item:text-[#0b2f8a] group-hover/item:translate-x-0.5 transition-all text-xs font-bold shrink-0 ml-2">
                                    →
                                  </span>
                                </Link>
                              );
                            })}
                          </div>

                          {/* Footer link to View All Sweets */}
                          <div className="pt-2 border-t border-slate-100 mt-1">
                            <Link
                              href="/shop?group=sweets"
                              onClick={() => setSweetsDropdownOpen(false)}
                              className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#dfb755]/20 to-[#dfb755]/10 hover:from-[#dfb755]/30 hover:to-[#dfb755]/20 text-[#0b2f8a] font-bold text-xs transition"
                            >
                              <span>✨ View All Sweets & Hampers</span>
                              <span>→</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || (item.href !== "/shop" && pathname.startsWith(item.href));

                if (item.isPill) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/60 text-[#0b2f8a] font-bold text-xs hover:bg-[#dfb755]/30 transition whitespace-nowrap shadow-2xs shrink-0"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 hover:text-[#0b2f8a] hover:bg-slate-200/50 ${
                      isActive
                        ? "text-[#0b2f8a] font-bold bg-[#0b2f8a]/10"
                        : "text-slate-700 font-medium"
                    }`}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Tagline on Menu Bar (Visible on larger screens) */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-[#8d6715] shrink-0 bg-[#dfb755]/15 px-3 py-1 rounded-full">
              <span>⚡ Same-Day Delivery across Kalol</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sweets Popup Modal (When Sweets is clicked on small mobile screens) */}
      {sweetsDropdownOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-start pt-28 px-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSweetsDropdownOpen(false)}
          />
          <div className="relative bg-white rounded-2xl border border-[#dfb755]/50 shadow-2xl p-3 z-10 max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🍬</span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0b2f8a]">
                  Artisan Sweets · મિઠાઈ
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSweetsDropdownOpen(false)}
                className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                aria-label="Close sweets dropdown"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {SWEET_DROPDOWN_ITEMS.map((subItem) => (
                <Link
                  key={subItem.label}
                  href={subItem.href}
                  onClick={() => setSweetsDropdownOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#0b2f8a]/5 text-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#faf8f5] border border-slate-200 text-sm">
                      {subItem.icon}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{subItem.label}</span>
                        {subItem.badge && (
                          <span className="text-[9px] font-extrabold text-[#b89130] bg-[#dfb755]/20 px-1.5 py-0.2 rounded-full">
                            {subItem.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{subItem.desc}</div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs font-bold">→</span>
                </Link>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100">
              <Link
                href="/shop?group=sweets"
                onClick={() => setSweetsDropdownOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[#0b2f8a] text-white font-bold text-xs"
              >
                <span>✨ View All Sweets Collection</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. MOBILE SLIDE-OVER DRAWER (Visible when hamburger is clicked) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-[#faf8f5]">
              <div className="flex items-center gap-2">
                {uiConfig.logo?.type === "image" && uiConfig.logo?.imageUrl ? (
                  <div className="relative h-8 w-8 rounded-full overflow-hidden border border-[#dfb755]/60 shadow-sm shrink-0 bg-white">
                    <img
                      src={uiConfig.logo.imageUrl}
                      alt={uiConfig.logo.brandName || "Logo"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{
                      backgroundColor: uiConfig.logo?.crestBgColor || "#0b2f8a",
                      color: uiConfig.logo?.crestTextColor || "#dfb755",
                      border: uiConfig.logo?.crestBorderColor
                        ? `1.5px solid ${uiConfig.logo.crestBorderColor}`
                        : "none",
                    }}
                  >
                    {uiConfig.logo?.crestLetter || "વ"}
                  </div>
                )}
                <div>
                  <span className="block font-bold text-[#0b2f8a] text-sm leading-tight">
                    {uiConfig.logo?.brandName || "VARDAYINI"}
                  </span>
                  <span className="text-[9px] font-semibold text-[#b89130] uppercase tracking-wider block">
                    {uiConfig.logo?.brandSubtitle ||
                      `SWEET MART · ${uiConfig.storeInfo?.established || "1976"}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                aria-label="Close menu"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* Mobile Search Input */}
              <form onSubmit={onSearch} className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sweets & farsan..."
                  className="w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-20 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0b2f8a] focus:bg-white"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-[#0b2f8a] text-white px-3 py-1 text-[11px] font-bold"
                >
                  Search
                </button>
              </form>

              {/* Special Shortcuts */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/new-products"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#dfb755]/20 border border-[#dfb755]/50 text-[#0b2f8a] font-bold text-xs hover:bg-[#dfb755]/30 transition"
                >
                  <span>✨</span>
                  <span>New Launches</span>
                </Link>
                <Link
                  href="/festivals"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#0b2f8a]/10 border border-[#0b2f8a]/20 text-[#0b2f8a] font-bold text-xs hover:bg-[#0b2f8a]/15 transition"
                >
                  <span>🪔</span>
                  <span>Festive Season</span>
                </Link>
              </div>

              {/* Categorized Menu List */}
              <div className="space-y-4">
                {CATEGORY_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0b2f8a] pb-1 border-b border-slate-100 flex items-center justify-between">
                      <span>{group.title}</span>
                    </h5>
                    <div className="grid grid-cols-1 gap-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-[#0b2f8a]/5 hover:text-[#0b2f8a] transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span>{item.icon}</span>
                            <span>{item.name}</span>
                          </span>
                          <span className="text-slate-400 text-[10px]">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Footer (User & Utility Links) */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-2 shrink-0">
              {user?.role === "super_admin" && (
                <button
                  type="button"
                  onClick={toggleGlobalUiDesign}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#3b1e54]/10 text-[#3b1e54] font-bold text-xs hover:bg-[#3b1e54]/20 transition cursor-pointer"
                >
                  <span>🎨 Switch UI Design (Admin Only)</span>
                  <span>⇄</span>
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-1">
                <Link
                  href="/wishlist"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#0b2f8a]"
                >
                  <HeartIcon className="h-3.5 w-3.5 text-rose-500" />
                  <span>Wishlist</span>
                </Link>
                <Link
                  href={user ? "/account" : "/login"}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#0b2f8a]"
                >
                  <UserSvgIcon className="h-3.5 w-3.5 text-[#0b2f8a]" />
                  <span>{user ? "My Account" : "Login"}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
