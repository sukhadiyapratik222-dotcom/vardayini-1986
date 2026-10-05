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
      className="rounded-full border border-[#6b1d1d]/20 px-4 py-2.5 text-sm hover:bg-[#fff8ee] disabled:opacity-50"
    >
      {loading ? "Updating..." : msg || "Save to wishlist"}
    </button>
  );
}
