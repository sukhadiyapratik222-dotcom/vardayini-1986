"use client";

import { useState, useMemo } from "react";
import { ProductItem, InventoryItem, CategoryItem, UiConfig, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";
import { TablePagination } from "./table-pagination";

interface ProductsTabProps {
  products: ProductItem[];
  inventory: { variants: InventoryItem[]; lowStock: InventoryItem[] };
  categories?: CategoryItem[];
  config?: UiConfig | null;
  onRefresh: () => void;
}

export const CATEGORY_GROUPS = [
  {
    group: "Sweets",
    icon: "🍬",
    badgeColor: "bg-[#dfb755]/15 text-[#8d6715] border-[#dfb755]/30",
    items: [
      { id: 7, name: "Kaju Sweets" },
      { id: 8, name: "Mawa Sweets" },
      { id: 9, name: "Penda" },
      { id: 10, name: "Sugarless Sweets" },
      { id: 11, name: "Premium Packed Sweets" },
      { id: 12, name: "Indian Ghee Sweets" },
    ],
  },
  {
    group: "Namkeen",
    icon: "🥨",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    items: [
      { id: 13, name: "Millet" },
      { id: 14, name: "Farali" },
      { id: 15, name: "Gujarati" },
      { id: 16, name: "Khakhra" },
      { id: 17, name: "Roasted" },
      { id: 18, name: "Mixture" },
      { id: 19, name: "Indian" },
      { id: 20, name: "Daal/Lentil" },
      { id: 21, name: "Sev" },
      { id: 22, name: "Chips and Puris" },
    ],
  },
  {
    group: "Bakery",
    icon: "🍞",
    badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
    items: [
      { id: 23, name: "Biscuits and Cookies" },
      { id: 24, name: "Toast and Khari" },
    ],
  },
];

export function ProductsTab({ products, inventory, categories = [], config, onRefresh }: ProductsTabProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // New product form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(7);
  const [newWeight, setNewWeight] = useState("500g");
  const [newPrice, setNewPrice] = useState(350);
  const [newStock, setNewStock] = useState(50);
  const [newImageUrl, setNewImageUrl] = useState("/images/kaju-katli-showcase.jpg");
  const [newDesc, setNewDesc] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Edit product photo modal
  const [photoEditItem, setPhotoEditItem] = useState<ProductItem | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string>("");

  // Helper to find which group a category name belongs to
  const getCategoryGroup = (catName: string) => {
    return CATEGORY_GROUPS.find((g) => g.items.some((i) => i.name === catName));
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      
      // Check department filter
      let matchesDept = true;
      if (departmentFilter !== "all") {
        const grp = getCategoryGroup(p.categoryName);
        matchesDept = grp?.group === departmentFilter;
      }

      const matchesCat = categoryFilter === "all" || p.categoryName === categoryFilter;
      return matchesSearch && matchesDept && matchesCat;
    });
  }, [products, search, departmentFilter, categoryFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleStartEdit = (p: ProductItem) => {
    setEditingId(p.variantId);
    setEditPrice(p.price);
    setEditStock(p.stock);
  };

  const handleSaveEdit = async (variantId: number, productId: number) => {
    setSaving(true);
    try {
      await api.updateProduct({
        variantId,
        productId,
        price: editPrice,
        stock: editStock,
      });
      setEditingId(null);
      const storeShopUrl = `${process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449"}/shop`;
      toast.success("Product price and stock updated successfully!", storeShopUrl);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product. Please check database connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProductPhoto = async (productId: number, imageUrl: string) => {
    setSaving(true);
    try {
      await api.updateProduct({
        productId,
        imageUrl,
      });
      setPhotoEditItem(null);
      const storeShopUrl = `${process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449"}/shop`;
      toast.success("Product photo updated successfully!", storeShopUrl);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product photo.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a product title");
      return;
    }
    setSaving(true);
    try {
      await api.createProduct({
        name: newTitle.trim(),
        categoryId: newCategoryId,
        weight: newWeight,
        price: Number(newPrice),
        stock: Number(newStock),
        imageUrl: newImageUrl,
        description: newDesc,
        isFeatured,
      });
      setShowAddModal(false);
      const createdTitle = newTitle.trim();
      setNewTitle("");
      const storeShopUrl = `${process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449"}/shop`;
      toast.success(`"${createdTitle}" added to catalog!`, storeShopUrl);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create product. Check database connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
            Products & Inventory Catalog
          </h2>
          <p className="text-xs text-[#5e6d82] mt-1">
            Real-time stock control, quick pricing adjustments, and catalogue publishing.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs btn-primary shadow-sm hover:shadow-md transition self-start sm:self-auto"
        >
          + Add New Sweet / Farsan
        </button>
      </div>

      {/* Department Tabs & Search / Filter Bar */}
      <div className="space-y-3">
        {/* Department Cards matching Reference Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* All Departments Card */}
          <button
            type="button"
            onClick={() => {
              setDepartmentFilter("all");
              setCategoryFilter("all");
            }}
            className={`p-3 rounded-2xl border transition flex items-center justify-between text-left ${
              departmentFilter === "all"
                ? "bg-purple-50/80 border-2 border-purple-500 shadow-xs"
                : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition ${
                  departmentFilter === "all"
                    ? "bg-white border-purple-300 text-purple-600"
                    : "bg-white border-slate-200 text-slate-700 shadow-2xs"
                }`}
              >
                <div className="grid grid-cols-2 gap-1 p-0.5">
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${departmentFilter === "all" ? "bg-purple-600" : "bg-emerald-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${departmentFilter === "all" ? "bg-purple-600" : "bg-blue-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${departmentFilter === "all" ? "bg-purple-600" : "bg-amber-500"}`} />
                  <span className={`w-1.5 h-1.5 rounded-[2px] ${departmentFilter === "all" ? "bg-purple-600" : "bg-rose-500"}`} />
                </div>
              </div>
              <span
                className={`text-xs font-bold truncate ${
                  departmentFilter === "all" ? "text-purple-700" : "text-slate-800"
                }`}
              >
                All Items
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
                departmentFilter === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* Department Group Cards: Sweets, Namkeen, Bakery */}
          {CATEGORY_GROUPS.map((grp) => {
            const count = products.filter((p) =>
              grp.items.some((i) => i.name === p.categoryName)
            ).length;
            const isSelected = departmentFilter === grp.group;

            const deptImages: Record<string, string> = {
              Sweets: "/images/kaju-katli-showcase.jpg",
              Namkeen: "/images/khaman-showcase.jpg",
              Bakery: "/images/hamper.jpg",
            };

            return (
              <button
                key={grp.group}
                type="button"
                onClick={() => {
                  setDepartmentFilter(isSelected ? "all" : grp.group);
                  setCategoryFilter("all");
                  setCurrentPage(1);
                }}
                className={`p-3 rounded-2xl border transition flex items-center justify-between text-left ${
                  isSelected
                    ? "bg-purple-50/80 border-2 border-purple-500 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-2xs bg-slate-100">
                    <img
                      src={deptImages[grp.group] || "/images/kaju-katli-showcase.jpg"}
                      alt={grp.group}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className={`text-xs font-bold truncate ${
                      isSelected ? "text-purple-700 font-extrabold" : "text-slate-800"
                    }`}
                  >
                    {grp.group}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by sweet name, farsan, or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl bg-white border border-[#0b2f8a]/15 px-4 py-2.5 text-[#182230] placeholder:text-[#5e6d82]/60 focus:border-[#0b2f8a] outline-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-2xs shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Table Length:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Math.min(50, Number(e.target.value)));
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-[#0b2f8a] outline-none cursor-pointer"
            >
              <option value={10}>10 records</option>
              <option value={25}>25 records</option>
              <option value={50}>50 records (Max)</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl bg-white border border-[#0b2f8a]/15 px-4 py-2.5 text-[#182230] focus:border-[#0b2f8a] outline-none shadow-sm min-w-[220px]"
          >
            <option value="all">All Specific Categories ({filtered.length} shown)</option>
            {CATEGORY_GROUPS.filter(
              (grp) => departmentFilter === "all" || departmentFilter === grp.group
            ).map((grp) => (
              <optgroup key={grp.group} label={`${grp.icon} ${grp.group}`}>
                {grp.items.map((cat) => {
                  const count = products.filter((p) => p.categoryName === cat.name).length;
                  return (
                    <option key={cat.id} value={cat.name}>
                      {cat.name} ({count})
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-white border border-[#0b2f8a]/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#182230]">
            <thead className="bg-[#0b2f8a]/5 text-[11px] uppercase tracking-wider text-[#0b2f8a] font-bold border-b border-[#0b2f8a]/10">
              <tr>
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Weight / SKU</th>
                <th className="py-3.5 px-4">Price (₹)</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Badge</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0b2f8a]/8">
              {paginatedProducts.map((item) => {
                const isEditing = editingId === item.variantId;
                const isLow = item.stock <= 20;

                return (
                  <tr key={`${item.id}-${item.variantId}`} className="hover:bg-[#0b2f8a]/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoEditItem(item);
                            setEditImageUrl(item.imageUrl);
                          }}
                          className="relative h-11 w-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#0b2f8a]/15 group cursor-pointer shadow-xs hover:ring-2 hover:ring-[#0b2f8a]/40 transition"
                          title="Click to change photo / upload file"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                            📷
                          </div>
                        </button>
                        <div>
                          <p className="font-bold text-[#182230] truncate max-w-xs">{item.name}</p>
                          <p className="text-[10px] text-[#5e6d82] font-mono">{item.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {(() => {
                        const grp = getCategoryGroup(item.categoryName);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold w-fit border ${grp?.badgeColor || "bg-[#0b2f8a]/10 text-[#0b2f8a] border-[#0b2f8a]/15"}`}>
                              {item.categoryName}
                            </span>
                            <span className="text-[9px] text-[#5e6d82] flex items-center gap-1 font-medium pl-1">
                              <span>{grp?.icon}</span>
                              <span>{grp?.group || "General"}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[#5e6d82]">
                      {item.weight}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#0b2f8a]">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded bg-white border border-[#0b2f8a] text-[#0b2f8a] outline-none"
                        />
                      ) : (
                        <span>₹{item.price}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded bg-white border border-[#0b2f8a] text-[#182230] outline-none"
                        />
                      ) : (
                        <span
                          className={`font-semibold ${
                            isLow ? "text-rose-600 font-bold" : "text-emerald-700"
                          }`}
                        >
                          {item.stock} {isLow && "⚠️"}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {item.isFeatured && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fbf3db] text-[#b89130] border border-[#dfb755]/30">
                            ★ Featured
                          </span>
                        )}
                        {config?.specialItems?.productIds?.includes(item.productId || item.id) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            ⭐ Special
                          </span>
                        )}
                        {!item.isFeatured && !config?.specialItems?.productIds?.includes(item.productId || item.id) && (
                          <span className="text-[#5e6d82] text-[11px]">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(item.variantId, item.productId || item.id)}
                            disabled={saving}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[11px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoEditItem(item);
                              setEditImageUrl(item.imageUrl);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1"
                            title="Upload or pick new photo"
                          >
                            <span>📷</span>
                            <span>Photo</span>
                          </button>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#0b2f8a] bg-[#0b2f8a]/5 hover:bg-[#0b2f8a]/10 transition"
                          >
                            Edit Price/Stock
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5e6d82]">
                    No mithai or farsan items found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={filtered.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="items"
        />
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#0b2f8a]/15 shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#0b2f8a]/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                Add New Mithai or Farsan Item
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#182230] font-semibold mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Kesar Peda, Fafda Jalebi Combo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#182230] font-semibold mb-1">Category</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(Number(e.target.value))}
                    className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none"
                  >
                    {CATEGORY_GROUPS.map((grp) => (
                      <optgroup key={grp.group} label={`${grp.icon} ${grp.group}`}>
                        {grp.items.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {categories.filter(
                      (c) =>
                        !CATEGORY_GROUPS.some((g) =>
                          g.items.some(
                            (i) => i.id === c.id || i.name.toLowerCase() === c.name.toLowerCase()
                          )
                        )
                    ).length > 0 && (
                      <optgroup label="✨ Other Categories">
                        {categories
                          .filter(
                            (c) =>
                              !CATEGORY_GROUPS.some((g) =>
                                g.items.some(
                                  (i) => i.id === c.id || i.name.toLowerCase() === c.name.toLowerCase()
                                )
                              )
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[#182230] font-semibold mb-1">Weight / Pack</label>
                  <input
                    type="text"
                    placeholder="250g, 500g, 1kg"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#182230] font-semibold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#0b2f8a] outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#182230] font-semibold mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <ImagePickerField
                  label="Product Photo"
                  value={newImageUrl}
                  onChange={(url) => setNewImageUrl(url)}
                  helperText="Choose a file to upload from your computer or pick from the mithai/farsan library."
                  presetFilter="Mithai"
                />
              </div>

              <div>
                <label className="block text-[#182230] font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Traditional recipe prepared with pure cow ghee..."
                  className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#0b2f8a]"
                />
                <label htmlFor="featured-check" className="text-[#182230] font-medium">
                  Feature on Homepage Showcase
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0b2f8a]/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#182230] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl btn-primary font-bold shadow-md"
                >
                  {saving ? "Adding..." : "Add to Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Change Existing Product Photo */}
      {photoEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#0b2f8a]/15 shadow-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-[#0b2f8a] flex items-center gap-2">
                  <span>📷</span> Update Product Photo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                  {photoEditItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoEditItem(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <ImagePickerField
                label="Select Photo or Upload File"
                value={editImageUrl}
                onChange={(url) => setEditImageUrl(url)}
                helperText="Upload a photo from your computer, choose from photos library, or paste image URL."
                presetFilter="Mithai"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPhotoEditItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !editImageUrl}
                onClick={() =>
                  handleUpdateProductPhoto(
                    photoEditItem.productId || photoEditItem.id,
                    editImageUrl
                  )
                }
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-md disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
