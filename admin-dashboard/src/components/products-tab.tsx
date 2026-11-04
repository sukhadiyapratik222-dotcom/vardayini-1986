"use client";

import { useState, useMemo, useEffect } from "react";
import { ProductItem, InventoryItem, CategoryItem, UiConfig, VariantItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";
import { TablePagination } from "./table-pagination";
import { getPublicStoreUrl } from "@/lib/store-url";

interface ProductsTabProps {
  products: ProductItem[];
  inventory: { variants: InventoryItem[]; lowStock: InventoryItem[] };
  categories?: CategoryItem[];
  config?: UiConfig | null;
  initialStockFilter?: "all" | "out_of_stock" | "low_stock" | "in_stock";
  isReadOnly?: boolean;
  onRefresh: () => void;
}

export function getDepartmentForCategory(categoryNameOrSlug: string): "Sweets" | "Namkeen" | "Bakery" {
  const s = (categoryNameOrSlug || "").toLowerCase();

  // Namkeen keywords & slugs
  if (
    s.includes("namkeen") ||
    s.includes("farsan") ||
    s.includes("snack") ||
    s.includes("gathiya") ||
    s.includes("sev") ||
    s.includes("khakhra") ||
    s.includes("farali") ||
    s.includes("millet") ||
    s.includes("mixture") ||
    s.includes("puri") ||
    s.includes("chips") ||
    s.includes("chivda") ||
    s.includes("daal") ||
    s.includes("lentil") ||
    s.includes("roasted")
  ) {
    return "Namkeen";
  }

  // Bakery keywords & slugs
  if (
    s.includes("bakery") ||
    s.includes("biscuit") ||
    s.includes("cookie") ||
    s.includes("toast") ||
    s.includes("khari") ||
    s.includes("cake") ||
    s.includes("rusk")
  ) {
    return "Bakery";
  }

  // Everything else defaults to Sweets (Kaju, Mawa, Penda, Sugarless, Ghee, Bengali, Dryfruit, Festival Specials, etc.)
  return "Sweets";
}

export const CATEGORY_GROUPS = [
  {
    group: "Sweets",
    icon: "🍬",
    badgeColor: "bg-[#dfb755]/15 text-[#8d6715] border-[#dfb755]/30",
    items: [
      { id: 1, name: "Kaju Sweets" },
      { id: 2, name: "Mawa Sweets" },
      { id: 3, name: "Penda" },
      { id: 4, name: "Sugarless Sweets" },
      { id: 5, name: "Premium Packed Sweets" },
      { id: 6, name: "Indian Ghee Sweets" },
      { id: 7, name: "Dryfruit Sweets" },
      { id: 8, name: "Bengali Sweets" },
      { id: 10, name: "Festival Specials" },
    ],
  },
  {
    group: "Namkeen",
    icon: "🥨",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    items: [
      { id: 9, name: "Traditional Gujarati Snacks" },
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

export const PACK_NAME_PRESETS = [
  "Standard Pack",
  "Family Pack",
  "Premium Pack",
  "Festive Gift Pack",
  "Jumbo Pack",
  "Trial Pack",
];

export const PACK_SIZE_PRESETS = [
  "250g",
  "500g",
  "1 kg",
  "2 kg",
  "200g",
  "400g",
];

// Helper to compute discount % safely
export function calculateDiscount(originalPrice: number, sellingPrice: number): number {
  if (originalPrice > sellingPrice && originalPrice > 0 && sellingPrice >= 0) {
    return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
  }
  return 0;
}

export function ProductsTab({
  products,
  inventory,
  categories = [],
  config,
  initialStockFilter = "all",
  isReadOnly = false,
  onRefresh,
}: ProductsTabProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "out_of_stock" | "low_stock" | "in_stock">(
    initialStockFilter || "all"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialStockFilter) {
      setStockFilter(initialStockFilter);
      setCurrentPage(1);
    }
  }, [initialStockFilter]);

  // Pricing & Pack Sizes Management Modal State
  const [pricingProduct, setPricingProduct] = useState<ProductItem | null>(null);
  const [localVariants, setLocalVariants] = useState<VariantItem[]>([]);
  const [productActive, setProductActive] = useState<boolean>(true);
  const [variantToDelete, setVariantToDelete] = useState<VariantItem | null>(null);

  // New product form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(7);
  const [newImageUrl, setNewImageUrl] = useState("/images/kaju-katli-showcase.jpg");
  const [newDesc, setNewDesc] = useState("");
  const [newSku, setNewSku] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true);

  // Add Product Modal - Multiple Pack Sizes List
  const [newProductPacks, setNewProductPacks] = useState<Array<{
    packName: string;
    weight: string;
    price: number;
    discountedPrice: number | null;
    stock: number;
    isDefault: boolean;
    isActive: boolean;
  }>>([
    {
      packName: "Standard Pack",
      weight: "500g",
      price: 350,
      discountedPrice: 300,
      stock: 50,
      isDefault: true,
      isActive: true,
    },
  ]);

  // Edit product photo modal
  const [photoEditItem, setPhotoEditItem] = useState<ProductItem | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string>("");

  // Delete product state
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addSubmitted, setAddSubmitted] = useState(false);

  // Open Pricing & Pack Size Manager for a specific product
  const handleOpenPricingModal = (product: ProductItem) => {
    setPricingProduct(product);
    setProductActive(product.isActive !== false);

    if (product.variants && product.variants.length > 0) {
      setLocalVariants(
        product.variants.map((v) => ({
          ...v,
          packName: v.packName || "Standard Pack",
          weight: v.weight || "500g",
          price: Number(v.price) || 0,
          discountedPrice: v.discountedPrice !== null && v.discountedPrice !== undefined ? Number(v.discountedPrice) : null,
          stock: Number(v.stock) || 0,
          isDefault: Boolean(v.isDefault),
          isActive: v.isActive !== false,
        }))
      );
    } else {
      setLocalVariants([
        {
          id: product.variantId,
          productId: product.productId || product.id,
          packName: product.packName || "Standard Pack",
          weight: product.weight || "500g",
          sku: product.sku,
          price: Number(product.price) || 350,
          discountedPrice: product.discountedPrice !== null && product.discountedPrice !== undefined ? Number(product.discountedPrice) : null,
          stock: Number(product.stock) || 50,
          isDefault: true,
          isActive: true,
        },
      ]);
    }
  };

  const handleAddNewPackRow = () => {
    const lastVar = localVariants[localVariants.length - 1];
    const defaultPrice = lastVar ? (lastVar.price > 0 ? Math.round(lastVar.price * 1.8) : 350) : 350;
    const defaultDiscounted = lastVar && lastVar.discountedPrice ? Math.round(lastVar.discountedPrice * 1.8) : Math.round(defaultPrice * 0.9);

    setLocalVariants((prev) => [
      ...prev,
      {
        packName: "Family Pack",
        weight: "1 kg",
        price: defaultPrice,
        discountedPrice: defaultDiscounted,
        stock: 50,
        isDefault: prev.length === 0,
        isActive: true,
      },
    ]);
  };

  const handleUpdatePackField = (index: number, field: keyof VariantItem, value: any) => {
    setLocalVariants((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      // If user sets this variant as default, uncheck default on others
      if (field === "isDefault" && value === true) {
        return next.map((row, i) => ({
          ...row,
          isDefault: i === index,
        }));
      }

      next[index] = item;
      return next;
    });
  };

  const handleDeletePackRow = (index: number) => {
    const item = localVariants[index];
    if (localVariants.length <= 1) {
      toast.error("A product must have at least one pack size.");
      return;
    }
    setVariantToDelete(item);
  };

  const confirmDeletePackRow = async () => {
    if (!variantToDelete) return;
    const item = variantToDelete;

    if (item.id) {
      setSaving(true);
      try {
        await api.deleteProductVariant(item.id);
        toast.success(`Pack size (${item.weight}) removed from store.`);
        setLocalVariants((prev) => prev.filter((v) => v.id !== item.id));
        setVariantToDelete(null);
        onRefresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete pack size");
      } finally {
        setSaving(false);
      }
    } else {
      setLocalVariants((prev) => prev.filter((v) => v !== item));
      setVariantToDelete(null);
      toast.success("Pack size row removed.");
    }
  };

  const handleSavePricingAndPacks = async () => {
    if (!pricingProduct) return;

    // Validate pack sizes
    if (localVariants.length === 0) {
      toast.error("Please add at least one pack size for this product.");
      return;
    }

    for (let i = 0; i < localVariants.length; i++) {
      const v = localVariants[i];
      if (!v.weight?.trim()) {
        toast.error(`Pack size ${i + 1}: Please specify a weight (e.g. 500g, 1 kg)`);
        return;
      }
      if (v.price < 0 || isNaN(v.price)) {
        toast.error(`Pack size ${i + 1} (${v.weight}): Original Price (MRP) cannot be negative or invalid`);
        return;
      }
      if (v.discountedPrice !== null && v.discountedPrice !== undefined) {
        if (v.discountedPrice < 0 || isNaN(v.discountedPrice)) {
          toast.error(`Pack size ${i + 1} (${v.weight}): Selling price cannot be negative`);
          return;
        }
        if (v.discountedPrice > v.price) {
          toast.error(`Pack size ${i + 1} (${v.weight}): Selling price (₹${v.discountedPrice}) cannot exceed Original MRP (₹${v.price})`);
          return;
        }
      }
      if (v.stock < 0 || isNaN(v.stock)) {
        toast.error(`Pack size ${i + 1} (${v.weight}): Stock quantity cannot be negative`);
        return;
      }
    }

    // Ensure at least one pack is marked default
    const hasDefault = localVariants.some((v) => v.isDefault);
    const variantsPayload = localVariants.map((v, i) => ({
      ...v,
      isDefault: hasDefault ? Boolean(v.isDefault) : i === 0,
    }));

    setSaving(true);
    try {
      const pId = pricingProduct.productId || pricingProduct.id;
      await api.updateProduct({
        productId: pId,
        isActive: productActive,
        variants: variantsPayload,
      });

      const storeShopUrl = `${getPublicStoreUrl()}/shop`;
      toast.success(`Pricing & pack sizes for "${pricingProduct.name}" updated successfully!`, storeShopUrl);
      setPricingProduct(null);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pricing & pack sizes.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProductStatus = async (item: ProductItem) => {
    const nextStatus = item.isActive === false;
    setSaving(true);
    try {
      const pId = item.productId || item.id;
      await api.updateProduct({
        productId: pId,
        isActive: nextStatus,
      });
      toast.success(`"${item.name}" is now ${nextStatus ? "Active (Visible in store)" : "Inactive (Hidden from store)"}`);
      onRefresh();
    } catch (err) {
      toast.error("Failed to update product status.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (forceArchive = false) => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const pId = productToDelete.productId || productToDelete.id;
      const res = await api.deleteProduct(pId, forceArchive);
      if (res.archived) {
        toast.success(`"${productToDelete.name}" safely archived and hidden from customer store (historical orders preserved).`);
      } else {
        toast.success(`"${productToDelete.name}" permanently deleted.`);
      }
      setProductToDelete(null);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreProduct = async (product: ProductItem) => {
    setSaving(true);
    try {
      const pId = product.productId || product.id;
      await api.unarchiveProduct(pId);
      toast.success(`"${product.name}" restored to store catalog!`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore product");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStockAdjust = async (variantId: number, delta: number) => {
    try {
      await api.updateStock(variantId, undefined, delta > 0 ? "add" : "remove", Math.abs(delta));
      toast.success(`Stock updated (${delta > 0 ? `+${delta}` : delta} units)`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    }
  };

  // Dynamically assemble groups so that ALL categories (from database & products) are properly displayed
  const displayedCategoryGroups = useMemo(() => {
    const categoryMap = new Map<string, { id?: number; name: string }>();

    for (const grp of CATEGORY_GROUPS) {
      for (const item of grp.items) {
        categoryMap.set(item.name.toLowerCase(), { id: item.id, name: item.name });
      }
    }

    for (const c of categories) {
      if (c.name && !categoryMap.has(c.name.toLowerCase())) {
        categoryMap.set(c.name.toLowerCase(), { id: c.id, name: c.name });
      }
    }

    for (const p of products) {
      if (p.categoryName && !categoryMap.has(p.categoryName.toLowerCase())) {
        categoryMap.set(p.categoryName.toLowerCase(), { id: p.categoryId, name: p.categoryName });
      }
    }

    const groups: {
      group: "Sweets" | "Namkeen" | "Bakery";
      icon: string;
      badgeColor: string;
      items: { id?: number; name: string }[];
    }[] = [
      {
        group: "Sweets",
        icon: "🍬",
        badgeColor: "bg-[#dfb755]/15 text-[#8d6715] border-[#dfb755]/30",
        items: [],
      },
      {
        group: "Namkeen",
        icon: "🥨",
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
        items: [],
      },
      {
        group: "Bakery",
        icon: "🍞",
        badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
        items: [],
      },
    ];

    for (const item of categoryMap.values()) {
      const dept = getDepartmentForCategory(item.name);
      const targetGroup = groups.find((g) => g.group === dept);
      if (targetGroup) {
        targetGroup.items.push(item);
      }
    }

    return groups;
  }, [categories, products]);

  const getCategoryGroup = (catName: string) => {
    const dept = getDepartmentForCategory(catName);
    return displayedCategoryGroups.find((g) => g.group === dept);
  };

  // Top Inventory Dashboard Metrics
  const inventoryMetrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isActive !== false && !p.isArchived).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock < 5 && !p.isArchived).length;
    const outOfStock = products.filter((p) => p.stock <= 0 && !p.isArchived).length;
    const archived = products.filter((p) => p.isArchived === true).length;
    return { total, active, lowStock, outOfStock, archived };
  }, [products]);

  // Filter products by search, department, category, stock, and active status
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        (p.variants && p.variants.some((v) => v.packName?.toLowerCase().includes(search.toLowerCase()) || v.weight?.toLowerCase().includes(search.toLowerCase())));

      let matchesDept = true;
      if (departmentFilter !== "all") {
        matchesDept = getDepartmentForCategory(p.categoryName || "") === departmentFilter;
      }

      const matchesCat = categoryFilter === "all" || p.categoryName?.toLowerCase() === categoryFilter.toLowerCase();

      let matchesStock = true;
      if (stockFilter === "out_of_stock") {
        matchesStock = p.stock <= 0;
      } else if (stockFilter === "low_stock") {
        matchesStock = p.stock > 0 && p.stock < 5;
      } else if (stockFilter === "in_stock") {
        matchesStock = p.stock >= 5;
      }

      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = p.isActive !== false && !p.isArchived;
      } else if (statusFilter === "inactive") {
        matchesStatus = p.isActive === false && !p.isArchived;
      } else if (statusFilter === "archived") {
        matchesStatus = p.isArchived === true;
      } else {
        // 'all' shows non-archived by default, unless searched
        if (p.isArchived && !search.trim()) {
          matchesStatus = false;
        }
      }

      return matchesSearch && matchesDept && matchesCat && matchesStock && matchesStatus;
    });
  }, [products, search, departmentFilter, categoryFilter, stockFilter, statusFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleUpdateProductPhoto = async (productId: number, imageUrl: string) => {
    setSaving(true);
    try {
      await api.updateProduct({
        productId,
        imageUrl,
      });
      setPhotoEditItem(null);
      const storeShopUrl = `${getPublicStoreUrl()}/shop`;
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

    if (newProductPacks.length === 0) {
      toast.error("Please add at least one pack size");
      return;
    }

    // Validate packs
    for (let i = 0; i < newProductPacks.length; i++) {
      const p = newProductPacks[i];
      if (!p.weight?.trim()) {
        toast.error(`Pack ${i + 1}: Please enter a weight (e.g. 250g, 500g)`);
        return;
      }
      if (p.price < 0 || isNaN(p.price)) {
        toast.error(`Pack ${i + 1}: MRP must be a positive integer`);
        return;
      }
      if (p.discountedPrice !== null && p.discountedPrice !== undefined) {
        if (p.discountedPrice < 0) {
          toast.error(`Pack ${i + 1}: Selling price cannot be negative`);
          return;
        }
        if (p.discountedPrice > p.price) {
          toast.error(`Pack ${i + 1}: Selling price cannot exceed MRP`);
          return;
        }
      }
      if (p.stock < 0) {
        toast.error(`Pack ${i + 1}: Stock quantity cannot be negative`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.createProduct({
        name: newTitle.trim(),
        categoryId: newCategoryId,
        imageUrl: newImageUrl,
        description: newDesc,
        isFeatured,
        isActive: newIsActive,
        sku: newSku.trim() || undefined,
        variants: newProductPacks,
      } as any);

      setShowAddModal(false);
      const createdTitle = newTitle.trim();
      setNewTitle("");
      setNewSku("");
      setNewProductPacks([
        {
          packName: "Standard Pack",
          weight: "500g",
          price: 350,
          discountedPrice: 300,
          stock: 50,
          isDefault: true,
          isActive: true,
        },
      ]);
      const storeShopUrl = `${getPublicStoreUrl()}/shop`;
      toast.success(`"${createdTitle}" added with ${newProductPacks.length} pack size(s)!`, storeShopUrl);
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
            Products & Pricing Management
          </h2>
          <p className="text-xs text-[#5e6d82] mt-1">
            Manage multiple pack sizes, live MRP and selling prices, automatic discount calculations, and real-time inventory.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs btn-primary shadow-sm hover:shadow-md transition self-start sm:self-auto cursor-pointer"
          >
            + Add New Sweet / Farsan
          </button>
        )}
      </div>

      {/* 5. Inventory Dashboard Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Products */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setStockFilter("all");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === "all" && stockFilter === "all"
              ? "bg-[#0b2f8a]/5 border-[#0b2f8a] ring-2 ring-[#0b2f8a]/20 shadow-xs"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Products</span>
            <span className="text-base">📦</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#0b2f8a] mt-1 font-mono">
            {inventoryMetrics.total}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">All shop items</span>
        </button>

        {/* Active Products */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("active");
            setStockFilter("all");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === "active"
              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active</span>
            <span className="text-base">🟢</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
            {inventoryMetrics.active}
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Live in customer store</span>
        </button>

        {/* Low-Stock Products (< 5) */}
        <button
          type="button"
          onClick={() => {
            setStockFilter("low_stock");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            stockFilter === "low_stock"
              ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Low Stock</span>
            <span className="text-base">⚠️</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1 font-mono">
            {inventoryMetrics.lowStock}
          </div>
          <span className="text-[10px] text-amber-600/80 font-medium">&lt; 5 units remaining</span>
        </button>

        {/* Out-of-Stock Products (= 0) */}
        <button
          type="button"
          onClick={() => {
            setStockFilter("out_of_stock");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            stockFilter === "out_of_stock"
              ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Out of Stock</span>
            <span className="text-base">🚫</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1 font-mono">
            {inventoryMetrics.outOfStock}
          </div>
          <span className="text-[10px] text-rose-600/80 font-medium">0 units available</span>
        </button>

        {/* Archived Products */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("archived");
            setStockFilter("all");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === "archived"
              ? "bg-slate-100 border-slate-600 ring-2 ring-slate-600/20 shadow-xs"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Archived</span>
            <span className="text-base">📁</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-700 mt-1 font-mono">
            {inventoryMetrics.archived}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Preserved order items</span>
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
            className={`p-3 rounded-2xl border transition flex items-center justify-between text-left cursor-pointer ${
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
              <span className={`text-xs font-bold truncate ${departmentFilter === "all" ? "text-purple-700 font-extrabold" : "text-slate-800"}`}>
                All Catalogs
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
                departmentFilter === "all" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {products.length}
            </span>
          </button>

          {displayedCategoryGroups.map((grp) => {
            const count = products.filter(
              (p) => getDepartmentForCategory(p.categoryName || "") === grp.group
            ).length;
            const isSelected = departmentFilter === grp.group;

            return (
              <button
                key={grp.group}
                type="button"
                onClick={() => {
                  setDepartmentFilter(grp.group);
                  setCategoryFilter("all");
                }}
                className={`p-3 rounded-2xl border transition flex items-center justify-between text-left cursor-pointer ${
                  isSelected
                    ? "bg-purple-50/80 border-2 border-purple-500 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl">{grp.icon}</span>
                  <span className={`text-xs font-bold truncate ${isSelected ? "text-purple-700 font-extrabold" : "text-slate-800"}`}>
                    {grp.group}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
                    isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
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
              placeholder="Search by sweet name, farsan, SKU, or pack size..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl bg-white border border-[#0b2f8a]/15 px-4 py-2.5 text-[#182230] placeholder:text-[#5e6d82]/60 focus:border-[#0b2f8a] outline-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-2xs shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Math.min(50, Number(e.target.value)));
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-[#0b2f8a] outline-none cursor-pointer"
            >
              <option value={10}>10 items</option>
              <option value={25}>25 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl bg-white border border-[#0b2f8a]/15 px-4 py-2.5 text-[#182230] focus:border-[#0b2f8a] outline-none shadow-sm min-w-[200px]"
          >
            <option value="all">All Specific Categories ({filtered.length})</option>
            {displayedCategoryGroups
              .filter((grp) => departmentFilter === "all" || departmentFilter === grp.group)
              .map((grp) => (
                <optgroup key={grp.group} label={`${grp.icon} ${grp.group}`}>
                  {grp.items.map((cat) => {
                    const count = products.filter((p) => p.categoryName?.toLowerCase() === cat.name.toLowerCase()).length;
                    return (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name} ({count})
                      </option>
                    );
                  })}
                </optgroup>
              ))}
          </select>
        </div>

        {/* Dual Filter Row: Status (Active/Inactive) & Stock Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Status:
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === "all" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                statusFilter === "active" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-100/50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active ({products.filter((p) => p.isActive !== false).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                statusFilter === "inactive" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-100/50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Inactive ({products.filter((p) => p.isActive === false && !p.isArchived).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("archived");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                statusFilter === "archived" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Archived ({products.filter((p) => p.isArchived === true).length})
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Stock:
            </span>
            <button
              type="button"
              onClick={() => {
                setStockFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                stockFilter === "all" ? "bg-[#0b2f8a] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setStockFilter("in_stock");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                stockFilter === "in_stock"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <span>✓ In Stock</span>
              <span className="text-[10px] font-mono">({products.filter((p) => p.stock > 0).length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStockFilter("low_stock");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                stockFilter === "low_stock"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <span>⚠️ Low Stock</span>
              <span className="text-[10px] font-mono">({products.filter((p) => p.stock > 0 && p.stock <= 10).length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStockFilter("out_of_stock");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                stockFilter === "out_of_stock"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200/60"
              }`}
            >
              <span>🚫 Out of Stock</span>
              <span className="text-[10px] font-mono">({products.filter((p) => p.stock <= 0).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products & Pricing Table */}
      <div className="rounded-2xl bg-white border border-[#0b2f8a]/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#182230]">
            <thead className="bg-[#0b2f8a]/5 text-[11px] uppercase tracking-wider text-[#0b2f8a] font-bold border-b border-[#0b2f8a]/10">
              <tr>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Pack Sizes & Variants</th>
                <th className="py-3.5 px-4">Price & MRP</th>
                <th className="py-3.5 px-4">Availability</th>
                <th className="py-3.5 px-4 text-right">Pricing Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0b2f8a]/8">
              {paginatedProducts.map((item) => {
                const variantsList = item.variants && item.variants.length > 0
                  ? item.variants
                  : [
                      {
                        id: item.variantId,
                        packName: item.packName || "Standard Pack",
                        weight: item.weight || "500g",
                        price: item.price,
                        discountedPrice: item.discountedPrice,
                        stock: item.stock,
                        isDefault: true,
                        isActive: true,
                      },
                    ];

                const primaryVariant = variantsList.find((v) => v.isDefault) || variantsList[0];
                const originalPrice = primaryVariant?.price || item.price;
                const sellingPrice = (primaryVariant?.discountedPrice !== null && primaryVariant?.discountedPrice !== undefined && primaryVariant.discountedPrice > 0)
                  ? primaryVariant.discountedPrice
                  : (item.discountedPrice !== null && item.discountedPrice !== undefined && item.discountedPrice > 0 ? item.discountedPrice : originalPrice);

                const hasDiscount = Boolean(originalPrice > sellingPrice && sellingPrice >= 0);
                const discountPct = hasDiscount ? calculateDiscount(originalPrice, sellingPrice) : 0;
                const isOutOfStock = (primaryVariant?.stock ?? item.stock) <= 0;
                const isActive = item.isActive !== false;

                return (
                  <tr key={`${item.id}-${item.variantId}`} className="hover:bg-[#0b2f8a]/[0.02] transition">
                    {/* Item Thumbnail & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoEditItem(item);
                            setEditImageUrl(item.imageUrl);
                          }}
                          className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#0b2f8a]/15 group cursor-pointer shadow-xs hover:ring-2 hover:ring-[#0b2f8a]/40 transition"
                          title="Click to change photo"
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
                          <p className="font-bold text-[#182230] max-w-xs leading-snug">{item.name}</p>
                          <p className="text-[10px] text-[#5e6d82] font-mono mt-0.5">{primaryVariant?.sku || item.sku}</p>
                          {item.isFeatured && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#fbf3db] text-[#b89130] border border-[#dfb755]/30">
                              ★ Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const grp = getCategoryGroup(item.categoryName);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit border ${grp?.badgeColor || "bg-[#0b2f8a]/10 text-[#0b2f8a] border-[#0b2f8a]/15"}`}>
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

                    {/* Product Status (Active / Inactive) */}
                    <td className="py-3.5 px-4">
                      {!isReadOnly ? (
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(item)}
                          disabled={saving}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                          }`}
                          title={isActive ? "Click to deactivate (hide from store)" : "Click to activate (show in store)"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </button>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-300"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>

                    {/* Pack Sizes & Variants */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {variantsList.length} Pack{variantsList.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {variantsList.map((v, idx) => (
                            <span
                              key={v.id || idx}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${
                                v.isDefault
                                  ? "bg-[#0b2f8a]/10 text-[#0b2f8a] border-[#0b2f8a]/20 font-bold"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {v.packName ? `${v.packName} (${v.weight})` : v.weight}
                              {v.isDefault && " ★"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Price & Auto-calculated Discount */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-bold text-sm text-[#0b2f8a]">
                            ₹{sellingPrice}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-[#5e6d82] line-through font-medium">
                              ₹{originalPrice}
                            </span>
                          )}
                        </div>
                        {hasDiscount && discountPct > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded w-fit mt-0.5">
                            {discountPct}% OFF
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                            MRP Price
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock & Availability */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`font-semibold text-xs ${
                            isOutOfStock
                              ? "text-rose-600 font-bold"
                              : (primaryVariant?.stock ?? item.stock) < 5
                              ? "text-amber-600 font-bold"
                              : "text-emerald-700"
                          }`}
                        >
                          {primaryVariant?.stock ?? item.stock} in stock
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded w-fit ${
                          isOutOfStock
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : (primaryVariant?.stock ?? item.stock) < 5
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {isOutOfStock
                            ? "Out of Stock"
                            : (primaryVariant?.stock ?? item.stock) < 5
                            ? `Low Stock (${primaryVariant?.stock ?? item.stock} left)`
                            : "In Stock"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isReadOnly ? (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          👁️ View Only
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isArchived ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreProduct(item)}
                              disabled={saving}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-300 flex items-center gap-1 cursor-pointer"
                              title="Restore archived product to active catalog"
                            >
                              <span>♻️</span>
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPricingModal(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0b2f8a] hover:bg-[#072163] transition shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Manage multiple pack sizes and price rules"
                            >
                              <span>🏷️</span>
                              <span>Edit Pricing & Packs</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoEditItem(item);
                              setEditImageUrl(item.imageUrl);
                            }}
                            className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            title="Update photo"
                          >
                            📷
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(item)}
                            className="px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                            title="Delete product"
                          >
                            🗑️
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
                    No mithai or farsan items found matching your filters.
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

      {/* ========================================================================= */}
      {/* MODAL 1: Product Price & Multiple Pack Size Management Modal             */}
      {/* ========================================================================= */}
      {pricingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#0b2f8a]/20 shadow-2xl p-5 sm:p-6 w-full max-w-4xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img src={pricingProduct.imageUrl} alt={pricingProduct.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[#0b2f8a]">
                    Price & Pack Size Management
                  </h3>
                  <p className="text-xs text-[#5e6d82] flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-slate-800">{pricingProduct.name}</span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono">{pricingProduct.categoryName}</span>
                  </p>
                </div>
              </div>

              {/* Product Active/Inactive Toggle */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
                  <label htmlFor="modal-product-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Product Status:
                  </label>
                  <input
                    type="checkbox"
                    id="modal-product-active"
                    checked={productActive}
                    onChange={(e) => setProductActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b2f8a] cursor-pointer"
                  />
                  <span className={`text-xs font-bold ${productActive ? "text-emerald-700" : "text-rose-600"}`}>
                    {productActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <button
                  onClick={() => setPricingProduct(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Explanatory Banner */}
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div className="space-y-0.5">
                <p className="font-bold">Multiple Pack Sizes & Automatic Discount System</p>
                <p className="text-blue-800/90 text-[11px] leading-relaxed">
                  Add multiple weights (e.g. 250 g, 500 g, 1 kg, 2 kg). The storefront will display the selected pack clearly, calculate discounts automatically via <code className="font-mono bg-blue-100/70 px-1 rounded">((MRP - Selling Price) / MRP) × 100</code>, and update prices immediately upon pack selection.
                </p>
              </div>
            </div>

            {/* Pack Sizes Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#182230] flex items-center gap-2">
                  <span>📦</span>
                  <span>Configured Pack Sizes ({localVariants.length})</span>
                </h4>

                <button
                  type="button"
                  onClick={handleAddNewPackRow}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#0b2f8a] bg-[#0b2f8a]/8 hover:bg-[#0b2f8a]/15 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>+</span>
                  <span>Add Pack Size</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Default</th>
                        <th className="py-3 px-3">Pack Name</th>
                        <th className="py-3 px-3">Pack Size (Weight)</th>
                        <th className="py-3 px-3">Original MRP (₹)</th>
                        <th className="py-3 px-3">Selling Price (₹)</th>
                        <th className="py-3 px-3">Discount Badge</th>
                        <th className="py-3 px-3">Stock & Status</th>
                        <th className="py-3 px-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {localVariants.map((variant, index) => {
                        const original = Number(variant.price) || 0;
                        const selling = variant.discountedPrice !== null && variant.discountedPrice !== undefined
                          ? Number(variant.discountedPrice)
                          : original;

                        const isDiscounted = original > selling && selling >= 0;
                        const discountPct = isDiscounted ? calculateDiscount(original, selling) : 0;
                        const hasError = selling > original;

                        return (
                          <tr key={index} className="hover:bg-slate-50/60 transition">
                            {/* Default Radio */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="radio"
                                name="default-pack-radio"
                                checked={Boolean(variant.isDefault)}
                                onChange={() => handleUpdatePackField(index, "isDefault", true)}
                                className="w-4 h-4 text-[#0b2f8a] cursor-pointer"
                                title="Set as default pack size"
                              />
                            </td>

                            {/* Pack Name Input */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                list={`pack-presets-${index}`}
                                value={variant.packName || ""}
                                onChange={(e) => handleUpdatePackField(index, "packName", e.target.value)}
                                placeholder="Standard Pack"
                                className="w-32 sm:w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-[#0b2f8a]"
                              />
                              <datalist id={`pack-presets-${index}`}>
                                {PACK_NAME_PRESETS.map((p) => (
                                  <option key={p} value={p} />
                                ))}
                              </datalist>
                            </td>

                            {/* Pack Size / Weight */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                list={`weight-presets-${index}`}
                                value={variant.weight || ""}
                                onChange={(e) => handleUpdatePackField(index, "weight", e.target.value)}
                                placeholder="500g, 1 kg"
                                className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-[#0b2f8a]"
                              />
                              <datalist id={`weight-presets-${index}`}>
                                {PACK_SIZE_PRESETS.map((w) => (
                                  <option key={w} value={w} />
                                ))}
                              </datalist>
                            </td>

                            {/* Original MRP */}
                            <td className="py-3 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">₹</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={variant.price === 0 ? "" : variant.price}
                                  onChange={(e) => handleUpdatePackField(index, "price", Math.max(0, Number(e.target.value)))}
                                  placeholder="350"
                                  className={`w-24 pl-6 pr-2 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#0b2f8a] ${
                                    variant.price <= 0 || (selling > variant.price && variant.price > 0)
                                      ? "border-rose-400 bg-rose-50/20"
                                      : "border-slate-200"
                                  }`}
                                />
                              </div>
                              {variant.price <= 0 && (
                                <span className="text-[9px] text-rose-600 font-semibold block mt-0.5">Required (&gt; ₹0)</span>
                              )}
                            </td>

                            {/* Selling Price */}
                            <td className="py-3 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-[#0b2f8a] font-mono text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={variant.discountedPrice === null ? "" : variant.discountedPrice}
                                  onChange={(e) => {
                                    const val = e.target.value.trim() === "" ? null : Math.max(0, Number(e.target.value));
                                    handleUpdatePackField(index, "discountedPrice", val);
                                  }}
                                  placeholder={String(variant.price || 300)}
                                  className={`w-24 pl-6 pr-2 py-1.5 rounded-lg border text-xs font-mono font-bold outline-none ${
                                    hasError || selling <= 0
                                      ? "border-rose-400 text-rose-600 bg-rose-50/50"
                                      : "border-slate-200 text-[#0b2f8a] focus:border-[#0b2f8a]"
                                  }`}
                                />
                              </div>
                              {selling <= 0 && (
                                <span className="text-[9px] text-rose-600 font-semibold block mt-0.5">Must be &gt; ₹0</span>
                              )}
                              {hasError && (
                                <span className="text-[9px] text-rose-600 font-semibold block mt-0.5">Cannot exceed MRP</span>
                              )}
                            </td>

                            {/* Auto Calculated Discount Badge */}
                            <td className="py-3 px-3">
                              {hasError ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md inline-block">
                                  ⚠️ &gt; MRP
                                </span>
                              ) : isDiscounted && discountPct > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-2xs">
                                  <span>🏷️</span>
                                  <span>{discountPct}% OFF</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-50 border border-slate-200/60 rounded-md inline-block">
                                  No Discount
                                </span>
                              )}
                            </td>

                            {/* Stock & Active Switch */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={variant.stock}
                                  onChange={(e) => handleUpdatePackField(index, "stock", Math.max(0, Number(e.target.value)))}
                                  placeholder="50"
                                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-medium text-slate-800 outline-none focus:border-[#0b2f8a]"
                                  title="Stock units available"
                                />
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    variant.stock > 0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}
                                >
                                  {variant.stock > 0 ? "In Stock" : "OOS"}
                                </span>
                              </div>
                            </td>

                            {/* Delete Action */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeletePackRow(index)}
                                className="px-2 py-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer font-bold"
                                title="Delete this pack size"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                ⭐ Radio button selects which pack size is selected by default on customer website.
              </p>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPricingProduct(null)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#182230] font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePricingAndPacks}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl btn-primary font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Delete Pack Size Confirmation Dialog                             */}
      {/* ========================================================================= */}
      {variantToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl p-5 w-full max-w-sm space-y-3">
            <h4 className="font-bold text-sm text-rose-600 flex items-center gap-2">
              <span>⚠️</span> Delete Pack Size?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the <strong>{variantToDelete.packName || "Pack"} ({variantToDelete.weight})</strong>?
              This pack will be removed from customer selection.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVariantToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePackRow}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {saving ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Add New Sweet or Farsan Item with Initial Pack Sizes              */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#0b2f8a]/15 shadow-2xl p-5 sm:p-6 w-full max-w-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#0b2f8a]/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                Add New Mithai or Farsan Item
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-[#182230] font-semibold mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Kesar Peda, Fafda Jalebi Combo, Royal Kaju Katli"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-xl bg-white border p-2.5 text-[#182230] outline-none focus:border-[#0b2f8a] ${
                    (addSubmitted && !newTitle.trim()) || (newTitle.trim() && products.some((p) => p.name.toLowerCase() === newTitle.trim().toLowerCase()))
                      ? "border-rose-400 bg-rose-50/20"
                      : "border-[#0b2f8a]/15"
                  }`}
                />
                {addSubmitted && !newTitle.trim() && (
                  <span className="text-[11px] text-rose-600 font-semibold block mt-1">
                    ⚠️ Product title is required.
                  </span>
                )}
                {newTitle.trim() && products.some((p) => p.name.toLowerCase() === newTitle.trim().toLowerCase()) && (
                  <span className="text-[11px] text-rose-600 font-semibold block mt-1">
                    ⚠️ A product named &ldquo;{newTitle.trim()}&rdquo; already exists. Please choose a unique name.
                  </span>
                )}
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#182230] font-semibold mb-1">Category</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(Number(e.target.value))}
                    className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none"
                  >
                    {displayedCategoryGroups.map((grp) => (
                      <optgroup key={grp.group} label={`${grp.icon} ${grp.group}`}>
                        {grp.items.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.id || 1}>
                            {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#182230] font-semibold mb-1">Product Status</label>
                  <select
                    value={newIsActive ? "active" : "inactive"}
                    onChange={(e) => setNewIsActive(e.target.value === "active")}
                    className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none font-semibold"
                  >
                    <option value="active">Active (Visible in Store)</option>
                    <option value="inactive">Inactive (Hidden from Store)</option>
                  </select>
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-[#182230] font-semibold mb-1">
                  SKU Code <span className="text-slate-400 font-normal">(Optional — auto-generated if left blank)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VSM-KAJU-500G"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full rounded-xl bg-white border border-[#0b2f8a]/15 p-2.5 text-[#182230] outline-none font-mono"
                />
              </div>

              {/* Initial Pack Sizes Section */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#0b2f8a] uppercase tracking-wider">
                    Pack Sizes & Pricing Rules
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProductPacks((prev) => [
                        ...prev,
                        {
                          packName: "Family Pack",
                          weight: "1 kg",
                          price: 700,
                          discountedPrice: 600,
                          stock: 50,
                          isDefault: false,
                          isActive: true,
                        },
                      ]);
                    }}
                    className="text-[11px] font-bold text-[#0b2f8a] hover:underline cursor-pointer"
                  >
                    + Add Another Pack Size
                  </button>
                </div>

                <div className="space-y-2">
                  {newProductPacks.map((pack, idx) => {
                    const original = Number(pack.price) || 0;
                    const selling = pack.discountedPrice !== null && pack.discountedPrice !== undefined
                      ? Number(pack.discountedPrice)
                      : original;
                    const isDiscounted = original > selling && selling >= 0;
                    const discPct = isDiscounted ? calculateDiscount(original, selling) : 0;

                    return (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Pack Name</label>
                            <input
                              type="text"
                              value={pack.packName}
                              onChange={(e) => {
                                const next = [...newProductPacks];
                                next[idx].packName = e.target.value;
                                setNewProductPacks(next);
                              }}
                              placeholder="Standard Pack"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Weight / Size</label>
                            <input
                              type="text"
                              value={pack.weight}
                              onChange={(e) => {
                                const next = [...newProductPacks];
                                next[idx].weight = e.target.value;
                                setNewProductPacks(next);
                              }}
                              placeholder="500g, 1 kg"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">MRP Price (₹)</label>
                            <input
                              type="number"
                              min={0}
                              value={pack.price}
                              onChange={(e) => {
                                const next = [...newProductPacks];
                                next[idx].price = Math.max(0, Number(e.target.value));
                                setNewProductPacks(next);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Selling Price (₹)</label>
                            <input
                              type="number"
                              min={0}
                              value={pack.discountedPrice === null ? "" : pack.discountedPrice}
                              onChange={(e) => {
                                const next = [...newProductPacks];
                                next[idx].discountedPrice = e.target.value.trim() === "" ? null : Math.max(0, Number(e.target.value));
                                setNewProductPacks(next);
                              }}
                              placeholder={String(pack.price)}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-[#0b2f8a]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="new-product-default"
                                checked={pack.isDefault}
                                onChange={() => {
                                  const next = newProductPacks.map((item, i) => ({
                                    ...item,
                                    isDefault: i === idx,
                                  }));
                                  setNewProductPacks(next);
                                }}
                                className="w-3.5 h-3.5 text-[#0b2f8a]"
                              />
                              <span className="text-slate-600 font-medium">Default Pack</span>
                            </label>

                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Stock:</span>
                              <input
                                type="number"
                                min={0}
                                value={pack.stock}
                                onChange={(e) => {
                                  const next = [...newProductPacks];
                                  next[idx].stock = Math.max(0, Number(e.target.value));
                                  setNewProductPacks(next);
                                }}
                                className="w-16 px-1.5 py-0.5 rounded border border-slate-200 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDiscounted && discPct > 0 ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                                {discPct}% OFF
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No Discount</span>
                            )}

                            {newProductPacks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewProductPacks(newProductPacks.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Photo */}
              <div>
                <ImagePickerField
                  label="Product Photo"
                  value={newImageUrl}
                  onChange={(url) => setNewImageUrl(url)}
                  helperText="Choose a file to upload from your computer or pick from the mithai/farsan library."
                  presetFilter="Mithai"
                />
              </div>

              {/* Description */}
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

              {/* Featured toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#0b2f8a] cursor-pointer"
                />
                <label htmlFor="featured-check" className="text-[#182230] font-medium cursor-pointer">
                  Feature on Homepage Showcase
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0b2f8a]/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#182230] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl btn-primary font-bold shadow-md cursor-pointer"
                >
                  {saving ? "Adding..." : "Add to Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Change Product Photo Modal                                       */}
      {/* ========================================================================= */}
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
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <ImagePickerField
                label="New Product Image"
                value={editImageUrl}
                onChange={(url) => setEditImageUrl(url)}
                helperText="Upload a fresh photograph or pick from existing catalog pictures."
                presetFilter={getDepartmentForCategory(photoEditItem.categoryName || "") as any}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPhotoEditItem(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#182230] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateProductPhoto(photoEditItem.productId || photoEditItem.id, editImageUrl)}
                  disabled={saving || !editImageUrl}
                  className="px-5 py-2 rounded-xl btn-primary text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Delete / Archive Product Confirmation Dialog                     */}
      {/* ========================================================================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#182230]">
                  Remove Product Confirmation
                </h3>
                <p className="text-xs text-slate-500">
                  Review available stock and order preservation rules.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Product Name:</span>
                <span className="font-bold text-slate-900">{productToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Available Stock:</span>
                <span className={`font-mono font-bold ${
                  (productToDelete.stock || 0) <= 0
                    ? "text-rose-600"
                    : (productToDelete.stock || 0) < 5
                    ? "text-amber-600"
                    : "text-emerald-700"
                }`}>
                  {productToDelete.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? productToDelete.stock ?? 0} units across {productToDelete.variants?.length || 1} pack size(s)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Category:</span>
                <span className="text-slate-700 font-medium">{productToDelete.categoryName || "Sweets / Farsan"}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
              <strong>🛡️ Order History Safeguard:</strong> If this product has ever been purchased in customer orders, it will be automatically <em>archived</em> to preserve order history, customer receipts, and inventory tracking, while removing it from customer view.
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#182230] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(true)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                title="Archive product (preserves order history, hides from store)"
              >
                {isDeleting ? "Processing..." : "Archive Product"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                title="Delete product permanently if no order history exists"
              >
                {isDeleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
