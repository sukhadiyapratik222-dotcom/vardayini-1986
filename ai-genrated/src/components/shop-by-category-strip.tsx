"use client";

import Image from "next/image";
import Link from "next/link";

export interface CategoryCircleItem {
  id: string;
  name: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  badge?: string; // e.g. "NEW IN"
}

const CATEGORY_ITEMS: CategoryCircleItem[] = [
  {
    id: "sweets",
    name: "Sweets",
    href: "/shop?group=sweets",
    imageUrl: "/images/gulab-jamun.jpg",
    imageAlt: "Authentic Gujarati & Indian Sweets",
  },
  {
    id: "savouries",
    name: "Savouries",
    href: "/shop?group=namkeen",
    imageUrl: "/images/namkeen.jpg",
    imageAlt: "Crunchy Namkeen & Farsan",
  },
  {
    id: "artisanal-sweets",
    name: "Artisanal Sweets",
    href: "/shop?category=kaju-sweets",
    imageUrl: "/images/kaju-katli-showcase.jpg",
    imageAlt: "Artisanal Royal Sweets",
    badge: "NEW IN",
  },
  {
    id: "bakery",
    name: "Bakery",
    href: "/shop?category=biscuits-and-cookies",
    imageUrl: "/images/dussehra-jalebi.jpg",
    imageAlt: "Fresh Bakery & Cookies",
  },
  {
    id: "kovilpatti",
    name: "Kovilpatti",
    href: "/shop?category=farsan-snacks",
    imageUrl: "/images/dry-fruit-bite.jpg",
    imageAlt: "Crunchy Kovilpatti & Chikki",
    badge: "NEW IN",
  },
  {
    id: "gifting",
    name: "Gifting",
    href: "/shop?category=gift-hampers",
    imageUrl: "/images/hamper.jpg",
    imageAlt: "Luxury Gift Boxes & Celebration Hampers",
  },
  {
    id: "pickles-podi",
    name: "Podi, Thokku & Pickles",
    href: "/shop?category=farsan-snacks",
    imageUrl: "/images/modak-bhog.jpg",
    imageAlt: "Podi, Thokku & Traditional Pickles",
  },
];

export function ShopByCategoryStrip({
  items = CATEGORY_ITEMS,
}: {
  items?: CategoryCircleItem[];
}) {
  return (
    <section
      aria-label="Shop By Category"
      className="py-10 sm:py-14 bg-[#fdfbf7] border-b border-[#3b1e54]/10 select-none overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Decorative Diamond Icons */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="text-[#8a1c1c] text-sm sm:text-base select-none">✦</span>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#140638]">
              Shop By Category
            </h2>
            <span className="text-[#8a1c1c] text-sm sm:text-base select-none">✦</span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Explore our curated culinary creations, freshly rolled mithai, and crunchy snacks.
          </p>
        </div>

        {/* Horizontal Row of Circular Categories: Scrollable with Snap on Mobile */}
        <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 lg:gap-8 overflow-x-auto pb-4 pt-2 no-scrollbar snap-x snap-mandatory">
          {items.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="group flex flex-col items-center shrink-0 w-24 sm:w-28 text-center snap-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dfb755] rounded-2xl p-1 transition"
            >
              {/* Circular Image Container with Hover Scale & Soft Shadow */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-white border border-slate-200 shadow-md group-hover:shadow-xl group-hover:border-[#dfb755] transition-all duration-300">
                <div className="relative w-full h-full rounded-full overflow-hidden bg-[#faf6ee]">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.imageAlt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 96px, 112px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍬
                    </div>
                  )}
                </div>

                {/* Badge: "NEW IN" */}
                {cat.badge && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#f5c518] text-[#140638] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md tracking-wider border border-[#dfb755]">
                    {cat.badge}
                  </span>
                )}
              </div>

              {/* Category Label */}
              <span className="mt-3 text-xs sm:text-sm font-semibold text-[#140638] group-hover:text-[#8a1c1c] transition-colors leading-snug line-clamp-2">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

