"use client";

import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";

interface FestiveHighlight {
  id: string;
  festival: string;
  gujarati: string;
  name: string;
  badge: string;
  price: number;
  image: string;
  tags: string;
  link: string;
}

const FESTIVE_HIGHLIGHTS: FestiveHighlight[] = [
  {
    id: "diwali-hamper",
    festival: "Diwali Special",
    gujarati: "શાહી દિવાળી હેમ્પર",
    name: "Shahi Diwali Royal Sweets Hamper",
    badge: "Most Loved 🪔",
    price: 1450,
    image: "/images/hamper.jpg",
    tags: "Kaju Katli, Anjeer Roll & Peda",
    link: "/festivals",
  },
  {
    id: "dussehra-jalebi",
    festival: "Navratri & Dussehra",
    gujarati: "દશેરા સ્પેશ્યલ જલેબી-ફાફડા",
    name: "Golden Kesar Jalebi & Papdi Fafda",
    badge: "Dussehra Morning 💃",
    price: 650,
    image: "/images/jalebi.jpg",
    tags: "Pure Ghee Jalebi with Sambharo",
    link: "/festivals",
  },
  {
    id: "rakhi-box",
    festival: "Raksha Bandhan",
    gujarati: "રક્ષાબંધન સ્પેશ્યલ બોક્સ",
    name: "Rakhi Prem Box + Designer Rakhi",
    badge: "Free Rakhi 🧵",
    price: 850,
    image: "/images/motichoor-showcase.jpg",
    tags: "Motichoor, Kaju Katli & Roli",
    link: "/festivals",
  },
  {
    id: "ganesh-modak",
    festival: "Ganesh Chaturthi",
    gujarati: "૨૧ મોદક પ્રસાદ ભોગ",
    name: "Shuddh Desi Ghee 21-Modak Bhog",
    badge: "Bapa's Bhog 🐘",
    price: 780,
    image: "/images/peda.jpg",
    tags: "Kesar, Kaju & Mawa Modak",
    link: "/festivals",
  },
];

export function FestiveSeasonHomeSection() {
  return (
    <section className="relative overflow-hidden py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Festive Container with Royal Gold & Navy Accents */}
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#0b1b4f] via-[#0b2468] to-[#071330] p-6 sm:p-10 md:p-12 text-white shadow-2xl overflow-hidden border border-[#dfb755]/30">
          {/* Subtle Traditional Diya Pattern Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-[#dfb755]/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-72 w-72 rounded-full bg-[#0b2f8a]/40 blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 text-[#dfb755] text-xs font-bold uppercase tracking-widest">
                <span>🪔 શુભ તહેવાર • FESTIVE SEASON SPECIALS</span>
              </div>

              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Celebrate Indian Festivals with{" "}
                <span className="text-[#dfb755] italic">Shuddh Mithai</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                Diwali gift hampers, Dussehra Jalebi-Fafda, Rakhi sweets boxes, and Ganesh Chaturthi 21-modak prasad handcrafted with 100% pure desi ghee.
              </p>
            </div>

            {/* View All & Coupon Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200">
                <span>Festive Code: </span>
                <span className="font-bold text-[#dfb755] font-mono">FESTIVE15</span>
                <span className="text-[10px] text-slate-300 block">Flat 15% OFF on ₹999+</span>
              </div>

              <Link
                href="/festivals"
                className="px-6 py-3 rounded-full text-xs font-bold bg-[#dfb755] hover:bg-[#cf9e32] text-slate-950 transition-all shadow-md hover:scale-105 active:scale-95 duration-200 flex items-center gap-2"
              >
                <span>Explore All Festivals 🪔</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Featured Festive Products Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-8">
            {FESTIVE_HIGHLIGHTS.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 overflow-hidden transition-all duration-300 hover:bg-white/15 hover:-translate-y-1 hover:border-[#dfb755]/50 flex flex-col justify-between"
              >
                <div>
                  {/* Photo with Festival Badge */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900/40">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 300px"
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                      <span className="bg-[#0b1b4f]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                        {item.festival}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-[#dfb755] text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {item.badge}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-1.5">
                    <p className="text-[10px] font-bold text-[#dfb755] tracking-wide uppercase">
                      {item.gujarati}
                    </p>
                    <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white group-hover:text-[#f5df9e] transition leading-snug line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 line-clamp-1 font-light">
                      {item.tags}
                    </p>
                  </div>
                </div>

                {/* Price & Action Button */}
                <div className="p-4 pt-0 mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                  <div>
                    <span className="text-xs text-slate-400 block font-light">Starts at</span>
                    <span className="text-lg font-bold text-[#dfb755]">
                      {formatInr(item.price)}
                    </span>
                  </div>

                  <Link
                    href="/festivals"
                    className="px-4 py-2 rounded-full text-xs font-bold bg-white text-[#0b2f8a] hover:bg-[#dfb755] hover:text-slate-950 transition shadow-sm"
                  >
                    View Box →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Festival Season Bar with Badges */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Festivals covered:</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                🪔 Diwali
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                💃 Navratri / Dussehra
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                🧵 Raksha Bandhan
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                🐘 Ganesh Utsav
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                🎨 Holi
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                🪁 Uttarayan
              </span>
            </div>

            <Link
              href="/festivals"
              className="text-[#dfb755] hover:underline font-bold text-xs flex items-center gap-1"
            >
              <span>See All Festival Hampers &amp; Prasad</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
