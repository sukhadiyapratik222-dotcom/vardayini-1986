import { listCategories, listProducts, getRealTopSellingProducts } from "@/lib/products";
import { HomePageClient } from "@/components/home-page-client";
import { db } from "@/db";
import { stores, reviews, users, products, addresses } from "@/db/schema";
import { getUiConfigSafe } from "@/lib/ui-config";
import { ensureSeeded } from "@/db/seed";
import { desc, eq, sql } from "drizzle-orm";
import {
  resolveCustomerLocation,
  isAuthenticReview,
  DEFAULT_VERIFIED_REVIEWS,
} from "@/lib/reviews-data";
import { safeIsoDate } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const uiConfig = getUiConfigSafe();
  const specialConfig = uiConfig?.specialItems ?? {
    enabled: true,
    badge: "Customers' Special Selection",
    title: "Our Special Items",
    subtitle: "Prepared fresh every morning with 100% Shuddh Desi Ghee. Handcrafted Gujarati delicacies.",
    productIds: [1, 2, 4, 6],
    linkText: "See all 24+ items →",
    linkUrl: "/shop",
  };

  const specialIds: number[] =
    Array.isArray(specialConfig.productIds) && specialConfig.productIds.length > 0
      ? specialConfig.productIds
      : [];

  const [categories, featured, bestsellers, specialProducts, storeRows, reviewRows, realTopSellers] = await Promise.all([
    listCategories(),
    listProducts({ featured: true, limit: 8 }),
    listProducts({ tag: "best_seller", limit: 15 }),
    specialIds.length > 0
      ? listProducts({ ids: specialIds })
      : listProducts({ featured: true, limit: 4 }),
    db.select().from(stores).orderBy(stores.id).catch(() => []),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
        name: sql<string>`coalesce(${users.name}, ${reviews.userName}, 'Valued Patron')`,
        city: sql<string>`coalesce(${addresses.city}, 'Gujarat')`,
        productName: products.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(addresses, eq(users.id, addresses.userId))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .catch(() => []),
    getRealTopSellingProducts(8).catch(() => []),
  ]);

  // Deduplicate reviews and format authentic verified customer reviews
  const seenReviews = new Set<number>();
  let uniqueReviews = reviewRows
    .filter((r) => {
      if (seenReviews.has(r.id)) return false;
      seenReviews.add(r.id);
      return isAuthenticReview(r.name, r.comment);
    })
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      location: resolveCustomerLocation(r.name, r.city),
      rating: r.rating,
      quote: r.comment,
      productName: r.productName || undefined,
      isVerified: r.isVerified ?? true,
      createdAt: safeIsoDate(r.createdAt, new Date().toISOString())!,
    }));

  // Retain only authentic real customer reviews. When the admin deletes all reviews, do not resurrect mock/default reviews.
  const bestsellersConfig = uiConfig?.bestsellersSection;
  const autoCalculate = bestsellersConfig?.autoCalculateFromSales !== false;

  const testimonialsConfig = uiConfig?.testimonialsSection;
  const autoRealReviews = testimonialsConfig?.autoShowRealReviews !== false;

  const enrichedUiConfig = {
    ...uiConfig,
    bestsellersSection: {
      ...bestsellersConfig,
      enabled: bestsellersConfig?.enabled ?? true,
      autoCalculateFromSales: autoCalculate,
      badge: bestsellersConfig?.badge || "MOST LOVED",
      title: bestsellersConfig?.title || "CUSTOMER BESTSELLERS",
      viewAllText: bestsellersConfig?.viewAllText || "Explore All Kalol Bestsellers",
      viewAllUrl: bestsellersConfig?.viewAllUrl || "/shop?tag=best_seller",
      items:
        autoCalculate && realTopSellers.length > 0
          ? realTopSellers.slice(0, 4)
          : bestsellersConfig?.items && bestsellersConfig.items.length > 0
          ? bestsellersConfig.items
          : realTopSellers.slice(0, 4),
      realSalesRankings: realTopSellers,
    },
    testimonialsSection: {
      ...testimonialsConfig,
      enabled: testimonialsConfig?.enabled ?? true,
      autoShowRealReviews: autoRealReviews,
      badge: testimonialsConfig?.badge || "TESTIMONIALS",
      title: testimonialsConfig?.title || "WHAT OUR CUSTOMERS SAY",
      subtitle:
        testimonialsConfig?.subtitle ||
        "Real verified reviews from our patrons across Gujarat and India",
      showTrustBadge: testimonialsConfig?.showTrustBadge ?? true,
      trustBadgeText:
        testimonialsConfig?.trustBadgeText ||
        "Over 1,850+ verified reviews across Kalol, Gujarat & Pan-India",
      reviews: autoRealReviews
        ? uniqueReviews
        : testimonialsConfig?.reviews || [],
      realDbReviews: uniqueReviews,
    },
  };

  return (
    <main className="w-full min-h-screen">
      <HomePageClient
        categories={categories}
        featured={featured}
        bestsellers={bestsellers}
        specialItemsConfig={specialConfig}
        specialProducts={specialProducts}
        stores={storeRows}
        reviews={uniqueReviews}
        uiConfig={enrichedUiConfig}
      />
    </main>
  );
}
