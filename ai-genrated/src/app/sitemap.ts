import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsPages, products } from "@/db/schema";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/festivals", changeFrequency: "weekly", priority: 0.8 },
  { path: "/new-arrivals", changeFrequency: "weekly", priority: 0.7 },
  { path: "/new-launches", changeFrequency: "weekly", priority: 0.7 },
  { path: "/new-products", changeFrequency: "weekly", priority: 0.7 },
  { path: "/stores", changeFrequency: "monthly", priority: 0.6 },
  { path: "/policies", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: new URL(route.path, base).toString(),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ slug: products.slug, createdAt: products.createdAt })
      .from(products);

    productEntries = rows.map((row) => ({
      url: new URL(`/shop/${row.slug}`, base).toString(),
      lastModified: row.createdAt ?? now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (error) {
    console.error("[Sitemap] Failed to load products:", error);
  }

  let pageEntries: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ slug: cmsPages.slug, updatedAt: cmsPages.updatedAt })
      .from(cmsPages)
      .where(eq(cmsPages.isPublished, true));

    pageEntries = rows.map((row) => ({
      url: new URL(`/pages/${row.slug}`, base).toString(),
      lastModified: row.updatedAt ?? now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));
  } catch (error) {
    console.error("[Sitemap] Failed to load CMS pages:", error);
  }

  return [...staticEntries, ...productEntries, ...pageEntries];
}
