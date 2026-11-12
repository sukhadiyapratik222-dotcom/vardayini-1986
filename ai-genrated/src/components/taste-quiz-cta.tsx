"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function TasteQuizCta() {
  const [savedMatch, setSavedMatch] = useState<any>(null);

  useEffect(() => {
    function checkSaved() {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("vsm_last_mithai_match");
          if (stored) {
            setSavedMatch(JSON.parse(stored));
          }
        } catch {}
      }
    }

    checkSaved();

    const handleQuizCompleted = (e: any) => {
      if (e.detail) setSavedMatch(e.detail);
    };

    window.addEventListener("vsm:quiz_completed", handleQuizCompleted);
    return () => {
      window.removeEventListener("vsm:quiz_completed", handleQuizCompleted);
    };
  }, []);

  // If visitor has already taken the quiz: show their personalized banner
  if (savedMatch && savedMatch.personality) {
    return (
      <section className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#2e003e]/90 via-[#451025]/85 to-[#6b1d1d]/90 backdrop-blur-xl border border-white/20 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest bg-amber-400 text-stone-900">
              <span>✨ Your Last Mithai Match</span>
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-amber-100">
              {savedMatch.personality.name}
            </h3>
            <p className="text-xs sm:text-sm text-amber-200/90 italic">
              "{savedMatch.personality.tagline}"
            </p>
            <p className="text-xs text-stone-300 leading-relaxed hidden sm:block">
              {savedMatch.matches?.length || 0} personalized sweets curated for your taste preference.
            </p>
          </div>

          {/* Quick Preview Chips */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="flex -space-x-3 overflow-hidden p-1">
              {savedMatch.matches?.slice(0, 3).map((m: any, idx: number) => (
                <div
                  key={m.id || idx}
                  className="relative h-12 w-12 rounded-full border-2 border-amber-300 overflow-hidden bg-amber-50 shadow-md shrink-0"
                  title={m.name}
                >
                  <Image
                    src={m.imageUrl || "/images/kaju-katli.jpg"}
                    alt={m.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/find-your-mithai"
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 shadow-md transition transform active:scale-95"
              >
                View Matches
              </Link>
              <Link
                href="/find-your-mithai"
                className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/20 transition"
              >
                Retake
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default CTA: Invite to take quiz
  return (
    <section className="py-8 md:py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 md:p-12 bg-gradient-to-br from-[#2e003e]/90 via-[#451025]/85 to-[#6b1d1d]/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white">
        {/* Decorative Lighting */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-radial from-amber-400/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-radial from-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-stone-950 shadow-md">
              <span>✨ Taste Match Finder</span>
            </div>

            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-100 leading-tight">
              Not sure what to pick? Find your perfect mithai in 30 seconds.
            </h2>

            <p className="text-xs sm:text-sm text-stone-200/90 leading-relaxed font-sans">
              Answer 5 quick taste questions — sweetness preference, nut allergy filters, occasion, and budget — and let our 75-year Vadodara halwai recipes calculate your personalized mithai matches.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-amber-200/90 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span> 100% Nut-Free & Diet Filters
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span> Instant Match Score
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span> 10% Combo Savings
              </span>
            </div>
          </div>

          {/* CTA Button & Sweet Preview Art */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            <Link
              href="/find-your-mithai"
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 shadow-xl hover:shadow-2xl hover:scale-105 transition transform active:scale-95"
            >
              <span>Take the Taste Quiz</span>
              <span>✨</span>
            </Link>

            <span className="text-[11px] text-amber-200/70 tracking-wide">
              Takes just 30 seconds · No login required
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

