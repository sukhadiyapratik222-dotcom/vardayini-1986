"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HeritageBannerConfig {
  enabled: boolean;
  topBadgeGujarati: string;
  topBadgeEnglish: string;
  titleLine1: string;
  titleLine2: string;
  showTextOverlay: boolean;
  button1Text: string;
  button1Link: string;
  button2Text: string;
  button2Link: string;
  bannerImage: string;
}

const DEFAULT_BANNER: HeritageBannerConfig = {
  enabled: true,
  topBadgeGujarati: "સ્વીટ માર્ટ",
  topBadgeEnglish: "Since 1976",
  titleLine1: "Tradition Preserved Since 1976 —",
  titleLine2: "Pure Desi Ghee, Zero Compromise",
  showTextOverlay: true,
  button1Text: "Explore Heritage Menu",
  button1Link: "/shop",
  button2Text: "Gift Hampers",
  button2Link: "/shop?category=gift-hampers",
  bannerImage: "/images/heritage-hero-banner.png",
};

export function HeritageHeroBanner() {
  const [banner, setBanner] = useState<HeritageBannerConfig>(DEFAULT_BANNER);

  useEffect(() => {
    fetch("/api/ui-config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.heritageBanner) {
          setBanner({
            ...DEFAULT_BANNER,
            ...data.heritageBanner,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!banner.enabled) {
    return null;
  }

  return (
    <section className="relative w-full overflow-hidden bg-[#071330] shadow-2xl">
      {/* Top Gujarati Royal Blue Bar with Traditional Crest */}
      <div className="bg-[#0b1b4f] border-b border-[#dfb755]/30 py-2 px-4 flex items-center justify-center relative">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-4 sm:px-8 pointer-events-none">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#dfb755]/40 to-transparent" />
        </div>

        {/* Traditional Ornate Shield Crest */}
        <div className="relative z-10 px-4 sm:px-8 py-1 rounded-xl bg-[#0b2468] border border-[#dfb755]/60 text-center shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <p className="text-sm sm:text-lg font-bold tracking-wider text-[#f5df9e] font-[family-name:var(--font-display)]">
            {banner.topBadgeGujarati || "સ્વીટ માર્ટ"}
          </p>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#dfb755]/90 font-semibold -mt-0.5">
            {banner.topBadgeEnglish || "Since 1976"}
          </p>
        </div>
      </div>

      {/* 3-Panel Heritage Craft Panorama with Centered Content */}
      <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/9] w-full min-h-[260px] sm:min-h-[380px] lg:min-h-[440px] flex items-center justify-center text-center overflow-hidden">
        {/* Background Banner Image */}
        <Image
          src={banner.bannerImage || "/images/heritage-hero-banner.png"}
          alt="Tradition Preserved Since 1976 - Pure Desi Ghee, Zero Compromise"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />

        {/* Cinematic vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/50 pointer-events-none" />

        {/* Centered Typography & Action Buttons */}
        {banner.showTextOverlay && (
          <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
            <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.15] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] break-words">
              {banner.titleLine1}
              {banner.titleLine2 && (
                <>
                  <br />
                  <span className="font-light italic text-[#fbf3db]">
                    {banner.titleLine2}
                  </span>
                </>
              )}
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-5 pt-1 sm:pt-2 w-full max-w-xs sm:max-w-md mx-auto">
              {banner.button1Text && (
                <Link
                  href={banner.button1Link || "/shop"}
                  className="w-full sm:w-auto text-center px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold bg-[#e5b84c] hover:bg-[#f3cb69] text-slate-950 transition-all shadow-[0_4px_20px_rgba(229,184,76,0.35)] hover:scale-105 active:scale-95 duration-200"
                >
                  {banner.button1Text}
                </Link>
              )}
              {banner.button2Text && (
                <Link
                  href={banner.button2Link || "/shop?category=gift-hampers"}
                  className="w-full sm:w-auto text-center px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold bg-[#d8a838] hover:bg-[#eec157] text-slate-950 transition-all shadow-[0_4px_20px_rgba(216,168,56,0.35)] hover:scale-105 active:scale-95 duration-200"
                >
                  {banner.button2Text}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
