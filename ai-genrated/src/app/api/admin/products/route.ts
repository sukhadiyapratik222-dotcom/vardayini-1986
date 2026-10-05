import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, categories } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe, parsePositiveInt, parseNonNegativeInt } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const allProducts = await db
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
      variantId: productVariants.id,
      sku: productVariants.sku,
      weight: productVariants.weight,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      stock: productVariants.stock,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(productVariants, eq(productVariants.productId, products.id));

  return NextResponse.json({ items: allProducts });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { name, categoryId, description, imageUrl, weight, price, discountedPrice, stock, isFeatured } = body;

  if (!name || typeof name !== "string" || !categoryId) {
    return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
  }

  // Validate price as finite, nonnegative integer
  const validPrice = parseNonNegativeInt(price);
  if (validPrice === null) {
    return NextResponse.json({ error: "Price must be a finite, non-negative integer" }, { status: 400 });
  }

  // Validate discountedPrice if provided
  let validDiscountedPrice: number | null = null;
  if (discountedPrice !== undefined && discountedPrice !== null) {
    validDiscountedPrice = parseNonNegativeInt(discountedPrice);
    if (validDiscountedPrice === null) {
      return NextResponse.json({ error: "Discounted price must be a finite, non-negative integer" }, { status: 400 });
    }
    if (validDiscountedPrice > validPrice) {
      return NextResponse.json({ error: "Discounted price cannot exceed base price" }, { status: 400 });
    }
  }

  // Validate stock as finite, nonnegative integer
  let validStock = 50;
  if (stock !== undefined) {
    const parsedStock = parseNonNegativeInt(stock);
    if (parsedStock === null) {
      return NextResponse.json({ error: "Stock must be a finite, non-negative integer" }, { status: 400 });
    }
    validStock = parsedStock;
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  const sku = "VSM-" + name.substring(0, 3).toUpperCase() + "-" + (weight || "STD").toUpperCase();

  // Check for existing generated SKU
  const [existingSku] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.sku, sku))
    .limit(1);

  if (existingSku) {
    return NextResponse.json({ error: `SKU ${sku} already exists` }, { status: 409 });
  }

  try {
    // Insert products and variants in one atomic transaction
    const result = await db.transaction(async (tx) => {
      const [newProduct] = await tx
        .insert(products)
        .values({
          name,
          slug,
          categoryId: Number(categoryId),
          description: description || "Freshly made Gujarati delicacy.",
          imageUrl: imageUrl || "/images/mithai-platter-showcase.jpg",
          tags: isFeatured ? "featured,popular" : "popular",
          isFeatured: Boolean(isFeatured),
        })
        .returning();

      const [newVariant] = await tx
        .insert(productVariants)
        .values({
          productId: newProduct.id,
          sku,
          weight: weight || "500g",
          price: validPrice,
          discountedPrice: validDiscountedPrice,
          stock: validStock,
        })
        .returning();

      return { product: newProduct, variant: newVariant };
    });

    return NextResponse.json({ success: true, product: result.product, variant: result.variant });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { productId, variantId, name, price, discountedPrice, stock, weight, imageUrl, isFeatured } = body;

  if (!productId && !variantId) {
    return NextResponse.json({ error: "productId or variantId required" }, { status: 400 });
  }

  try {
    let existingProduct: any = null;
    let existingVariant: any = null;

    if (productId !== undefined) {
      const pId = parsePositiveInt(productId);
      if (!pId) return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
      const [p] = await db.select().from(products).where(eq(products.id, pId)).limit(1);
      if (!p) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      existingProduct = p;
    }

    if (variantId !== undefined) {
      const vId = parsePositiveInt(variantId);
      if (!vId) return NextResponse.json({ error: "Invalid variantId" }, { status: 400 });
      const [v] = await db.select().from(productVariants).where(eq(productVariants.id, vId)).limit(1);
      if (!v) {
        return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      }
      existingVariant = v;
    }

    // Verify variant ownership on update: if both are specified, ensure variant belongs to product
    if (existingProduct && existingVariant) {
      if (existingVariant.productId !== existingProduct.id) {
        return NextResponse.json({ error: "Variant does not belong to specified product" }, { status: 404 });
      }
    }

    // Numeric validations for variant
    const varUpdateData: any = {};
    if (price !== undefined) {
      const validPrice = parseNonNegativeInt(price);
      if (validPrice === null) {
        return NextResponse.json({ error: "Price must be a finite, non-negative integer" }, { status: 400 });
      }
      varUpdateData.price = validPrice;
    }

    if (discountedPrice !== undefined) {
      if (discountedPrice === null) {
        varUpdateData.discountedPrice = null;
      } else {
        const validDiscountedPrice = parseNonNegativeInt(discountedPrice);
        if (validDiscountedPrice === null) {
          return NextResponse.json({ error: "Discounted price must be a finite, non-negative integer" }, { status: 400 });
        }
        varUpdateData.discountedPrice = validDiscountedPrice;
      }
    }

    if (stock !== undefined) {
      const validStock = parseNonNegativeInt(stock);
      if (validStock === null) {
        return NextResponse.json({ error: "Stock must be a finite, non-negative integer" }, { status: 400 });
      }
      varUpdateData.stock = validStock;
    }

    if (weight && typeof weight === "string") {
      varUpdateData.weight = weight;
    }

    // Update in one transaction
    await db.transaction(async (tx) => {
      if (existingProduct) {
        const updateData: any = {};
        if (name && typeof name === "string") updateData.name = name;
        if (imageUrl && typeof imageUrl === "string") updateData.imageUrl = imageUrl;
        if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);

        if (Object.keys(updateData).length > 0) {
          await tx.update(products).set(updateData).where(eq(products.id, existingProduct.id));
        }
      }

      if (existingVariant && Object.keys(varUpdateData).length > 0) {
        await tx.update(productVariants).set(varUpdateData).where(eq(productVariants.id, existingVariant.id));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
