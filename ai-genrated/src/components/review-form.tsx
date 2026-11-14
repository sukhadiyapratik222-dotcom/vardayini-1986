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
    <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-3 rounded-2xl sm:rounded-3xl border border-amber-900/15 bg-white/95 p-5 shadow-xs">
      <h3 className="font-[family-name:var(--font-display)] text-2xl text-[#140638] font-bold">Write a Review</h3>
      <p className="text-xs text-slate-500">Share your experience with fellow mithai lovers.</p>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Your Rating:</label>
        <select
          value={rating}
          disabled={loading}
          onChange={(e) => {
            setRating(Number(e.target.value));
            if (error) setError("");
          }}
          className="w-full rounded-xl border border-amber-900/20 bg-amber-50/20 px-3 py-2 text-sm text-[#140638] font-medium disabled:opacity-50 focus:outline-none focus:border-[#dfb755]"
        >
          <option value={5}>★★★★★ 5 Stars - Exceptional Taste</option>
          <option value={4}>★★★★☆ 4 Stars - Very Good</option>
          <option value={3}>★★★☆☆ 3 Stars - Average</option>
          <option value={2}>★★☆☆☆ 2 Stars - Below Expectations</option>
          <option value={1}>★☆☆☆☆ 1 Star - Poor</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Your Feedback:</label>
        <textarea
          value={comment}
          disabled={loading}
          onChange={(e) => {
            setComment(e.target.value);
            if (error) setError("");
          }}
          rows={3}
          placeholder="How was the freshness, ghee aroma, packing and sweetness?"
          className="w-full rounded-xl border border-amber-900/20 bg-amber-50/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 disabled:opacity-50 focus:outline-none focus:border-[#dfb755] focus:ring-1 focus:ring-[#dfb755]"
        />
      </div>
      {error ? (
        <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      ) : null}
      {done ? (
        <div className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 font-medium">
          ✓ Thank you! Your review has been saved.
        </div>
      ) : null}
      <button
        disabled={loading}
        className="rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#140638] text-[#dfb755] hover:bg-[#250d54] active:scale-95 disabled:opacity-50 cursor-pointer transition shadow-xs"
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
