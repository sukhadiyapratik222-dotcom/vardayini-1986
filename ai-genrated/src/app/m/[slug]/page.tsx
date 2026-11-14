import { notFound } from "next/navigation";
import { getUiConfigSafe } from "@/lib/ui-config";
import { MobileArtisanalHome } from "@/components/mobile-artisanal-home";
import { listCategories, listProducts } from "@/lib/products";
import { db } from "@/db";
import { stores } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function CustomMobilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uiConfig = getUiConfigSafe();
  const mobileConfig = uiConfig?.mobileManagement;

  // Search for custom mobile page
  const customPage = (mobileConfig?.customPages || []).find(
    (p: any) => p.slug === slug && p.isActive !== false
  );

  if (!customPage && slug !== "default") {
    notFound();
  }

  const [categories, featured, bestsellers, storeRows] = await Promise.all([
    listCategories(),
    listProducts({ featured: true, limit: 8 }),
    listProducts({ tag: "best_seller", limit: 8 }),
    db.select().from(stores).orderBy(stores.id).catch(() => []),
  ]);

  // Construct customized page data
  const pageData = customPage
    ? {
        ...mobileConfig,
        hero: {
          ...mobileConfig?.hero,
          title: customPage.heroHeading || customPage.title,
          description: customPage.heroSubheading || customPage.description,
          imageUrl: customPage.bannerImageUrl || mobileConfig?.hero?.imageUrl,
        },
      }
    : mobileConfig;

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      <MobileArtisanalHome
        categories={categories}
        featuredProducts={featured}
        bestsellers={bestsellers}
        stores={storeRows}
        uiConfig={uiConfig}
        customPageData={pageData}
      />
    </main>
  );
}
