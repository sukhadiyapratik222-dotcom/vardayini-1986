"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart-button";

interface FestiveProduct {
  id: number;
  festivalId: string;
  festivalName: string;
  gujaratiName: string;
  name: string;
  badge: string;
  description: string;
  imageUrl: string;
  price: number;
  comparePrice: number;
  weight: string;
  tags: string[];
}

const FESTIVALS = [
  { id: "all", label: "All Festivals", icon: "✨", gujarati: "તમામ તહેવારો" },
  { id: "diwali", label: "Diwali & New Year", icon: "🪔", gujarati: "દિવાળી & બેસતું વર્ષ" },
  { id: "uttarayan", label: "Makar Sankranti", icon: "🪁", gujarati: "ઉત્તરાયણ સ્પેશ્યલ" },
  { id: "holi", label: "Holi & Dhuleti", icon: "🎨", gujarati: "હોળી ધુળેટી" },
  { id: "rakhi", label: "Raksha Bandhan", icon: "🧵", gujarati: "રક્ષાબંધન" },
  { id: "dussehra", label: "Navratri & Dussehra", icon: "💃", gujarati: "નવરાત્રી & દશેરા" },
  { id: "ganesh", label: "Ganesh Chaturthi", icon: "🐘", gujarati: "ગણેશોત્સવ" },
];

const FESTIVE_PRODUCTS: FestiveProduct[] = [
  // DIWALI
  {
    id: 901,
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujaratiName: "શાહી દિવાળી ગિફ્ટ હેમ્પર",
    name: "Shahi Diwali Royal Sweets Hamper",
    badge: "Bestseller Hamper",
    description: "Ornate royal festive box filled with premium Kaju Katli, Kesar Peda, Anjeer Roll, and Dry Fruit Bites.",
    imageUrl: "/images/hamper.jpg",
    price: 1450,
    comparePrice: 1750,
    weight: "1 kg",
    tags: ["Diwali", "Gift Box", "Pure Ghee"],
  },
  {
    id: 902,
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujaratiName: "સિલ્વર કાજુ કતરી બોક્સ",
    name: "Silver Leaf Kaju Katli Festive Box",
    badge: "Traditional Purity",
    description: "Authentic diamond-cut cashew fudge made with 100% Goan cashews and 99.9% pure silver foil (chandi vark).",
    imageUrl: "/images/kaju-katli-showcase.jpg",
    price: 950,
    comparePrice: 1100,
    weight: "500g / 1kg",
    tags: ["Diwali", "Silver Vark", "Cashew"],
  },
  {
    id: 903,
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujaratiName: "શુદ્ધ ઘી મોહનથાળ & ઘારી",
    name: "Heritage Mohanthal & Surat Ghari Box",
    badge: "Gujarati Authentic",
    description: "Slow-roasted gram flour mohanthal in Gir cow ghee with pistachios, paired with Surati mawa ghari.",
    imageUrl: "/images/mithai-platter-showcase.jpg",
    price: 880,
    comparePrice: 990,
    weight: "800g",
    tags: ["Diwali", "Desi Ghee", "Gujarati Heritage"],
  },

  // DUSSEHRA & NAVRATRI
  {
    id: 904,
    festivalId: "dussehra",
    festivalName: "Dussehra & Navratri",
    gujaratiName: "દશેરા સ્પેશ્યલ જલેબી-ફાફડા",
    name: "Golden Kesar Jalebi & Papdi Fafda Combo",
    badge: "Dussehra Tradition",
    description: "Crispy freshly fried saffron-infused jalebi with hot crunchy fafda, raw papaya sambharo, and green kadhi.",
    imageUrl: "/images/jalebi.jpg",
    price: 650,
    comparePrice: 750,
    weight: "500g Jalebi + 250g Fafda",
    tags: ["Dussehra", "Morning Live", "Kesar Jalebi"],
  },
  {
    id: 905,
    festivalId: "dussehra",
    festivalName: "Navratri Special",
    gujaratiName: "નવરાત્રી ફરાળી સ્વીટ્સ બોક્સ",
    name: "Navratri Farali Upvas Sweet Platter",
    badge: "Fasting Pure",
    description: "100% Upvas-friendly farali mithai made with Rajgara flour, roasted makhana, dates, and pure cow ghee.",
    imageUrl: "/images/gujarati-mithai-showcase.jpg",
    price: 720,
    comparePrice: 850,
    weight: "600g",
    tags: ["Navratri", "Farali", "Upvas Special"],
  },

  // RAKSHA BANDHAN
  {
    id: 906,
    festivalId: "rakhi",
    festivalName: "Raksha Bandhan",
    gujaratiName: "રક્ષાબંધન સ્પેશ્યલ ભાઈ-બહેન બોક્સ",
    name: "Rakhi Prem Sweets Box with Designer Rakhi",
    badge: "Sister's Choice",
    description: "Handcrafted Motichoor Ladoo, Kaju Katli, and Roli-Chawal paired with an eco-friendly designer rakhi.",
    imageUrl: "/images/motichoor-showcase.jpg",
    price: 850,
    comparePrice: 990,
    weight: "750g",
    tags: ["Rakhi", "Motichoor", "Free Rakhi"],
  },
  {
    id: 907,
    festivalId: "rakhi",
    festivalName: "Raksha Bandhan",
    gujaratiName: "ડ્રાયફ્રૂટ્સ અંજીર-ખજૂર રોલ",
    name: "Sugar-Free Anjeer & Dry Fruit Roll",
    badge: "Healthy Gifting",
    description: "Naturally sweetened with premium Afghan figs, dates, almonds, and pistachios. No refined sugar.",
    imageUrl: "/images/kaju-katli.jpg",
    price: 1100,
    comparePrice: 1250,
    weight: "500g",
    tags: ["Rakhi", "Sugar Free", "Dry Fruits"],
  },

  // GANESH CHATURTHI
  {
    id: 908,
    festivalId: "ganesh",
    festivalName: "Ganesh Chaturthi",
    gujaratiName: "શુદ્ધ ઘી મોદક પ્રસાદ બોક્સ",
    name: "Shuddh Desi Ghee Modak Bhog (21 Pieces)",
    badge: "Bapano Bhog",
    description: "Sacred 21-modak assortment: Kesar Mawa Modak, Kaju Modak, Coconut Jaggery Modak, and Malai Peda Modak.",
    imageUrl: "/images/peda.jpg",
    price: 780,
    comparePrice: 890,
    weight: "21 Pcs (800g)",
    tags: ["Ganesh Utsav", "21 Modak", "Prasad"],
  },

  // HOLI & DHULETI
  {
    id: 909,
    festivalId: "holi",
    festivalName: "Holi & Dhuleti",
    gujaratiName: "હોળી સ્પેશ્યલ માવા ગુજિયા & ઠંડાઈ પેંડા",
    name: "Khoya Dry Fruit Gujiya & Thandai Peda",
    badge: "Holi Celebration",
    description: "Crispy ghee-fried gujiya stuffed with mawa, cardamom, and roasted nuts, accompanied by saffron thandai peda.",
    imageUrl: "/images/rasmalai.jpg",
    price: 820,
    comparePrice: 950,
    weight: "700g",
    tags: ["Holi", "Gujiya", "Thandai"],
  },

  // MAKAR SANKRANTI (UTTARAYAN)
  {
    id: 910,
    festivalId: "uttarayan",
    festivalName: "Makar Sankranti",
    gujaratiName: "ઉત્તરાયણ સ્પેશ્યલ તલ-સીંગ ચીકી હેમ્પર",
    name: "Uttarayan Royal Chikki & Tal Ladoo Hamper",
    badge: "Kite Festival",
    description: "Crunchy Til Chikki, Sing Chikki, Mamra Ladoo, and Organic Jaggery Tal Sankali made in Anand workshop.",
    imageUrl: "/images/namkeen.jpg",
    price: 580,
    comparePrice: 680,
    weight: "1 kg Assortment",
    tags: ["Uttarayan", "Chikki", "Jaggery & Sesame"],
  },
];

export default function FestivalsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWeight, setSelectedWeight] = useState<Record<number, string>>({});

  const filteredProducts = FESTIVE_PRODUCTS.filter((prod) => {
    const matchesTab = activeTab === "all" || prod.festivalId === activeTab;
    const matchesQuery =
      searchQuery.trim() === "" ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.festivalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.gujaratiName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-24">
      {/* 1. ROYAL FESTIVAL HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0b1b4f] via-[#0b2468] to-[#071330] text-white py-16 sm:py-20 shadow-xl">
        {/* Festive Golden Garland / Motif Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#dfb755_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#dfb755]/15 border border-[#dfb755]/40 text-[#dfb755] text-xs font-bold uppercase tracking-widest shadow-sm">
            <span>🪔 શુભ તહેવાર • શુદ્ધ મિઠાઈ</span>
            <span>•</span>
            <span>INDIAN FESTIVAL SPECIALS</span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Indian Festival Sweets &amp;{" "}
            <span className="text-[#dfb755] italic">Royal Hampers</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-200 leading-relaxed font-light">
            Celebrate every auspicious Indian festival with handcrafted pure desi ghee mithai, sacred bhog prasad, and custom gift hampers prepared by master karigars since 1976.
          </p>

          {/* Festive Trust Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-3 text-xs font-semibold text-[#f5df9e]">
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
              <span>🧈</span> 100% Shuddh Desi Ghee
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
              <span>🥈</span> 99.9% Pure Silver Vark
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
              <span>🚚</span> Same-Day Gujarat Dispatch
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
              <span>🎁</span> Custom Corporate Branding
            </span>
          </div>

          {/* Coupon Code Banner */}
          <div className="pt-4 max-w-lg mx-auto">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#dfb755]/20 via-[#dfb755]/30 to-[#dfb755]/20 border border-[#dfb755]/50 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <span>Festive Offer: <strong>Flat 15% OFF</strong> on orders above ₹999</span>
              </div>
              <span className="bg-[#dfb755] text-slate-950 font-bold px-3 py-1 rounded-xl text-[11px] tracking-wider uppercase">
                CODE: FESTIVE15
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FESTIVAL SELECTOR BAR */}
      <section className="sticky top-[68px] z-30 bg-white/95 backdrop-blur-md border-b border-[#0b2f8a]/10 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2 shrink-0">
              {FESTIVALS.map((fest) => {
                const isActive = activeTab === fest.id;
                return (
                  <button
                    key={fest.id}
                    onClick={() => setActiveTab(fest.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20 scale-105"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-[#0b2f8a]"
                    }`}
                  >
                    <span>{fest.icon}</span>
                    <span>{fest.label}</span>
                    <span className="text-[10px] opacity-75 font-normal hidden md:inline">
                      ({fest.gujarati})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="relative shrink-0 hidden sm:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search festival sweets..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-slate-200 focus:border-[#0b2f8a] focus:ring-1 focus:ring-[#0b2f8a] outline-none w-48 transition"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FESTIVE SWEETS SHOWCASE GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a]">
              {FESTIVALS.find((f) => f.id === activeTab)?.label || "All Festival Specials"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredProducts.length} authentic sweets &amp; festive gift hampers
            </p>
          </div>

          <Link
            href="/shop"
            className="text-xs font-bold text-[#0b2f8a] hover:text-[#dfb755] flex items-center gap-1 transition"
          >
            <span>Browse Full Mithai &amp; Farsan Menu</span>
            <span>→</span>
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((prod) => (
            <article
              key={prod.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#0b2f8a]/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
            >
              {/* Product Visual */}
              <div>
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={prod.imageUrl}
                    alt={prod.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Festival Tag */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="bg-[#0b2f8a] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {prod.festivalName}
                    </span>
                    <span className="bg-[#dfb755] text-slate-950 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {prod.badge}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-2">
                  <div className="text-[11px] font-bold text-[#dfb755] uppercase tracking-wider">
                    {prod.gujaratiName}
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#0b2f8a] group-hover:text-[#071c54] transition leading-snug">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>

                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500">
                    <span>⚖️ Pack size: <strong>{prod.weight}</strong></span>
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#0b2f8a]">
                        {formatInr(prod.price)}
                      </span>
                      {prod.comparePrice > prod.price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatInr(prod.comparePrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Tax included · Fresh batch
                    </span>
                  </div>

                  <AddToCartButton
                    variantId={prod.id}
                    label="Add to Festive Box"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* 4. CORPORATE & BULK FESTIVAL GIFTING BANNER */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-[#dfb755]/20 text-[#dfb755] text-xs font-bold uppercase tracking-wider">
              Corporate &amp; Family Bulk Orders
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-white">
              Festive Corporate Hampers with Your Brand Logo
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Custom tin boxes, dry fruit platters, and silver-foiled mithai boxes packed with your company&apos;s custom greeting cards and ribbon branding. Special wholesale discounts for orders above 25 boxes.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://wa.me/919825019760?text=Hello%20Vardayini%20Sweets,%20I%20would%20like%20to%20inquire%20about%20Diwali%20/%20Festival%20Corporate%20Gift%20Hampers"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-full text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white transition shadow-md flex items-center gap-2"
              >
                <span>💬</span>
                <span>WhatsApp Bulk Inquiry</span>
              </a>
              <a
                href="tel:+919825012345"
                className="px-6 py-3 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition"
              >
                Call: +91 98250 12345
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
