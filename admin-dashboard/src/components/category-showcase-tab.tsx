"use client";

import { useState } from "react";
import Image from "next/image";
import { UiConfig, BrowseByCategoryConfig, BrowseByCategoryCard, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface CategoryShowcaseTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

const DEFAULT_CARDS: BrowseByCategoryCard[] = [
  {
    id: "ghee-sweets",
    title: "SIGNATURE GHEE SWEETS",
    itemCount: "18 Items",
    imageUrl: "/images/motichoor.jpg",
    href: "/shop?group=sweets",
    active: true,
  },
  {
    id: "dry-fruit-specials",
    title: "DRY FRUIT SPECIALS",
    itemCount: "12 Items",
    imageUrl: "/images/kaju-katli.jpg",
    href: "/shop?category=kaju-sweets",
    active: true,
  },
  {
    id: "festival-gift-boxes",
    title: "FESTIVAL GIFT BOXES",
    itemCount: "15 Options",
    imageUrl: "/images/hamper.jpg",
    href: "/shop?category=gift-hampers",
    active: true,
  },
  {
    id: "namkeen-snacks",
    title: "NAMKEEN & SNACKS",
    itemCount: "24 Items",
    imageUrl: "/images/khaman-showcase.jpg",
    href: "/shop?group=namkeen",
    active: true,
  },
];

export function CategoryShowcaseTab({ config, onRefresh }: CategoryShowcaseTabProps) {
  const currentCfg = config?.browseByCategory || {};
  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
  const [badge, setBadge] = useState(currentCfg.badge || "Authentic Traditional Categories");
  const [title, setTitle] = useState(currentCfg.title || "Browse By Category");
  const [subtitle, setSubtitle] = useState(
    currentCfg.subtitle || "Select from our freshly rolled sweets and steaming hot snacks"
  );
  const [linkText, setLinkText] = useState(currentCfg.linkText || "View Full Menu");
  const [linkUrl, setLinkUrl] = useState(currentCfg.linkUrl || "/shop");
  const [cards, setCards] = useState<BrowseByCategoryCard[]>(
    currentCfg.cards && currentCfg.cards.length > 0 ? currentCfg.cards : DEFAULT_CARDS
  );

  const [saving, setSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<BrowseByCategoryCard | null>(null);

  function handleCardChange(id: string, field: keyof BrowseByCategoryCard, value: any) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function handleToggleCard(id: string) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: c.active === false ? true : false } : c))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateUiConfig({
        browseByCategory: {
          enabled,
          badge,
          title,
          subtitle,
          linkText,
          linkUrl,
          cards,
        },
      });
      toast.success("Browse By Category section updated successfully on customer storefront!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category section.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#dfb755]/20 text-[#b89130] text-xs font-bold uppercase tracking-wider">
            Homepage 2x2 Showcase
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0b2f8a] mt-2">
            Browse By Category Management
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6d82] mt-1 max-w-xl">
            Control the high-impact 2x2 photo grid displayed on the homepage. Change titles, product counts, photos, and destinations in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded text-[#0b2f8a] focus:ring-0 w-4 h-4"
            />
            <span>Section Enabled</span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold rounded-xl px-5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section Header Controls */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0b2f8a]">
            Section Title &amp; Description
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Top Eyebrow Badge
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Authentic Traditional Categories"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Heading
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Browse By Category"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtitle Description
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. Select from our freshly rolled sweets and steaming hot snacks"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Header Action Button Text
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. View Full Menu"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Header Action URL
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                placeholder="e.g. /shop"
              />
            </div>
          </div>
        </div>

        {/* 4 Cards Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0b2f8a]">
              4 Category Cards (2x2 Grid)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              4 cards active on desktop &amp; mobile
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className={`p-4 rounded-2xl border transition-all ${
                  card.active !== false
                    ? "border-slate-200 bg-white shadow-xs"
                    : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#0b2f8a] bg-[#0b2f8a]/5 px-2.5 py-0.5 rounded-full">
                    Card #{idx + 1}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={card.active !== false}
                      onChange={() => handleToggleCard(card.id)}
                      className="rounded text-[#0b2f8a] w-3.5 h-3.5"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Title (Uppercase Serif)
                    </label>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => handleCardChange(card.id, "title", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Item Count Subtitle
                      </label>
                      <input
                        type="text"
                        value={card.itemCount}
                        onChange={(e) => handleCardChange(card.id, "itemCount", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Destination Link (URL)
                      </label>
                      <input
                        type="text"
                        value={card.href}
                        onChange={(e) => handleCardChange(card.id, "href", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Image Path or URL
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={card.imageUrl}
                        onChange={(e) => handleCardChange(card.id, "imageUrl", e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0b2f8a]"
                      />
                      <div className="relative w-10 h-8 rounded-md overflow-hidden border border-slate-300 bg-slate-100 shrink-0">
                        <Image
                          src={card.imageUrl}
                          alt={card.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Visual Preview */}
        <div className="bg-[#faf6ee] rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#b45309]">
              Live Storefront Preview
            </span>
            <span className="text-[11px] text-slate-500">
              Interactive 2x2 Cards Grid
            </span>
          </div>

          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#b45309]">
                  {badge}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#24142e]">
                  {title}
                </h3>
                <p className="text-xs text-slate-600">{subtitle}</p>
              </div>
              <span className="text-xs font-bold text-[#3b1e54] flex items-center gap-1">
                {linkText} →
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {cards
                .filter((c) => c.active !== false)
                .map((card) => (
                  <div
                    key={card.id}
                    className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-sm bg-black"
                  >
                    <Image
                      src={card.imageUrl}
                      alt={card.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-left">
                      <h4 className="font-serif text-sm sm:text-base font-bold uppercase tracking-wide text-white leading-tight">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-white/80 mt-0.5">{card.itemCount}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold rounded-xl px-8 py-3 text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Browse By Category Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

