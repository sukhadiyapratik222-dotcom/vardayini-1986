"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

export function OurStoryHeritageSection() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [counters, setCounters] = useState({ years: 0, products: 0, customers: 0, ghee: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          // Animate counters up smoothly
          let startTimestamp: number | null = null;
          const duration = 1800; // 1.8s

          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease-out cubic
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
      { threshold: 0.25 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section
      ref={sectionRef}
      aria-label="Our Story"
      className="py-12 sm:py-20 bg-[#faf6ee] border-b border-[#3b1e54]/10 select-none overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Olive Green Heritage Card Matching Screenshot */}
        <div className="relative rounded-3xl bg-[#283618] text-white p-6 sm:p-12 lg:p-14 overflow-hidden shadow-2xl border border-white/10">
          
          {/* Subtle Golden Glow Accents */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#dfb755]/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#dfb755]/10 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              <span className="inline-block rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-[#f5c518] uppercase tracking-widest">
                SINCE 1976 · A SWEET TRADITION
              </span>

              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white">
                A Journey Of 75 Years
              </h2>

              <p className="text-xs sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
                With over seven decades of experience, we bring authentic flavors, 100% Shuddh Desi Ghee craft, and sacred celebration traditions right to your home. Every batch of our silken cashew fudge, golden besan confections, and crunchy namkeen honors the unbroken heritage of royal Gujarati mithai.
              </p>

              {/* Read More Pill Button */}
              <div className="pt-2">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-[#283618] hover:bg-[#dfb755] hover:text-[#140638] px-7 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-lg active:scale-95 cursor-pointer"
                >
                  <span>READ MORE</span>
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>

              {/* Animated Heritage Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/15">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#f5c518]">
                    {counters.years}+
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                    Years Heritage
                  </p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#f5c518]">
                    {counters.products}+
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                    Sweet Recipes
                  </p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#f5c518]">
                    {counters.customers}K+
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                    Happy Families
                  </p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#f5c518]">
                    {counters.ghee}%
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                    Shuddh Desi Ghee
                  </p>
                </div>
              </div>

            </div>

            {/* Right Side Visual with Parallax / Layered Frame */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl bg-black/20 group">
                <Image
                  src="/images/kaju-katli-showcase.jpg"
                  alt="Vardayini 75 Years Traditional Sweets"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />

                {/* Layered Glass Tag */}
                <div className="absolute bottom-4 left-4 right-4 glass-badge p-3 rounded-2xl flex items-center justify-between text-xs text-white">
                  <div>
                    <p className="font-bold">Handcrafted Daily</p>
                    <p className="text-[10px] text-slate-300">Mandvi &amp; Alkapuri Flagships</p>
                  </div>
                  <span className="text-xl">🪔</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

