"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setError(data?.error || "Could not save review");
        return;
      }
      setDone(true);
      setComment("");
      router.refresh();
    } catch {
      setError("Failed to submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mithai-card mt-6 max-w-xl space-y-3 rounded-3xl p-5">
      <h3 className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">Write a review</h3>
      <select
        value={rating}
        disabled={loading}
        onChange={(e) => setRating(Number(e.target.value))}
        className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm disabled:opacity-50"
      >
        {[5, 4, 3, 2, 1].map((value) => (
          <option key={value} value={value}>
            {value} star{value > 1 ? "s" : ""}
          </option>
        ))}
      </select>
      <textarea
        value={comment}
        disabled={loading}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="How was the freshness, packing, sweetness?"
        className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm disabled:opacity-50"
      />
      {error ? <p className="text-sm text-[#6b1d1d]">{error}</p> : null}
      {done ? <p className="text-sm text-[#2f4a3c]">Thank you — review published.</p> : null}
      <button disabled={loading} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-50">
        {loading ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
