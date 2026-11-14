"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInr } from "@/lib/money";

export interface LuxuryBestsellerCardItem {
  id: string;
  productId: number;
  variantId: number;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  weight: string;
  badge?: string;
}

const DEFAULT_ITEMS: LuxuryBestsellerCardItem[] = [
  {
    id: "bs-kaju-katli",
    productId: 1,
    variantId: 2,
    name: "Kaju Katli (Royal Silver Foil)",
    slug: "kaju-katli",
    price: 289,
    originalPrice: 320,
    rating: 5.0,
    reviewsCount: 389,
    imageUrl: "/images/kaju-katli.jpg",
    weight: "250g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-kesar-penda",
    productId: 2,
    variantId: 4,
    name: "Kesar Malai Penda",
    slug: "kesar-malai-penda",
    price: 210,
    originalPrice: 241,
    rating: 5.0,
    reviewsCount: 294,
    imageUrl: "/images/peda.jpg",
    weight: "250g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-motichoor",
    productId: 14,
    variantId: 14,
    name: "Motichoor Ladoo (Pure Desi Ghee)",
    slug: "motichoor-ladoo",
    price: 220,
    originalPrice: 253,
    rating: 5.0,
    reviewsCount: 278,
    imageUrl: "/images/motichoor.jpg",
    weight: "250g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-nylon-sev",
    productId: 5,
    variantId: 10,
    name: "Nylon Sev (Fine Golden Bhel Sev)",
    slug: "nylon-sev",
    price: 95,
    originalPrice: 109,
    rating: 5.0,
    reviewsCount: 312,
    imageUrl: "/images/namkeen.jpg",
    weight: "250g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-gujiya",
    productId: 6,
    variantId: 6,
    name: "Dry Fruit Gujiya",
    slug: "mawa-gujiya",
    price: 710,
    originalPrice: 800,
    rating: 5.0,
    reviewsCount: 142,
    imageUrl: "/images/holi-gujiya.jpg",
    weight: "500g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-mysore-pak",
    productId: 18,
    variantId: 18,
    name: "Desi Ghee Mysore Pak",
    slug: "mysore-pak",
    price: 390,
    originalPrice: 450,
    rating: 5.0,
    reviewsCount: 215,
    imageUrl: "/images/showcase/mysore-pak-festival.jpg",
    weight: "500g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-mohanthal",
    productId: 4,
    variantId: 8,
    name: "Shuddha Desi Ghee Mohanthal",
    slug: "mohanthal",
    price: 240,
    originalPrice: 280,
    rating: 5.0,
    reviewsCount: 260,
    imageUrl: "/images/showcase/gujarati-mithai-showcase.jpg",
    weight: "250g",
    badge: "BEST SELLER",
  },
  {
    id: "bs-gulab-jamun",
    productId: 34,
    variantId: 34,
    name: "Shahi Gulab Jamun",
    slug: "gulab-jamun",
    price: 180,
    originalPrice: 210,
    rating: 5.0,
    reviewsCount: 198,
    imageUrl: "/images/gulab-jamun.jpg",
    weight: "250g",
    badge: "BEST SELLER",
  },
];

export function LuxuryBestsellersSection({
  items = DEFAULT_ITEMS,
  onAddToCartSuccess,
}: {
  items?: LuxuryBestsellerCardItem[];
  onAddToCartSuccess?: (productName: string) => void;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [poppingId, setPoppingId] = useState<string | null>(null);

  // Horizontal scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    const maxScroll = scrollWidth - clientWidth;
    setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement;
    const cardStep = firstCard ? firstCard.clientWidth + 16 : 240;
    const scrollAmount = direction === "left" ? -cardStep * 2 : cardStep * 2;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Initialize wishlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vsm_wishlist_ids");
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleWishlist = async (item: LuxuryBestsellerCardItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !wishlist[item.id];
    const updated = { ...wishlist, [item.id]: nextState };
    setWishlist(updated);
    setPoppingId(item.id);
    setTimeout(() => setPoppingId(null), 400);

    try {
      localStorage.setItem("vsm_wishlist_ids", JSON.stringify(updated));
      fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const handleAddToCart = async (item: LuxuryBestsellerCardItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingId(item.id);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: item.variantId,
          quantity: 1,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        setAddedId(item.id);

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cart-updated", { detail: { count: data?.count } })
          );
        }

        if (onAddToCartSuccess) {
          onAddToCartSuccess(`${item.name} (${item.weight})`);
        }

        setTimeout(() => setAddedId(null), 2000);
      } else {
        router.push(`/shop/${item.slug}`);
      }
    } catch {
      router.push(`/shop/${item.slug}`);
    } finally {
      setLoadingId(null);
    }
  };

  const displayItems = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section
      aria-label="Best Sellers"
      className="py-12 sm:py-20 bg-[#faf6ee] border-b border-[#3b1e54]/10 select-none relative"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7a1c1c]/10 text-[#7a1c1c] text-xs font-bold uppercase tracking-wider mb-2">
              <span>✦</span>
              <span>MOST LOVED BY KALOL FAMILIES</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#140638]">
              Signature Best Sellers
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Handmade daily in pure Gir cow &amp; buffalo desi ghee. Melt-in-mouth freshness.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              href="/shop?tag=best_seller"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#7a1c1c] hover:text-[#521313] transition group mr-2"
            >
              <span>Explore All Best Sellers</span>
              <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
            </Link>

            {/* Scroll Navigation Arrow Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                aria-label="Previous best sellers"
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 border ${
                  canScrollLeft
                    ? "bg-white text-[#7a1c1c] border-[#7a1c1c]/25 hover:bg-[#7a1c1c] hover:text-white shadow-sm active:scale-95 cursor-pointer"
                    : "bg-white/40 text-black/20 border-black/5 cursor-not-allowed opacity-40"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                aria-label="Next best sellers"
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 border ${
                  canScrollRight
                    ? "bg-white text-[#7a1c1c] border-[#7a1c1c]/25 hover:bg-[#7a1c1c] hover:text-white shadow-sm active:scale-95 cursor-pointer"
                    : "bg-white/40 text-black/20 border-black/5 cursor-not-allowed opacity-40"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Product Carousel Container (1 line: 5 products on desktop, remainder scrollable) */}
        <div className="relative group/carousel">
          {/* Floating Left Arrow (Desktop) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/95 text-[#7a1c1c] shadow-xl border border-[#7a1c1c]/20 items-center justify-center hover:bg-[#7a1c1c] hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Floating Right Arrow (Desktop) */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/95 text-[#7a1c1c] shadow-xl border border-[#7a1c1c]/20 items-center justify-center hover:bg-[#7a1c1c] hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Single Horizontal Row: exactly 5 cards visible on desktop (w-[calc((100%-4*1rem)/5)]) */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 pt-1.5 scroll-smooth snap-x snap-mandatory select-none overscroll-x-contain"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {displayItems.map((item) => {
              const isWishlisted = !!wishlist[item.id];
              const isPopping = poppingId === item.id;
              const isAdding = loadingId === item.id;
              const isSuccess = addedId === item.id;

              return (
                <article
                  key={item.id}
                  className="flex-none snap-start w-[72vw] sm:w-[calc((100%-1.25rem)/2)] md:w-[calc((100%-2*1rem)/3)] lg:w-[calc((100%-4*1rem)/5)] group relative flex flex-col justify-between rounded-3xl bg-[#7a1c1c] text-white p-3.5 sm:p-4 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden border border-white/10"
                >
                  {/* Subtle Festive Pattern Glow */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#dfb755]/15 blur-2xl group-hover:bg-[#dfb755]/25 transition duration-500" />

                  <div>
                    {/* Top Header: BEST SELLER Badge & Wishlist Heart Icon */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-widest text-[#7a1c1c] shadow-xs">
                        {item.badge || "BEST SELLER"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(item, e)}
                        aria-label="Add to wishlist"
                        className={`h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
                          isPopping ? "animate-heart-pop" : ""
                        }`}
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-colors ${
                            isWishlisted ? "text-amber-300 fill-amber-300" : "text-white"
                          }`}
                          fill={isWishlisted ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Product Food Photography */}
                    <Link
                      href={`/shop/${item.slug}`}
                      className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/25 my-1.5 shadow-inner group/img"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-108"
                          sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🍬
                        </div>
                      )}
                    </Link>

                    {/* Product Title */}
                    <Link href={`/shop/${item.slug}`}>
                      <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-white hover:text-[#f5c518] transition line-clamp-2 min-h-[2.5rem] leading-snug mt-1.5">
                        {item.name}
                      </h3>
                    </Link>

                    {/* Pricing & Rating */}
                    <div className="flex items-center justify-between gap-1.5 mt-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-bold text-white">
                          {formatInr(item.price)}
                        </span>
                        {item.originalPrice > item.price && (
                          <span className="text-[11px] text-white/60 line-through">
                            {formatInr(item.originalPrice)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#f5c518]">
                        <span>★</span>
                        <span>{item.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* "ADD TO BAG >" Button */}
                  <div className="mt-3 pt-2.5 border-t border-white/15">
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(item, e)}
                      disabled={isAdding}
                      className="gold-shimmer-btn w-full rounded-full py-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer shadow-lg active:scale-95 bg-[#140638] text-white hover:bg-[#200b54] border border-[#dfb755]/40 hover:border-[#dfb755]"
                    >
                      {isAdding ? (
                        <span>Adding...</span>
                      ) : isSuccess ? (
                        <span className="text-emerald-300">✓ Added!</span>
                      ) : (
                        <>
                          <span>Add To Bag</span>
                          <span className="font-semibold text-[#dfb755] group-hover:translate-x-0.5 transition-transform">
                            &gt;
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Scroll Progress & Swipe Hint Indicator */}
        {displayItems.length > 5 && (
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-500 font-medium">
              Showing 5 of {displayItems.length} bestsellers &bull; Scroll for more
            </span>

            <div className="h-1.5 w-28 sm:w-36 rounded-full bg-[#7a1c1c]/10 overflow-hidden">
              <div
                className="h-full bg-[#7a1c1c] rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(25, (5 / displayItems.length) * 100)}%`,
                  transform: `translateX(${Math.min(
                    100 - Math.max(25, (5 / displayItems.length) * 100),
                    (scrollProgress / 100) * (100 - Math.max(25, (5 / displayItems.length) * 100))
                  )}%)`,
                }}
              />
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
