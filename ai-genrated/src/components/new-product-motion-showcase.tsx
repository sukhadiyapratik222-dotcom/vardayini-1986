"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { formatInr, unitPrice } from "@/lib/money";
import { Magnetic } from "@/components/core/magnetic";
import { Stepper } from "@/components/ui/stepper";

export interface ProductVariant {
  id: number;
  weight: string;
  sku: string;
  price: number;
  discountedPrice: number | null;
  stock: number;
}

export interface ShowcaseProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  tags: string;
  isFeatured: boolean;
  categoryName: string;
  categorySlug: string;
  fromPrice: number;
  comparePrice: number | null;
  variants: ProductVariant[];
  badge?: string;
  tasteNotes?: string;
  shelfLife?: string;
  ingredients?: string;
}

export interface NewLaunchCategoryTab {
  id: string;
  label: string;
  active?: boolean;
}

export interface NewLaunchCountdownConfig {
  enabled?: boolean;
  title?: string;
  targetDate?: string;
  promoCode?: string;
  promoText?: string;
}

export interface NewLaunchSpotlightConfig {
  enabled?: boolean;
  eyebrow?: string;
  heading?: string;
  productId?: number;
  customTitle?: string;
  customDescription?: string;
  customBadge?: string;
  reviewRating?: string;
  highlight1Label?: string;
  highlight1Value?: string;
  highlight2Label?: string;
  highlight2Value?: string;
  highlight3Label?: string;
  highlight3Value?: string;
}

export interface NewLaunchMarqueeConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  cardCount?: number;
}

export interface NewLaunchPromoBannerConfig {
  enabled?: boolean;
  badge?: string;
  headline?: string;
  couponCode?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface NewLaunchCatalogueConfig {
  badge?: string;
  title?: string;
  subtitle?: string;
  enableSearch?: boolean;
  enableSort?: boolean;
  categoryTabs?: NewLaunchCategoryTab[];
  productIds?: number[];
}

export interface NewLaunchConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  tickerTexts?: string[];
  countdown?: NewLaunchCountdownConfig;
  spotlight?: NewLaunchSpotlightConfig;
  marquee?: NewLaunchMarqueeConfig;
  promoBanner?: NewLaunchPromoBannerConfig;
  catalogue?: NewLaunchCatalogueConfig;
  productIds?: number[];
  filterMode?: "curated" | "all";
}

interface NewProductMotionShowcaseProps {
  products: ShowcaseProduct[];
  config?: NewLaunchConfig;
  welcomeOfferConfig?: any;
}

const DEFAULT_TICKERS = [
  "Handcrafted with 100% Shuddh Gir Cow Desi Ghee",
  "Adorned with Pure Edible 24K Silver Leaf & Iranian Saffron",
  "Fresh Morning Batches Direct for Mandvi & Alkapuri Customers",
  "Zero Artificial Essence · 100% Wholesome Authentic Purity",
  "Vacuum Sealed & Delivered Fresh Across Gujarat & India",
];

const DEFAULT_CATEGORY_TABS: NewLaunchCategoryTab[] = [
  { id: "all", label: "🌟 All New Releases", active: true },
  { id: "sweets", label: "👑 Royal Mithai", active: true },
  { id: "farsan", label: "🥟 Crisp Farsan", active: true },
  { id: "sugarless", label: "🍃 Sugar-Free", active: true },
  { id: "hampers", label: "🎁 Luxury Hampers", active: true },
];

export function NewProductMotionShowcase({
  products,
  config,
  welcomeOfferConfig,
}: NewProductMotionShowcaseProps) {
  // Page Hero Configuration
  const activeTickerItems =
    config?.tickerTexts && config.tickerTexts.length > 0
      ? config.tickerTexts
      : DEFAULT_TICKERS;

  const pageBadge = config?.badge || "Fresh 2026 Collection · Customers' Choice Batch";
  const pageTitle = config?.title || "New Artisanal Creations, Crafted in Pure Motion.";
  const pageSubtitle =
    config?.subtitle ||
    "Explore our latest limited-run batches. Tap any creation below to experience our interactive morphing inspection, ingredient sourcing stories, and authentic royal flavors.";
  const primaryCtaText = config?.primaryCtaText || "👑 Inspect Signature Creation";
  const secondaryCtaText = config?.secondaryCtaText || "Browse All Releases ↓";

  // 1. Animated Text Loop State
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % activeTickerItems.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [activeTickerItems]);

  // 2. Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (config?.countdown?.enabled === false) return;
    const target = config?.countdown?.targetDate
      ? new Date(config.countdown.targetDate).getTime()
      : Date.now() + 3 * 24 * 3600 * 1000;

    function update() {
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [config?.countdown?.targetDate, config?.countdown?.enabled]);

  function handleCopyPromoCode(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  }

  // 3. Category Tabs State
  const activeTabsList = useMemo(() => {
    if (
      config?.catalogue?.categoryTabs &&
      config.catalogue.categoryTabs.length > 0
    ) {
      const filtered = config.catalogue.categoryTabs.filter(
        (t) => t.active !== false
      );
      return filtered.length > 0 ? filtered : DEFAULT_CATEGORY_TABS;
    }
    return DEFAULT_CATEGORY_TABS;
  }, [config?.catalogue?.categoryTabs]);

  const [activeTab, setActiveTab] = useState(activeTabsList[0]?.id || "all");

  // Keep activeTab valid if tabs change
  useEffect(() => {
    if (!activeTabsList.some((t) => t.id === activeTab)) {
      setActiveTab(activeTabsList[0]?.id || "all");
    }
  }, [activeTabsList, activeTab]);

  // 4. Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "name"
  >("featured");

  // 5. Wishlist Map State
  const [wishlistMap, setWishlistMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("vsm_wishlist_ids");
      if (stored) setWishlistMap(JSON.parse(stored));
    } catch {}
  }, []);

  const handleToggleWishlist = (e: React.MouseEvent, p: ShowcaseProduct) => {
    e.stopPropagation();
    const nextState = !wishlistMap[p.id];
    const nextMap = { ...wishlistMap, [p.id]: nextState };
    if (!nextState) delete nextMap[p.id];
    setWishlistMap(nextMap);

    try {
      localStorage.setItem("vsm_wishlist_ids", JSON.stringify(nextMap));
      const storedItems = localStorage.getItem("vsm_guest_wishlist_items");
      const itemsMap: Record<number, any> = storedItems ? JSON.parse(storedItems) : {};
      if (nextState) {
        itemsMap[p.id] = {
          id: p.id,
          productId: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          slug: p.slug,
        };
      } else {
        delete itemsMap[p.id];
      }
      localStorage.setItem("vsm_guest_wishlist_items", JSON.stringify(itemsMap));

      fetch("/api/wishlist", {
        method: nextState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id }),
      }).catch(() => {});

      window.dispatchEvent(new Event("wishlist-updated"));
    } catch {}
  };

  // 6. Morphing Dialog State
  const [selectedProduct, setSelectedProduct] = useState<ShowcaseProduct | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedToast, setAddedToast] = useState<{ show: boolean; name: string } | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProduct(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset variant index when opening modal
  useEffect(() => {
    if (selectedProduct) {
      setSelectedVariantIdx(0);
      setQuantity(1);
    }
  }, [selectedProduct]);

  // 7. Filter & Sort Products
  const filteredProducts = useMemo(() => {
    const configuredIds = config?.productIds || config?.catalogue?.productIds;
    // CRITICAL: If the admin selected curated products, always honor the curated list
    // unless explicitly "all" and no products are selected.
    const hasCuratedSelection = Boolean(
      configuredIds &&
        configuredIds.length > 0 &&
        (config?.filterMode === "curated" || configuredIds.length < (products?.length || 0))
    );
    const isCurated = config?.filterMode === "curated" || hasCuratedSelection;

    let baseList = products || [];
    if (isCurated && configuredIds && configuredIds.length > 0) {
      const idMap = new Map((products || []).map((p) => [p.id, p]));
      const matched = configuredIds
        .map((id) => idMap.get(id))
        .filter((p): p is ShowcaseProduct => p !== undefined);
      if (matched.length > 0) {
        baseList = matched;
      }
    }

    let result = baseList.filter((p) => {
      const catSlug = (p.categorySlug || "").toLowerCase();
      const pTags = (p.tags || "").toLowerCase();
      const pName = (p.name || "").toLowerCase();
      const pDesc = (p.description || "").toLowerCase();

      // Tab Filtering
      if (activeTab !== "all") {
        if (activeTab === "sweets") {
          const match =
            catSlug.includes("kaju") ||
            catSlug.includes("mawa") ||
            catSlug.includes("penda") ||
            catSlug.includes("ghee") ||
            catSlug.includes("sweet");
          if (!match) return false;
        } else if (activeTab === "farsan") {
          const match =
            catSlug.includes("namkeen") ||
            catSlug.includes("khakhra") ||
            catSlug.includes("sev") ||
            catSlug.includes("farali") ||
            catSlug.includes("roasted") ||
            catSlug.includes("millet") ||
            catSlug.includes("farsan");
          if (!match) return false;
        } else if (activeTab === "sugarless") {
          const match =
            catSlug.includes("sugarless") || pTags.includes("sugarless");
          if (!match) return false;
        } else if (activeTab === "hampers") {
          const match =
            catSlug.includes("packed") ||
            pName.includes("hamper") ||
            pName.includes("box");
          if (!match) return false;
        } else {
          // Custom tab match
          const tId = activeTab.toLowerCase();
          const match =
            catSlug.includes(tId) ||
            pTags.includes(tId) ||
            pName.includes(tId);
          if (!match) return false;
        }
      }

      // Search Query Filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          pName.includes(q) ||
          pDesc.includes(q) ||
          catSlug.includes(q) ||
          pTags.includes(q) ||
          (p.ingredients && p.ingredients.toLowerCase().includes(q)) ||
          (p.tasteNotes && p.tasteNotes.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });

    // Sorting: when curated, default preserves the exact curated order from admin (↑ / ↓)
    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => a.fromPrice - b.fromPrice);
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => b.fromPrice - a.fromPrice);
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (!isCurated) {
      // Only re-sort by featured if not using custom curated display order
      result = [...result].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    return result;
  }, [products, activeTab, searchQuery, sortBy, config?.productIds, config?.catalogue?.productIds, config?.filterMode]);

  // 8. Flagship Spotlight Product Selection
  const spotlightCfg = config?.spotlight;
  const heroProduct = useMemo(() => {
    if (spotlightCfg?.productId) {
      const match = (products || []).find((p) => p.id === spotlightCfg.productId);
      if (match) return match;
    }
    return (
      (products || []).find((p) => (p.name || "").toLowerCase().includes("kaju katli")) ||
      products?.[0]
    );
  }, [products, spotlightCfg?.productId]);

  const [heroVariantIdx, setHeroVariantIdx] = useState(0);
  const heroVariant = heroProduct?.variants?.[heroVariantIdx] || heroProduct?.variants?.[0];
  const heroPrice = heroVariant
    ? unitPrice(heroVariant.price, heroVariant.discountedPrice)
    : heroProduct?.fromPrice || 0;

  // Add to cart handler
  async function handleAddToCart(variantId?: number, qty = 1, productName = "Item") {
    if (!variantId) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, quantity: qty }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setAddedToast({ show: true, name: productName });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cart-updated", { detail: { count: data?.count } })
          );
        }
        setTimeout(() => setAddedToast(null), 3000);
      }
    } catch (e) {
      console.error("Cart add error", e);
    } finally {
      setIsAdding(false);
    }
  }

  // Marquee products: strictly unique creations (no duplicates)
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  const handleScrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 260 * 2;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const marqueeCount = config?.marquee?.cardCount || 16;
  const marqueeProducts = useMemo(() => {
    const configuredIds = config?.productIds || config?.catalogue?.productIds;
    const hasCuratedSelection = Boolean(
      configuredIds &&
        configuredIds.length > 0 &&
        (config?.filterMode === "curated" || configuredIds.length < (products?.length || 0))
    );
    const isCurated = config?.filterMode === "curated" || hasCuratedSelection;
    let baseList = products || [];
    if (isCurated && configuredIds && configuredIds.length > 0) {
      const idMap = new Map((products || []).map((p) => [p.id, p]));
      const matched = configuredIds
        .map((id) => idMap.get(id))
        .filter((p): p is ShowcaseProduct => p !== undefined);
      if (matched.length > 0) {
        baseList = matched;
      }
    }

    // Deduplicate by product id so no product is ever shown twice
    const uniqueMap = new Map<number, ShowcaseProduct>();
    for (const p of baseList) {
      if (!uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    }
    return Array.from(uniqueMap.values()).slice(0, marqueeCount);
  }, [products, marqueeCount, config?.productIds, config?.catalogue?.productIds, config?.filterMode]);

  // Gentle auto-advance for the rolling carousel when there are multiple products
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || isCarouselHovered || marqueeProducts.length <= 3) return;

    const timer = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 15) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 260, behavior: "smooth" });
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [isCarouselHovered, marqueeProducts.length]);

  return (
    <div className="relative min-h-screen bg-[#faf8f5] text-[#182230] selection:bg-[#dfb755]/30">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO HEADER: TextShimmer + TextEffect + TextLoop
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-14 sm:pt-20 sm:pb-20 border-b border-[#0b2f8a]/10">
        {/* Soft Radial Ambient Lighting */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-[radial-gradient(ellipse_at_center,rgba(223,183,85,0.18)_0%,rgba(11,47,138,0.06)_50%,transparent_70%)] blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Motion Badge with Shimmering Gradient */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-[#dfb755]/50 bg-white/80 px-4 py-1.5 shadow-xs backdrop-blur-md mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#dfb755] animate-ping" />
            <span className="text-xs font-bold tracking-widest uppercase text-shimmer">
              {pageBadge}
            </span>
          </motion.div>

          {/* Main Title with Staggered Entrance */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#0b2f8a] leading-[1.15]"
          >
            {pageTitle}
          </motion.h1>

          {/* Animated TextLoop Subtitle */}
          <div className="mt-5 h-8 sm:h-9 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={textIndex}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="text-sm sm:text-base md:text-lg font-medium text-[#182230]/80 tracking-wide"
              >
                ✨ {activeTickerItems[textIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto mt-4 max-w-2xl text-xs sm:text-sm text-slate-500 leading-relaxed"
          >
            {pageSubtitle}
          </motion.p>

          {/* Action Pills */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
          >
            <a
              href="#flagship"
              className="btn-primary rounded-full px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-lg shadow-[#0b2f8a]/20 hover:scale-105 transition active:scale-95"
            >
              {primaryCtaText}
            </a>
            <a
              href="#catalogue"
              className="rounded-full bg-white border border-slate-200 px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-[#0b2f8a] hover:text-[#0b2f8a] shadow-2xs hover:scale-105 transition active:scale-95"
            >
              {secondaryCtaText} ({filteredProducts.length})
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. LIMITED BATCH LAUNCH COUNTDOWN TIMER BAR
         ───────────────────────────────────────────────────────────── */}
      {config?.countdown?.enabled !== false && (
        <div className="bg-gradient-to-r from-[#071c54] via-[#0b2f8a] to-[#1a3fa3] text-white py-3.5 px-4 border-b border-[#dfb755]/30">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#dfb755] animate-ping" />
              <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
                {config?.countdown?.title || "⚡ Next Fresh Morning Dispatch Batch In"}:
              </span>
            </div>

            {/* Digits Display */}
            <div className="flex items-center gap-2 font-mono">
              <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 text-center min-w-[48px]">
                <span className="text-sm sm:text-base font-bold text-[#dfb755]">
                  {String(timeLeft.days).padStart(2, "0")}
                </span>
                <span className="block text-[9px] uppercase text-white/60">Days</span>
              </div>
              <span className="text-[#dfb755] font-bold">:</span>
              <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 text-center min-w-[48px]">
                <span className="text-sm sm:text-base font-bold text-[#dfb755]">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="block text-[9px] uppercase text-white/60">Hours</span>
              </div>
              <span className="text-[#dfb755] font-bold">:</span>
              <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 text-center min-w-[48px]">
                <span className="text-sm sm:text-base font-bold text-[#dfb755]">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="block text-[9px] uppercase text-white/60">Mins</span>
              </div>
              <span className="text-[#dfb755] font-bold">:</span>
              <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 text-center min-w-[48px]">
                <span className="text-sm sm:text-base font-bold text-[#dfb755]">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="block text-[9px] uppercase text-white/60">Secs</span>
              </div>
            </div>

            {/* Promo Code & Copy Action */}
            {config?.countdown?.promoCode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/80 hidden lg:inline">
                  {config?.countdown?.promoText || "Use coupon code:"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyPromoCode(config?.countdown?.promoCode || "LAUNCH10")
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dfb755] text-[#0b2f8a] text-xs font-bold hover:bg-[#b89130] transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <span className="font-mono tracking-wider">
                    {config?.countdown?.promoCode}
                  </span>
                  <span className="text-[10px]">
                    {copiedCode ? "✓ Copied!" : "📋 Copy"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. FLAGSHIP HERO SPOTLIGHT: Card with BorderTrail Glowing Beam
         ───────────────────────────────────────────────────────────── */}
      {heroProduct && config?.spotlight?.enabled !== false && (
        <section id="flagship" className="py-16 sm:py-20 bg-white/60 border-b border-[#0b2f8a]/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b89130]">
                {config?.spotlight?.eyebrow || "Flagship of the Season"}
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a]">
                {config?.spotlight?.heading || "The Gold Standard of Purity"}
              </h2>
            </div>

            {/* Glowing Border Trail Container */}
            <div className="mx-auto max-w-4xl p-[2px] rounded-3xl border-trail-glow shadow-2xl">
              <div className="border-trail-glow-inner p-6 sm:p-10 rounded-[22px] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Left: Interactive Image Showcase */}
                <div className="md:col-span-6 relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#faf7f0] border border-[#dfb755]/20 group">
                  <Image
                    src={heroProduct.imageUrl || "/images/kaju-katli-showcase.jpg"}
                    alt={heroProduct.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-108"
                    sizes="(min-width: 1024px) 500px, 100vw"
                    priority
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#0b2f8a]/90 backdrop-blur-md text-[#dfb755] px-3 py-1 text-xs font-bold shadow-md">
                    <span>👑</span>
                    <span>{config?.spotlight?.customBadge || "Signature Batch 2026"}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#b89130] shadow-sm backdrop-blur-md">
                    {config?.spotlight?.reviewRating || "★ 5.0 (420+ Reviews)"}
                  </div>
                </div>

                {/* Right: Product Details & Dynamic Interaction */}
                <div className="md:col-span-6 space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b89130]">
                      {heroProduct.categoryName}
                    </span>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a] leading-tight">
                      {config?.spotlight?.customTitle || heroProduct.name}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {config?.spotlight?.customDescription || heroProduct.description}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-3 gap-2.5 py-2 border-y border-slate-100 text-center">
                    <div className="bg-[#faf8f5] p-2 rounded-xl border border-amber-100/50">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {config?.spotlight?.highlight1Label || "Ghee Purity"}
                      </p>
                      <p className="text-xs font-bold text-[#0b2f8a]">
                        {config?.spotlight?.highlight1Value || "100% Desi Gir Cow"}
                      </p>
                    </div>
                    <div className="bg-[#faf8f5] p-2 rounded-xl border border-amber-100/50">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {config?.spotlight?.highlight2Label || "Cashew Grade"}
                      </p>
                      <p className="text-xs font-bold text-[#0b2f8a]">
                        {config?.spotlight?.highlight2Value || "Whole W-240"}
                      </p>
                    </div>
                    <div className="bg-[#faf8f5] p-2 rounded-xl border border-amber-100/50">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {config?.spotlight?.highlight3Label || "Shelf Life"}
                      </p>
                      <p className="text-xs font-bold text-[#0b2f8a]">
                        {config?.spotlight?.highlight3Value || "20 Days Fresh"}
                      </p>
                    </div>
                  </div>

                  {/* Variant Selector Tabs */}
                  {heroProduct?.variants && heroProduct.variants.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700">Select Packaging Weight:</p>
                      <div className="flex flex-wrap gap-2">
                        {heroProduct.variants.map((v, idx) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setHeroVariantIdx(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              heroVariantIdx === idx
                                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20 scale-102"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {v.weight} — ₹{v.discountedPrice || v.price}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price & Add to Cart Action */}
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold text-[#182230]">
                          {formatInr(heroPrice)}
                        </span>
                        {heroVariant?.discountedPrice && heroVariant.price > heroPrice && (
                          <span className="text-xs sm:text-sm text-slate-400 line-through">
                            {formatInr(heroVariant.price)}
                          </span>
                        )}
                        {heroVariant?.discountedPrice && heroVariant.price > heroPrice && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-700 border border-emerald-200">
                            {Math.round(((heroVariant.price - heroPrice) / heroVariant.price) * 100)}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        ✓ In Stock &amp; Freshly Packed
                      </p>
                    </div>

                    <Magnetic>
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() =>
                          heroVariant && handleAddToCart(heroVariant.id, 1, heroProduct.name)
                        }
                        className="btn-gold rounded-full px-6 py-3 text-xs sm:text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                      >
                        <span>🛒</span>
                        <span>Add to Mithai Box</span>
                      </button>
                    </Magnetic>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. INFINITE SLIDER: Seamless Continuous Horizontal Marquee
         ───────────────────────────────────────────────────────────── */}
      {config?.marquee?.enabled !== false && (
        <section className="py-12 bg-[#071c54] text-white overflow-hidden border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#dfb755]">
                {config?.marquee?.badge || "Live From Kalol Kitchens"}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-white">
                {config?.marquee?.title || "Fresh Daily Rolling Carousel"}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-300">
                {config?.marquee?.subtitle || "Hover to pause · Click card to inspect details"}
              </p>
              {marqueeProducts.length > 3 && (
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => handleScrollCarousel("left")}
                    className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer border border-white/15"
                    aria-label="Previous creations"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollCarousel("right")}
                    className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer border border-white/15"
                    aria-label="Next creations"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Carousel Track: Each Product Shown Once */}
          <div className="relative w-full overflow-hidden">
            <div
              ref={carouselRef}
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
              className="flex items-stretch gap-5 overflow-x-auto no-scrollbar py-2 px-4 sm:px-6 lg:px-8 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {marqueeProducts.map((product) => (
                <button
                  key={`marquee-${product.id}`}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="group relative flex w-[230px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15 text-left transition hover:bg-white/20 hover:scale-103 cursor-pointer"
                >
                  <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-white/5">
                    <Image
                      src={product.imageUrl || "/images/kaju-katli.jpg"}
                      alt={product.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-110"
                      sizes="230px"
                    />
                    <div className="absolute top-2 left-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-[#dfb755] uppercase">
                      New Launch
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-0.5">
                    <p className="text-xs font-bold text-white truncate group-hover:text-[#dfb755] transition">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-slate-300 truncate">
                      {product.categoryName}
                    </p>
                    <p className="text-xs font-bold text-[#dfb755] pt-0.5">
                      From {formatInr(product.fromPrice)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. PROMOTIONAL FESTIVE BANNER
         ───────────────────────────────────────────────────────────── */}
      {config?.promoBanner?.enabled !== false && (
        <section className="py-8 bg-gradient-to-r from-[#dfb755]/15 via-amber-100/40 to-[#0b2f8a]/10 border-b border-[#dfb755]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-lg border border-[#dfb755]/40 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <span className="inline-block rounded-full bg-amber-100 text-amber-900 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                  {config?.promoBanner?.badge || "Special Launch Gift"}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#0b2f8a]">
                  {config?.promoBanner?.headline ||
                    "Complimentary Pure Kaju Katli Box on all New Launch orders above ₹999"}
                </h3>
                <p className="text-xs text-slate-500">
                  Automatically applied at checkout with coupon code{" "}
                  <span className="font-mono font-bold text-[#0b2f8a] bg-slate-100 px-2 py-0.5 rounded">
                    {config?.promoBanner?.couponCode || "ROYAL1976"}
                  </span>
                  . Handcrafted daily in Kalol.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyPromoCode(
                      config?.promoBanner?.couponCode || "ROYAL1976"
                    )
                  }
                  className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  {copiedCode ? "✓ Copied" : "Copy Code"}
                </button>
                <a
                  href={config?.promoBanner?.buttonLink || "#catalogue"}
                  className="btn-gold rounded-full px-5 py-2.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition"
                >
                  {config?.promoBanner?.buttonText || "Claim Offer"} →
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. INTERACTIVE CATALOGUE: Search, Sort, Tabs & Grid
         ───────────────────────────────────────────────────────────── */}
      <section id="catalogue" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#b89130]">
              {config?.catalogue?.badge || "Complete 2026 Release"}
            </span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#0b2f8a]">
              {config?.catalogue?.title || "Discover Every New Masterpiece"}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              {config?.catalogue?.subtitle ||
                "Each recipe has been carefully calibrated for purity, balanced sweetness, and exquisite texture."}
            </p>

            {/* Sliding Pill Segmented Control */}
            <div className="mt-8 inline-flex flex-wrap items-center justify-center p-1.5 rounded-full bg-slate-200/80 backdrop-blur-md border border-slate-300/60 shadow-inner gap-1">
              {activeTabsList.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="relative px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors cursor-pointer select-none"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFilterPill"
                        className="absolute inset-0 rounded-full bg-[#0b2f8a] shadow-md shadow-[#0b2f8a]/20"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors ${
                        isActive
                          ? "text-white font-bold"
                          : "text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
              {config?.catalogue?.enableSearch !== false && (
                <div className="relative w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sweets, farsan, ingredients..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0b2f8a] focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Showing <strong className="text-slate-800">{filteredProducts.length}</strong> creations
              </span>

              {config?.catalogue?.enableSort !== false && (
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-dropdown" className="text-xs text-slate-500 font-medium">Sort:</label>
                  <select
                    id="sort-dropdown"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-[#0b2f8a]"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              7. MORPHING DIALOG CARDS GRID: Click to Expand Card
             ───────────────────────────────────────────────────────────── */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto space-y-3">
              <span className="text-4xl">🍬</span>
              <h3 className="font-bold text-slate-800 text-lg">
                No creations match your search
              </h3>
              <p className="text-xs text-slate-500">
                Try selecting &quot;All New Releases&quot; or clearing your search keywords.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
                className="rounded-full bg-[#0b2f8a] text-white px-5 py-2 text-xs font-bold hover:bg-[#1a3fa3] transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <motion.div
              layout
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredProducts.map((product) => {
                const isWishlisted = !!wishlistMap[product.id];
                return (
                  <motion.div
                    layout
                    layoutId={`product-card-${product.id}`}
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                    onClick={() => setSelectedProduct(product)}
                    className="mithai-card group relative flex flex-col justify-between overflow-hidden bg-white p-3.5 rounded-2xl cursor-pointer hover:border-[#dfb755]/50 transition-all hover:shadow-xl"
                  >
                    <div>
                      {/* Image Container with Morphing Image LayoutId */}
                      <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-[#faf7f0]">
                        <motion.div
                          layoutId={`product-image-${product.id}`}
                          className="h-full w-full relative"
                        >
                          <Image
                            src={product.imageUrl || "/images/kaju-katli.jpg"}
                            alt={product.name}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-108"
                            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
                          />
                        </motion.div>

                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#0b2f8a] shadow-sm backdrop-blur-sm">
                            {product.categoryName}
                          </span>
                        </div>

                        {/* Wishlist Heart Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(e, product)}
                          className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition-transform hover:scale-115 active:scale-90 cursor-pointer"
                          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={isWishlisted ? "#ff3b5c" : "none"}
                            stroke={isWishlisted ? "#ff3b5c" : "currentColor"}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>

                        {/* Expand '+' Button (Motion-Primitives Style) */}
                        <button
                          type="button"
                          className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md backdrop-blur-md transition-all group-hover:bg-[#0b2f8a] group-hover:text-white group-hover:scale-110 active:scale-95"
                          aria-label="Inspect creation"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>

                      {/* Title & Description */}
                      <div className="mt-3 space-y-1">
                        <motion.h4
                          layoutId={`product-title-${product.id}`}
                          className="font-[family-name:var(--font-display)] text-base font-bold text-[#182230] group-hover:text-[#0b2f8a] transition leading-snug line-clamp-2 min-h-[2.5rem]"
                        >
                          {product.name}
                        </motion.h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    {/* Price Bar */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400">Starting at</span>
                        <p className="text-base font-bold text-[#0b2f8a]">
                          {formatInr(product.fromPrice)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#b89130] group-hover:underline">
                        Quick View →
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. EXPANDABLE MORPHING DIALOG MODAL (Motion-Primitives)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Expanded Modal Content with matching layoutId */}
            <motion.div
              layoutId={`product-card-${selectedProduct.id}`}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl z-10 border border-slate-100 my-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 shadow-md backdrop-blur-md transition-all active:scale-90 cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Product Image Header */}
                <div className="relative aspect-square md:aspect-auto h-64 md:h-full w-full bg-[#faf7f0]">
                  <motion.div
                    layoutId={`product-image-${selectedProduct.id}`}
                    className="h-full w-full relative"
                  >
                    <Image
                      src={selectedProduct.imageUrl || "/images/kaju-katli.jpg"}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  </motion.div>
                  <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#0b2f8a] shadow-md backdrop-blur-md">
                    {selectedProduct.categoryName}
                  </div>
                </div>

                {/* Product Details & Actions */}
                <div className="p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b89130]">
                      Artisanal Release 2026
                    </span>
                    <motion.h3
                      layoutId={`product-title-${selectedProduct.id}`}
                      className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a] leading-tight mt-0.5"
                    >
                      {selectedProduct.name}
                    </motion.h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedProduct.description}
                  </p>

                  {/* Sourcing Badges */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                    <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200/50">
                      ✓ 100% Desi Ghee
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/50">
                      ✓ Zero Preservatives
                    </span>
                    <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200/50">
                      ✓ Daily Fresh Batch
                    </span>
                  </div>

                  {/* Weight Selector */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-700">Choose Weight Variant:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProduct.variants.map((v, i) => {
                          const isSelected = selectedVariantIdx === i;
                          const effectivePrice = unitPrice(v.price, v.discountedPrice);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariantIdx(i)}
                              className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                                isSelected
                                  ? "border-[#0b2f8a] bg-[#0b2f8a]/5 ring-1 ring-[#0b2f8a]"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <p className="font-bold text-slate-900">{v.weight}</p>
                              <p className="text-[11px] text-[#0b2f8a] font-semibold">
                                {formatInr(effectivePrice)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity & Total Price */}
                  {selectedProduct.variants && selectedProduct.variants[selectedVariantIdx] && (
                    <div className="pt-2 flex items-center justify-between">
                      <Stepper
                        value={quantity}
                        min={1}
                        max={10}
                        onChange={(val) => setQuantity(val)}
                        size="sm"
                        theme="gold"
                      />

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Total Price</span>
                        <span className="text-xl font-bold text-[#0b2f8a]">
                          {formatInr(
                            unitPrice(
                              selectedProduct.variants[selectedVariantIdx].price,
                              selectedProduct.variants[selectedVariantIdx].discountedPrice
                            ) * quantity
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Add to Box Button */}
                  <div className="pt-2 space-y-2">
                    <Magnetic className="w-full">
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => {
                          const v = selectedProduct.variants[selectedVariantIdx];
                          if (v) {
                            handleAddToCart(v.id, quantity, selectedProduct.name);
                            setSelectedProduct(null);
                          }
                        }}
                        className="btn-primary w-full rounded-2xl py-3 text-sm font-bold shadow-lg shadow-[#0b2f8a]/20 hover:scale-102 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>🎁</span>
                        <span>Add {quantity} to Mithai Box</span>
                      </button>
                    </Magnetic>

                    <Link
                      href={`/shop/${selectedProduct.slug}`}
                      className="block text-center text-xs font-semibold text-slate-500 hover:text-[#0b2f8a] transition pt-1"
                    >
                      View Full Nutritional &amp; Customer Reviews Page →
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          9. FLOATING ADDED-TO-CART TOAST NOTIFICATION
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {addedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.2 }}
            className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 w-[calc(100%-2rem)] sm:w-auto max-w-md rounded-2xl sm:rounded-full bg-slate-900/95 px-4 sm:px-5 py-3 text-white shadow-2xl backdrop-blur-md border border-[#dfb755]/40"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dfb755] text-slate-950 font-bold text-xs">
                ✓
              </span>
              <div className="text-xs min-w-0 flex-1 truncate">
                <span className="font-bold text-[#dfb755]">{addedToast.name}</span> added to your box!
              </div>
            </div>
            <Link
              href="/cart"
              className="shrink-0 whitespace-nowrap rounded-full bg-[#dfb755] px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-white transition"
            >
              View Cart →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
