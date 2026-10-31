import { NextResponse } from "next/server";
import { forceReseed } from "@/db/seed";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
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

export async function POST(request: Request) {
  return GET(request);
}
