"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavigation,
  CarouselIndicator,
} from "@/components/core/carousel";

export interface FestiveHighlightItem {
  id: string;
  festivalId: string;
  festivalName: string;
  gujarati: string;
  name: string;
  badge: string;
  price: number;
  image: string;
  tags: string;
  slug: string;
}

export const ALL_FESTIVE_PRODUCTS: FestiveHighlightItem[] = [
  // 1. DIWALI
  {
    id: "diwali-hamper",
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujarati: "શાહી દિવાળી ગિફ્ટ હેમ્પર",
    name: "Shahi Diwali Royal Sweets Hamper",
    badge: "Most Loved 🪔",
    price: 1450,
    image: "/images/hamper.jpg",
    tags: "Kaju Katli, Anjeer Roll & Peda",
    slug: "shahi-diwali-royal-sweets-hamper",
  },
  {
    id: "silver-leaf-kaju-katli",
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujarati: "સિલ્વર કાજુ કતરી બોક્સ",
    name: "Silver Leaf Kaju Katli Festive Box",
    badge: "Traditional Purity 🥈",
    price: 950,
    image: "/images/kaju-katli-showcase.jpg",
    tags: "100% Cashews with 99.9% Silver Foil",
    slug: "silver-leaf-kaju-katli-festive-box",
  },
  {
    id: "heritage-mohanthal-ghari",
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujarati: "શુદ્ધ ઘી મોહનથાળ & ઘારી",
    name: "Heritage Mohanthal & Surat Ghari Box",
    badge: "Gujarati Authentic 👑",
    price: 880,
    image: "/images/mithai-platter-showcase.jpg",
    tags: "Gir Cow Ghee Mohanthal & Mawa Ghari",
    slug: "heritage-mohanthal-surat-ghari-box",
  },

  // 2. NAVRATRI & DUSSEHRA
  {
    id: "dussehra-jalebi",
    festivalId: "dussehra",
    festivalName: "Navratri & Dussehra",
    gujarati: "દશેરા સ્પેશ્યલ જલેબી-ફાફડા",
    name: "Golden Kesar Jalebi & Papdi Fafda",
    badge: "Dussehra Morning 💃",
    price: 650,
    image: "/images/jalebi.jpg",
    tags: "Pure Ghee Jalebi with Sambharo",
    slug: "golden-kesar-jalebi-papdi-fafda-combo",
  },
  {
    id: "navratri-farali",
    festivalId: "dussehra",
    festivalName: "Navratri Special",
    gujarati: "નવરાત્રી ફરાળી સ્વીટ્સ બોક્સ",
    name: "Navratri Farali Upvas Sweet Platter",
    badge: "Fasting Pure 🙏",
    price: 720,
    image: "/images/gujarati-mithai-showcase.jpg",
    tags: "100% Upvas Friendly Rajgara & Cow Ghee",
    slug: "navratri-farali-upvas-sweet-platter",
  },

  // 3. RAKSHA BANDHAN
  {
    id: "rakhi-box",
    festivalId: "rakhi",
    festivalName: "Raksha Bandhan",
    gujarati: "રક્ષાબંધન સ્પેશ્યલ બોક્સ",
    name: "Rakhi Prem Box + Designer Rakhi",
    badge: "Free Rakhi 🧵",
    price: 850,
    image: "/images/motichoor-showcase.jpg",
    tags: "Motichoor, Kaju Katli & Designer Rakhi",
    slug: "rakhi-prem-sweets-box-with-designer-rakhi",
  },
  {
    id: "sugar-free-anjeer",
    festivalId: "rakhi",
    festivalName: "Raksha Bandhan",
    gujarati: "ડ્રાયફ્રૂટ્સ અંજીર-ખજૂર રોલ",
    name: "Sugar-Free Anjeer & Dry Fruit Roll",
    badge: "Healthy Gifting 🍯",
    price: 1100,
    image: "/images/kaju-katli.jpg",
    tags: "Afghan Figs, Roasted Almonds & Pista",
    slug: "sugar-free-anjeer-dry-fruit-roll",
  },

  // 4. GANESH CHATURTHI
  {
    id: "ganesh-modak",
    festivalId: "ganesh",
    festivalName: "Ganesh Chaturthi",
    gujarati: "૨૧ મોદક પ્રસાદ ભોગ",
    name: "Shuddh Desi Ghee 21-Modak Bhog",
    badge: "Bapa's Bhog 🐘",
    price: 780,
    image: "/images/modak-bhog.jpg",
    tags: "21 Sacred Modaks: Kesar, Kaju & Mawa",
    slug: "shuddh-desi-ghee-modak-bhog-21-pieces",
  },

  // 5. HOLI & DHULETI
  {
    id: "holi-gujiya",
    festivalId: "holi",
    festivalName: "Holi & Dhuleti",
    gujarati: "હોળી સ્પેશ્યલ માવા ગુજિયા & ઠંડાઈ",
    name: "Khoya Dry Fruit Gujiya & Thandai Peda",
    badge: "Holi Celebration 🎨",
    price: 820,
    image: "/images/holi-gujiya.jpg",
    tags: "Crispy Mawa Gujiya & Saffron Thandai",
    slug: "khoya-dry-fruit-gujiya-thandai-peda",
  },

  // 6. MAKAR SANKRANTI / UTTARAYAN
  {
    id: "uttarayan-chikki",
    festivalId: "uttarayan",
    festivalName: "Makar Sankranti",
    gujarati: "ઉત્તરાયણ સ્પેશ્યલ ચીકી & તલ લાડુ",
    name: "Uttarayan Royal Chikki & Tal Ladoo",
    badge: "Kite Festival 🪁",
    price: 580,
    image: "/images/uttarayan-chikki.jpg",
    tags: "Til Chikki, Sing Chikki & Tal Ladoo",
    slug: "uttarayan-royal-chikki-tal-ladoo-hamper",
  },
];

const FESTIVAL_FILTER_TABS = [
  { id: "all", label: "All Festivals", icon: "✨" },
  { id: "diwali", label: "Diwali Special", icon: "🪔" },
  { id: "dussehra", label: "Navratri & Dussehra", icon: "💃" },
  { id: "rakhi", label: "Raksha Bandhan", icon: "🧵" },
  { id: "ganesh", label: "Ganesh Chaturthi", icon: "🐘" },
  { id: "holi", label: "Holi & Dhuleti", icon: "🎨" },
  { id: "uttarayan", label: "Makar Sankranti", icon: "🪁" },
];

export function FestiveSeasonHomeSection() {
  const [items, setItems] = useState<FestiveHighlightItem[]>(ALL_FESTIVE_PRODUCTS);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");

  useEffect(() => {
    fetch("/api/festivals")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.items) && data.items.length > 0) {
          const mapped: FestiveHighlightItem[] = data.items.map((it: any) => ({
            id: String(it.dbVariantId || it.legacyId || it.slug),
            festivalId: it.festivalId || "diwali",
            festivalName: it.festivalName || "Festival Special",
            gujarati: it.gujaratiName || it.name,
            name: it.name,
            badge: it.badge || "Special 🪔",
            price: Number(it.price) || 999,
            image: it.imageUrl || "/images/hamper.jpg",
            tags: Array.isArray(it.tags) ? it.tags.slice(0, 3).join(", ") : it.description || "",
            slug: it.slug || "shahi-diwali-royal-sweets-hamper",
          }));
          setItems(mapped);
        }
      })
      .catch(() => {
        // Fallback to static list
      });
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedFestival === "all") return items;
    return items.filter((it) => it.festivalId === selectedFestival);
  }, [items, selectedFestival]);

  return (
    <section className="relative overflow-hidden py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Festive Container with Royal Gold & Navy Accents */}
        <div className="relative rounded-[1.75rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[#0b1b4f] via-[#0b2468] to-[#071330] p-4 sm:p-8 md:p-10 text-white shadow-2xl overflow-hidden border border-[#dfb755]/30">
          {/* Diwali Background Photo - ONLY shown in Diwali section */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out z-0 ${
              selectedFestival === "diwali" ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src="/images/diwali-bg.jpg"
              alt="Diwali Mithai & Diyas Celebration"
              fill
              className="object-cover object-center scale-105 filter saturate-110 brightness-100"
            />
            {/* Soft dark royal gradient overlay so the photo is brightly visible while text & products remain clear */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1b4f]/45 via-black/30 to-[#071330]/60" />
          </div>

          {/* Subtle Traditional Diya Pattern Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-[#dfb755]/15 blur-3xl pointer-events-none z-1" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-72 w-72 rounded-full bg-[#0b2f8a]/40 blur-3xl pointer-events-none z-1" />

          {/* Section Header */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex max-w-full flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 text-[#dfb755] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <span>🪔 શુભ તહેવાર • FESTIVE SPECIALS</span>
              </div>

              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight break-words">
                Celebrate Indian Festivals with{" "}
                <span className="text-[#dfb755] italic">Shuddh Mithai</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                Diwali gift hampers, Dussehra Jalebi-Fafda, Rakhi sweets boxes, and Ganesh Chaturthi 21-modak prasad handcrafted with 100% pure desi ghee.
              </p>
            </div>

            {/* View All & Coupon Badge */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200 text-center sm:text-left shadow-sm">
                <span>Festive Code: </span>
                <span className="font-bold text-[#dfb755] font-mono">FESTIVE15</span>
                <span className="text-[10px] text-slate-300 block">Flat 15% OFF on ₹999+</span>
              </div>

              <Link
                href="/festivals"
                className="px-6 py-3 rounded-full text-xs font-bold bg-[#dfb755] hover:bg-[#cf9e32] text-slate-950 transition-all shadow-md hover:scale-105 active:scale-95 duration-200 flex items-center justify-center gap-2 text-center"
              >
                <span>Explore All Festivals 🪔</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Festival Category Filter Pills & Auto-Scrolling Status Bar */}
          <div className="relative z-10 pt-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Festival Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full">
                {FESTIVAL_FILTER_TABS.map((tab) => {
                  const isActive = selectedFestival === tab.id;
                  const count =
                    tab.id === "all"
                      ? items.length
                      : items.filter((it) => it.festivalId === tab.id).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedFestival(tab.id)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-[#dfb755] text-slate-950 shadow-md scale-102"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive
                            ? "bg-slate-950/20 text-slate-950"
                            : "bg-white/15 text-slate-300"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Auto Scrolling Live Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto Scrolling
                </span>
                <span className="text-[11px] text-slate-300 hidden md:inline">
                  • {filteredItems.length} Festival Specials
                </span>
              </div>
            </div>
          </div>

          {/* Auto-Scrolling Interactive Products Carousel */}
          <div className="relative z-10 pt-5 pb-8 px-2 sm:px-5">
            <Carousel
              key={selectedFestival}
              autoplay={true}
              autoplayInterval={3500}
              pauseOnHover={true}
              loop={true}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4 py-3 sm:py-4">
                {filteredItems.map((item) => (
                  <CarouselItem
                    key={item.id}
                    className="pl-3 sm:pl-4 basis-[88%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                  >
                    <div className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 overflow-hidden transition-all duration-300 hover:bg-white/15 hover:-translate-y-1 hover:border-[#dfb755]/50 flex flex-col justify-between h-full shadow-lg">
                      <div>
                        {/* Photo with Festival Badge & Tag */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900/60">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 50vw, 300px"
                          />
                          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                            <span className="bg-[#0b1b4f]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                              {item.festivalName}
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
                          <p className="text-[10px] font-bold text-[#dfb755] tracking-wide uppercase line-clamp-1">
                            {item.gujarati}
                          </p>
                          <h3
                            className="font-[family-name:var(--font-display)] text-base font-bold text-white group-hover:text-[#f5df9e] transition leading-snug line-clamp-1"
                            title={item.name}
                          >
                            {item.name}
                          </h3>
                          <p className="text-[11px] text-slate-300 line-clamp-1 font-light leading-relaxed">
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
                          href={`/shop/${item.slug}`}
                          className="px-4 py-2 rounded-full text-xs font-bold bg-white text-[#0b2f8a] hover:bg-[#dfb755] hover:text-slate-950 transition shadow-sm"
                        >
                          View Box →
                        </Link>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Navigation Arrows with Frosted Glass Styling */}
              <CarouselNavigation
                alwaysShow={true}
                classNameButton="bg-white/90 hover:bg-[#dfb755] text-slate-900 border border-white/20 shadow-lg hover:scale-105 active:scale-95 transition-all"
              />

              {/* Slide Indicators */}
              <div className="pt-2">
                <CarouselIndicator className="-bottom-3" classNameButton="bg-[#dfb755]" />
              </div>
            </Carousel>
          </div>

          {/* Quick Festival Season Bar with Badges */}
          <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">All Festivals:</span>
              <button
                type="button"
                onClick={() => setSelectedFestival("diwali")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white font-medium transition cursor-pointer"
              >
                🪔 Diwali
              </button>
              <button
                type="button"
                onClick={() => setSelectedFestival("dussehra")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white font-medium transition cursor-pointer"
              >
                💃 Navratri &amp; Dussehra
              </button>
              <button
                type="button"
                onClick={() => setSelectedFestival("rakhi")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white font-medium transition cursor-pointer"
              >
                🧵 Raksha Bandhan
              </button>
              <button
                type="button"
                onClick={() => setSelectedFestival("ganesh")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white font-medium transition cursor-pointer"
              >
                🐘 Ganesh Utsav
              </button>
              <button
                type="button"
                onClick={() => setSelectedFestival("holi")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white font-medium transition cursor-pointer"
              >
                🎨 Holi
              </button>
              <button
                type="button"
                onClick={() => setSelectedFestival("uttarayan")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white font-medium transition cursor-pointer"
              >
                🪁 Uttarayan
              </button>
            </div>

            <Link
              href="/festivals"
              className="text-[#dfb755] hover:underline font-bold text-xs flex items-center gap-1"
            >
              <span>See Full Festival Catalog</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
