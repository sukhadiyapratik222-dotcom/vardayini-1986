import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, categories, cartItems, wishlistItems, reviews } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe, parsePositiveInt, parseNonNegativeInt } from "@/lib/validation";
import { NextResponse } from "next/server";
import {
  syncProductToMysql,
  syncProductVariantToMysql,
  updateVariantStockInMysql,
  deleteProductFromMysql,
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:view");
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
      categoryName: sql<string>`COALESCE(${categories.name}, 'Bakery')`,
      variantId: productVariants.id,
      sku: productVariants.sku,
      weight: productVariants.weight,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      stock: productVariants.stock,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(productVariants, eq(productVariants.productId, products.id));

  return NextResponse.json({ items: allProducts });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:manage");
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { name, categoryId, description, imageUrl, weight, price, discountedPrice, stock, isFeatured, sku: customSku } = body;

  if (!name || typeof name !== "string" || !categoryId) {
    return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
  }

  let resolvedCatId = Number(categoryId);
  const [existingCat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, resolvedCatId))
    .limit(1);

  if (!existingCat) {
    if (resolvedCatId === 23) {
      try {
        await db.insert(categories).values({
          id: 23,
          name: "Biscuits and Cookies",
          slug: "biscuits-and-cookies",
          description: "Melt-in-mouth traditional nankhatai, pista cookies and fresh bakery biscuits.",
          imageUrl: "/images/kaju-katli.jpg",
          sortOrder: 23,
        });
      } catch { }
    } else if (resolvedCatId === 24) {
      try {
        await db.insert(categories).values({
          id: 24,
          name: "Toast and Khari",
          slug: "toast-and-khari",
          description: "Flaky layered butter khari and spiced teatime crunchy toasts.",
          imageUrl: "/images/kaju-katli.jpg",
          sortOrder: 24,
        });
      } catch { }
    } else {
      const [firstCat] = await db.select({ id: categories.id }).from(categories).limit(1);
      if (firstCat) {
        resolvedCatId = firstCat.id;
      }
    }
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

  // Generate unique collision-free SKU
  const cleanPrefix = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "ITM";
  const cleanWeight = (weight || "500G").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const baseSku = (customSku && typeof customSku === "string" && customSku.trim().length > 0)
    ? customSku.trim().toUpperCase()
    : `VSM-${cleanPrefix}-${cleanWeight}`;

  let sku = baseSku;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.sku, sku))
      .limit(1);

    if (!existing) {
      break;
    }
    counter++;
    sku = `${baseSku}-${counter}`;
  }

  try {
    // Insert products and variants in one atomic transaction
    const result = await db.transaction(async (tx) => {
      const [prodInsert] = await tx
        .insert(products)
        .values({
          name,
          slug,
          categoryId: resolvedCatId,
          description: description || "Freshly made Gujarati delicacy.",
          imageUrl: imageUrl || "/images/mithai-platter-showcase.jpg",
          tags: isFeatured ? "featured,popular" : "popular",
          isFeatured: Boolean(isFeatured),
        });

      const newProduct = {
        id: prodInsert.insertId,
        name,
        slug,
        categoryId: resolvedCatId,
        description: description || "Freshly made Gujarati delicacy.",
        imageUrl: imageUrl || "/images/mithai-platter-showcase.jpg",
        tags: isFeatured ? "featured,popular" : "popular",
        isFeatured: Boolean(isFeatured),
        createdAt: new Date(),
      };

      const [varInsert] = await tx
        .insert(productVariants)
        .values({
          productId: newProduct.id,
          sku,
          weight: weight || "500g",
          price: validPrice,
          discountedPrice: validDiscountedPrice,
          stock: validStock,
        });

      const newVariant = {
        id: varInsert.insertId,
        productId: newProduct.id,
        sku,
        weight: weight || "500g",
        price: validPrice,
        discountedPrice: validDiscountedPrice,
        stock: validStock,
      };

      return { product: newProduct, variant: newVariant };
    });

    // Synchronize product and initial variant directly to MySQL
    try {
      await syncProductToMysql({
        id: result.product.id,
        categoryId: result.product.categoryId,
        name: result.product.name,
        slug: result.product.slug,
        description: result.product.description,
        imageUrl: result.product.imageUrl,
        tags: result.product.tags,
        isFeatured: result.product.isFeatured,
      });
      await syncProductVariantToMysql({
        id: result.variant.id,
        productId: result.variant.productId,
        weight: result.variant.weight,
        sku: result.variant.sku,
        price: result.variant.price,
        discountedPrice: result.variant.discountedPrice,
        stock: result.variant.stock,
      });
    } catch (mysqlErr) {
      console.warn("MySQL product create sync notice:", mysqlErr);
    }

    return NextResponse.json({ success: true, product: result.product, variant: result.variant });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:manage");
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

    // Synchronize updates to MySQL
    try {
      if (existingProduct) {
        await syncProductToMysql({
          id: existingProduct.id,
          categoryId: existingProduct.categoryId,
          name: (name && typeof name === "string") ? name : existingProduct.name,
          slug: existingProduct.slug,
          description: existingProduct.description,
          imageUrl: (imageUrl && typeof imageUrl === "string") ? imageUrl : existingProduct.imageUrl,
          tags: existingProduct.tags,
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existingProduct.isFeatured,
        });
      }
      if (existingVariant && Object.keys(varUpdateData).length > 0) {
        await updateVariantStockInMysql(existingVariant.id, varUpdateData);
      }
    } catch (mysqlErr) {
      console.warn("MySQL product update sync notice:", mysqlErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:manage");
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  let id = parsePositiveInt(url.searchParams.get("id")) || parsePositiveInt(url.searchParams.get("productId"));

  if (!id) {
    const body = await readJsonSafe<{ id?: number; productId?: number }>(request);
    id = parsePositiveInt(body?.id) || parsePositiveInt(body?.productId);
  }

  if (!id) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  const [existingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Find all variants for this product
  const variants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, id));

  const variantIds = variants.map((v) => v.id);

  // Clean up child dependencies safely (cart items, wishlist, reviews)
  if (variantIds.length > 0) {
    try {
      await db.delete(cartItems).where(inArray(cartItems.variantId, variantIds));
    } catch { }
  }
  try { await db.delete(wishlistItems).where(eq(wishlistItems.productId, id)); } catch { }
  try { await db.delete(reviews).where(eq(reviews.productId, id)); } catch { }

  // Delete variants first, then product
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  await db.delete(products).where(eq(products.id, id));

  // Synchronize deletion to MySQL
  try {
    await deleteProductFromMysql(id);
  } catch (mysqlErr) {
    console.warn("MySQL product delete sync notice:", mysqlErr);
  }

  return NextResponse.json({ success: true, deletedId: id });
}

