"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatInr, unitPrice } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart-button";

export type ProductVariantData = {
  id: number;
  weight: string;
  price: number;
  discountedPrice: number | null;
  stock: number;
};

export type ProductCardData = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  tags: string;
  fromPrice: number;
  comparePrice: number | null;
  variants: ProductVariantData[];
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const tags = product.tags.split(",").filter(Boolean);
  const variants = product.variants || [];
  const [selectedIdx, setSelectedIdx] = useState(0);

  const currentVariant = variants[selectedIdx] || variants[0];
  const currentPrice = currentVariant
    ? unitPrice(currentVariant.price, currentVariant.discountedPrice)
    : product.fromPrice;
  const currentCompare = currentVariant?.discountedPrice ? currentVariant.price : null;

  return (
    <article className="mithai-card group flex flex-col justify-between overflow-hidden bg-white p-3 rounded-2xl">
      {/* Product Image & Badges */}
      <div>
        <Link
          href={`/shop/${product.slug}`}
          className="relative block aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#faf7f0]"
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f4f7fe] text-3xl">
              🍬
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#0b2f8a] shadow-sm backdrop-blur-sm"
              >
                {tag.replace("_", " ")}
              </span>
            ))}
          </div>
          <div className="absolute right-2 top-2 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-[#b89130] shadow-sm backdrop-blur-sm">
            ★ 4.9
          </div>
        </Link>

        {/* Title & Description */}
        <div className="mt-2 space-y-0.5">
          <Link href={`/shop/${product.slug}`}>
            <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-[15px] font-bold tracking-tight text-[#182230] group-hover:text-[#0b2f8a] transition leading-snug line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-[11px] text-[#5e6d82] line-clamp-1">
            Freshly prepared with 100% Shuddh Desi Ghee
          </p>
        </div>
      </div>

      {/* Weight Selector Tabs & Price */}
      <div className="mt-2.5 space-y-2 pt-2 border-t border-[#0b2f8a]/6">
        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                  selectedIdx === i
                    ? "bg-[#0b2f8a] text-white shadow-2xs"
                    : "bg-[#f4f7fe] text-[#5e6d82] hover:bg-[#e8eeff] hover:text-[#0b2f8a]"
                }`}
              >
                {v.weight}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold text-[#182230]">
              {formatInr(currentPrice)}
            </span>
            {currentCompare && (
              <span className="text-[11px] text-[#5e6d82] line-through">
                {formatInr(currentCompare)}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-[#0b2f8a]/80">
            {currentVariant?.weight || "Per Pack"}
          </span>
        </div>

        {/* Add to Cart Button */}
        {currentVariant ? (
          <AddToCartButton
            variantId={currentVariant.id}
            label="Add to Cart"
            className="btn-primary w-full rounded-full px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-[0.98]"
          />
        ) : null}
      </div>
    </article>
  );
}
