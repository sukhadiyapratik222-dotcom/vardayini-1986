"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr, unitPrice } from "@/lib/money";
import { PincodeDeliveryChecker } from "@/components/pincode-delivery-checker";
import { ProductOptionsModal, ModalProductData } from "@/components/product-options-modal";
import { HeritageGlassHero } from "@/components/heritage-glass-hero";
import { GlassyHeroShowcase } from "@/components/glassy-hero-showcase";
import { CulinaryExperienceSection } from "@/components/culinary-experience-section";
import { ProductListMarquee } from "@/components/product-list-marquee";
import { ProductCard } from "@/components/product-card";
import type { SpecialItemsConfig } from "@/components/home-page-client";
import {
  Carousel,
  CarouselContent,
  CarouselNavigation,
  CarouselIndicator,
  CarouselItem,
} from "@/components/core/carousel";
import { Magnetic } from "@/components/core/magnetic";
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
import { WelcomeOfferBanner } from "@/components/welcome-offer-banner";

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
  stores?: any[];
  reviews?: any[];
  uiConfig?: any;
  onToggleUiDesign?: () => void;
  currentUiDesign?: string;
}

export function WarmCreamHomepage({
  categories,
  featuredProducts,
  bestsellers,
  specialItemsConfig,
  specialProducts = [],
  stores = [],
  reviews = [],
  uiConfig,
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

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#24142e] selection:bg-[#d97706]/20">

      {/* ─────────────────────────────────────────────────────────────
          2. HERITAGE ROYAL PURPLE & GOLD GLASS HERO SECTION
         ───────────────────────────────────────────────────────────── */}
      <HeritageGlassHero />

      {/* Artisan Product List Marquee (.bb-marquee) */}
      <ProductListMarquee variant="basil" />

      {/* 2.5 ELEVATING THE CULINARY EXPERIENCE PILLARS */}
      {uiConfig?.culinaryPillars?.enabled !== false && <CulinaryExperienceSection />}

      {/* ─────────────────────────────────────────────────────────────
          3. BROWSE BY CATEGORY (2x2 Grid with Real Food Photography)
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.browseByCategory?.enabled !== false && (
        <BrowseByCategorySection
          config={uiConfig?.browseByCategory}
          subcategories={categories}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          OUR SPECIAL ITEMS: Placed directly above Fresh Daily Specials
         ───────────────────────────────────────────────────────────── */}
      {specialItemsConfig?.enabled !== false && specialProducts && specialProducts.length > 0 && (
        <section className="py-12 sm:py-16 bg-[#faf8f4] border-t border-[#3b1e54]/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header: Title on Left, Link Button on Right */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#b45309] bg-[#b45309]/10 px-3.5 py-1 rounded-full border border-[#b45309]/20 mb-2.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b45309] animate-pulse" />
                  {specialItemsConfig?.badge || "Customers' Special Selection"}
                </span>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#24142e] flex items-center gap-2 tracking-tight">
                  <span>{specialItemsConfig?.title || "Our Special Items"}</span>
                  <span className="text-2xl drop-shadow-sm select-none">✨</span>
                </h2>
                {specialItemsConfig?.subtitle && (
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                    {specialItemsConfig.subtitle}
                  </p>
                )}
              </div>
              <div className="shrink-0 self-start sm:self-end">
                <Link
                  href={specialItemsConfig?.linkUrl || "/shop"}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#3b1e54] hover:text-[#b45309] transition group bg-[#3b1e54]/5 hover:bg-[#3b1e54]/10 px-4 py-2 rounded-full border border-[#3b1e54]/10 shadow-xs"
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
                      <ProductCard product={product as any} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselNavigation alwaysShow />
                <CarouselIndicator className="-bottom-5" />
              </Carousel>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FRESH DAILY SPECIALS: 4 Columns Desktop, 2 Columns Mobile (1 Column on Ultra-Small)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-20 bg-white border-y border-[#3b1e54]/10">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
            <div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#b45309]">
                Fresh Dawn Batches
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl sm:text-3xl lg:text-4xl font-bold text-[#24142e]">
                Fresh Daily Specials
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Prepared every morning with 100% Shuddh Desi Ghee. Select your preferred pack size below.
              </p>
            </div>
            <Link
              href="/shop"
              className="text-xs sm:text-sm font-bold text-[#3b1e54] hover:text-[#b45309] transition"
            >
              Browse Complete Menu →
            </Link>
          </div>

          {/* Responsive Product Grid */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
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
                          <span className="text-[#b45309] font-semibold">
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
                          <span className="ml-1.5 text-xs text-slate-500 line-through">
                            {formatInr(primaryVariant.price)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        100% Desi Ghee
                      </span>
                    </div>

                    {/* Button: "Choose options" when multiple pack sizes exist */}
                    <Magnetic className="w-full">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(product)}
                        className="btn-purple w-full rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>{hasMultipleVariants ? "Choose options" : "Add to cart"}</span>
                        <span>{hasMultipleVariants ? "▾" : "🛒"}</span>
                      </button>
                    </Magnetic>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4.5. CUSTOMER BESTSELLERS: Most Loved Sweets & Fast Cart Add
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.bestsellersSection?.enabled !== false && (
        <CustomerBestsellersSection
          config={uiConfig?.bestsellersSection}
          onAddToCartSuccess={handleAddToCartSuccess}
          onOpenModal={handleOpenModal}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. FESTIVE GIFTING: Celebration Hampers & Custom Sweet Boxes
         ───────────────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-20 mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#3b1e54] text-white p-4 sm:p-12 lg:p-14 relative overflow-hidden shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-[#d97706]/20 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <span className="inline-block rounded-full bg-[#d97706]/25 border border-[#d97706]/40 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-bold text-[#fef3c7] uppercase tracking-wider">
                Festive Gifting · Corporate &amp; Family
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                Shahi Rajwadi Celebration Boxes &amp; Hampers.
              </h2>
              <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-xl">
                Elevate your wedding and festive celebrations with handpicked assortments of silver-foiled
                Kaju Katli, saffron pedas, and vacuum-sealed Namkeen. Includes custom Shubhkamna gift cards.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <Link
                  href="/shop?category=gift-hampers"
                  className="rounded-full bg-[#d97706] hover:bg-[#b45309] text-white text-center px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
                >
                  Explore Gift Hampers
                </Link>
                <Link
                  href="/stores"
                  className="rounded-full border border-white/30 hover:border-white text-center px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white transition hover:bg-white/10"
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
              <span className="text-xs font-bold uppercase tracking-widest text-[#b45309]">
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
                Today, our master craftsmen still roll cashew dough and fry farsan before dawn for our customers. Whether you visit
                our Mandvi counter or our Alkapuri flagship on RC Dutt Road, every box carries the same
                unbroken promise of royal taste and purity.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                <div className="bg-white p-4 rounded-2xl border border-[#3b1e54]/10">
                  <p className="font-bold text-[#24142e] text-sm">Mandvi Flagship</p>
                  <p className="text-xs text-slate-600 mt-0.5">Opp. Tower, Mandvi, Vadodara</p>
                  <p className="text-[11px] text-[#b45309] font-semibold mt-1">Open 8 AM – 10:30 PM</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#3b1e54]/10">
                  <p className="font-bold text-[#24142e] text-sm">Alkapuri Branch</p>
                  <p className="text-xs text-slate-600 mt-0.5">RC Dutt Road, Alkapuri, Vadodara</p>
                  <p className="text-[11px] text-[#b45309] font-semibold mt-1">Open 8 AM – 10:30 PM</p>
                </div>
              </div>
            </div>
          </div>
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
                <span className="text-xs font-bold uppercase tracking-widest text-[#b45309]">
                  The Vardayini Standard
                </span>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#24142e]">
                  Purity You Can Trust in Every Bite
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">🥛</span>
                  <h3 className="font-bold text-[#24142e] text-sm">100% Shuddh Desi Ghee</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prepared purely in Gir cow and buffalo desi ghee. Absolutely zero hydrogenated oils or dalda.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">🌿</span>
                  <h3 className="font-bold text-[#24142e] text-sm">Zero Preservatives</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prepared in dawn batches daily and dispatched warm. Never stored with artificial chemicals.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">📦</span>
                  <h3 className="font-bold text-[#24142e] text-sm">Food-Grade Sealed Box</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Vacuum-packed in food-safe tin and gold boxes to preserve crispness and natural moisture.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-slate-100 space-y-1.5">
                  <span className="text-2xl">⚡</span>
                  <h3 className="font-bold text-[#24142e] text-sm">Vadodara Same-Day Delivery</h3>
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
          8.2. WELCOME OFFER BANNER: Flat 10% Off First Order
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.welcomeOffer?.enabled !== false && (
        <section className="py-12 sm:py-16 bg-[#faf6ee] border-t border-[#3b1e54]/10">
          <WelcomeOfferBanner config={uiConfig?.welcomeOffer} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8.5. TESTIMONIALS: What Our Customers Say
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.testimonialsSection?.enabled !== false && (
        <TestimonialsSection
          config={uiConfig?.testimonialsSection}
          initialReviews={reviews}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. OUR OUTLETS & STORES (section_contact14)
         ───────────────────────────────────────────────────────────── */}
      <OutletsSection initialStores={stores} />

      {/* ─────────────────────────────────────────────────────────────
          10. PRODUCT OPTIONS MODAL ("Choose options")
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
