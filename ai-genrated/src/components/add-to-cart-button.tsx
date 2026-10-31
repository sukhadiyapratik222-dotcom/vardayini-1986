"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Magnetic } from "@/components/core/magnetic";

export function AddToCartButton({
  variantId,
  quantity = 1,
  label = "Add to box",
  className,
  disabled = false,
}: {
  variantId: number;
  quantity?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function add() {
    if (disabled || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || "Could not add");
        return;
      }
      setStatus("done");
      setMessage("Added to your mithai box");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      setMessage("Could not add to cart");
    } finally {
      if (status !== "done") {
        // status is updated
      }
    }
  }

  return (
    <div className="w-full">
      <Magnetic className="w-full">
        <button
          type="button"
          onClick={add}
          disabled={disabled || status === "loading"}
          className={
            className ||
            "btn-primary w-full min-h-[44px] flex items-center justify-center rounded-full px-4 py-2.5 text-xs sm:text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          }
        >
          {status === "loading" ? "Adding..." : status === "done" ? "Added" : label}
        </button>
      </Magnetic>
      {status === "error" ? <p className="mt-1 text-xs text-[#6b1d1d]">{message}</p> : null}
    </div>
  );
}
