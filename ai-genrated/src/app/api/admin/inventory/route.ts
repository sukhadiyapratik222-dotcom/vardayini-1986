import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe, parsePositiveInt, parseNonNegativeInt } from "@/lib/validation";
import { NextResponse } from "next/server";
import { updateVariantStockInMysql } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "products:manage");
  if (auth.error) {
    return auth.error;
  }

  const rows = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      weight: productVariants.weight,
      stock: productVariants.stock,
      price: productVariants.price,
      name: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .orderBy(asc(productVariants.stock));

  return NextResponse.json({
    variants: rows,
    lowStock: rows.filter((row) => row.stock <= 20),
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

  const variantId = parsePositiveInt(body.id);
  if (!variantId) {
    return NextResponse.json({ error: "Valid variant id is required" }, { status: 400 });
  }

  const updateData: {
    stock?: number;
    price?: number;
    discountedPrice?: number | null;
  } = {};

  if (body.stock !== undefined) {
    const stock = parseNonNegativeInt(body.stock);
    if (stock === null) {
      return NextResponse.json({ error: "Stock must be a finite, non-negative integer" }, { status: 400 });
    }
    updateData.stock = stock;
  }

  if (body.price !== undefined) {
    const price = parseNonNegativeInt(body.price);
    if (price === null) {
      return NextResponse.json({ error: "Price must be a finite, non-negative integer" }, { status: 400 });
    }
    updateData.price = price;
  }

  if (body.discountedPrice !== undefined) {
    if (body.discountedPrice === null) {
      updateData.discountedPrice = null;
    } else {
      const discountedPrice = parseNonNegativeInt(body.discountedPrice);
      if (discountedPrice === null) {
        return NextResponse.json({ error: "Discounted price must be a finite, non-negative integer" }, { status: 400 });
      }
      updateData.discountedPrice = discountedPrice;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "At least one valid field (stock, price, discountedPrice) must be provided" },
      { status: 400 }
    );
  }

  await db
    .update(productVariants)
    .set(updateData)
    .where(eq(productVariants.id, variantId));

  const [updated] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!updated) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  // Synchronize stock and pricing directly to MySQL
  try {
    await updateVariantStockInMysql(variantId, updateData);
  } catch (mysqlErr) {
    console.warn("MySQL inventory update sync notice:", mysqlErr);
  }

  return NextResponse.json({ variant: updated });
}
