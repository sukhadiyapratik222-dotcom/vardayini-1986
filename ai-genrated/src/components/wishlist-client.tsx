"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface WishlistItem {
  id: number;
  productId?: number;
  name: string;
  slug: string;
  imageUrl: string;
  price?: number;
}

interface WishlistClientProps {
  initialItems: WishlistItem[];
  isLoggedIn: boolean;
}

export function WishlistClient({ initialItems, isLoggedIn }: WishlistClientProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [loading, setLoading] = useState(!isLoggedIn);

  // Load from localStorage for guests, or sync guest likes for logged-in users
  useEffect(() => {
    try {
      const storedMap = localStorage.getItem("vsm_guest_wishlist_items");
      const guestItems: WishlistItem[] = storedMap ? Object.values(JSON.parse(storedMap)) : [];

      if (!isLoggedIn) {
        // Guest mode: combine with any IDs stored in vsm_wishlist_ids
        if (guestItems.length > 0) {
          setItems(guestItems);
          setLoading(false);
        } else {
          // If only IDs stored, fetch from API
          const idsMap = localStorage.getItem("vsm_wishlist_ids");
          if (idsMap) {
            const parsed = JSON.parse(idsMap);
            const activeIds = Object.keys(parsed).filter((id) => parsed[id]);
            if (activeIds.length > 0) {
              fetch(`/api/products?ids=${activeIds.join(",")}`)
                .then((res) => res.json())
                .then((data) => {
                  if (data?.products) {
                    const mapped = data.products.map((p: any) => ({
                      id: p.id,
                      productId: p.id,
                      name: p.name,
                      slug: p.slug,
                      imageUrl: p.imageUrl || "/images/kaju-katli.jpg",
                    }));
                    setItems(mapped);
                  }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
              return;
            }
          }
          setItems([]);
          setLoading(false);
        }
      } else {
        // Logged-in mode: sync any guest items that were liked before login
        if (guestItems.length > 0) {
          const existingIds = new Set(initialItems.map((it) => it.productId || it.id));
          const unsynced = guestItems.filter((it) => !existingIds.has(it.productId || it.id));

          if (unsynced.length > 0) {
            Promise.all(
              unsynced.map((it) =>
                fetch("/api/wishlist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: it.productId || it.id }),
                }).catch(() => null)
              )
            ).then(() => {
              // Refresh full list from server
              fetch("/api/wishlist")
                .then((res) => res.json())
                .then((data) => {
                  if (data?.items) setItems(data.items);
                })
                .catch(() => {});
            });
          }
        }
      }
    } catch {
      setLoading(false);
    }
  }, [initialItems, isLoggedIn]);

  const handleRemove = async (item: WishlistItem) => {
    const targetId = item.productId || item.id;
    // Optimistic UI update
    setItems((prev) => prev.filter((it) => (it.productId || it.id) !== targetId));

    // Update localStorage
    try {
      const storedIds = localStorage.getItem("vsm_wishlist_ids");
      if (storedIds) {
        const parsed = JSON.parse(storedIds);
        delete parsed[targetId];
        localStorage.setItem("vsm_wishlist_ids", JSON.stringify(parsed));
      }

      const storedItems = localStorage.getItem("vsm_guest_wishlist_items");
      if (storedItems) {
        const parsed = JSON.parse(storedItems);
        delete parsed[targetId];
        localStorage.setItem("vsm_guest_wishlist_items", JSON.stringify(parsed));
      }
    } catch {}

    // If logged in, also remove from database
    if (isLoggedIn) {
      try {
        if (item.id) {
          await fetch(`/api/wishlist/${item.id}`, { method: "DELETE" });
        } else {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: targetId }),
          });
        }
      } catch {}
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-amber-900/10">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#c45c26] block">
            SAVED FAVOURITES
          </span>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold text-[#140638]">
            Your Watchlist &amp; Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {items.length === 1 ? "1 saved sweet" : `${items.length} saved sweets`} you liked with double-tap
          </p>
        </div>

        <Link
          href="/shop"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#140638] text-[#dfb755] hover:bg-[#250d54] transition cursor-pointer"
        >
          <span>Explore More Sweets</span>
          <span>→</span>
        </Link>
      </div>

      {/* Guest Notice */}
      {!isLoggedIn && (
        <div className="mt-6 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-300/60 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-amber-950 font-medium">
            <span className="text-base sm:text-lg">💖</span>
            <span>
              Viewing your local wishlist. <strong>Log in</strong> to permanently save your favourites across all devices.
            </span>
          </div>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-[#140638] text-[#dfb755] font-bold text-xs hover:bg-[#250d54] transition shrink-0"
          >
            Log In
          </Link>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        /* Items Grid */
        <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.productId || item.id}
              className="bg-white rounded-2xl p-3 border border-amber-900/10 shadow-sm hover:shadow-md transition flex flex-col justify-between group relative"
            >
              {/* Remove Heart Button */}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-white/95 backdrop-blur-xs shadow-md border border-amber-900/10 flex items-center justify-center cursor-pointer transition active:scale-75 hover:bg-rose-50 group-hover:scale-105"
                title="Remove from watchlist"
                aria-label={`Remove ${item.name} from watchlist`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff3b5c" stroke="#ff3b5c" strokeWidth="2">
                  <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
                </svg>
              </button>

              {/* Product Image Link */}
              <Link
                href={`/shop/${item.slug}`}
                className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#faf7f0] mb-3 block"
              >
                <Image
                  src={item.imageUrl || "/images/kaju-katli.jpg"}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </Link>

              {/* Title & View CTA */}
              <div className="space-y-2">
                <Link
                  href={`/shop/${item.slug}`}
                  className="font-bold text-xs sm:text-sm text-[#140638] line-clamp-1 group-hover:text-amber-800 transition block"
                >
                  {item.name}
                </Link>

                <Link
                  href={`/shop/${item.slug}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#140638]/5 hover:bg-[#140638] text-[#140638] hover:text-[#dfb755] transition"
                >
                  <span>Order Now</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-12 text-center py-16 px-4 bg-white/70 rounded-3xl border border-amber-900/10 shadow-xs max-w-lg mx-auto">
          <span className="text-5xl sm:text-6xl block mb-3">💖</span>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#140638]">
            Your watchlist is empty
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
            Double tap photo or tap the heart ♥ on any sweet across our shop and home page to save your favourites here!
          </p>
          <div className="mt-6">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[#140638] text-[#dfb755] px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-[#250d54] transition shadow-md"
            >
              <span>Explore Sweets</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
