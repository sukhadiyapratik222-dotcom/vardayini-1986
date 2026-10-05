"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr, unitPrice } from "@/lib/money";
import { PincodeDeliveryChecker } from "@/components/pincode-delivery-checker";
import { ProductOptionsModal, ModalProductData } from "@/components/product-options-modal";
import { GlassyHeroShowcase } from "@/components/glassy-hero-showcase";
import { ProductCard } from "@/components/product-card";
import type { SpecialItemsConfig } from "@/components/home-page-client";

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface ProductVariantData {
  id: number;
  weight: string;
  sku: string;
  price: number;
  discountedPrice: number | null;
  stock: number;
}

export interface HomepageProductData {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  tags: string;
  isFeatured: boolean;
  categoryName?: string;
  categorySlug?: string;
  fromPrice: number;
  comparePrice: number | null;
  variants: ProductVariantData[];
}

interface WarmCreamHomepageProps {
  categories: CategoryData[];
  featuredProducts: HomepageProductData[];
  bestsellers: HomepageProductData[];
  specialItemsConfig?: SpecialItemsConfig;
  specialProducts?: HomepageProductData[];
  onToggleUiDesign?: () => void;
  currentUiDesign?: string;
}

export function WarmCreamHomepage({
  categories,
  featuredProducts,
  bestsellers,
  specialItemsConfig,
  specialProducts = [],
  onToggleUiDesign,
  currentUiDesign = "warm-cream",
}: WarmCreamHomepageProps) {
  const [selectedProductForModal, setSelectedProductForModal] =
    useState<ModalProductData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handleOpenModal(product: HomepageProductData) {
    setSelectedProductForModal({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.imageUrl,
      categoryName: product.categoryName,
      variants: product.variants,
      fromPrice: product.fromPrice,
    });
  }

  function handleAddToCartSuccess(productName: string) {
    setToastMessage(`✓ "${productName}" added to your box!`);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // 4 Main Curated Category Cards with Large Food Photography
  const categoryShowcase = [
    {
      title: "Royal Sweets (Mithai)",
      description: "Kaju Katli, slow-roasted Besan Ladoo, Mathura Peda & Mohanthal",
      slug: "sweets",
      href: "/shop?group=sweets",
      image: "/images/kaju-katli-showcase.jpg",
      badge: "Pure Gir Cow Ghee",
    },
    {
      title: "Namkeen & Farsan",
      description: "Surati Nylon Khaman, Khandvi rolls, crunchy Gathiya & Farali Chiwda",
      slug: "namkeen",
      href: "/shop?category=namkeen-farsan",
      image: "/images/khaman-showcase.jpg",
      badge: "Steamed Fresh Daily",
    },
    {
      title: "Bakery Delights",
      description: "Flaky butter maska khari, spiced teatime toasts & rich biscuits",
      slug: "bakery",
      href: "/shop?group=bakery",
      image: "/images/hamper.jpg",
      badge: "Artisanal Crunch",
    },
    {
      title: "Festive Gift Hampers",
      description: "Shahi Rajwadi celebration boxes, silver trays & custom assortments",
      slug: "hampers",
      href: "/shop?category=gift-hampers",
      image: "/images/mithai-platter-showcase.jpg",
      badge: "Diwali & Celebrations",
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#24142e] selection:bg-[#d97706]/20">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP DESIGN SWITCHER BANNER ("One option create in our website")
         ───────────────────────────────────────────────────────────── */}
      <aside aria-label="Design System Switcher" className="bg-[#3b1e54] text-white px-4 py-2 text-xs border-b border-[#d97706]/30">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#d97706] animate-pulse" />
            <span className="font-medium text-slate-200">
              Active Design: <strong className="text-[#fef3c7]">Warm Cream, Deep-Purple &amp; Saffron</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-300">Want to see the classic navy theme?</span>
            <button
              type="button"
              onClick={onToggleUiDesign}
              className="rounded-full bg-[#d97706] hover:bg-[#b45309] text-white px-3 py-1 font-bold text-[11px] shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Click to toggle between Warm Cream and Classic Navy UI designs"
            >
              <span>🎨</span>
              <span>Switch UI Design</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. FOCUSED HERO SECTION: Warm Cream, Deep-Purple CTA & Large Food Photo
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-[#3b1e54]/10">
        {/* Soft Radial Ambient Saffron Light */}
        <div className="pointer-events-none absolute top-0 right-1/4 h-96 w-96 rounded-full bg-[#d97706]/8 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Brand Value & Direct Order Actions */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fef3c7] border border-[#d97706]/40 px-3.5 py-1 text-xs font-bold text-[#b45309]">
                <span>✨</span>
                <span>Crafted Fresh in Vadodara Since 1976</span>
              </div>

              <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-[#24142e] leading-[1.15]">
                Handcrafted Gujarati Mithai &amp;{" "}
                <span className="text-[#3b1e54] italic font-normal">Pure Desi Ghee Savories.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl">
                Rolled fresh every dawn in Vadodara using 100% Shuddh Desi Ghee. Melt-in-mouth Kaju Katli,
                steaming hot Surati Khaman, and festive celebration hampers rolled by three generations of
                master karigars.
              </p>

              {/* Delivery and Purity Badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#3b1e54] pt-1">
                <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-emerald-700">✓</span> 100% Shuddh Desi Ghee
                </span>
                <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-emerald-700">✓</span> Same-Day Dispatch in Vadodara
                </span>
                <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-emerald-700">✓</span> Zero Added Preservatives
                </span>
              </div>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/shop"
                  className="btn-purple rounded-full px-7 py-3 text-xs sm:text-sm font-bold shadow-lg shadow-[#3b1e54]/25 hover:scale-102 active:scale-98 transition flex items-center gap-2"
                >
                  <span>🛒</span>
                  <span>Explore Fresh Batches</span>
                </Link>
                <Link
                  href="/stores"
                  className="rounded-full bg-white border border-[#3b1e54]/20 hover:border-[#3b1e54] px-6 py-3 text-xs sm:text-sm font-bold text-[#24142e] hover:bg-[#3b1e54]/5 transition"
                >
                  Visit Our Counters (Mandvi &amp; Alkapuri)
                </Link>
              </div>

              {/* Announcement Callout */}
              <div className="p-3.5 rounded-2xl bg-[#fef3c7]/60 border border-[#d97706]/30 text-xs text-[#78350f] flex items-center gap-2.5">
                <span className="text-base">🎁</span>
                <span>
                  <strong>Festive Offer:</strong> Free delivery on all orders above ₹799 · Use code{" "}
                  <strong className="underline">FESTIVE15</strong> for 15% off above ₹999.
                </span>
              </div>
            </div>

            {/* Right: Interactive Glassmorphic Product Showcase with Auto-Scrolling & Thumbnails */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <GlassyHeroShowcase />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. PRODUCT CATEGORIES: Large Food Photography (No Tiny Thumbnails)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">
              Browse By Department
            </span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#24142e]">
              Authentic Traditional Categories
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs sm:text-sm font-bold text-[#3b1e54] hover:text-[#d97706] transition flex items-center gap-1"
          >
            <span>View All 42 Products</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoryShowcase.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="cream-card group overflow-hidden flex flex-col justify-between"
            >
              {/* Large Food Photography */}
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#faf6ee]">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-108"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
                <div className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3b1e54] shadow-sm backdrop-blur-md">
                  {cat.badge}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#24142e] group-hover:text-[#3b1e54] transition">
                    {cat.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#3b1e54]">
                  <span>Explore Items</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          OUR SPECIAL ITEMS: Placed directly above Fresh Daily Specials
         ───────────────────────────────────────────────────────────── */}
      {specialItemsConfig?.enabled !== false && specialProducts && specialProducts.length > 0 && (
        <section className="py-12 sm:py-16 bg-[#faf8f4] border-t border-[#3b1e54]/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#d97706] bg-[#d97706]/10 px-3 py-1 rounded-full border border-[#d97706]/20">
                  {specialItemsConfig?.badge || "Karigars' Special Selection"}
                </span>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#24142e] flex items-center gap-2">
                  <span>{specialItemsConfig?.title || "Our Special Items"}</span>
                  <span className="text-xl">✨</span>
                </h2>
                {specialItemsConfig?.subtitle && (
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    {specialItemsConfig.subtitle}
                  </p>
                )}
              </div>
              <Link
                href={specialItemsConfig?.linkUrl || "/shop"}
                className="text-xs sm:text-sm font-bold text-[#3b1e54] hover:text-[#d97706] transition flex items-center gap-1 group"
              >
                <span>{specialItemsConfig?.linkText || "See all special items →"}</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {specialProducts.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FRESH DAILY SPECIALS: 4 Columns Desktop, 2 Columns Mobile
         ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white border-y border-[#3b1e54]/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">
                Fresh Dawn Batches
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#24142e]">
                Fresh Daily Specials
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Prepared every morning with 100% Shuddh Desi Ghee. Select your preferred pack size below.
              </p>
            </div>
            <Link
              href="/shop"
              className="text-xs sm:text-sm font-bold text-[#3b1e54] hover:text-[#d97706] transition"
            >
              Browse Complete Menu →
            </Link>
          </div>

          {/* 4 COLUMNS DESKTOP, 2 COLUMNS MOBILE GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.slice(0, 8).map((product) => {
              const hasMultipleVariants = product.variants && product.variants.length > 1;
              const primaryVariant = product.variants[0];
              const displayPrice = primaryVariant
                ? unitPrice(primaryVariant.price, primaryVariant.discountedPrice)
                : product.fromPrice;

              return (
                <article
                  key={product.id}
                  className="cream-card group flex flex-col justify-between overflow-hidden p-3.5"
                >
                  {/* Large Product Food Photography */}
                  <div>
                    <Link
                      href={`/shop/${product.slug}`}
                      className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-[#faf6ee]"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(min-width: 1024px) 25vw, 50vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          🍬
                        </div>
                      )}

                      {product.categoryName && (
                        <div className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#3b1e54] shadow-xs backdrop-blur-md">
                          {product.categoryName}
                        </div>
                      )}
                    </Link>

                    {/* Name & Pack Size */}
                    <div className="mt-3 space-y-1">
                      <Link href={`/shop/${product.slug}`}>
                        <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-[#24142e] group-hover:text-[#3b1e54] transition line-clamp-1 leading-snug">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Pack: <strong>{primaryVariant?.weight || "250 g"}</strong></span>
                        {hasMultipleVariants && (
                          <span className="text-[#d97706] font-semibold">
                            +{product.variants.length - 1} sizes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Purchase Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-base sm:text-lg font-bold text-[#24142e]">
                          {formatInr(displayPrice)}
                        </span>
                        {primaryVariant?.discountedPrice && (
                          <span className="ml-1.5 text-xs text-slate-400 line-through">
                            {formatInr(primaryVariant.price)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        100% Desi Ghee
                      </span>
                    </div>

                    {/* Button: "Choose options" when multiple pack sizes exist */}
                    <button
                      type="button"
                      onClick={() => handleOpenModal(product)}
                      className="btn-purple w-full rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>{hasMultipleVariants ? "Choose options" : "Add to cart"}</span>
                      <span>{hasMultipleVariants ? "▾" : "🛒"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. FESTIVE GIFTING: Celebration Hampers & Custom Sweet Boxes
         ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#3b1e54] text-white p-6 sm:p-12 lg:p-14 relative overflow-hidden shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-[#d97706]/20 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-block rounded-full bg-[#d97706]/25 border border-[#d97706]/40 px-3.5 py-1 text-xs font-bold text-[#fef3c7] uppercase tracking-wider">
                Festive Gifting · Corporate &amp; Family
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                Shahi Rajwadi Celebration Boxes &amp; Hampers.
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl">
                Elevate your wedding and festive celebrations with handpicked assortments of silver-foiled
                Kaju Katli, saffron pedas, and vacuum-sealed Namkeen. Includes custom Shubhkamna gift cards.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/shop?category=gift-hampers"
                  className="rounded-full bg-[#d97706] hover:bg-[#b45309] text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
                >
                  Explore Gift Hampers
                </Link>
                <Link
                  href="/stores"
                  className="rounded-full border border-white/30 hover:border-white px-6 py-3 text-xs sm:text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Bulk / Corporate Enquiries
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
              <Image
                src="/images/hamper.jpg"
                alt="Vardayini Festive Gift Box"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. BRAND HERITAGE: Mandvi & Alkapuri (Since 1976)
         ───────────────────────────────────────────────────────────── */}
      <section id="heritage" className="py-14 sm:py-20 bg-[#f5efe1] border-y border-[#3b1e54]/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 relative aspect-[16/11] rounded-3xl overflow-hidden border-4 border-white shadow-xl">
              <Image
                src="/images/heritage-hero-banner.png"
                alt="Vardayini Sweet Mart Mandvi Heritage"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 rounded-xl bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-xs text-[#fef3c7] font-bold">
                Mandvi Main Counter · Est. 1976
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">
                Three Generations of Purity
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#24142e] leading-tight">
                From a Mandvi Counter to Gujarat’s Sweet Legacy.
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                In 1976, Vardayini Sweet Mart began with a single copper handi near Mandvi Clock Tower in
                Vadodara. Our founders held one uncompromising rule: <em>only 100% Shuddh Desi Ghee</em>,
                whole nuts, and fresh milk khoa cooked patiently on slow flame.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Today, our master karigars still roll cashew dough and fry farsan before dawn. Whether you visit
                our Mandvi counter or our Alkapuri flagship on RC Dutt Road, every box carries the same
                unbroken promise of royal taste and purity.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-4 rounded-2xl border border-[#3b1e54]/10">
                  <p className="font-bold text-[#24142e] text-sm">Mandvi Flagship</p>
                  <p className="text-xs text-slate-500 mt-0.5">Opp. Tower, Mandvi, Vadodara</p>
                  <p className="text-[11px] text-[#d97706] font-semibold mt-1">Open 8 AM – 10:30 PM</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#3b1e54]/10">
                  <p className="font-bold text-[#24142e] text-sm">Alkapuri Branch</p>
                  <p className="text-xs text-slate-500 mt-0.5">RC Dutt Road, Alkapuri, Vadodara</p>
                  <p className="text-[11px] text-[#d97706] font-semibold mt-1">Open 8 AM – 10:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. CUSTOMER FAVORITES (Bestsellers Ranking)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">
            Most Loved in Vadodara
          </span>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#24142e]">
            Customer Favorites
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            Our top-ordered delicacies by families across Gujarat and India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {bestsellers.map((product, idx) => (
            <div
              key={product.id}
              className="cream-card p-4 sm:p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3b1e54]/10 text-sm font-bold text-[#3b1e54]">
                  #{idx + 1}
                </span>

                <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl bg-[#faf6ee]">
                  <Image
                    src={product.imageUrl || "/images/kaju-katli.jpg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-bold text-[#24142e] truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {product.categoryName || "Royal Mithai"} · {product.variants[0]?.weight || "250 g"}
                  </p>
                  <p className="text-sm font-bold text-[#3b1e54] mt-0.5">
                    {formatInr(product.fromPrice)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenModal(product)}
                className="btn-purple shrink-0 rounded-xl px-4 py-2 text-xs font-bold shadow-xs cursor-pointer"
              >
                Choose options
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. BENEFITS & PINCODE DELIVERY CHECKING
         ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white border-t border-[#3b1e54]/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Cols: 4 Quality Pillars */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">
                  The Vardayini Standard
                </span>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#24142e]">
                  Purity You Can Trust in Every Bite
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">🥛</span>
                  <h4 className="font-bold text-[#24142e] text-sm">100% Shuddh Desi Ghee</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prepared purely in Gir cow and buffalo desi ghee. Absolutely zero hydrogenated oils or dalda.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">🌿</span>
                  <h4 className="font-bold text-[#24142e] text-sm">Zero Preservatives</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prepared in dawn batches daily and dispatched warm. Never stored with artificial chemicals.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">📦</span>
                  <h4 className="font-bold text-[#24142e] text-sm">Food-Grade Sealed Box</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Vacuum-packed in food-safe tin and gold boxes to preserve crispness and natural moisture.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">⚡</span>
                  <h4 className="font-bold text-[#24142e] text-sm">Vadodara Same-Day Delivery</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Same-day delivery across Vadodara for orders before 2:00 PM. Express delivery pan-India.
                  </p>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Interactive Pincode Checker */}
            <div className="lg:col-span-5">
              <PincodeDeliveryChecker />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. PRODUCT OPTIONS MODAL ("Choose options")
         ───────────────────────────────────────────────────────────── */}
      <ProductOptionsModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        onAddToCartSuccess={handleAddToCartSuccess}
      />

      {/* ─────────────────────────────────────────────────────────────
          10. ADDED TO CART NOTIFICATION TOAST
         ───────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#3b1e54] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-2xl border border-[#d97706]/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span>{toastMessage}</span>
          <Link
            href="/cart"
            className="rounded-full bg-[#d97706] px-3 py-1 text-xs text-white hover:bg-[#b45309] transition"
          >
            Go to Cart →
          </Link>
        </div>
      )}
    </div>
  );
}
