"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { formatInr, unitPrice } from "@/lib/money";
import { Magnetic } from "@/components/core/magnetic";
import { WelcomeOfferBanner } from "@/components/welcome-offer-banner";

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

export interface NewLaunchConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  tickerTexts?: string[];
}

interface NewProductMotionShowcaseProps {
  products: ShowcaseProduct[];
  config?: NewLaunchConfig;
  welcomeOfferConfig?: any;
}

const TEXT_LOOP_ITEMS = [
  "Handcrafted with 100% Shuddh Gir Cow Desi Ghee",
  "Adorned with Pure Edible 24K Silver Leaf & Iranian Saffron",
  "Fresh Morning Batches Direct for Mandvi & Alkapuri Customers",
  "Zero Artificial Essence · 100% Wholesome Authentic Purity",
  "Vacuum Sealed & Delivered Fresh Across Gujarat & India",
];

const CATEGORY_TABS = [
  { id: "all", label: "🌟 All New Releases" },
  { id: "sweets", label: "👑 Royal Mithai" },
  { id: "farsan", label: "🥟 Crisp Farsan" },
  { id: "sugarless", label: "🍃 Sugar-Free" },
  { id: "hampers", label: "🎁 Luxury Hampers" },
];

export function NewProductMotionShowcase({
  products,
  config,
  welcomeOfferConfig,
}: NewProductMotionShowcaseProps) {
  const activeTickerItems =
    config?.tickerTexts && config.tickerTexts.length > 0
      ? config.tickerTexts
      : TEXT_LOOP_ITEMS;

  const pageBadge = config?.badge || "Fresh 2026 Collection · Customers' Choice Batch";
  const pageTitle = config?.title || "New Artisanal Creations, Crafted in Pure Motion.";
  const pageSubtitle =
    config?.subtitle ||
    "Explore our latest limited-run batches. Tap any creation below to experience our interactive morphing inspection, ingredient sourcing stories, and authentic royal flavors.";

  // 1. Text Loop State
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % activeTickerItems.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [activeTickerItems]);

  // 2. Tab Filter State
  const [activeTab, setActiveTab] = useState("all");

  // 3. Morphing Dialog State
  const [selectedProduct, setSelectedProduct] = useState<ShowcaseProduct | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedToast, setAddedToast] = useState<{ show: boolean; name: string } | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProduct(null);
      }
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

  // Filter products based on active tab
  const filteredProducts = products.filter((p) => {
    if (activeTab === "all") return true;
    const catSlug = (p.categorySlug || "").toLowerCase();
    const pTags = (p.tags || "").toLowerCase();
    const pName = (p.name || "").toLowerCase();

    if (activeTab === "sweets") {
      return (
        catSlug.includes("kaju") ||
        catSlug.includes("mawa") ||
        catSlug.includes("penda") ||
        catSlug.includes("ghee") ||
        catSlug.includes("sweet")
      );
    }
    if (activeTab === "farsan") {
      return (
        catSlug.includes("namkeen") ||
        catSlug.includes("khakhra") ||
        catSlug.includes("sev") ||
        catSlug.includes("farali") ||
        catSlug.includes("roasted") ||
        catSlug.includes("millet") ||
        catSlug.includes("farsan")
      );
    }
    if (activeTab === "sugarless") {
      return catSlug.includes("sugarless") || pTags.includes("sugarless");
    }
    if (activeTab === "hampers") {
      return catSlug.includes("packed") || pName.includes("hamper") || pName.includes("box");
    }
    return true;
  });

  // Flagship Hero Product (First featured sweet or default to first product)
  const heroProduct = (products || []).find((p) => (p.name || "").toLowerCase().includes("kaju katli")) || products?.[0];
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

  return (
    <div className="relative min-h-screen bg-[#faf8f5] text-[#182230] selection:bg-[#dfb755]/30">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO HEADER: TextShimmer + TextEffect + TextLoop
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#0b2f8a]/10">
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
              👑 Inspect Signature Creation
            </a>
            <a
              href="#catalogue"
              className="rounded-full bg-white border border-slate-200 px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-[#0b2f8a] hover:text-[#0b2f8a] shadow-2xs hover:scale-105 transition active:scale-95"
            >
              Browse All Releases (42) ↓
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. FLAGSHIP HERO SPOTLIGHT: Card with BorderTrail Glowing Beam
         ───────────────────────────────────────────────────────────── */}
      {heroProduct && (
        <section id="flagship" className="py-16 sm:py-20 bg-white/60 border-b border-[#0b2f8a]/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b89130]">
                Flagship of the Season
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a]">
                The Gold Standard of Purity
              </h2>
            </div>

            {/* Glowing Border Trail Container (Inspired by Motion-Primitives BorderTrail) */}
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
                    <span>Signature Batch 2026</span>
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#b89130] shadow-sm backdrop-blur-md">
                    ★ 5.0 (420+ Reviews)
                  </div>
                </div>

                {/* Right: Product Details & Dynamic Interaction */}
                <div className="md:col-span-6 space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b89130]">
                      {heroProduct.categoryName}
                    </span>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a] leading-tight">
                      {heroProduct.name}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {heroProduct.description}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-3 gap-2.5 py-2 border-y border-slate-100 text-center">
                    <div className="bg-[#faf8f5] p-2 rounded-xl border border-amber-100/50">
                      <p className="text-[10px] text-slate-400 font-medium">Ghee Purity</p>
                      <p className="text-xs font-bold text-[#0b2f8a]">100% Desi Gir Cow</p>
                    </div>
                    <div className="bg-[#faf8f5] p-2 rounded-xl border border-amber-100/50">
                      <p className="text-[10px] text-slate-400 font-medium">Cashew Grade</p>
                      <p className="text-xs font-bold text-[#0b2f8a]">Whole W-240</p>
                    </div>
                    <div className="bg-[#faf8f5] p-2 rounded-xl border border-amber-100/50">
                      <p className="text-[10px] text-slate-400 font-medium">Shelf Life</p>
                      <p className="text-xs font-bold text-[#0b2f8a]">20 Days Fresh</p>
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${heroVariantIdx === idx
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
                      <p className="text-[11px] text-emerald-700 font-medium mt-0.5">✓ In Stock &amp; Freshly Packed</p>
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
          2.5. WELCOME OFFER: Flat 10% Off On Your First Order
         ───────────────────────────────────────────────────────────── */}
      {welcomeOfferConfig?.enabled !== false && (
        <section className="py-12 sm:py-16 bg-[#faf8f5]">
          <WelcomeOfferBanner config={welcomeOfferConfig} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. INFINITE SLIDER: Seamless Continuous Horizontal Marquee
         ───────────────────────────────────────────────────────────── */}
      <section className="py-12 bg-[#071c54] text-white overflow-hidden border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#dfb755]">
              Live From Vadodara Kitchens
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-white">
              Fresh Daily Rolling Carousel
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            Hover to pause · Click card to inspect details
          </p>
        </div>

        {/* Infinite Marquee Track */}
        <div className="relative w-full overflow-hidden">
          <div className="animate-marquee gap-5 py-2">
            {[...(products || []), ...(products || [])].slice(0, 16).map((product, idx) => (
              <button
                key={`${product.id}-${idx}`}
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

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE CATALOGUE: AnimatedBackground Sliding Pill Tabs
         ───────────────────────────────────────────────────────────── */}
      <section id="catalogue" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#b89130]">
              Complete 2026 Release
            </span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#0b2f8a]">
              Discover Every New Masterpiece
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Each recipe has been carefully calibrated for purity, balanced sweetness, and exquisite texture.
            </p>

            {/* Sliding Pill Segmented Control (AnimatedBackground) */}
            <div className="mt-8 inline-flex flex-wrap items-center justify-center p-1.5 rounded-full bg-slate-200/80 backdrop-blur-md border border-slate-300/60 shadow-inner gap-1">
              {CATEGORY_TABS.map((tab) => {
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
                      className={`relative z-10 transition-colors ${isActive ? "text-white font-bold" : "text-slate-700 hover:text-slate-950"
                        }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              5. MORPHING DIALOG CARDS GRID: Click to Expand Card
             ───────────────────────────────────────────────────────────── */}
          <motion.div
            layout
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredProducts.map((product) => {
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
                        className="font-[family-name:var(--font-display)] text-base font-bold text-[#182230] group-hover:text-[#0b2f8a] transition leading-snug line-clamp-1"
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
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. EXPANDABLE MORPHING DIALOG MODAL (The core of motion-primitives)
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
                  {selectedProduct.variants.length > 0 && (
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
                              className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${isSelected
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
                  {selectedProduct.variants[selectedVariantIdx] && (
                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                        >
                          −
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-900">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                          className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                        >
                          +
                        </button>
                      </div>

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
          7. FLOATING ADDED-TO-CART TOAST NOTIFICATION
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {addedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-slate-900/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md border border-white/20"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dfb755] text-slate-950 font-bold text-xs">
              ✓
            </span>
            <div className="text-xs">
              <span className="font-bold text-[#dfb755]">{addedToast.name}</span> added to your box!
            </div>
            <Link
              href="/cart"
              className="ml-2 rounded-full bg-[#dfb755] px-3 py-1 text-xs font-bold text-slate-950 hover:bg-white transition"
            >
              View Cart →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
