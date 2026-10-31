"use client";

import { useState } from "react";
import { UiConfig, NewLaunchPageConfig, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface NewLaunchTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

const DEFAULT_TICKERS = [
  "Handcrafted with 100% Shuddh Gir Cow Desi Ghee",
  "Adorned with Pure Edible 24K Silver Leaf & Iranian Saffron",
  "Fresh Morning Batches Direct for Mandvi & Alkapuri Customers",
  "Zero Artificial Essence · 100% Wholesome Authentic Purity",
  "Vacuum Sealed & Delivered Fresh Across Gujarat & India",
];

export function NewLaunchTab({ config, onRefresh }: NewLaunchTabProps) {
  const currentCfg = config?.newLaunchPage || {};
  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
  const [badge, setBadge] = useState(currentCfg.badge || "NEW 2026 COLLECTION");
  const [title, setTitle] = useState(
    currentCfg.title || "Newly Launched Royal Sweets & Snacks"
  );
  const [subtitle, setSubtitle] = useState(
    currentCfg.subtitle ||
      "Handcrafted dawn batches celebrating modern tastes with three generations of pure desi ghee heritage."
  );
  const [tickerTexts, setTickerTexts] = useState<string[]>(
    currentCfg.tickerTexts && currentCfg.tickerTexts.length > 0
      ? currentCfg.tickerTexts
      : DEFAULT_TICKERS
  );

  const [newTicker, setNewTicker] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateUiConfig({
        newLaunchPage: {
          enabled,
          badge,
          title,
          subtitle,
          tickerTexts,
        },
      });
      toast.success("New Launches page configuration updated successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save New Launches page settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider">
            Page Management: /new-products
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            New Launches Page Controls
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6d82] mt-1 max-w-xl">
            Control the hero branding, rotating text tickers, and headlines on the New Launches collection page (`/new-products`, `/new-launches`, `/launch`).
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Page Hero Headings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Top Eyebrow Badge
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-600"
                placeholder="e.g. NEW 2026 COLLECTION"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-600"
                placeholder="e.g. Newly Launched Royal Sweets & Snacks"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtitle Description
              </label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Animated Text Loop Tickers */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Animated Craftsmanship Messages (Rotating Text Loop)
          </h3>
          <p className="text-xs text-slate-500">
            These lines rotate continuously across the hero marquee on the new launch page.
          </p>

          <div className="space-y-2.5">
            {tickerTexts.map((text, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 w-5 text-right">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => handleTickerChange(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteTicker(idx)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1"
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
              placeholder="Add another craftsmanship slogan..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-purple-600"
            />
            <button
              type="button"
              onClick={handleAddTicker}
              className="px-4 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition"
            >
              + Add Line
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold rounded-xl px-8 py-3 text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save New Launches Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}

