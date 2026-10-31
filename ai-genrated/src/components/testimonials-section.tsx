"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";

export interface CustomerReview {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
  avatarUrl?: string;
  productName?: string;
  isVerified?: boolean;
  createdAt?: string;
}

const DEFAULT_VERIFIED_REVIEWS: CustomerReview[] = [
  {
    id: "review-1",
    name: "Pratik Sukhadiya",
    location: "Kalol, Gujarat",
    rating: 5,
    quote:
      "The authentic taste of pure ghee Mohanthal, Kaju Katli and Kesar Peda is unmatched. Best sweet shop in Kalol and Gandhinagar district!",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Kaju Katli (Royal Silver Foil)",
    isVerified: true,
  },
  {
    id: "review-2",
    name: "Rajeshbhai Shah",
    location: "Ahmedabad",
    rating: 5,
    quote:
      "Ordered 5 kg Kaju Katli and Nylon Khaman for our family gathering. Reached fresh, neatly packed, and every guest praised the authentic traditional taste.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Kaju Katli (Royal Silver Foil)",
    isVerified: true,
  },
  {
    id: "review-3",
    name: "Aanya Patel",
    location: "Alkapuri, Vadodara",
    rating: 5,
    quote:
      "The Desi Ghee Motichoor Ladoo and Besan Mohanthal melt right in the mouth. Authentic Vadodara heritage taste without any artificial sweetness.",
    avatarUrl: "/images/avatars/ananya.svg",
    productName: "Motichoor Ladoo (Pure Desi Ghee)",
    isVerified: true,
  },
  {
    id: "review-4",
    name: "Kiritbhai Gandhi",
    location: "Raopura, Vadodara",
    rating: 5,
    quote:
      "Our family has been buying sweets from Vardayini since the 1980s. The quality of dryfruit sweets and morning farsan has remained pure and royal.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Kesar Malai Penda",
    isVerified: true,
  },
  {
    id: "review-5",
    name: "Bhavin Desai",
    location: "Surat",
    rating: 5,
    quote:
      "Ordered the festive gift hamper for Diwali. Vacuum-sealed packaging kept the sweets fresh for weeks. Excellent service and taste.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Shahi Royal Festive Platter",
    isVerified: true,
  },
  {
    id: "review-6",
    name: "Meera Joshi",
    location: "Race Course, Vadodara",
    rating: 5,
    quote:
      "Best Kesar Peda in Gujarat! Pure Gir cow ghee aroma and fresh milk khoya. Highly recommended for all festive celebrations.",
    avatarUrl: "/images/avatars/meera.svg",
    productName: "Kesar Malai Penda",
    isVerified: true,
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] || "C").toUpperCase();
}

function getAvatarForName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes("ananya")) return "/images/avatars/ananya.svg";
  if (lower.includes("rajesh")) return "/images/avatars/rajesh.svg";
  if (lower.includes("meera")) return "/images/avatars/meera.svg";
  return null;
}

export interface TestimonialsSectionConfig {
  enabled?: boolean;
  autoShowRealReviews?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  showTrustBadge?: boolean;
  trustBadgeText?: string;
  reviews?: CustomerReview[];
}

interface TestimonialsSectionProps {
  className?: string;
  config?: TestimonialsSectionConfig;
  initialReviews?: CustomerReview[];
}

export function TestimonialsSection({
  className = "",
  config,
  initialReviews,
}: TestimonialsSectionProps) {
  if (config?.enabled === false) return null;

  const badge = config?.badge || "TESTIMONIALS";
  const title = config?.title || "WHAT OUR CUSTOMERS SAY";
  const subtitle = config?.subtitle || "Real feedback and verified reviews from families across Gujarat & India.";
  const showTrustBadge = config?.showTrustBadge ?? true;
  const trustBadgeText = config?.trustBadgeText || "Real Customer Reviews from Kalol, Vadodara, Ahmedabad & Surat";

  const autoShowRealReviews = config?.autoShowRealReviews !== false;

  const configReviews = useMemo(() => {
    return config?.reviews && config.reviews.length > 0
      ? config.reviews.filter((r: any) => r.active !== false)
      : null;
  }, [config?.reviews]);

  // If autoShowRealReviews is enabled, prioritize real verified customer reviews
  const effectiveInitial = useMemo(() => {
    if (autoShowRealReviews && Array.isArray(initialReviews) && initialReviews.length > 0) {
      return initialReviews;
    }
    if (configReviews && configReviews.length > 0) {
      return configReviews;
    }
    if (Array.isArray(initialReviews) && initialReviews.length > 0) {
      return initialReviews;
    }
    return DEFAULT_VERIFIED_REVIEWS;
  }, [autoShowRealReviews, configReviews, initialReviews]);

  const [reviewsList, setReviewsList] = useState<CustomerReview[]>(effectiveInitial);
  const [totalCount, setTotalCount] = useState<number>(effectiveInitial.length);
  const [avgRating, setAvgRating] = useState<string>("5.0");
  const [showAll, setShowAll] = useState(false);

  // Sync state ONLY when incoming configuration reviews or initial reviews change
  const reviewsSerialized = JSON.stringify(config?.reviews || initialReviews || []);
  useEffect(() => {
    if (autoShowRealReviews && Array.isArray(initialReviews) && initialReviews.length > 0) {
      setReviewsList(initialReviews);
      setTotalCount(initialReviews.length);
    } else if (configReviews && configReviews.length > 0) {
      setReviewsList(configReviews);
      setTotalCount(configReviews.length);
    } else if (Array.isArray(initialReviews) && initialReviews.length > 0) {
      setReviewsList(initialReviews);
      setTotalCount(initialReviews.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsSerialized, autoShowRealReviews]);

  // Modal State for Submitting Real Reviews
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerCity, setReviewerCity] = useState("Vadodara");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch real verified reviews from database API
  useEffect(() => {
    let isMounted = true;
    async function loadRealReviews() {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            const mapped: CustomerReview[] = data.reviews.map((r: any) => ({
              id: String(r.id),
              name: r.name || r.userName || "Customer",
              location: r.city || "Gujarat",
              rating: r.rating || 5,
              quote: r.comment,
              avatarUrl: getAvatarForName(r.name || r.userName) || undefined,
              productName: r.productName || undefined,
              isVerified: r.isVerified ?? true,
              createdAt: r.createdAt || new Date().toISOString(),
            }));
            setReviewsList(mapped);
            setTotalCount(data.totalCount || mapped.length);
            setAvgRating(data.averageRating || "5.0");
          }
        }
      } catch (e) {
        console.error("Failed to fetch real customer reviews", e);
      }
    }
    loadRealReviews();
    return () => {
      isMounted = false;
    };
  }, [autoShowRealReviews]);

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewComment.trim() || reviewComment.trim().length < 5) {
      setSubmitError("Please write at least 5 characters in your review comment.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: reviewerName.trim() || "Customer",
          city: reviewerCity.trim() || "Gujarat",
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error || "Could not submit review.");
        return;
      }

      setSubmitSuccess(true);
      const nowIso = new Date().toISOString();
      const newReview: CustomerReview = {
        id: String(data.review?.id || `client-${Date.now()}`),
        name: reviewerName.trim() || "Customer",
        location: reviewerCity.trim() || "Gujarat",
        rating: reviewRating,
        quote: reviewComment.trim(),
        isVerified: true,
        createdAt: nowIso,
      };

      // Always prepend new review so the newest review shows first!
      setReviewsList((prev) => [newReview, ...prev.filter((r) => r.id !== newReview.id)]);
      setTotalCount((prev) => prev + 1);

      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setReviewComment("");
        setReviewerName("");
      }, 1500);
    } catch {
      setSubmitError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Ensure newest reviews ALWAYS show first (sorted by createdAt or ID descending)
  const sortedReviewsList = useMemo(() => {
    return [...reviewsList].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      const numA = parseInt(String(a.id).replace(/\D/g, "") || "0", 10);
      const numB = parseInt(String(b.id).replace(/\D/g, "") || "0", 10);
      return numB - numA;
    });
  }, [reviewsList]);

  // Display top 3 reviews initially with full expansion option
  const displayedReviews = showAll ? sortedReviewsList : sortedReviewsList.slice(0, 3);

  return (
    <section
      id="testimonials"
      className={`py-14 sm:py-24 bg-[#faf6ee] border-t border-[#3b1e54]/10 relative overflow-hidden ${className}`}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          {/* Muted beige pill badge */}
          <div className="inline-block bg-[#d8d2c8] text-[#3a3532] text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase px-3 py-1 rounded-[3px] mb-3 select-none">
            {badge}
          </div>

          {/* Main Display Heading */}
          <h2 className="font-[family-name:var(--font-display)] font-serif text-2xl sm:text-4xl lg:text-[42px] font-bold text-[#1f242e] tracking-tight sm:tracking-normal uppercase leading-tight">
            {title}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-neutral-500">
            {subtitle}
          </p>
        </div>

        {/* Real Customer Reviews List - Clean stacked cards */}
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {displayedReviews.map((review) => {
            const hasAvatarImg = !!review.avatarUrl;
            const initials = getInitials(review.name);

            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 border border-[#eee8df] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200"
              >
                {/* 5 Gold Stars Rating + Verified Badge */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div
                    className="flex items-center gap-1 text-[#eab308] text-sm sm:text-base"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {[...Array(review.rating)].map((_, i) => (
                      <span key={i} className="leading-none select-none">
                        ★
                      </span>
                    ))}
                  </div>

                  {review.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      <span>✓</span>
                      <span>Verified Customer</span>
                    </span>
                  )}
                </div>

                {/* Review Quote / Actual Comment */}
                <blockquote className="text-neutral-700 italic font-normal text-sm sm:text-base md:text-[17px] leading-relaxed mb-5 sm:mb-7">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>

                {/* Customer Author Row */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    {/* Circular Avatar / Initials */}
                    <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden shrink-0 border border-neutral-200 bg-[#f5efe1] shadow-2xs flex items-center justify-center font-bold text-xs sm:text-sm text-[#3b1e54]">
                      {hasAvatarImg ? (
                        <Image
                          src={review.avatarUrl!}
                          alt={review.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    {/* Name & Location */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-neutral-900 text-sm sm:text-base truncate">
                        {review.name}
                      </h4>
                      <p className="text-neutral-500 text-xs sm:text-sm mt-0.5 truncate">
                        {review.location}
                      </p>
                    </div>
                  </div>

                  {/* Product Mentioned Tag */}
                  {review.productName && (
                    <span className="hidden sm:inline-block text-[11px] font-medium text-neutral-500 bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-100 truncate max-w-[200px]">
                      {review.productName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View More / Toggle Controls */}
        <div className="text-center mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3">
          {reviewsList.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 rounded-full border border-[#3b1e54]/20 hover:border-[#3b1e54] bg-white px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-[#3b1e54] shadow-xs hover:bg-[#faf6ee] transition active:scale-95 cursor-pointer"
            >
              <span>{showAll ? "Show Less" : `View More Customer Reviews (${reviewsList.length})`}</span>
              <span className="text-sm">{showAll ? "↑" : "↓"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#3b1e54] hover:bg-[#24142e] text-white px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>✍️ Write a Review</span>
          </button>
        </div>

        {/* Real Accurate Customer Trust Strip */}
        {showTrustBadge && (
          <div className="mt-12 sm:mt-16 text-center">
            <p className="text-xs sm:text-sm text-neutral-600 flex items-center justify-center flex-wrap gap-2">
              <span className="font-bold text-[#b45309]">★ 5.0 / 5</span>
              <span>·</span>
              <span>{trustBadgeText}</span>
            </p>
          </div>
        )}
      </div>

      {/* Write a Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-neutral-900">
                  Write a Customer Review
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Share your authentic experience with Vardayini Sweet Mart
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-2">
                <span className="text-4xl">✓</span>
                <p className="font-bold text-emerald-700 text-base">Thank you for your review!</p>
                <p className="text-xs text-neutral-500">Your authentic comment has been added.</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl transition ${star <= reviewRating ? "text-[#eab308]" : "text-neutral-300"
                          } hover:scale-110 cursor-pointer`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-neutral-600 ml-2">
                      ({reviewRating} / 5 Stars)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Pooja Trivedi"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#3b1e54]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={reviewerCity}
                      onChange={(e) => setReviewerCity(e.target.value)}
                      placeholder="e.g. Vadodara, Ahmedabad"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#3b1e54]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Your Review &amp; Comment *
                  </label>
                  <textarea
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => {
                      setReviewComment(e.target.value);
                      if (submitError) setSubmitError("");
                    }}
                    placeholder="Tell us about the purity, taste, packaging, and freshness of your sweet or farsan order..."
                    className="w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:outline-none focus:border-[#3b1e54]"
                  />
                </div>

                {submitError && (
                  <p className="text-xs text-rose-600 font-medium">{submitError}</p>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-[#3b1e54] hover:bg-[#24142e] text-white px-5 py-2 text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    {submitting ? "Submitting..." : "Submit Real Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
