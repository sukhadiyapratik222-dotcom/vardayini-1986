"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { CategoryItem, ProductItem, UiConfig, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";
import { TablePagination } from "./table-pagination";
import { CategoryShowcaseTab } from "./category-showcase-tab";

interface CategoriesTabProps {
  categories: CategoryItem[];
  products: ProductItem[];
  config?: UiConfig | null;
  onRefresh: () => void;
  onSelectCategoryFilter?: (slug: string) => void;
  initialSubTab?: "categories" | "showcase";
  isReadOnly?: boolean;
}

// 23 Authentic Sweet Mart Presets with photos, descriptions, and departments
export const SWEET_MART_CATEGORY_PRESETS = [
  // Sweets
  {
    name: "Kaju Sweets",
    slug: "kaju-sweets",
    department: "Sweets" as const,
    icon: "💎",
    description: "Royal cashew diamond sweets crafted with pure shuddh ghee.",
    imageUrl: "/images/kaju-katli.jpg",
  },
  {
    name: "Mawa Sweets",
    slug: "mawa-sweets",
    department: "Sweets" as const,
    icon: "🥛",
    description: "Rich khoya and mawa confections rolled with pistachios and saffron.",
    imageUrl: "/images/peda.jpg",
  },
  {
    name: "Penda",
    slug: "penda",
    department: "Sweets" as const,
    icon: "🟡",
    description: "Traditional authentic Mathura and Rajkot style golden pedas.",
    imageUrl: "/images/peda.jpg",
  },
  {
    name: "Indian Ghee Sweets",
    slug: "indian-ghee-sweets",
    department: "Sweets" as const,
    icon: "🧈",
    description: "Classic desi cow ghee sweets, Mysore pak, and golden laddoos.",
    imageUrl: "/images/motichoor.jpg",
  },
  {
    name: "Dryfruit Sweets",
    slug: "dryfruit-sweets",
    department: "Sweets" as const,
    icon: "🌰",
    description: "Premium almond, pistachio, and walnut bites without artificial sugar.",
    imageUrl: "/images/dry-fruit-bite.jpg",
  },
  {
    name: "Bengali Sweets",
    slug: "bengali-sweets",
    department: "Sweets" as const,
    icon: "🍯",
    description: "Fresh chhena sweets including sponge Rasgulla and Rajbhog.",
    imageUrl: "/images/rasgulla.jpg",
  },
  {
    name: "Sugarless Sweets",
    slug: "sugarless-sweets",
    department: "Sweets" as const,
    icon: "🌿",
    description: "Natural anjeer, date, and seed sweets with zero added cane sugar.",
    imageUrl: "/images/dry-fruit-bite.jpg",
  },
  {
    name: "Festival Specials",
    slug: "festival-specials",
    department: "Sweets" as const,
    icon: "🪔",
    description: "Diwali, Dussehra, and festive gift boxes and specialty preparations.",
    imageUrl: "/images/festive-hamper.jpg",
  },
  {
    name: "Premium Packed Sweets",
    slug: "premium-packed-sweets",
    department: "Sweets" as const,
    icon: "📦",
    description: "Vacuum sealed fresh gift packs for long journeys and corporate gifting.",
    imageUrl: "/images/hamper.jpg",
  },
  {
    name: "Ladoo Specials",
    slug: "ladoo-specials",
    department: "Sweets" as const,
    icon: "🟠",
    description: "Motichoor, Besan, and Boondi laddoos rich with cardamom and ghee.",
    imageUrl: "/images/motichoor.jpg",
  },
  {
    name: "Chikki & Gajak",
    slug: "chikki-gajak",
    department: "Sweets" as const,
    icon: "🥜",
    description: "Winter special crunchy peanut, sesame til, and dryfruit jaggery brittle.",
    imageUrl: "/images/uttarayan-chikki.jpg",
  },
  {
    name: "Gift Boxes & Hampers",
    slug: "gift-boxes-hampers",
    department: "Sweets" as const,
    icon: "🎁",
    description: "Exclusive gold-embossed celebration hampers for weddings and festivals.",
    imageUrl: "/images/hamper.jpg",
  },

  // Namkeen & Farsan
  {
    name: "Traditional Gujarati Snacks",
    slug: "farsan-snacks",
    department: "Namkeen" as const,
    icon: "🥨",
    description: "Handcrafted farsan including Bhavnagari gathiya, papdi, and chavanu.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Khakhra",
    slug: "khakhra",
    department: "Namkeen" as const,
    icon: "🫓",
    description: "Thin, crispy roasted whole wheat khakhras in methi, jeera, and masala.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Farali",
    slug: "farali",
    department: "Namkeen" as const,
    icon: "🥔",
    description: "Vrat & fasting special sabudana, potato crisps, and rock salt mixtures.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Mixture",
    slug: "mixture",
    department: "Namkeen" as const,
    icon: "🥣",
    description: "Spicy and sweet Gujarati chavanu, cornflake mixture, and ratlami blends.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Sev",
    slug: "sev",
    department: "Namkeen" as const,
    icon: "🍜",
    description: "Fine nylon sev, tikha sev, and garlic lasan sev for chaat and snacking.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Chips and Puris",
    slug: "chips-and-puris",
    department: "Namkeen" as const,
    icon: "🍌",
    description: "Yellow banana mari wafers, farsi puris, and mathri crackers.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Roasted",
    slug: "roasted",
    department: "Namkeen" as const,
    icon: "🔥",
    description: "Diet-friendly oil-free roasted makhana, chana, and multigrain puffs.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Millet",
    slug: "millet",
    department: "Namkeen" as const,
    icon: "🌾",
    description: "Wholesome bajra, jowar, and ragi wholesome roasted crisps.",
    imageUrl: "/images/namkeen.jpg",
  },
  {
    name: "Daal/Lentil",
    slug: "daal-lentil",
    department: "Namkeen" as const,
    icon: "🌱",
    description: "Crunchy fried and spiced moong dal, chana dal, and salted peanuts.",
    imageUrl: "/images/namkeen.jpg",
  },

  // Bakery
  {
    name: "Biscuits and Cookies",
    slug: "biscuits-and-cookies",
    department: "Bakery" as const,
    icon: "🍪",
    description: "Butter nankhatai, pista cookies, and almond bakery biscuits.",
    imageUrl: "/images/kaju-katli.jpg",
  },
  {
    name: "Toast and Khari",
    slug: "toast-and-khari",
    department: "Bakery" as const,
    icon: "🍞",
    description: "Flaky crispy tea-time khari biscuits and crunchy milk rusk toast.",
    imageUrl: "/images/kaju-katli.jpg",
  },
];

// Quick Image Presets for Add/Edit Modal
export const IMAGE_PRESETS = [
  { label: "Kaju Katli", url: "/images/kaju-katli.jpg" },
  { label: "Mawa Peda", url: "/images/peda.jpg" },
  { label: "Motichoor", url: "/images/motichoor.jpg" },
  { label: "Rasgulla", url: "/images/rasgulla.jpg" },
  { label: "Namkeen & Farsan", url: "/images/namkeen.jpg" },
  { label: "Khaman Dhokla", url: "/images/khaman.jpg" },
  { label: "Khandvi Rolls", url: "/images/khandvi.jpg" },
  { label: "Festive Hamper", url: "/images/festive-hamper.jpg" },
  { label: "Dry Fruit Bite", url: "/images/dry-fruit-bite.jpg" },
  { label: "Uttarayan Chikki", url: "/images/uttarayan-chikki.jpg" },
  { label: "Jalebi", url: "/images/jalebi.jpg" },
  { label: "Modak Bhog", url: "/images/modak-bhog.jpg" },
];

export function getCategoryDepartment(name: string, id?: number): "Sweets" | "Namkeen" | "Bakery" {
  if (id === 23 || id === 24) return "Bakery";
  if (id && [9, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 37].includes(id)) return "Namkeen";
  if (id && [1, 2, 3, 4, 5, 6, 7, 8, 10].includes(id)) return "Sweets";

  const s = (name || "").toLowerCase();
  if (
    s.includes("namkeen") ||
    s.includes("farsan") ||
    s.includes("farshan") ||
    s.includes("snack") ||
    s.includes("khakhra") ||
    s.includes("farali") ||
    s.includes("mixture") ||
    s.includes("sev") ||
    s.includes("chips") ||
    s.includes("puri") ||
    s.includes("millet") ||
    s.includes("roasted") ||
    s.includes("daal") ||
    s.includes("lentil") ||
    s.includes("khaman") ||
    s.includes("khandvi") ||
    s.includes("bhel")
  ) {
    return "Namkeen";
  }
  if (
    s.includes("biscuit") ||
    s.includes("cookie") ||
    s.includes("toast") ||
    s.includes("khari") ||
    s.includes("bakery")
  ) {
    return "Bakery";
  }
  return "Sweets";
}

export function CategoriesTab({
  categories,
  products,
  config,
  onRefresh,
  onSelectCategoryFilter,
  initialSubTab = "categories",
  isReadOnly = false,
}: CategoriesTabProps) {
  // If specifically opened via showcase route, render showcase tab directly
  if (initialSubTab === "showcase") {
    return <CategoryShowcaseTab config={config || null} onRefresh={onRefresh} />;
  }

  // Filter & UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<"all" | "Sweets" | "Namkeen" | "Bakery" | "empty">("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "products">("order");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Quick Add State
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Bulk Add / Preset Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<"presets" | "paste" | "sync">("presets");
  const [selectedPresetSlugs, setSelectedPresetSlugs] = useState<string[]>([]);
  const [bulkTextLines, setBulkTextLines] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Single Add / Edit Modal State
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

  // Reordering In-Progress Indicator
  const [isReorderingId, setIsReorderingId] = useState<number | null>(null);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("/images/kaju-katli.jpg");
    setSortOrder(categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder || 0)) + 1 : 1);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setImageUrl(cat.imageUrl || "/images/kaju-katli.jpg");
    setSortOrder(cat.sortOrder ?? 0);
    setIsModalOpen(true);
  };

  // Auto-generate slug on name change
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

  // Save (Create or Update Single Category)
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

  // Quick Add Handler (Single Click / Enter key)
  const handleQuickAdd = async () => {
    const trimmed = quickCategoryName.trim();
    if (!trimmed) return;

    // Check if category already exists
    const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.info(`Category "${trimmed}" already exists.`);
      return;
    }

    setIsQuickAdding(true);
    try {
      const dept = getCategoryDepartment(trimmed);
      const defaultImg =
        dept === "Sweets"
          ? "/images/kaju-katli.jpg"
          : dept === "Namkeen"
          ? "/images/namkeen.jpg"
          : "/images/kaju-katli.jpg";
      const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder || 0)) + 1 : 1;

      await api.createCategory({
        name: trimmed,
        description: `Fresh handcrafted ${trimmed} from Kalol kitchens.`,
        imageUrl: defaultImg,
        sortOrder: nextOrder,
      });

      toast.success(`Category "${trimmed}" added!`);
      setQuickCategoryName("");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to quick-add category";
      toast.error(msg);
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Reorder Handler (Move Up / Down)
  const handleReorder = async (cat: CategoryItem, direction: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const currentIndex = sorted.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const targetCat = sorted[targetIndex];
    const originalCatOrder = cat.sortOrder ?? currentIndex;
    const targetCatOrder = targetCat.sortOrder ?? targetIndex;

    // If both currently have same sortOrder, offset them
    const newTargetOrder = originalCatOrder === targetCatOrder ? (direction === "up" ? targetCatOrder - 1 : targetCatOrder + 1) : targetCatOrder;

    setIsReorderingId(cat.id);
    try {
      await Promise.all([
        api.updateCategory({ id: cat.id, sortOrder: newTargetOrder }),
        api.updateCategory({ id: targetCat.id, sortOrder: originalCatOrder }),
      ]);
      toast.success(`Moved "${cat.name}" ${direction === "up" ? "higher" : "lower"}`);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder category";
      toast.error(msg);
    } finally {
      setIsReorderingId(null);
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

  // Enrich with live product counts
  const enrichedCategories = useMemo(() => {
    return categories.map((cat) => {
      const directCount = cat.productCount;
      if (typeof directCount === "number" && directCount > 0) return cat;
      const computedCount = products.filter(
        (p) => p.categoryId === cat.id || p.categoryName?.toLowerCase() === cat.name?.toLowerCase()
      ).length;
      return { ...cat, productCount: computedCount };
    });
  }, [categories, products]);

  // Existing names & slugs set for preset checks
  const existingCategoryNames = useMemo(
    () => new Set(categories.map((c) => c.name.toLowerCase())),
    [categories]
  );
  const existingCategorySlugs = useMemo(
    () => new Set(categories.map((c) => c.slug.toLowerCase())),
    [categories]
  );

  // Missing Sweet Mart Presets
  const missingPresets = useMemo(() => {
    return SWEET_MART_CATEGORY_PRESETS.filter(
      (p) => !existingCategoryNames.has(p.name.toLowerCase()) && !existingCategorySlugs.has(p.slug.toLowerCase())
    );
  }, [existingCategoryNames, existingCategorySlugs]);

  // Missing categories found in products
  const missingFromProducts = useMemo(() => {
    const productCategoryNames = new Set(
      products.map((p) => p.categoryName?.trim()).filter((n): n is string => Boolean(n && n.length > 0))
    );
    const missing: string[] = [];
    productCategoryNames.forEach((pCat) => {
      if (!existingCategoryNames.has(pCat.toLowerCase())) {
        missing.push(pCat);
      }
    });
    return missing;
  }, [products, existingCategoryNames]);

  // Bulk Add Preset Handler
  const handleBulkAddPresets = async () => {
    if (selectedPresetSlugs.length === 0) {
      toast.info("Please select at least one preset category to add.");
      return;
    }

    const toAdd = SWEET_MART_CATEGORY_PRESETS.filter((p) => selectedPresetSlugs.includes(p.slug));
    setIsBulkSubmitting(true);
    try {
      const payload = toAdd.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
      }));

      const res = await api.createCategoriesBulk(payload);
      toast.success(`Successfully added ${res.count || payload.length} categories! 🚀`);
      setIsBulkModalOpen(false);
      setSelectedPresetSlugs([]);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to bulk add categories";
      toast.error(msg);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Bulk Add from Textarea
  const handleBulkAddFromText = async () => {
    const lines = bulkTextLines
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.info("Please enter at least one category name.");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload = lines.map((line) => {
        const dept = getCategoryDepartment(line);
        const defaultImg =
          dept === "Sweets"
            ? "/images/kaju-katli.jpg"
            : dept === "Namkeen"
            ? "/images/namkeen.jpg"
            : "/images/kaju-katli.jpg";
        return {
          name: line,
          description: `Fresh handcrafted ${line} from Vardayini Sweet Mart.`,
          imageUrl: defaultImg,
        };
      });

      const res = await api.createCategoriesBulk(payload);
      toast.success(`Created ${res.count || payload.length} categories successfully! 🚀`);
      setIsBulkModalOpen(false);
      setBulkTextLines("");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create categories";
      toast.error(msg);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Bulk Sync from Products
  const handleBulkSyncFromProducts = async () => {
    if (missingFromProducts.length === 0) {
      toast.info("All product categories already exist in your catalog!");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload = missingFromProducts.map((name) => {
        const dept = getCategoryDepartment(name);
        return {
          name,
          description: `Store category for ${name} products.`,
          imageUrl: dept === "Sweets" ? "/images/kaju-katli.jpg" : "/images/namkeen.jpg",
        };
      });

      const res = await api.createCategoriesBulk(payload);
      toast.success(`Synced ${res.count || payload.length} missing categories from products! 🚀`);
      setIsBulkModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sync categories";
      toast.error(msg);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Select all missing presets
  const handleSelectAllMissing = () => {
    if (selectedPresetSlugs.length === missingPresets.length) {
      setSelectedPresetSlugs([]);
    } else {
      setSelectedPresetSlugs(missingPresets.map((p) => p.slug));
    }
  };

  // Stats calculation
  const totalAssignedProducts = enrichedCategories.reduce((acc, c) => acc + (c.productCount ?? 0), 0);
  const categoriesWithProducts = enrichedCategories.filter((c) => (c.productCount ?? 0) > 0).length;
  const emptyCategories = enrichedCategories.filter((c) => (c.productCount ?? 0) === 0).length;

  const sweetsCount = enrichedCategories.filter((c) => getCategoryDepartment(c.name, c.id) === "Sweets").length;
  const namkeenCount = enrichedCategories.filter((c) => getCategoryDepartment(c.name, c.id) === "Namkeen").length;
  const bakeryCount = enrichedCategories.filter((c) => getCategoryDepartment(c.name, c.id) === "Bakery").length;

  // Filtered and Sorted list
  const filteredCategories = useMemo(() => {
    return enrichedCategories
      .filter((cat) => {
        // Search filter
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matches =
            cat.name.toLowerCase().includes(q) ||
            cat.slug.toLowerCase().includes(q) ||
            (cat.description && cat.description.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Department filter
        if (departmentFilter === "empty") {
          return (cat.productCount ?? 0) === 0;
        }
        if (departmentFilter !== "all") {
          const dept = getCategoryDepartment(cat.name, cat.id);
          if (dept !== departmentFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "order") return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "products") return (b.productCount ?? 0) - (a.productCount ?? 0);
        return 0;
      });
  }, [enrichedCategories, searchQuery, departmentFilter, sortBy]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Top Banner / Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0b2f8a] via-[#123eab] to-[#071c54] p-5 sm:p-7 text-white shadow-xl shadow-[#0b2f8a]/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#dfb755]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#dfb755]/20 text-[#dfb755] border border-[#dfb755]/30">
                Shop Catalog
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live on Storefront
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Categories Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
              Organize pure desi ghee mithai, handcrafted farsan snacks, and festive gift boxes. Add single categories, bulk import sweet mart presets, or reorder display order for customer view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#0b2f8a] font-bold text-xs sm:text-sm shadow-md hover:bg-slate-50 transition cursor-pointer"
                >
                  <span className="text-base">⚡</span>
                  <span>Add All / Bulk Presets</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#dfb755] to-[#b89130] text-[#0b2f8a] font-bold text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  <span className="text-base">➕</span>
                  <span>Add Category</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/20 transition cursor-pointer"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar (Clean & Real) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Categories</p>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0b2f8a] flex items-center justify-center text-sm font-bold">
              📁
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#182230]">{categories.length}</p>
          <p className="mt-1 text-xs text-slate-500">
            {sweetsCount} Sweets • {namkeenCount} Farsan • {bakeryCount} Bakery
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cataloged Products</p>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
              🍬
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#182230]">{totalAssignedProducts || products.length}</p>
          <p className="mt-1 text-xs text-slate-500">Active SKUs categorized across store</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Status</p>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
              ✅
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-600">
            {categoriesWithProducts} Active <span className="text-xs font-normal text-slate-400">({emptyCategories} empty)</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {missingPresets.length > 0
              ? `${missingPresets.length} recommended presets available to add`
              : "All standard presets loaded"}
          </p>
        </div>
      </div>

      {/* Inline Quick Add Bar */}
      {!isReadOnly && (
        <div className="bg-white rounded-2xl border border-[#0b2f8a]/15 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0b2f8a] shrink-0">
            <span className="w-7 h-7 rounded-lg bg-[#0b2f8a]/10 flex items-center justify-center text-sm">⚡</span>
            <span>Quick Add:</span>
          </div>
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Type category name (e.g. Kesar Peda, Chikki & Gajak, Farsan)..."
              value={quickCategoryName}
              onChange={(e) => setQuickCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/20 focus:border-[#0b2f8a]"
            />
          </div>
          <button
            type="button"
            disabled={!quickCategoryName.trim() || isQuickAdding}
            onClick={handleQuickAdd}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0b2f8a] to-[#123eab] text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>➕</span>
            <span>{isQuickAdding ? "Adding..." : "Add Category"}</span>
          </button>
        </div>
      )}

      {/* Catalog & Department Selector Cards (Catalogs First Option) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. All Catalogs Card (First Option) */}
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("all");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition flex items-center justify-between text-left cursor-pointer ${
            departmentFilter === "all"
              ? "bg-purple-50/90 border-2 border-purple-500 shadow-xs ring-2 ring-purple-500/20"
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
            <div className="min-w-0">
              <span className={`text-xs font-bold block truncate ${departmentFilter === "all" ? "text-purple-700 font-extrabold" : "text-slate-800"}`}>
                All Catalogs
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate">All store categories</span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
              departmentFilter === "all" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {categories.length}
          </span>
        </button>

        {/* 2. Sweets Catalog */}
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("Sweets");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition flex items-center justify-between text-left cursor-pointer ${
            departmentFilter === "Sweets"
              ? "bg-[#dfb755]/15 border-2 border-[#dfb755] shadow-xs ring-2 ring-[#dfb755]/20"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">🍬</span>
            <div className="min-w-0">
              <span className={`text-xs font-bold block truncate ${departmentFilter === "Sweets" ? "text-[#8d6715] font-extrabold" : "text-slate-800"}`}>
                Sweets
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate">Mithai & ghee sweets</span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
              departmentFilter === "Sweets" ? "bg-[#8d6715] text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {sweetsCount}
          </span>
        </button>

        {/* 3. Namkeen & Farsan Catalog */}
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("Namkeen");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition flex items-center justify-between text-left cursor-pointer ${
            departmentFilter === "Namkeen"
              ? "bg-emerald-50 border-2 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">🥨</span>
            <div className="min-w-0">
              <span className={`text-xs font-bold block truncate ${departmentFilter === "Namkeen" ? "text-emerald-800 font-extrabold" : "text-slate-800"}`}>
                Namkeen
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate">Snacks & farsan</span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
              departmentFilter === "Namkeen" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {namkeenCount}
          </span>
        </button>

        {/* 4. Bakery Catalog */}
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("Bakery");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition flex items-center justify-between text-left cursor-pointer ${
            departmentFilter === "Bakery"
              ? "bg-orange-50 border-2 border-orange-500 shadow-xs ring-2 ring-orange-500/20"
              : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">🍞</span>
            <div className="min-w-0">
              <span className={`text-xs font-bold block truncate ${departmentFilter === "Bakery" ? "text-orange-800 font-extrabold" : "text-slate-800"}`}>
                Bakery
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate">Cookies & toasts</span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 ${
              departmentFilter === "Bakery" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {bakeryCount}
          </span>
        </button>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("all");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            departmentFilter === "all" ? "bg-white text-purple-700 font-bold shadow-xs border border-purple-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>📁</span>
          <span>All Catalogs ({categories.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("Sweets");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
            departmentFilter === "Sweets"
              ? "bg-white text-[#8d6715] font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🍬</span>
          <span>Sweets ({sweetsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("Namkeen");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
            departmentFilter === "Namkeen"
              ? "bg-white text-emerald-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🥨</span>
          <span>Namkeen & Farsan ({namkeenCount})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDepartmentFilter("Bakery");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
            departmentFilter === "Bakery"
              ? "bg-white text-orange-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🍞</span>
          <span>Bakery ({bakeryCount})</span>
        </button>
        {emptyCategories > 0 && (
          <button
            type="button"
            onClick={() => {
              setDepartmentFilter("empty");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              departmentFilter === "empty"
                ? "bg-white text-rose-700 font-bold shadow-xs"
                : "text-slate-500 hover:text-rose-600"
            }`}
          >
            <span>⚠️</span>
            <span>Empty ({emptyCategories})</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search category name, slug or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/20 focus:border-[#0b2f8a]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "order" | "name" | "products")}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#182230] focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/20 bg-white"
            >
              <option value="order">Display Order (↑ / ↓)</option>
              <option value="name">Name (A-Z)</option>
              <option value="products">Product Count (High to Low)</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "grid" ? "bg-white text-[#0b2f8a] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "table" ? "bg-white text-[#0b2f8a] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {/* Active Catalog & Department Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-blue-50/50 to-purple-50/30 border border-purple-200/80 text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">
            {departmentFilter === "all" ? "📁" : departmentFilter === "Sweets" ? "🍬" : departmentFilter === "Namkeen" ? "🥨" : departmentFilter === "Bakery" ? "🍞" : "⚠️"}
          </span>
          <span className="font-semibold text-slate-800">
            {departmentFilter === "all" ? (
              <>
                <strong className="text-purple-700">All Catalogs</strong>: Showing all <strong>{filteredCategories.length}</strong> categories across Sweets, Namkeen & Bakery
              </>
            ) : (
              <>
                Catalog: <strong className="text-[#0b2f8a]">{departmentFilter}</strong> ({filteredCategories.length} categories)
              </>
            )}
            {searchQuery && <> · matching <em>"{searchQuery}"</em></>}
          </span>
        </div>

        {departmentFilter !== "all" && (
          <button
            type="button"
            onClick={() => {
              setDepartmentFilter("all");
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>📁</span>
            <span>Show All Catalogs ({categories.length})</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <span className="text-4xl">📁</span>
          <h3 className="mt-3 text-base font-bold text-slate-800">No categories found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No category matches "${searchQuery}"`
              : "Get started by adding your first category or clicking 'Add All / Bulk Presets'."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#0b2f8a] text-[#0b2f8a] font-bold text-xs shadow-xs hover:bg-blue-50 transition cursor-pointer"
                >
                  ⚡ Add All Presets
                </button>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 rounded-xl bg-[#0b2f8a] text-white font-semibold text-xs shadow-md hover:bg-[#082266] transition cursor-pointer"
                >
                  ➕ Add Category
                </button>
              </>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCategories.map((cat, idx) => {
            const dept = getCategoryDepartment(cat.name, cat.id);
            const deptColor =
              dept === "Sweets"
                ? "bg-[#dfb755]/15 text-[#8d6715] border-[#dfb755]/30"
                : dept === "Namkeen"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-orange-50 text-orange-800 border-orange-200";

            return (
              <div
                key={cat.id}
                className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  {/* Category Header Image */}
                  <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                    <Image
                      src={cat.imageUrl || "/images/kaju-katli.jpg"}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    {/* Department Badge */}
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase backdrop-blur-md border ${deptColor}`}
                    >
                      {dept === "Sweets" ? "🍬 Sweets" : dept === "Namkeen" ? "🥨 Farsan" : "🍞 Bakery"}
                    </span>

                    {/* Reordering Buttons Overlay */}
                    {!isReadOnly && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/20">
                        <button
                          type="button"
                          disabled={idx === 0 && currentPage === 1}
                          onClick={() => handleReorder(cat, "up")}
                          className="w-5 h-5 flex items-center justify-center text-white text-[11px] hover:text-[#dfb755] disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <span className="text-[10px] text-white/70 font-mono font-bold px-0.5">#{cat.sortOrder ?? 0}</span>
                        <button
                          type="button"
                          disabled={idx === paginatedCategories.length - 1}
                          onClick={() => handleReorder(cat, "down")}
                          className="w-5 h-5 flex items-center justify-center text-white text-[11px] hover:text-[#dfb755] disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>
                    )}

                    {/* Title on image overlay */}
                    <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white drop-shadow-sm">
                          {cat.name}
                        </h3>
                        <code className="text-[10px] text-[#dfb755] font-mono tracking-tight">
                          /{cat.slug}
                        </code>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0b2f8a] text-white shadow-xs shrink-0">
                        {cat.productCount ?? 0} {cat.productCount === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-3.5">
                    <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                      {cat.description || "Fresh and authentic sweets crafted with pure ingredients."}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3.5 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => onSelectCategoryFilter?.(cat.slug)}
                    className="text-xs font-semibold text-[#0b2f8a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Products ({cat.productCount ?? 0})</span>
                    <span>→</span>
                  </button>

                  {!isReadOnly ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(cat)}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      👁️ View Only
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 text-center">Order</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Department</th>
                  <th className="py-3 px-3.5">Slug</th>
                  <th className="py-3 px-3.5">Description</th>
                  <th className="py-3 px-3.5 text-center">Products</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#182230]">
                {paginatedCategories.map((cat, idx) => {
                  const dept = getCategoryDepartment(cat.name, cat.id);
                  const deptColor =
                    dept === "Sweets"
                      ? "bg-[#dfb755]/15 text-[#8d6715] border-[#dfb755]/30"
                      : dept === "Namkeen"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-orange-50 text-orange-800 border-orange-200";

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                      {/* Reorder Buttons & Sort Order */}
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-600">
                          {!isReadOnly && (
                            <button
                              type="button"
                              disabled={idx === 0 && currentPage === 1 || isReorderingId === cat.id}
                              onClick={() => handleReorder(cat, "up")}
                              className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              ▲
                            </button>
                          )}
                          <span>#{cat.sortOrder ?? 0}</span>
                          {!isReadOnly && (
                            <button
                              type="button"
                              disabled={idx === paginatedCategories.length - 1 || isReorderingId === cat.id}
                              onClick={() => handleReorder(cat, "down")}
                              className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Category Name & Image */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Image
                              src={cat.imageUrl || "/images/kaju-katli.jpg"}
                              alt={cat.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-[#0b2f8a] block">{cat.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${deptColor}`}>
                          {dept === "Sweets" ? "🍬 Sweets" : dept === "Namkeen" ? "🥨 Farsan" : "🍞 Bakery"}
                        </span>
                      </td>

                      {/* Slug */}
                      <td className="py-2.5 px-3.5">
                        <code className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                          /{cat.slug}
                        </code>
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate text-[11px]">
                        {cat.description || "—"}
                      </td>

                      {/* Products Count */}
                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectCategoryFilter?.(cat.slug)}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0b2f8a]/10 text-[#0b2f8a] hover:bg-[#0b2f8a]/20 transition cursor-pointer"
                        >
                          {cat.productCount ?? 0} Items →
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right">
                        {!isReadOnly ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cat)}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(cat)}
                              className="px-2 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            👁️ View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
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

      {/* Bulk Add / Sweet Mart Presets Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b89130]">
                  ⚡ Fast Catalog Architecture
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#0b2f8a]">
                  Add Store Categories
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="mt-4 flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBulkTab("presets")}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  bulkTab === "presets" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏛️ Sweet Mart Presets ({missingPresets.length} missing)
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("paste")}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  bulkTab === "paste" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📝 Paste Custom Names
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("sync")}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  bulkTab === "sync" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🔄 Sync from Products ({missingFromProducts.length})
              </button>
            </div>

            {/* Tab 1: Sweet Mart Presets */}
            {bulkTab === "presets" && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    Select from 23 standard Gujarati Sweet Mart departments:
                  </span>
                  {missingPresets.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllMissing}
                      className="text-xs font-bold text-[#0b2f8a] hover:underline cursor-pointer"
                    >
                      {selectedPresetSlugs.length === missingPresets.length ? "Deselect All" : "Select All Missing"}
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2.5">
                  {SWEET_MART_CATEGORY_PRESETS.map((preset) => {
                    const alreadyExists =
                      existingCategoryNames.has(preset.name.toLowerCase()) ||
                      existingCategorySlugs.has(preset.slug.toLowerCase());
                    const isChecked = selectedPresetSlugs.includes(preset.slug);

                    return (
                      <label
                        key={preset.slug}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer pt-2 ${
                          alreadyExists
                            ? "opacity-60 bg-slate-50 cursor-not-allowed"
                            : isChecked
                            ? "bg-blue-50/70 border border-blue-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            disabled={alreadyExists}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPresetSlugs((prev) => [...prev, preset.slug]);
                              } else {
                                setSelectedPresetSlugs((prev) => prev.filter((s) => s !== preset.slug));
                              }
                            }}
                            className="rounded text-[#0b2f8a] focus:ring-[#0b2f8a]"
                          />
                          <span className="text-base">{preset.icon}</span>
                          <div>
                            <span className="font-bold text-[#182230]">{preset.name}</span>
                            <span className="text-[10px] text-slate-500 block">{preset.description}</span>
                          </div>
                        </div>

                        <div>
                          {alreadyExists ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Already Added
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {preset.department}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedPresetSlugs.length} preset categories selected
                  </span>
                  <button
                    type="button"
                    disabled={selectedPresetSlugs.length === 0 || isBulkSubmitting}
                    onClick={handleBulkAddPresets}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0b2f8a] to-[#123eab] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    {isBulkSubmitting ? "Adding..." : `Add Selected (${selectedPresetSlugs.length}) Categories 🚀`}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Paste Custom Names */}
            {bulkTab === "paste" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paste Category Names (One per line)
                  </label>
                  <textarea
                    rows={6}
                    placeholder={"Kaju Katli Specials\nKesar Mohanthal\nFarali Chavanu\nMawa Ghari"}
                    value={bulkTextLines}
                    onChange={(e) => setBulkTextLines(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Each line becomes a new category with an auto-generated URL slug and default sweet mart photo.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {
                      bulkTextLines
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean).length
                    }{" "}
                    categories to create
                  </span>
                  <button
                    type="button"
                    disabled={
                      isBulkSubmitting ||
                      bulkTextLines
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean).length === 0
                    }
                    onClick={handleBulkAddFromText}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0b2f8a] to-[#123eab] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    {isBulkSubmitting ? "Creating..." : "Create All Categories 🚀"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Sync from Products */}
            {bulkTab === "sync" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Scans all {products.length} products in your catalog. If any product is assigned to a category name that does not exist in your Categories table yet, it will create it instantly.
                </p>

                {missingFromProducts.length > 0 ? (
                  <div className="border border-amber-200 bg-amber-50 rounded-2xl p-3.5 space-y-2">
                    <p className="text-xs font-bold text-amber-900">
                      Found {missingFromProducts.length} missing categories in your products:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingFromProducts.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-full bg-white border border-amber-300 text-xs font-bold text-amber-900"
                        >
                          + {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 text-center">
                    <span className="text-2xl">🎉</span>
                    <p className="text-xs font-bold text-emerald-900 mt-1">100% Synchronized!</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      All categories used by your products are already created in your Categories table.
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={missingFromProducts.length === 0 || isBulkSubmitting}
                    onClick={handleBulkSyncFromProducts}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isBulkSubmitting ? "Syncing..." : `Sync ${missingFromProducts.length} Missing Categories 🚀`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b89130]">
                  {editingCategory ? "Edit Category Details" : "New Collection"}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#0b2f8a]">
                  {editingCategory ? `Update "${editingCategory.name}"` : "Create Category"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#182230] font-semibold mb-1">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kaju Katli Specials, Farali Namkeen"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#182230] font-semibold mb-1">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kaju-katli-specials"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                  />
                  <p className="mt-0.5 text-[10px] text-slate-400">URL: `/shop?category={slug || "slug"}`</p>
                </div>
              </div>

              <div>
                <label className="block text-[#182230] font-semibold mb-1">Sort Order / Priority</label>
                <input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full sm:w-36 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                />
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Controls order on `/shop` navigation tabs (lower numbers appear first).
                </p>
              </div>

              <div>
                <label className="block text-[#182230] font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Royal cashew diamond sweets handcrafted with pure shuddh ghee."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0b2f8a]/20 focus:outline-none"
                />
              </div>

              {/* Quick Image Presets */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[#182230] font-semibold text-[11px]">
                  Quick Sweet Mart Image Presets:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {IMAGE_PRESETS.map((p) => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => setImageUrl(p.url)}
                      className={`relative h-14 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        imageUrl === p.url
                          ? "border-[#0b2f8a] ring-2 ring-[#0b2f8a]/20 scale-105"
                          : "border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <Image src={p.url} alt={p.label} fill sizes="60px" className="object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image Picker Field Integration */}
              <ImagePickerField
                label="Custom Image or URL"
                value={imageUrl}
                onChange={(newUrl) => setImageUrl(newUrl)}
                helperText="Or upload a custom photo for this category."
              />

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-3">
              ⚠️
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-center text-[#182230]">
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

            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
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
