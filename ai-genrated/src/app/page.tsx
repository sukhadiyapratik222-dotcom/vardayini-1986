import fs from "fs";
import path from "path";
import { listCategories, listProducts } from "@/lib/products";
import { HomePageClient } from "@/components/home-page-client";

export const dynamic = "force-dynamic";

function getUiConfigSafe() {
  try {
    const candidates = [
      path.join(process.cwd(), "src", "data", "ui-config.json"),
      path.join(process.cwd(), "ai-genrated", "src", "data", "ui-config.json"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return JSON.parse(fs.readFileSync(c, "utf-8"));
      }
    }
  } catch {}
  return null;
}

export default async function HomePage() {
  const uiConfig = getUiConfigSafe();
  const specialConfig = uiConfig?.specialItems ?? {
    enabled: true,
    badge: "Karigars' Special Selection",
    title: "Our Special Items",
    subtitle: "Prepared fresh every morning with 100% Shuddh Desi Ghee. Handcrafted Gujarati delicacies.",
    productIds: [1, 2, 4, 6],
    linkText: "See all 24+ items →",
    linkUrl: "/shop",
  };

  const specialIds: number[] =
    Array.isArray(specialConfig.productIds) && specialConfig.productIds.length > 0
      ? specialConfig.productIds
      : [];

  const [categories, featured, bestsellers, specialProducts] = await Promise.all([
    listCategories(),
    listProducts({ featured: true, limit: 8 }),
    listProducts({ tag: "best_seller", limit: 4 }),
    specialIds.length > 0
      ? listProducts({ ids: specialIds })
      : listProducts({ featured: true, limit: 4 }),
  ]);

  return (
    <main className="w-full min-h-screen">
      <HomePageClient
        categories={categories}
        featured={featured}
        bestsellers={bestsellers}
        specialItemsConfig={specialConfig}
        specialProducts={specialProducts}
      />
    </main>
  );
}
