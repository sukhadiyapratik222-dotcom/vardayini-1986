import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cmsPages } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pages = await db
      .select({
        id: cmsPages.id,
        title: cmsPages.title,
        slug: cmsPages.slug,
        content: cmsPages.content,
        metaTitle: cmsPages.metaTitle,
        metaDescription: cmsPages.metaDescription,
        updatedAt: cmsPages.updatedAt,
      })
      .from(cmsPages)
      .where(eq(cmsPages.isPublished, true));

    return NextResponse.json({ pages });
  } catch (err) {
    console.error("[PublicCmsPages] Error:", err);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
}

