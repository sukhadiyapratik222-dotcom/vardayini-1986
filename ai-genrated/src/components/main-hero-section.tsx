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
    <section className="relative overflow-hidden pt-4 pb-12 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0b2f8a]/15 bg-[#eef3ff] px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#0b2f8a]">
              <span>✨ {content.badgeEst}</span>
              <span className="text-[#0b2f8a]/30">•</span>
              <span>{content.badgeText}</span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight text-[#182230] sm:text-6xl lg:text-7xl">
              {content.titlePrefix}{" "}
              <span className="text-[#0b2f8a]">{content.titleHighlight1}</span>{" "}
              {content.titleMiddle}{" "}
              <span className="text-[#b89130]">{content.titleHighlight2}</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#5e6d82] sm:text-lg">
              {content.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={content.button1Link || "/shop"}
                className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold shadow-sm transition hover:scale-105"
              >
                {content.button1Text || "Order Fresh Mithai →"}
              </Link>
              {content.button2Text && (
                <Link
                  href={content.button2Link || "/shop?category=gift-hampers"}
                  className="rounded-full border-2 border-[#0b2f8a] bg-white px-7 py-3 text-sm font-semibold text-[#0b2f8a] transition hover:bg-[#0b2f8a] hover:text-white"
                >
                  {content.button2Text}
                </Link>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 border-t border-[#0b2f8a]/10 pt-6">
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
                  {content.stat1Value}
                </p>
                <p className="text-xs text-[#5e6d82]">{content.stat1Label}</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
                  {content.stat2Value}
                </p>
                <p className="text-xs text-[#5e6d82]">{content.stat2Label}</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
                  {content.stat3Value}
                </p>
                <p className="text-xs text-[#5e6d82]">{content.stat3Label}</p>
              </div>
            </div>
          </div>

          {/* Right Hero Showcase — Interactive Glassmorphic Product Gallery */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <GlassyHeroShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
