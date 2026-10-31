"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr, unitPrice } from "@/lib/money";
import { Magnetic } from "@/components/core/magnetic";

export interface ProductOptionVariant {
  id: number;
  weight: string;
  sku: string;
  price: number;
  discountedPrice: number | null;
  stock: number;
}

export interface ModalProductData {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  categoryName?: string;
  variants: ProductOptionVariant[];
  fromPrice: number;
}

interface ProductOptionsModalProps {
  product: ModalProductData | null;
  onClose: () => void;
  onAddToCartSuccess?: (productName: string) => void;
}

export function ProductOptionsModal({
  product,
  onClose,
  onAddToCartSuccess,
}: ProductOptionsModalProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!product) return null;

  const variants = product.variants || [];
  const currentVariant = variants[selectedIdx] || variants[0];
  const effectivePrice = currentVariant
    ? unitPrice(currentVariant.price, currentVariant.discountedPrice)
    : product.fromPrice;
  const totalPrice = effectivePrice * quantity;
  // Capture before async to satisfy TS narrowing inside closures
  const productName = product.name;

  async function handleAdd() {
    if (!currentVariant || loading) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: currentVariant.id,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "Could not add to cart");
        return;
      }
      onAddToCartSuccess?.(productName);
      onClose();
    } catch {
      setErrorMsg("Failed to add to cart. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl z-10 border border-[#3b1e54]/10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-4 sm:p-7 space-y-3.5 sm:space-y-4">
          <div className="flex gap-3 sm:gap-4 items-start">
            <div className="relative h-18 w-18 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl bg-[#faf6ee] border border-slate-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  🍬
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              {product.categoryName && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b45309]">
                  {product.categoryName}
                </span>
              )}
              <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[#24142e] leading-snug">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>

          {/* Pack Size Variants */}
          {variants.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Select Pack Size:</span>
                <span className="text-slate-500">
                  {currentVariant?.weight} Selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.map((v, i) => {
                  const isSelected = selectedIdx === i;
                  const vPrice = unitPrice(v.price, v.discountedPrice);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedIdx(i)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[#3b1e54] bg-[#3b1e54]/5 ring-2 ring-[#3b1e54]/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">
                        {v.weight}
                      </span>
                      <span className="block text-xs font-semibold text-[#3b1e54]">
                        {formatInr(vPrice)}
                      </span>
                      {v.discountedPrice && (
                        <span className="block text-[10px] text-slate-500 line-through">
                          {formatInr(v.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Live Price Summary */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  −
                </button>
                <span className="px-3 text-xs font-bold text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Total Price</span>
              <span className="text-2xl font-bold text-[#3b1e54]">
                {formatInr(totalPrice)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">
              {errorMsg}
            </p>
          )}

          {/* Add to Cart CTA */}
          <div className="pt-2 space-y-2">
            <Magnetic className="w-full">
              <button
                type="button"
                disabled={loading}
                onClick={handleAdd}
                className="btn-purple w-full rounded-2xl py-3 text-xs sm:text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? "Adding to Cart..." : `Add to Cart • ${formatInr(totalPrice)}`}
              </button>
            </Magnetic>

            <Link
              href={`/shop/${product.slug}`}
              className="block text-center text-xs font-semibold text-slate-500 hover:text-[#3b1e54] transition"
            >
              View Full Product Details &amp; Ingredients →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
