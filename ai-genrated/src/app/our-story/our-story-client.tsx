"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

export function OurStoryClientPage() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [counters, setCounters] = useState({ years: 0, products: 0, customers: 0, ghee: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          let startTimestamp: number | null = null;
          const duration = 1800;

          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            setCounters({
              years: Math.floor(ease * 75),
              products: Math.floor(ease * 100),
              customers: Math.floor(ease * 50),
              ghee: Math.floor(ease * 100),
            });

            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              setCounters({ years: 75, products: 100, customers: 50, ghee: 100 });
            }
          };

          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <div className="min-h-screen w-full bg-[#1b2612] text-white selection:bg-[#dfb755]/30">
      {/* ─────────────────────────────────────────────────────────────
          1. BREADCRUMBS & TOP BRAND HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#141d0d]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs sm:text-sm">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-slate-300">
            <Link href="/" className="hover:text-[#dfb755] transition">
              Home
            </Link>
            <span className="text-[#dfb755]/60">/</span>
            <span className="text-[#dfb755] font-semibold">Our Story</span>
          </nav>
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold hidden sm:inline-block">
            Kalol, Gujarat · Est. 1976
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FULL-PAGE HERO: A JOURNEY OF 75 YEARS
         ───────────────────────────────────────────────────────────── */}
      <section
        ref={sectionRef}
        className="relative py-16 sm:py-24 lg:py-28 overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#1b2612] via-[#283618] to-[#1b2612]"
      >
        {/* Ambient Gold Glow Background Lights */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#dfb755]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-[#dfb755]/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Editorial Heritage Story */}
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-block rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 px-4 py-1.5 text-xs font-bold text-[#f5c518] uppercase tracking-widest shadow-xs">
                SINCE 1976 · A SWEET TRADITION
              </span>

              <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] text-white tracking-tight">
                A Journey Of 75 Years
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-200/90 leading-relaxed max-w-2xl font-light">
                With over seven decades of experience, we bring authentic flavors, 100% Shuddh Desi Ghee craft, and sacred celebration traditions right to your home. Every batch of our silken cashew fudge, golden besan confections, and crunchy namkeen honors the unbroken heritage of royal Gujarati mithai.
              </p>

              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed max-w-2xl">
                Founded in Kalol, Gujarat, Vardayini began with dawn copper-kadhai batches of slow-roasted Mohanthal and melt-in-mouth Kesar Penda. Today, we hold steadfast to that same time-honored discipline: fresh dairy, zero artificial preservatives, and pure Bilona desi ghee.
              </p>

              {/* Metric Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/15">
                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
                  <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[#f5c518]">
                    {counters.years}+
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-1 font-semibold">
                    Years Heritage
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
                  <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[#f5c518]">
                    {counters.products}+
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-1 font-semibold">
                    Sweet Recipes
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
                  <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[#f5c518]">
                    {counters.customers}K+
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-1 font-semibold">
                    Happy Families
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
                  <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-[#f5c518]">
                    {counters.ghee}%
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-1 font-semibold">
                    Shuddh Desi Ghee
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Showcase Image with Floating Badge */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md sm:max-w-lg aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
                <Image
                  src="/images/kaju-katli-showcase.jpg"
                  alt="Vardayini Signature Silver Foil Kaju Katli on Brass Thali"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                />
                
                {/* Frosted Glass Overlay Badge */}
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/55 backdrop-blur-md border border-white/20 p-3.5 flex items-center justify-between text-white shadow-xl">
                  <div>
                    <p className="font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 text-white">
                      <span>👑</span>
                      <span>Handcrafted Daily</span>
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
                      Navjivan & Station Road Flagships, Kalol
                    </p>
                  </div>
                  <span className="h-8 w-8 rounded-full bg-[#dfb755] text-[#140638] flex items-center justify-center font-black text-sm shadow-md">
                    ✓
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. THE FOUR SACRED PILLARS OF OUR CRAFT
         ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#141d0d] border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#dfb755]">
              Tradition Without Compromise
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mt-2 text-white">
              The Four Sacred Pillars of Our Craft
            </h2>
            <div className="h-0.5 w-16 bg-[#dfb755] mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1f2c15] p-6 rounded-2xl border border-white/10 space-y-3 hover:border-[#dfb755]/50 transition">
              <span className="text-3xl block">🍯</span>
              <h3 className="font-bold text-lg text-white">100% Shuddh Desi Ghee</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Only pure Gir cow and buffalo bilona ghee is churned into our kadais. No palm oil, vanaspati, or blended fats ever touch our sweets.
              </p>
            </div>

            <div className="bg-[#1f2c15] p-6 rounded-2xl border border-white/10 space-y-3 hover:border-[#dfb755]/50 transition">
              <span className="text-3xl block">🔥</span>
              <h3 className="font-bold text-lg text-white">Slow Copper Kadhai Roasting</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Traditional thick brass and copper cauldrons ensure uniform heat distribution, caramelizing sugars naturally to impart an authentic, deep aroma.
              </p>
            </div>

            <div className="bg-[#1f2c15] p-6 rounded-2xl border border-white/10 space-y-3 hover:border-[#dfb755]/50 transition">
              <span className="text-3xl block">💎</span>
              <h3 className="font-bold text-lg text-white">Certified Silver Foil & Pure Mawa</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                100% vegetarian-certified silver foil (Varkh) and fresh daily khoya mawa from vetted local Gujarat dairy farmers.
              </p>
            </div>

            <div className="bg-[#1f2c15] p-6 rounded-2xl border border-white/10 space-y-3 hover:border-[#dfb755]/50 transition">
              <span className="text-3xl block">🌿</span>
              <h3 className="font-bold text-lg text-white">Zero Preservatives</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pure sweetness the way nature intended. Sealed fresh in airtight hygienic packaging, dispatched within hours of baking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. HERITAGE TIMELINE (1976 — TODAY)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#1b2612] border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#dfb755]">
              Milestones
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mt-2 text-white">
              Seven Decades of Sweet Memories
            </h2>
          </div>

          <div className="relative border-l-2 border-[#dfb755]/40 ml-4 sm:ml-8 space-y-12">
            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#dfb755] border-4 border-[#1b2612]" />
              <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">1976</span>
              <h3 className="text-xl font-bold text-white mt-1">The First Copper Kadhai in Kalol</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Vardayini Sweet Mart opened its first counter in Navjivan Shopping Center, Kalol. The aroma of slow-cooked Mohanthal and freshly roasted Sev quickly became a morning ritual for town families.
              </p>
            </div>

            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#dfb755] border-4 border-[#1b2612]" />
              <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">1995</span>
              <h3 className="text-xl font-bold text-white mt-1">Artisanal Cashew & Dry Fruit Innovations</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Pioneering fine hand-rolled Kaju Katli and luxury dry fruit bites for weddings and festival gifting across Gujarat.
              </p>
            </div>

            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#dfb755] border-4 border-[#1b2612]" />
              <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">2012</span>
              <h3 className="text-xl font-bold text-white mt-1">Expanding Our Flagship in Kalol</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Opening the Station Road counter to welcome travelers, daily commuters, and regional sweet lovers with fresh farsan and live snack stations.
              </p>
            </div>

            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#dfb755] border-4 border-[#1b2612]" />
              <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">Today</span>
              <h3 className="text-xl font-bold text-white mt-1">Pure Desi Ghee Delivered to Your Doorstep</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Now serving statewide with next-day express delivery in vacuum-sealed gift boxes, bringing authentic Kalol mithai right to your home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. VISIT OUR KALOL STORES & SHOP CTA
         ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-[#141d0d] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#dfb755]">
            Experience The Tradition
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white mt-2">
            Taste the Royal Heritage Today
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-3 max-w-lg mx-auto leading-relaxed">
            Order fresh desi ghee sweets online or visit our flagship counters in Kalol, Gujarat.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[#dfb755] text-[#140638] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-amber-300 transition shadow-lg cursor-pointer"
            >
              <span>Explore Our Mithai</span>
              <span>→</span>
            </Link>
            <Link
              href="/stores"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <span>Visit Kalol Stores</span>
              <span>📍</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
