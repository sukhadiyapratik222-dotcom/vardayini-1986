"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr, unitPrice } from "@/lib/money";
import { PincodeDeliveryChecker } from "@/components/pincode-delivery-checker";
import { ProductOptionsModal, ModalProductData } from "@/components/product-options-modal";
import { LuxuryHeroCarousel } from "@/components/luxury-hero-carousel";
import { ProductListMarquee } from "@/components/product-list-marquee";
import { ShopByCategoryStrip } from "@/components/shop-by-category-strip";
import { LuxuryBestsellersSection } from "@/components/luxury-bestsellers-section";
import { OurStoryHeritageSection } from "@/components/our-story-heritage-section";
import { FestivalCollectionsSection } from "@/components/festival-collections-section";
import { CulinaryExperienceSection } from "@/components/culinary-experience-section";
import { Magnetic } from "@/components/core/magnetic";
import { OutletsSection } from "@/components/outlets-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { WelcomeOfferBanner } from "@/components/welcome-offer-banner";
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

  // Map dynamic bestsellers from database if available
  const dynamicBestsellers =
    bestsellers && bestsellers.length > 0
      ? bestsellers.slice(0, 8).map((product) => {
          const primaryVariant = product.variants?.[0];
          const sellingPrice = primaryVariant
            ? unitPrice(primaryVariant.price, primaryVariant.discountedPrice)
            : product.fromPrice;
          const originalPrice =
            primaryVariant?.price && primaryVariant.price > sellingPrice
              ? primaryVariant.price
              : product.comparePrice && product.comparePrice > sellingPrice
              ? product.comparePrice
              : Math.round(sellingPrice * 1.15);

          return {
            id: `bs-${product.id}`,
            productId: product.id,
            variantId: primaryVariant?.id || product.id,
            name: product.name,
            slug: product.slug,
            price: sellingPrice,
            originalPrice: originalPrice,
            rating: 5.0,
            reviewsCount: 120 + ((product.id * 19) % 240),
            imageUrl: product.imageUrl || "/images/kaju-katli.jpg",
            weight: primaryVariant?.weight || "500g",
            badge: "BEST SELLER",
          };
        })
      : undefined;

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#24142e] selection:bg-[#d97706]/20">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO CAROUSEL (Full Width, Auto-Slide Every 5s, Ken Burns)
         ───────────────────────────────────────────────────────────── */}
      <LuxuryHeroCarousel autoplayInterval={5000} />

      {/* Marquee Strip: Pan-India Free Shipping & Purity */}
      <ProductListMarquee variant="basil" />

      {/* ─────────────────────────────────────────────────────────────
          2. SHOP BY CATEGORY (Horizontal Circular Row with Badges)
         ───────────────────────────────────────────────────────────── */}
      <ShopByCategoryStrip />

      {/* ─────────────────────────────────────────────────────────────
          3. BEST SELLERS (Rounded Red Cards with Add To Bag)
         ───────────────────────────────────────────────────────────── */}
      <LuxuryBestsellersSection
        items={dynamicBestsellers}
        onAddToCartSuccess={handleAddToCartSuccess}
      />

      {/* ─────────────────────────────────────────────────────────────
          4. OUR STORY / JOURNEY OF 75 YEARS (Olive Green Card)
         ───────────────────────────────────────────────────────────── */}
      <OurStoryHeritageSection />

      {/* ─────────────────────────────────────────────────────────────
          5. FESTIVAL BANNER & 4 COLLECTIONS (Raksha Bandhan / Diwali)
         ───────────────────────────────────────────────────────────── */}
      <FestivalCollectionsSection />

      {/* ─────────────────────────────────────────────────────────────
          5.5 ELEVATING THE CULINARY EXPERIENCE PILLARS (Cleaned Medallions)
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.culinaryPillars?.enabled !== false && <CulinaryExperienceSection />}

      {/* ─────────────────────────────────────────────────────────────
          6. FRESH DAILY SPECIALS: Pack Size Variety Grid
         ───────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 bg-white border-y border-[#3b1e54]/10 select-none">
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
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-bold text-[#24142e]">
                          {formatInr(displayPrice)}
                        </span>
                        {primaryVariant?.discountedPrice && primaryVariant.price > displayPrice && (
                          <span className="text-xs text-slate-500 line-through">
                            {formatInr(primaryVariant.price)}
                          </span>
                        )}
                        {primaryVariant?.discountedPrice && primaryVariant.price > displayPrice && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/70">
                            {Math.round(((primaryVariant.price - displayPrice) / primaryVariant.price) * 100)}% OFF
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                        100% Desi Ghee
                      </span>
                    </div>

                    {/* Button */}
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
          7. BENEFITS & PINCODE DELIVERY CHECKING
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
          8. WELCOME OFFER BANNER: Flat 10% Off First Order
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.welcomeOffer?.enabled !== false && (
        <section className="py-12 sm:py-16 bg-[#faf6ee] border-t border-[#3b1e54]/10">
          <WelcomeOfferBanner config={uiConfig?.welcomeOffer} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. TESTIMONIALS: What Our Customers Say
         ───────────────────────────────────────────────────────────── */}
      {uiConfig?.testimonialsSection?.enabled !== false && (
        <TestimonialsSection
          config={uiConfig?.testimonialsSection}
          initialReviews={reviews}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. OUR OUTLETS & STORES (section_contact14)
         ───────────────────────────────────────────────────────────── */}
      <OutletsSection initialStores={stores} />

      {/* ─────────────────────────────────────────────────────────────
          11. PRODUCT OPTIONS MODAL ("Choose options")
         ───────────────────────────────────────────────────────────── */}
      <ProductOptionsModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        onAddToCartSuccess={handleAddToCartSuccess}
      />

      {/* ─────────────────────────────────────────────────────────────
          12. FLOATING GLASS WHATSAPP BUTTON (Quick Order Assistance)
         ───────────────────────────────────────────────────────────── */}
      <a
        href="https://wa.me/919825019760?text=Hello%20Vardayini%20Sweet%20Mart!%20I%20would%20like%20to%20order%20sweets%20and%20gift%20boxes."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order on WhatsApp"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366]/90 hover:bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center backdrop-blur-md border border-white/30 group"
      >
        <span className="sr-only">Order on WhatsApp</span>
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.077-1.782-.397-1.464-.606-2.42-2.079-2.493-2.176-.073-.098-.598-.795-.598-1.516s.379-1.076.514-1.222c.134-.147.294-.184.393-.184.099 0 .197.002.282.006.09.004.21-.034.329.252.122.293.417 1.016.454 1.09.037.073.062.159.012.257-.05.097-.075.158-.149.244-.074.086-.156.192-.223.258-.075.074-.153.155-.066.304.087.15.385.635.827 1.028.568.505 1.047.662 1.196.736.149.074.236.062.324-.037.088-.099.377-.44.477-.591.1-.15.2-.125.337-.075.137.05.869.41 1.019.485.15.075.25.112.287.175.037.062.037.362-.107.767z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.062c-1.637 0-3.154-.486-4.428-1.32l-.317-.209-2.964.778.791-2.893-.23-.332A8.04 8.04 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8.062-8 8.062z" />
        </svg>
      </a>

      {/* ─────────────────────────────────────────────────────────────
          13. ADDED TO CART NOTIFICATION TOAST
         ───────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#140638] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-2xl border border-[#dfb755]/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span>{toastMessage}</span>
          <Link
            href="/cart"
            className="rounded-full bg-[#dfb755] px-3 py-1 text-xs text-[#140638] font-bold hover:bg-[#f5c518] transition"
          >
            Go to Cart →
          </Link>
        </div>
      )}
    </div>
  );
}
