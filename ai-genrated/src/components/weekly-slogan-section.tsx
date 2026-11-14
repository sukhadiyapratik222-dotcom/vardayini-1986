"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";

export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
}

export interface FeaturedSweetDetails {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  weight: string;
  stock: number;
  inStock: boolean;
  categoryName: string;
  badge: string;
}

export interface WeeklySloganData {
  id: number;
  text: string;
  highlightSegments: HighlightSegment[];
  subText: string;
  textHi?: string | null;
  subTextHi?: string | null;
  textGu?: string | null;
  subTextGu?: string | null;
  themeColor: string;
  bgStyle: string;
  buttonText: string;
  buttonLink: string;
  storyLine: string;
  badges: string[];
  startAt: string;
  endAt: string;
  weekLabel: string;
  status: string;
  sweet: FeaturedSweetDetails;
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    label: string;
  };
  settings: {
    enabled: boolean;
    location: string;
    showCountdown: boolean;
    showPastArchive: boolean;
    showShareButton: boolean;
    showAnnouncementStrip: boolean;
  };
}

export interface ArchiveSloganItem {
  id: number;
  text: string;
  subText: string;
  themeColor: string;
  weekLabel: string;
  startAt: string;
  endAt: string;
  sweet: {
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
  };
}

export function WeeklySloganSection({
  onAddToCartSuccess,
}: {
  onAddToCartSuccess?: (productName: string) => void;
}) {
  const [data, setData] = useState<WeeklySloganData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState<"en" | "hi" | "gu">("en");
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  
  // Live countdown timer state
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Archive modal state
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveList, setArchiveList] = useState<ArchiveSloganItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Section view tracking ref (send view event once when in viewport)
  const sectionRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);

  // 1. Fetch current weekly slogan
  useEffect(() => {
    let isMounted = true;
    async function fetchSlogan() {
      try {
        const res = await fetch("/api/slogans/current", { cache: "no-store" });
        const json = await res.json();
        if (isMounted && json.ok && json.data) {
          setData(json.data);
          if (json.data.countdown) {
            setCountdown({
              days: json.data.countdown.days,
              hours: json.data.countdown.hours,
              minutes: json.data.countdown.minutes,
              seconds: json.data.countdown.seconds,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load weekly slogan:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSlogan();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Local 1-second live ticker for countdown
  useEffect(() => {
    if (!data?.countdown) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data]);

  // 3. Analytics: Track view on intersection
  useEffect(() => {
    if (!data?.id || hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          fetch("/api/slogans/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sloganId: data.id, eventType: "view" }),
          }).catch(() => {});
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [data?.id]);

  // Handle Track Click
  const handleTrackClick = () => {
    if (!data?.id) return;
    fetch("/api/slogans/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sloganId: data.id, eventType: "click" }),
    }).catch(() => {});
  };

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!data?.sweet || addingToCart) return;
    setAddingToCart(true);

    try {
      handleTrackClick();
      fetch("/api/slogans/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sloganId: data.id, eventType: "add_to_cart" }),
      }).catch(() => {});

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: data.sweet.id,
          variantId: data.sweet.id,
          quantity: 1,
        }),
      });

      if (res.ok) {
        setAddedSuccess(true);
        if (onAddToCartSuccess) {
          onAddToCartSuccess(data.sweet.name);
        }
        setTimeout(() => setAddedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Add to cart error:", err);
    } finally {
      setAddingToCart(false);
    }
  };

  // Open Past Slogans Archive Modal
  const openArchive = async () => {
    setArchiveOpen(true);
    if (archiveList.length === 0) {
      setArchiveLoading(true);
      try {
        const res = await fetch("/api/slogans/archive");
        const json = await res.json();
        if (json.ok) {
          setArchiveList(json.archive || []);
        }
      } catch (err) {
        console.error("Archive fetch error:", err);
      } finally {
        setArchiveLoading(false);
      }
    }
  };

  // WhatsApp Share Generator
  const handleWhatsAppShare = () => {
    if (!data) return;
    handleTrackClick();
    const sweetName = data.sweet.name;
    const sloganClean = data.text.replace(/\*/g, "");
    const url = typeof window !== "undefined" ? window.location.origin + data.buttonLink : "https://vardayini-1986.vercel.app";
    const msg = `👑 *Vardayini Sweets - Slogan of the Week*\n\n"${sloganClean}"\n\n✨ *Featured Sweet:* ${sweetName} (₹${data.sweet.price})\n${data.storyLine}\n\nOrder fresh here: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // If section is disabled in settings, do not render
  if (!loading && data?.settings?.enabled === false) {
    return null;
  }

  // Skeleton Loader while fetching
  if (loading) {
    return (
      <section className="py-8 sm:py-12 bg-[#faf6ee] select-none">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#140638]/90 p-8 sm:p-12 animate-pulse min-h-[380px] border border-white/10">
            <div className="h-6 w-48 bg-white/20 rounded-full mb-6" />
            <div className="h-12 w-3/4 bg-white/20 rounded-xl mb-4" />
            <div className="h-4 w-1/2 bg-white/15 rounded-md mb-8" />
            <div className="h-10 w-40 bg-white/25 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  // Active language text resolution
  const displaySlogan =
    activeLang === "hi" && data.textHi
      ? data.textHi
      : activeLang === "gu" && data.textGu
      ? data.textGu
      : data.text;

  const displaySubText =
    activeLang === "hi" && data.subTextHi
      ? data.subTextHi
      : activeLang === "gu" && data.subTextGu
      ? data.subTextGu
      : data.subText;

  // Parse highlighted segments for current language
  const segments = displaySlogan.split(/(\*[^*]+\*)/g).map((seg) => {
    if (seg.startsWith("*") && seg.endsWith("*")) {
      return { text: seg.slice(1, -1), isHighlight: true };
    }
    return { text: seg, isHighlight: false };
  });

  const themeHex = data.themeColor || "#dfb755";

  return (
    <section
      ref={sectionRef}
      aria-label="Weekly Slogan & Sweet of the Week"
      className="py-10 sm:py-16 bg-[#faf6ee] border-y border-[#3b1e54]/10 select-none relative overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Glassmorphic Slogan Container */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl transition-all duration-500 border border-white/25"
          style={{
            background: `linear-gradient(135deg, rgba(20, 6, 56, 0.94) 0%, rgba(59, 30, 84, 0.90) 50%, rgba(20, 6, 56, 0.96) 100%)`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: `0 16px 40px -12px ${themeHex}25, 0 8px 32px rgba(0,0,0,0.3)`,
          }}
        >
          {/* Dynamic Ambient Aurora Glow based on Sweet's Theme Color */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full blur-3xl opacity-35 transition-all duration-700"
            style={{ backgroundColor: themeHex }}
          />
          <div
            className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full blur-3xl opacity-25 transition-all duration-700"
            style={{ backgroundColor: themeHex }}
          />

          {/* Delicate Indian Floral Motif Watermark */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#dfb755_0.8px,transparent_0.8px)] [background-size:20px_20px] opacity-10" />

          {/* Top Bar: Label, Date Range & Language Switcher */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#dfb755] text-[11px] font-extrabold uppercase tracking-widest border border-[#dfb755]/30 shadow-xs backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dfb755] animate-ping" />
                SLOGAN OF THE WEEK
              </span>
              <span className="text-white/60 text-xs font-medium">
                {data.weekLabel}
              </span>
            </div>

            {/* Language Switcher Tabs (English / Hindi / Gujarati) */}
            <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-full border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveLang("en")}
                className={`px-2.5 py-0.5 rounded-full font-bold transition-all ${
                  activeLang === "en"
                    ? "bg-[#dfb755] text-[#140638] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                EN
              </button>
              {data.textHi && (
                <button
                  type="button"
                  onClick={() => setActiveLang("hi")}
                  className={`px-2.5 py-0.5 rounded-full font-bold transition-all ${
                    activeLang === "hi"
                      ? "bg-[#dfb755] text-[#140638] shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  हिन्दी
                </button>
              )}
              {data.textGu && (
                <button
                  type="button"
                  onClick={() => setActiveLang("gu")}
                  className={`px-2.5 py-0.5 rounded-full font-bold transition-all ${
                    activeLang === "gu"
                      ? "bg-[#dfb755] text-[#140638] shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  ગુજરાતી
                </button>
              )}
            </div>
          </div>

          {/* Two-Column Grid: Left Content + Right Floating Sweet Card */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left 7 Columns: Weekly Slogan, Subtitle, Story, Badges & CTA */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              
              {/* Grand Serif Weekly Slogan with Radiant Gold Highlights */}
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight mb-4 drop-shadow-md">
                {segments.map((seg, idx) =>
                  seg.isHighlight ? (
                    <span
                      key={idx}
                      className="text-[#dfb755] relative inline-block mx-0.5 font-extrabold"
                      style={{
                        textShadow: "0 0 20px rgba(223, 183, 85, 0.4)",
                      }}
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={idx}>{seg.text}</span>
                  )
                )}
              </h2>

              {/* Sub-slogan / Supporting Line */}
              {displaySubText && (
                <p className="text-white/85 text-sm sm:text-base lg:text-lg leading-relaxed mb-4 max-w-xl font-medium">
                  {displaySubText}
                </p>
              )}

              {/* Sweet Story Line */}
              {data.storyLine && (
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-white/70 italic mb-5 max-w-lg bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <span className="text-[#dfb755] text-base leading-none">✦</span>
                  <span>{data.storyLine}</span>
                </div>
              )}

              {/* "Why We Love It" Badges List */}
              {data.badges && data.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {data.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold text-white bg-white/10 border border-white/15 backdrop-blur-md shadow-xs"
                    >
                      <span className="text-[#dfb755]">✓</span>
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons: Primary Shop Now + WhatsApp Share + Archive Link */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={data.buttonLink || `/shop/${data.sweet.slug}`}
                  onClick={handleTrackClick}
                  className="gold-shimmer-btn inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 sm:px-8 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#dfb755] text-[#140638] hover:bg-[#e6c46e] transition-all shadow-xl active:scale-95 cursor-pointer font-[family-name:var(--font-display)]"
                >
                  <span>{data.buttonText || "Shop Sweet of the Week"}</span>
                  <span className="text-base font-bold">→</span>
                </Link>

                {data.settings.showShareButton && (
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    aria-label="Share sweet on WhatsApp"
                    className="inline-flex items-center gap-2 rounded-full py-3 px-4 sm:px-5 text-xs sm:text-sm font-bold bg-[#25D366]/20 hover:bg-[#25D366]/30 text-emerald-300 border border-[#25D366]/40 transition-all backdrop-blur-md active:scale-95 cursor-pointer shadow-md"
                  >
                    <span>💬</span>
                    <span>Share Sweet</span>
                  </button>
                )}

                {data.settings.showPastArchive && (
                  <button
                    type="button"
                    onClick={openArchive}
                    className="text-xs sm:text-sm font-medium text-white/70 hover:text-[#dfb755] underline underline-offset-4 transition ml-1 cursor-pointer"
                  >
                    Past slogans &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Featured Sweet Card with Gentle Floating Motion */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div
                className="relative w-full max-w-sm rounded-3xl p-4 sm:p-5 text-white transition-all duration-500 border border-white/20 group hover:shadow-2xl"
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
                }}
              >
                {/* Floating Product Image with Soft Pulse / Float */}
                <Link
                  href={`/shop/${data.sweet.slug}`}
                  onClick={handleTrackClick}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/30 shadow-inner group-hover:scale-102 transition-transform duration-500"
                >
                  <Image
                    src={data.sweet.imageUrl || "/images/kaju-katli.jpg"}
                    alt={data.sweet.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 90vw, 400px"
                    priority
                  />
                  
                  {/* Freshness Tag */}
                  <div className="absolute top-2.5 left-2.5 rounded-full bg-emerald-500/90 text-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm">
                    ✨ Made Fresh This Week
                  </div>

                  {/* Category Pill */}
                  {data.sweet.categoryName && (
                    <div className="absolute bottom-2.5 left-2.5 rounded-full bg-black/60 text-white px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md">
                      {data.sweet.categoryName}
                    </div>
                  )}
                </Link>

                {/* Sweet Title, Pricing & Weight */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/shop/${data.sweet.slug}`}
                      onClick={handleTrackClick}
                      className="font-[family-name:var(--font-display)] text-base sm:text-lg font-bold text-white hover:text-[#dfb755] transition line-clamp-1"
                    >
                      {data.sweet.name}
                    </Link>
                    <span className="text-[11px] font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded-md">
                      {data.sweet.weight}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg sm:text-xl font-extrabold text-[#dfb755]">
                        {formatInr(data.sweet.price)}
                      </span>
                      {data.sweet.originalPrice > data.sweet.price && (
                        <span className="text-xs text-white/50 line-through">
                          {formatInr(data.sweet.originalPrice)}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-emerald-300">
                      ● In Stock
                    </span>
                  </div>
                </div>

                {/* Direct 1-Click "Add to Box" Button */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="w-full rounded-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 bg-[#dfb755] text-[#140638] hover:bg-[#e6c46e]"
                  >
                    {addingToCart ? (
                      <span>Adding to Box...</span>
                    ) : addedSuccess ? (
                      <span className="text-emerald-950 font-extrabold">✓ Added to Box!</span>
                    ) : (
                      <>
                        <span>Add To Box</span>
                        <span className="font-bold">🛍️</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Countdown Box (Weekly Rotation Timer) */}
              {data.settings.showCountdown && (
                <div className="mt-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs backdrop-blur-md shadow-sm">
                  <span className="text-[#dfb755]">⏳</span>
                  <span className="text-white/75 font-medium">Next Slogan in:</span>
                  <span className="font-mono font-bold text-[#dfb755]">
                    {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Past Slogans Glass Modal */}
      {archiveOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setArchiveOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl p-6 sm:p-8 text-white border border-white/20 shadow-2xl flex flex-col"
            style={{
              background: "linear-gradient(135deg, rgba(20, 6, 56, 0.96) 0%, rgba(59, 30, 84, 0.94) 100%)",
              backdropFilter: "blur(20px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/15">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-white">
                  Past Weekly Slogans Archive
                </h3>
                <p className="text-xs sm:text-sm text-white/70">
                  Discover previous favorites and heritage recipes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable list of past slogans */}
            <div className="mt-4 overflow-y-auto space-y-3.5 pr-1 flex-1">
              {archiveLoading ? (
                <div className="py-12 text-center text-white/60 text-sm">
                  Loading archive...
                </div>
              ) : archiveList.length === 0 ? (
                <div className="py-12 text-center text-white/60 text-sm">
                  No past slogans archived yet. Check back next Monday!
                </div>
              ) : (
                archiveList.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      {item.sweet?.imageUrl && (
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-black/20 shrink-0">
                          <Image
                            src={item.sweet.imageUrl}
                            alt={item.sweet.name || "Sweet"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#dfb755] tracking-wider">
                          {item.weekLabel}
                        </span>
                        <h4 className="text-sm font-bold text-white line-clamp-1">
                          {item.text.replace(/\*/g, "")}
                        </h4>
                        <p className="text-xs text-white/70 line-clamp-1">
                          Featured: {item.sweet?.name || "Handcrafted Mithai"} &bull; {formatInr(item.sweet?.price || 0)}
                        </p>
                      </div>
                    </div>

                    {item.sweet?.slug && (
                      <Link
                        href={`/shop/${item.sweet.slug}`}
                        onClick={() => setArchiveOpen(false)}
                        className="rounded-full px-3.5 py-1.5 text-xs font-bold bg-[#dfb755] text-[#140638] hover:bg-[#e6c46e] transition shrink-0 self-end sm:self-auto"
                      >
                        Order Sweet &rarr;
                      </Link>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
