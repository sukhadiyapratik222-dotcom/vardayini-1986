import type { Metadata } from "next";
import { listProducts } from "@/lib/products";
import { NewProductMotionShowcase } from "@/components/new-product-motion-showcase";
import { getUiConfigSafe } from "@/lib/ui-config";

export const metadata: Metadata = {
  title: "New Products 2026 Collection | Vardayini Sweet Mart",
  description:
    "Discover newly launched royal sweets, authentic Gujarati farsan, and festive gift hampers handcrafted with 100% Shuddh Desi Ghee in Kalol, Gujarat.",
};

export const dynamic = "force-dynamic";

export default async function NewProductsPage() {
  const products = await listProducts({ limit: 100 });
  const uiConfig = getUiConfigSafe();

  return (
    <main className="w-full min-h-screen">
      <NewProductMotionShowcase
        products={products}
        config={uiConfig?.newLaunchPage}
        welcomeOfferConfig={uiConfig?.welcomeOffer}
      />
    </main>
  );
}
