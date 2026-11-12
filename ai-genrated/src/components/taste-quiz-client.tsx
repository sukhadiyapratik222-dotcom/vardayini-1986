"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  QuizQuestionItem,
  QuizMatchResult,
  QuizMatchedProduct,
  DEFAULT_QUESTIONS,
} from "@/lib/taste-quiz-types";

export function TasteQuizClient() {
  const router = useRouter();

  // Quiz state
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestionItem[]>(DEFAULT_QUESTIONS);
  const [settings, setSettings] = useState<any>({
    leadCaptureEnabled: true,
    comboDiscountPercent: 10,
    allergyDisclaimer: "",
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);

  // Lead capture form
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  // Results
  const [result, setResult] = useState<QuizMatchResult | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<number[]>([]);
  const [copyToast, setCopyToast] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load questions and existing saved match on mount
  useEffect(() => {
    async function loadQuizData() {
      try {
        setLoading(true);
        const [qRes, sRes] = await Promise.all([
          fetch("/api/quiz/questions"),
          fetch("/api/quiz/settings"),
        ]);

        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.questions && qData.questions.length > 0) {
            setQuestions(qData.questions);
          }
        }

        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.settings) {
            setSettings(sData.settings);
          }
        }
      } catch (err) {
        console.warn("[TasteQuiz] Data load fallback:", err);
      } finally {
        setLoading(false);
      }
    }

    loadQuizData();

    // Check if customer already has a saved match in localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vsm_last_mithai_match");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.personality && parsed.matches) {
            // Optional: User can view previous match or retake
          }
        }
      } catch {}
    }
  }, []);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / (totalQuestions + (settings.leadCaptureEnabled ? 1 : 0))) * 100);

  // Select option and advance
  const handleSelectOption = (questionKey: string, optionKey: string) => {
    const updated = { ...answers, [questionKey]: optionKey };
    setAnswers(updated);

    // Smooth auto-advance
    setTimeout(() => {
      if (currentStepIndex < totalQuestions - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // Last question reached
        if (settings.leadCaptureEnabled) {
          setShowLeadCapture(true);
        } else {
          submitQuiz(updated);
        }
      }
    }, 220);
  };

  const handleSkipQuestion = () => {
    if (currentStepIndex < totalQuestions - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      if (settings.leadCaptureEnabled) {
        setShowLeadCapture(true);
      } else {
        submitQuiz(answers);
      }
    }
  };

  const handleBack = () => {
    if (showLeadCapture) {
      setShowLeadCapture(false);
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Submit answers to match engine
  const submitQuiz = async (finalAnswers: Record<string, string>) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/quiz/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to match sweets");
      }

      setResult(data.result);
      setShowLeadCapture(false);

      // Save to localStorage for returning visitors & homepage banner
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("vsm_last_mithai_match", JSON.stringify(data.result));
          window.dispatchEvent(
            new CustomEvent("vsm:quiz_completed", { detail: data.result })
          );
        } catch {}
      }
    } catch (err: any) {
      alert(err.message || "Something went wrong matching your mithai. Please try again.");
    } finally {
      setIsSubmitting(false);
      setLeadSubmitting(false);
    }
  };

  // Submit lead and fetch results
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSubmitting(true);

    try {
      // 1. Submit lead
      await fetch("/api/quiz/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          marketingConsent,
          answers,
        }),
      }).catch(() => null);

      // 2. Fetch matches
      await submitQuiz(answers);
    } catch {
      // Fallback to showing results directly
      await submitQuiz(answers);
    }
  };

  // Individual add to cart
  const handleAddToCart = async (product: QuizMatchedProduct) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: product.variantId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddedItemIds((prev) => [...prev, product.id]);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: data.count } }));
        }
        setActionNotice(`Added ${product.name} to your box!`);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch {}
  };

  // Add all matched items as a bundle
  const handleAddAllToCart = async () => {
    if (!result || addingAll) return;
    setAddingAll(true);
    setActionNotice(null);

    try {
      let latestCount = 0;
      for (const item of result.matches) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productVariantId: item.variantId, quantity: 1 }),
        });
        const data = await res.json();
        if (data.count) latestCount = data.count;
      }

      setAddedItemIds(result.matches.map((m) => m.id));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: latestCount } }));
      }
      setActionNotice("All matched sweets added to your box! ✨");
      setTimeout(() => setActionNotice(null), 4000);
      router.refresh();
    } catch {
      setActionNotice("Could not add all items. Please try individually.");
    } finally {
      setAddingAll(false);
    }
  };

  // Retake quiz
  const handleRetake = () => {
    setResult(null);
    setAnswers({});
    setCurrentStepIndex(0);
    setShowLeadCapture(false);
    setAddedItemIds([]);
  };

  // Copy share link
  const handleCopyShare = () => {
    if (!result) return;
    const url = typeof window !== "undefined" ? window.location.href : "http://localhost:9449/find-your-mithai";
    const text = `${result.shareText}\n${url}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    if (!result) return;
    const url = typeof window !== "undefined" ? window.location.href : "http://localhost:9449/find-your-mithai";
    const text = `${result.shareText} 👉 ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // -------------------------------------------------------------
  // RENDER: LOADING STATE
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-20 px-4">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="h-16 w-16 rounded-full border-4 border-[#d4af37]/30 border-t-[#6b1d1d] animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🍯</span>
          </div>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
            Preparing the Taste Quiz...
          </p>
          <p className="text-xs text-amber-900/60 font-medium tracking-wide">
            1976 Heritage Karigar Formulas
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: RESULTS VIEW
  // -------------------------------------------------------------
  if (result) {
    return (
      <div className="min-h-screen py-8 md:py-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Floating Notification */}
        {actionNotice && (
          <div className="fixed top-6 right-6 z-50 rounded-2xl bg-[#6b1d1d] text-white px-5 py-3 shadow-2xl border border-amber-300/30 text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
            <span>✨</span>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Personality Hero Card (Glassmorphism) */}
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 text-white bg-gradient-to-br from-[#2e003e]/90 via-[#451025]/85 to-[#6b1d1d]/90 backdrop-blur-xl border border-white/20 shadow-2xl">
          {/* Decorative Sparkles & Rings */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-radial from-amber-400/25 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-radial from-purple-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 shadow-md">
              <span>✨ Your Mithai Personality</span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-black text-amber-100 leading-tight">
              {result.personality.name}
            </h1>

            <p className="text-base sm:text-lg font-semibold text-amber-200/90 italic">
              "{result.personality.tagline}"
            </p>

            <p className="text-xs sm:text-sm text-stone-200/90 leading-relaxed font-sans">
              {result.personality.description}
            </p>

            {/* Share & Retake Bar */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#20ba59] transition shadow-md hover:scale-105 transform active:scale-95"
              >
                <span>💬</span>
                <span>Share on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 transition shadow-xs"
              >
                <span>📋</span>
                <span>{copyToast ? "Link Copied!" : "Copy Link"}</span>
              </button>

              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 transition"
              >
                <span>🔄</span>
                <span>Retake Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Relaxed Filter Notification (if applicable) */}
        {result.relaxedFilter && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/70 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <span className="text-base">💡</span>
            <div className="space-y-0.5">
              <p className="font-bold">Close Matches Included</p>
              <p className="text-amber-800/80 leading-relaxed">
                {result.relaxedFilterReason || "We also included close matches from our heritage counter so you don't miss out on fresh favourites!"}
              </p>
            </div>
          </div>
        )}

        {/* Matched Products Section */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-amber-200/60 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Personalized Selection ({result.matches.length} items)
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[#6b1d1d]">
                Handcrafted Sweets Curated for You
              </h2>
            </div>

            {/* Add All To Cart Button */}
            <button
              type="button"
              disabled={addingAll}
              onClick={handleAddAllToCart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 shadow-md hover:shadow-lg transition transform active:scale-95 disabled:opacity-50"
            >
              <span>{addingAll ? "⏳" : "🛍️"}</span>
              <span>{addingAll ? "Adding All..." : "Add All to Cart"}</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {result.matches.map((item) => {
              const isAdded = addedItemIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-300"
                >
                  {/* Match Percentage Badge */}
                  <div className="absolute top-3 right-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                    {item.matchPercentage}% Match
                  </div>

                  {/* Dietary / Freshness Tag */}
                  {item.dietaryTags?.[0] && (
                    <div className="absolute top-3 left-3 z-10 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                      {item.dietaryTags[0].replace(/_/g, " ")}
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Image */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-amber-50/50">
                      <Image
                        src={item.imageUrl || "/images/kaju-katli.jpg"}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 250px"
                        className="object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>

                    {/* Category & Title */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                        {item.categoryName}
                      </p>
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-stone-900 line-clamp-1">
                        {item.name}
                      </h3>
                    </div>

                    {/* Why This Suits You */}
                    <div className="rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/50 text-[11px] text-stone-700 leading-snug">
                      <span className="font-bold text-[#6b1d1d] block mb-0.5">Why this suits you:</span>
                      <p className="text-stone-600 italic">"{item.whySuitsYou}"</p>
                    </div>
                  </div>

                  {/* Price & Add to Box */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-base font-extrabold text-[#6b1d1d]">
                          ₹{item.discountedPrice || item.price}
                        </span>
                        {item.discountedPrice && (
                          <span className="font-mono text-xs text-slate-400 line-through">
                            ₹{item.price}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {item.defaultWeight}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddToCart(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                        isAdded
                          ? "bg-emerald-600 text-white"
                          : "bg-[#6b1d1d] hover:bg-[#852525] text-white"
                      }`}
                    >
                      {isAdded ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Perfect Combo Box Bundle Offer */}
        {result.comboBundle && (
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 border border-amber-300/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-stone-900">
                <span>🎁 Special Taste Bundle</span>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-black text-[#6b1d1d]">
                {result.comboBundle.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {result.comboBundle.description}
              </p>
            </div>

            <div className="text-center md:text-right shrink-0 space-y-2">
              <div className="flex items-baseline justify-center md:justify-end gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#6b1d1d] font-mono">
                  ₹{result.comboBundle.bundlePrice}
                </span>
                <span className="text-sm font-semibold text-slate-400 line-through font-mono">
                  ₹{result.comboBundle.originalTotal}
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-800">
                Save ₹{result.comboBundle.savings} ({result.comboBundle.discountPercent}% OFF)
              </p>
              <button
                type="button"
                disabled={addingAll}
                onClick={handleAddAllToCart}
                className="w-full md:w-auto px-6 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider bg-[#6b1d1d] hover:bg-[#852525] text-white shadow-md transition active:scale-95"
              >
                {addingAll ? "Adding All..." : "Get This Combo Box ✨"}
              </button>
            </div>
          </div>
        )}

        {/* Allergy Disclaimer Box */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-sm p-4 border border-stone-200/80 text-[11px] text-stone-600 space-y-1">
          <p className="font-bold text-stone-800 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Food Safety & Allergy Notice</span>
          </p>
          <p className="leading-relaxed">
            {result.allergyDisclaimer}
          </p>
        </div>

        {/* Bottom CTA to Shop */}
        <div className="text-center pt-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6b1d1d] hover:text-[#852525] hover:underline"
          >
            <span>Browse Full Mithai & Farsan Menu</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: OPTIONAL LEAD CAPTURE STEP
  // -------------------------------------------------------------
  if (showLeadCapture) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-lg rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 p-6 sm:p-10 shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-2">
            <span className="text-4xl block">🎁</span>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#6b1d1d]">
              {settings.leadCaptureHeading || "Where should we send your mithai match?"}
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
              {settings.leadCaptureSubheading || "Save your taste profile & unlock a special festive welcome code."}
            </p>
          </div>

          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Your Name</label>
              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. Ramesh Bhai"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-[#6b1d1d] focus:ring-2 focus:ring-[#6b1d1d]/10 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">WhatsApp Number or Email</label>
              <input
                type="text"
                required
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="e.g. +91 98250 19760 or name@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-[#6b1d1d] focus:ring-2 focus:ring-[#6b1d1d]/10 outline-none transition"
              />
            </div>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-[#6b1d1d] focus:ring-[#6b1d1d]"
              />
              <span className="text-[11px] text-stone-600 leading-tight">
                Send me festive offers, secret sweet drops, and my personalized recommendation on WhatsApp / Email.
              </span>
            </label>

            <button
              type="submit"
              disabled={leadSubmitting || isSubmitting}
              className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#6b1d1d] to-[#451025] hover:from-[#852525] hover:to-[#6b1d1d] text-white shadow-lg transition transform active:scale-95 disabled:opacity-50"
            >
              {leadSubmitting || isSubmitting ? "Finding Your Matches..." : "See My Mithai Matches ✨"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => submitQuiz(answers)}
                className="text-xs text-stone-500 hover:text-stone-800 underline font-semibold"
              >
                Skip and show results directly →
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: QUIZ FLOW (ONE QUESTION PER SCREEN)
  // -------------------------------------------------------------
  return (
    <div className="min-h-[85vh] py-8 md:py-16 px-4 sm:px-6 max-w-2xl mx-auto flex flex-col justify-center">
      <div className="w-full rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
        {/* Progress Bar & Header Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900/70">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={handleBack}
              className="inline-flex items-center gap-1 hover:text-[#6b1d1d] disabled:opacity-20 transition"
            >
              <span>←</span>
              <span>Back</span>
            </button>

            <span className="uppercase tracking-widest text-[11px]">
              Question {currentStepIndex + 1} of {totalQuestions}
            </span>

            <button
              type="button"
              onClick={handleSkipQuestion}
              className="hover:text-[#6b1d1d] transition underline"
            >
              Skip
            </button>
          </div>

          {/* Animated Progress Bar */}
          <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-[#6b1d1d] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-4xl block animate-bounce">{currentQuestion.icon || "🍯"}</span>
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[#6b1d1d]">
                {currentQuestion.title}
              </h2>
              {currentQuestion.subtitle && (
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                  {currentQuestion.subtitle}
                </p>
              )}
            </div>

            {/* Answer Options: Big Tap Buttons with Icons */}
            <div className="grid grid-cols-1 gap-3.5 pt-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.key] === opt.key;

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.key, opt.key)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-center justify-between gap-4 border ${
                      isSelected
                        ? "bg-gradient-to-r from-[#6b1d1d] to-[#451025] text-white border-[#6b1d1d] shadow-lg scale-[1.01]"
                        : "bg-white/80 hover:bg-white text-stone-800 border-amber-200/60 hover:border-amber-400 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl shrink-0 p-2 rounded-xl bg-amber-100/50">
                        {opt.icon || "✨"}
                      </span>
                      <div>
                        <div
                          className={`text-sm font-bold ${
                            isSelected ? "text-amber-200" : "text-stone-900"
                          }`}
                        >
                          {opt.label}
                        </div>
                        {opt.description && (
                          <div
                            className={`text-xs mt-0.5 ${
                              isSelected ? "text-stone-200/80" : "text-stone-500"
                            }`}
                          >
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? "border-amber-300 bg-amber-400 text-stone-900 font-bold text-xs"
                          : "border-stone-300"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info notice */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-stone-400 font-medium">
            ✨ Handcrafted recipes refined over 75+ years in Vadodara
          </p>
        </div>
      </div>
    </div>
  );
}

