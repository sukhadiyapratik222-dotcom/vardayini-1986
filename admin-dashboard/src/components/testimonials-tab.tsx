"use client";

import { useState, useMemo } from "react";
import { UiConfig, TestimonialConfigItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface TestimonialsTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
  currentUser?: any;
}

export function TestimonialsTab({ config, onRefresh, currentUser }: TestimonialsTabProps) {
  const isSuperAdmin = currentUser?.role === "super_admin";
  const currentCfg = config?.testimonialsSection || {};

  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
  const [autoShowRealReviews, setAutoShowRealReviews] = useState<boolean>(
    currentCfg.autoShowRealReviews !== false
  );
  const [badge, setBadge] = useState(currentCfg.badge || "TESTIMONIALS");
  const [title, setTitle] = useState(currentCfg.title || "WHAT OUR CUSTOMERS SAY");
  const [subtitle, setSubtitle] = useState(
    currentCfg.subtitle || "Real verified reviews from our patrons across Gujarat and India"
  );
  const [showTrustBadge, setShowTrustBadge] = useState(currentCfg.showTrustBadge ?? true);
  const [trustBadgeText, setTrustBadgeText] = useState(
    currentCfg.trustBadgeText || "Over 1,850+ verified reviews across Vadodara, Gujarat & Pan-India"
  );

  // Initialize reviews: prioritize real database reviews if available
  const initialReviews: TestimonialConfigItem[] = useMemo(() => {
    if (autoShowRealReviews) {
      return currentCfg.realDbReviews || [];
    }
    if (currentCfg.reviews && currentCfg.reviews.length > 0) {
      return currentCfg.reviews;
    }
    return [];
  }, [autoShowRealReviews, currentCfg.realDbReviews, currentCfg.reviews]);

  const [reviews, setReviews] = useState<TestimonialConfigItem[]>(initialReviews);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form for adding new review
  const [newAuthor, setNewAuthor] = useState("");
  const [newCity, setNewCity] = useState("Vadodara");
  const [newQuote, setNewQuote] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newProductName, setNewProductName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Ensure newest reviews ALWAYS show first (sorted by createdAt or ID descending)
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      const numA = parseInt(String(a.id).replace(/\D/g, "") || "0", 10);
      const numB = parseInt(String(b.id).replace(/\D/g, "") || "0", 10);
      return numB - numA;
    });
  }, [reviews]);

  function handleReviewChange(id: string, field: keyof TestimonialConfigItem, value: any) {
    if (!isSuperAdmin) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function handleToggleReview(id: string) {
    if (!isSuperAdmin) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: r.active === false } : r))
    );
  }

  // Remove/Delete review from testimonials and database
  async function handleDeleteReview(id: string) {
    if (!isSuperAdmin) return;

    const numId = parseInt(id.replace(/\D/g, ""), 10);
    const isDbReview = !isNaN(numId) && numId > 0 && !id.startsWith("rev-client");

    setReviews((prev) => prev.filter((r) => r.id !== id));

    if (isDbReview) {
      try {
        await api.deleteReview(numId);
        toast.success(`Review #${numId} deleted from database and removed from testimonials.`);
      } catch {
        toast.info("Removed from testimonials list. Click Save Changes to confirm.");
      }
    } else {
      toast.info("Testimonial removed from list. Click Save Changes to update storefront.");
    }
  }

  // Sync latest real customer reviews from database
  async function handleSyncFromDatabase() {
    if (!isSuperAdmin) return;
    setSyncing(true);
    try {
      const dbReviews = await api.getReviews();
      if (Array.isArray(dbReviews) && dbReviews.length > 0) {
        const mapped: TestimonialConfigItem[] = dbReviews.map((r) => ({
          id: String(r.id),
          name: r.userName || "Customer",
          location: "Gujarat",
          rating: r.rating || 5,
          quote: r.comment,
          productName: r.productName || undefined,
          isVerified: r.isVerified ?? true,
          active: true,
          createdAt: r.createdAt || new Date().toISOString(),
        }));

        setReviews(mapped);
        toast.success(`Successfully synced ${mapped.length} real customer reviews from database!`);
      } else {
        toast.info("No reviews in database yet.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch database reviews.");
    } finally {
      setSyncing(false);
    }
  }

  // Add new customer review: PREPENDS so newest review shows first!
  function handleAddReview(e: React.FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!newAuthor.trim() || !newQuote.trim()) {
      toast.error("Author name and quote comment are required");
      return;
    }

    const nowIso = new Date().toISOString();
    const newId = `rev-${Date.now()}`;
    const newRev: TestimonialConfigItem = {
      id: newId,
      name: newAuthor.trim(),
      location: newCity.trim() || "Gujarat",
      rating: newRating,
      quote: newQuote.trim(),
      productName: newProductName.trim() || undefined,
      isVerified: true,
      active: true,
      createdAt: nowIso,
    };

    // Prepend so it shows first!
    setReviews((prev) => [newRev, ...prev]);
    setNewAuthor("");
    setNewCity("Vadodara");
    setNewQuote("");
    setNewProductName("");
    setShowAddForm(false);
    toast.success("New testimonial added at position #1! Remember to save changes.");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error("Access Denied: Only Super Admin can modify Customer Testimonials.");
      return;
    }

    setSaving(true);
    try {
      await api.updateUiConfig({
        testimonialsSection: {
          enabled,
          autoShowRealReviews,
          badge,
          title,
          subtitle,
          showTrustBadge,
          trustBadgeText,
          reviews: sortedReviews,
        },
      });
      toast.success("Customer Testimonials updated successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update testimonials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
              Social Proof &amp; Reviews
            </span>
            {isSuperAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-white text-[10px] font-extrabold uppercase shadow-2xs">
                👑 Super Admin Managed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                🔒 Read Only
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            Homepage Customer Testimonials
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6d82] mt-1 max-w-xl">
            Displays verified customer reviews on the homepage. Only Super Admin can manage, delete/remove, or curate reviews. Newest customer reviews automatically display first.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label
            className={`flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 ${
              isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-75"
            }`}
          >
            <input
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded text-amber-600 focus:ring-0 w-4 h-4 disabled:opacity-60"
            />
            <span>Section Enabled</span>
          </label>

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-gold rounded-xl px-5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          ) : (
            <div className="bg-slate-100 text-slate-500 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold select-none flex items-center gap-1.5">
              <span>🔒</span>
              <span>Super Admin Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Policy Lock Notice for Non-Super Admins */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-3xl p-6 text-amber-950 flex flex-col sm:flex-row items-start gap-4 shadow-xs">
          <div className="text-3xl select-none shrink-0">🔒</div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-amber-950">
                Super Admin Security &amp; Testimonial Policy
              </h3>
              <span className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs">
                Role Policy Lock
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              You are signed in as a standard administrator (<strong>{currentUser?.name || currentUser?.email || "Staff Admin"}</strong>).
              Per store policy (&quot;<em>only can manage by the super admin and in this details can remove only show real review</em>&quot;), editing or removing testimonials is reserved exclusively for the <strong>Super Admin</strong>.
            </p>
            <p className="text-[11px] text-amber-800 font-medium">
              ✓ All controls below are in read-only mode. You can inspect verified customer reviews and homepage layout below.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. REAL REVIEWS MODE & ALGORITHM SETTINGS
         ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>⭐</span>
                <span>Review Display Mode &amp; Real Data Sync</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure customers always see 100% authentic feedback with the newest reviews displayed first.
              </p>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleSyncFromDatabase}
                disabled={syncing}
                className="self-start sm:self-auto text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl border border-amber-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{syncing ? "⏳" : "⚡"}</span>
                <span>{syncing ? "Syncing..." : "Sync Real Reviews from Database"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label
              className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${
                autoShowRealReviews
                  ? "border-amber-600 bg-amber-50/50 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="reviews_mode"
                  disabled={!isSuperAdmin}
                  checked={autoShowRealReviews}
                  onChange={() => setAutoShowRealReviews(true)}
                  className="mt-1 text-amber-600 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      ⚡ Real Customer Reviews Mode
                    </span>
                    <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                      Active &amp; Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Homepage displays verified reviews submitted by real customers. Dummy/placeholder text is filtered out and the newest review always appears first.
                  </p>
                </div>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${
                !autoShowRealReviews
                  ? "border-amber-600 bg-amber-50/50 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="reviews_mode"
                  disabled={!isSuperAdmin}
                  checked={!autoShowRealReviews}
                  onChange={() => setAutoShowRealReviews(false)}
                  className="mt-1 text-amber-600 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900">
                    ✏️ Curated Testimonials Mode
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Super Admin can manually craft, reorder, or override specific quotes and customer names.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Section Header Controls */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Section Title &amp; Trust Badge
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Eyebrow Badge
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 disabled:bg-slate-50 disabled:text-slate-500 font-bold"
                placeholder="e.g. TESTIMONIALS"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Headline (Uppercase Display Serif)
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 disabled:bg-slate-50 disabled:text-slate-500 font-bold"
                placeholder="e.g. WHAT OUR CUSTOMERS SAY"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtitle Description
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <span className="block text-xs font-bold text-slate-800">
                  Trust Badge Footnote
                </span>
                <span className="block text-[11px] text-slate-500">
                  Show star rating &amp; verified reviews claim at bottom of section
                </span>
              </div>
              <input
                type="checkbox"
                disabled={!isSuperAdmin}
                checked={showTrustBadge}
                onChange={(e) => setShowTrustBadge(e.target.checked)}
                className="rounded text-amber-600 w-4 h-4 disabled:opacity-60"
              />
            </div>

            {showTrustBadge && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trust Badge Claim Text
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={trustBadgeText}
                  onChange={(e) => setTrustBadgeText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                  placeholder="e.g. Over 1,850+ verified reviews across Vadodara, Gujarat & Pan-India"
                />
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. REVIEWS LIST & REMOVE CONTROLS (NEWEST FIRST)
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Customer Reviews ({sortedReviews.length})
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ↓ Newest Reviews Shown First
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Reviews are chronologically sorted. Click &quot;Delete / Remove&quot; on any review to remove it.
              </p>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowAddForm((p) => !p)}
                className="self-start sm:self-auto text-xs font-bold text-[#0b2f8a] hover:text-[#071c54] bg-[#0b2f8a]/5 hover:bg-[#0b2f8a]/10 px-3 py-1.5 rounded-xl border border-[#0b2f8a]/15 transition"
              >
                {showAddForm ? "Cancel Add" : "+ Add Testimonial (Inserts at #1)"}
              </button>
            )}
          </div>

          {/* Add Review Drawer */}
          {showAddForm && isSuperAdmin && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 shadow-2xs">
              <span className="block text-xs font-bold text-amber-950">
                Add New Customer Review (Will Appear at Position #1)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g. Pratik Patel"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Vadodara"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Product Mentioned
                  </label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g. Kaju Katli"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rating (Stars)
                  </label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                    <option value={3}>⭐⭐⭐ (3 Stars)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Customer Quote / Comment *
                </label>
                <textarea
                  rows={2}
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  placeholder="Enter real customer quote here..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddReview}
                  className="rounded-xl bg-amber-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-amber-700 transition"
                >
                  Insert as Newest #1
                </button>
              </div>
            </div>
          )}

          {/* List of existing reviews with delete/remove options */}
          {sortedReviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No reviews in list yet. Click &quot;Sync Real Reviews from Database&quot; above to load verified customer reviews.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReviews.map((r, idx) => {
                const isNewest = idx === 0;
                return (
                  <div
                    key={r.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isNewest
                        ? "border-amber-300 bg-amber-50/30 shadow-xs"
                        : r.active !== false
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNewest ? (
                          <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>⭐</span>
                            <span>#1 Newest Review (Shows First)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            #{idx + 1}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900">
                          {r.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({r.location || "Gujarat"})
                        </span>
                        <span className="text-amber-500 text-xs">
                          {"★".repeat(r.rating || 5)}
                        </span>
                        {r.productName && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded font-medium">
                            {r.productName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <label
                          className={`flex items-center gap-1.5 text-xs text-slate-600 font-medium ${
                            isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!isSuperAdmin}
                            checked={r.active !== false}
                            onChange={() => handleToggleReview(r.id)}
                            className="rounded text-amber-600 w-3.5 h-3.5 disabled:opacity-60"
                          />
                          <span>Active</span>
                        </label>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(r.id)}
                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title="Remove or delete this review"
                          >
                            <span>🗑️</span>
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                          Customer Name
                        </label>
                        <input
                          type="text"
                          disabled={!isSuperAdmin}
                          value={r.name}
                          onChange={(e) => handleReviewChange(r.id, "name", e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                          City / Location
                        </label>
                        <input
                          type="text"
                          disabled={!isSuperAdmin}
                          value={r.location}
                          onChange={(e) => handleReviewChange(r.id, "location", e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                          Rating
                        </label>
                        <select
                          disabled={!isSuperAdmin}
                          value={r.rating}
                          onChange={(e) => handleReviewChange(r.id, "rating", Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                        >
                          <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                          <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                          <option value={3}>⭐⭐⭐ (3 Stars)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                        Quote / Review Comment
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isSuperAdmin}
                        value={r.quote}
                        onChange={(e) => handleReviewChange(r.id, "quote", e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 leading-relaxed font-serif"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. LIVE STOREFRONT PREVIEW (SHOWING NEWEST FIRST)
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-block bg-[#d8d2c8] text-[#3a3532] text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-0.5 rounded-[3px] mb-2">
              {badge}
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f242e] uppercase">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Storefront Preview: Exactly as seen by customers on the homepage (Newest First)
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {sortedReviews
              .filter((r) => r.active !== false)
              .slice(0, 3)
              .map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500 text-sm">
                      {"★".repeat(r.rating || 5)}
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        ⚡ Newest Customer Review
                      </span>
                    )}
                  </div>
                  <blockquote className="text-xs sm:text-sm text-neutral-700 italic font-serif leading-relaxed">
                    &ldquo;{r.quote}&rdquo;
                  </blockquote>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900">{r.name}</strong>
                      <span className="text-slate-500 ml-1">· {r.location}</span>
                    </div>
                    {r.productName && (
                      <span className="text-[10px] text-neutral-500 font-medium">
                        {r.productName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {showTrustBadge && (
            <p className="text-center text-xs text-slate-500 pt-2 font-medium">
              ★ 5.0 / 5 · {trustBadgeText}
            </p>
          )}
        </div>

        {/* Action Button Row */}
        <div className="flex justify-end pt-2">
          {isSuperAdmin ? (
            <button
              type="submit"
              disabled={saving}
              className="btn-gold rounded-xl px-8 py-3 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Testimonials Changes"}
            </button>
          ) : (
            <div className="bg-slate-100 text-slate-500 border border-slate-200 px-6 py-3 rounded-xl text-xs font-bold select-none flex items-center gap-2">
              <span>🔒</span>
              <span>Only Super Admin Can Save Changes</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
