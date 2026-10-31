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
};

export function VariantPicker({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [qty, setQty] = useState(() => (variants[0]?.stock === 0 ? 0 : 1));
  const selected = useMemo(() => variants.find((v) => v.id === variantId) ?? variants[0], [variants, variantId]);
  if (!selected) return null;
  const unit = unitPrice(selected.price, selected.discountedPrice);

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
      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{formatInr(unit)}</span>
        {selected.discountedPrice ? (
          <span className="text-sm text-[#2a1a12]/45 line-through">{formatInr(selected.price)}</span>
        ) : null}
      </p>
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
            {variant.weight}
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
