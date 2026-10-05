"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { WarmCreamHomepage, HomepageProductData } from "@/components/warm-cream-homepage";
import { HeritageHeroBanner } from "@/components/heritage-hero-banner";
import { MainHeroSection } from "@/components/main-hero-section";
import { FestiveSeasonHomeSection } from "@/components/festive-season-home-section";
import { ProductCard } from "@/components/product-card";
import { formatInr } from "@/lib/money";

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface SpecialItemsConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  productIds?: number[];
  linkText?: string;
  linkUrl?: string;
}

interface HomePageClientProps {
  categories: CategoryItem[];
  featured: HomepageProductData[];
  bestsellers: HomepageProductData[];
  specialItemsConfig?: SpecialItemsConfig;
  specialProducts?: HomepageProductData[];
}

export function HomePageClient({
  categories,
  featured,
  bestsellers,
  specialItemsConfig,
  specialProducts = [],
}: HomePageClientProps) {
  // UI Design mode: "warm-cream" (New 2026 Redesign) vs "classic" (Royal Navy Heritage)
  const [uiDesign, setUiDesign] = useState<"warm-cream" | "classic">("warm-cream");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("vsm_ui_design_theme");
      if (saved === "classic" || saved === "warm-cream") {
        setUiDesign(saved);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  function toggleUiDesign() {
    const next = uiDesign === "warm-cream" ? "classic" : "warm-cream";
    setUiDesign(next);
    try {
      localStorage.setItem("vsm_ui_design_theme", next);
    } catch {
      // ignore
    }
  }

  // 1. Warm Cream & Deep Purple Redesign (Default)
  if (uiDesign === "warm-cream") {
    return (
      <WarmCreamHomepage
        categories={categories}
        featuredProducts={featured}
        bestsellers={bestsellers}
        specialItemsConfig={specialItemsConfig}
        specialProducts={specialProducts}
        onToggleUiDesign={toggleUiDesign}
        currentUiDesign={uiDesign}
      />
    );
  }

  // 2. Classic Royal Navy & Gold Design
  return (
    <div className="space-y-16 pb-20">
      {/* Design Switcher Top Bar for Classic Theme */}
      <aside aria-label="Design System Switcher" className="bg-[#0b2f8a] text-white px-4 py-2 text-xs border-b border-[#dfb755]/30">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#dfb755] animate-pulse" />
            <span>
              Active Design: <strong>Royal Navy &amp; Gold (Heritage Classic)</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-200">Switch to the new Warm Cream &amp; Deep-Purple design:</span>
            <button
              type="button"
              onClick={toggleUiDesign}
              className="rounded-full bg-[#dfb755] hover:bg-[#b89130] text-slate-950 px-3 py-1 font-bold text-[11px] shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🎨</span>
              <span>Switch to Warm Cream UI</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Heritage Craftsmanship Hero Banner */}
      <HeritageHeroBanner />

      {/* Featured Showcase Section */}
      <MainHeroSection />

      {/* Indian Festive Season Specials Showcase Section */}
      <FestiveSeasonHomeSection />

      {/* Category Pills Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#182230]">
              Browse By Category
            </h2>
            <p className="text-sm text-[#5e6d82]">
              Select from our freshly rolled sweets and steaming hot snacks
            </p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold text-[#0b2f8a] hover:underline"
          >
            View Full Menu →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <Link href="/shop" className="category-pill active">
            All Items
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="category-pill"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Our Special Items Container - Placed directly above Fresh Daily Specials */}
      {specialItemsConfig?.enabled !== false && specialProducts && specialProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#b89130] bg-[#dfb755]/15 px-3 py-1 rounded-full border border-[#dfb755]/30">
                {specialItemsConfig?.badge || "Karigars' Special Selection"}
              </span>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[#182230] sm:text-4xl flex items-center gap-2">
                <span>{specialItemsConfig?.title || "Our Special Items"}</span>
                <span className="text-xl">✨</span>
              </h2>
              {specialItemsConfig?.subtitle && (
                <p className="mt-1 text-sm text-[#5e6d82]">
                  {specialItemsConfig.subtitle}
                </p>
              )}
            </div>
            <Link
              href={specialItemsConfig?.linkUrl || "/shop"}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b2f8a] hover:text-[#b89130] transition group"
            >
              <span>{specialItemsConfig?.linkText || "See all special items →"}</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {specialProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0b2f8a]">
              Karigars&apos; Choice
            </span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-[#182230] sm:text-4xl">
              Fresh Daily Specials
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-block text-sm font-semibold text-[#0b2f8a] hover:underline"
          >
            See all 24+ items →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Vardayini Promise / Heritage Banner */}
      <section id="story" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-[#0b2f8a] p-8 md:p-14 text-white shadow-xl relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="relative max-w-2xl space-y-4">
            <span className="inline-block rounded-full bg-[#dfb755]/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#dfb755]">
              Our Heritage · Vadodara
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white">
              Three generations of uncompromising taste.
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-white/80">
              Vardayini began as a modest Mandvi counter packing festive ladoos in 1976. Today, we still
              roast besan slowly in pure cow ghee, never compromise on ingredients, and pack orders fresh the
              same morning.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                href="/stores"
                className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold shadow-md"
              >
                Find Our Stores
              </Link>
              <Link
                href="/shop?category=gift-hampers"
                className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Custom Gift Boxes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* House Bestsellers Ranking */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#182230]">
          Customer Favorites
        </h2>
        <p className="mt-1 text-sm text-[#5e6d82]">
          Our most-ordered boxes across Vadodara &amp; Ahmedabad
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {bestsellers.map((product, index) => (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="mithai-card flex items-center gap-4 p-4 hover:border-[#0b2f8a]/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef3ff] font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                #{index + 1}
              </span>
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#faf7f0]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    🍬
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-[#182230]">{product.name}</p>
                <p className="text-xs text-[#5e6d82]">{product.categoryName}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#0b2f8a]">{formatInr(product.fromPrice)}</p>
                <span className="text-[11px] text-[#5e6d82]">View Box →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
