"use client";

import { useState, useEffect } from "react";
import { UiConfig, HeroPhoto, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";

interface HeroScrollerTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

const MITHAI_PHOTO_PRESETS = [
  { name: "Kaju Katli", image: "/images/kaju-katli-showcase.jpg", category: "Mithai" },
  { name: "Motichoor Ladoo", image: "/images/motichoor-showcase.jpg", category: "Mithai" },
  { name: "Nylon Khaman", image: "/images/khaman-showcase.jpg", category: "Farsan" },
  { name: "Surati Khandvi", image: "/images/khandvi-showcase.jpg", category: "Farsan" },
  { name: "Shahi Platter", image: "/images/mithai-platter-showcase.jpg", category: "Festive" },
  { name: "Special Bhel", image: "/images/special-bhel-showcase.jpg", category: "Farsan" },
  { name: "Ratlami Sev", image: "/uploads/1791029531387-c8e0da1d-527e-48b8-be9a-a5500eca62e3.jpg", category: "Farsan" },
  { name: "Gulab Jamun", image: "/images/gulab-jamun.jpg", category: "Mithai" },
  { name: "Crispy Jalebi", image: "/images/jalebi.jpg", category: "Mithai" },
  { name: "Kesar Peda", image: "/images/peda.jpg", category: "Mithai" },
  { name: "Royal Rasmalai", image: "/images/rasmalai.jpg", category: "Mithai" },
  { name: "Spicy Namkeen", image: "/images/namkeen.jpg", category: "Farsan" },
  { name: "Luxury Hamper", image: "/images/hamper.jpg", category: "Festive" },
  { name: "Gujarati Mithai", image: "/images/gujarati-mithai-showcase.jpg", category: "Mithai" },
];

const BANNER_PRESETS = [
  {
    name: "Heritage Karigar Panorama (Ghee, Jalebi, Silver Foil Katli)",
    url: "/images/heritage-hero-banner.png",
    description: "Default 3-panel authentic workshop photography",
  },
  {
    name: "Luxury Mithai Row Wide Banner",
    url: "/images/mithai-row-banner.png",
    description: "Wide spread of pure ghee Gujarati sweets",
  },
  {
    name: "Royal Festive Mithai Platter",
    url: "/images/mithai-platter-showcase.jpg",
    description: "Rich Diwali & wedding gift hamper arrangement",
  },
  {
    name: "Morning Steamed Nylon Khaman",
    url: "/images/khaman-showcase.jpg",
    description: "Authentic Gujarati live morning farsan",
  },
];

type ActiveSection = "headline" | "buttons" | "stats" | "slides" | "heritage";

export function HeroScrollerTab({ config, onRefresh }: HeroScrollerTabProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>("headline");
  const [isSaving, setIsSaving] = useState(false);

  // 1. Main Hero Content (Left column)
  const [heroContent, setHeroContent] = useState({
    badgeEst: config?.heroContent?.badgeEst ?? "EST. 1976",
    badgeText: config?.heroContent?.badgeText ?? "AUTHENTIC GUJARATI MITHAI & FARSAN",
    titlePrefix: config?.heroContent?.titlePrefix ?? "Handcrafted",
    titleHighlight1: config?.heroContent?.titleHighlight1 ?? "Mithai",
    titleMiddle: config?.heroContent?.titleMiddle ?? "& Fresh Daily",
    titleHighlight2: config?.heroContent?.titleHighlight2 ?? "Farsan",
    description:
      config?.heroContent?.description ??
      "Pure ghee sweets & savoury farsan delivered fresh across Gujarat. From silver-foiled Kaju Katli to morning-steamed Nylon Khaman Dhokla, crafted the authentic way since 1976.",
    button1Text: config?.heroContent?.button1Text ?? "Order Fresh Mithai →",
    button1Link: config?.heroContent?.button1Link ?? "/shop",
    button2Text: config?.heroContent?.button2Text ?? "Festive Hampers",
    button2Link: config?.heroContent?.button2Link ?? "/shop?category=gift-hampers",
    stat1Value: config?.heroContent?.stat1Value ?? "48+ Yrs",
    stat1Label: config?.heroContent?.stat1Label ?? "Serving Gujarat",
    stat2Value: config?.heroContent?.stat2Value ?? "100%",
    stat2Label: config?.heroContent?.stat2Label ?? "Shuddh Desi Ghee",
    stat3Value: config?.heroContent?.stat3Value ?? "4.9 ★",
    stat3Label: config?.heroContent?.stat3Label ?? "Over 12k Reviews",
  });

  // 2. Hero Showcase Slides (Right Column Carousel)
  const [heroPhotos, setHeroPhotos] = useState<HeroPhoto[]>(
    config?.heroPhotos ?? [
      { id: "kaju-katli", name: "Kaju Katli", image: "/images/kaju-katli-showcase.jpg", category: "Mithai", active: true, order: 1 },
      { id: "motichoor-ladoo", name: "Motichoor Ladoo", image: "/images/motichoor-showcase.jpg", category: "Mithai", active: true, order: 2 },
      { id: "nylon-khaman", name: "Nylon Khaman", image: "/images/khaman-showcase.jpg", category: "Farsan", active: true, order: 3 },
      { id: "surati-khandvi", name: "Surati Khandvi", image: "/images/khandvi-showcase.jpg", category: "Farsan", active: true, order: 4 },
      { id: "festive-platter", name: "Shahi Platter", image: "/images/mithai-platter-showcase.jpg", category: "Festive", active: true, order: 5 },
    ]
  );

  // 3. Carousel Settings
  const [autoScroll, setAutoScroll] = useState(config?.heroSettings?.autoScroll ?? true);
  const [intervalSeconds, setIntervalSeconds] = useState(config?.heroSettings?.intervalSeconds ?? 4);

  // 4. Top Heritage Panorama Banner
  const [banner, setBanner] = useState({
    enabled: config?.heritageBanner?.enabled ?? true,
    topBadgeGujarati: config?.heritageBanner?.topBadgeGujarati ?? "સ્વીટ માર્ટ",
    topBadgeEnglish: config?.heritageBanner?.topBadgeEnglish ?? "Since 1976",
    titleLine1: config?.heritageBanner?.titleLine1 ?? "Tradition Preserved Since 1976 —",
    titleLine2: config?.heritageBanner?.titleLine2 ?? "Pure Desi Ghee, Zero Compromise",
    showTextOverlay: config?.heritageBanner?.showTextOverlay ?? true,
    button1Text: config?.heritageBanner?.button1Text ?? "Explore Heritage Menu",
    button1Link: config?.heritageBanner?.button1Link ?? "/shop",
    button2Text: config?.heritageBanner?.button2Text ?? "Gift Hampers",
    button2Link: config?.heritageBanner?.button2Link ?? "/shop?category=gift-hampers",
    bannerImage: config?.heritageBanner?.bannerImage ?? "/images/heritage-hero-banner.png",
  });

  // Local Preview Active Slide state
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // New slide form modal
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [newSlideName, setNewSlideName] = useState("");
  const [newSlideCategory, setNewSlideCategory] = useState("Mithai");
  const [newSlideImage, setNewSlideImage] = useState("/images/kaju-katli-showcase.jpg");

  // Edit existing slide modal
  const [editingSlide, setEditingSlide] = useState<HeroPhoto | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (config?.heroContent) {
        setHeroContent((prev) => ({ ...prev, ...config.heroContent }));
      }
      if (config?.heroPhotos && config.heroPhotos.length > 0) {
        setHeroPhotos(config.heroPhotos);
      }
      if (config?.heroSettings) {
        setAutoScroll(config.heroSettings.autoScroll ?? true);
        setIntervalSeconds(config.heroSettings.intervalSeconds ?? 4);
      }
      if (config?.heritageBanner) {
        setBanner((prev) => ({ ...prev, ...config.heritageBanner }));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [config]);

  // Auto-scroll the live preview when autoScroll is enabled
  useEffect(() => {
    const activeCount = heroPhotos.filter((p) => p.active !== false).length;
    if (!autoScroll || activeCount <= 1) return;
    const timer = setInterval(() => {
      setPreviewSlideIdx((prev) => (prev + 1) % activeCount);
    }, (Number(intervalSeconds) || 4) * 1000);
    return () => clearInterval(timer);
  }, [autoScroll, intervalSeconds, heroPhotos]);

  // Save changes to storefront API
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await api.updateUiConfig({
        heroContent,
        heroPhotos,
        heroSettings: {
          autoScroll,
          intervalSeconds: Number(intervalSeconds),
        },
        heritageBanner: banner,
      });
      const storeUrl = process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449";
      toast.success("Hero section updated successfully!", storeUrl);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hero section. Please check storefront connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add new slide
  const handleAddSlide = () => {
    if (!newSlideName.trim()) {
      toast.error("Please enter a sweet / farsan name");
      return;
    }
    const newSlide: HeroPhoto = {
      id: `slide-${Date.now()}`,
      name: newSlideName.trim(),
      category: newSlideCategory,
      image: newSlideImage,
      active: true,
      order: heroPhotos.length + 1,
    };
    setHeroPhotos([...heroPhotos, newSlide]);
    setNewSlideName("");
    setShowAddSlide(false);
    toast.success(`Slide "${newSlide.name}" added to showcase!`);
  };

  // Delete slide
  const handleDeleteSlide = (id: string) => {
    if (heroPhotos.length <= 1) {
      toast.error("Showcase must have at least 1 slide");
      return;
    }
    setHeroPhotos(heroPhotos.filter((p) => p.id !== id));
    if (previewSlideIdx >= heroPhotos.length - 1) {
      setPreviewSlideIdx(0);
    }
  };

  // Toggle active
  const handleToggleSlideActive = (id: string) => {
    setHeroPhotos(
      heroPhotos.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const activeShowcasePhotos = heroPhotos.filter((p) => p.active);
  const currentPreviewSlide =
    activeShowcasePhotos[previewSlideIdx % (activeShowcasePhotos.length || 1)] ||
    heroPhotos[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b2f8a]/10 text-[#0b2f8a] text-xs font-bold uppercase tracking-wider mb-2">
            <span>✨ Full Hero Page Management</span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
            Manage Entire Hero Showcase Page
          </h2>
          <p className="text-xs text-[#5e6d82] mt-1 max-w-2xl">
            Control the headline, description, action buttons, trust counters, sweet slider photos, auto-scroll speed, and top panoramic banner.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-6 py-3 rounded-xl font-bold text-xs bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20 transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
        >
          {isSaving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Save & Publish Live</span>
            </>
          )}
        </button>
      </div>

      {/* REAL-TIME EXACT LIVE PREVIEW (MATCHING USER SCREENSHOT) */}
      <div className="rounded-3xl border-2 border-[#0b2f8a]/20 bg-white overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-[#0b2f8a] to-[#071c54] px-6 py-3 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide">
              Live Preview · Exactly How Customers See It on {process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449"}
            </span>
          </div>
          <span className="text-[11px] text-white/70">Updates in Real-Time as You Edit</span>
        </div>

        {/* Live Hero Replica matching screenshot */}
        <div className="p-6 sm:p-10 bg-gradient-to-br from-[#fdfbf7] via-white to-[#fbf7ee]">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0b2f8a]/15 bg-[#eef3ff] px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#0b2f8a]">
                <span>✨ {heroContent.badgeEst}</span>
                <span className="text-[#0b2f8a]/30">•</span>
                <span>{heroContent.badgeText}</span>
              </div>

              {/* Headline */}
              <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold leading-[1.08] tracking-tight text-[#182230]">
                {heroContent.titlePrefix}{" "}
                <span className="text-[#0b2f8a]">{heroContent.titleHighlight1}</span>{" "}
                {heroContent.titleMiddle}{" "}
                <span className="text-[#b89130]">{heroContent.titleHighlight2}</span>
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm leading-relaxed text-[#5e6d82] max-w-xl">
                {heroContent.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  className="rounded-full px-6 py-3 text-xs font-bold text-[#071c54] bg-[#dfb755] hover:bg-[#b89130] transition shadow-sm"
                >
                  {heroContent.button1Text || "Order Fresh Mithai →"}
                </button>
                {heroContent.button2Text && (
                  <button
                    type="button"
                    className="rounded-full border-2 border-[#0b2f8a] bg-white px-6 py-2.5 text-xs font-bold text-[#0b2f8a]"
                  >
                    {heroContent.button2Text}
                  </button>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-3 border-t border-[#0b2f8a]/10 pt-5">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                    {heroContent.stat1Value}
                  </p>
                  <p className="text-[11px] text-[#5e6d82]">{heroContent.stat1Label}</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                    {heroContent.stat2Value}
                  </p>
                  <p className="text-[11px] text-[#5e6d82]">{heroContent.stat2Label}</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                    {heroContent.stat3Value}
                  </p>
                  <p className="text-[11px] text-[#5e6d82]">{heroContent.stat3Label}</p>
                </div>
              </div>
            </div>

            {/* Right Showcase Card Preview */}
            <div className="lg:col-span-6 relative flex flex-col items-center">
              <div className="w-full max-w-lg bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xl space-y-4">
                {/* Main Active Image Showcase with Arrows & Dots */}
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#fffdf7] via-[#fefaf0] to-[#fcf4e4] group shadow-inner flex items-center justify-center">
                  {currentPreviewSlide ? (
                    <>
                      {/* Ambient blur backdrop */}
                      <img
                        src={currentPreviewSlide.image}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none select-none"
                      />
                      {/* Main photo: zoomed out, full view */}
                      <img
                        src={currentPreviewSlide.image}
                        alt={currentPreviewSlide.name}
                        className="relative z-10 w-full h-full object-contain p-2.5 scale-100 hover:scale-[1.02] transition-transform duration-500 ease-out drop-shadow-sm select-none"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      No Active Slides
                    </div>
                  )}

                  {/* Left Arrow */}
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSlideIdx((prev) =>
                        prev === 0 ? activeShowcasePhotos.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 shadow-md hover:bg-white text-xs font-bold"
                  >
                    ❮
                  </button>

                  {/* Right Arrow */}
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSlideIdx((prev) => (prev + 1) % (activeShowcasePhotos.length || 1))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 shadow-md hover:bg-white text-xs font-bold"
                  >
                    ❯
                  </button>

                  {/* Pagination dots */}
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
                    {activeShowcasePhotos.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === previewSlideIdx % (activeShowcasePhotos.length || 1)
                            ? "w-6 bg-white shadow"
                            : "w-1.5 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Sub-bar: TAP TO VIEW MITHAI & Slide counter */}
                <div className="flex items-center justify-between text-[11px] font-bold px-1">
                  <span className="text-[#b89130] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#dfb755]" />
                    <span>TAP TO VIEW MITHAI & FARSAN</span>
                  </span>
                  <span className="text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-100">
                    {(previewSlideIdx % (activeShowcasePhotos.length || 1)) + 1} /{" "}
                    {activeShowcasePhotos.length}
                  </span>
                </div>

                {/* Thumbnails Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {activeShowcasePhotos.map((photo, idx) => {
                    const isActive =
                      idx === previewSlideIdx % (activeShowcasePhotos.length || 1);
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setPreviewSlideIdx(idx)}
                        className={`flex flex-col items-center gap-1.5 p-1 rounded-xl shrink-0 border transition-all ${
                          isActive
                            ? "border-2 border-[#0b2f8a] bg-blue-50/50 shadow-sm"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                        style={{ width: "80px" }}
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
                          <img
                            src={photo.image}
                            alt={photo.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center px-0.5">
                          {photo.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEGMENTED CONTROL TABS TO MANAGE EACH PART */}
      <div className="bg-white rounded-2xl border border-[#0b2f8a]/10 p-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("headline")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === "headline"
                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                : "text-slate-600 hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
            }`}
          >
            <span>✍️</span>
            <span>Headline & Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("buttons")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === "buttons"
                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                : "text-slate-600 hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
            }`}
          >
            <span>🔘</span>
            <span>Action Buttons</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("stats")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === "stats"
                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                : "text-slate-600 hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
            }`}
          >
            <span>🏆</span>
            <span>Trust Indicators</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("slides")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === "slides"
                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                : "text-slate-600 hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
            }`}
          >
            <span>🍬</span>
            <span>Showcase Sweets ({heroPhotos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("heritage")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === "heritage"
                ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                : "text-slate-600 hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
            }`}
          >
            <span>🖼️</span>
            <span>Top Panorama Banner</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: HEADLINE & STORY */}
      {activeSection === "headline" && (
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0b2f8a] flex items-center gap-2">
              <span>✍️</span> Headline & Brand Story
            </h3>
            <p className="text-xs text-[#5e6d82] mt-0.5">
              Customize the badge, main multi-colored title, and introductory paragraph.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Badge Year / Tag (e.g. EST. 1976)
              </label>
              <input
                type="text"
                value={heroContent.badgeEst}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, badgeEst: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] focus:ring-1 focus:ring-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Badge Subtitle
              </label>
              <input
                type="text"
                value={heroContent.badgeText}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, badgeText: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] focus:ring-1 focus:ring-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Headline Word 1 (Default: Handcrafted)
              </label>
              <input
                type="text"
                value={heroContent.titlePrefix}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, titlePrefix: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] focus:ring-1 focus:ring-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Highlighted Word 1 in Royal Blue (Default: Mithai)
              </label>
              <input
                type="text"
                value={heroContent.titleHighlight1}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, titleHighlight1: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-blue-300 bg-blue-50/30 text-[#0b2f8a] font-bold focus:border-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Headline Middle Text (Default: & Fresh Daily)
              </label>
              <input
                type="text"
                value={heroContent.titleMiddle}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, titleMiddle: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Highlighted Word 2 in Gold (Default: Farsan)
              </label>
              <input
                type="text"
                value={heroContent.titleHighlight2}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, titleHighlight2: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-amber-300 bg-amber-50/30 text-[#b89130] font-bold focus:border-[#b89130] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Story / Description Paragraph
              </label>
              <textarea
                rows={3}
                value={heroContent.description}
                onChange={(e) =>
                  setHeroContent({ ...heroContent, description: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BUTTONS & LINKS */}
      {activeSection === "buttons" && (
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0b2f8a] flex items-center gap-2">
              <span>🔘</span> Action Buttons & Links
            </h3>
            <p className="text-xs text-[#5e6d82] mt-0.5">
              Change the primary gold button and secondary button text and destination URLs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Primary Button */}
            <div className="p-5 rounded-xl border border-[#dfb755]/40 bg-[#fdfaf3] space-y-3">
              <span className="text-xs font-bold text-[#92400e] uppercase tracking-wider">
                Primary Button (Gold Highlighted)
              </span>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  value={heroContent.button1Text}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, button1Text: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button Link / URL
                </label>
                <input
                  type="text"
                  value={heroContent.button1Link}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, button1Link: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Secondary Button */}
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
              <span className="text-xs font-bold text-[#0b2f8a] uppercase tracking-wider">
                Secondary Button (Outlined)
              </span>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  value={heroContent.button2Text}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, button2Text: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button Link / URL
                </label>
                <input
                  type="text"
                  value={heroContent.button2Link}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, button2Link: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TRUST INDICATORS */}
      {activeSection === "stats" && (
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0b2f8a] flex items-center gap-2">
              <span>🏆</span> Trust Indicators & Social Proof
            </h3>
            <p className="text-xs text-[#5e6d82] mt-0.5">
              Customize the three credibility metric badges shown below the buttons.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Stat 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="text-xs font-bold text-[#0b2f8a]">Counter #1</span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Metric Value
                </label>
                <input
                  type="text"
                  value={heroContent.stat1Value}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, stat1Value: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-[#0b2f8a]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={heroContent.stat1Label}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, stat1Label: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="text-xs font-bold text-[#0b2f8a]">Counter #2</span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Metric Value
                </label>
                <input
                  type="text"
                  value={heroContent.stat2Value}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, stat2Value: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-[#0b2f8a]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={heroContent.stat2Label}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, stat2Label: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="text-xs font-bold text-[#0b2f8a]">Counter #3</span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Metric Value
                </label>
                <input
                  type="text"
                  value={heroContent.stat3Value}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, stat3Value: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-[#0b2f8a]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={heroContent.stat3Label}
                  onChange={(e) =>
                    setHeroContent({ ...heroContent, stat3Label: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SHOWCASE SWEETS & CAROUSEL */}
      {activeSection === "slides" && (
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#0b2f8a] flex items-center gap-2">
                <span>🍬</span> Showcase Carousel Slides ({heroPhotos.length} Items)
              </h3>
              <p className="text-xs text-[#5e6d82] mt-0.5">
                Add, remove, reorder, or swap photos for the interactive Mithai & Farsan showcase.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddSlide(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Add Sweet / Slide</span>
              </button>
            </div>
          </div>

          {/* Carousel Controls (Auto Scroll & Speed) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Auto-Scroll Carousel:</span>
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoScroll ? "bg-[#0b2f8a]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoScroll ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-slate-600">
                {autoScroll ? "Active (Auto-advancing)" : "Disabled (Manual click only)"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Interval Speed:</span>
              <select
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value={2}>2 Seconds (Fast)</option>
                <option value={3}>3 Seconds</option>
                <option value={4}>4 Seconds (Recommended)</option>
                <option value={5}>5 Seconds</option>
                <option value={6}>6 Seconds (Relaxed)</option>
              </select>
            </div>
          </div>

          {/* Slides List Cards */}
          <div className="space-y-3">
            {heroPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0b2f8a]/30 transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {index + 1}
                  </span>

                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm">
                    <img
                      src={photo.image}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {photo.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0b2f8a] border border-blue-200">
                        {photo.category || "Showcase"}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          photo.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {photo.active ? "● Visible in Store" : "● Hidden"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingSlide(photo)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-[#0b2f8a] hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1"
                  >
                    <span>📷</span>
                    <span>Edit Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSlideActive(photo.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      photo.active
                        ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    {photo.active ? "Hide" : "Show"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(photo.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Presets Grid */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              One-Click Image Presets (Click any to quickly append to showcase)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {MITHAI_PHOTO_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    const newSlide: HeroPhoto = {
                      id: `preset-${Date.now()}-${Math.random()}`,
                      name: preset.name,
                      category: preset.category,
                      image: preset.image,
                      active: true,
                      order: heroPhotos.length + 1,
                    };
                    setHeroPhotos([...heroPhotos, newSlide]);
                    toast.success(`"${preset.name}" added to showcase!`);
                  }}
                  className="p-2 rounded-xl border border-slate-200 hover:border-[#0b2f8a] bg-slate-50/50 hover:bg-blue-50/30 transition text-left group"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-200 mb-1.5">
                    <img
                      src={preset.image}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    + {preset.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: TOP HERITAGE PANORAMA BANNER */}
      {activeSection === "heritage" && (
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#0b2f8a] flex items-center gap-2">
                <span>🖼️</span> Top Heritage Panorama Banner
              </h3>
              <p className="text-xs text-[#5e6d82] mt-0.5">
                Configure the top panoramic craftsmanship banner with Gujarati crest and vintage styling.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                {banner.enabled ? "Enabled" : "Disabled"}
              </span>
              <button
                type="button"
                onClick={() => setBanner({ ...banner, enabled: !banner.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  banner.enabled ? "bg-[#0b2f8a]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    banner.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Top Gujarati Badge (e.g. સ્વીટ માર્ટ)
              </label>
              <input
                type="text"
                value={banner.topBadgeGujarati}
                onChange={(e) =>
                  setBanner({ ...banner, topBadgeGujarati: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Top English Badge (e.g. Since 1976)
              </label>
              <input
                type="text"
                value={banner.topBadgeEnglish}
                onChange={(e) =>
                  setBanner({ ...banner, topBadgeEnglish: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Title Line 1
              </label>
              <input
                type="text"
                value={banner.titleLine1}
                onChange={(e) =>
                  setBanner({ ...banner, titleLine1: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Title Line 2
              </label>
              <input
                type="text"
                value={banner.titleLine2}
                onChange={(e) =>
                  setBanner({ ...banner, titleLine2: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <ImagePickerField
                label="Panorama Banner Image"
                value={banner.bannerImage}
                onChange={(url) => setBanner({ ...banner, bannerImage: url })}
                helperText="Upload your own panoramic banner from computer/mobile, choose from photos library, or paste an image URL."
                presetFilter="Banner"
              />
            </div>
          </div>

          {/* Banner Presets */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Panorama Presets
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BANNER_PRESETS.map((bp) => (
                <button
                  key={bp.url}
                  type="button"
                  onClick={() => setBanner({ ...banner, bannerImage: bp.url })}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    banner.bannerImage === bp.url
                      ? "border-[#0b2f8a] bg-blue-50/40 ring-2 ring-[#0b2f8a]/10"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <img src={bp.url} alt={bp.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{bp.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{bp.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Quick Publish Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#0b2f8a]/15 shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="text-base">🚀</span>
          <span>Ready to publish changes to customer storefront?</span>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? "Publishing..." : "💾 Save & Publish All Changes"}
        </button>
      </div>

      {/* Modal: Add New Showcase Slide */}
      {showAddSlide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2f8a] flex items-center gap-2">
                <span>🍬</span> Add New Showcase Slide
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSlide(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sweet / Farsan Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kesar Peda, Fafda, etc."
                  value={newSlideName}
                  onChange={(e) => setNewSlideName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Tag
                </label>
                <select
                  value={newSlideCategory}
                  onChange={(e) => setNewSlideCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none bg-white"
                >
                  <option value="Mithai">Mithai (Sweet)</option>
                  <option value="Farsan">Farsan (Snack)</option>
                  <option value="Festive">Festive Special</option>
                  <option value="Dryfruits">Dryfruits Sweet</option>
                </select>
              </div>

              <div>
                <ImagePickerField
                  label="Slide Image / Photo"
                  value={newSlideImage}
                  onChange={(url) => setNewSlideImage(url)}
                  helperText="Choose a file from your computer, select from mithai/farsan photos, or enter a URL."
                  presetFilter="Mithai"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddSlide(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSlide}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] shadow-sm"
              >
                Add to Showcase
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Edit Existing Showcase Slide */}
      {editingSlide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2f8a] flex items-center gap-2">
                <span>📷</span> Edit Slide &amp; Photo
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sweet / Farsan Title
                </label>
                <input
                  type="text"
                  value={editingSlide.name}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Tag
                </label>
                <select
                  value={editingSlide.category || "Mithai"}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, category: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#0b2f8a] outline-none bg-white"
                >
                  <option value="Mithai">Mithai (Sweet)</option>
                  <option value="Farsan">Farsan (Snack)</option>
                  <option value="Festive">Festive Special</option>
                  <option value="Dryfruits">Dryfruits Sweet</option>
                </select>
              </div>

              <div>
                <ImagePickerField
                  label="Slide Image / Photo"
                  value={editingSlide.image}
                  onChange={(url) =>
                    setEditingSlide({ ...editingSlide, image: url })
                  }
                  helperText="Choose a file to upload from your computer or pick from the photos library."
                  presetFilter="Mithai"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeroPhotos(
                    heroPhotos.map((p) =>
                      p.id === editingSlide.id ? editingSlide : p
                    )
                  );
                  setEditingSlide(null);
                  toast.success(`Updated "${editingSlide.name}" slide!`);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
