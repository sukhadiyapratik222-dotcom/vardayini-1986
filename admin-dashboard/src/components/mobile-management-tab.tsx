"use client";

import { useState } from "react";
import { UiConfig, api, MobileManagementConfig, MobileCustomPage } from "@/lib/api";
import { toast } from "@/lib/toast";

interface MobileManagementTabProps {
  config?: UiConfig | null;
  onRefresh?: () => void;
}

export function MobileManagementTab({ config, onRefresh }: MobileManagementTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"sections" | "pages" | "preview">("sections");
  const [deviceModel, setDeviceModel] = useState<"iphone" | "android" | "compact">("iphone");
  const [saving, setSaving] = useState(false);

  // Modal state for creating/editing mobile pages
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  // Initial local state from uiConfig or default
  const defaultMobile: MobileManagementConfig = {
    enabled: true,
    activeDesignId: "artisanal-modern",
    theme: {
      primaryColor: "#0B1B4F",
      accentColor: "#DFB755",
      bgColor: "#FDFBF7",
    },
    announcement: {
      enabled: true,
      text: "Free delivery on orders above ₹799 • Use code FESTIVE15 for 15% off",
      couponCode: "FESTIVE15",
    },
    hero: {
      enabled: true,
      badge: "100% Shuddh Desi Ghee",
      tag: "New Artisanal Creation",
      title: "Dubai Chocolate Ladoo",
      description:
        "A decadent fusion of traditional besan and rich Belgian pistachio knafeh chocolate. Crafted by master halwais.",
      priceText: "₹499",
      weightText: "/ 250g",
      buttonText: "Order Now",
      buttonLink: "/shop/dubai-chocolate-ladoo",
      imageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg",
    },
    marquee: {
      enabled: true,
      items: [
        "Kaju Katli",
        "Shahi Gulab Jamun",
        "Kesar Peda",
        "Mohanthal",
        "Motichoor Ladoo",
        "Kaju Pista Roll",
      ],
    },
    categories: {
      enabled: true,
      title: "Shop By Category",
      viewAllText: "View All",
      viewAllUrl: "/shop",
      items: [
        { id: "cat-sweets", name: "Sweets", slug: "sweets", imageUrl: "/images/kaju-katli.jpg", active: true },
        { id: "cat-savouries", name: "Savouries", slug: "savouries", imageUrl: "/images/namkeen.jpg", active: true },
        { id: "cat-artisanal", name: "Artisanal Sweets", slug: "artisanal-sweets", imageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg", active: true },
        { id: "cat-bakery", name: "Bakery", slug: "bakery", imageUrl: "/images/special-bhel-showcase.jpg", active: true },
        { id: "cat-gifting", name: "Gifting", slug: "gifting", imageUrl: "/images/festive-hamper.jpg", active: true },
      ],
    },
    bestsellers: {
      enabled: true,
      tag: "Handcrafted Daily",
      title: "Signature Best Sellers",
      viewAllText: "See All",
      viewAllUrl: "/shop",
      items: [
        {
          id: "mb-1",
          name: "Silver Foil Kaju Katli",
          sublabel: "Pure Cashews & Ghee",
          badge: "BEST SELLER",
          price: 425,
          weight: "/ 250g",
          imageUrl: "/images/kaju-katli.jpg",
          slug: "kaju-katli",
          productId: 1,
        },
        {
          id: "mb-2",
          name: "Shahi Gulab Jamun",
          sublabel: "Mawa & Rose Syrup",
          badge: "BEST SELLER",
          price: 280,
          weight: "/ 500g",
          imageUrl: "/images/gulab-jamun.jpg",
          slug: "gulab-jamun",
          productId: 2,
        },
        {
          id: "mb-3",
          name: "Kesar Malai Peda",
          sublabel: "Kashmiri Saffron",
          badge: "CHEF'S PICK",
          price: 350,
          weight: "/ 250g",
          imageUrl: "/images/peda.jpg",
          slug: "kesar-malai-penda",
          productId: 37,
        },
        {
          id: "mb-4",
          name: "Gujarati Mohanthal",
          sublabel: "Besan & Shuddh Ghee",
          badge: "TRADITIONAL",
          price: 320,
          weight: "/ 250g",
          imageUrl: "/images/motichoor.jpg",
          slug: "desi-ghee-mohanthal",
          productId: 3,
        },
      ],
    },
    journeyStats: {
      enabled: true,
      tag: "A Legacy of Trust",
      title: "A Journey Of 75 Years",
      description:
        "Serving generations of sweet lovers with uncompromised quality, authentic recipes, and pure ingredients since 1951 in Kalol.",
      stats: [
        { value: "75+", label: "Years Legacy" },
        { value: "150+", label: "Varieties" },
        { value: "2M+", label: "Happy Customers" },
      ],
    },
    tasteQuizBanner: {
      enabled: true,
      tag: "Mithai Quiz",
      title: "Quick Taste Match Finder",
      description:
        "Confused about what to pick for your celebrations or palate? Take our 30-second quiz to discover your ideal sweet match!",
      buttonText: "Start Quiz",
      buttonLink: "/find-your-sweet",
    },
    outletsSection: {
      enabled: true,
      tag: "Visit Us",
      title: "Our Flagship Stores",
      stores: [
        {
          name: "Vardayini Main Bazaar Counter",
          address: "Shop No. 6A, Navjivan Shopping Center, Kalol 382721",
          timings: "Open 8:00 AM - 10:00 PM",
        },
        {
          name: "Vardayini Satellite Outlet",
          address: "Station Road, Navjivan Corner, Kalol 382721",
          timings: "Open 9:00 AM - 10:30 PM",
        },
      ],
    },
    bottomNav: {
      enabled: true,
      tabs: [
        { id: "nav-home", label: "Home", href: "/", icon: "home", active: true },
        { id: "nav-shop", label: "Shop", href: "/shop", icon: "shop", active: true },
        { id: "nav-gifting", label: "Gifting", href: "/shop?category=gifting", icon: "gifting", active: true },
        { id: "nav-stores", label: "Stores", href: "#stores", icon: "stores", active: true },
        { id: "nav-cart", label: "Cart", href: "/cart", icon: "cart", active: true },
      ],
    },
    customPages: [
      {
        id: "page-festive",
        title: "Festive Gold Collection",
        slug: "festive-gold",
        description: "Handcrafted sweets in exclusive royal gold gift boxes for festive gifting.",
        designStyle: "gold-luxury",
        bannerImageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg",
        heroHeading: "Diwali & Festive Masterpieces",
        heroSubheading:
          "Pure Gir cow desi ghee sweets slow-cooked and adorned with silver vark and Iranian saffron.",
        contentHtml: "<p>Experience authentic Gujarat celebrations with pure taste and fragrant warmth.</p>",
        featuredProductIds: [1, 2, 37, 3],
        isActive: true,
        isDefaultHome: false,
        createdAt: "2026-11-14T20:00:00.000Z",
        updatedAt: "2026-11-14T20:00:00.000Z",
      },
    ],
  };

  const [mobileState, setMobileState] = useState<MobileManagementConfig>(() => {
    return (config?.mobileManagement as MobileManagementConfig) || defaultMobile;
  });

  // Modal form state for custom mobile page
  const [modalPageForm, setModalPageForm] = useState<Partial<MobileCustomPage>>({
    title: "",
    slug: "",
    description: "",
    designStyle: "artisanal-navy",
    heroHeading: "",
    heroSubheading: "",
    bannerImageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg",
    contentHtml: "",
    isActive: true,
    isDefaultHome: false,
  });

  // Save all mobile settings to backend
  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.updateUiConfig({
        mobileManagement: mobileState,
      });
      if (res.success) {
        toast.success("✓ Mobile view settings and pages saved successfully!");
        if (onRefresh) onRefresh();
      } else {
        toast.error("Failed to save mobile settings");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error saving mobile configuration");
    } finally {
      setSaving(false);
    }
  }

  // Open create page modal
  function openCreatePageModal() {
    setEditingPageId(null);
    setModalPageForm({
      title: "",
      slug: "",
      description: "",
      designStyle: "artisanal-navy",
      heroHeading: "",
      heroSubheading: "",
      bannerImageUrl: "/images/showcase/dubai-chocolate-ladoo.jpg",
      contentHtml: "",
      isActive: true,
      isDefaultHome: false,
    });
    setShowPageModal(true);
  }

  // Open edit page modal
  function openEditPageModal(page: MobileCustomPage) {
    setEditingPageId(page.id);
    setModalPageForm({ ...page });
    setShowPageModal(true);
  }

  // Save modal page
  function handleSavePageModal(e: React.FormEvent) {
    e.preventDefault();
    if (!modalPageForm.title?.trim() || !modalPageForm.slug?.trim()) {
      toast.error("Please provide both page title and URL slug.");
      return;
    }

    const cleanSlug = modalPageForm.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/^-+|-+$/g, "");

    const existingPages = mobileState.customPages || [];
    let updatedPages: MobileCustomPage[];

    if (editingPageId) {
      // Edit
      updatedPages = existingPages.map((p) => {
        if (p.id === editingPageId) {
          return {
            ...p,
            ...modalPageForm,
            slug: cleanSlug,
            updatedAt: new Date().toISOString(),
          } as MobileCustomPage;
        }
        return modalPageForm.isDefaultHome ? { ...p, isDefaultHome: false } : p;
      });
    } else {
      // Create new page
      const newPage: MobileCustomPage = {
        id: `page-${Date.now()}`,
        title: modalPageForm.title.trim(),
        slug: cleanSlug,
        description: modalPageForm.description || "",
        designStyle: (modalPageForm.designStyle as any) || "artisanal-navy",
        bannerImageUrl: modalPageForm.bannerImageUrl || "/images/showcase/dubai-chocolate-ladoo.jpg",
        heroHeading: modalPageForm.heroHeading || modalPageForm.title,
        heroSubheading: modalPageForm.heroSubheading || modalPageForm.description || "",
        contentHtml: modalPageForm.contentHtml || "",
        isActive: modalPageForm.isActive !== false,
        isDefaultHome: Boolean(modalPageForm.isDefaultHome),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updatedPages = [
        ...existingPages.map((p) => (newPage.isDefaultHome ? { ...p, isDefaultHome: false } : p)),
        newPage,
      ];
    }

    setMobileState((prev) => ({
      ...prev,
      customPages: updatedPages,
      activeDesignId: modalPageForm.isDefaultHome ? cleanSlug : prev.activeDesignId,
    }));

    setShowPageModal(false);
    toast.success(
      editingPageId ? "✓ Mobile page design updated!" : "✓ New mobile page created and listed!"
    );
  }

  // Delete page
  function handleDeletePage(pageId: string) {
    if (confirm("Are you sure you want to delete this mobile page design?")) {
      const updated = (mobileState.customPages || []).filter((p) => p.id !== pageId);
      setMobileState((prev) => ({ ...prev, customPages: updated }));
      toast.info("Mobile page removed.");
    }
  }

  // Set page as default mobile home
  function handleSetDefaultHome(slug: string) {
    const updated = (mobileState.customPages || []).map((p) => ({
      ...p,
      isDefaultHome: p.slug === slug,
    }));
    setMobileState((prev) => ({
      ...prev,
      customPages: updated,
      activeDesignId: slug,
    }));
    toast.success(`✓ Set "/m/${slug}" as active mobile homepage design!`);
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL STATUS
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1B4F] text-xl shadow-xs">
              📱
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B1B4F] flex items-center gap-2">
                <span>Mobile Management & App Studio</span>
                <span className="rounded-full bg-[#DFB755]/20 text-[#0B1B4F] px-2.5 py-0.5 text-xs font-bold border border-[#DFB755]/50">
                  Live View
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize mobile storefront sections, add new mobile pages & designs, and test in the live interactive smartphone preview.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Mobile Enable Toggle */}
          <label className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={mobileState.enabled !== false}
              onChange={(e) =>
                setMobileState((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="h-4 w-4 rounded text-[#0B1B4F] focus:ring-[#0B1B4F]"
            />
            <span className="text-xs font-bold text-[#0B1B4F]">
              {mobileState.enabled !== false ? "Artisanal Mobile Active" : "Mobile View Disabled"}
            </span>
          </label>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0B1B4F] text-[#DFB755] hover:bg-[#1a2d6d] font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0"
          >
            {saving ? "Saving Changes..." : "Save Mobile Changes 💾"}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. STUDIO SUB-TABS NAVIGATION
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("sections")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "sections"
              ? "bg-[#0B1B4F] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>📱</span>
          <span>Mobile Sections & Layout</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("pages")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "pages"
              ? "bg-[#0B1B4F] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>📑</span>
          <span>Mobile Pages & Designs ({mobileState.customPages?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("preview")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "preview"
              ? "bg-[#0B1B4F] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>📲</span>
          <span>Live Smartphone Mockup</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 1: MOBILE SECTIONS & CONTENT
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "sections" && (
        <div className="grid gap-5">
          {/* 1. Announcement Bar Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">📢</span>
                <h3 className="font-bold text-sm text-slate-900">Top Announcement Bar</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileState.announcement?.enabled !== false}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      announcement: { ...prev.announcement!, enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded text-[#0B1B4F]"
                />
                <span className="text-xs font-semibold text-slate-600">Enabled</span>
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Message</label>
                <input
                  type="text"
                  value={mobileState.announcement?.text || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      announcement: { ...prev.announcement!, text: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Promo Code (Tap-to-Copy)</label>
                <input
                  type="text"
                  value={mobileState.announcement?.couponCode || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      announcement: { ...prev.announcement!, couponCode: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white uppercase font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* 2. Mobile Hero Banner Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <h3 className="font-bold text-sm text-slate-900">Artisanal Mobile Hero Card</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileState.hero?.enabled !== false}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded text-[#0B1B4F]"
                />
                <span className="text-xs font-semibold text-slate-600">Enabled</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gold Pill Badge</label>
                <input
                  type="text"
                  value={mobileState.hero?.badge || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, badge: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Upper Tag</label>
                <input
                  type="text"
                  value={mobileState.hero?.tag || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, tag: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Featured Sweet Title</label>
                <input
                  type="text"
                  value={mobileState.hero?.title || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, title: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Story / Subtitle</label>
              <textarea
                rows={2}
                value={mobileState.hero?.description || ""}
                onChange={(e) =>
                  setMobileState((prev) => ({
                    ...prev,
                    hero: { ...prev.hero!, description: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price Text</label>
                <input
                  type="text"
                  value={mobileState.hero?.priceText || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, priceText: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold text-amber-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Weight Text</label>
                <input
                  type="text"
                  value={mobileState.hero?.weightText || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, weightText: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={mobileState.hero?.buttonText || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, buttonText: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Button Link</label>
                <input
                  type="text"
                  value={mobileState.hero?.buttonLink || ""}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      hero: { ...prev.hero!, buttonLink: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hero Image Path</label>
              <input
                type="text"
                value={mobileState.hero?.imageUrl || ""}
                onChange={(e) =>
                  setMobileState((prev) => ({
                    ...prev,
                    hero: { ...prev.hero!, imageUrl: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* 3. Popular Items Marquee */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <h3 className="font-bold text-sm text-slate-900">Popular Sweets Horizontal Ticker</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileState.marquee?.enabled !== false}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      marquee: { ...prev.marquee!, enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded text-[#0B1B4F]"
                />
                <span className="text-xs font-semibold text-slate-600">Enabled</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sweets Pills (Comma Separated)
              </label>
              <input
                type="text"
                value={(mobileState.marquee?.items || []).join(", ")}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setMobileState((prev) => ({
                    ...prev,
                    marquee: { ...prev.marquee!, items: arr },
                  }));
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* 4. Best Sellers (2-Column Grid) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">💎</span>
                <h3 className="font-bold text-sm text-slate-900">Signature Best Sellers (2-Column Cards)</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileState.bestsellers?.enabled !== false}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      bestsellers: { ...prev.bestsellers!, enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded text-[#0B1B4F]"
                />
                <span className="text-xs font-semibold text-slate-600">Enabled</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {mobileState.bestsellers?.items?.map((item, idx) => (
                <div key={item.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B1B4F]">Card #{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Badge"
                      value={item.badge || ""}
                      onChange={(e) => {
                        const updated = [...mobileState.bestsellers!.items!];
                        updated[idx].badge = e.target.value;
                        setMobileState((prev) => ({
                          ...prev,
                          bestsellers: { ...prev.bestsellers!, items: updated },
                        }));
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md border border-slate-200 bg-white uppercase w-28"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...mobileState.bestsellers!.items!];
                        updated[idx].name = e.target.value;
                        setMobileState((prev) => ({
                          ...prev,
                          bestsellers: { ...prev.bestsellers!, items: updated },
                        }));
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={item.price}
                      onChange={(e) => {
                        const updated = [...mobileState.bestsellers!.items!];
                        updated[idx].price = Number(e.target.value);
                        setMobileState((prev) => ({
                          ...prev,
                          bestsellers: { ...prev.bestsellers!, items: updated },
                        }));
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Sublabel (e.g. Pure Ghee)"
                      value={item.sublabel || ""}
                      onChange={(e) => {
                        const updated = [...mobileState.bestsellers!.items!];
                        updated[idx].sublabel = e.target.value;
                        setMobileState((prev) => ({
                          ...prev,
                          bestsellers: { ...prev.bestsellers!, items: updated },
                        }));
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Pack (e.g. / 250g)"
                      value={item.weight || ""}
                      onChange={(e) => {
                        const updated = [...mobileState.bestsellers!.items!];
                        updated[idx].weight = e.target.value;
                        setMobileState((prev) => ({
                          ...prev,
                          bestsellers: { ...prev.bestsellers!, items: updated },
                        }));
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Fixed Bottom Navigation Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🧭</span>
                <h3 className="font-bold text-sm text-slate-900">Fixed Bottom Navigation Bar</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileState.bottomNav?.enabled !== false}
                  onChange={(e) =>
                    setMobileState((prev) => ({
                      ...prev,
                      bottomNav: { ...prev.bottomNav!, enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded text-[#0B1B4F]"
                />
                <span className="text-xs font-semibold text-slate-600">Enabled</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-5 gap-2.5">
              {mobileState.bottomNav?.tabs?.map((tab, idx) => (
                <div key={tab.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-center">
                  <span className="text-lg block">
                    {tab.icon === "home" ? "🏠" : tab.icon === "shop" ? "🍬" : tab.icon === "gifting" ? "🎁" : tab.icon === "stores" ? "🏬" : "🛍️"}
                  </span>
                  <input
                    type="text"
                    value={tab.label}
                    onChange={(e) => {
                      const updated = [...mobileState.bottomNav!.tabs!];
                      updated[idx].label = e.target.value;
                      setMobileState((prev) => ({
                        ...prev,
                        bottomNav: { ...prev.bottomNav!, tabs: updated },
                      }));
                    }}
                    className="w-full text-center px-1.5 py-1 text-xs rounded-md border border-slate-200 bg-white font-bold"
                  />
                  <input
                    type="text"
                    value={tab.href}
                    onChange={(e) => {
                      const updated = [...mobileState.bottomNav!.tabs!];
                      updated[idx].href = e.target.value;
                      setMobileState((prev) => ({
                        ...prev,
                        bottomNav: { ...prev.bottomNav!, tabs: updated },
                      }));
                    }}
                    className="w-full text-center px-1 py-0.5 text-[10px] rounded-md border border-slate-200 bg-white text-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 2: MOBILE PAGES & CUSTOM DESIGNS
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "pages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0B1B4F]">All Mobile Pages & Custom Designs</h3>
              <p className="text-xs text-slate-500">
                Create new landing pages and designs tailored for mobile screens. You can assign any design as the default mobile home.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreatePageModal}
              className="px-4 py-2 rounded-xl bg-[#0B1B4F] text-[#DFB755] font-bold text-xs hover:bg-[#1a2d6d] shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>＋</span>
              <span>Create New Mobile Page</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Default System Mobile Design Card */}
            <div className="rounded-2xl border-2 border-[#DFB755] bg-white p-5 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#DFB755]/20 text-[#0B1B4F] border border-[#DFB755]/50">
                    👑 DEFAULT STORE MOBILE HOME
                  </span>
                  <span className="text-xs text-emerald-600 font-bold">● Active</span>
                </div>
                <h4 className="font-bold text-base text-[#0B1B4F]">Artisanal Indian Sweets (Default)</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The primary royal navy & rich gold mobile view with Dubai Chocolate Ladoo hero, categories, and 2-col bestsellers.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">Route: /</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("preview")}
                  className="font-bold text-[#0B1B4F] hover:text-[#DFB755] flex items-center gap-1 cursor-pointer"
                >
                  <span>Preview in Mockup</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Custom Created Mobile Pages */}
            {(mobileState.customPages || []).map((page) => (
              <div
                key={page.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs relative flex flex-col justify-between ${
                  page.isDefaultHome ? "border-2 border-[#0B1B4F]" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        page.isDefaultHome
                          ? "bg-[#0B1B4F] text-[#DFB755]"
                          : page.isActive
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {page.isDefaultHome ? "⭐ DEFAULT HOME" : page.isActive ? "PUBLISHED" : "DRAFT"}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      Theme: {page.designStyle}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-[#0B1B4F]">{page.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {page.description || "Custom mobile showcase"}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={`/m/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      <span>/m/{page.slug}</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditPageModal(page)}
                      className="font-bold text-slate-700 hover:text-[#0B1B4F] cursor-pointer"
                    >
                      Edit
                    </button>
                    {!page.isDefaultHome && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultHome(page.slug)}
                        className="font-bold text-amber-700 hover:text-amber-900 cursor-pointer text-[11px]"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePage(page.id)}
                    className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 3: INTERACTIVE LIVE SMARTPHONE MOCKUP
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "preview" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4 sm:p-8 flex flex-col items-center">
          {/* Device Controls */}
          <div className="mb-6 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-600 mr-1">Device Frame:</span>
            <button
              type="button"
              onClick={() => setDeviceModel("iphone")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                deviceModel === "iphone"
                  ? "bg-[#0B1B4F] text-[#DFB755]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              iPhone 16 Pro (393px)
            </button>
            <button
              type="button"
              onClick={() => setDeviceModel("android")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                deviceModel === "android"
                  ? "bg-[#0B1B4F] text-[#DFB755]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Pixel / Galaxy (412px)
            </button>
            <button
              type="button"
              onClick={() => setDeviceModel("compact")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                deviceModel === "compact"
                  ? "bg-[#0B1B4F] text-[#DFB755]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Compact Mobile (360px)
            </button>
          </div>

          {/* Smartphone Hardware Frame */}
          <div
            className={`relative rounded-[48px] border-[10px] border-slate-900 bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
              deviceModel === "iphone"
                ? "w-[393px] h-[820px]"
                : deviceModel === "android"
                ? "w-[412px] h-[820px]"
                : "w-[360px] h-[780px]"
            }`}
          >
            {/* Dynamic Island / Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-5 w-24 bg-slate-900 rounded-full z-50 pointer-events-none" />

            {/* Mobile App Scrollable Viewport */}
            <div className="h-full w-full overflow-y-auto no-scrollbar pb-16 bg-[#FDFBF7]">
              {/* Announcement Bar */}
              {mobileState.announcement?.enabled !== false && (
                <div className="bg-[#0B1B4F] text-white text-[10px] font-medium py-1.5 px-3 text-center tracking-wide flex items-center justify-center gap-1">
                  <span className="text-[#DFB755]">🚚</span>
                  <span className="truncate">{mobileState.announcement?.text}</span>
                </div>
              )}

              {/* Header */}
              <div className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#0B1B4F]/10 px-3.5 py-2 flex items-center justify-between">
                <span className="text-slate-700 text-base">☰</span>
                <div className="text-center">
                  <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[#0B1B4F] block leading-none">
                    Vardayini
                  </span>
                  <span className="text-[8.5px] uppercase tracking-widest text-[#DFB755] font-bold">
                    Sweet Mart • Est. 1951
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 text-sm">
                  <span>🔍</span>
                  <span className="relative">
                    🛍️
                    <span className="absolute -top-1 -right-1.5 bg-[#DFB755] text-[#0B1B4F] text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                      2
                    </span>
                  </span>
                </div>
              </div>

              {/* Hero Banner */}
              {mobileState.hero?.enabled !== false && (
                <div className="p-3">
                  <div className="relative rounded-2xl bg-[#0B1B4F] min-h-[300px] flex flex-col justify-end p-4 text-white shadow-md border border-[#DFB755]/20 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-50"
                      style={{
                        backgroundImage: `url('${
                          mobileState.hero?.imageUrl || "/images/showcase/dubai-chocolate-ladoo.jpg"
                        }')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B4F] via-[#0B1B4F]/40 to-transparent" />
                    <div className="relative z-10 space-y-1">
                      <span className="bg-[#DFB755]/20 border border-[#DFB755] text-[#DFB755] text-[9.5px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                        👑 {mobileState.hero?.badge}
                      </span>
                      <span className="text-[#DFB755] text-[9px] font-bold uppercase tracking-widest block">
                        {mobileState.hero?.tag}
                      </span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[#FDFBF7]">
                        {mobileState.hero?.title}
                      </h3>
                      <p className="text-slate-200 text-[11px] line-clamp-2 leading-relaxed">
                        {mobileState.hero?.description}
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <span className="bg-[#DFB755] text-[#0B1B4F] font-bold text-[11px] px-3.5 py-1.5 rounded-lg">
                          {mobileState.hero?.buttonText} →
                        </span>
                        <span className="text-sm font-bold text-[#DFB755]">
                          {mobileState.hero?.priceText}{" "}
                          <span className="text-[10px] text-slate-300 font-normal">
                            {mobileState.hero?.weightText}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Marquee */}
              {mobileState.marquee?.enabled !== false && (
                <div className="py-2 border-y border-[#0B1B4F]/10 bg-[#f5f3ef] overflow-x-auto no-scrollbar flex gap-2 px-3">
                  {mobileState.marquee?.items?.map((it, idx) => (
                    <span
                      key={idx}
                      className="shrink-0 bg-white px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-[#0B1B4F] border border-slate-200 flex items-center gap-1"
                    >
                      <span className="text-[#DFB755]">★</span>
                      <span>{it}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Categories */}
              {mobileState.categories?.enabled !== false && (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-[family-name:var(--font-display)] font-bold text-sm text-[#0B1B4F]">
                      {mobileState.categories?.title}
                    </span>
                    <span className="text-[10px] font-bold text-[#DFB755]">View All</span>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {mobileState.categories?.items?.map((cat) => (
                      <div key={cat.id} className="flex flex-col items-center shrink-0">
                        <div
                          className="h-14 w-14 rounded-full border-2 border-[#DFB755]/50 bg-cover bg-center shadow-xs"
                          style={{ backgroundImage: `url('${cat.imageUrl}')` }}
                        />
                        <span className="text-[10px] font-bold mt-1 text-[#0B1B4F] truncate max-w-[65px]">
                          {cat.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Sellers Grid */}
              {mobileState.bestsellers?.enabled !== false && (
                <div className="p-3 bg-[#f5f3ef]/50">
                  <span className="text-[9px] font-bold uppercase text-[#DFB755] block">
                    {mobileState.bestsellers?.tag}
                  </span>
                  <span className="font-[family-name:var(--font-display)] font-bold text-sm text-[#0B1B4F] block mb-2">
                    {mobileState.bestsellers?.title}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileState.bestsellers?.items?.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl p-2 border border-slate-200 text-left">
                        <div
                          className="h-24 rounded-lg bg-cover bg-center mb-1.5"
                          style={{ backgroundImage: `url('${item.imageUrl}')` }}
                        />
                        <span className="font-bold text-[11px] text-[#0B1B4F] truncate block">
                          {item.name}
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] font-bold text-[#0B1B4F]">
                            ₹{item.price}
                          </span>
                          <span className="h-5 w-5 rounded bg-[#0B1B4F] text-white flex items-center justify-center text-xs font-bold">
                            ＋
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Heritage Stats */}
              {mobileState.journeyStats?.enabled !== false && (
                <div className="p-4 bg-[#0B1B4F] text-white text-center">
                  <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[#FDFBF7] block">
                    {mobileState.journeyStats?.title}
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {mobileState.journeyStats?.stats?.map((st, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-base font-bold text-[#DFB755] block">{st.value}</span>
                        <span className="text-[8px] text-slate-300 block">{st.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Nav Bar on Frame */}
            {mobileState.bottomNav?.enabled !== false && (
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 flex items-center justify-around py-2 px-1 z-40">
                <span className="text-center text-[9px] font-bold text-[#0B1B4F]">
                  🏠<br />Home
                </span>
                <span className="text-center text-[9px] font-medium text-slate-500">
                  🍬<br />Shop
                </span>
                <span className="text-center text-[9px] font-medium text-slate-500">
                  🎁<br />Gifting
                </span>
                <span className="text-center text-[9px] font-medium text-slate-500">
                  🏬<br />Stores
                </span>
                <span className="text-center text-[9px] font-medium text-slate-500">
                  🛍️<br />Cart
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CREATE / EDIT CUSTOM MOBILE PAGE MODAL
         ───────────────────────────────────────────────────────────── */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-[#0B1B4F]">
                {editingPageId ? "Edit Mobile Page Design" : "Create New Mobile Page / Design"}
              </h3>
              <button
                type="button"
                onClick={() => setShowPageModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePageModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Sweets & Dry Fruits Festival"
                  value={modalPageForm.title || ""}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    setModalPageForm((prev) => ({
                      ...prev,
                      title,
                      slug: prev.slug ? prev.slug : autoSlug,
                    }));
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0B1B4F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug *</label>
                  <div className="flex items-center">
                    <span className="text-xs text-slate-400 pl-2">/m/</span>
                    <input
                      type="text"
                      required
                      placeholder="diwali-special"
                      value={modalPageForm.slug || ""}
                      onChange={(e) =>
                        setModalPageForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0B1B4F] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Design Style</label>
                  <select
                    value={modalPageForm.designStyle || "artisanal-navy"}
                    onChange={(e) =>
                      setModalPageForm((prev) => ({
                        ...prev,
                        designStyle: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0B1B4F]"
                  >
                    <option value="artisanal-navy">Artisanal Royal Navy (#0B1B4F)</option>
                    <option value="warm-cream">Warm Cream Heritage (#FDFBF7)</option>
                    <option value="gold-luxury">Rich Festive Gold (#DFB755)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Heading</label>
                <input
                  type="text"
                  placeholder="e.g. Pure Desi Ghee Diwali Masterpieces"
                  value={modalPageForm.heroHeading || ""}
                  onChange={(e) =>
                    setModalPageForm((prev) => ({ ...prev, heroHeading: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Subheading / Story</label>
                <textarea
                  rows={2}
                  placeholder="Slow-roasted cashew fudge, saffron pedas, and vacuum-sealed hampers."
                  value={modalPageForm.heroSubheading || ""}
                  onChange={(e) =>
                    setModalPageForm((prev) => ({ ...prev, heroSubheading: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Banner Image URL</label>
                <input
                  type="text"
                  placeholder="/images/showcase/dubai-chocolate-ladoo.jpg"
                  value={modalPageForm.bannerImageUrl || ""}
                  onChange={(e) =>
                    setModalPageForm((prev) => ({ ...prev, bannerImageUrl: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalPageForm.isDefaultHome || false}
                    onChange={(e) =>
                      setModalPageForm((prev) => ({ ...prev, isDefaultHome: e.target.checked }))
                    }
                    className="h-4 w-4 rounded text-[#0B1B4F]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Set as Default Mobile Home
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalPageForm.isActive !== false}
                    onChange={(e) =>
                      setModalPageForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-800">Published / Active</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPageModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B1B4F] text-[#DFB755] text-xs font-bold hover:bg-[#1a2d6d] shadow-sm cursor-pointer"
                >
                  {editingPageId ? "Update Page" : "Create & Add Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
