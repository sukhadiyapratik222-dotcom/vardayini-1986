"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ReviewItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface ReviewsTabProps {
  onRefresh?: () => void;
}

export function ReviewsTab({ onRefresh }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getReviews();
      setReviews(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load customer reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleDelete = async () => {
    if (!reviewToDelete) return;
    setDeletingId(reviewToDelete.id);
    try {
      await api.deleteReview(reviewToDelete.id);
      toast.success("Review successfully removed");
      setReviewToDelete(null);
      await loadReviews();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await api.deleteAllReviews();
      toast.success("All reviews permanently deleted from store & database");
      setShowDeleteAllConfirm(false);
      await loadReviews();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete all reviews");
    } finally {
      setDeletingAll(false);
    }
  };

  // Derived analytics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0";
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const fourStarCount = reviews.filter((r) => r.rating === 4).length;
  const verifiedCount = reviews.filter((r) => r.isVerified).length;

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        r.comment.toLowerCase().includes(q);

      const matchRating = ratingFilter === "all" || r.rating === ratingFilter;
      return matchSearch && matchRating;
    });
  }, [reviews, search, ratingFilter]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#182230] flex items-center gap-2">
            <span className="text-pink-500">⭐</span> Reviews & Ratings Desk
          </h2>
          <p className="text-xs text-[#5e6d82] mt-0.5">
            Monitor verified customer reviews, patron satisfaction ratings, and feedback across all products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalReviews > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={deletingAll || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-sm transition disabled:opacity-50"
            >
              <span>🗑️</span>
              <span>{deletingAll ? "Deleting..." : "Delete All Reviews"}</span>
            </button>
          )}

          <button
            onClick={loadReviews}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#0b2f8a]/5 text-[#182230] border border-[#0b2f8a]/15 shadow-sm transition"
          >
            <span>🔄</span>
            <span>{loading ? "Refreshing..." : "Refresh Reviews"}</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Reviews</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-800 font-[family-name:var(--font-display)]">
              {totalReviews}
            </span>
            <div className="h-10 w-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-lg">
              💬
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Rating</span>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-800 font-[family-name:var(--font-display)]">
                {avgRating}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 5.0</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center font-bold text-lg">
              ⭐
            </div>
          </div>
        </div>

        {/* 5-Star Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">5-Star & 4-Star</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-800 font-[family-name:var(--font-display)]">
              {fiveStarCount + fourStarCount}
            </span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              🌟
            </div>
          </div>
        </div>

        {/* Verified Patrons */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Verified Patrons</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-800 font-[family-name:var(--font-display)]">
              {verifiedCount || totalReviews}
            </span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              🛡️
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, product, or comment..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0b2f8a] bg-slate-50/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Star Rating Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setRatingFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              ratingFilter === "all"
                ? "bg-[#0b2f8a] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Ratings ({totalReviews})
          </button>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            return (
              <button
                key={star}
                onClick={() => setRatingFilter(star)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  ratingFilter === star
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{star}</span>
                <span>⭐</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a] mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-semibold">Loading Customer Reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="text-4xl">🌟</div>
          <h3 className="text-base font-bold text-slate-800">No Reviews Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || ratingFilter !== "all"
              ? "No reviews match your active filter. Try resetting search or selecting all ratings."
              : "No customer reviews have been submitted yet. When customers submit reviews on the storefront, they will appear here."}
          </p>
          {(search || ratingFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setRatingFilter("all");
              }}
              className="text-xs font-semibold text-[#0b2f8a] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Product Info & Review Details */}
              <div className="flex items-start gap-4 flex-1">
                {/* Product Thumbnail */}
                <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                  {rev.productImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rev.productImageUrl}
                      alt={rev.productName || "Product"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl">🍬</div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#0b2f8a] hover:underline cursor-pointer">
                      {rev.productName || "Sweet Mart Product"}
                    </span>
                    {rev.isVerified && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        ✓ Verified Patron
                      </span>
                    )}
                  </div>

                  {/* Rating Stars & Customer */}
                  <div className="flex items-center gap-2">
                    {renderStars(rev.rating)}
                    <span className="text-xs font-bold text-slate-700">{rev.rating}.0</span>
                    <span className="text-slate-300 text-xs">•</span>
                    <span className="text-xs font-semibold text-slate-600">{rev.userName}</span>
                    {rev.userEmail && (
                      <span className="text-xs text-slate-400 hidden sm:inline">({rev.userEmail})</span>
                    )}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 italic">
                    "{rev.comment}"
                  </p>

                  <div className="text-[11px] text-slate-400">
                    Submitted on {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => setReviewToDelete(rev)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Delete Review?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete this customer review for{" "}
                <strong>{reviewToDelete.productName}</strong>?
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 italic text-center">
              "{reviewToDelete.comment}"
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
              >
                {deletingId ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Reviews Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Delete ALL Customer Reviews?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently remove <strong>all {totalReviews} reviews</strong> from the database and storefront?
                The storefront will cleanly display an empty reviews state without fake or auto-seeded reviews.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={deletingAll}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
              >
                {deletingAll ? "Deleting All..." : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
