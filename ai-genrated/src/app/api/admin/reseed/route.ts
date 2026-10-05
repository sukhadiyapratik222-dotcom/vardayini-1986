import { NextResponse } from "next/server";
import { forceReseed } from "@/db/seed";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await forceReseed();
    const allCats = await db.select().from(categories);
    const allProds = await db.select().from(products);
    return NextResponse.json({
      ok: true,
      message: "Database reseeded successfully with full 18-category catalog",
      categoriesCount: allCats.length,
      productsCount: allProds.length,
      categories: allCats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
