"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WarmCreamHomepage, HomepageProductData } from "@/components/warm-cream-homepage";
import { HeritageGlassHero } from "@/components/heritage-glass-hero";
import { HeritageHeroBanner } from "@/components/heritage-hero-banner";
import { ProductListMarquee } from "@/components/product-list-marquee";
import { MainHeroSection } from "@/components/main-hero-section";
import { CulinaryExperienceSection } from "@/components/culinary-experience-section";
import { FestiveSeasonHomeSection } from "@/components/festive-season-home-section";
import { ProductCard } from "@/components/product-card";
import { formatInr } from "@/lib/money";
import {
  Carousel,
  CarouselContent,
  CarouselNavigation,
  CarouselIndicator,
  CarouselItem,
} from "@/components/core/carousel";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogClose,
  MorphingDialogContainer,
} from "@/components/core/morphing-dialog";
import { ScrollArea } from "@/components/website/scroll-area";
import { OutletsSection } from "@/components/outlets-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { CustomerBestsellersSection } from "@/components/customer-bestsellers-section";
import { BrowseByCategorySection } from "@/components/browse-by-category-section";

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
  stores?: any[];
  reviews?: any[];
  uiConfig?: any;
}

export function HomePageClient({
  categories,
  featured,
  bestsellers,
  specialItemsConfig,
  specialProducts = [],
  stores = [],
  reviews = [],
  uiConfig,
}: HomePageClientProps) {
  const router = useRouter();
  // UI Design mode: "warm-cream" (New 2026 Redesign) vs "classic" (Royal Navy Heritage)
  const [uiDesign, setUiDesign] = useState<"warm-cream" | "classic">("warm-cream");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncTheme = () => {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlTheme = params.get("ui") || params.get("theme");
          if (urlTheme === "classic" || urlTheme === "warm-cream") {
            setUiDesign(urlTheme);
            localStorage.setItem("vsm_ui_design_theme", urlTheme);
            return;
          }
        }
        const saved = localStorage.getItem("vsm_ui_design_theme");
        if (saved === "classic" || saved === "warm-cream") {
          setUiDesign(saved);
        }
      } catch {}
    };

    syncTheme();
    window.addEventListener("vsm_ui_theme_change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("vsm_ui_theme_change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  function toggleUiDesign() {
    const next = uiDesign === "warm-cream" ? "classic" : "warm-cream";
    setUiDesign(next);
    try {
      localStorage.setItem("vsm_ui_design_theme", next);
      window.dispatchEvent(new Event("vsm_ui_theme_change"));
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
        stores={stores}
        reviews={reviews}
        uiConfig={uiConfig}
        onToggleUiDesign={toggleUiDesign}
        currentUiDesign={uiDesign}
      />
    );
  }

  // 2. Classic Royal Navy & Gold Design
  return (
    <div className="pb-20 w-full max-w-full overflow-x-hidden">

      {/* Heritage Craftsmanship Hero Banner */}
      <HeritageGlassHero />

      {/* Artisan Product List Marquee (.bb-marquee) */}
      <ProductListMarquee variant="basil" />

      {/* Main Content Sections with balanced spacing */}
      <div className="space-y-6 sm:space-y-10">
        {/* Featured Showcase Section */}
        <MainHeroSection />

      {/* Elevating The Culinary Experience Pillars Section */}
      {uiConfig?.culinaryPillars?.enabled !== false && <CulinaryExperienceSection />}

      {/* Indian Festive Season Specials Showcase Section */}
      <FestiveSeasonHomeSection />

      {/* 2x2 Grid Category Showcase with Real Food Photography */}
      {uiConfig?.browseByCategory?.enabled !== false && (
        <BrowseByCategorySection
          config={uiConfig?.browseByCategory}
          subcategories={categories}
        />
      )}

      {/* Our Special Items Container - Placed directly above Fresh Daily Specials */}
      {specialItemsConfig?.enabled !== false && specialProducts && specialProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header: Title on Left, Link Button on Right */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b89130] bg-[#dfb755]/15 px-3.5 py-1 rounded-full border border-[#dfb755]/30 shadow-xs mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dfb755] animate-pulse" />
                {specialItemsConfig?.badge || "Customers' Special Selection"}
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-[#182230] sm:text-4xl flex items-center gap-2 tracking-tight">
                <span>{specialItemsConfig?.title || "Our Special Items"}</span>
                <span className="text-2xl drop-shadow-sm select-none">✨</span>
              </h2>
              {specialItemsConfig?.subtitle && (
                <p className="mt-2 text-sm text-[#5e6d82] max-w-xl leading-relaxed">
                  {specialItemsConfig.subtitle}
                </p>
              )}
            </div>
            <div className="shrink-0 self-start sm:self-end">
              <Link
                href={specialItemsConfig?.linkUrl || "/shop"}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0b2f8a] hover:text-[#b89130] transition group bg-[#0b2f8a]/5 hover:bg-[#0b2f8a]/10 px-4 py-2 rounded-full border border-[#0b2f8a]/10 shadow-xs"
              >
                <span>{(specialItemsConfig?.linkText || "See all special items").replace(/[→\->\s]+$/, "")}</span>
                <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </Link>
            </div>
          </div>

          <div className="relative pb-12 overflow-hidden px-2 sm:px-5 md:px-8">
            <Carousel
              autoplay={true}
              autoplayInterval={3500}
              pauseOnHover={true}
              loop={true}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4 py-3 sm:py-4">
                {specialProducts.map((product) => (
                  <CarouselItem
                    key={product.id}
                    className="pl-3 sm:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                  >
                    <ProductCard product={product} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselNavigation alwaysShow />
              <CarouselIndicator className="-bottom-5" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Featured Products Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0b2f8a]">
              Customers&apos; Choice
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

      {/* Customer Bestsellers ("MOST LOVED") */}
      {uiConfig?.bestsellersSection?.enabled !== false && (
        <CustomerBestsellersSection config={uiConfig?.bestsellersSection} />
      )}

      {/* Testimonials */}
      {uiConfig?.testimonialsSection?.enabled !== false && (
        <TestimonialsSection
          config={uiConfig?.testimonialsSection}
          initialReviews={reviews}
        />
      )}

      {/* Outlets & Store Locations */}
      <OutletsSection initialStores={stores} />
      </div>
    </div>
  );
}
