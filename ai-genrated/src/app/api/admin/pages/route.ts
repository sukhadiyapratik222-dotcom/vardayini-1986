import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cmsPages } from "@/db/schema";
import { requireAdmin, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/pages
 * Lists all CMS pages.
 * Protected: Admin or Super Admin with pages permission.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req, "pages:manage");
  if (auth.error) return auth.error;

  try {
    const pages = await db
      .select()
      .from(cmsPages)
      .orderBy(desc(cmsPages.updatedAt));

    return NextResponse.json({ pages });
  } catch (err) {
    console.error("[GetCmsPages] Error:", err);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

/**
 * POST /api/admin/pages
 * Creates a new CMS page.
 * Protected: Admin or Super Admin with pages permission.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req, "pages:manage");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { title, slug, content, metaTitle, metaDescription, isPublished = true } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Page title is required" }, { status: 400 });
    }

    const cleanSlug = (slug || title)
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const [existing] = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, cleanSlug))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `A page with URL slug "${cleanSlug}" already exists.` },
        { status: 409 }
      );
    }

    const [result] = await db.insert(cmsPages).values({
      title: title.trim(),
      slug: cleanSlug,
      content: content || "",
      metaTitle: metaTitle?.trim() || null,
      metaDescription: metaDescription?.trim() || null,
      isPublished: Boolean(isPublished),
      authorId: auth.user.id,
    });

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "CREATE_PAGE",
      module: "pages",
      details: `Created CMS page "${title}" (slug: ${cleanSlug})`,
      req,
    });

    return NextResponse.json(
      {
        success: true,
        page: {
          id: result.insertId,
          title: title.trim(),
          slug: cleanSlug,
          isPublished: Boolean(isPublished),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[CreateCmsPage] Error:", err);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/pages
 * Updates an existing CMS page.
 * Protected: Admin or Super Admin with pages permission.
 */
export async function PUT(req: Request) {
  const auth = await requireAdmin(req, "pages:manage");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, title, slug, content, metaTitle, metaDescription, isPublished } = body;

    const pageId = Number(id);
    if (!pageId || isNaN(pageId)) {
      return NextResponse.json({ error: "Valid page ID is required" }, { status: 400 });
    }

    const [target] = await db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const updateFields: Record<string, any> = {};
    if (title !== undefined) updateFields.title = String(title).trim();
    if (slug !== undefined) {
      updateFields.slug = String(slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    if (content !== undefined) updateFields.content = String(content);
    if (metaTitle !== undefined) updateFields.metaTitle = metaTitle ? String(metaTitle).trim() : null;
    if (metaDescription !== undefined) updateFields.metaDescription = metaDescription ? String(metaDescription).trim() : null;
    if (isPublished !== undefined) updateFields.isPublished = Boolean(isPublished);

    await db.update(cmsPages).set(updateFields).where(eq(cmsPages.id, pageId));

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "UPDATE_PAGE",
      module: "pages",
      details: `Updated CMS page "${target.title}" (ID: ${pageId})`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Page "${target.title}" updated successfully.`,
    });
  } catch (err) {
    console.error("[UpdateCmsPage] Error:", err);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/pages?id=...
 * Deletes a CMS page.
 * Protected: Admin or Super Admin with pages permission.
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req, "pages:manage");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid page ID is required" }, { status: 400 });
    }

    const [target] = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await db.delete(cmsPages).where(eq(cmsPages.id, id));

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "DELETE_PAGE",
      module: "pages",
      details: `Deleted CMS page "${target.title}" (ID: ${id})`,
      req,
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: `Page "${target.title}" deleted.`,
    });
  } catch (err) {
    console.error("[DeleteCmsPage] Error:", err);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
