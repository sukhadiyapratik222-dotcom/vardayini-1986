import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { cmsPages } from "@/db/schema";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const rows = await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.slug, slug))
    .limit(1);

  const page = rows[0];
  if (!page || !page.isPublished) {
    return { title: "Page Not Found | Vardayini Sweet Mart" };
  }

  return {
    title: page.metaTitle || `${page.title} | Vardayini Sweet Mart`,
    description: page.metaDescription || `Read about ${page.title} at Vardayini Sweet Mart.`,
  };
}

export default async function CmsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const rows = await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.slug, slug))
    .limit(1);

  const page = rows[0];
  if (!page || !page.isPublished) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#faf6ee] py-10 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="text-[#0b2f8a] hover:underline font-semibold">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{page.title}</span>
        </div>

        {/* Content Card */}
        <article className="rounded-3xl bg-white border border-amber-900/10 p-6 sm:p-10 md:p-12 shadow-xl">
          <header className="border-b border-slate-100 pb-6 mb-6">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#b45309]">
              Vardayini Sweet Mart · Official
            </span>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold text-[#24142e] tracking-tight">
              {page.title}
            </h1>
            {page.updatedAt && (
              <p className="mt-2 text-xs text-slate-400">
                Last updated: {new Date(page.updatedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
              </p>
            )}
          </header>

          <div
            className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />

          <footer className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>Pure Ghee Craftsmanship Since 1976</span>
            <Link
              href="/shop"
              className="rounded-full bg-[#0b2f8a] text-white px-5 py-2 font-bold hover:bg-[#071c54] transition shadow-xs"
            >
              Order Fresh Sweets →
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}

