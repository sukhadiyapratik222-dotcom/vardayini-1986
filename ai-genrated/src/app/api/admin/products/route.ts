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
  deleteProductVariantFromMysql,
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:view");
  if (auth.error) {
    return auth.error;
  }

  const allVariants = await db.select().from(productVariants);
  const variantsByProduct = new Map<number, typeof allVariants>();
  for (const v of allVariants) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const rawProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      tags: products.tags,
      isFeatured: products.isFeatured,
      isActive: products.isActive,
      categoryId: products.categoryId,
      categoryName: sql<string>`COALESCE(${categories.name}, 'Bakery')`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));

  // Multi-container persistence: Hydrate from MongoDB Atlas if SQLite cache in /tmp is empty
  if (!rawProducts || rawProducts.length === 0) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const mProducts = await mongo.collection("products").find({}).toArray();
        if (mProducts && mProducts.length > 0) {
          const items = mProducts.map((p: any) => {
            const vList = p.variants || [
              {
                id: p.id || 1,
                productId: p.id || 1,
                sku: `VSM-${p.id}`,
                weight: "500g",
                packName: "Standard Pack",
                price: 350,
                discountedPrice: null,
                stock: 50,
                isDefault: true,
                isActive: true,
              },
            ];
            const primary = vList.find((v: any) => v.isDefault) || vList[0];
            return {
              id: p.id || 1,
              name: p.name || "Mithai",
              slug: p.slug || "mithai",
              description: p.description || "",
              imageUrl: p.imageUrl || "/images/kaju-katli.jpg",
              tags: p.tags || "",
              isFeatured: Boolean(p.isFeatured),
              isActive: p.isActive !== false,
              categoryId: p.categoryId || 1,
              categoryName: p.categoryName || "Sweets",
              variantId: primary.id || p.id || 1,
              sku: primary.sku || `VSM-${p.id}`,
              weight: primary.weight || "500g",
              packName: primary.packName || "Standard Pack",
              price: primary.price || 350,
              discountedPrice: primary.discountedPrice || null,
              stock: primary.stock ?? 50,
              isDefault: primary.isDefault ?? true,
              isVariantActive: primary.isActive ?? true,
              variants: vList.map((v: any) => {
                const sp = (v.discountedPrice !== null && v.discountedPrice !== undefined && v.discountedPrice > 0)
                  ? v.discountedPrice
                  : v.price;
                const discPct = (v.discountedPrice && v.price > v.discountedPrice && v.price > 0)
                  ? Math.round(((v.price - sp) / v.price) * 100)
                  : 0;
                return {
                  id: v.id,
                  productId: p.id,
                  packName: v.packName || "Standard Pack",
                  weight: v.weight,
                  sku: v.sku,
                  price: v.price,
                  discountedPrice: v.discountedPrice ?? null,
                  discountPercent: discPct,
                  stock: v.stock ?? 0,
                  isDefault: Boolean(v.isDefault),
                  isActive: v.isActive !== false,
                };
              }),
            };
          });
          return NextResponse.json({ items });
        }
      }
    } catch (mErr) {
      console.warn("[AdminProducts] MongoDB fallback notice:", mErr);
    }
  }

  // Attach enriched variants array to each product row
  const items = rawProducts.map((row) => {
    const list = variantsByProduct.get(row.id) ?? [];
    const defaultVariant = list.find((v) => v.isDefault) || list[0];
    const enrichedVariants = list.map((v) => {
      const sp = (v.discountedPrice !== null && v.discountedPrice !== undefined && v.discountedPrice > 0)
        ? v.discountedPrice
        : v.price;
      const discPct = (v.discountedPrice && v.price > v.discountedPrice && v.price > 0)
        ? Math.round(((v.price - sp) / v.price) * 100)
        : 0;
      return {
        id: v.id,
        productId: v.productId,
        packName: v.packName || "Standard Pack",
        weight: v.weight,
        sku: v.sku,
        price: v.price,
        discountedPrice: v.discountedPrice ?? null,
        discountPercent: discPct,
        stock: v.stock ?? 0,
        isDefault: Boolean(v.isDefault),
        isActive: v.isActive !== false,
      };
    });

    return {
      ...row,
      variantId: defaultVariant?.id || row.id,
      sku: defaultVariant?.sku || `VSM-${row.id}`,
      weight: defaultVariant?.weight || "500g",
      packName: defaultVariant?.packName || "Standard Pack",
      price: defaultVariant?.price || 350,
      discountedPrice: defaultVariant?.discountedPrice || null,
      stock: defaultVariant?.stock ?? 50,
      isDefault: defaultVariant ? Boolean(defaultVariant.isDefault) : true,
      isActive: row.isActive !== false,
      isVariantActive: defaultVariant ? defaultVariant.isActive !== false : true,
      variants: enrichedVariants,
    };
  });

  return NextResponse.json({ items });
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

  const {
    name,
    categoryId,
    description,
    imageUrl,
    weight,
    packName,
    price,
    discountedPrice,
    stock,
    isFeatured,
    isActive,
    sku: customSku,
    variants: rawVariants,
  } = body;

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

  // Parse variants list (either from `variants` array or single variant fields)
  const variantsToCreate: Array<{
    packName: string;
    weight: string;
    price: number;
    discountedPrice: number | null;
    stock: number;
    isDefault: boolean;
    isActive: boolean;
  }> = [];

  if (Array.isArray(rawVariants) && rawVariants.length > 0) {
    for (let i = 0; i < rawVariants.length; i++) {
      const v = rawVariants[i];
      const validPrice = parseNonNegativeInt(v.price);
      if (validPrice === null) {
        return NextResponse.json(
          { error: `Variant ${i + 1}: Price must be a finite, non-negative integer` },
          { status: 400 }
        );
      }
      let validDiscountedPrice: number | null = null;
      if (v.discountedPrice !== undefined && v.discountedPrice !== null) {
        validDiscountedPrice = parseNonNegativeInt(v.discountedPrice);
        if (validDiscountedPrice === null) {
          return NextResponse.json(
            { error: `Variant ${i + 1}: Discounted price must be a finite, non-negative integer` },
            { status: 400 }
          );
        }
        if (validDiscountedPrice > validPrice) {
          return NextResponse.json(
            { error: `Variant ${i + 1}: Discounted price cannot exceed base price` },
            { status: 400 }
          );
        }
      }
      let validStock = 50;
      if (v.stock !== undefined) {
        const parsedStock = parseNonNegativeInt(v.stock);
        if (parsedStock === null) {
          return NextResponse.json(
            { error: `Variant ${i + 1}: Stock must be a finite, non-negative integer` },
            { status: 400 }
          );
        }
        validStock = parsedStock;
      }

      variantsToCreate.push({
        packName: v.packName?.trim() || "Standard Pack",
        weight: v.weight?.trim() || "500g",
        price: validPrice,
        discountedPrice: validDiscountedPrice,
        stock: validStock,
        isDefault: Boolean(v.isDefault),
        isActive: v.isActive !== false,
      });
    }

    // Ensure at least one variant is default
    if (!variantsToCreate.some((v) => v.isDefault)) {
      variantsToCreate[0].isDefault = true;
    }
  } else {
    // Validate single price
    const validPrice = parseNonNegativeInt(price);
    if (validPrice === null) {
      return NextResponse.json({ error: "Price must be a finite, non-negative integer" }, { status: 400 });
    }

    // Validate single discountedPrice if provided
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

    variantsToCreate.push({
      packName: packName?.trim() || "Standard Pack",
      weight: weight?.trim() || "500g",
      price: validPrice,
      discountedPrice: validDiscountedPrice,
      stock: validStock,
      isDefault: true,
      isActive: true,
    });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  const cleanPrefix = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "ITM";

  try {
    // Insert products and all variants in one atomic transaction
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
          isActive: isActive !== false,
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
        isActive: isActive !== false,
        createdAt: new Date(),
      };

      const createdVariants = [];

      for (let i = 0; i < variantsToCreate.length; i++) {
        const item = variantsToCreate[i];
        const cleanWeight = item.weight.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "500G";
        const baseSku = (i === 0 && customSku && typeof customSku === "string" && customSku.trim().length > 0)
          ? customSku.trim().toUpperCase()
          : `VSM-${cleanPrefix}-${cleanWeight}`;

        let sku = baseSku;
        let counter = 1;
        while (true) {
          const [existing] = await tx
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

        const [varInsert] = await tx
          .insert(productVariants)
          .values({
            productId: newProduct.id,
            sku,
            weight: item.weight,
            packName: item.packName,
            price: item.price,
            discountedPrice: item.discountedPrice,
            stock: item.stock,
            isDefault: item.isDefault,
            isActive: item.isActive,
          });

        createdVariants.push({
          id: varInsert.insertId,
          productId: newProduct.id,
          sku,
          weight: item.weight,
          packName: item.packName,
          price: item.price,
          discountedPrice: item.discountedPrice,
          stock: item.stock,
          isDefault: item.isDefault,
          isActive: item.isActive,
        });
      }

      return { product: newProduct, variants: createdVariants };
    });

    // Synchronize product and variants to MySQL & MongoDB
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

      for (const v of result.variants) {
        await syncProductVariantToMysql({
          id: v.id,
          productId: v.productId,
          weight: v.weight,
          sku: v.sku,
          price: v.price,
          discountedPrice: v.discountedPrice,
          stock: v.stock,
          packName: v.packName,
          isDefault: v.isDefault,
          isActive: v.isActive,
        });
      }
    } catch (mysqlErr) {
      console.warn("MySQL product create sync notice:", mysqlErr);
    }

    return NextResponse.json({
      success: true,
      product: result.product,
      variant: result.variants[0],
      variants: result.variants,
    });
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

  const {
    productId,
    variantId,
    name,
    categoryId,
    description,
    price,
    discountedPrice,
    stock,
    weight,
    packName,
    isDefault,
    isActive,
    imageUrl,
    isFeatured,
    variants,
  } = body;

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

    const targetProductId = existingProduct ? existingProduct.id : existingVariant.productId;

    // Multiple pack sizes management mode: `variants` array is provided
    if (Array.isArray(variants)) {
      const existingProductVariants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, targetProductId));

      // Validate all variants first
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (v._delete) continue;

        const validPrice = parseNonNegativeInt(v.price);
        if (validPrice === null) {
          return NextResponse.json(
            { error: `Pack ${i + 1}: Price must be a finite, non-negative integer` },
            { status: 400 }
          );
        }

        if (v.discountedPrice !== undefined && v.discountedPrice !== null) {
          const validDiscountedPrice = parseNonNegativeInt(v.discountedPrice);
          if (validDiscountedPrice === null) {
            return NextResponse.json(
              { error: `Pack ${i + 1}: Discounted price must be a finite, non-negative integer` },
              { status: 400 }
            );
          }
          if (validDiscountedPrice > validPrice) {
            return NextResponse.json(
              { error: `Pack ${i + 1}: Discounted price cannot exceed base price` },
              { status: 400 }
            );
          }
        }

        if (v.stock !== undefined) {
          const validStock = parseNonNegativeInt(v.stock);
          if (validStock === null) {
            return NextResponse.json(
              { error: `Pack ${i + 1}: Stock must be a finite, non-negative integer` },
              { status: 400 }
            );
          }
        }
      }

      // Check remaining variant count if deletions are requested
      const nonDeletedIncoming = variants.filter((v) => !v._delete);
      if (nonDeletedIncoming.length === 0) {
        return NextResponse.json(
          { error: "A product must have at least one pack size." },
          { status: 400 }
        );
      }

      await db.transaction(async (tx) => {
        // Update product attributes if supplied
        const prodUpdate: any = {};
        if (name && typeof name === "string") prodUpdate.name = name;
        if (imageUrl && typeof imageUrl === "string") prodUpdate.imageUrl = imageUrl;
        if (description && typeof description === "string") prodUpdate.description = description;
        if (categoryId !== undefined) prodUpdate.categoryId = Number(categoryId);
        if (isFeatured !== undefined) prodUpdate.isFeatured = Boolean(isFeatured);
        if (isActive !== undefined) prodUpdate.isActive = Boolean(isActive);

        if (Object.keys(prodUpdate).length > 0) {
          await tx.update(products).set(prodUpdate).where(eq(products.id, targetProductId));
        }

        // Process variant updates, deletions, and additions
        for (const v of variants) {
          if (v._delete && v.id) {
            const vId = parsePositiveInt(v.id);
            if (vId) {
              try {
                await tx.delete(cartItems).where(eq(cartItems.variantId, vId));
              } catch {}
              await tx.delete(productVariants).where(eq(productVariants.id, vId));
              await deleteProductVariantFromMysql(vId);
            }
          } else if (v.id) {
            const vId = parsePositiveInt(v.id);
            if (vId) {
              const varUpdate: any = {};
              if (v.packName !== undefined) varUpdate.packName = v.packName;
              if (v.weight !== undefined) varUpdate.weight = v.weight;
              if (v.price !== undefined) varUpdate.price = parseNonNegativeInt(v.price) ?? 0;
              if (v.discountedPrice !== undefined) {
                varUpdate.discountedPrice = v.discountedPrice === null ? null : parseNonNegativeInt(v.discountedPrice);
              }
              if (v.stock !== undefined) varUpdate.stock = parseNonNegativeInt(v.stock) ?? 0;
              if (v.isDefault !== undefined) varUpdate.isDefault = Boolean(v.isDefault);
              if (v.isActive !== undefined) varUpdate.isActive = Boolean(v.isActive);

              await tx.update(productVariants).set(varUpdate).where(eq(productVariants.id, vId));
              await updateVariantStockInMysql(vId, varUpdate);
            }
          } else {
            // New pack size insertion
            const cleanPrefix = (name || existingProduct?.name || "ITM")
              .replace(/[^a-zA-Z0-9]/g, "")
              .substring(0, 4)
              .toUpperCase();
            const cleanWeight = (v.weight || "500G").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const baseSku = `VSM-${cleanPrefix}-${cleanWeight}`;

            let sku = baseSku;
            let counter = 1;
            while (true) {
              const [existing] = await tx
                .select({ id: productVariants.id })
                .from(productVariants)
                .where(eq(productVariants.sku, sku))
                .limit(1);

              if (!existing) break;
              counter++;
              sku = `${baseSku}-${counter}`;
            }

            const [inserted] = await tx.insert(productVariants).values({
              productId: targetProductId,
              sku,
              weight: v.weight || "500g",
              packName: v.packName || "Standard Pack",
              price: parseNonNegativeInt(v.price) ?? 0,
              discountedPrice: v.discountedPrice !== undefined && v.discountedPrice !== null ? parseNonNegativeInt(v.discountedPrice) : null,
              stock: parseNonNegativeInt(v.stock) ?? 50,
              isDefault: Boolean(v.isDefault),
              isActive: v.isActive !== false,
            });

            await syncProductVariantToMysql({
              id: inserted.insertId,
              productId: targetProductId,
              weight: v.weight || "500g",
              sku,
              price: parseNonNegativeInt(v.price) ?? 0,
              discountedPrice: v.discountedPrice !== undefined && v.discountedPrice !== null ? parseNonNegativeInt(v.discountedPrice) : null,
              stock: parseNonNegativeInt(v.stock) ?? 50,
              packName: v.packName || "Standard Pack",
              isDefault: Boolean(v.isDefault),
              isActive: v.isActive !== false,
            });
          }
        }

        // If one variant is marked default, ensure no other variant in this product is default
        const defaultVar = variants.find((v) => v.isDefault && !v._delete);
        if (defaultVar && defaultVar.id) {
          await tx
            .update(productVariants)
            .set({ isDefault: false })
            .where(
              and(
                eq(productVariants.productId, targetProductId),
                sql`${productVariants.id} != ${Number(defaultVar.id)}`
              )
            );
        }
      });

      return NextResponse.json({ success: true });
    }

    // Single variant & product update mode
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
        const basePrice = varUpdateData.price !== undefined ? varUpdateData.price : existingVariant?.price;
        if (basePrice !== undefined && validDiscountedPrice > basePrice) {
          return NextResponse.json({ error: "Discounted price cannot exceed base price" }, { status: 400 });
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
    if (packName && typeof packName === "string") {
      varUpdateData.packName = packName;
    }
    if (isDefault !== undefined) {
      varUpdateData.isDefault = Boolean(isDefault);
    }
    if (body.isVariantActive !== undefined) {
      varUpdateData.isActive = Boolean(body.isVariantActive);
    }

    // Update in one transaction
    await db.transaction(async (tx) => {
      if (existingProduct) {
        const updateData: any = {};
        if (name && typeof name === "string") updateData.name = name;
        if (imageUrl && typeof imageUrl === "string") updateData.imageUrl = imageUrl;
        if (description && typeof description === "string") updateData.description = description;
        if (categoryId !== undefined) updateData.categoryId = Number(categoryId);
        if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);

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
          categoryId: categoryId !== undefined ? Number(categoryId) : existingProduct.categoryId,
          name: (name && typeof name === "string") ? name : existingProduct.name,
          slug: existingProduct.slug,
          description: (description && typeof description === "string") ? description : existingProduct.description,
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
  const body = await readJsonSafe<{ id?: number; productId?: number; variantId?: number }>(request);

  // Check if deleting a specific variant pack size
  const variantIdParam = parsePositiveInt(url.searchParams.get("variantId")) || parsePositiveInt(body?.variantId);
  if (variantIdParam) {
    const [existingVar] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantIdParam))
      .limit(1);

    if (!existingVar) {
      return NextResponse.json({ error: "Variant pack size not found" }, { status: 404 });
    }

    // Check that at least one pack size remains for the product
    const allVars = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, existingVar.productId));

    if (allVars.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only pack size of a product. A product must have at least one pack size." },
        { status: 400 }
      );
    }

    try {
      await db.delete(cartItems).where(eq(cartItems.variantId, variantIdParam));
    } catch {}

    await db.delete(productVariants).where(eq(productVariants.id, variantIdParam));
    await deleteProductVariantFromMysql(variantIdParam);

    return NextResponse.json({ success: true, deletedVariantId: variantIdParam });
  }

  // Deleting entire product
  let id = parsePositiveInt(url.searchParams.get("id")) || parsePositiveInt(url.searchParams.get("productId"));
  if (!id) {
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

  // Synchronize deletion to MySQL & Mongo
  try {
    await deleteProductFromMysql(id);
  } catch (mysqlErr) {
    console.warn("MySQL product delete sync notice:", mysqlErr);
  }

  return NextResponse.json({ success: true, deletedId: id });
}
