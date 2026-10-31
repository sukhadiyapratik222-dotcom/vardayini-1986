"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { UiConfig, ProductItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface SpecialItemsTabProps {
  config: UiConfig | null;
  products: ProductItem[];
  onRefresh: () => void;
}

export function SpecialItemsTab({ config, products, onRefresh }: SpecialItemsTabProps) {
  const initialSpecial = config?.specialItems || {
    enabled: true,
    badge: "Customers' Special Selection",
    title: "Our Special Items",
    subtitle: "Prepared fresh every morning with 100% Shuddh Desi Ghee. Handcrafted Gujarati delicacies.",
    productIds: [1, 2, 4, 6],
    linkText: "See all 24+ items →",
    linkUrl: "/shop",
  };

  const [enabled, setEnabled] = useState(initialSpecial.enabled ?? true);
  const [badge, setBadge] = useState(initialSpecial.badge || "Customers' Special Selection");
  const [title, setTitle] = useState(initialSpecial.title || "Our Special Items");
  const [subtitle, setSubtitle] = useState(
    initialSpecial.subtitle || "Prepared fresh every morning with 100% Shuddh Desi Ghee. Handcrafted Gujarati delicacies."
  );
  const [linkText, setLinkText] = useState(initialSpecial.linkText || "See all 24+ items →");
  const [linkUrl, setLinkUrl] = useState(initialSpecial.linkUrl || "/shop");
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSpecial.productIds || []);

  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalCategory, setModalCategory] = useState("all");

  // Map of unique products by productId (fallback to id)
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

  // Unique product list for modal
  const uniqueProducts = useMemo(() => {
    return Array.from(productMap.values());
  }, [productMap]);

  // Categories list
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    for (const p of uniqueProducts) {
      if (p.categoryName) cats.add(p.categoryName);
    }
    return Array.from(cats);
  }, [uniqueProducts]);

  // Filtered products for modal
  const modalFilteredProducts = useMemo(() => {
    return uniqueProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(modalSearch.toLowerCase());
      const matchesCat = modalCategory === "all" || p.categoryName === modalCategory;
      return matchesSearch && matchesCat;
    });
  }, [uniqueProducts, modalSearch, modalCategory]);

  // Currently selected products in order
  const currentSpecialProducts = useMemo(() => {
    return selectedIds
      .map((id) => productMap.get(id))
      .filter((p): p is ProductItem => p !== undefined);
  }, [selectedIds, productMap]);

  function handleAddProduct(id: number) {
    if (selectedIds.includes(id)) return;
    const next = [...selectedIds, id];
    setSelectedIds(next);
    toast.success("Added product to Special Items");
  }

  function handleRemoveProduct(id: number) {
    const next = selectedIds.filter((item) => item !== id);
    setSelectedIds(next);
    toast.info("Removed product from Special Items");
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...selectedIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSelectedIds(next);
  }

  function handleMoveDown(index: number) {
    if (index >= selectedIds.length - 1) return;
    const next = [...selectedIds];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setSelectedIds(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateUiConfig({
        specialItems: {
          enabled,
          badge,
          title,
          subtitle,
          productIds: selectedIds,
          linkText,
          linkUrl,
        },
      });
      toast.success("✓ Our Special Items updated successfully on storefront!");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update Our Special Items");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0b2f8a] via-[#1a3fa3] to-[#2a4fb8] p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dfb755]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#dfb755]">
            <span>⭐</span>
            <span>Homepage Section Manager</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold tracking-tight">
            Our Special Items
          </h1>
          <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
            Manage the dedicated &quot;Our Special Items&quot; container placed prominently on the storefront homepage directly above &quot;Fresh Daily Specials&quot;. Select, reorder, and curate your top delicacies.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#dfb755] hover:bg-[#b89130] text-[#0b2f8a] font-bold px-6 py-3 text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>💾</span>
            <span>{saving ? "Saving Changes..." : "Save Special Items"}</span>
          </button>
        </div>
      </div>

      {/* Main Settings & Controls */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Container Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-base text-[#182230]">Section Visibility</h2>
                <p className="text-xs text-[#5e6d82]">Show container on homepage</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b2f8a]" />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6d82] mb-1.5">
                  Container Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Our Special Items"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#0b2f8a] focus:outline-none font-medium text-[#182230]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6d82] mb-1.5">
                  Badge Pill Text
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Customers' Special Selection"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#0b2f8a] focus:outline-none text-[#182230]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6d82] mb-1.5">
                  Subtitle Description
                </label>
                <textarea
                  rows={3}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Describe your special selection..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#0b2f8a] focus:outline-none text-[#182230]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6d82] mb-1.5">
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="e.g. See all items →"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b2f8a] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6d82] mb-1.5">
                    Link Destination
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="e.g. /shop"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b2f8a] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-[#0b2f8a] hover:bg-[#082266] text-white font-bold py-3 text-sm shadow-md transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Apply & Save Settings"}
              </button>
            </div>
          </div>

          {/* Quick summary box */}
          <div className="rounded-2xl bg-[#faf7f0] border border-[#dfb755]/30 p-5 space-y-2 text-xs text-[#2a1a12]">
            <p className="font-bold text-[#b89130] flex items-center gap-1.5">
              <span>💡</span> Storefront Layout Positioning
            </p>
            <p className="text-slate-600 leading-relaxed">
              This container renders right <strong>above Fresh Daily Specials</strong> on the storefront homepage. Adding 4 to 8 items creates a full, balanced showcase row.
            </p>
          </div>
        </div>

        {/* Right Column: Selected Products Manager */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-lg text-[#182230] flex items-center gap-2">
                  <span>Selected Special Items</span>
                  <span className="rounded-full bg-[#0b2f8a]/10 px-2.5 py-0.5 text-xs font-bold text-[#0b2f8a]">
                    {selectedIds.length} Products
                  </span>
                </h2>
                <p className="text-xs text-[#5e6d82] mt-0.5">
                  Products appear on the homepage in the exact order shown below. Use the arrows to reorder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-full bg-[#0b2f8a] hover:bg-[#082266] text-white font-bold px-5 py-2.5 text-xs shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <span className="text-sm">+</span>
                <span>Add Product to Specials</span>
              </button>
            </div>

            {/* List of current items */}
            {currentSpecialProducts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
                <div className="text-4xl">🍬</div>
                <div>
                  <h3 className="text-base font-bold text-[#182230]">No Special Items Selected</h3>
                  <p className="text-xs text-[#5e6d82] mt-1 max-w-md mx-auto">
                    Click the &quot;Add Product to Specials&quot; button above to choose products from your store catalog to feature in this container.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="rounded-full bg-[#dfb755] hover:bg-[#b89130] text-[#0b2f8a] font-bold px-6 py-2.5 text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  + Add First Product
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentSpecialProducts.map((p, idx) => {
                  const pid = p.productId || p.id;
                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#fdfcfa] p-3.5 hover:border-[#0b2f8a]/30 transition group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Order pill */}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b2f8a]/10 text-xs font-bold text-[#0b2f8a]">
                          {idx + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                          {p.imageUrl ? (
                            <Image
                              src={p.imageUrl}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl">
                              🍬
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#182230] truncate group-hover:text-[#0b2f8a] transition">
                            {p.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#5e6d82]">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                              {p.categoryName || "General"}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-[#182230]">₹{p.price}</span>
                            <span>•</span>
                            <span className={p.stock > 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                              {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          title="Move Up"
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0b2f8a] flex items-center justify-center text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === currentSpecialProducts.length - 1}
                          title="Move Down"
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0b2f8a] flex items-center justify-center text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(pid)}
                          title="Remove from specials"
                          className="h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-sm font-bold transition cursor-pointer ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-[#faf7f0]">
              <div>
                <h3 className="font-bold text-lg text-[#182230] flex items-center gap-2">
                  <span>⭐ Add Products to Our Special Items</span>
                </h3>
                <p className="text-xs text-[#5e6d82] mt-0.5">
                  Browse and pick items to display in the &quot;Our Special Items&quot; container
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Filters */}
            <div className="border-b border-slate-100 p-4 bg-white space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search by product name or SKU..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-[#0b2f8a] focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                </div>

                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b2f8a] focus:outline-none bg-white font-medium text-slate-700"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-50">
              {modalFilteredProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No matching products found. Try a different search term.
                </div>
              ) : (
                modalFilteredProducts.map((p) => {
                  const pid = p.productId || p.id;
                  const isAdded = selectedIds.includes(pid);

                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between gap-3 pt-2.5 first:pt-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                          {p.imageUrl ? (
                            <Image
                              src={p.imageUrl}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">
                              🍬
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[#182230] truncate">
                            {p.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[#5e6d82] mt-0.5">
                            <span className="font-semibold text-[#0b2f8a]">₹{p.price}</span>
                            <span>•</span>
                            <span className="truncate">{p.categoryName}</span>
                          </div>
                        </div>
                      </div>

                      {isAdded ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(pid)}
                          className="shrink-0 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer flex items-center gap-1 group/btn"
                        >
                          <span className="group-hover/btn:hidden">✓ Added</span>
                          <span className="hidden group-hover/btn:inline">✕ Remove</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddProduct(pid)}
                          className="shrink-0 rounded-full bg-[#0b2f8a] hover:bg-[#082266] text-white px-4 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
              <span className="text-xs text-[#5e6d82]">
                {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full bg-[#0b2f8a] text-white font-bold px-6 py-2 text-xs shadow-sm transition hover:bg-[#082266] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
