"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { CategoryItem, ProductItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";
import { TablePagination } from "./table-pagination";

interface CategoriesTabProps {
  categories: CategoryItem[];
  products: ProductItem[];
  onRefresh: () => void;
  onSelectCategoryFilter?: (slug: string) => void;
}

export function CategoriesTab({
  categories,
  products,
  onRefresh,
  onSelectCategoryFilter,
}: CategoriesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"order" | "name" | "products">("order");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("/images/kaju-katli.jpg");
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Delete Confirmation State
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to open Add Modal
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("/images/kaju-katli.jpg");
    setSortOrder(categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder || 0)) + 1 : 1);
    setIsModalOpen(true);
  };

  // Helper to open Edit Modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setImageUrl(cat.imageUrl || "/images/kaju-katli.jpg");
    setSortOrder(cat.sortOrder ?? 0);
    setIsModalOpen(true);
  };

  // Slug auto-generation on name change (if user hasn't explicitly customized slug)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generatedSlug);
    }
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.updateCategory({
          id: editingCategory.id,
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          sortOrder: Number(sortOrder) || 0,
        });
        toast.success(`Category "${name}" updated successfully!`);
      } else {
        await api.createCategory({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          sortOrder: Number(sortOrder) || 0,
        });
        toast.success(`Category "${name}" created successfully!`);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category Handler
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCategory(categoryToDelete.id);
      toast.success(`Category "${categoryToDelete.name}" deleted`);
      setCategoryToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Enrich with live product counts if not already present
  const enrichedCategories = categories.map((cat) => {
    const directCount = cat.productCount;
    if (typeof directCount === "number" && directCount > 0) return cat;
    const computedCount = products.filter(
      (p) => p.categoryId === cat.id || p.categoryName?.toLowerCase() === cat.name?.toLowerCase()
    ).length;
    return { ...cat, productCount: computedCount };
  });

  // Filtered and Sorted list
  const filteredCategories = enrichedCategories
    .filter((cat) => {
      const q = searchQuery.toLowerCase();
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "order") return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "products") return (b.productCount ?? 0) - (a.productCount ?? 0);
      return 0;
    });

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  // Total products across all categories
  const totalAssignedProducts = enrichedCategories.reduce((acc, c) => acc + (c.productCount ?? 0), 0);
  const topCategory = [...enrichedCategories].sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0b2f8a] via-[#123eab] to-[#071c54] p-6 lg:p-8 text-white shadow-xl shadow-[#0b2f8a]/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#dfb755]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#dfb755]/20 text-[#dfb755] border border-[#dfb755]/30">
                Catalog Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Storefront Synchronized
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Category Management
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-xl">
              Organize pure desi ghee mithai, handcrafted farsan, seasonal dry fruits, and festive hampers into structured storefront departments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#dfb755] to-[#b89130] text-[#0b2f8a] font-bold text-sm shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <span className="text-lg leading-none">➕</span>
              <span>Add New Category</span>
            </button>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20 transition cursor-pointer"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Categories</p>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0b2f8a] flex items-center justify-center text-sm font-bold">
              📁
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#182230]">{categories.length}</p>
          <p className="mt-1 text-xs text-slate-500">Storefront collection pill hubs</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Products Cataloged</p>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
              🍬
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#182230]">{totalAssignedProducts || products.length}</p>
          <p className="mt-1 text-xs text-slate-500">SKUs classified under categories</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top Performing</p>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
              🏆
            </span>
          </div>
          <p className="mt-2 text-lg font-bold text-[#182230] truncate">{topCategory?.name || "Kaju Sweets"}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">
            {topCategory?.productCount || 0} product variants assigned
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Department Sync</p>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold">
              ✨
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">100%</p>
          <p className="mt-1 text-xs text-slate-500">All live on `/shop` navigation</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search category name, slug or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/20 focus:border-[#0b2f8a]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "order" | "name" | "products")}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#182230] focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/20 bg-white"
            >
              <option value="order">Display Order (Asc)</option>
              <option value="name">Name (A-Z)</option>
              <option value="products">Product Count (High to Low)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
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

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "grid" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "table" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">📁</span>
          <h3 className="mt-3 text-lg font-bold text-slate-800">No categories found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery ? `No category matches "${searchQuery}"` : "Get started by creating your first category."}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b2f8a] text-white font-semibold text-xs shadow-md hover:bg-[#082266] transition cursor-pointer"
          >
            <span>➕</span>
            <span>Add Category</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs hover:shadow-md transition group flex flex-col justify-between"
            >
              <div>
                {/* Category Header Image */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src={cat.imageUrl || "/images/kaju-katli.jpg"}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Sort Order Badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/50 text-[#dfb755] backdrop-blur-md border border-[#dfb755]/30">
                    Order #{cat.sortOrder ?? 0}
                  </span>

                  {/* Product Count Pill */}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0b2f8a] text-white shadow-md">
                    {cat.productCount ?? 0} {cat.productCount === 1 ? "Item" : "Items"}
                  </span>

                  {/* Title on image overlay */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-white drop-shadow-sm">
                      {cat.name}
                    </h3>
                    <code className="text-[11px] text-[#dfb755] font-mono tracking-tight">
                      /{cat.slug}
                    </code>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-2">
                  <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                    {cat.description || "Fresh and authentic sweets crafted with pure ingredients."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                <button
                  onClick={() => onSelectCategoryFilter?.(cat.slug)}
                  className="text-xs font-semibold text-[#0b2f8a] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Products</span>
                  <span>→</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(cat)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Products</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#182230]">
                {paginatedCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 text-xs">
                      #{cat.sortOrder ?? 0}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <Image
                            src={cat.imageUrl || "/images/kaju-katli.jpg"}
                            alt={cat.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <span className="font-bold text-[#0b2f8a]">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                        {cat.slug}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#dfb755]/15 text-[#8d6715] border border-[#dfb755]/30">
                        {cat.productCount ?? 0} Products
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setCategoryToDelete(cat)}
                          className="px-3 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Length & Pagination Footer */}
          <TablePagination
            totalItems={filteredCategories.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemName="categories"
          />
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b89130]">
                  {editingCategory ? "Edit Category Details" : "New Collection"}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
                  {editingCategory ? `Update "${editingCategory.name}"` : "Create Category"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#182230] font-semibold mb-1">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kaju Sweets, Namkeen"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#182230] font-semibold mb-1">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kaju-sweets"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Used in URLs: `/shop?category={slug || "slug"}`</p>
                </div>
              </div>

              <div>
                <label className="block text-[#182230] font-semibold mb-1">Sort Order / Priority</label>
                <input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full sm:w-40 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-400">Controls order of tabs on the home & shop pages (lower numbers appear first).</p>
              </div>

              <div>
                <label className="block text-[#182230] font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Royal cashew diamond sweets handcrafted with pure shuddh ghee."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                />
              </div>

              {/* Image Picker Field Integration */}
              <ImagePickerField
                label="Category Showcase Photo"
                value={imageUrl}
                onChange={(newUrl) => setImageUrl(newUrl)}
                helperText="Select from gallery presets, upload a fresh image, or enter an image URL."
              />

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-3">
              ⚠️
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-center text-[#182230]">
              Delete &quot;{categoryToDelete.name}&quot;?
            </h3>
            <p className="mt-2 text-xs text-slate-500 text-center">
              Are you sure you want to remove this category from the storefront?
              {(categoryToDelete.productCount ?? 0) > 0 && (
                <span className="block mt-2 font-bold text-rose-600">
                  ⚠️ Note: {categoryToDelete.productCount} products are currently classified under this category.
                  They must be reassigned before this category can be removed.
                </span>
              )}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
