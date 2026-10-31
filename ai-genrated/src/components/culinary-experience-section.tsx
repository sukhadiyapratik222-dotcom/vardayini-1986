"use client";

import React from "react";

interface CulinaryPillar {
  id: string;
  title: string;
  description: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

// 1. Quality Assurance - Certified Ribbon Badge with Checkmark
function QualityBadgeIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Outer serrated rosette / medallion */}
      <path
        d="M12 2l2.3 2.1 3-.7 1.3 2.7 2.9 1-.2 3.1 2.1 2.3-1.6 2.6.9 3-2.7 1.4-.6 3-3-.4-1.9 2.4-2.5-1.8-2.5 1.8-1.9-2.4-3 .4-.6-3-2.7-1.4.9-3-1.6-2.6 2.1-2.3-.2-3.1 2.9-1 1.3-2.7 3 .7z"
        fill="currentColor"
        fillOpacity={0.15}
        stroke="currentColor"
      />
      {/* Central Verified Checkmark */}
      <path
        d="m9 12 2 2 4-4"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 2. Purity In Every Bite - Traditional Thali with Stacked Sweets / Ladoos
function PurityBiteIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Traditional Thali / Plate Base */}
      <ellipse cx="12" cy="18.5" rx="8.5" ry="2.2" strokeWidth={2} />
      <path d="M4 18.5v1c0 1 3.5 1.8 8 1.8s8-.8 8-1.8v-1" strokeWidth={1.5} />
      {/* Bottom row of 3 ladoos / pedas */}
      <circle cx="7.5" cy="15" r="2.2" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={1.8} />
      <circle cx="12" cy="15" r="2.2" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={1.8} />
      <circle cx="16.5" cy="15" r="2.2" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={1.8} />
      {/* Second row of 2 ladoos */}
      <circle cx="9.8" cy="11.5" r="2.1" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth={1.8} />
      <circle cx="14.2" cy="11.5" r="2.1" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth={1.8} />
      {/* Crown top ladoo with saffron kesh garnish */}
      <circle cx="12" cy="7.8" r="2.1" fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={1.8} />
      <path d="M12 5.5v1.2" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// 3. Crafting Authenticity - Chef Toque Hat with Crossed Cooking Spatulas
function CraftingChefIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Chef Toque Plumes */}
      <path
        d="M6 14.5c-.8 0-1.5-.7-1.5-1.5 0-1.2.9-2.2 2-2.3 0-.1 0-.3 0-.4 0-1.7 1.3-3.1 3-3.3.4-1.7 2-3 3.8-3 1.9 0 3.5 1.3 3.9 3 .9.2 1.8 1.5 1.8 3.3 1.1.1 2 1.1 2 2.3 0 .8-.7 1.5-1.5 1.5H6z"
        fill="currentColor"
        fillOpacity={0.2}
        strokeWidth={1.8}
      />
      {/* Chef Hat Band */}
      <rect x="6" y="14.5" width="12" height="2.2" rx="0.5" strokeWidth={1.8} />
      {/* Crossed Spatulas / Spoons underneath */}
      <path d="m7 21 3.5-3.5" strokeWidth={2} />
      <path d="m17 21-3.5-3.5" strokeWidth={2} />
      <circle cx="6.5" cy="21.5" r="0.8" fill="currentColor" />
      <circle cx="17.5" cy="21.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

// 4. Excellence - Hygiene & Quality Certified Medallion
function ExcellenceSealIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Outer Lotus Floral Petals Ring */}
      <circle cx="12" cy="12" r="8.5" strokeDasharray="3 1.8" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="6.2" fill="currentColor" fillOpacity={0.15} strokeWidth={1.6} />
      {/* Central Verified Shield Checkmark */}
      <path
        d="m9.5 12 1.8 1.8 3.5-3.6"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Micro-stars / accents */}
      <circle cx="12" cy="2.5" r="0.8" fill="currentColor" />
      <circle cx="12" cy="21.5" r="0.8" fill="currentColor" />
      <circle cx="2.5" cy="12" r="0.8" fill="currentColor" />
      <circle cx="21.5" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

// Decorative Golden Lotus / Floral Flourish motif flanking the title
function FloralOrnament({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Central petal */}
      <path d="M16 4c-1.5 4-3 7-3 10 0 3 1.3 5 3 6 1.7-1 3-3 3-6 0-3-1.5-6-3-10z" opacity="0.95" />
      {/* Left petals */}
      <path d="M14.5 15c-3-2.5-6.5-4-9-4 1.5 3 3.5 5.5 6.5 6.5 1.5.5 2.5 0 2.5-2.5z" opacity="0.8" />
      <path d="M15 18c-3.5 0-7 1.5-9 3.5 3 1 6.5.5 9-1.5v-2z" opacity="0.7" />
      {/* Right petals */}
      <path d="M17.5 15c3-2.5 6.5-4 9-4-1.5 3-3.5 5.5-6.5 6.5-1.5.5-2.5 0-2.5-2.5z" opacity="0.8" />
      <path d="M17 18c3.5 0 7 1.5 9 3.5-3 1-6.5.5-9-1.5v-2z" opacity="0.7" />
      {/* Base flourish pod */}
      <circle cx="16" cy="23" r="1.5" />
      <circle cx="12" cy="24" r="1" opacity="0.6" />
      <circle cx="20" cy="24" r="1" opacity="0.6" />
    </svg>
  );
}

const CULINARY_PILLARS: CulinaryPillar[] = [
  {
    id: "quality-assurance",
    title: "Quality Assurance",
    description: "Certified, sourced ingredients, unparalleled authenticity.",
    icon: QualityBadgeIcon,
  },
  {
    id: "purity-in-every-bite",
    title: "Purity In Every Bite",
    description: "All products are free of artificial flavours or added preservatives.",
    icon: PurityBiteIcon,
  },
  {
    id: "crafting-authenticity",
    title: "Crafting Authenticity",
    description: "Dedicated to our customers, maintaining our high standards for product excellence",
    icon: CraftingChefIcon,
  },
  {
    id: "excellence",
    title: "Excellence",
    description: "We adhere to global hygiene standards.",
    icon: ExcellenceSealIcon,
  },
];

export function CulinaryExperienceSection() {
  return (
    <section
      aria-labelledby="culinary-experience-title"
      className="relative w-full py-10 sm:py-14 md:py-16 bg-gradient-to-b from-[#fdfbf7]/80 via-white to-[#fdfbf7]/80 border-y border-[#dfb755]/20 overflow-hidden"
    >
      {/* Subtle traditional ambient background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#dfb755]/5 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-[#a31d31]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Section Header with Golden Floral Motifs */}
        <div className="text-center max-w-3xl mx-auto space-y-1.5 sm:space-y-3">
          <div className="inline-flex items-center justify-center gap-1.5 sm:gap-4 flex-wrap">
            <span className="text-[#b89130] transform scale-80 sm:scale-100 transition-transform duration-300">
              <FloralOrnament className="w-4 h-4 sm:w-7 sm:h-7" />
            </span>

            <h2
              id="culinary-experience-title"
              className="font-[family-name:var(--font-display)] text-xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-[#182230] leading-tight"
            >
              Elevating The Culinary Experience
            </h2>

            <span className="text-[#b89130] transform scale-80 sm:scale-100 rotate-180 transition-transform duration-300">
              <FloralOrnament className="w-4 h-4 sm:w-7 sm:h-7" />
            </span>
          </div>

          <p className="text-[11px] sm:text-sm md:text-base text-[#5e6d82] tracking-wide font-normal max-w-xl mx-auto leading-relaxed">
            By exquisite sourcing, impeccable craftsmanship
          </p>

          {/* Decorative Delicate Golden Centerline */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 pt-0.5 sm:pt-1">
            <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent via-[#dfb755] to-transparent" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#b89130]" />
            <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent via-[#dfb755] to-transparent" />
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 pt-6 sm:pt-12">
          {CULINARY_PILLARS.map((pillar, index) => {
            const IconComponent = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="group relative flex flex-col items-center text-center p-4 sm:p-6 rounded-2xl bg-white/70 hover:bg-white border border-[#dfb755]/15 hover:border-[#dfb755]/50 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1.5"
              >
                {/* Traditional Circular Icon with Royal Red Background & Golden Accent Ring */}
                <div className="relative mb-4 sm:mb-5">
                  <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#a31d31] text-white shadow-md shadow-[#a31d31]/25 ring-4 ring-[#dfb755]/25 group-hover:ring-[#dfb755]/60 group-hover:scale-105 transition-all duration-300">
                    <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  {/* Subtle numbered badge on hover */}
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#dfb755] text-[10px] font-bold text-slate-900 shadow-sm opacity-90">
                    {index + 1}
                  </span>
                </div>

                {/* Pillar Title */}
                <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[#182230] group-hover:text-[#0b2f8a] transition-colors leading-snug mb-2">
                  {pillar.title}
                </h3>

                {/* Pillar Description */}
                <p className="text-xs sm:text-sm text-[#5e6d82] leading-relaxed max-w-[240px] mx-auto">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
