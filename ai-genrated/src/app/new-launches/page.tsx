import type { Metadata } from "next";
import { listProducts } from "@/lib/products";
import { NewProductMotionShowcase } from "@/components/new-product-motion-showcase";

export const metadata: Metadata = {
  title: "New Launches & 2026 Collection | Vardayini Sweet Mart",
  description:
    "Discover newly launched royal sweets, authentic Gujarati farsan, and festive gift hampers handcrafted with 100% Shuddh Desi Ghee in Vadodara.",
};

export default async function NewLaunchesPage() {
  const products = await listProducts({ limit: 42 });

  return (
    <main className="w-full min-h-screen">
      <NewProductMotionShowcase products={products} />
    </main>
  );
}

