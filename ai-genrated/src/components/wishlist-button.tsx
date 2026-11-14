"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WishlistButton({ productId }: { productId: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        setMsg("Please log in to save favourites");
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Could not update wishlist");
        return;
      }

      setMsg(data.saved ? "Saved to wishlist" : "Removed from wishlist");
      router.refresh();
    } catch {
      setMsg("Failed to update wishlist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label="Add to wishlist"
      className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-amber-900/15 bg-white/90 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#140638] hover:bg-amber-50 hover:border-amber-400 hover:text-amber-900 disabled:opacity-50 transition cursor-pointer shadow-2xs"
    >
      <span className="text-rose-600 text-sm">♥</span>
      <span>{loading ? "Updating..." : msg || "Save to Wishlist"}</span>
    </button>
  );
}
