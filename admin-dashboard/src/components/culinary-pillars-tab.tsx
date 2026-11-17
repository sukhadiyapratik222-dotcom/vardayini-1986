"use client";

import { useState, useEffect } from "react";
import { UiConfig, CulinaryPillarsConfig, CulinaryPillarItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface CulinaryPillarsTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
  isReadOnly?: boolean;
}

const DEFAULT_PILLARS: CulinaryPillarItem[] = [
  {
    id: "quality",
    title: "Quality Assurance",
    description: "Every single batch of Mohanthal, Kaju Katli, and Mawa Pedas undergoes rigorous quality inspection at our Kalol flagship kitchen.",
    icon: "quality",
  },
  {
    id: "purity",
    title: "Purity In Every Bite",
    description: "Handcrafted exclusively with 100% Shuddh Desi Ghee sourced from trusted dairy partners. Absolutely zero dalda or palm oil.",
    icon: "purity",
  },
  {
    id: "authenticity",
    title: "Crafting Authenticity",
    description: "Over 75 years of traditional halwai techniques preserved across three generations. Slow roasted over gentle flames for authentic texture.",
    icon: "authenticity",
  },
];

export function CulinaryPillarsTab({ config, onRefresh, isReadOnly = false }: CulinaryPillarsTabProps) {
  const current = config?.culinaryPillars || {};

  const [enabled, setEnabled] = useState(current.enabled !== false);
  const [badge, setBadge] = useState(current.badge || "AUTHENTIC HERITAGE & KARIGARI");
  const [title, setTitle] = useState(current.title || "Elevating The Mithai Experience");
  const [pillars, setPillars] = useState<CulinaryPillarItem[]>(
    current.pillars && current.pillars.length > 0 ? current.pillars : DEFAULT_PILLARS
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config?.culinaryPillars) {
      setEnabled(config.culinaryPillars.enabled !== false);
      if (config.culinaryPillars.badge) setBadge(config.culinaryPillars.badge);
      if (config.culinaryPillars.title) setTitle(config.culinaryPillars.title);
      if (config.culinaryPillars.pillars && config.culinaryPillars.pillars.length > 0) {
        setPillars(config.culinaryPillars.pillars);
      }
    }
  }, [config]);

  const handlePillarChange = (index: number, field: "title" | "description", value: string) => {
    setPillars((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      const payload: CulinaryPillarsConfig = {
        enabled,
        badge: badge.trim(),
        title: title.trim(),
        pillars,
      };
      await api.updateUiConfig({ culinaryPillars: payload });
      toast.success("Culinary Experience Pillars updated and synced with storefront!");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update Culinary Pillars");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEnabled(true);
    setBadge("AUTHENTIC HERITAGE & KARIGARI");
    setTitle("Elevating The Mithai Experience");
    setPillars(DEFAULT_PILLARS);
    toast.info("Reset to default culinary pillars. Click 'Save Changes' to apply.");
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-amber-300/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800">
              🏛️
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#6b1d1d]">
                Culinary Experience Pillars
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Manage the 3 Traditional Quality &amp; Heritage Medallions displayed on your homepage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={isReadOnly}
                className="h-4 w-4 rounded text-[#0b2f8a] focus:ring-[#0b2f8a]"
              />
              <span className="text-xs font-bold text-slate-800">
                {enabled ? "🟢 Section Active on Homepage" : "⏸️ Section Hidden"}
              </span>
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section Heading & Subtitle */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#0b2f8a] flex items-center gap-2">
            <span>🏷️</span> Section Title &amp; Badge
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Top Golden Badge
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. AUTHENTIC HERITAGE & KARIGARI"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-[#0b2f8a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Section Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. Elevating The Mithai Experience"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-[#0b2f8a] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3 Pillars Editor */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0b2f8a] flex items-center gap-2">
              <span>🏅</span> 3 Quality Assurance Pillars
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">3 Medallions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pillars.map((pillar, idx) => (
              <div
                key={pillar.id || idx}
                className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                    {pillar.id}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pillar Title
                  </label>
                  <input
                    type="text"
                    value={pillar.title}
                    onChange={(e) => handlePillarChange(idx, "title", e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-[#0b2f8a] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={pillar.description}
                    onChange={(e) => handlePillarChange(idx, "description", e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 leading-relaxed focus:border-[#0b2f8a] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        {!isReadOnly && (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Reset to Defaults
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#0b2f8a] hover:bg-[#071c54] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span>{isSaving ? "Syncing..." : "Save & Sync with Storefront ✓"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
