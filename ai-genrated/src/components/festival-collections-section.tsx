"use client";

import Image from "next/image";
import Link from "next/link";

export interface CollectionCardItem {
  id: string;
  name: string;
  countLabel: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
}

const COLLECTION_CARDS: CollectionCardItem[] = [
  {
    id: "col-sweets",
    name: "SWEETS",
    countLabel: "20+ Products",
    href: "/shop?group=sweets",
    imageUrl: "/images/showcase/mysore-pak-festival.jpg",
    imageAlt: "Authentic Traditional Sweets",
  },
  {
    id: "col-namkeens",
    name: "NAMKEENS",
    countLabel: "28 Products",
    href: "/shop?group=namkeen",
    imageUrl: "/images/namkeen.jpg",
    imageAlt: "Crunchy Namkeens & Gujarati Farsan",
  },
  {
    id: "col-spicy-powders",
    name: "SPICY POWDERS",
    countLabel: "08 Products",
    href: "/shop?category=farsan-snacks",
    imageUrl: "/images/dry-fruit-bite.jpg",
    imageAlt: "Authentic Spicy Powders & Podi Blends",
  },
  {
    id: "col-pickles",
    name: "TRADITIONAL PICKLES",
    countLabel: "20 Products",
    href: "/shop?category=farsan-snacks",
    imageUrl: "/images/modak-bhog.jpg",
    imageAlt: "Traditional Achar & Tangy Pickles",
  },
];

export function FestivalCollectionsSection({
  collections = COLLECTION_CARDS,
}: {
  collections?: CollectionCardItem[];
}) {
  return (
    <section
      aria-label="Festival Celebrations & Collections"
      className="py-12 sm:py-20 bg-[#fdfbf7] border-b border-[#3b1e54]/10 select-none overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        
        {/* ─────────────────────────────────────────────────────────────
            1. BOLD RED FESTIVAL BANNER (Raksha Bandhan / Festive Joy)
           ───────────────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#7a1c1c] via-[#8f1d1d] to-[#6b1414] text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl border border-white/15">
          
          {/* Floating Diyas, Rakhi & Sparkles Motifs */}
          <div className="pointer-events-none absolute top-3 left-4 text-2xl sm:text-3xl animate-slow-float opacity-80">
            🪔
          </div>
          <div className="pointer-events-none absolute bottom-3 right-6 text-2xl sm:text-3xl animate-slow-float-delayed opacity-80">
            ✨
          </div>
          <div className="pointer-events-none absolute top-4 right-16 sm:right-32 text-xl sm:text-2xl animate-slow-float opacity-75">
            🏵️
          </div>

          {/* Decorative Toran / Gilded Circles in Background */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#dfb755]/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#dfb755]/15 blur-2xl" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
            
            {/* Left Column: Festive Heading & Action */}
            <div className="md:col-span-7 space-y-3 sm:space-y-4">
              <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] sm:text-xs font-bold text-[#fef3c7] uppercase tracking-widest border border-white/25">
                ✦ SPECIAL FESTIVE CELEBRATIONS
              </span>

              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#f5c518] leading-tight tracking-tight drop-shadow-sm">
                HAPPY RAKSHA BANDHAN
              </h2>

              <p className="text-xs sm:text-sm text-slate-100/90 leading-relaxed max-w-lg">
                Cherish the purest bond of love with our handcrafted Mithai Gift Trunks, sacred designer Rakhis, and roasted California dry fruit hampers. Delivered pan-India with custom blessing notes.
              </p>

              <div className="pt-2">
                <Link
                  href="/shop?category=gift-hampers"
                  className="gold-shimmer-btn inline-flex items-center gap-2 rounded-full bg-[#140638] hover:bg-[#220a5c] text-[#dfb755] border border-[#dfb755]/50 px-6 sm:px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-xl active:scale-95 cursor-pointer"
                >
                  <span>Order Festive Hampers</span>
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Festive Celebration Illustration / Character Motif */}
            <div className="md:col-span-5 flex justify-center items-center">
              <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden bg-white/10 p-4 border border-white/20 backdrop-blur-md shadow-inner flex flex-col items-center justify-center text-center">
                
                {/* SVG Character / Celebration Motif */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="flex flex-col items-center animate-slow-float">
                    <span className="text-4xl sm:text-5xl">👦</span>
                    <span className="text-[10px] font-bold text-amber-200 mt-1 uppercase tracking-wider">Brother</span>
                  </div>
                  <div className="text-3xl sm:text-4xl text-amber-300 animate-pulse">
                    ❤️
                  </div>
                  <div className="flex flex-col items-center animate-slow-float-delayed">
                    <span className="text-4xl sm:text-5xl">👧</span>
                    <span className="text-[10px] font-bold text-amber-200 mt-1 uppercase tracking-wider">Sister</span>
                  </div>
                </div>

                {/* Subtitle Card */}
                <div className="mt-3 px-3 py-1.5 rounded-full bg-[#140638]/70 border border-[#dfb755]/40 text-[11px] font-semibold text-[#f5c518]">
                  Handcrafted Sweet Trunks &amp; Designer Rakhis
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. A SWEET TRADITION COLLECTIONS (4 Tall Cards)
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#140638] tracking-tight">
              A Sweet Tradition Collections
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Exquisitely packaged to benefit every occasion, we celebrate your pride, happiness and relationships with absolute grandeur.
            </p>
          </div>

          {/* 4 Tall Image Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {collections.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group relative flex flex-col justify-end overflow-hidden rounded-3xl aspect-[3/4] bg-[#24142e] shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dfb755]"
              >
                {/* Background Food Photography */}
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🍬
                  </div>
                )}

                {/* Dark Gradient Overlay for Crisp Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent group-hover:from-black/95 transition-colors duration-300" />

                {/* Bottom Label & Item Count */}
                <div className="relative z-10 p-4 sm:p-5 text-center space-y-1">
                  <h4 className="font-[family-name:var(--font-display)] text-base sm:text-lg lg:text-xl font-bold text-white group-hover:text-[#f5c518] transition-colors tracking-wide">
                    {item.name}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                    {item.countLabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
