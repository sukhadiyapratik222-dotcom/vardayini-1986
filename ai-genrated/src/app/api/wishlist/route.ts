import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, productVariants, wishlistItems } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getAuthUser();
  if (!user) return Response.json({ items: [] });

  const items = await db
    .select({
      id: wishlistItems.id,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(wishlistItems.userId, user.id))
    .orderBy(desc(wishlistItems.createdAt));

  const pVariants = await db.select().from(productVariants);
  const variantsByProduct = new Map<number, typeof pVariants>();
  for (const v of pVariants) {
    if (!variantsByProduct.has(v.productId)) variantsByProduct.set(v.productId, []);
    variantsByProduct.get(v.productId)!.push(v);
  }

  const enhancedItems = items.map((item) => {
    const list = variantsByProduct.get(item.productId) || [];
    const defaultVariant = list.find((v) => v.isDefault) || list[0] || null;
    const price = defaultVariant ? defaultVariant.price : 350;
    const discountedPrice = defaultVariant ? defaultVariant.discountedPrice : null;
    const stock = defaultVariant ? defaultVariant.stock : 50;
    const variantId = defaultVariant ? defaultVariant.id : null;
    const weight = defaultVariant ? defaultVariant.weight : "500g";

    let stockBadge = "In Stock";
    let stockBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (stock <= 0) {
      stockBadge = "Out of Stock";
      stockBadgeColor = "text-rose-700 bg-rose-50 border-rose-200";
    } else if (stock <= 2) {
      stockBadge = `Only ${stock} Left`;
      stockBadgeColor = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (stock <= 5) {
      stockBadge = "Low Stock";
      stockBadgeColor = "text-amber-700 bg-amber-50 border-amber-200";
    }

    return {
      ...item,
      variantId,
      weight,
      price,
      discountedPrice,
      stock,
      stockBadge,
      stockBadgeColor,
    };
  });

  return Response.json({ items: enhancedItems });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Please log in to save favourites." }, { status: 401 });
  const body = (await request.json()) as { productId?: number };
  if (!body.productId) return Response.json({ error: "productId required" }, { status: 400 });
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, body.productId)))
    .limit(1);
  if (existing) {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
    return Response.json({ saved: false });
  }
  await db.insert(wishlistItems).values({ userId: user.id, productId: body.productId });
  return Response.json({ saved: true });
}
