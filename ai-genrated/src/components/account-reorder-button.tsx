"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ReorderItem {
  variantId: number | null;
  productName: string;
  variantWeight?: string;
  quantity: number;
}

export function AccountReorderButton({
  items,
  orderNumber,
}: {
  items: ReorderItem[];
  orderNumber: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReorder = async () => {
    setLoading(true);
    try {
      const validItems = items.filter((it) => it.variantId && it.variantId > 0);
      if (validItems.length === 0) {
        router.push("/shop");
        return;
      }

      for (const it of validItems) {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: it.variantId,
            quantity: it.quantity || 1,
          }),
        });
      }

      setSuccess(true);
      router.push("/cart");
    } catch (err) {
      console.error("[Reorder error]:", err);
      alert("Failed to reorder items. Please try again or browse our store.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#dfb755] hover:bg-[#c99f3b] text-[#0b2f8a] font-bold text-xs px-3.5 py-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
      title={`Reorder items from #${orderNumber}`}
    >
      <span>🔁</span>
      <span>{loading ? "Adding to Cart..." : success ? "Added! Redirecting..." : "Order Again"}</span>
    </button>
  );
}
