"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatInr } from "@/lib/money";
import type { CartLine } from "@/lib/cart";

type CartState = {
  lines: CartLine[];
  totals: { subtotal: number; discount: number; tax: number; deliveryFee: number; total: number };
  couponCode: string | null;
  couponLabel: string | null;
};

export function CartClient({ initial }: { initial: CartState }) {
  const router = useRouter();
  const [cart, setCart] = useState(initial);
  const [code, setCode] = useState(initial.couponCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function updateQty(itemId: number, quantity: number) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update quantity");
        return;
      }
      setCart((prev) => ({ ...prev, lines: data.items, totals: data.totals }));
      router.refresh();
    } catch {
      setError("Failed to update item quantity");
    } finally {
      setLoading(false);
    }
  }

  async function remove(itemId: number) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not remove item");
        return;
      }
      setCart((prev) => ({ ...prev, lines: data.items, totals: data.totals }));
      router.refresh();
    } catch {
      setError("Failed to remove item");
    } finally {
      setLoading(false);
    }
  }

  async function applyCoupon() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid coupon");
        return;
      }
      setCart((prev) => ({
        ...prev,
        lines: data.items,
        totals: data.totals,
        couponCode: data.couponCode,
        couponLabel: data.couponLabel,
      }));
      router.refresh();
    } catch {
      setError("Failed to apply coupon");
    } finally {
      setLoading(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mithai-card mt-8 rounded-3xl p-10 text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl text-[#6b1d1d]">Your mithai box is empty.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-block rounded-full px-6 py-3 text-sm">
          Browse the counter
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-[#6b1d1d]/20 bg-[#6b1d1d]/10 p-4 text-sm text-[#6b1d1d]">
            {error}
          </div>
        ) : null}
        {cart.lines.map((line) => (
          <article key={line.id} className="mithai-card flex gap-4 rounded-3xl p-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl">
              <Image src={line.imageUrl} alt={line.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <Link href={`/shop/${line.slug}`} className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">
                {line.name}
              </Link>
              <p className="text-sm text-[#2a1a12]/60">{line.weight}</p>
              <p className="mt-1 font-medium">{formatInr(line.unit)}</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={loading}
                  onClick={() => updateQty(line.id, line.quantity - 1)}
                  className="h-8 w-8 rounded-full border disabled:opacity-50"
                >
                  −
                </button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={loading}
                  onClick={() => updateQty(line.id, line.quantity + 1)}
                  className="h-8 w-8 rounded-full border disabled:opacity-50"
                >
                  +
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => remove(line.id)}
                  className="ml-auto text-xs text-[#c45c26] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <aside className="mithai-card h-fit rounded-3xl p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">Bill</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatInr(cart.totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd>-{formatInr(cart.totals.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>GST (5%)</dt>
            <dd>{formatInr(cart.totals.tax)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{cart.totals.deliveryFee === 0 ? "Free" : formatInr(cart.totals.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#6b1d1d]/10 pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatInr(cart.totals.total)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Coupon"
            disabled={loading}
            className="flex-1 rounded-full border border-[#6b1d1d]/15 px-3 py-2 text-sm disabled:opacity-50"
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={loading}
            className="rounded-full border px-4 text-sm disabled:opacity-50"
          >
            {loading ? "..." : "Apply"}
          </button>
        </div>
        {cart.couponLabel ? <p className="mt-2 text-xs text-[#2f4a3c]">{cart.couponLabel}</p> : null}
        {error ? <p className="mt-2 text-xs text-[#6b1d1d]">{error}</p> : null}
        <p className="mt-3 text-xs text-[#2a1a12]/50">Try FESTIVE15, MITHAI50 or FREEDEL</p>
        <Link href="/checkout" className="btn-primary mt-6 block rounded-full py-3 text-center text-sm">
          Checkout
        </Link>
      </aside>
    </div>
  );
}
