"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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

  // Re-sync with latest server cart on mount and on BFCache restore (browser back/forward button)
  useEffect(() => {
    let isMounted = true;

    async function syncCart() {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCart((prev) => ({
              ...prev,
              lines: data.items || [],
              totals: data.totals || prev.totals,
            }));
            const newCount = (data.items || []).reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);
            window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: newCount } }));
          }
        }
      } catch (err) {
        console.warn("[CartClient] Cart sync error:", err);
      }
    }

    syncCart();

    const handlePageShow = (e: PageTransitionEvent) => {
      // e.persisted is true when restored from browser bfcache
      syncCart();
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", syncCart);

    return () => {
      isMounted = false;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", syncCart);
    };
  }, []);

  async function updateQty(itemId: number, quantity: number, variantId?: number) {
    if (loading) return;
    setLoading(true);
    setError("");
    const targetId = variantId || itemId;
    try {
      const res = await fetch(`/api/cart/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          // If 404, item was already removed; refresh cart from server
          const freshRes = await fetch("/api/cart", { cache: "no-store" });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            setCart((prev) => ({ ...prev, lines: freshData.items || [], totals: freshData.totals || prev.totals }));
            const newCount = (freshData.items || []).reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);
            window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: newCount } }));
          }
          return;
        }
        setError(data.error || "Could not update quantity");
        return;
      }
      setCart((prev) => ({ ...prev, lines: data.items || [], totals: data.totals || prev.totals }));
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

  async function remove(itemId: number, variantId?: number) {
    if (loading) return;
    setLoading(true);
    setError("");
    const targetId = variantId || itemId;

    // Optimistically update UI so item is immediately hidden
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== itemId && l.variantId !== targetId),
    }));

    try {
      const res = await fetch(`/api/cart/${targetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok && res.status !== 404) {
        setError(data.error || "Could not remove item");
        return;
      }
      if (data && data.items) {
        setCart((prev) => ({ ...prev, lines: data.items, totals: data.totals }));
        if (typeof window !== "undefined") {
          const newCount = (data.items || []).reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: newCount } }));
        }
      } else {
        // Fallback: sync fresh cart lines
        const freshRes = await fetch("/api/cart", { cache: "no-store" });
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          setCart((prev) => ({ ...prev, lines: freshData.items || [], totals: freshData.totals || prev.totals }));
          const newCount = (freshData.items || []).reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: newCount } }));
        }
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
          const lineTotal = line.lineTotal || (line.unit * line.quantity);
          return (
            <article
              key={line.id}
              className="mithai-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-amber-900/10 shadow-xs hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl sm:rounded-2xl shrink-0 bg-amber-50/50 border border-amber-900/10 shadow-2xs">
                  <Image
                    src={safeImage}
                    alt={line.name || "Item"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80px, 96px"
                  />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <Link
                    href={`/shop/${line.slug || ""}`}
                    className="font-[family-name:var(--font-display)] text-lg sm:text-xl text-[#6b1d1d] font-bold hover:underline line-clamp-1 block"
                  >
                    {line.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {line.weight ? (
                      <span className="inline-block text-xs font-medium text-stone-600 bg-stone-100/90 rounded-md px-2 py-0.5">
                        {line.weight}
                      </span>
                    ) : null}
                    <span className="text-xs text-stone-500 font-medium">
                      Unit: {formatInr(line.unit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-amber-900/10">
                {/* Stepper */}
                <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50/90 p-1 shadow-2xs">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={loading}
                    onClick={() => updateQty(line.id, line.quantity - 1, line.variantId)}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white hover:bg-amber-50 hover:text-amber-800 text-stone-700 border border-stone-200/80 flex items-center justify-center font-bold text-sm sm:text-base disabled:opacity-40 transition cursor-pointer active:scale-95 shadow-xs"
                  >
                    −
                  </button>
                  <span className="font-bold text-xs sm:text-sm px-3 min-w-[34px] text-center text-stone-900 tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={loading}
                    onClick={() => updateQty(line.id, line.quantity + 1, line.variantId)}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white hover:bg-amber-50 hover:text-amber-800 text-stone-700 border border-stone-200/80 flex items-center justify-center font-bold text-sm sm:text-base disabled:opacity-40 transition cursor-pointer active:scale-95 shadow-xs"
                  >
                    +
                  </button>
                </div>

                {/* Line Total Price */}
                <div className="text-right min-w-[80px] sm:min-w-[100px]">
                  <p className="font-bold text-base sm:text-lg text-[#6b1d1d] tabular-nums">
                    {formatInr(lineTotal)}
                  </p>
                  {line.quantity > 1 ? (
                    <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                      {formatInr(line.unit)} each
                    </p>
                  ) : null}
                </div>

                {/* Delete / Remove Action */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => remove(line.id, line.variantId)}
                  aria-label={`Remove ${line.name} from cart`}
                  title="Remove item"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-rose-200 bg-rose-50/80 hover:bg-rose-100 hover:border-rose-300 text-rose-600 hover:text-rose-700 flex items-center justify-center transition cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs group"
                >
                  <svg className="w-4 h-4 transition group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
