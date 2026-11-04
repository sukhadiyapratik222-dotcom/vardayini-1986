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

  // Requirements 3 & 5: Show original price with strikethrough ONLY when greater than selling price.
  // If original price and selling price are identical, hide the original price and discount badge.
  const rawOriginalPrice = selected.discountedPrice ? selected.price : null;
  const hasDiscount = Boolean(rawOriginalPrice && rawOriginalPrice > sellingPrice);
  const originalPrice = hasDiscount ? rawOriginalPrice : null;

  // Requirement 4: Calculate the discount percentage automatically
  const discountPercent = hasDiscount && originalPrice
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
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
      {/* Requirement 1: Display selected product pack size clearly */}
      <div className="flex items-center">
        <span className="text-xs sm:text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1 inline-flex items-center gap-1.5 shadow-2xs">
          {packSizeText}
        </span>
      </div>

      {/* Requirements 2, 3, 4, 5, 6, 7, 8: Price Display Section */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        {/* Prominent Current Selling Price */}
        <span className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#182230]">
          {formatInr(sellingPrice)}
        </span>

        {/* Strikethrough Original Price: Only when greater than selling price */}
        {hasDiscount && originalPrice && (
          <span className="text-sm sm:text-base md:text-lg text-[#5e6d82] line-through font-medium">
            {formatInr(originalPrice)}
          </span>
        )}

        {/* Automatic Discount Percentage Badge: Hidden if identical */}
        {hasDiscount && discountPercent > 0 && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-emerald-700 border border-emerald-200/70 shadow-2xs">
            {discountPercent}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => handleSelectVariant(variant)}
            className={`min-h-[44px] flex items-center rounded-full px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
              variant.id === selected.id ? "bg-[#6b1d1d] text-[#fff8ee] shadow-sm" : "mithai-card hover:bg-slate-50"
            }`}
          >
            {variant.packName && variant.packName !== "Standard Pack"
              ? `${variant.packName} (${variant.weight})`
              : variant.weight}
          </button>
        ))}
      </div>
      {isOutOfStock ? (
        <p className="text-xs font-semibold text-[#6b1d1d]">Out of stock</p>
      ) : (
        <p className="text-xs text-[#2a1a12]/55">{selected.stock} packs left</p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
        <div className="flex items-center justify-center self-start rounded-full border border-[#6b1d1d]/15 bg-white shadow-xs">
          <button
            type="button"
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center px-3 font-bold text-base disabled:opacity-40 cursor-pointer"
            disabled={isOutOfStock || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-sm">{isOutOfStock ? 0 : qty}</span>
          <button
            type="button"
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center px-3 font-bold text-base disabled:opacity-40 cursor-pointer"
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
            label={isOutOfStock ? "Out of stock" : "Add to mithai box"}
          />
        </div>
      </div>
    </div>
  );
}
