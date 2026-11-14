"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

export interface HeroSlide {
  id: string;
  badge?: string;
  tagline: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  imageUrl: string;
  imageAlt: string;
  bgGradient: string;
  accentColor: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "dubai-chocolate-ladoo",
    badge: "NEW ARTISANAL CREATION",
    tagline: "Luxury fusion of Tradition and Innovation",
    title: "Dubai Chocolate Ladoo",
    description:
      "Crisp roasted pistachio kunafa nestled inside fragrant boondi pearls, delicately enveloped in rich dark chocolate and crushed Iranian pistachios.",
    buttonText: "Shop Now",
    buttonHref: "/shop?search=ladoo",
    imageUrl: "/images/showcase/dubai-ladoo-clean.jpg",
    imageAlt: "Dubai Chocolate Ladoo with Pistachio Kunafa Center",
    bgGradient: "from-[#140638] via-[#21094e] to-[#0c0324]",
    accentColor: "#dfb755",
  },
  {
    id: "festival-special-mysore-pak",
    badge: "FESTIVAL SPECIAL",
    tagline: "Timeless Favorite to Grand Celebrations",
    title: "Festival Special to Timeless Favorite!",
    description:
      "Porous, ghee-dripping royal Mysore Pak simmered slowly in 100% Shuddh Desi Ghee. Melts instantly into golden cardamom sweetness on your tongue.",
    buttonText: "Shop Now",
    buttonHref: "/shop/mysore-pak",
    imageUrl: "/images/showcase/mysore-pak-clean.jpg",
    imageAlt: "Authentic Ghee Mysore Pak Triangular Sweets",
    bgGradient: "from-[#1c2e17] via-[#243d1e] to-[#121f0f]",
    accentColor: "#f5c518",
  },
  {
    id: "crafting-memories-platter",
    badge: "SINCE 1976 HERITAGE",
    tagline: "Pure Desi Ghee & Golden Moments",
    title: "Crafting Memories With Every Bite",
    description:
      "Generations of Kalol families have trusted our dawn-prepared mithai platters, golden chakli, and saffron motichoor for life's most precious celebrations.",
    buttonText: "Celebrate Now",
    buttonHref: "/shop",
    imageUrl: "/images/showcase/tradition-clean.jpg",
    imageAlt: "Crafting Memories Traditional Mithai Platter",
    bgGradient: "from-[#2b1810] via-[#3a2016] to-[#1a0e0a]",
    accentColor: "#dfb755",
  },
  {
    id: "raksha-bandhan-hampers",
    badge: "EXCLUSIVE FESTIVE TRUNKS",
    tagline: "Sacred Bonds & Royal Celebrations",
    title: "Festive Season of Pure Joy",
    description:
      "Artisanal celebration boxes featuring silver-foiled Kaju Katli, roasted dry fruits, and handpicked festive tokens in handcrafted keepsake hampers.",
    buttonText: "Explore Hampers",
    buttonHref: "/shop?category=gift-hampers",
    imageUrl: "/images/festive-hamper.jpg",
    imageAlt: "Royal Festive Hampers & Gift Boxes",
    bgGradient: "from-[#4a0d0d] via-[#611212] to-[#300808]",
    accentColor: "#dfb755",
  },
];

export function LuxuryHeroCarousel({
  slides = DEFAULT_SLIDES,
  autoplayInterval = 5000,
}: {
  slides?: HeroSlide[];
  autoplayInterval?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [totalSlides]);

  const goToSlide = (idx: number) => {
    if (idx === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(idx);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // 5-second Autoplay
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, autoplayInterval);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, autoplayInterval]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    // Swipe threshold 50px
    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    setTouchStartX(null);
  };

  const activeSlide = slides[currentIndex];

  return (
    <section
      aria-label="Hero Showcase"
      className="relative w-full overflow-hidden bg-[#140638] text-white select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide Viewport */}
      <div className="relative min-h-[500px] sm:min-h-[540px] lg:min-h-[600px] w-full flex items-center">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;

          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Dynamic Rich Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} opacity-95 transition-colors duration-1000`}
              />

              {/* Decorative Subtle Festive Glow Circles */}
              <div
                className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-25"
                style={{ backgroundColor: slide.accentColor }}
              />
              <div
                className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: slide.accentColor }}
              />

              {/* Main Content Grid: Responsive Layout */}
              <div className="relative mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-16 flex items-center w-full">
                
                {/* Desktop & Tablet Layout (>= lg) */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
                  
                  {/* Left Column: Glass Overlay Panel & Typography */}
                  <div className="lg:col-span-6 z-20 space-y-4 sm:space-y-6">
                    <div className="glass-overlay-panel p-6 sm:p-8 lg:p-10 rounded-3xl relative overflow-hidden">
                      {/* Subtle Gold Shimmer Border Accent */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#dfb755] to-transparent opacity-75" />

                      {/* Small Badge */}
                      {slide.badge && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-badge mb-3">
                          <span
                            className="w-2 h-2 rounded-full animate-ping"
                            style={{ backgroundColor: slide.accentColor }}
                          />
                          <span
                            className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#f5c518]"
                          >
                            {slide.badge}
                          </span>
                        </div>
                      )}

                      {/* Heading */}
                      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
                        {slide.title}
                      </h1>

                      {/* Short Tagline in Gold */}
                      <p
                        className="font-medium text-sm sm:text-base md:text-lg tracking-wide mt-2"
                        style={{ color: slide.accentColor }}
                      >
                        {slide.tagline}
                      </p>

                      {/* Paragraph Description */}
                      <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl mt-3">
                        {slide.description}
                      </p>

                      {/* CTA Button with Magnetic / Gold Shimmer Sweep */}
                      <div className="pt-4 sm:pt-6 flex items-center gap-3">
                        <Link
                          href={slide.buttonHref}
                          className="gold-shimmer-btn inline-flex items-center gap-2 px-7 sm:px-9 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold tracking-wide uppercase transition-all duration-300 shadow-xl active:scale-95 cursor-pointer bg-[#0c0324] text-[#dfb755] hover:bg-[#1f0b48] border border-[#dfb755]/50 hover:border-[#dfb755]"
                        >
                          <span>{slide.buttonText}</span>
                          <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Hero Product Food Photography with Ken Burns effect */}
                  <div className="lg:col-span-6 relative flex justify-center items-center">
                    <div className="relative w-full max-w-[480px] lg:max-w-[540px] aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15 bg-black/20 group">
                      {slide.imageUrl ? (
                        <Image
                          src={slide.imageUrl}
                          alt={slide.imageAlt}
                          fill
                          priority={idx === 0}
                          className={`object-cover object-center ${
                            isActive ? "animate-ken-burns" : ""
                          }`}
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🍬
                        </div>
                      )}

                      {/* Bottom-right Subtle Brand Signature */}
                      <div className="absolute bottom-3 right-3 glass-badge px-3 py-1 rounded-full text-[10px] sm:text-xs text-white/90 font-medium">
                        ✦ 100% Shuddh Desi Ghee
                      </div>
                    </div>
                  </div>

                </div>

                {/* Mobile & Small Screen Layout (< lg): Single Unified Premium Banner */}
                <div className="flex lg:hidden flex-col items-center w-full max-w-md mx-auto space-y-3 pb-8">
                  {/* Clean Food Photography on Top */}
                  <div className="relative w-full aspect-[16/10] sm:aspect-[2/1] rounded-2xl overflow-hidden shadow-xl border border-white/15 bg-black/30 group">
                    {slide.imageUrl ? (
                      <Image
                        src={slide.imageUrl}
                        alt={slide.imageAlt}
                        fill
                        priority={idx === 0}
                        className={`object-cover object-center ${
                          isActive ? "animate-ken-burns" : ""
                        }`}
                        sizes="100vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🍬
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 glass-badge px-2.5 py-0.5 rounded-full text-[10px] text-white/90 font-medium">
                      ✦ 100% Shuddh Desi Ghee
                    </div>
                  </div>

                  {/* Integrated Typography & CTA Below Food Photo */}
                  <div className="w-full text-center space-y-1.5 px-2">
                    {slide.badge && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-badge mb-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-ping"
                          style={{ backgroundColor: slide.accentColor }}
                        />
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest text-[#f5c518]"
                        >
                          {slide.badge}
                        </span>
                      </div>
                    )}

                    <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white leading-tight">
                      {slide.title}
                    </h1>

                    <p
                      className="font-medium text-xs tracking-wide"
                      style={{ color: slide.accentColor }}
                    >
                      {slide.tagline}
                    </p>

                    <p className="text-[11px] text-slate-200/85 leading-relaxed max-w-xs mx-auto line-clamp-2">
                      {slide.description}
                    </p>

                    <div className="pt-2 flex justify-center">
                      <Link
                        href={slide.buttonHref}
                        className="gold-shimmer-btn inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-300 shadow-lg active:scale-95 cursor-pointer bg-[#0c0324] text-[#dfb755] hover:bg-[#1f0b48] border border-[#dfb755]/50 hover:border-[#dfb755]"
                      >
                        <span>{slide.buttonText}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Desktop & Tablet) */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 h-11 w-11 items-center justify-center rounded-full glass-badge hover:bg-white/30 text-white transition-transform active:scale-90 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next Slide"
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 h-11 w-11 items-center justify-center rounded-full glass-badge hover:bg-white/30 text-white transition-transform active:scale-90 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot Indicators with Active Pill Expansion at Bottom */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                isActive
                  ? "w-8 h-2.5 bg-[#dfb755] shadow-md shadow-[#dfb755]/50"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}

