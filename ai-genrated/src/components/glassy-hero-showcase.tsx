"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { BorderTrail } from "@/components/core/border-trail";

interface ProductPhoto {
  id: string;
  name: string;
  image: string;
}

const PRODUCTS: ProductPhoto[] = [
  {
    id: "kaju-katli",
    name: "Kaju Katli",
    image: "/images/kaju-katli-showcase.jpg",
  },
  {
    id: "motichoor-ladoo",
    name: "Motichoor Ladoo",
    image: "/images/motichoor-showcase.jpg",
  },
  {
    id: "nylon-khaman",
    name: "Nylon Khaman",
    image: "/images/khaman-showcase.jpg",
  },
  {
    id: "surati-khandvi",
    name: "Surati Khandvi",
    image: "/images/khandvi-showcase.jpg",
  },
  {
    id: "festive-platter",
    name: "Shahi Platter",
    image: "/images/mithai-platter-showcase.jpg",
  },
  {
    id: "special-bhel",
    name: "Special Bhel",
    image: "/images/special-bhel-showcase.jpg",
  },
  {
    id: "ratlami-sev",
    name: "Ratlami Sev",
    image: "/uploads/1791029531387-c8e0da1d-527e-48b8-be9a-a5500eca62e3.jpg",
  },
];

export function GlassyHeroShowcase() {
  const [products, setProducts] = useState<ProductPhoto[]>(PRODUCTS);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    fetch("/api/ui-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.heroPhotos && Array.isArray(data.heroPhotos)) {
          const activePhotos = data.heroPhotos
            .filter((p: any) => p.active !== false)
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          if (activePhotos.length > 0) {
            setProducts(activePhotos);
          }
        }
        if (data.heroSettings) {
          if (data.heroSettings.autoScroll !== undefined) {
            setAutoScrollEnabled(data.heroSettings.autoScroll);
          }
          if (data.heroSettings.intervalSeconds) {
            setIntervalMs(data.heroSettings.intervalSeconds * 1000);
          }
        }
      })
      .catch(() => { });
  }, []);

  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pauseBriefly = useCallback(() => {
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 4000);
  }, []);

  // Scroll to a specific slide index smoothly
  const scrollToSlide = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetLeft = index * container.clientWidth;
    isProgrammaticScroll.current = true;
    container.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
    setActiveIndex(index);
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
  }, []);

  const handleNext = useCallback(() => {
    if (products.length === 0) return;
    const nextIndex = (activeIndex + 1) % products.length;
    scrollToSlide(nextIndex);
  }, [activeIndex, products.length, scrollToSlide]);

  const handlePrev = useCallback(() => {
    if (products.length === 0) return;
    const prevIndex = (activeIndex - 1 + products.length) % products.length;
    scrollToSlide(prevIndex);
  }, [activeIndex, products.length, scrollToSlide]);

  const scrollThumbnails = (direction: "left" | "right") => {
    pauseBriefly();
    const container = thumbnailContainerRef.current;
    if (!container) return;
    const scrollAmount = Math.max(160, container.clientWidth * 0.6);
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Sync activeIndex when user scrolls/swipes manually
  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    const container = scrollContainerRef.current;
    if (!container || container.clientWidth === 0) return;
    const newIndex = Math.round(container.scrollLeft / container.clientWidth);
    if (newIndex >= 0 && newIndex < products.length && newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  // Smooth auto-scroll loop
  useEffect(() => {
    if (isPaused || !autoScrollEnabled || products.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPaused, autoScrollEnabled, products.length, intervalMs, handleNext]);

  // Keep active thumbnail centered and smoothly visible in strip
  useEffect(() => {
    const container = thumbnailContainerRef.current;
    const activeThumb = thumbnailRefs.current[activeIndex];
    if (container && activeThumb) {
      const containerWidth = container.clientWidth;
      const thumbLeft = activeThumb.offsetLeft;
      const thumbWidth = activeThumb.clientWidth;
      const targetScroll = thumbLeft - containerWidth / 2 + thumbWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const [isSuperZoom, setIsSuperZoom] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<ProductPhoto | null>(null);

  return (
    <div
      className="relative w-full max-w-lg sm:max-w-xl lg:max-w-[560px] xl:max-w-[620px] 2xl:max-w-[660px] mx-auto select-none px-1 sm:px-0"
      onTouchStart={pauseBriefly}
    >
      {/* Soft ambient royal gold & navy glow contained smoothly behind panel */}
      <div className="absolute inset-0 -z-10 m-auto h-[92%] w-[92%] rounded-[2.5rem] bg-gradient-to-br from-[#dfb755]/20 via-[#0b2f8a]/8 to-transparent blur-2xl pointer-events-none" />

      {/* Main Glassmorphic Panel Container with Animated Golden Shining Border Trail */}
      <div className="relative rounded-[2rem] p-2.5 sm:p-3.5 glass-panel border-[2px] sm:border-[2.5px] border-amber-200/70 shadow-[0_20px_50px_-15px_rgba(11,47,138,0.16),0_8px_24px_-6px_rgba(223,183,85,0.2)] overflow-hidden w-full max-w-full [transform:translateZ(0)]">
        {/* Animated Shining Golden Border Trail Motion around the container perimeter */}
        <BorderTrail
          className="bg-gradient-to-r from-amber-400 via-[#fffbeb] via-50% to-[#dfb755]"
          size={200}
          radius={32}
          borderWidth={3}
          style={{
            boxShadow:
              "0 0 16px 3px rgba(246, 179, 8, 0.95), 0 0 30px 8px rgba(253, 237, 118, 0.75)",
          }}
        />

        {/* Scrollable Photo Viewport — Zoomed In Mouth-Watering Close-Up Food Photography */}
        <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] bg-gradient-to-b from-white/95 to-amber-50/60 shadow-inner group">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {products.map((prod, idx) => (
              <div
                key={prod.id}
                onClick={() => setFullscreenImage(prod)}
                className="relative aspect-[16/11] sm:aspect-[16/11] md:aspect-[4/3] lg:aspect-[16/11] xl:aspect-[4/3] w-full shrink-0 snap-center overflow-hidden cursor-zoom-in bg-gradient-to-br from-[#fffdf7] via-[#fefaf0] to-[#fcf4e4] flex items-center justify-center select-none"
                title="Click to view full photo"
              >
                {/* Ambient soft glow backdrop: smoothly diffuses the image colors around letterbox edges */}
                <Image
                  src={prod.image}
                  alt=""
                  aria-hidden="true"
                  fill
                  className="object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                  sizes="120px"
                />

                {/* Main product photo: zoomed out to natural framing, fully visible without cropping */}
                <div className="relative w-full h-full p-2 sm:p-3 flex items-center justify-center">
                  <Image
                    src={prod.image}
                    alt={prod.name}
                    fill
                    priority={idx === 0}
                    className={`object-contain transition-transform duration-500 ease-out drop-shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
                      isSuperZoom
                        ? "scale-[1.28] sm:scale-[1.3] hover:scale-[1.32]"
                        : "scale-100 hover:scale-[1.02]"
                    }`}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 580px, 660px"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Zoom Level Pill Toggle (Top-Right) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pauseBriefly();
              setIsSuperZoom((prev) => !prev);
            }}
            aria-label={isSuperZoom ? "Zoom out to normal view" : "Zoom in closer"}
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/90 hover:bg-white text-[#0b2f8a] border border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.12)] text-[10px] sm:text-[11px] font-bold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
            title={isSuperZoom ? "Reset zoom to full view" : "Zoom in close"}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isSuperZoom ? (
                <>
                  <circle cx="11" cy="11" r="8" strokeWidth={2.2} />
                  <path strokeLinecap="round" strokeWidth={2.2} d="M21 21l-4.35-4.35M8 11h6" />
                </>
              ) : (
                <>
                  <circle cx="11" cy="11" r="8" strokeWidth={2.2} />
                  <path strokeLinecap="round" strokeWidth={2.2} d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                </>
              )}
            </svg>
            <span>{isSuperZoom ? "Zoom Out" : "Zoom In"}</span>
          </button>

          {/* Glassy Floating Left & Right Scroll Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous photo"
            className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full backdrop-blur-xl bg-white/90 hover:bg-white border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.14)] flex items-center justify-center text-[#0b2f8a] transition-all duration-300 hover:scale-110 active:scale-95 opacity-90 group-hover:opacity-100 z-10"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next photo"
            className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full backdrop-blur-xl bg-white/90 hover:bg-white border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.14)] flex items-center justify-center text-[#0b2f8a] transition-all duration-300 hover:scale-110 active:scale-95 opacity-90 group-hover:opacity-100 z-10"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Minimal Glass Progress Indicator Dots */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl bg-black/40 border border-white/20 z-10 pointer-events-none">
            {products.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "w-4 bg-white shadow-sm"
                    : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Glassy Product Photo Thumbnail Strip — Scroll & Click to Switch */}
        <div className="mt-2.5 sm:mt-3 pt-0.5">
          <div className="flex items-center justify-between pb-1.5 px-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#0b2f8a]/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dfb755]" />
              Tap to view Mithai
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#0b2f8a] bg-[#0b2f8a]/10 px-2 py-0.5 rounded-full">
                {products.length > 0 ? activeIndex + 1 : 0} / {products.length}
              </span>
            </div>
          </div>

          <div className="relative group/strip">
            {/* Scroll Left Button (Desktop only, mobile uses native touch swipe) */}
            <button
              type="button"
              onClick={() => scrollThumbnails("left")}
              aria-label="Scroll thumbnails left"
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/95 shadow-md border border-slate-200 items-center justify-center text-[#0b2f8a] hover:bg-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/strip:opacity-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Scrollable Thumbnails Container */}
            <div
              ref={thumbnailContainerRef}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-3 sm:px-1.5 scroll-smooth"
            >
              {products.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      thumbnailRefs.current[idx] = el;
                    }}
                    onClick={() => {
                      pauseBriefly();
                      scrollToSlide(idx);
                    }}
                    className={`group relative flex-1 min-w-[58px] sm:min-w-[64px] max-w-[80px] flex flex-col items-center rounded-xl p-1 transition-all duration-300 text-center cursor-pointer shrink-0 sm:shrink ${
                      isSelected
                        ? "bg-white border-2 border-[#0b2f8a] shadow-md shadow-[#0b2f8a]/20 scale-[1.03] ring-1 ring-amber-300"
                        : "bg-white/75 border border-slate-200/80 hover:bg-white hover:border-[#0b2f8a]/50 shadow-sm"
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-amber-50/70 shadow-inner">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover scale-100 group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 60px, 80px"
                      />
                    </div>
                    <span
                      className={`mt-1 flex items-center justify-center text-center text-[9px] sm:text-[10px] leading-tight w-full px-0.5 min-h-[24px] sm:min-h-[26px] line-clamp-2 ${
                        isSelected ? "text-[#0b2f8a] font-bold" : "text-slate-600 font-medium"
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button (Desktop only, mobile uses native touch swipe) */}
            <button
              type="button"
              onClick={() => scrollThumbnails("right")}
              aria-label="Scroll thumbnails right"
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/95 shadow-md border border-slate-200 items-center justify-center text-[#0b2f8a] hover:bg-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/strip:opacity-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* High-Resolution Close-Up Food Modal View */}
      {fullscreenImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative max-w-3xl w-full rounded-3xl overflow-hidden bg-white shadow-2xl border border-amber-200/60 p-3 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dfb755]" />
                <h3 className="font-bold text-base sm:text-lg text-[#0b2f8a]">
                  {fullscreenImage.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenImage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition font-bold text-sm"
                aria-label="Close photo preview"
              >
                ✕
              </button>
            </div>
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden mt-3 bg-amber-50/50">
              <Image
                src={fullscreenImage.image}
                alt={fullscreenImage.name}
                fill
                className="object-contain transition-transform duration-500 ease-out"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
            <div className="flex items-center justify-between pt-3 px-1">
              <p className="text-xs text-slate-500">
                Pure Desi Ghee • Prepared Fresh Daily at Vardayini Sweet Mart
              </p>
              <button
                type="button"
                onClick={() => setFullscreenImage(null)}
                className="btn-gold rounded-full px-4 py-1.5 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
