import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { listCategories, listProducts, CATEGORY_GROUPS } from "@/lib/products";
import { ShopDepartmentSidebar } from "@/components/shop-department-sidebar";
import { ShowingDropdown } from "@/components/showing-dropdown";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    group?: string;
    search?: string;
    sort?: string;
    tag?: string;
    minPrice?: string;
    maxPrice?: string;
    limit?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

  const [categories, allProducts, products] = await Promise.all([
    listCategories(),
    listProducts({}),
    listProducts({
      category: params.category,
      group: params.group,
      search: params.search,
      sort: params.sort,
      tag: params.tag,
    }),
  ]);

  // Compute live counts for each specific category
  const categoryCounts: Record<string, number> = {};
  for (const cat of categories) {
    categoryCounts[cat.slug] = allProducts.filter((p) => p.categorySlug === cat.slug).length;
  }

  // Compute live counts for top-level departments
  const departmentCounts: Record<string, number> = {
    sweets: allProducts.filter((p) => CATEGORY_GROUPS.sweets?.slugs.includes(p.categorySlug)).length,
    namkeen: allProducts.filter((p) => CATEGORY_GROUPS.namkeen?.slugs.includes(p.categorySlug)).length,
    bakery: allProducts.filter((p) => CATEGORY_GROUPS.bakery?.slugs.includes(p.categorySlug)).length,
  };

  // Determine active department group if a specific category is chosen
  const activeGroup =
    params.group ||
    (params.category === "namkeen-farsan" || params.category === "farsan"
      ? "namkeen"
      : params.category === "gift-hampers" || params.category === "hampers"
      ? "sweets"
      : params.category
      ? Object.keys(CATEGORY_GROUPS).find((g) =>
          CATEGORY_GROUPS[g].slugs.includes(params.category!)
        )
      : undefined);

  const activeCategoryObj = params.category
    ? categories.find((c) => c.slug === params.category)
    : null;

  // Apply price filtering
  let filteredProducts = products;
  if (minPrice !== undefined) {
    filteredProducts = filteredProducts.filter((p) => p.fromPrice >= minPrice);
  }
  if (maxPrice !== undefined) {
    filteredProducts = filteredProducts.filter((p) => p.fromPrice <= maxPrice);
  }

  // Pagination & "Showing" Limit (default: 9, options: 9, 15, 24)
  const limitParam = params.limit || "9";
  const limit = limitParam === "all" ? filteredProducts.length : Number(limitParam);
  const currentPage = Math.max(1, Number(params.page || 1));
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / (limit || 1)));
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const buildPaginationUrl = (pageNumber: number) => {
    const q = new URLSearchParams({
      ...(params.category ? { category: params.category } : {}),
      ...(params.group ? { group: params.group } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.minPrice ? { minPrice: params.minPrice } : {}),
      ...(params.maxPrice ? { maxPrice: params.maxPrice } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      page: String(pageNumber),
    });
    return `/shop?${q.toString()}`;
  };

  const heading = params.search
    ? `Results for “${params.search}”`
    : activeCategoryObj
      ? activeCategoryObj.name
      : activeGroup && CATEGORY_GROUPS[activeGroup]
        ? CATEGORY_GROUPS[activeGroup].label
        : "Traditional Sweets, Namkeen & Bakery";

  const subHeading = activeCategoryObj
    ? `Handcrafted fresh in Vadodara · Authentic purity in every bite`
    : activeGroup && CATEGORY_GROUPS[activeGroup]
      ? CATEGORY_GROUPS[activeGroup].description
      : "100% Shuddh Desi Ghee Mithai, Crunchy Farsan & Bakery Delights";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 box-border">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0b2f8a]">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        {activeGroup && (
          <>
            <span>/</span>
            <Link href={`/shop?group=${activeGroup}`} className="hover:underline">
              {CATEGORY_GROUPS[activeGroup]?.label}
            </Link>
          </>
        )}
        {activeCategoryObj && (
          <>
            <span>/</span>
            <span className="text-[#8d6715]">{activeCategoryObj.name}</span>
          </>
        )}
      </div>

      {/* Main Page Title Header & Search Bar */}
      <div className="mt-3 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#0b2f8a]/10 pb-6 w-full">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0b2f8a]">
            {heading}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#182230]/75">
            {subHeading} ·{" "}
            <strong className="text-[#0b2f8a] font-semibold">
              {filteredProducts.length} items
            </strong>{" "}
            available
          </p>
        </div>

        {/* Search & Sort Form */}
        <form className="flex flex-wrap items-center gap-2 sm:gap-2.5 max-w-full">
          {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
          {params.group && !params.category ? <input type="hidden" name="group" value={params.group} /> : null}
          {params.minPrice ? <input type="hidden" name="minPrice" value={params.minPrice} /> : null}
          {params.maxPrice ? <input type="hidden" name="maxPrice" value={params.maxPrice} /> : null}
          {params.limit ? <input type="hidden" name="limit" value={params.limit} /> : null}

          <div className="relative min-w-[160px] sm:min-w-[200px] flex-1 sm:flex-initial">
            <input
              name="search"
              defaultValue={params.search}
              placeholder="Search mithai or farsan..."
              className="w-full rounded-xl border border-[#0b2f8a]/15 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#182230] shadow-2xs outline-none focus:border-[#0b2f8a]"
            />
          </div>
          <select
            name="sort"
            defaultValue={params.sort || ""}
            className="rounded-xl border border-[#0b2f8a]/15 bg-white px-3 py-2 text-xs sm:text-sm text-[#182230] shadow-2xs outline-none focus:border-[#0b2f8a]"
          >
            <option value="">Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-[#0b2f8a] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-[#082266] transition cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {/* 2-Column Responsive Layout: Left Sidebar + Right Products Grid */}
      <div className="mt-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
        {/* Left Column: Categories & Filter by Price Sidebar */}
        <div className="w-full lg:w-64 xl:w-72 2xl:w-80 shrink-0">
          <ShopDepartmentSidebar
            categories={categories}
            totalProductsCount={allProducts.length}
            categoryCounts={categoryCounts}
            departmentCounts={departmentCounts}
            activeCategory={params.category}
            activeGroup={activeGroup}
            activeMinPrice={minPrice}
            activeMaxPrice={maxPrice}
          />
        </div>

        {/* Right Column: Active Chips, Showing Bar & Product Grid */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Active Filter Chips Bar */}
          {(params.category || activeGroup || minPrice !== undefined || maxPrice !== undefined || params.search) && (
            <div className="p-3.5 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-2xs flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Active Filters:</span>

              {activeCategoryObj && (
                <Link
                  href={activeGroup ? `/shop?group=${activeGroup}` : "/shop"}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[#dfb755] text-slate-900 flex items-center gap-1.5 hover:opacity-90"
                >
                  <span>Category: {activeCategoryObj.name}</span>
                  <span className="font-mono">✕</span>
                </Link>
              )}

              {activeGroup && !activeCategoryObj && (
                <Link
                  href="/shop"
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[#0b2f8a] text-white flex items-center gap-1.5 hover:opacity-90"
                >
                  <span>Department: {CATEGORY_GROUPS[activeGroup]?.label}</span>
                  <span className="font-mono">✕</span>
                </Link>
              )}

              {(minPrice !== undefined || maxPrice !== undefined) && (
                <Link
                  href={`/shop?${new URLSearchParams({
                    ...(params.category ? { category: params.category } : {}),
                    ...(params.group ? { group: params.group } : {}),
                    ...(params.search ? { search: params.search } : {}),
                    ...(params.sort ? { sort: params.sort } : {}),
                    ...(params.limit ? { limit: params.limit } : {}),
                  }).toString()}`}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-white flex items-center gap-1.5 hover:opacity-90"
                >
                  <span>
                    Price: {minPrice !== undefined ? `₹${minPrice}` : "₹0"} –{" "}
                    {maxPrice !== undefined ? `₹${maxPrice}` : "Any"}
                  </span>
                  <span className="font-mono">✕</span>
                </Link>
              )}

              {params.search && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                  Search: &ldquo;{params.search}&rdquo;
                </span>
              )}

              <Link
                href="/shop"
                className="ml-auto text-xs font-bold text-rose-600 hover:underline px-2"
              >
                Clear All
              </Link>
            </div>
          )}

          {/* Showing Toolbar matching User Screenshot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-2xs">
            <div className="text-xs text-slate-600 font-medium">
              Showing{" "}
              <strong className="text-slate-900 font-bold">
                {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
              </strong>{" "}
              of <strong className="text-[#0b2f8a] font-bold">{totalItems}</strong> products
            </div>

            {/* Showing: 9, 15, 24 Dropdown */}
            <div className="flex items-center gap-2.5">
              <ShowingDropdown currentLimit={params.limit} />
            </div>
          </div>

          {/* Product Cards Grid: 1 col on mobile, 2 cols on tablet/laptop, 3 cols on desktop */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6 border-t border-[#0b2f8a]/10">
              {currentPage > 1 && (
                <Link
                  href={buildPaginationUrl(currentPage - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition"
                >
                  ← Previous
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === currentPage;
                return (
                  <Link
                    key={p}
                    href={buildPaginationUrl(p)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                      isCurrent
                        ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}

              {currentPage < totalPages && (
                <Link
                  href={buildPaginationUrl(currentPage + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition"
                >
                  Next →
                </Link>
              )}
            </div>
          )}

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-16 rounded-3xl bg-white border border-[#0b2f8a]/10 p-8 shadow-sm">
              <span className="text-4xl">🍬</span>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a] mt-2">
                No items found
              </h3>
              <p className="mt-2 text-sm text-[#182230]/70 max-w-md mx-auto">
                We couldn&apos;t find any sweets or farsan matching your current category and price filters.
              </p>
              <Link
                href="/shop"
                className="mt-5 inline-block rounded-xl bg-[#0b2f8a] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#082266] transition"
              >
                Reset All Filters &amp; View All
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
