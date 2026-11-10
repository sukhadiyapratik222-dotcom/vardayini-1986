"use client";

import { useState, useEffect } from "react";
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
    id: "bs-kaju-katli",
    productId: 1,
    variantId: 2,
    name: "Royal Silver Kaju Katli",
    slug: "kaju-katli",
    price: 450,
    originalPrice: 520,
    rating: 5.0,
    reviewsCount: 389,
    imageUrl: "/images/kaju-katli.jpg",
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
    id: "bs-motichoor",
    productId: 14,
    variantId: 14,
    name: "Special Motichoor Laddu",
    slug: "motichoor-ladoo",
    price: 360,
    originalPrice: 420,
    rating: 5.0,
    reviewsCount: 278,
    imageUrl: "/images/motichoor.jpg",
    weight: "500g",
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
      // Call wishlist API in background
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

  return (
    <section
      aria-label="Best Sellers"
      className="py-12 sm:py-20 bg-[#faf6ee] border-b border-[#3b1e54]/10 select-none"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7a1c1c]/10 text-[#7a1c1c] text-xs font-bold uppercase tracking-wider mb-2">
              <span>✦</span>
              <span>MOST LOVED BY VADODARA FAMILIES</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#140638]">
              Signature Best Sellers
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Handmade daily in pure Gir cow &amp; buffalo desi ghee. Melt-in-mouth freshness.
            </p>
          </div>

          <Link
            href="/shop?tag=best_seller"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#7a1c1c] hover:text-[#521313] transition self-start sm:self-auto group"
          >
            <span>Explore All Best Sellers</span>
            <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
          </Link>
        </div>

        {/* Product Cards Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {items.map((item) => {
            const isWishlisted = !!wishlist[item.id];
            const isPopping = poppingId === item.id;
            const isAdding = loadingId === item.id;
            const isSuccess = addedId === item.id;

            return (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between rounded-3xl bg-[#7a1c1c] text-white p-4 sm:p-5 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden border border-white/10"
              >
                {/* Subtle Festive Pattern Glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#dfb755]/15 blur-2xl group-hover:bg-[#dfb755]/25 transition duration-500" />

                <div>
                  {/* Top Header: BEST SELLER Badge & Wishlist Heart Icon */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest text-[#7a1c1c] shadow-xs">
                      {item.badge || "BEST SELLER"}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(item, e)}
                      aria-label="Add to wishlist"
                      className={`h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
                        isPopping ? "animate-heart-pop" : ""
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 transition-colors ${
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
                    className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/25 my-2 shadow-inner group/img"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-108"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🍬
                      </div>
                    )}
                  </Link>

                  {/* Product Title */}
                  <Link href={`/shop/${item.slug}`}>
                    <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-white hover:text-[#f5c518] transition line-clamp-1 leading-snug mt-2">
                      {item.name}
                    </h3>
                  </Link>

                  {/* Pricing & Rating */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base sm:text-lg font-bold text-white">
                        {formatInr(item.price)}
                      </span>
                      {item.originalPrice > item.price && (
                        <span className="text-xs text-white/60 line-through">
                          {formatInr(item.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#f5c518]">
                      <span>★</span>
                      <span>{item.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* "ADD TO BAG >" Button */}
                <div className="mt-4 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(item, e)}
                    disabled={isAdding}
                    className="gold-shimmer-btn w-full rounded-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 bg-[#140638] text-white hover:bg-[#200b54] border border-[#dfb755]/40 hover:border-[#dfb755]"
                  >
                    {isAdding ? (
                      <span>Adding...</span>
                    ) : isSuccess ? (
                      <span className="text-emerald-300">✓ Added to Bag!</span>
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
    </section>
  );
}

