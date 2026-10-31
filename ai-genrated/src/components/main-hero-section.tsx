"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassyHeroShowcase } from "./glassy-hero-showcase";

export interface HeroContentConfig {
  badgeEst: string;
  badgeText: string;
  titlePrefix: string;
  titleHighlight1: string;
  titleMiddle: string;
  titleHighlight2: string;
  description: string;
  button1Text: string;
  button1Link: string;
  button2Text: string;
  button2Link: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
}

export const DEFAULT_HERO_CONTENT: HeroContentConfig = {
  badgeEst: "EST. 1976",
  badgeText: "AUTHENTIC GUJARATI MITHAI & FARSAN",
  titlePrefix: "Handcrafted",
  titleHighlight1: "Mithai",
  titleMiddle: "& Fresh Daily",
  titleHighlight2: "Farsan",
  description:
    "Pure ghee sweets & savoury farsan delivered fresh across Gujarat. From silver-foiled Kaju Katli to morning-steamed Nylon Khaman Dhokla, crafted the authentic way since 1976.",
  button1Text: "Order Fresh Mithai →",
  button1Link: "/shop",
  button2Text: "Festive Hampers",
  button2Link: "/shop?category=gift-hampers",
  stat1Value: "48+ Yrs",
  stat1Label: "Serving Gujarat",
  stat2Value: "100%",
  stat2Label: "Shuddh Desi Ghee",
  stat3Value: "4.9 ★",
  stat3Label: "Over 12k Reviews",
};

export function MainHeroSection() {
  const [content, setContent] = useState<HeroContentConfig>(DEFAULT_HERO_CONTENT);

  useEffect(() => {
    fetch("/api/ui-config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.heroContent) {
          setContent((prev) => ({
            ...prev,
            ...data.heroContent,
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden pt-3 sm:pt-4 md:pt-6 pb-6 sm:pb-8 md:pb-12">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="grid items-center gap-6 lg:gap-8 xl:gap-12 lg:grid-cols-12">
          {/* Left Content */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5">
            <div className="inline-flex max-w-full items-center gap-1.5 sm:gap-2 rounded-full border border-[#0b2f8a]/15 bg-[#eef3ff] px-2.5 sm:px-3.5 py-1 text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#0b2f8a]">
              <span>✨ {content.badgeEst}</span>
              <span className="text-[#0b2f8a]/30">•</span>
              <span className="break-words line-clamp-1 sm:line-clamp-none">{content.badgeText}</span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.14] sm:leading-[1.08] tracking-tight text-[#182230] break-words">
              {content.titlePrefix}{" "}
              <span className="text-[#0b2f8a]">{content.titleHighlight1}</span>{" "}
              {content.titleMiddle}{" "}
              <span className="text-[#b89130]">{content.titleHighlight2}</span>
            </h1>

            <p className="max-w-lg text-xs sm:text-sm lg:text-[15px] leading-relaxed text-[#5e6d82]">
              {content.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 pt-1 w-full">
              <Link
                href={content.button1Link || "/shop"}
                className="btn-gold rounded-full px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold shadow-sm transition hover:scale-102 text-center w-full sm:w-auto"
              >
                {content.button1Text || "Order Fresh Mithai →"}
              </Link>
              {content.button2Text && (
                <Link
                  href={content.button2Link || "/shop?category=gift-hampers"}
                  className="rounded-full border-2 border-[#0b2f8a] bg-white px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#0b2f8a] transition hover:bg-[#0b2f8a] hover:text-white text-center w-full sm:w-auto"
                >
                  {content.button2Text}
                </Link>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 border-t border-[#0b2f8a]/10 pt-3 sm:pt-4">
              <div className="min-w-0 text-center sm:text-left bg-[#0b2f8a]/[0.02] sm:bg-transparent p-1 sm:p-0 rounded-lg">
                <p className="font-[family-name:var(--font-display)] text-base sm:text-xl font-bold text-[#0b2f8a] truncate">
                  {content.stat1Value}
                </p>
                <p className="text-[9px] sm:text-[11px] text-[#5e6d82] leading-tight mt-0.5 line-clamp-2">{content.stat1Label}</p>
              </div>
              <div className="min-w-0 text-center sm:text-left bg-[#0b2f8a]/[0.02] sm:bg-transparent p-1 sm:p-0 rounded-lg">
                <p className="font-[family-name:var(--font-display)] text-base sm:text-xl font-bold text-[#0b2f8a] truncate">
                  {content.stat2Value}
                </p>
                <p className="text-[9px] sm:text-[11px] text-[#5e6d82] leading-tight mt-0.5 line-clamp-2">{content.stat2Label}</p>
              </div>
              <div className="min-w-0 text-center sm:text-left bg-[#0b2f8a]/[0.02] sm:bg-transparent p-1 sm:p-0 rounded-lg">
                <p className="font-[family-name:var(--font-display)] text-base sm:text-xl font-bold text-[#0b2f8a] truncate">
                  {content.stat3Value}
                </p>
                <p className="text-[9px] sm:text-[11px] text-[#5e6d82] leading-tight mt-0.5 line-clamp-2">{content.stat3Label}</p>
              </div>
            </div>
          </div>

          {/* Right Hero Showcase — Interactive Glassmorphic Product Gallery */}
          <div className="lg:col-span-6 relative flex items-center justify-center w-full max-w-full">
            <GlassyHeroShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
