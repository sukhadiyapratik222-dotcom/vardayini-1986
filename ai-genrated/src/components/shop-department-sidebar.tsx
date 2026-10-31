"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export interface DepartmentGroupInfo {
  key: string;
  label: string;
  imageUrl: string;
  colorClass: string;
  badgeColorClass: string;
  slugs: string[];
}

export const DEPARTMENT_GROUPS_META: DepartmentGroupInfo[] = [
  {
    key: "sweets",
    label: "Sweets (Mithai)",
    imageUrl: "/images/kaju-katli-showcase.jpg",
    colorClass: "text-[#8d6715] group-hover:text-[#b89130]",
    badgeColorClass: "bg-amber-100 text-amber-800",
    slugs: [
      "kaju-sweets",
      "mawa-sweets",
      "penda",
      "sugarless-sweets",
      "premium-packed-sweets",
      "indian-ghee-sweets",
      "bengali-sweets",
      "dryfruit-sweets",
      "festival-specials",
    ],
  },
  {
    key: "namkeen",
    label: "Namkeen & Farsan",
    imageUrl: "/images/khaman-showcase.jpg",
    colorClass: "text-[#065f46] group-hover:text-[#059669]",
    badgeColorClass: "bg-emerald-100 text-emerald-800",
    slugs: [
      "millet",
      "farali",
      "gujarati",
      "khakhra",
      "roasted",
      "mixture",
      "indian",
      "daal-lentil",
      "sev",
      "chips-and-puris",
      "farsan-snacks",
      "namkeen-farsan",
      "farsan",
      "traditional-gujarati-snacks",
      "gujarati-farsan",
      "sev-and-gathiya",
      "nylon-khaman-and-dhokla",
      "spiced-mixtures",
      "farali-snacks",
      "wafers-and-chips",
      "namkeen",
    ],
  },
  {
    key: "bakery",
    label: "Bakery Delights",
    imageUrl: "/images/hamper.jpg",
    colorClass: "text-[#9a3412] group-hover:text-[#ea580c]",
    badgeColorClass: "bg-orange-100 text-orange-800",
    slugs: ["biscuits-and-cookies", "toast-and-khari", "bakery"],
  },
];

const PRICE_PRESETS = [
  { label: "All Prices", min: undefined, max: undefined },
  { label: "Under ₹250", min: 0, max: 250 },
  { label: "₹250 – ₹500", min: 250, max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "Above ₹1,000", min: 1000, max: undefined },
];

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

interface ShopDepartmentSidebarProps {
  categories: CategoryItem[];
  totalProductsCount: number;
  categoryCounts: Record<string, number>;
  departmentCounts: Record<string, number>;
  activeCategory?: string;
  activeGroup?: string;
  activeMinPrice?: number;
  activeMaxPrice?: number;
}

export function ShopDepartmentSidebar({
  categories,
  totalProductsCount,
  categoryCounts,
  departmentCounts,
  activeCategory,
  activeGroup,
  activeMinPrice,
  activeMaxPrice,
}: ShopDepartmentSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: "departments" (Sweets, Namkeen, Bakery) or "categories" (All 18 specific categories)
  const [viewMode, setViewMode] = useState<"departments" | "categories">(
    activeCategory ? "categories" : "departments"
  );

  const [customMin, setCustomMin] = useState<string>(
    activeMinPrice !== undefined ? String(activeMinPrice) : ""
  );
  const [customMax, setCustomMax] = useState<string>(
    activeMaxPrice !== undefined ? String(activeMaxPrice) : ""
  );
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Helper to build URL preserving current query params
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([key, val]) => {
      if (val === undefined || val === "") {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    });
    return `/shop?${current.toString()}`;
  };

  const handleApplyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const url = buildUrl({
      minPrice: customMin.trim() ? customMin.trim() : undefined,
      maxPrice: customMax.trim() ? customMax.trim() : undefined,
    });
    router.push(url);
  };

  const isAllCategoriesActive = !activeCategory && !activeGroup;

  return (
    <aside className="w-full space-y-4 lg:space-y-6">
      {/* Mobile Accordion Toggle Button */}
      <button
        type="button"
        onClick={() => setMobileExpanded((prev) => !prev)}
        className="lg:hidden w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white border border-[#0b2f8a]/15 shadow-xs text-left transition"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">🏷️</span>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[#0b2f8a]">Filter Categories &amp; Price</p>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              {activeCategory || activeGroup || activeMinPrice !== undefined
                ? "Active filters applied • Tap to change"
                : "Browse departments, 18 categories & price"}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#0b2f8a]/10 text-[#0b2f8a]">
          {mobileExpanded ? "Hide Filters ▲" : "Show Filters ▼"}
        </span>
      </button>

      {/* Main Filter Cards Wrapper */}
      <div className={`space-y-6 ${mobileExpanded ? "block" : "hidden lg:block"}`}>
        {/* 1. CATEGORIES CARD (Matching Exact Reference Layout) */}
        <div className="bg-white rounded-3xl p-3.5 sm:p-6 border border-slate-100 shadow-sm space-y-4 sm:space-y-5">
        {/* Header with Title and Green Underline Bar */}
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#182230] tracking-tight">
            Categories
          </h2>
          <div className="w-12 h-1 bg-[#16a34a] rounded-full mt-1.5 sm:mt-2" />
        </div>

        {/* View Switcher: Departments vs Subcategories */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px] sm:text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode("departments")}
            className={`flex-1 py-1.5 rounded-lg transition text-center ${
              viewMode === "departments"
                ? "bg-white text-[#0b2f8a] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Departments ({DEPARTMENT_GROUPS_META.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("categories")}
            className={`flex-1 py-1.5 rounded-lg transition text-center ${
              viewMode === "categories"
                ? "bg-white text-[#0b2f8a] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Subcategories ({categories.length})
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-1.5">
          {/* Top Row: All Categories */}
          <Link
            href={buildUrl({ category: undefined, group: undefined })}
            className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition group ${
              isAllCategoriesActive
                ? "bg-purple-50/80 border-2 border-purple-500 shadow-xs"
                : "hover:bg-slate-50 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* 4-Square Grid Icon in Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition ${
                  isAllCategoriesActive
                    ? "bg-white border-purple-300 text-purple-600"
                    : "bg-white border-slate-200 text-slate-700 shadow-2xs"
                }`}
              >
                <div className="grid grid-cols-2 gap-1 p-0.5">
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${isAllCategoriesActive ? "bg-purple-600" : "bg-emerald-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${isAllCategoriesActive ? "bg-purple-600" : "bg-blue-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${isAllCategoriesActive ? "bg-purple-600" : "bg-amber-500"}`} />
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${isAllCategoriesActive ? "bg-purple-600" : "bg-rose-500"}`} />
                </div>
              </div>

              <span
                className={`text-sm font-bold truncate ${
                  isAllCategoriesActive
                    ? "text-purple-700"
                    : "text-slate-800 group-hover:text-[#0b2f8a]"
                }`}
              >
                All Categories
              </span>
            </div>

            {/* Total Count Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono transition shrink-0 ${
                isAllCategoriesActive
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
              }`}
            >
              {totalProductsCount}
            </span>
          </Link>

          {/* VIEW MODE 1: Top-Level Departments (Sweets, Namkeen, Bakery) */}
          {viewMode === "departments" && (
            <>
              {DEPARTMENT_GROUPS_META.map((dept) => {
                const isSelected = activeGroup === dept.key && !activeCategory;
                const count = departmentCounts[dept.key] ?? 0;

                return (
                  <Link
                    key={dept.key}
                    href={buildUrl({ group: dept.key, category: undefined })}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition group ${
                      isSelected
                        ? "bg-purple-50/80 border-2 border-purple-500 shadow-xs"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Circular Photo Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-2xs bg-slate-100">
                        <img
                          src={dept.imageUrl}
                          alt={dept.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>

                      <span
                        className={`text-sm font-bold truncate ${
                          isSelected
                            ? "text-purple-700 font-extrabold"
                            : dept.colorClass
                        }`}
                      >
                        {dept.label}
                      </span>
                    </div>

                    {/* Department Product Count Pill */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono transition shrink-0 ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : dept.badgeColorClass
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </>
          )}

          {/* VIEW MODE 2: Specific Subcategories (Kaju Sweets, Penda, etc.) */}
          {viewMode === "categories" && (
            <div className="space-y-1 pt-1 max-h-[460px] overflow-y-auto pr-1">
              {categories.map((cat, idx) => {
                const isSelected = activeCategory === cat.slug;
                const count = categoryCounts[cat.slug] ?? 0;

                // Color accent presets cycling through reference style
                const colorSchemes = [
                  "text-amber-800 bg-amber-50 text-amber-700",
                  "text-emerald-800 bg-emerald-50 text-emerald-700",
                  "text-rose-800 bg-rose-50 text-rose-700",
                  "text-indigo-800 bg-indigo-50 text-indigo-700",
                  "text-cyan-800 bg-cyan-50 text-cyan-700",
                  "text-purple-800 bg-purple-50 text-purple-700",
                ];
                const scheme = colorSchemes[idx % colorSchemes.length].split(" ");
                const textColor = scheme[0];
                const badgeClass = `${scheme[1]} ${scheme[2]}`;

                return (
                  <Link
                    key={cat.id}
                    href={buildUrl({ category: cat.slug, group: undefined })}
                    className={`w-full flex items-center justify-between p-2 rounded-2xl transition group ${
                      isSelected
                        ? "bg-purple-50/80 border-2 border-purple-500 shadow-xs"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Circular Photo Avatar */}
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-2xs bg-slate-100">
                        <img
                          src={cat.imageUrl || "/images/kaju-katli-showcase.jpg"}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/kaju-katli-showcase.jpg";
                          }}
                        />
                      </div>

                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected
                            ? "text-purple-700 font-extrabold"
                            : `${textColor} group-hover:text-[#0b2f8a]`
                        }`}
                      >
                        {cat.name}
                      </span>
                    </div>

                    {/* Category Product Count Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono transition shrink-0 ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : badgeClass
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. FILTER BY PRICE CARD (Matching Reference Image) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#182230] tracking-tight">
            Filter by Price
          </h3>
          <div className="w-10 h-1 bg-[#16a34a] rounded-full mt-1.5" />
        </div>

        {/* Quick Range Buttons */}
        <div className="space-y-1.5">
          {PRICE_PRESETS.map((preset) => {
            const isSelected =
              activeMinPrice === preset.min && activeMaxPrice === preset.max;

            return (
              <Link
                key={preset.label}
                href={buildUrl({
                  minPrice: preset.min !== undefined ? String(preset.min) : undefined,
                  maxPrice: preset.max !== undefined ? String(preset.max) : undefined,
                })}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? "bg-[#0b2f8a] text-white shadow-xs font-bold"
                    : "text-slate-700 hover:bg-slate-50 border border-slate-100"
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <span>✓</span>}
              </Link>
            );
          })}
        </div>

        {/* Custom Min / Max Inputs */}
        <form onSubmit={handleApplyCustomPrice} className="pt-2 border-t border-slate-100 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Custom Range (₹)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                placeholder="Min ₹"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a]"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max ₹"
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-xs transition"
          >
            Apply Price Filter
          </button>
        </form>

        {/* Clear Filters Link if Active */}
        {(activeMinPrice !== undefined || activeMaxPrice !== undefined || activeCategory || activeGroup) && (
          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/shop"
              className="w-full text-center block text-xs font-bold text-rose-600 hover:text-rose-700 py-1 transition"
            >
              ✕ Reset All Filters
            </Link>
          </div>
        )}
      </div>
    </div>

      {/* 3. FLOATING WHATSAPP CHAT BUTTON (Bottom Right - Non-intrusive) */}
      <a
        href="https://wa.me/919825012345?text=Hello%20Vardayini%20Sweet%20Mart,%20I%20would%20like%20to%20place%20an%20order!"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
      >
        <svg
          className="w-7 h-7 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.077-1.782-.397-1.464-.606-2.42-2.079-2.493-2.176-.073-.098-.598-.795-.598-1.516s.379-1.076.514-1.222c.134-.147.294-.184.393-.184.099 0 .197.002.282.006.09.004.21-.034.329.252.122.293.417 1.016.454 1.09.037.073.062.159.012.257-.05.097-.075.158-.149.244-.074.086-.156.192-.223.258-.075.074-.153.155-.066.304.087.15.385.635.827 1.028.568.505 1.047.662 1.196.736.149.074.236.062.324-.037.088-.099.377-.44.477-.591.1-.15.2-.125.337-.075.137.05.869.41 1.019.485.15.075.25.112.287.175.037.062.037.362-.107.767z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.062c-1.637 0-3.154-.486-4.428-1.32l-.317-.209-2.964.778.791-2.893-.23-.332A8.04 8.04 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8.062-8 8.062z" />
        </svg>
      </a>
    </aside>
  );
}
