"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function ReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      setDone(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [done]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 4) {
      setError("Please write a short review (at least 4 characters).");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment: trimmedComment }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.status === 401) {
        setError("Please log in to submit a review.");
        if (typeof window !== "undefined") {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
        return;
      }

      if (!res.ok) {
        setError(data?.error || "Could not save review. Please try again.");
        return;
      }

      setDone(true);
      setComment("");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to submit review. Please try again.");
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
        onChange={(e) => {
          setRating(Number(e.target.value));
          if (error) setError("");
        }}
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
        onChange={(e) => {
          setComment(e.target.value);
          if (error) setError("");
        }}
        rows={3}
        placeholder="How was the freshness, packing, sweetness?"
        className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm disabled:opacity-50"
      />
      {error ? (
        <div className="rounded-xl bg-red-50 p-2.5 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      ) : null}
      {done ? (
        <div className="rounded-xl bg-emerald-50 p-2.5 text-sm text-emerald-800 border border-emerald-200">
          Thank you for your review
        </div>
      ) : null}
      <button disabled={loading} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-50">
        {loading ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
