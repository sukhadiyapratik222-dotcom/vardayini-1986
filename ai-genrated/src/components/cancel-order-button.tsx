"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (loading) return;
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const guestToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
      const cancelUrl = guestToken
        ? `/api/orders/${orderNumber}?token=${encodeURIComponent(guestToken)}`
        : `/api/orders/${orderNumber}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (guestToken) {
        headers["x-guest-token"] = guestToken;
      }
      const res = await fetch(cancelUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not cancel");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to cancel order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={cancel}
        disabled={loading}
        className="rounded-full border border-[#6b1d1d]/20 px-4 py-2 text-sm hover:bg-[#fff8ee] disabled:opacity-50"
      >
        {loading ? "Cancelling..." : "Cancel order"}
      </button>
      {error ? <p className="mt-2 text-xs text-[#6b1d1d]">{error}</p> : null}
    </div>
  );
}
