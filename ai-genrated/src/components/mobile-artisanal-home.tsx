"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInr } from "@/lib/money";

interface MobileArtisanalHomeProps {
  categories?: any[];
  featuredProducts?: any[];
  bestsellers?: any[];
  stores?: any[];
  uiConfig?: any;
  customPageData?: any;
}

export function MobileArtisanalHome({
  categories = [],
  featuredProducts = [],
  bestsellers = [],
  stores = [],
  uiConfig,
  customPageData,
}: MobileArtisanalHomeProps) {
  const router = useRouter();
  const [cartCount, setCartCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string | number, boolean>>({});
  const [burstingId, setBurstingId] = useState<string | number | null>(null);
  const cardLastTapRef = useRef<Record<string | number, number>>({});
  const { scrollY } = useScroll();
  const [headerHidden, setHeaderHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (mobileMenuOpen || searchOpen) {
      setHeaderHidden(false);
      return;
    }
    if (current > previous && current > 150) {
      setHeaderHidden(true);
    } else {
      setHeaderHidden(false);
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vsm_wishlist_ids");
      if (stored) setLikedMap(JSON.parse(stored));
    } catch {}
  }, []);

  const handleToggleLike = (e: React.MouseEvent | React.TouchEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    const pid = product.id || product.slug;
    const nextState = !likedMap[pid];
    const newMap = { ...likedMap, [pid]: nextState };
    setLikedMap(newMap);
    if (nextState) {
      setBurstingId(pid);
      setTimeout(() => setBurstingId(null), 900);
    }
    try {
      localStorage.setItem("vsm_wishlist_ids", JSON.stringify(newMap));
      if (typeof product.id === "number") {
        fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        }).catch(() => {});
      }
    } catch {}
  };

  // Read mobile configuration from uiConfig or customPageData
  const mobileConfig = customPageData || uiConfig?.mobileManagement || {};
  const theme = mobileConfig.theme || {
    primaryColor: "#0B1B4F",
    accentColor: "#DFB755",
    bgColor: "#FDFBF7",
  };

  // 1. Fetch live cart count on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCartCount() {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const count = (data.items || []).reduce(
            (sum: number, line: any) => sum + (line.quantity || 0),
            0
          );
          if (isMounted) setCartCount(count);
        }
      } catch {}
    }

    loadCartCount();

    const handleCartUpdated = (e: any) => {
      if (typeof e.detail?.count === "number") {
        setCartCount(e.detail.count);
      } else {
        loadCartCount();
      }
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, []);

  // Quick Add To Cart Handler
  async function handleQuickAdd(item: any) {
    const itemId = item.id || item.slug;
    if (addingId === itemId) return;
    setAddingId(itemId);

    try {
      const variantId = item.variantId || item.productId || 1;
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof data.count === "number") {
          setCartCount(data.count);
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: data.count } }));
        }
        setToastMessage(`✓ Added ${item.name} to your box!`);
        setTimeout(() => setToastMessage(null), 2500);
      } else {
        setToastMessage("Could not add item");
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch {
      setToastMessage("Could not add to cart");
      setTimeout(() => setToastMessage(null), 2500);
    } finally {
      setAddingId(null);
    }
  }

  // Copy promo code
  function handleCopyPromo(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setToastMessage(`✓ Copied coupon code "${code}"!`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  }

  // Handle Search Submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  }

  // Handle Newsletter
  function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterDone(true);
      setTimeout(() => setNewsletterDone(false), 4000);
      setNewsletterEmail("");
    }
  }

  // Announcement section settings
  const announcement = mobileConfig.announcement || {
    enabled: true,
    text: "Free delivery on orders above ₹799 • Use code FESTIVE15 for 15% off",
    couponCode: "FESTIVE15",
  };

  // Hero section settings
  const hero = mobileConfig.hero || {
    enabled: true,
    badge: "100% Shuddh Desi Ghee",
    tag: "New Artisanal Creation",
    title: "Dubai Chocolate Ladoo",
    description:
      "A decadent fusion of traditional besan and rich Belgian pistachio knafeh chocolate. Crafted by master halwais.",
    priceText: "₹499",
    weightText: "/ 250g",
    buttonText: "Order Now",
    buttonLink: "/shop/dubai-chocolate-ladoo",
    imageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg",
  };

  // Marquee popular items
  const marqueeItems = mobileConfig.marquee?.items || [
    "Kaju Katli",
    "Shahi Gulab Jamun",
    "Kesar Peda",
    "Mohanthal",
    "Motichoor Ladoo",
    "Kaju Pista Roll",
  ];

  // Categories
  const categoryItems =
    mobileConfig.categories?.items && mobileConfig.categories.items.length > 0
      ? mobileConfig.categories.items.filter((c: any) => c.active !== false)
      : [
          {
            id: "sweets",
            name: "Sweets",
            slug: "sweets",
            imageUrl: "/images/kaju-katli.jpg",
          },
          {
            id: "savouries",
            name: "Savouries",
            slug: "savouries",
            imageUrl: "/images/namkeen.jpg",
          },
          {
            id: "artisanal",
            name: "Artisanal Sweets",
            slug: "artisanal-sweets",
            imageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg",
          },
          {
            id: "bakery",
            name: "Bakery",
            slug: "bakery",
            imageUrl: "/images/special-bhel-showcase.jpg",
          },
          {
            id: "gifting",
            name: "Gifting",
            slug: "gifting",
            imageUrl: "/images/festive-hamper.jpg",
          },
        ];

  // Best Sellers (2-Column Grid)
  const bestsellersItems =
    mobileConfig.bestsellers?.items && mobileConfig.bestsellers.items.length > 0
      ? mobileConfig.bestsellers.items
      : [
          {
            id: "mb-1",
            name: "Silver Foil Kaju Katli",
            sublabel: "Pure Cashews & Ghee",
            badge: "BEST SELLER",
            price: 425,
            weight: "/ 250g",
            imageUrl: "/images/kaju-katli.jpg",
            slug: "kaju-katli",
            productId: 1,
            variantId: 1,
          },
          {
            id: "mb-2",
            name: "Shahi Gulab Jamun",
            sublabel: "Mawa & Rose Syrup",
            badge: "BEST SELLER",
            price: 280,
            weight: "/ 500g",
            imageUrl: "/images/gulab-jamun.jpg",
            slug: "gulab-jamun",
            productId: 2,
            variantId: 2,
          },
          {
            id: "mb-3",
            name: "Kesar Malai Peda",
            sublabel: "Kashmiri Saffron",
            badge: "CHEF'S PICK",
            price: 350,
            weight: "/ 250g",
            imageUrl: "/images/peda.jpg",
            slug: "kesar-malai-penda",
            productId: 37,
            variantId: 961,
          },
          {
            id: "mb-4",
            name: "Gujarati Mohanthal",
            sublabel: "Besan & Shuddh Ghee",
            badge: "TRADITIONAL",
            price: 320,
            weight: "/ 250g",
            imageUrl: "/images/motichoor.jpg",
            slug: "desi-ghee-mohanthal",
            productId: 3,
            variantId: 927,
          },
        ];

  // Journey Stats
  const journeyStats = mobileConfig.journeyStats || {
    enabled: true,
    tag: "A Legacy of Trust",
    title: "A Journey Of 75 Years",
    description:
      "Serving generations of sweet lovers with uncompromised quality, authentic recipes, and pure ingredients since 1951 in Kalol.",
    stats: [
      { value: "75+", label: "Years Legacy" },
      { value: "150+", label: "Varieties" },
      { value: "2M+", label: "Happy Customers" },
    ],
  };

  // Taste Quiz Banner
  const tasteQuizBanner = mobileConfig.tasteQuizBanner || {
    enabled: true,
    tag: "Mithai Quiz",
    title: "Quick Taste Match Finder",
    description:
      "Confused about what to pick for your celebrations or palate? Take our 30-second quiz to discover your ideal sweet match!",
    buttonText: "Start Quiz",
    buttonLink: "/find-your-sweet",
  };

  // Store Locations
  const outletsSection = mobileConfig.outletsSection || {
    enabled: true,
    tag: "Visit Us",
    title: "Our Flagship Stores",
    stores: [
      {
        name: "Vardayini Main Bazaar Counter",
        address: "Shop No. 6A, Navjivan Shopping Center, Kalol 382721",
        timings: "Open 8:00 AM - 10:00 PM",
      },
      {
        name: "Vardayini Satellite Outlet",
        address: "Station Road, Navjivan Corner, Kalol 382721",
        timings: "Open 9:00 AM - 10:30 PM",
      },
    ],
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FDFBF7] text-[#1b1c1a] font-sans antialiased overflow-x-hidden pb-24 selection:bg-[#DFB755]/30">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ANNOUNCEMENT BAR (Clickable Promo)
         ───────────────────────────────────────────────────────────── */}
      {announcement.enabled !== false && (
        <div
          onClick={() => handleCopyPromo(announcement.couponCode || "FESTIVE15")}
          className="bg-[#0B1B4F] text-white text-[11px] font-medium py-2 px-3 text-center tracking-wide flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#071339] transition select-none shadow-xs"
        >
          <span className="text-[#DFB755] text-sm shrink-0">🚚</span>
          <span className="truncate">
            {announcement.text}{" "}
            {announcement.couponCode && (
              <span className="underline decoration-[#DFB755] font-bold text-[#DFB755]">
                (Tap to copy)
              </span>
            )}
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. STICKY MOBILE APP HEADER
         ───────────────────────────────────────────────────────────── */}
      <motion.header
        className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#0B1B4F]/10 px-4 py-2.5 flex items-center justify-between shadow-2xs"
        animate={{
          y: headerHidden ? "-100%" : 0,
          opacity: headerHidden ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{
          pointerEvents: headerHidden ? "none" : "auto",
        }}
      >
        {/* Hamburger Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open mobile navigation menu"
          className="flex items-center justify-center p-2 rounded-lg text-[#0B1B4F] hover:text-[#DFB755] hover:bg-[#0B1B4F]/5 transition cursor-pointer active:scale-95"
        >
          <svg className="w-6 h-6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand Crest Title */}
        <Link href="/" className="text-center group flex flex-col items-center">
          <span className="font-[family-name:var(--font-display)] text-[#0B1B4F] text-2xl font-bold leading-none tracking-tight group-hover:text-[#DFB755] transition">
            Vardayini
          </span>
          <span className="text-[9.5px] uppercase tracking-widest text-[#DFB755] font-bold mt-0.5">
            Sweet Mart • Est. 1951
          </span>
        </Link>

        {/* Actions: Search & Cart */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="Search sweets"
            className="flex items-center justify-center p-2 rounded-lg text-[#0B1B4F] hover:text-[#DFB755] hover:bg-[#0B1B4F]/5 transition cursor-pointer active:scale-95"
          >
            <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <Link
            href="/cart"
            aria-label="Shopping Cart"
            className="flex items-center justify-center p-2 rounded-lg text-[#0B1B4F] hover:text-[#DFB755] hover:bg-[#0B1B4F]/5 transition relative cursor-pointer active:scale-95"
          >
            <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#DFB755] text-[#0B1B4F] font-black text-[10px] h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </motion.header>

      {/* Quick Search Drawer (Expandable) */}
      {searchOpen && (
        <div className="bg-white border-b border-[#0B1B4F]/10 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Kaju Katli, Mohanthal, Peda..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-amber-900/20 bg-[#FAF6EE] focus:outline-none focus:border-[#DFB755] focus:ring-1 focus:ring-[#DFB755]"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0B1B4F] text-[#DFB755] cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. HERO SLIDER BANNER (Artisanal Luxury Card)
         ───────────────────────────────────────────────────────────── */}
      {hero.enabled !== false && (
        <section className="p-3.5 sm:p-4">
          <div className="relative overflow-hidden rounded-2xl bg-[#0B1B4F] min-h-[380px] flex flex-col justify-end p-5 sm:p-6 text-white shadow-xl border border-[#DFB755]/25">
            {/* Background Image with Ambient Glow */}
            <div className="absolute inset-0">
              <Image
                src={hero.imageUrl || "/images/showcase/dubai-chocolate-ladoo.jpg"}
                alt={hero.title}
                fill
                priority
                className="object-cover mix-blend-overlay opacity-60 transition duration-700 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 500px"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B4F] via-[#0B1B4F]/50 to-transparent pointer-events-none" />

            {/* Badge */}
            <div className="relative z-10 mb-2.5 flex items-center gap-2">
              <span className="bg-[#DFB755]/20 border border-[#DFB755] text-[#DFB755] text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <span>👑</span>
                <span>{hero.badge}</span>
              </span>
            </div>

            {/* Text & Pricing Details */}
            <div className="relative z-10">
              <span className="text-[#DFB755] text-[11px] font-bold uppercase tracking-widest block mb-1">
                {hero.tag}
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold leading-tight mb-2 text-[#FDFBF7]">
                {hero.title}
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mb-4 max-w-md line-clamp-2 leading-relaxed">
                {hero.description}
              </p>
              <div className="flex items-center gap-3.5 flex-wrap">
                <Link
                  href={hero.buttonLink || "/shop"}
                  className="bg-[#DFB755] text-[#0B1B4F] font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg hover:bg-[#eac467] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{hero.buttonText}</span>
                  <span>→</span>
                </Link>
                <div className="text-[#FDFBF7]">
                  <span className="text-[10px] text-slate-300 block uppercase tracking-wider">
                    Special Price
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#DFB755]">
                    {hero.priceText}{" "}
                    <span className="text-[11px] font-normal text-slate-300">
                      {hero.weightText}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MARQUEE STRIP OF POPULAR SWEETS (Horizontal Smooth Scroll)
         ───────────────────────────────────────────────────────────── */}
      {mobileConfig.marquee?.enabled !== false && (
        <section className="py-2.5 border-y border-[#0B1B4F]/10 bg-[#f5f3ef] overflow-hidden">
          <div className="flex gap-3 px-3.5 overflow-x-auto no-scrollbar scroll-smooth">
            {marqueeItems.map((item: string, i: number) => (
              <Link
                key={i}
                href={`/shop?q=${encodeURIComponent(item)}`}
                className="flex items-center gap-1.5 shrink-0 bg-white px-3.5 py-1.5 rounded-lg border border-[#0B1B4F]/10 shadow-2xs hover:border-[#DFB755] transition text-xs font-semibold text-[#0B1B4F]"
              >
                <span className="text-[#DFB755] text-xs">★</span>
                <span>{item}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SHOP BY CATEGORY (Circular Gold Border Scroll)
         ───────────────────────────────────────────────────────────── */}
      {mobileConfig.categories?.enabled !== false && (
        <section className="py-5 px-3.5 sm:px-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#0B1B4F]">
              {mobileConfig.categories?.title || "Shop By Category"}
            </h3>
            <Link
              href={mobileConfig.categories?.viewAllUrl || "/shop"}
              className="text-xs font-bold text-[#DFB755] hover:underline"
            >
              {mobileConfig.categories?.viewAllText || "View All →"}
            </Link>
          </div>
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-1">
            {categoryItems.map((cat: any) => (
              <Link
                key={cat.id || cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="flex flex-col items-center shrink-0 cursor-pointer group"
              >
                <div className="h-20 w-20 rounded-full bg-[#eae8e4] overflow-hidden border-2 border-[#DFB755]/60 shadow-md transition-transform duration-300 group-hover:scale-105 group-active:scale-95 relative">
                  <Image
                    src={cat.imageUrl || "/images/kaju-katli.jpg"}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-bold mt-2 text-[#0B1B4F] group-hover:text-[#DFB755] transition text-center truncate max-w-[85px]">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. SIGNATURE BEST SELLERS (2-Column Mobile Grid with Quick-Add)
         ───────────────────────────────────────────────────────────── */}
      {mobileConfig.bestsellers?.enabled !== false && (
        <section className="py-5 px-3.5 sm:px-4 bg-[#f5f3ef]/60 border-y border-[#0B1B4F]/10">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#DFB755] block">
                {mobileConfig.bestsellers?.tag || "Handcrafted Daily"}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#0B1B4F]">
                {mobileConfig.bestsellers?.title || "Signature Best Sellers"}
              </h3>
            </div>
            <Link
              href={mobileConfig.bestsellers?.viewAllUrl || "/shop"}
              className="text-xs font-bold text-[#DFB755] hover:underline"
            >
              {mobileConfig.bestsellers?.viewAllText || "See All →"}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {bestsellersItems.map((product: any) => {
              const isBusy = addingId === (product.id || product.slug);
              return (
                <div
                  key={product.id || product.slug}
                  className="bg-white rounded-xl p-2.5 sm:p-3 border border-[#0B1B4F]/10 shadow-xs flex flex-col justify-between relative group hover:shadow-md transition"
                >
                  {/* Badge */}
                  <span
                    className={`absolute top-4 left-4 z-10 text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wide ${
                      product.badge === "CHEF'S PICK"
                        ? "bg-[#DFB755] text-[#0B1B4F]"
                        : product.badge === "TRADITIONAL"
                        ? "bg-[#871426] text-white"
                        : "bg-[#0B1B4F] text-[#DFB755]"
                    }`}
                  >
                    {product.badge || "BEST SELLER"}
                  </span>

                  {/* Top-Right Heart Like Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleLike(e, product)}
                    className="absolute top-3.5 right-3.5 z-10 h-7 w-7 rounded-full bg-white/95 backdrop-blur-xs shadow-xs border border-amber-900/10 flex items-center justify-center cursor-pointer transition active:scale-75 hover:bg-white"
                    aria-label={likedMap[product.id || product.slug] ? "Unlike" : "Like"}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={likedMap[product.id || product.slug] ? "#ff3b5c" : "none"}
                      stroke={likedMap[product.id || product.slug] ? "#ff3b5c" : "#140638"}
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
                    </svg>
                  </button>

                  {/* Image Link with Double Tap to Like */}
                  <div
                    className="h-32 sm:h-36 rounded-lg bg-[#eae8e4] mb-2.5 overflow-hidden relative block select-none cursor-pointer"
                    onDoubleClick={(e) => handleToggleLike(e, product)}
                    onTouchEnd={(e) => {
                      const pid = product.id || product.slug;
                      const now = Date.now();
                      if (now - (cardLastTapRef.current[pid] || 0) < 320) {
                        handleToggleLike(e, product);
                        cardLastTapRef.current[pid] = 0;
                      } else {
                        cardLastTapRef.current[pid] = now;
                      }
                    }}
                  >
                    <Link href={`/shop/${product.slug}`} className="block w-full h-full">
                      <Image
                        src={product.imageUrl || "/images/kaju-katli.jpg"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                        sizes="(max-width: 640px) 50vw, 250px"
                      />
                    </Link>
                    {burstingId === (product.id || product.slug) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 fade-in duration-200">
                        <span className="text-4xl filter drop-shadow-[0_4px_12px_rgba(255,59,92,0.6)]">💖</span>
                      </div>
                    )}
                  </div>

                  {/* Info & Add-to-Cart */}
                  <div>
                    <Link
                      href={`/shop/${product.slug}`}
                      className="font-bold text-xs sm:text-sm text-[#0B1B4F] line-clamp-1 group-hover:text-[#DFB755] transition"
                    >
                      {product.name}
                    </Link>
                    <p className="text-[10px] text-slate-500 mb-2 truncate">
                      {product.sublabel || "Pure Desi Ghee"}
                    </p>

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                      <span className="font-bold text-[#0B1B4F] text-xs sm:text-sm">
                        {formatInr(product.price)}{" "}
                        <span className="text-[9.5px] font-normal text-slate-400">
                          {product.weight || "/ 250g"}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product)}
                        disabled={isBusy}
                        aria-label={`Add ${product.name} to box`}
                        className="bg-[#0B1B4F] text-white p-2 rounded-lg hover:bg-[#DFB755] hover:text-[#0B1B4F] transition active:scale-90 cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                      >
                        {isBusy ? (
                          <span className="text-[10px] animate-spin">⏳</span>
                        ) : (
                          <span className="text-xs font-bold leading-none">＋</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. A JOURNEY OF 75 YEARS COUNTER STATS (Kalol Heritage)
         ───────────────────────────────────────────────────────────── */}
      {journeyStats.enabled !== false && (
        <section className="py-8 px-4 bg-[#0B1B4F] text-[#FDFBF7] relative overflow-hidden">
          <div className="relative z-10 text-center max-w-md mx-auto mb-6">
            <span className="text-[#DFB755] text-[10px] font-bold uppercase tracking-widest block mb-1.5">
              {journeyStats.tag}
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold mb-2 text-[#FDFBF7]">
              {journeyStats.title}
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              {journeyStats.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 relative z-10 text-center max-w-sm mx-auto">
            {journeyStats.stats.map((st: any, i: number) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm"
              >
                <span className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#DFB755] block">
                  {st.value}
                </span>
                <span className="text-[9.5px] text-slate-300 uppercase tracking-wider block mt-0.5">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. QUICK TASTE MATCH FINDER (Mithai Quiz Banner)
         ───────────────────────────────────────────────────────────── */}
      {tasteQuizBanner.enabled !== false && (
        <section className="py-6 px-3.5 sm:px-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#DFB755]/20 via-[#DFB755]/10 to-white border border-[#DFB755]/40 p-5 flex flex-col items-start gap-3.5 shadow-xs">
            <div className="space-y-1.5 text-left">
              <span className="bg-[#DFB755] text-[#0B1B4F] text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                {tasteQuizBanner.tag}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0B1B4F]">
                {tasteQuizBanner.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {tasteQuizBanner.description}
              </p>
            </div>
            <Link
              href={tasteQuizBanner.buttonLink || "/find-your-sweet"}
              className="bg-[#0B1B4F] text-[#FDFBF7] font-bold text-xs px-5 py-2.5 rounded-xl shadow-md hover:bg-[#DFB755] hover:text-[#0B1B4F] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{tasteQuizBanner.buttonText}</span>
              <span>✨</span>
            </Link>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. STORE LOCATIONS SUMMARY (Kalol Flagship Stores)
         ───────────────────────────────────────────────────────────── */}
      {outletsSection.enabled !== false && (
        <section id="stores" className="py-6 px-3.5 sm:px-4 border-t border-[#0B1B4F]/10">
          <div className="mb-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#DFB755] block">
              {outletsSection.tag}
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#0B1B4F]">
              {outletsSection.title}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
            {outletsSection.stores.map((store: any, idx: number) => (
              <div
                key={idx}
                className="bg-[#f5f3ef] rounded-xl p-3.5 border border-[#0B1B4F]/10 flex items-start gap-3 shadow-2xs"
              >
                <div className="bg-[#0B1B4F] text-[#DFB755] p-2.5 rounded-lg shrink-0">
                  <span className="text-base">🏬</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[#0B1B4F] text-xs sm:text-sm truncate">
                    {store.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {store.address}
                  </p>
                  <span className="text-[10px] font-semibold text-[#DFB755] mt-1.5 inline-flex items-center gap-1">
                    <span>🕒</span>
                    <span>{store.timings}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. FOOTER (Quick Links & Newsletter)
         ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0B1B4F] text-[#FDFBF7] pt-8 pb-10 px-4 border-t border-white/10 mt-6 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#FDFBF7]">
          Vardayini
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
          Crafting pure desi ghee sweets with traditional dedication and modern artisanal finesse since 1951 in Kalol.
        </p>

        {/* Newsletter Box */}
        <div className="mt-5 max-w-sm mx-auto">
          <form onSubmit={handleNewsletter} className="flex gap-1.5">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DFB755] flex-1"
            />
            <button
              type="submit"
              className="bg-[#DFB755] text-[#0B1B4F] font-bold px-4 py-2 rounded-lg text-xs hover:bg-[#eac467] transition shrink-0 cursor-pointer"
            >
              Join
            </button>
          </form>
          {newsletterDone && (
            <p className="text-[11px] text-emerald-400 font-semibold mt-1.5">
              ✓ Subscribed for secret sweet drops!
            </p>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex justify-center flex-wrap gap-4 text-xs text-slate-300 mt-6 pt-5 border-t border-white/10">
          <Link href="/shop" className="hover:text-[#DFB755] transition">Shop All</Link>
          <Link href="/find-your-sweet" className="hover:text-[#DFB755] transition">Mithai Quiz</Link>
          <Link href="/outlets" className="hover:text-[#DFB755] transition">Stores</Link>
          <Link href="/orders" className="hover:text-[#DFB755] transition">Track Order</Link>
          <Link href="/privacy" className="hover:text-[#DFB755] transition">Privacy</Link>
        </div>

        <div className="pt-5 text-[10px] text-slate-400">
          © 1951–2026 Vardayini Sweet Mart. All Rights Reserved. Crafted with Shuddh Desi Ghee in Kalol, Gujarat.
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          11. FIXED BOTTOM NAVIGATION BAR (App-like Navigation)
         ───────────────────────────────────────────────────────────── */}
      {mobileConfig.bottomNav?.enabled !== false && (
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#0B1B4F]/10 bg-white/95 backdrop-blur-md px-2 pb-2.5 pt-1.5 shadow-2xl max-w-md mx-auto sm:max-w-none"
        >
          {/* Home */}
          <Link
            href="/"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[#0B1B4F] hover:text-[#DFB755] transition active:scale-95"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 256 256">
              <path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z" />
            </svg>
            <span className="text-[10px] font-bold tracking-tight">Home</span>
          </Link>

          {/* Shop */}
          <Link
            href="/shop"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-[#0B1B4F] transition active:scale-95"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 256 256">
              <path d="M216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,1,1-16,0V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.65,2.34l56,56A8,8,0,0,1,216,88Zm-56-8h28.69L160,51.31Zm-13.3,64.47a8,8,0,0,0-10.23,4.84L124,184.21l-12.47-34.9a8,8,0,1,0-15.06,5.38l20,56a8,8,0,0,0,15.07,0l20-56A8,8,0,0,0,146.7,144.47ZM208,176h-8a8,8,0,0,0,0,16v5.29a13.38,13.38,0,0,1-8,2.71c-8.82,0-16-9-16-20s7.18-20,16-20a13.27,13.27,0,0,1,7.53,2.38,8,8,0,0,0,8.95-13.26A29.38,29.38,0,0,0,192,144c-17.64,0-32,16.15-32,36s14.36,36,32,36a30.06,30.06,0,0,0,21.78-9.6,8,8,0,0,0,2.22-5.53V184A8,8,0,0,0,208,176Z" />
            </svg>
            <span className="text-[10px] font-medium tracking-tight">Shop</span>
          </Link>

          {/* Gifting */}
          <Link
            href="/shop?category=gifting"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-[#0B1B4F] transition active:scale-95"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 256 256">
              <path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39A13.69,13.69,0,0,1,69.5,72a16.6,16.6,0,0,1-15.37-35.13ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z" />
            </svg>
            <span className="text-[10px] font-medium tracking-tight">Gifting</span>
          </Link>

          {/* Stores */}
          <Link
            href="/outlets"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-[#0B1B4F] transition active:scale-95"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 256 256">
              <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z" />
            </svg>
            <span className="text-[10px] font-medium tracking-tight">Stores</span>
          </Link>

          {/* Cart with live badge */}
          <Link
            href="/cart"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-[#0B1B4F] transition active:scale-95 relative"
          >
            <div className="relative">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM5.2 6l1.5-2h10.6l1.5 2H5.2zM12 9a3 3 0 0 1 3 3h-2a1 1 0 0 0-2 0H9a3 3 0 0 1 3-3z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#DFB755] text-[#0B1B4F] font-black text-[9px] h-3.5 w-3.5 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight">Cart</span>
          </Link>
        </nav>
      )}

      {/* ─────────────────────────────────────────────────────────────
          12. SIDE MENU DRAWER (Smooth Slide-In)
         ───────────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0B1B4F]">
                  Vardayini
                </h3>
                <p className="text-[10px] text-[#DFB755] font-bold uppercase tracking-wider">
                  Artisanal Mithai & Snacks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <nav className="mt-5 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-[#0B1B4F] hover:bg-amber-50"
              >
                <span>🏠</span> Home
              </Link>
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:bg-amber-50"
              >
                <span>🍬</span> All Sweets & Snacks
              </Link>
              <Link
                href="/shop?category=sweets"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:bg-amber-50"
              >
                <span>🍯</span> Pure Desi Ghee Sweets
              </Link>
              <Link
                href="/shop?category=gifting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:bg-amber-50"
              >
                <span>🎁</span> Festive Gift Hampers
              </Link>
              <Link
                href="/find-your-sweet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-[#DFB755] bg-amber-500/10 hover:bg-amber-500/20"
              >
                <span>✨</span> Mithai Personality Quiz
              </Link>
              <Link
                href="/outlets"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:bg-amber-50"
              >
                <span>📍</span> Kalol Counter & Stores
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:bg-amber-50"
              >
                <span>📦</span> Track My Order
              </Link>
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100">
              <a
                href="https://wa.me/919825019760?text=Hello%20Vardayini%20Sweet%20Mart!%20I%20would%20like%20to%20order%20sweets."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>💬</span> WhatsApp Order Help
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          13. FLOATING ACTION TOAST
         ───────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0B1B4F] text-[#DFB755] border border-[#DFB755]/50 px-4 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
