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

  const related = (
    await listProducts({ category: product.categorySlug, limit: 4 })
  ).filter((p) => p.id !== product.id);

  // Encode for WhatsApp sharing
  const shareText = encodeURIComponent(
    `Check out ${product.name} from Vardayini Sweets (100% Pure Desi Ghee)! https://vardayini-1986.vercel.app/shop/${product.slug}`
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FAF6EE] via-[#FFFDF9] to-[#FAF6EE] text-[#140638]">
      <div className="mx-auto max-w-6xl px-3.5 sm:px-6 py-5 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs sm:text-sm text-slate-500 mb-5 sm:mb-8">
          <Link href="/" className="hover:text-[#140638] transition font-medium">
            Home
          </Link>
          <span className="text-amber-400">›</span>
          <Link href="/shop" className="hover:text-[#140638] transition font-medium">
            Shop
          </Link>
          <span className="text-amber-400">›</span>
          <Link
            href={`/shop?category=${product.categorySlug}`}
            className="hover:text-[#140638] transition font-medium capitalize"
          >
            {product.categoryName}
          </Link>
          <span className="text-amber-400">›</span>
          <span className="text-[#140638] font-semibold truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Main Product Showcase Grid */}
        <div className="grid gap-8 lg:gap-12 md:grid-cols-2 items-start">
          {/* Left Column: Image & Authenticity Highlights */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-amber-900/10 bg-white">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
              />

              {/* Heritage Pure Ghee Badge */}
              <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-[#140638] to-[#250d54] text-[#dfb755] border border-[#dfb755]/50 shadow-md backdrop-blur-md">
                  <span>👑</span>
                  <span>Pure Desi Ghee</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-white/95 text-emerald-800 border border-emerald-300/60 shadow-xs">
                  <span>✓</span>
                  <span>100% Shuddh Mawa</span>
                </span>
              </div>
            </div>

            {/* Freshness & Quality Badges */}
            <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 rounded-2xl border border-amber-900/10 bg-white/90 shadow-2xs text-center">
              <div className="flex flex-col items-center">
                <span className="text-base sm:text-lg">🥛</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#140638] mt-1">Pure Desi Ghee</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500">Gir Cow & Buffalo</span>
              </div>
              <div className="flex flex-col items-center border-x border-amber-900/10 px-1">
                <span className="text-base sm:text-lg">✨</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#140638] mt-1">Made Daily</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500">Melt-in-mouth Fresh</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-base sm:text-lg">📦</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#140638] mt-1">Sealed Box</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500">Airtight Protection</span>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Ratings, Pricing, Variants & Delivery */}
          <div className="min-w-0">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-950 border border-amber-300/60">
              <span>🏷️</span>
              <span>{product.categoryName}</span>
            </div>

            {/* Product Title */}
            <h1 className="mt-2.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-[#140638] font-bold leading-tight tracking-tight">
              {product.name}
            </h1>

            {/* Rating & Reviews Line */}
            <div className="mt-2 flex items-center flex-wrap gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1 text-amber-500">
                <span className="text-base">★</span>
                <span className="font-bold text-[#140638]">
                  {product.avgRating ? product.avgRating.toFixed(1) : "5.0"}
                </span>
              </div>
              <span className="text-slate-400">·</span>
              <a href="#reviews" className="text-slate-600 hover:text-amber-800 underline decoration-amber-400/60 font-medium">
                {product.reviews.length > 0 ? `${product.reviews.length} Customer Reviews` : "Be the first to review"}
              </a>
              <span className="text-slate-400">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                <span>✓</span>
                <span>FSSAI Certified</span>
              </span>
            </div>

            {/* Description */}
            <p className="mt-4 text-xs sm:text-sm sm:text-base leading-relaxed text-slate-700 font-normal">
              {product.description}
            </p>

            {/* Key Quality Highlights */}
            <ul className="mt-3.5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span>Handcrafted with traditional family recipe perfected over decades.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span>Zero artificial colours, zero preservatives — 100% natural aroma.</span>
              </li>
            </ul>

            <div className="my-5 border-t border-amber-900/10"></div>

            {/* Variant Picker (Pack Sizes, Prices, Stepper & Add to Bag) */}
            <VariantPicker variants={product.variants} />

            {/* Delivery Availability Checker */}
            <ProductDeliveryCard />

            {/* Additional Actions: Wishlist & WhatsApp Share */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <WishlistButton productId={product.id} />
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
              >
                <span>💬</span>
                <span>Share Sweet</span>
              </a>
            </div>
          </div>
        </div>

        {/* Heritage Trust Strip */}
        <section className="mt-14 rounded-2xl sm:rounded-3xl border border-amber-900/15 bg-gradient-to-r from-amber-50/80 via-[#fffdf9] to-amber-50/80 p-5 sm:p-7 shadow-xs">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-2xl sm:text-3xl">🪔</span>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#140638]">
              The Vardayini Pure Ghee Promise
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Since 1986, every sweet from our Kalol counter is prepared in small batches using pure,
              fragrant desi ghee, premium whole dry fruits, and slow-simmered dairy mawa. We deliver melt-in-mouth
              warmth to your family celebrations across Gujarat and all over India.
            </p>
          </div>
        </section>

        {/* Customer Reviews Section */}
        <section id="reviews" className="mt-14 scroll-mt-24">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-amber-900/15">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-[#140638] font-bold">
                Customer Reviews
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real feedback from patrons who savoured this sweet.
              </p>
            </div>
            {product.reviews.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/40 rounded-full px-3 py-1 text-xs font-bold text-amber-950">
                <span>★</span>
                <span>{product.avgRating.toFixed(1)} / 5.0</span>
                <span className="text-slate-400">·</span>
                <span>{product.reviews.length} reviews</span>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {product.reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-900/20 bg-white/70 p-6 text-center col-span-2">
                <span className="text-2xl">🍯</span>
                <p className="mt-2 text-sm font-semibold text-[#140638]">No reviews yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Be the first to share how the freshness, aroma, and sweetness travelled to you!
                </p>
              </div>
            ) : (
              product.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-amber-900/10 bg-white/95 p-4 sm:p-5 shadow-xs transition hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#140638]">
                        {review.userName || "Verified Patron"}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span>✓</span> Verified Purchase
                      </span>
                    </div>
                    <div className="text-sm font-medium text-amber-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                  </div>
                  <p className="mt-3 text-xs sm:text-sm leading-6 text-slate-700">
                    {review.comment}
                  </p>
                </article>
              ))
            )}
          </div>

          {/* Review Submission Form */}
          <ReviewForm productId={product.id} />
        </section>

        {/* Related Products Grid */}
        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-amber-900/15">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-[#140638] font-bold">
                  More From This Counter
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Handcrafted favorites from our {product.categoryName} selection.
                </p>
              </div>
              <Link
                href={`/shop?category=${product.categorySlug}`}
                className="text-xs sm:text-sm font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <span>→</span>
              </Link>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
