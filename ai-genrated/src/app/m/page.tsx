import { getUiConfigSafe } from "@/lib/ui-config";
import { MobileArtisanalHome } from "@/components/mobile-artisanal-home";
import { listCategories, listProducts } from "@/lib/products";
import { db } from "@/db";
import { stores } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function MobileRootPage() {
  const uiConfig = getUiConfigSafe();

  const [categories, featured, bestsellers, storeRows] = await Promise.all([
    listCategories(),
    listProducts({ featured: true, limit: 8 }),
    listProducts({ tag: "best_seller", limit: 8 }),
    db.select().from(stores).orderBy(stores.id).catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      <MobileArtisanalHome
        categories={categories}
        featuredProducts={featured}
        bestsellers={bestsellers}
        stores={storeRows}
        uiConfig={uiConfig}
      />
    </main>
  );
}
