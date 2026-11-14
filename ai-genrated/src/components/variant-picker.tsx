"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatInr, unitPrice } from "@/lib/money";

type Variant = {
  id: number;
  weight: string;
  price: number;
  discountedPrice: number | null;
  stock: number;
  packName?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
};

export function VariantPicker({ variants }: { variants: Variant[] }) {
  const initialVariant = useMemo(() => variants.find((v) => v.isDefault) || variants[0], [variants]);
  const [variantId, setVariantId] = useState(initialVariant?.id);
  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? initialVariant ?? variants[0],
    [variants, variantId, initialVariant]
  );
  const [qty, setQty] = useState(() => (selected?.stock === 0 ? 0 : 1));
  if (!selected) return null;
  const sellingPrice = unitPrice(selected.price, selected.discountedPrice);

  // Requirements 3 & 5: Show original price with strikethrough ONLY when strictly greater than selling price.
  // If original price and selling price are identical, hide the original price and discount badge completely.
  const rawOriginalPrice = (selected as any).originalPrice || (selected as any).mrp || (selected.discountedPrice ? selected.price : null);
  const numSelling = Number(sellingPrice);
  const numOriginal = rawOriginalPrice ? Number(rawOriginalPrice) : null;
  const hasDiscount = Boolean(numOriginal && !isNaN(numOriginal) && numOriginal > numSelling);
  const originalPrice = hasDiscount ? numOriginal : null;

  // Requirement 4: Calculate the discount percentage automatically
  const discountPercent = hasDiscount && originalPrice
    ? Math.round(((originalPrice - numSelling) / originalPrice) * 100)
    : 0;

  // Requirement 1: Display the selected product pack size clearly (e.g. Standard Pack • 1 kg)
  const currentWeight = selected.weight || "1 kg";
  const packName = selected.packName || "Standard Pack";
  const packSizeText = currentWeight.toLowerCase().includes("pack")
    ? currentWeight
    : `${packName} • ${currentWeight}`;

  function handleSelectVariant(variant: Variant) {
    setVariantId(variant.id);
    if (variant.stock <= 0) {
      setQty(0);
    } else {
      setQty((prev) => (prev <= 0 ? 1 : Math.min(prev, variant.stock)));
    }
  }

  const isOutOfStock = selected.stock <= 0;

  return (
    <div className="mt-6 space-y-4">
      {/* Pack size indicator */}
      <div className="flex items-center">
        <span className="text-xs sm:text-sm font-semibold text-amber-950 bg-amber-500/10 border border-amber-300/60 rounded-full px-3.5 py-1 inline-flex items-center gap-1.5 shadow-2xs">
          <span>🏷️</span>
          <span>{packSizeText}</span>
        </span>
      </div>

      {/* Price Display Section */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#140638]">
          {formatInr(sellingPrice)}
        </span>

        {hasDiscount && originalPrice && (
          <span className="text-base sm:text-lg text-slate-400 line-through font-medium">
            {formatInr(originalPrice)}
          </span>
        )}

        {hasDiscount && discountPercent > 0 && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-emerald-700 border border-emerald-200/70 shadow-2xs">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Variant Pills */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Select Pack Size:</p>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => handleSelectVariant(variant)}
              className={`min-h-[44px] flex items-center rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                variant.id === selected.id
                  ? "bg-[#140638] text-[#dfb755] border-2 border-[#dfb755] shadow-sm scale-[1.02]"
                  : "bg-white/90 text-slate-700 border border-amber-900/15 hover:border-amber-400 hover:bg-amber-50/40"
              }`}
            >
              <span>
                {variant.packName && variant.packName !== "Standard Pack"
                  ? `${variant.packName} (${variant.weight})`
                  : variant.weight}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stock Status */}
      {isOutOfStock ? (
        <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          <span>Currently Out of Stock · Baking fresh batch</span>
        </p>
      ) : (
        <p className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>In Stock · Ready for fresh dispatch ({selected.stock} packs available)</span>
        </p>
      )}

      {/* Quantity & Add to Cart */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 pt-1">
        <div className="flex items-center justify-center self-start rounded-xl border border-amber-900/20 bg-white shadow-xs overflow-hidden">
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-lg text-[#140638] hover:bg-amber-50 disabled:opacity-40 cursor-pointer transition active:scale-90"
            disabled={isOutOfStock || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-bold text-sm sm:text-base text-[#140638]">
            {isOutOfStock ? 0 : qty}
          </span>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-lg text-[#140638] hover:bg-amber-50 disabled:opacity-40 cursor-pointer transition active:scale-90"
            disabled={isOutOfStock || qty >= selected.stock}
            onClick={() => setQty((q) => Math.min(selected.stock, q + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <div className="flex-1 w-full">
          <AddToCartButton
            variantId={selected.id}
            quantity={isOutOfStock ? 0 : qty}
            disabled={isOutOfStock}
            label={isOutOfStock ? "Out of stock" : "Add to Mithai Box"}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm sm:text-base font-bold bg-gradient-to-r from-[#140638] via-[#240b54] to-[#140638] text-[#dfb755] border border-[#dfb755]/50 shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
