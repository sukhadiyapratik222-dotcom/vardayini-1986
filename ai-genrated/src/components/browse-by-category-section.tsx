"use client";

import Image from "next/image";
import Link from "next/link";

export interface CategoryCardData {
  id: string;
  title: string;
  itemCount: string;
  imageUrl: string;
  href: string;
}

export interface SubCategoryItem {
  id: number;
  name: string;
  slug: string;
}

const DEFAULT_CATEGORY_CARDS: CategoryCardData[] = [
  {
    id: "ghee-sweets",
    title: "SIGNATURE GHEE SWEETS",
    itemCount: "18 Items",
    imageUrl: "/images/motichoor.jpg",
    href: "/shop?group=sweets",
  },
  {
    id: "dry-fruit-specials",
    title: "DRY FRUIT SPECIALS",
    itemCount: "12 Items",
    imageUrl: "/images/kaju-katli.jpg",
    href: "/shop?category=kaju-sweets",
  },
  {
    id: "festival-gift-boxes",
    title: "FESTIVAL GIFT BOXES",
    itemCount: "15 Options",
    imageUrl: "/images/hamper.jpg",
    href: "/shop?category=gift-hampers",
  },
  {
    id: "namkeen-snacks",
    title: "NAMKEEN & SNACKS",
    itemCount: "24 Items",
    imageUrl: "/images/khaman-showcase.jpg",
    href: "/shop?group=namkeen",
  },
];

export interface BrowseCategoryConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  linkText?: string;
  linkUrl?: string;
  cards?: CategoryCardData[];
}

interface BrowseByCategorySectionProps {
  className?: string;
  config?: BrowseCategoryConfig;
  categories?: CategoryCardData[];
  subcategories?: SubCategoryItem[];
}

export function BrowseByCategorySection({
  className = "",
  config,
  categories = DEFAULT_CATEGORY_CARDS,
  subcategories,
}: BrowseByCategorySectionProps) {
  if (config?.enabled === false) return null;

  const badge = config?.badge || "Authentic Traditional Categories";
  const title = config?.title || "Browse By Category";
  const subtitle = config?.subtitle || "Select from our freshly rolled sweets and steaming hot snacks";
  const linkText = config?.linkText || "View Full Menu";
  const linkUrl = config?.linkUrl || "/shop";
  const cardsList = (config?.cards && config.cards.length > 0 ? config.cards : categories).filter(
    (c: any) => c.active !== false
  );

  return (
    <section className={`py-10 sm:py-18 mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 ${className}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
        <div>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#b45309]">
            {badge}
          </span>
          <h2 className="mt-1 font-[family-name:var(--font-display)] font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#24142e] tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {subtitle}
          </p>
        </div>

        <Link
          href={linkUrl}
          className="text-xs sm:text-sm font-bold text-[#3b1e54] hover:text-[#b45309] transition flex items-center gap-1 group self-start sm:self-auto"
        >
          <span>{linkText}</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>

      {/* 2x2 Grid matching the user's wireframe with Real Food Photography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
        {cardsList.map((cat) => (
          <Link
            key={cat.id}
            href={cat.href}
            className="group relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden rounded-[22px] sm:rounded-[28px] shadow-sm hover:shadow-xl transition-all duration-300 block bg-neutral-900 cursor-pointer"
          >
            {/* Real High-Resolution Food Photography */}
            <Image
              src={cat.imageUrl}
              alt={cat.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />

            {/* Dark Gradient Overlay for Contrast & Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity group-hover:from-black/90" />

            {/* Content Positioned in Bottom-Left */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-left select-none">
              <h3 className="font-[family-name:var(--font-display)] font-serif text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wide text-white drop-shadow-md leading-tight group-hover:text-[#fef3c7] transition-colors">
                {cat.title}
              </h3>
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium text-white/80">
                {cat.itemCount}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Optional Subcategories Bar */}
      {subcategories && subcategories.length > 0 && (
        <div className="mt-6 sm:mt-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              All Categories:
            </span>
            <Link
              href="/shop"
              className="rounded-full bg-[#3b1e54] text-white px-3.5 py-1 text-xs font-semibold shrink-0 hover:bg-[#b45309] transition"
            >
              All Items
            </Link>
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/shop?category=${sub.slug}`}
                className="rounded-full bg-white border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium shrink-0 hover:border-[#3b1e54] hover:text-[#3b1e54] transition shadow-2xs whitespace-nowrap"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
