import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, activityLogs } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe, parsePositiveInt, parseNonNegativeInt } from "@/lib/validation";
import { NextResponse } from "next/server";
import { updateVariantStockInMysql } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:view");
  if (auth.error) {
    return auth.error;
  }

  const rows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      weight: productVariants.weight,
      packName: productVariants.packName,
      stock: productVariants.stock,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      isDefault: productVariants.isDefault,
      isActive: productVariants.isActive,
      name: products.name,
      isArchived: products.isArchived,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .orderBy(asc(productVariants.stock));

  let finalVariants = rows;
  if (!finalVariants || finalVariants.length === 0) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const mProducts = await mongo.collection("products").find({}).toArray();
        if (mProducts && mProducts.length > 0) {
          finalVariants = mProducts.map((p: any) => ({
            id: p.variants?.[0]?.id || p.id || 1,
            productId: p.id || 1,
            sku: p.variants?.[0]?.sku || ("VSM-" + p.id),
            weight: p.variants?.[0]?.weight || "500g",
            packName: p.variants?.[0]?.packName || "Standard Pack",
            stock: p.variants?.[0]?.stock ?? 25,
            price: p.variants?.[0]?.price || 350,
            discountedPrice: p.variants?.[0]?.discountedPrice ?? null,
            isDefault: true,
            isActive: true,
            name: p.name || "Authentic Mithai",
            isArchived: Boolean(p.isArchived),
          }));
        }
      }
    } catch (mErr) {
      console.warn("[AdminInventory] MongoDB fallback notice:", mErr);
    }
  }

  // Stock categories: Low stock (< 5 units), Out of stock (<= 0 units), In stock (>= 5 units)
  const lowStock = finalVariants.filter((row) => row.stock > 0 && row.stock < 5);
  const outOfStock = finalVariants.filter((row) => row.stock <= 0);
  const inStock = finalVariants.filter((row) => row.stock >= 5);

  return NextResponse.json({
    variants: finalVariants,
    lowStock,
    outOfStock,
    inStock,
    metrics: {
      totalVariants: finalVariants.length,
      inStockCount: inStock.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
    },
  });
}

export async function PUT(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:manage");
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe<Record<string, unknown>>(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const variantId = parsePositiveInt(body.id) || parsePositiveInt(body.variantId);
  if (!variantId) {
    return NextResponse.json({ error: "Valid variant id is required" }, { status: 400 });
  }

  // Fetch current variant record
  const [existing] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      stock: productVariants.stock,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      weight: productVariants.weight,
      productName: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const updateData: {
    stock?: number;
    price?: number;
    discountedPrice?: number | null;
  } = {};

  const action = typeof body.action === "string" ? body.action.toLowerCase() : "set";
  const amount = body.amount !== undefined ? Number(body.amount) : undefined;

  // Stock management actions: add, remove, or set
  if (action === "add" && amount !== undefined) {
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount to add must be a positive number" }, { status: 400 });
    }
    updateData.stock = existing.stock + Math.round(amount);
  } else if (action === "remove" && amount !== undefined) {
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount to remove must be a positive number" }, { status: 400 });
    }
    // Prevent negative stock
    updateData.stock = Math.max(0, existing.stock - Math.round(amount));
  } else if (body.stock !== undefined) {
    const stock = parseNonNegativeInt(body.stock);
    if (stock === null) {
      return NextResponse.json({ error: "Stock must be a finite, non-negative integer" }, { status: 400 });
    }
    updateData.stock = stock;
  }

  if (body.price !== undefined) {
    const price = parsePositiveInt(body.price);
    if (price === null) {
      return NextResponse.json({ error: "Price must be greater than zero" }, { status: 400 });
    }
    updateData.price = price;
  }

  if (body.discountedPrice !== undefined) {
    if (body.discountedPrice === null) {
      updateData.discountedPrice = null;
    } else {
      const discountedPrice = parsePositiveInt(body.discountedPrice);
      if (discountedPrice === null) {
        return NextResponse.json({ error: "Discounted price must be greater than zero" }, { status: 400 });
      }
      const refPrice = updateData.price ?? existing.price;
      if (discountedPrice > refPrice) {
        return NextResponse.json({ error: "Discounted price cannot exceed Original MRP" }, { status: 400 });
      }
      updateData.discountedPrice = discountedPrice;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "At least one valid field (stock, price, discountedPrice) or action (add/remove) must be provided" },
      { status: 400 }
    );
  }

  // Execute inside transaction and log to activityLogs
  await db.transaction(async (tx) => {
    await tx
      .update(productVariants)
      .set(updateData)
      .where(eq(productVariants.id, variantId));

    if (updateData.stock !== undefined) {
      try {
        await tx.insert(activityLogs).values({
          userId: auth.user.id,
          userName: auth.user.name,
          userEmail: auth.user.email,
          userRole: auth.user.role,
          action: action === "add" ? "add_stock" : action === "remove" ? "remove_stock" : "set_stock",
          module: "inventory",
          details: JSON.stringify({
            productId: existing.productId,
            productName: existing.productName,
            variantId,
            variantWeight: existing.weight,
            previousStock: existing.stock,
            newStock: updateData.stock,
            delta: updateData.stock - existing.stock,
            action,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {}
    }
  });

  const [updated] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  // Synchronize stock and pricing directly to MySQL & MongoDB
  try {
    await updateVariantStockInMysql(variantId, updateData);
    const { getMongoDb } = await import("@/lib/mongodb");
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection("product_variants").updateOne(
        { id: variantId },
        { $set: updateData }
      );
    }
  } catch (syncErr) {
    console.warn("Inventory update sync notice:", syncErr);
  }

  return NextResponse.json({
    success: true,
    variant: updated,
    previousStock: existing.stock,
    newStock: updated?.stock ?? updateData.stock,
  });
}
