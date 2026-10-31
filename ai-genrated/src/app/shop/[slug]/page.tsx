import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ReviewForm } from "@/components/review-form";
import { WishlistButton } from "@/components/wishlist-button";
import { VariantPicker } from "@/components/variant-picker";
import { ProductDeliveryCard } from "@/components/product-delivery-card";
import { getProductBySlug, listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = (await listProducts({ category: product.categorySlug, limit: 4 })).filter((p) => p.id !== product.id);

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <p className="text-xs sm:text-sm text-[#2a1a12]/50">
        <Link href="/shop" className="hover:underline">Shop</Link> / <Link href={`/shop?category=${product.categorySlug}`} className="hover:underline">{product.categoryName}</Link>
      </p>
      <div className="mt-4 sm:mt-6 grid gap-6 sm:gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative aspect-square overflow-hidden rounded-2xl sm:rounded-[2rem] mithai-card">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority />
        </div>
        <div>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.28em] text-[#c45c26] font-semibold">{product.categoryName}</p>
          <h1 className="mt-1 sm:mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-4xl md:text-5xl text-[#6b1d1d] font-bold leading-tight">{product.name}</h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#2a1a12]/70">
            {product.avgRating ? `${product.avgRating} ★ · ${product.reviews.length} reviews` : "Be the first to review"}
          </p>
          <p className="mt-3 sm:mt-5 text-xs sm:text-sm leading-relaxed sm:leading-7 text-[#2a1a12]/80">{product.description}</p>
          <VariantPicker variants={product.variants} />
          <ProductDeliveryCard />
          <div className="mt-4 flex flex-wrap gap-3">
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#6b1d1d]">Reviews</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {product.reviews.length === 0 ? (
            <p className="text-sm text-[#2a1a12]/60">No reviews yet — tell us how the mithai travelled.</p>
          ) : (
            product.reviews.map((review) => (
              <article key={review.id} className="mithai-card rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#6b1d1d]">{review.userName || "Customer"}</p>
                  <p className="text-sm font-medium text-[#d4a801]">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#2a1a12]/85">{review.comment}</p>
              </article>
            ))
          )}
        </div>
        <ReviewForm productId={product.id} />
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#6b1d1d]">More from this counter</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
