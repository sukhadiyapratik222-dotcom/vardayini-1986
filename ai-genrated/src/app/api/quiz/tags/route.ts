import { NextRequest } from "next/server";
import { autoTagCatalogProducts, ensureQuizDataSeeded } from "@/lib/taste-quiz";
import { db } from "@/db";
import { products, productQuizTags, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureQuizDataSeeded();
  try {
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        categoryName: categories.name,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        isActive: products.isActive,
        tagId: productQuizTags.id,
        sweetnessLevel: productQuizTags.sweetnessLevel,
        containsNuts: productQuizTags.containsNuts,
        mithaiType: productQuizTags.mithaiType,
        occasions: productQuizTags.occasions,
        dietaryTags: productQuizTags.dietaryTags,
        texture: productQuizTags.texture,
        quizDescription: productQuizTags.quizDescription,
        isFeaturedInQuiz: productQuizTags.isFeaturedInQuiz,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productQuizTags, eq(products.id, productQuizTags.productId))
      .where(eq(products.isArchived, false))
      .orderBy(products.id);

    const untaggedCount = allProducts.filter((p) => !p.tagId).length;

    return Response.json({
      success: true,
      products: allProducts,
      stats: {
        total: allProducts.length,
        tagged: allProducts.length - untaggedCount,
        untagged: untaggedCount,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load product tags" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, tags, bulkTags } = body;

    // Handle bulk update
    if (Array.isArray(bulkTags)) {
      for (const item of bulkTags) {
        if (!item.productId) continue;
        await upsertTags(item.productId, item);
      }
      return Response.json({ success: true, message: `Updated ${bulkTags.length} products` });
    }

    // Handle single update
    if (!productId) {
      return Response.json({ error: "productId is required" }, { status: 400 });
    }

    await upsertTags(productId, tags || body);
    return Response.json({ success: true, message: "Product tags updated successfully" });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to save tags" }, { status: 500 });
  }
}

// POST endpoint triggers auto-tagging
export async function POST() {
  try {
    const res = await autoTagCatalogProducts();
    return Response.json({
      success: true,
      message: `Auto-tagged ${res.tagged} products based on traditional ingredients and recipes!`,
      taggedCount: res.tagged,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Auto-tagging failed" }, { status: 500 });
  }
}

async function upsertTags(productId: number, data: any) {
  const [existing] = await db
    .select()
    .from(productQuizTags)
    .where(eq(productQuizTags.productId, productId))
    .limit(1);

  const payload = {
    productId,
    sweetnessLevel: data.sweetnessLevel || "medium",
    containsNuts: data.containsNuts || "no",
    mithaiType: data.mithaiType || "dry",
    occasions: Array.isArray(data.occasions)
      ? data.occasions.join(",")
      : data.occasions || "everyday",
    dietaryTags: Array.isArray(data.dietaryTags)
      ? data.dietaryTags.join(",")
      : data.dietaryTags || "pure_ghee",
    texture: data.texture || "soft_melt",
    quizDescription: data.quizDescription || null,
    isFeaturedInQuiz: Boolean(data.isFeaturedInQuiz),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(productQuizTags)
      .set(payload)
      .where(eq(productQuizTags.productId, productId));
  } else {
    await db.insert(productQuizTags).values(payload);
  }
}

