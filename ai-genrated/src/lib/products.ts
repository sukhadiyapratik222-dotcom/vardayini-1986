import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, productVariants, reviews } from "@/db/schema";
import { unitPrice } from "@/lib/money";
import { ensureSeeded } from "@/db/seed";

export const CATEGORY_GROUPS: Record<
  string,
  { label: string; description: string; slugs: string[] }
> = {
  sweets: {
    label: "Sweets",
    description: "Royal Kaju, pure mawa pedas & fragrant desi ghee mithai",
    slugs: [
      "kaju-sweets",
      "mawa-sweets",
      "penda",
      "sugarless-sweets",
      "premium-packed-sweets",
      "indian-ghee-sweets",
    ],
  },
  namkeen: {
    label: "Namkeen",
    description: "Crunchy sev, traditional khakhra, farali & Gujarati farsan",
    slugs: [
      "millet",
      "farali",
      "gujarati",
      "khakhra",
      "roasted",
      "mixture",
      "indian",
      "daal-lentil",
      "sev",
      "chips-and-puris",
    ],
  },
  bakery: {
    label: "Bakery",
    description: "Crispy maska khari, buttery biscuits & fresh cookies",
    slugs: ["biscuits-and-cookies", "toast-and-khari"],
  },
};

export async function listCategories() {
  await ensureSeeded();
  return db.select().from(categories).orderBy(categories.sortOrder);
}

export async function listProducts(opts: {
  category?: string;
  group?: string;
  search?: string;
  sort?: string;
  tag?: string;
  featured?: boolean;
  limit?: number;
  ids?: number[];
}) {
  await ensureSeeded();
  const conditions = [];
  if (opts.ids && opts.ids.length > 0) {
    conditions.push(inArray(products.id, opts.ids));
  }
  if (opts.category) {
    if (opts.category === "namkeen-farsan" || opts.category === "farsan") {
      conditions.push(inArray(categories.slug, CATEGORY_GROUPS.namkeen.slugs));
    } else if (opts.category === "gift-hampers" || opts.category === "hampers") {
      conditions.push(eq(categories.slug, "premium-packed-sweets"));
    } else {
      conditions.push(eq(categories.slug, opts.category));
    }
  } else if (opts.group && CATEGORY_GROUPS[opts.group.toLowerCase()]) {
    conditions.push(
      inArray(categories.slug, CATEGORY_GROUPS[opts.group.toLowerCase()].slugs)
    );
  }
  if (opts.search) {
    const raw = opts.search.trim();
    const q = `%${raw}%`;
    const searchTerms = [q];
    if (/penda/i.test(raw)) {
      searchTerms.push(`%${raw.replace(/penda/gi, "peda")}%`);
    } else if (/peda/i.test(raw)) {
      searchTerms.push(`%${raw.replace(/peda/gi, "penda")}%`);
    }
    const searchConditions = searchTerms.flatMap((term) => [
      ilike(products.name, term),
      ilike(products.description, term),
      ilike(products.tags, term),
      ilike(categories.name, term),
      ilike(categories.slug, term),
    ]);
    conditions.push(or(...searchConditions));
  }
  if (opts.tag) conditions.push(ilike(products.tags, `%${opts.tag}%`));
  if (opts.featured) conditions.push(eq(products.isFeatured, true));

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      tags: products.tags,
      isFeatured: products.isFeatured,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(opts.sort === "name" ? products.name : desc(products.isFeatured), products.name);

  const variants = await db.select().from(productVariants);
  const byProduct = new Map<number, typeof variants>();
  for (const variant of variants) {
    const list = byProduct.get(variant.productId) ?? [];
    list.push(variant);
    byProduct.set(variant.productId, list);
  }

  let result = rows.map((row) => {
    const list = byProduct.get(row.id) ?? [];
    const cheapest = [...list].sort((a, b) => unitPrice(a.price, a.discountedPrice) - unitPrice(b.price, b.discountedPrice))[0];
    return {
      ...row,
      variants: list,
      fromPrice: cheapest ? unitPrice(cheapest.price, cheapest.discountedPrice) : 0,
      comparePrice: cheapest && cheapest.discountedPrice ? cheapest.price : null,
    };
  });

  if (opts.sort === "price_asc") result = result.sort((a, b) => a.fromPrice - b.fromPrice);
  if (opts.sort === "price_desc") result = result.sort((a, b) => b.fromPrice - a.fromPrice);
  if (opts.ids && opts.ids.length > 0 && !opts.sort) {
    const idOrder = new Map(opts.ids.map((id, index) => [id, index]));
    result.sort((a, b) => (idOrder.get(a.id) ?? 9999) - (idOrder.get(b.id) ?? 9999));
  }
  if (opts.limit) result = result.slice(0, opts.limit);
  return result;
}

export async function getProductBySlug(slug: string) {
  await ensureSeeded();
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      tags: products.tags,
      isFeatured: products.isFeatured,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);
  if (!product) return null;
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));
  const reviewRows = await db.select().from(reviews).where(eq(reviews.productId, product.id));
  const avg =
    reviewRows.length === 0
      ? 0
      : Math.round((reviewRows.reduce((sum, row) => sum + row.rating, 0) / reviewRows.length) * 10) / 10;
  return { ...product, variants, reviews: reviewRows, avgRating: avg };
}

export async function searchSuggestions(q: string) {
  if (!q.trim()) return [];
  return db
    .select({
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .where(or(ilike(products.name, `%${q}%`), ilike(products.tags, `%${q}%`)))
    .limit(6);
}

export async function ratingMap(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, number>();
  const rows = await db
    .select({
      productId: reviews.productId,
      avg: sql<number>`avg(${reviews.rating})`,
    })
    .from(reviews)
    .groupBy(reviews.productId);
  return new Map(rows.map((row) => [row.productId, Number(row.avg)]));
}
