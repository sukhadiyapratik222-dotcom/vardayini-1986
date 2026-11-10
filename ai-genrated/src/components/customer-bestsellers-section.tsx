"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface BestsellerItem {
  id: string;
  name: string;
  slug: string;
  badge: string; // "Bestseller" | "Pure Ghee" | "Rich Flavor" | "Festive Favorite"
  description: string;
  price: number;
  weight: string;
  imageUrl: string;
  variantId?: number;
  totalSold?: number;
  orderCount?: number;
  active?: boolean;
}

const DEFAULT_BESTSELLERS: BestsellerItem[] = [
  {
    id: "bestseller-1",
    name: "ROYAL KAJU KATLI",
    slug: "kaju-katli",
    badge: "Bestseller",
    description:
      "Smooth, melt-in-your-mouth cashew fudge coated with delicate silver leaf.",
    price: 450,
    weight: "500g",
    imageUrl: "/images/kaju-katli.jpg",
    variantId: 2, // KK-500
  },
  {
    id: "bestseller-2",
    name: "DESI GHEE MOTICHOOR LADDU",
    slug: "motichoor-ladoo",
    badge: "Pure Ghee",
    description:
      "Fine gram flour pearls fried in pure ghee and infused with aromatic cardamom.",
    price: 380,
    weight: "500g",
    imageUrl: "/images/motichoor.jpg",
    variantId: 14, // ML-500
  },
  {
    id: "bestseller-3",
    name: "SAFFRON KESAR PEDA",
    slug: "kesar-malai-penda",
    badge: "Rich Flavor",
    description:
      "Traditional condensed milk sweet enriched with premium Kashmiri saffron.",
    price: 420,
    weight: "500g",
    imageUrl: "/images/peda.jpg",
    variantId: 9, // KMP-500
  },
  {
    id: "bestseller-4",
    name: "SPECIAL GULAB JAMUN",
    slug: "gulab-jamun",
    badge: "Festive Favorite",
    description:
      "Soft, juicy mawa dumplings soaked in fragrant rose and cardamom syrup.",
    price: 320,
    weight: "500g",
    imageUrl: "/images/gulab-jamun.jpg",
    variantId: 5, // GJ-500
  },
];

export interface BestsellersConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  viewAllText?: string;
  viewAllUrl?: string;
  items?: BestsellerItem[];
}

interface CustomerBestsellersSectionProps {
  config?: BestsellersConfig;
  items?: BestsellerItem[];
  className?: string;
  onAddToCartSuccess?: (productName: string) => void;
  onOpenModal?: (product: any) => void;
}

export function CustomerBestsellersSection({
  config,
  items = DEFAULT_BESTSELLERS,
  className = "",
  onAddToCartSuccess,
  onOpenModal,
}: CustomerBestsellersSectionProps) {
  if (config?.enabled === false) return null;

  const badge = config?.badge || "MOST LOVED";
  const title = config?.title || "CUSTOMER BESTSELLERS";
  const viewAllText = config?.viewAllText || "Explore All Vadodara Bestsellers";
  const viewAllUrl = config?.viewAllUrl || "/shop?tag=best_seller";
  const activeItems = (config?.items && config.items.length > 0 ? config.items : items).filter(
    (it: any) => it.active !== false
  );

  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  async function handleAddToCart(item: BestsellerItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // If onOpenModal is provided and we want full customization, we can check or directly add to cart
    setLoadingId(item.id);

    try {
      // Add standard 500g variant to cart via API
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: item.variantId || 1,
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
        router.refresh();
        setTimeout(() => setAddedId(null), 1800);
      } else {
        // Fallback: if variant id differs, route to product page or modal
        router.push(`/shop/${item.slug}`);
      }
    } catch {
      router.push(`/shop/${item.slug}`);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section
      id="customer-bestsellers"
      className={`py-14 sm:py-20 bg-white border-y border-[#3b1e54]/10 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Section Header Matching Screenshot Exactly */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          {/* Royal Purple Pill Badge */}
          <div className="inline-block bg-[#541e73] text-white text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase px-3.5 py-1 rounded-[3px] mb-2.5 select-none shadow-2xs">
            {badge}
          </div>

          {/* Customer Bestsellers Display Serif Title */}
          <h2 className="font-[family-name:var(--font-display)] font-serif text-2xl sm:text-4xl lg:text-[40px] font-bold text-[#541e73] tracking-tight sm:tracking-normal uppercase leading-tight">
            {title}
          </h2>
        </div>

        {/* 2x2 Responsive Card Grid matching Screenshot */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {activeItems.map((item) => {
            const isAdding = loadingId === item.id;
            const isAdded = addedId === item.id;

            return (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-neutral-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Top Image Container with Floating Badge */}
                <Link
                  href={`/shop/${item.slug}`}
                  className="relative aspect-[16/10] sm:aspect-[16/11] w-full block overflow-hidden bg-neutral-100"
                >
                  {/* Crimson / Maroon Floating Badge at Top-Left */}
                  <div className="absolute top-3 left-3 z-10 rounded-full bg-[#871426] text-white text-[10px] sm:text-[11px] font-bold px-3 py-0.5 shadow-xs uppercase tracking-wide select-none">
                    {item.badge}
                  </div>

                  {/* Product Photography */}
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(min-width: 640px) 50vw, 100vw"
                  />
                </Link>

                {/* Card Content */}
                <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Title */}
                    <Link href={`/shop/${item.slug}`}>
                      <h3 className="font-[family-name:var(--font-display)] font-serif text-sm sm:text-base font-bold text-neutral-900 group-hover:text-[#541e73] uppercase tracking-wide leading-snug transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                    </Link>

                    {/* Description */}
                    <p className="mt-1.5 text-xs sm:text-[13px] text-neutral-500 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Dashed Separator Line & Price / Add to Cart Row */}
                  <div className="mt-4 pt-3.5 border-t border-dashed border-neutral-200 flex items-center justify-between gap-2">
                    {/* Price and Weight */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-base sm:text-lg text-neutral-900">
                          ₹{item.price}
                        </span>
                        <span className="text-xs text-neutral-500 font-normal">
                          /{item.weight}
                        </span>
                      </div>
                      {typeof item.totalSold === "number" && item.totalSold > 0 && (
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 shadow-2xs select-none">
                          🔥 {item.totalSold}+ sold
                        </span>
                      )}
                    </div>

                    {/* Terracotta Outline Add to Cart Button */}
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(item, e)}
                      disabled={isAdding}
                      className={`rounded-full border px-3.5 sm:px-4 py-1 text-xs font-semibold transition active:scale-95 shadow-2xs cursor-pointer ${isAdded
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-[#ba5d49] text-[#ba5d49] hover:bg-[#ba5d49] hover:text-white"
                        }`}
                    >
                      {isAdding ? "Adding..." : isAdded ? "✓ Added" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Full Collection Link */}
        <div className="text-center mt-8 sm:mt-10">
          <Link
            href={viewAllUrl}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#541e73] hover:text-[#d97706] transition group"
          >
            <span>{viewAllText}</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

