"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  UiConfig,
  NewLaunchPageConfig,
  NewLaunchCategoryTab,
  ProductItem,
  api,
} from "@/lib/api";
import { toast } from "@/lib/toast";

interface NewLaunchTabProps {
  config: UiConfig | null;
  products?: ProductItem[];
  onRefresh: () => void;
}

const DEFAULT_TICKERS = [
  "Handcrafted with 100% Shuddh Gir Cow Desi Ghee",
  "Adorned with Pure Edible 24K Silver Leaf & Iranian Saffron",
  "Fresh Morning Batches Direct for Mandvi & Alkapuri Customers",
  "Zero Artificial Essence · 100% Wholesome Authentic Purity",
  "Vacuum Sealed & Delivered Fresh Across Gujarat & India",
];

const DEFAULT_CATEGORY_TABS: NewLaunchCategoryTab[] = [
  { id: "all", label: "🌟 All New Releases", active: true },
  { id: "sweets", label: "👑 Royal Mithai", active: true },
  { id: "farsan", label: "🥟 Crisp Farsan", active: true },
  { id: "sugarless", label: "🍃 Sugar-Free", active: true },
  { id: "hampers", label: "🎁 Luxury Hampers", active: true },
];

export function NewLaunchTab({ config, products = [], onRefresh }: NewLaunchTabProps) {
  const currentCfg: NewLaunchPageConfig = config?.newLaunchPage || {};

  // Active section tab in admin UI: default to products curation
  const [adminTab, setAdminTab] = useState<
    "products" | "hero" | "countdown" | "spotlight" | "marquee" | "promo" | "catalogue"
  >("products");

  // Deduped unique store products map
  const productMap = useMemo(() => {
    const map = new Map<number, ProductItem>();
    for (const p of products) {
      const pid = p.productId || p.id;
      if (!map.has(pid)) {
        map.set(pid, p);
      }
    }
    return map;
  }, [products]);

  const uniqueProducts = useMemo(() => {
    return Array.from(productMap.values());
  }, [productMap]);

  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    for (const p of uniqueProducts) {
      if (p.categoryName) cats.add(p.categoryName);
    }
    return Array.from(cats);
  }, [uniqueProducts]);

  // Curated Products Selection for New Launches (2026)
  const initialProductIds: number[] =
    currentCfg.productIds || currentCfg.catalogue?.productIds || [];
  const [selectedProductIds, setSelectedProductIds] =
    useState<number[]>(initialProductIds);
  const [filterMode, setFilterMode] = useState<"curated" | "all">(
    currentCfg.filterMode || (initialProductIds.length > 0 ? "curated" : "all")
  );
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredCatalogProducts = useMemo(() => {
    return uniqueProducts.filter((p) => {
      const q = productSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.categoryName || "").toLowerCase().includes(q) ||
        (p.tags || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q);
      const matchCat =
        selectedCategory === "all" || p.categoryName === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [uniqueProducts, productSearch, selectedCategory]);

  const selectedProductsList = useMemo(() => {
    return selectedProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is ProductItem => p !== undefined);
  }, [selectedProductIds, productMap]);

  const handleToggleProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedProductIds(uniqueProducts.map((p) => p.productId || p.id));
    toast.success(`Selected all ${uniqueProducts.length} products for New Launches`);
  };

  const handleDeselectAll = () => {
    setSelectedProductIds([]);
    toast.info("Cleared product selection for New Launches");
  };

  const handleSelectFirstN = (n = 8) => {
    setSelectedProductIds(
      uniqueProducts.slice(0, n).map((p) => p.productId || p.id)
    );
    toast.success(`Selected top ${n} products for New Launches`);
  };

  const handleMoveProductUp = (index: number) => {
    if (index <= 0) return;
    setSelectedProductIds((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveProductDown = (index: number) => {
    if (index >= selectedProductIds.length - 1) return;
    setSelectedProductIds((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleSetSpotlight = (id: number) => {
    setSpotlightProductId(id);
    setSpotlightEnabled(true);
    toast.success("Set as Flagship Spotlight Sweet!");
  };

  // 1. General & Hero
  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
  const [badge, setBadge] = useState(currentCfg.badge || "NEW 2026 COLLECTION");
  const [title, setTitle] = useState(
    currentCfg.title || "Newly Launched Royal Sweets & Snacks"
  );
  const [subtitle, setSubtitle] = useState(
    currentCfg.subtitle ||
      "Handcrafted dawn batches celebrating modern tastes with three generations of pure desi ghee heritage."
  );
  const [primaryCtaText, setPrimaryCtaText] = useState(
    currentCfg.primaryCtaText || "👑 Inspect Signature Creation"
  );
  const [secondaryCtaText, setSecondaryCtaText] = useState(
    currentCfg.secondaryCtaText || "Browse All Releases ↓"
  );
  const [tickerTexts, setTickerTexts] = useState<string[]>(
    currentCfg.tickerTexts && currentCfg.tickerTexts.length > 0
      ? currentCfg.tickerTexts
      : DEFAULT_TICKERS
  );
  const [newTicker, setNewTicker] = useState("");

  // 2. Launch Countdown Urgency Bar
  const initialCountdown = currentCfg.countdown || {};
  const [countdownEnabled, setCountdownEnabled] = useState(
    initialCountdown.enabled ?? true
  );
  const [countdownTitle, setCountdownTitle] = useState(
    initialCountdown.title || "⚡ Next Fresh Morning Dispatch Batch In"
  );
  // Default to 3 days in the future if not set
  const defaultFutureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  const [countdownTargetDate, setCountdownTargetDate] = useState(
    initialCountdown.targetDate || defaultFutureDate
  );
  const [countdownPromoCode, setCountdownPromoCode] = useState(
    initialCountdown.promoCode || "LAUNCH10"
  );
  const [countdownPromoText, setCountdownPromoText] = useState(
    initialCountdown.promoText ||
      "Use coupon for 10% instant off on all 2026 collection batches"
  );

  // 3. Flagship Spotlight Creation
  const initialSpotlight = currentCfg.spotlight || {};
  const [spotlightEnabled, setSpotlightEnabled] = useState(
    initialSpotlight.enabled ?? true
  );
  const [spotlightProductId, setSpotlightProductId] = useState<number>(
    initialSpotlight.productId || (products[0]?.id ? products[0].id : 1)
  );
  const [spotlightEyebrow, setSpotlightEyebrow] = useState(
    initialSpotlight.eyebrow || "Flagship of the Season"
  );
  const [spotlightHeading, setSpotlightHeading] = useState(
    initialSpotlight.heading || "The Gold Standard of Purity"
  );
  const [spotlightCustomTitle, setSpotlightCustomTitle] = useState(
    initialSpotlight.customTitle || ""
  );
  const [spotlightCustomDesc, setSpotlightCustomDesc] = useState(
    initialSpotlight.customDescription || ""
  );
  const [spotlightCustomBadge, setSpotlightCustomBadge] = useState(
    initialSpotlight.customBadge || "👑 Signature Batch 2026"
  );
  const [spotlightReviewRating, setSpotlightReviewRating] = useState(
    initialSpotlight.reviewRating || "★ 5.0 (420+ Reviews)"
  );
  const [h1Label, setH1Label] = useState(
    initialSpotlight.highlight1Label || "Ghee Purity"
  );
  const [h1Value, setH1Value] = useState(
    initialSpotlight.highlight1Value || "100% Desi Gir Cow"
  );
  const [h2Label, setH2Label] = useState(
    initialSpotlight.highlight2Label || "Cashew Grade"
  );
  const [h2Value, setH2Value] = useState(
    initialSpotlight.highlight2Value || "Whole W-240"
  );
  const [h3Label, setH3Label] = useState(
    initialSpotlight.highlight3Label || "Shelf Life"
  );
  const [h3Value, setH3Value] = useState(
    initialSpotlight.highlight3Value || "20 Days Fresh"
  );

  // 4. Live Rolling Marquee (Infinite Carousel)
  const initialMarquee = currentCfg.marquee || {};
  const [marqueeEnabled, setMarqueeEnabled] = useState(
    initialMarquee.enabled ?? true
  );
  const [marqueeBadge, setMarqueeBadge] = useState(
    initialMarquee.badge || "Live From Kalol Kitchens"
  );
  const [marqueeTitle, setMarqueeTitle] = useState(
    initialMarquee.title || "Fresh Daily Rolling Carousel"
  );
  const [marqueeSubtitle, setMarqueeSubtitle] = useState(
    initialMarquee.subtitle || "Hover to pause · Click card to inspect details"
  );
  const [marqueeCardCount, setMarqueeCardCount] = useState<number>(
    initialMarquee.cardCount || 16
  );

  // 5. Promotional Festive Banner
  const initialPromo = currentCfg.promoBanner || {};
  const [promoEnabled, setPromoEnabled] = useState(
    initialPromo.enabled ?? true
  );
  const [promoBadge, setPromoBadge] = useState(
    initialPromo.badge || "Special Launch Gift"
  );
  const [promoHeadline, setPromoHeadline] = useState(
    initialPromo.headline ||
      "Complimentary Pure Kaju Katli Box on all New Launch orders above ₹999"
  );
  const [promoCouponCode, setPromoCouponCode] = useState(
    initialPromo.couponCode || "ROYAL1976"
  );
  const [promoButtonText, setPromoButtonText] = useState(
    initialPromo.buttonText || "Claim Offer"
  );
  const [promoButtonLink, setPromoButtonLink] = useState(
    initialPromo.buttonLink || "#catalogue"
  );

  // 6. Catalogue & Category Tabs
  const initialCatalogue = currentCfg.catalogue || {};
  const [catalogueBadge, setCatalogueBadge] = useState(
    initialCatalogue.badge || "Complete 2026 Release"
  );
  const [catalogueTitle, setCatalogueTitle] = useState(
    initialCatalogue.title || "Discover Every New Masterpiece"
  );
  const [catalogueSubtitle, setCatalogueSubtitle] = useState(
    initialCatalogue.subtitle ||
      "Each recipe has been carefully calibrated for purity, balanced sweetness, and exquisite texture."
  );
  const [enableSearch, setEnableSearch] = useState(
    initialCatalogue.enableSearch ?? true
  );
  const [enableSort, setEnableSort] = useState(
    initialCatalogue.enableSort ?? true
  );
  const [categoryTabs, setCategoryTabs] = useState<NewLaunchCategoryTab[]>(
    initialCatalogue.categoryTabs && initialCatalogue.categoryTabs.length > 0
      ? initialCatalogue.categoryTabs
      : DEFAULT_CATEGORY_TABS
  );
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabId, setNewTabId] = useState("");

  const [saving, setSaving] = useState(false);

  // Handlers for tickers
  function handleTickerChange(idx: number, val: string) {
    setTickerTexts((prev) => prev.map((t, i) => (i === idx ? val : t)));
  }
  function handleDeleteTicker(idx: number) {
    setTickerTexts((prev) => prev.filter((_, i) => i !== idx));
  }
  function handleAddTicker() {
    if (!newTicker.trim()) return;
    setTickerTexts((prev) => [...prev, newTicker.trim()]);
    setNewTicker("");
  }

  // Handlers for category tabs
  function handleToggleTabActive(id: string) {
    setCategoryTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  }
  function handleTabLabelChange(id: string, label: string) {
    setCategoryTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, label } : t))
    );
  }
  function handleAddCategoryTab() {
    if (!newTabLabel.trim()) return;
    const cleanId = (
      newTabId.trim() || newTabLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    ).replace(/^-|-$/g, "");
    if (!cleanId) return;
    if (categoryTabs.some((t) => t.id === cleanId)) {
      toast.error("Category tab ID already exists");
      return;
    }
    setCategoryTabs((prev) => [
      ...prev,
      { id: cleanId, label: newTabLabel.trim(), active: true },
    ]);
    setNewTabLabel("");
    setNewTabId("");
  }
  function handleDeleteCategoryTab(id: string) {
    if (categoryTabs.length <= 1) {
      toast.error("At least one category tab must remain.");
      return;
    }
    setCategoryTabs((prev) => prev.filter((t) => t.id !== id));
  }

  // Master Save
  async function handleSave() {
    setSaving(true);
    try {
      const payload: NewLaunchPageConfig = {
        enabled,
        badge,
        title,
        subtitle,
        tickerTexts,
        primaryCtaText,
        secondaryCtaText,
        productIds: selectedProductIds,
        filterMode,
        countdown: {
          enabled: countdownEnabled,
          title: countdownTitle,
          targetDate: countdownTargetDate,
          promoCode: countdownPromoCode,
          promoText: countdownPromoText,
        },
        spotlight: {
          enabled: spotlightEnabled,
          productId: Number(spotlightProductId) || undefined,
          eyebrow: spotlightEyebrow,
          heading: spotlightHeading,
          customTitle: spotlightCustomTitle || undefined,
          customDescription: spotlightCustomDesc || undefined,
          customBadge: spotlightCustomBadge,
          reviewRating: spotlightReviewRating,
          highlight1Label: h1Label,
          highlight1Value: h1Value,
          highlight2Label: h2Label,
          highlight2Value: h2Value,
          highlight3Label: h3Label,
          highlight3Value: h3Value,
        },
        marquee: {
          enabled: marqueeEnabled,
          badge: marqueeBadge,
          title: marqueeTitle,
          subtitle: marqueeSubtitle,
          cardCount: Number(marqueeCardCount) || 16,
        },
        promoBanner: {
          enabled: promoEnabled,
          badge: promoBadge,
          headline: promoHeadline,
          couponCode: promoCouponCode,
          buttonText: promoButtonText,
          buttonLink: promoButtonLink,
        },
        catalogue: {
          badge: catalogueBadge,
          title: catalogueTitle,
          subtitle: catalogueSubtitle,
          enableSearch,
          enableSort,
          categoryTabs,
          productIds: selectedProductIds,
        },
      };

      await api.updateUiConfig({ newLaunchPage: payload });
      toast.success("✓ New Launches page configuration updated live!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save New Launches page settings.");
    } finally {
      setSaving(false);
    }
  }

  // Selected spotlight product for preview
  const selectedProduct = products.find(
    (p) => p.id === Number(spotlightProductId)
  );

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* ─────────────────────────────────────────────────────────────
          HEADER BANNER & QUICK ACTIONS
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0b2f8a] via-[#1b3fa5] to-[#2b51c0] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#dfb755]">
            <span className="flex h-2 w-2 rounded-full bg-[#dfb755] animate-ping" />
            <span>Exclusive Showcase Management</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            New Launches (2026 Collection) Page Manager
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Manage every section on the public New Launches page (<code>/new-products</code> and <code>/new-launches</code>): Hero branding, countdown timer, spotlight signature sweet, rolling marquee, promotional banner, and catalogue categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="http://localhost:9449/new-products"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2.5 text-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <span>↗</span>
            <span>View Live Page</span>
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#dfb755] hover:bg-[#b89130] text-[#0b2f8a] font-bold px-6 py-2.5 text-xs sm:text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>💾</span>
            <span>{saving ? "Saving..." : "Save All Changes"}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION NAVIGATION PILLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: "products", label: `🍬 Curate Our Products (${selectedProductIds.length})`, icon: "📦" },
          { id: "hero", label: "👑 Hero & Tickers", icon: "✨" },
          { id: "countdown", label: "⚡ Urgency Countdown", icon: "⏳" },
          { id: "spotlight", label: "⭐ Flagship Spotlight", icon: "🏅" },
          { id: "marquee", label: "🌀 Rolling Marquee", icon: "🎡" },
          { id: "promo", label: "🎁 Launch Promo Banner", icon: "🎟️" },
          { id: "catalogue", label: "📂 Catalogue & Categories", icon: "🏷️" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAdminTab(tab.id as any)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              adminTab === tab.id
                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                : "bg-white text-slate-700 border border-slate-200 hover:border-[#0b2f8a]/40"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 0: CURATE OUR PRODUCTS (CHECK & MANAGE)
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "products" && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#0b2f8a]/10 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>🍬</span>
                  <span>Our New Launch Products Collection (2026)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Check and select which products appear on the public New Launches page (<code>/new-launches</code> &amp; <code>/new-products</code>).
                </p>
              </div>

              {/* Selection Mode Switch */}
              <div className="flex items-center gap-2 bg-[#faf8f5] p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterMode("curated")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === "curated"
                      ? "bg-[#0b2f8a] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎯 Curated ({selectedProductIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === "all"
                      ? "bg-[#0b2f8a] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🌐 Show All ({uniqueProducts.length})
                </button>
              </div>
            </div>

            {/* Quick Action Buttons & Search */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0b2f8a] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                >
                  ✓ Select All ({uniqueProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFirstN(8)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                >
                  ✨ Select Top 8
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                >
                  ✕ Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by name, category, SKU..."
                  className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a] w-full sm:w-64"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-[#0b2f8a] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Categories ({uniqueProducts.length})
              </button>
              {categoriesList.map((cat) => {
                const count = uniqueProducts.filter((p) => p.categoryName === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#0b2f8a] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currently Selected Products (Order Preview) */}
          {selectedProductIds.length > 0 && (
            <div className="bg-[#faf8f5] rounded-3xl p-5 sm:p-6 border border-[#dfb755]/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <h4 className="font-bold text-sm text-[#6b1d1d]">
                    Curated Launch Display Order ({selectedProductsList.length} Selected)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500">
                  Use ↑ / ↓ to adjust display order on public showcase
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                {selectedProductsList.map((p, idx) => {
                  const pid = p.productId || p.id;
                  const isSpotlight = Number(spotlightProductId) === pid;
                  return (
                    <div
                      key={`selected-${pid}`}
                      className={`relative flex items-center gap-2.5 p-2.5 rounded-2xl bg-white border shadow-2xs transition ${
                        isSpotlight ? "border-amber-400 ring-2 ring-amber-300" : "border-slate-200"
                      }`}
                    >
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                        <Image
                          src={p.imageUrl || "/images/kaju-katli.jpg"}
                          alt={p.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">₹{p.price}</p>
                        {isSpotlight && (
                          <span className="inline-block text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5">
                            ⭐ Spotlight
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveProductUp(idx)}
                          disabled={idx === 0}
                          className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 text-[10px] font-bold flex items-center justify-center transition cursor-pointer"
                          title="Move earlier"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveProductDown(idx)}
                          disabled={idx === selectedProductsList.length - 1}
                          className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 text-[10px] font-bold flex items-center justify-center transition cursor-pointer"
                          title="Move later"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Products Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCatalogProducts.map((p) => {
              const pid = p.productId || p.id;
              const isChecked = selectedProductIds.includes(pid);
              const isSpotlight = Number(spotlightProductId) === pid;

              return (
                <div
                  key={`catalog-${pid}`}
                  onClick={() => handleToggleProduct(pid)}
                  className={`group relative p-4 rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs select-none ${
                    isChecked
                      ? "border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/15"
                      : "border-slate-200 hover:border-[#0b2f8a]/40 hover:shadow-md"
                  }`}
                >
                  {/* Top Status & Checkbox */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate">
                      {p.categoryName || "Mithai"}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handled by card click
                      className="h-5 w-5 rounded text-[#0b2f8a] focus:ring-[#0b2f8a] border-slate-300 pointer-events-none"
                    />
                  </div>

                  {/* Thumbnail & Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <Image
                        src={p.imageUrl || "/images/kaju-katli.jpg"}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {p.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-[#0b2f8a] mt-1">
                        ₹{p.price}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isChecked
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isChecked ? "✓ Selected (2026)" : "○ Not Selected"}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetSpotlight(pid);
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer ${
                        isSpotlight
                          ? "bg-amber-400 text-amber-950 shadow-xs"
                          : "bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800"
                      }`}
                      title="Showcase this sweet as the Flagship Spotlight creation"
                    >
                      {isSpotlight ? "⭐ Spotlight" : "Set Spotlight"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: HERO & ANIMATED CRAFTSMANSHIP LOOP
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "hero" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hero Header &amp; Page Visibility
                </h3>
                <p className="text-xs text-slate-500">
                  Control the main headline, badges, and CTAs welcoming visitors to the 2026 collection.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  Page Enabled
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Top Eyebrow Badge Text
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  placeholder="e.g. NEW 2026 COLLECTION · KALOL SPECIALS"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Main Page Headline
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  placeholder="e.g. Newly Launched Royal Sweets & Snacks"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subtitle Description
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Action Button Text
                </label>
                <input
                  type="text"
                  value={primaryCtaText}
                  onChange={(e) => setPrimaryCtaText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  placeholder="e.g. 👑 Inspect Signature Creation"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Action Button Text
                </label>
                <input
                  type="text"
                  value={secondaryCtaText}
                  onChange={(e) => setSecondaryCtaText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  placeholder="e.g. Browse All Releases ↓"
                />
              </div>
            </div>
          </div>

          {/* Animated Craftsmanship Ticker Messages */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rotating Craftsmanship Marquee Messages
                </h3>
                <p className="text-xs text-slate-500">
                  These lines rotate smoothly below the hero heading every 3.8 seconds.
                </p>
              </div>
              <span className="text-xs font-bold text-[#b89130] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                {tickerTexts.length} Active Lines
              </span>
            </div>

            <div className="space-y-2.5">
              {tickerTexts.map((text, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-[#faf8f5] p-2 rounded-xl border border-amber-100"
                >
                  <span className="text-xs font-mono font-bold text-[#b89130] w-6 text-center">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => handleTickerChange(idx, e.target.value)}
                    className="flex-1 bg-white px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteTicker(idx)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Remove line"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                placeholder="Add another craftsmanship slogan (e.g. 'Crafted in 100% Brass Kadhai with Pure Pistachio')..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
              />
              <button
                type="button"
                onClick={handleAddTicker}
                className="px-5 py-2 rounded-xl bg-[#0b2f8a] text-white text-xs font-bold hover:bg-[#1a3fa3] transition cursor-pointer"
              >
                + Add Line
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: LIMITED BATCH LAUNCH COUNTDOWN TIMER
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "countdown" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Limited Batch Launch Urgency Countdown Bar
              </h3>
              <p className="text-xs text-slate-500">
                Display a live countdown banner showing remaining time before the next sunrise batch cutoff or limited festival run.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={countdownEnabled}
                onChange={(e) => setCountdownEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Enable Countdown Bar
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Countdown Title / Callout
              </label>
              <input
                type="text"
                value={countdownTitle}
                onChange={(e) => setCountdownTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. ⚡ Next Fresh Morning Dispatch Batch In"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={countdownTargetDate}
                onChange={(e) => setCountdownTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Promo Coupon Code
              </label>
              <input
                type="text"
                value={countdownPromoCode}
                onChange={(e) => setCountdownPromoCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. LAUNCH10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Promo Description Text
              </label>
              <input
                type="text"
                value={countdownPromoText}
                onChange={(e) => setCountdownPromoText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Use coupon for 10% instant off on all 2026 collection batches"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#dfb755]/20 to-[#0b2f8a]/15 p-4 border border-[#dfb755]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b2f8a] block">
                Preview in storefront
              </span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {countdownTitle}: <span className="font-mono text-[#0b2f8a]">02d : 14h : 28m : 11s</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {countdownPromoText} (Code: <span className="font-mono font-bold text-[#0b2f8a]">{countdownPromoCode}</span>)
              </p>
            </div>
            <span className="rounded-full bg-[#0b2f8a] text-white px-3 py-1 text-xs font-bold shrink-0">
              ⚡ Live Countdown
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: FLAGSHIP CREATION SPOTLIGHT
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "spotlight" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Flagship Creation Spotlight (Hero Product Card)
              </h3>
              <p className="text-xs text-slate-500">
                Curate the centerpiece sweet or gift box showcased with high-detail specs and interactive weight selection.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={spotlightEnabled}
                onChange={(e) => setSpotlightEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Enable Spotlight Section
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Spotlight Product
              </label>
              <select
                value={spotlightProductId}
                onChange={(e) => setSpotlightProductId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.categoryName || "General"}) — ID #{p.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Eyebrow Label
              </label>
              <input
                type="text"
                value={spotlightEyebrow}
                onChange={(e) => setSpotlightEyebrow(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Flagship of the Season"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Headline
              </label>
              <input
                type="text"
                value={spotlightHeading}
                onChange={(e) => setSpotlightHeading(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. The Gold Standard of Purity"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Floating Badge on Image
              </label>
              <input
                type="text"
                value={spotlightCustomBadge}
                onChange={(e) => setSpotlightCustomBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. 👑 Signature Batch 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Rating &amp; Social Proof
              </label>
              <input
                type="text"
                value={spotlightReviewRating}
                onChange={(e) => setSpotlightReviewRating(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. ★ 5.0 (420+ Reviews)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Title Override (optional)
              </label>
              <input
                type="text"
                value={spotlightCustomTitle}
                onChange={(e) => setSpotlightCustomTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder={selectedProduct ? selectedProduct.name : "Keep empty to use product name"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Story/Description Override (optional)
              </label>
              <input
                type="text"
                value={spotlightCustomDesc}
                onChange={(e) => setSpotlightCustomDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="Keep empty to use default product description"
              />
            </div>
          </div>

          {/* 3 Spec Highlights Grid */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
              Craftsmanship Specification Badges (3 Pillars)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#faf8f5] p-3 rounded-2xl border border-amber-100 space-y-2">
                <input
                  type="text"
                  value={h1Label}
                  onChange={(e) => setH1Label(e.target.value)}
                  placeholder="Badge 1 Label"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 font-medium"
                />
                <input
                  type="text"
                  value={h1Value}
                  onChange={(e) => setH1Value(e.target.value)}
                  placeholder="Badge 1 Value"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 font-bold text-[#0b2f8a]"
                />
              </div>

              <div className="bg-[#faf8f5] p-3 rounded-2xl border border-amber-100 space-y-2">
                <input
                  type="text"
                  value={h2Label}
                  onChange={(e) => setH2Label(e.target.value)}
                  placeholder="Badge 2 Label"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 font-medium"
                />
                <input
                  type="text"
                  value={h2Value}
                  onChange={(e) => setH2Value(e.target.value)}
                  placeholder="Badge 2 Value"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 font-bold text-[#0b2f8a]"
                />
              </div>

              <div className="bg-[#faf8f5] p-3 rounded-2xl border border-amber-100 space-y-2">
                <input
                  type="text"
                  value={h3Label}
                  onChange={(e) => setH3Label(e.target.value)}
                  placeholder="Badge 3 Label"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 font-medium"
                />
                <input
                  type="text"
                  value={h3Value}
                  onChange={(e) => setH3Value(e.target.value)}
                  placeholder="Badge 3 Value"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 font-bold text-[#0b2f8a]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: LIVE ROLLING MARQUEE (INFINITE CAROUSEL)
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "marquee" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Live Rolling Marquee (Infinite Carousel)
              </h3>
              <p className="text-xs text-slate-500">
                Smooth continuous carousel of newly rolled products with hover-to-pause and tap-to-inspect.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marqueeEnabled}
                onChange={(e) => setMarqueeEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Enable Carousel Track
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Eyebrow Badge
              </label>
              <input
                type="text"
                value={marqueeBadge}
                onChange={(e) => setMarqueeBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Live From Kalol Kitchens"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={marqueeTitle}
                onChange={(e) => setMarqueeTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Fresh Daily Rolling Carousel"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Helper Subtitle Hint
              </label>
              <input
                type="text"
                value={marqueeSubtitle}
                onChange={(e) => setMarqueeSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Hover to pause · Click card to inspect details"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Products in Rolling Loop
              </label>
              <input
                type="number"
                min={6}
                max={30}
                value={marqueeCardCount}
                onChange={(e) => setMarqueeCardCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: LAUNCH CELEBRATION PROMO BANNER
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "promo" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Launch Celebration Promotional Banner
              </h3>
              <p className="text-xs text-slate-500">
                A high-converting promotional incentive card placed directly above the complete collection catalogue.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={promoEnabled}
                onChange={(e) => setPromoEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Enable Promo Banner
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Badge Callout
              </label>
              <input
                type="text"
                value={promoBadge}
                onChange={(e) => setPromoBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Special Launch Gift"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coupon Code
              </label>
              <input
                type="text"
                value={promoCouponCode}
                onChange={(e) => setPromoCouponCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. ROYAL1976"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Offer Headline
              </label>
              <input
                type="text"
                value={promoHeadline}
                onChange={(e) => setPromoHeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Complimentary Pure Kaju Katli Box on all New Launch orders above ₹999"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={promoButtonText}
                onChange={(e) => setPromoButtonText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Claim Offer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Button Destination Link
              </label>
              <input
                type="text"
                value={promoButtonLink}
                onChange={(e) => setPromoButtonLink(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. #catalogue or /cart"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: CATALOGUE & CATEGORY TABS
         ───────────────────────────────────────────────────────────── */}
      {adminTab === "catalogue" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-slate-900">
              Catalogue Section Headings &amp; Search Tools
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catalogue Eyebrow Badge
                </label>
                <input
                  type="text"
                  value={catalogueBadge}
                  onChange={(e) => setCatalogueBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  placeholder="e.g. Complete 2026 Release"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catalogue Main Headline
                </label>
                <input
                  type="text"
                  value={catalogueTitle}
                  onChange={(e) => setCatalogueTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  placeholder="e.g. Discover Every New Masterpiece"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catalogue Subtitle Description
                </label>
                <textarea
                  rows={2}
                  value={catalogueSubtitle}
                  onChange={(e) => setCatalogueSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div className="flex items-center gap-6 md:col-span-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableSearch}
                    onChange={(e) => setEnableSearch(e.target.checked)}
                    className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Enable Live Search Bar in Catalogue
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableSort}
                    onChange={(e) => setEnableSort(e.target.checked)}
                    className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Enable Price &amp; Popularity Sorting Dropdown
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Category Tabs Manager */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Filter Category Tabs
                </h3>
                <p className="text-xs text-slate-500">
                  Customize the sliding pill segmented filters shown on the storefront.
                </p>
              </div>
              <span className="text-xs font-bold text-[#0b2f8a] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {categoryTabs.length} Tabs Available
              </span>
            </div>

            <div className="space-y-2.5">
              {categoryTabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center gap-3 bg-[#faf8f5] p-2.5 rounded-xl border border-slate-200"
                >
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tab.active !== false}
                      onChange={() => handleToggleTabActive(tab.id)}
                      className="rounded border-slate-300 text-[#0b2f8a] focus:ring-[#0b2f8a] h-4 w-4"
                    />
                    <span className="text-[11px] font-mono text-slate-500 w-16">
                      [{tab.id}]
                    </span>
                  </label>

                  <input
                    type="text"
                    value={tab.label}
                    onChange={(e) => handleTabLabelChange(tab.id, e.target.value)}
                    className="flex-1 bg-white px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                  />

                  <button
                    type="button"
                    onClick={() => handleDeleteCategoryTab(tab.id)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold p-1 rounded hover:bg-rose-50 transition"
                    title="Delete tab"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
              <input
                type="text"
                value={newTabId}
                onChange={(e) => setNewTabId(e.target.value)}
                placeholder="Tab ID (e.g. 'sugarless' or 'farsan')"
                className="w-full sm:w-48 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
              />
              <input
                type="text"
                value={newTabLabel}
                onChange={(e) => setNewTabLabel(e.target.value)}
                placeholder="Tab Label (e.g. '🌰 Cashew Treats')"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
              />
              <button
                type="button"
                onClick={handleAddCategoryTab}
                className="px-5 py-1.5 rounded-xl bg-[#0b2f8a] text-white text-xs font-bold hover:bg-[#1a3fa3] transition cursor-pointer"
              >
                + Add Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Footer */}
      <div className="sticky bottom-6 z-20 flex items-center justify-between bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10">
        <div>
          <p className="text-xs font-bold text-[#dfb755]">
            Save configuration to publish live
          </p>
          <p className="text-[11px] text-slate-300">
            Changes will take effect instantly on <code>/new-products</code> and <code>/new-launches</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#dfb755] hover:bg-[#b89130] text-[#0b2f8a] font-bold px-6 py-2.5 text-xs sm:text-sm shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>💾</span>
          <span>{saving ? "Saving Changes..." : "Publish Live Changes"}</span>
        </button>
      </div>
    </div>
  );
}
