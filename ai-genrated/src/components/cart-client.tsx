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
  user?: { id: number; name: string; phone: string; email: string } | null;
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
      if (typeof window !== "undefined") {
        const newCount = (data.items || []).reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);
        window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: newCount } }));
      }
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
      if (typeof window !== "undefined") {
        const newCount = (data.items || []).reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);
        window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: newCount } }));
      }
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

  const lines = cart?.lines || [];
  if (lines.length === 0) {
    return (
      <div className="mithai-card mt-8 rounded-3xl p-8 sm:p-12 text-center space-y-4">
        <span className="text-5xl block">📦</span>
        <p className="font-[family-name:var(--font-display)] text-3xl text-[#6b1d1d]">Your mithai box is empty.</p>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
          Looking for inspiration? Answer 5 quick questions in our Taste Quiz and discover your perfect heritage mithai match.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/find-your-mithai"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 shadow-md transition"
          >
            <span>Take Taste Quiz</span>
            <span>✨</span>
          </Link>
          <Link href="/shop" className="btn-primary inline-block rounded-full px-6 py-3 text-xs sm:text-sm">
            Browse the counter
          </Link>
        </div>
      </div>
    );
  }

  const totals = cart?.totals || { subtotal: 0, discount: 0, tax: 0, deliveryFee: 0, total: 0 };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-[#6b1d1d]/20 bg-[#6b1d1d]/10 p-4 text-sm text-[#6b1d1d]">
            {error}
          </div>
        ) : null}
        {lines.map((line) => {
          const safeImage = line.imageUrl && line.imageUrl.trim() ? line.imageUrl : "/images/kaju-katli.jpg";
          return (
            <article key={line.id} className="mithai-card flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl sm:rounded-2xl shrink-0 bg-slate-50">
                  <Image src={safeImage} alt={line.name || "Item"} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/shop/${line.slug || ""}`} className="font-[family-name:var(--font-display)] text-lg sm:text-2xl text-[#6b1d1d] font-bold hover:underline line-clamp-1">
                    {line.name}
                  </Link>
                  <p className="text-xs sm:text-sm text-[#2a1a12]/60">{line.weight}</p>
                  <p className="mt-0.5 sm:mt-1 font-semibold text-sm sm:text-base text-[#182230]">{formatInr(line.unit)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={loading}
                    onClick={() => updateQty(line.id, line.quantity - 1)}
                    className="min-h-[36px] min-w-[36px] h-9 w-9 sm:min-h-[44px] sm:min-w-[44px] sm:h-11 sm:w-11 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-base disabled:opacity-50 transition cursor-pointer shadow-xs"
                  >
                    −
                  </button>
                  <span className="font-bold text-xs sm:text-sm min-w-[20px] text-center">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={loading}
                    onClick={() => updateQty(line.id, line.quantity + 1)}
                    className="min-h-[36px] min-w-[36px] h-9 w-9 sm:min-h-[44px] sm:min-w-[44px] sm:h-11 sm:w-11 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-base disabled:opacity-50 transition cursor-pointer shadow-xs"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => remove(line.id)}
                  className="text-xs font-semibold text-[#c45c26] hover:text-[#9e3a10] min-h-[36px] sm:min-h-[44px] px-2.5 flex items-center disabled:opacity-50 cursor-pointer transition"
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="mithai-card h-fit rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">Bill</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatInr(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd>-{formatInr(totals.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>GST (5%)</dt>
            <dd>{formatInr(totals.tax)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{totals.deliveryFee === 0 ? "Free" : formatInr(totals.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#6b1d1d]/10 pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatInr(totals.total)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Coupon (e.g. FESTIVE15)"
            disabled={loading}
            className="flex-1 min-h-[44px] rounded-full border border-[#6b1d1d]/15 px-4 py-2.5 text-sm disabled:opacity-50 outline-none focus:border-[#0b2f8a]"
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={loading}
            className="min-h-[44px] rounded-full border border-[#0b2f8a] bg-[#0b2f8a] text-white hover:bg-[#071c54] px-5 text-sm font-semibold disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? "..." : "Apply"}
          </button>
        </div>
        {cart.couponLabel ? <p className="mt-2 text-xs font-semibold text-[#2f4a3c]">✓ {cart.couponLabel}</p> : null}
        {error ? <p className="mt-2 text-xs font-semibold text-[#6b1d1d]">✕ {error}</p> : null}
        <p className="mt-3 text-xs text-[#2a1a12]/50">Try FESTIVE15, MITHAI50 or FREEDEL</p>
        <Link
          href={cart.user ? "/checkout" : "/login?redirect=/checkout"}
          className="btn-primary mt-6 min-h-[48px] flex items-center justify-center rounded-full py-3 text-center text-sm font-semibold transition"
        >
          {cart.user ? "Proceed to Checkout" : "Login"}
        </Link>
      </aside>
    </div>
  );
}
