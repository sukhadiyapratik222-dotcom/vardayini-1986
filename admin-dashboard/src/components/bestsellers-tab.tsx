"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UiConfig, BestsellerCardItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface BestsellersTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
  currentUser?: any;
  products?: any[];
}

const DEFAULT_BESTSELLERS: BestsellerCardItem[] = [
  {
    id: "bestseller-1",
    name: "ROYAL KAJU KATLI",
    slug: "kaju-katli",
    badge: "#1 BESTSELLER",
    description: "Smooth, melt-in-your-mouth cashew fudge coated with delicate silver leaf.",
    price: 450,
    weight: "500g",
    imageUrl: "/images/kaju-katli.jpg",
    variantId: 2,
    active: true,
  },
  {
    id: "bestseller-2",
    name: "DESI GHEE MOTICHOOR LADDU",
    slug: "motichoor-ladoo",
    badge: "PURE GHEE",
    description: "Fine gram flour pearls fried in pure ghee and infused with aromatic cardamom.",
    price: 380,
    weight: "500g",
    imageUrl: "/images/motichoor.jpg",
    variantId: 14,
    active: true,
  },
  {
    id: "bestseller-3",
    name: "SAFFRON KESAR PEDA",
    slug: "kesar-malai-penda",
    badge: "TOP RATED",
    description: "Traditional condensed milk sweet enriched with premium Kashmiri saffron.",
    price: 420,
    weight: "500g",
    imageUrl: "/images/peda.jpg",
    variantId: 9,
    active: true,
  },
  {
    id: "bestseller-4",
    name: "SPECIAL GULAB JAMUN",
    slug: "gulab-jamun",
    badge: "MOST LOVED",
    description: "Soft, juicy mawa dumplings soaked in fragrant rose and cardamom syrup.",
    price: 320,
    weight: "500g",
    imageUrl: "/images/gulab-jamun.jpg",
    variantId: 5,
    active: true,
  },
];

export function BestsellersTab({ config, onRefresh, currentUser, products }: BestsellersTabProps) {
  const isSuperAdmin = currentUser?.role === "super_admin";
  const currentCfg = config?.bestsellersSection || {};

  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
  const [autoCalculateFromSales, setAutoCalculateFromSales] = useState<boolean>(
    currentCfg.autoCalculateFromSales !== false
  );
  const [badge, setBadge] = useState(currentCfg.badge || "MOST LOVED");
  const [title, setTitle] = useState(currentCfg.title || "CUSTOMER BESTSELLERS");
  const [viewAllText, setViewAllText] = useState(
    currentCfg.viewAllText || "Explore All Kalol Bestsellers"
  );
  const [viewAllUrl, setViewAllUrl] = useState(currentCfg.viewAllUrl || "/shop?tag=best_seller");
  const [items, setItems] = useState<BestsellerCardItem[]>(
    currentCfg.items && currentCfg.items.length > 0 ? currentCfg.items : DEFAULT_BESTSELLERS
  );

  const realSalesRankings: BestsellerCardItem[] = currentCfg.realSalesRankings || [];
  const [saving, setSaving] = useState(false);

  function handleItemChange(id: string, field: keyof BestsellerCardItem, value: any) {
    if (!isSuperAdmin) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function handleToggleItem(id: string) {
    if (!isSuperAdmin) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, active: item.active === false } : item))
    );
  }

  function handleSyncFromRealSales() {
    if (!isSuperAdmin || realSalesRankings.length === 0) return;
    const top4 = realSalesRankings.slice(0, 4);
    setItems(top4);
    toast.success("Synchronized Top 4 Real Selling Products from order data!");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error("Access Denied: Only Super Admin can modify Customer Bestsellers.");
      return;
    }

    setSaving(true);
    try {
      await api.updateUiConfig({
        bestsellersSection: {
          enabled,
          autoCalculateFromSales,
          badge,
          title,
          viewAllText,
          viewAllUrl,
          items,
        },
      });
      toast.success("Customer Bestsellers section updated successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Bestsellers section.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#541e73]/15 text-[#541e73] text-xs font-bold uppercase tracking-wider">
              Homepage Showcase
            </span>
            {isSuperAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-white text-[10px] font-extrabold uppercase shadow-2xs">
                👑 Super Admin Managed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                🔒 Read Only
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#541e73] mt-2">
            Customer Bestsellers (&quot;Most Loved&quot;)
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6d82] mt-1 max-w-xl">
            Displays your top-selling sweets directly from actual customer orders. Only the Super Admin can configure or edit this section.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label
            className={`flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 ${
              isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-75"
            }`}
          >
            <input
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded text-[#541e73] focus:ring-0 w-4 h-4 disabled:opacity-60"
            />
            <span>Section Enabled</span>
          </label>

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-gold rounded-xl px-5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          ) : (
            <div className="bg-slate-100 text-slate-500 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold select-none flex items-center gap-1.5">
              <span>🔒</span>
              <span>Super Admin Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Security & Access Restriction Notice for Non-Super Admins */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-3xl p-6 text-amber-950 flex flex-col sm:flex-row items-start gap-4 shadow-xs">
          <div className="text-3xl select-none shrink-0">🔒</div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-amber-950">
                Super Admin Security &amp; Ownership Policy
              </h3>
              <span className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs">
                Role Policy Lock
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              You are signed in as a standard administrator (<strong>{currentUser?.name || currentUser?.email || "Staff Admin"}</strong>).
              Per store policy (&quot;<em>not i can change but super admin can manage this</em>&quot;), editing this section is reserved exclusively for the <strong>Super Admin</strong>.
            </p>
            <p className="text-[11px] text-amber-800 font-medium">
              ✓ All controls below are in read-only mode. You can inspect live order sales, product rankings, and homepage preview below.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. LIVE STORE SALES RANKING & BESTSELLERS LEADERBOARD
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📈</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#541e73]">
                Live Store Sales Leaderboard (From Order History)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked dynamically by actual units sold and orders placed across all confirmed customer orders.
            </p>
          </div>

          {isSuperAdmin && realSalesRankings.length > 0 && (
            <button
              type="button"
              onClick={handleSyncFromRealSales}
              className="self-start sm:self-auto text-xs font-bold text-[#541e73] hover:text-[#ba5d49] bg-[#541e73]/10 hover:bg-[#541e73]/15 px-3 py-1.5 rounded-xl border border-[#541e73]/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>Sync Top 4 to Manual Curation</span>
            </button>
          )}
        </div>

        {realSalesRankings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No orders sales recorded yet. Once customers place orders, the live ranking will automatically populate here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-center">Total Orders</th>
                  <th className="py-2.5 px-3">Pack &amp; Price</th>
                  <th className="py-2.5 px-3">Assigned Badge</th>
                  <th className="py-2.5 px-3 text-right">Storefront Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {realSalesRankings.map((rank, index) => {
                  const isTop4 = index < 4;
                  return (
                    <tr
                      key={rank.id || index}
                      className={isTop4 ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50"}
                    >
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            index === 0
                              ? "bg-amber-400 text-amber-950 shadow-xs"
                              : index === 1
                              ? "bg-slate-300 text-slate-800"
                              : index === 2
                              ? "bg-amber-600 text-white"
                              : isTop4
                              ? "bg-purple-100 text-purple-900"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Image
                              src={rank.imageUrl || "/images/kaju-katli.jpg"}
                              alt={rank.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/shop/${rank.slug}`}
                              target="_blank"
                              className="font-bold text-slate-900 hover:text-[#541e73] transition line-clamp-1"
                            >
                              {rank.name}
                            </Link>
                            <span className="text-[10px] text-slate-400 font-normal">
                              slug: {rank.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                          {rank.totalSold ?? 0} units
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {rank.orderCount ?? 0} orders
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        ₹{rank.price} / {rank.weight}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block rounded-full bg-[#871426] text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide">
                          {rank.badge || "BESTSELLER"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isTop4 && autoCalculateFromSales ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live on Store
                          </span>
                        ) : isTop4 ? (
                          <span className="text-[10px] text-slate-500">Top 4 (Manual Active)</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Benchmarked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CALCULATION MODE & SUPER ADMIN CONFIGURATION
         ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Mode Selector Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#541e73] flex items-center gap-2">
              <span>⚙️</span>
              <span>Bestsellers Calculation Algorithm</span>
            </h3>
            <span className="text-[11px] font-bold text-[#b45309] bg-[#b45309]/10 px-2.5 py-0.5 rounded-full">
              Super Admin Policy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label
              className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${
                autoCalculateFromSales
                  ? "border-[#541e73] bg-[#541e73]/5 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="sales_mode"
                  disabled={!isSuperAdmin}
                  checked={autoCalculateFromSales}
                  onChange={() => setAutoCalculateFromSales(true)}
                  className="mt-1 text-[#541e73] focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      ⚡ Dynamic Real Sales Mode
                    </span>
                    <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Storefront automatically queries all customer orders and ranks the top 4 sweets with the highest sales volume in real-time.
                  </p>
                </div>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${
                !autoCalculateFromSales
                  ? "border-[#541e73] bg-[#541e73]/5 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="sales_mode"
                  disabled={!isSuperAdmin}
                  checked={!autoCalculateFromSales}
                  onChange={() => setAutoCalculateFromSales(false)}
                  className="mt-1 text-[#541e73] focus:ring-0"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900">
                    ✏️ Manual Super Admin Curation
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Super Admin explicitly curates, orders, and overrides the 4 sweets, badges, prices, and descriptions shown in the section.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Section Header Controls */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#541e73]">
            Section Title &amp; Badges
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Badge Label (Top Pill)
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. MOST LOVED"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Headline (Uppercase Display Serif)
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. CUSTOMER BESTSELLERS"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bottom Link Text
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={viewAllText}
                onChange={(e) => setViewAllText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. Explore All Kalol Bestsellers"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bottom Link URL
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={viewAllUrl}
                onChange={(e) => setViewAllUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. /shop?tag=best_seller"
              />
            </div>
          </div>
        </div>

        {/* 4 Bestseller Cards (Active in Manual Mode or for Curated Items) */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#541e73]">
                {autoCalculateFromSales
                  ? "Top 4 Sales Items (Preview & Fallback)"
                  : "Manual Curated Bestseller Items (2x2 Cards)"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {autoCalculateFromSales
                  ? "These 4 products represent your live order leaders shown on the homepage."
                  : "Curate custom products, prices, and badges for each card."}
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium">4 items displayed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.active !== false
                    ? "border-slate-200 bg-white shadow-xs"
                    : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#541e73] bg-[#541e73]/10 px-2.5 py-0.5 rounded-full">
                    Card #{idx + 1}
                  </span>
                  <label
                    className={`flex items-center gap-1.5 text-xs text-slate-600 font-medium ${
                      isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={item.active !== false}
                      onChange={() => handleToggleItem(item.id)}
                      className="rounded text-[#541e73] w-3.5 h-3.5 disabled:opacity-60"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Floating Badge
                      </label>
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={item.badge}
                        onChange={(e) => handleItemChange(item.id, "badge", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="e.g. #1 Bestseller"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Short Description
                    </label>
                    <textarea
                      rows={2}
                      disabled={!isSuperAdmin}
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pack Weight
                      </label>
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={item.weight}
                        onChange={(e) => handleItemChange(item.id, "weight", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="500g"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Product Slug
                      </label>
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={item.slug}
                        onChange={(e) => handleItemChange(item.id, "slug", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="kaju-katli"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={item.imageUrl}
                      onChange={(e) => handleItemChange(item.id, "imageUrl", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#541e73] disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Visual Preview */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-block bg-[#541e73] text-white text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-0.5 rounded-[3px] mb-2">
              {badge}
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#541e73] uppercase">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Storefront Preview: As seen by customers browsing your store
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {items
              .filter((it) => it.active !== false)
              .map((it) => (
                <div
                  key={it.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/10] w-full bg-slate-100">
                    <div className="absolute top-2 left-2 z-10 rounded-full bg-[#871426] text-white text-[10px] font-bold px-2.5 py-0.5 shadow-xs">
                      {it.badge}
                    </div>
                    <Image
                      src={it.imageUrl || "/images/kaju-katli.jpg"}
                      alt={it.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-serif text-sm font-bold text-slate-900 uppercase">
                        {it.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {it.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between">
                      <div className="flex items-baseline gap-1 text-sm font-bold text-slate-900">
                        <span>₹{it.price}</span>
                        <span className="text-[10px] text-slate-500 font-normal">/{it.weight}</span>
                      </div>
                      <span className="rounded-full border border-[#ba5d49] text-[#ba5d49] px-3 py-0.5 text-[10px] font-semibold">
                        Add to Cart
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex justify-end pt-2">
          {isSuperAdmin ? (
            <button
              type="submit"
              disabled={saving}
              className="btn-gold rounded-xl px-8 py-3 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Customer Bestsellers Changes"}
            </button>
          ) : (
            <div className="bg-slate-100 text-slate-500 border border-slate-200 px-6 py-3 rounded-xl text-xs font-bold select-none flex items-center gap-2">
              <span>🔒</span>
              <span>Only Super Admin Can Save Changes</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
