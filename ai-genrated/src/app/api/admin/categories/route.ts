import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { readJsonSafe, parsePositiveInt, parseNonNegativeInt } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const allCategories = await db.select().from(categories).orderBy(categories.sortOrder);
  
  let countMap = new Map<number, number>();
  try {
    const productCounts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .groupBy(products.categoryId);
    countMap = new Map(productCounts.map((c) => [c.categoryId, Number(c.count) || 0]));
  } catch {}

  const items = allCategories.map((cat) => ({
    ...cat,
    productCount: countMap.get(cat.id) || 0,
  }));

  return NextResponse.json({ categories: items });
}

export async function POST(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await readJsonSafe<{
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number | string;
  }>(request);

  if (!body || !body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const name = body.name.trim();
  let slug = (body.slug && typeof body.slug === "string" && body.slug.trim() !== "")
    ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!slug) {
    slug = `cat-${Date.now()}`;
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() !== ""
    ? body.imageUrl.trim()
    : "/images/kaju-katli.jpg";
  const sortOrder = body.sortOrder !== undefined ? parseNonNegativeInt(body.sortOrder) ?? 0 : 0;

  // Check unique slug
  const [existingSlug] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (existingSlug) {
    return NextResponse.json({ error: `Category slug '${slug}' already exists` }, { status: 409 });
  }

  const [newCat] = await db
    .insert(categories)
    .values({
      name,
      slug,
      description,
      imageUrl,
      sortOrder,
    })
    .returning();

  return NextResponse.json({ category: newCat }, { status: 201 });
}

export async function PUT(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await readJsonSafe<{
    id?: number | string;
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number | string;
  }>(request);

  if (!body || body.id === undefined) {
    return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
  }

  const catId = parsePositiveInt(body.id);
  if (!catId) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, catId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const updateData: Partial<typeof categories.$inferInsert> = {};

  if (body.name !== undefined && typeof body.name === "string" && body.name.trim() !== "") {
    updateData.name = body.name.trim();
  }

  if (body.slug !== undefined && typeof body.slug === "string" && body.slug.trim() !== "") {
    const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (slug !== existing.slug) {
      const [duplicate] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      if (duplicate && duplicate.id !== catId) {
        return NextResponse.json({ error: `Category slug '${slug}' is already taken` }, { status: 409 });
      }
      updateData.slug = slug;
    }
  }

  if (body.description !== undefined && typeof body.description === "string") {
    updateData.description = body.description.trim();
  }

  if (body.imageUrl !== undefined && typeof body.imageUrl === "string" && body.imageUrl.trim() !== "") {
    updateData.imageUrl = body.imageUrl.trim();
  }

  if (body.sortOrder !== undefined) {
    const parsedOrder = parseNonNegativeInt(body.sortOrder);
    if (parsedOrder !== null) {
      updateData.sortOrder = parsedOrder;
    }
  }

  const [updated] = await db
    .update(categories)
    .set(updateData)
    .where(eq(categories.id, catId))
    .returning();

  return NextResponse.json({ category: updated });
}

export async function DELETE(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  let catId = idParam ? parsePositiveInt(idParam) : null;

  if (!catId) {
    const body = await readJsonSafe<{ id?: number | string }>(request);
    if (body?.id) {
      catId = parsePositiveInt(body.id);
    }
  }

  if (!catId) {
    return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
  }

  // Check if any products are linked to this category
  const [hasProducts] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, catId))
    .limit(1);

  if (hasProducts) {
    return NextResponse.json(
      { error: "Cannot delete category: products are currently assigned to it. Reassign or delete products first." },
      { status: 400 }
    );
  }

  await db.delete(categories).where(eq(categories.id, catId));

  return NextResponse.json({ success: true, deletedId: catId });
}
