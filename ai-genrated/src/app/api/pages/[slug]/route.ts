import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cmsPages } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, ctx: RouteContext) {
  await ensureSeeded();
  const { slug } = await ctx.params;

  if (!slug) {
    return NextResponse.json({ error: "Slug required" }, { status: 400 });
  }

  const [page] = await db
    .select()
    .from(cmsPages)
    .where(and(eq(cmsPages.slug, slug), eq(cmsPages.isPublished, true)))
    .limit(1);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({ page });
}
