import Image from "next/image";
import Link from "next/link";
import { GlassyHeroShowcase } from "@/components/glassy-hero-showcase";

export const metadata = {
  title: "UI Design Photos & Preview | Vardayini Sweet Mart",
  description: "Visual UI design preview of homepage hero banners, typography, and photography.",
};

export default function DesignPreviewPage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-white pb-24">
      {/* Page Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#dfb755]/15 text-[#dfb755] border border-[#dfb755]/30">
              UI Design Showcase & Visual Preview
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 text-white font-[family-name:var(--font-display)]">
              Vardayini Homepage Hero UI Design
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#dfb755] hover:bg-[#edd085] text-slate-950 transition shadow"
            >
              View First Page (Live Homepage) →
            </Link>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0b2f8a] hover:bg-[#1946b8] text-white transition border border-white/10 shadow"
            >
              Admin Server (Port 3001) ↗
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-16">
        {/* Section 1: The Requested Heritage Banner Design */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">Design Photo 1</span>
              <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
                Heritage Karigar Craftsmanship Banner (Your Reference Photo)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              3-Pane Triptych: Saffron Desi Ghee Pour • Live Simmering Jalebis • Silver Vark Kaju Katli
            </p>
          </div>

          {/* Full Banner Visual Preview */}
          <div className="rounded-3xl overflow-hidden border border-[#dfb755]/30 shadow-2xl bg-black relative group">
            <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full min-h-[280px]">
              <Image
                src="/images/heritage-hero-banner.png"
                alt="Tradition Preserved Since 1976 - Pure Desi Ghee, Zero Compromise"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1.5">
              <span className="text-xl">🪔</span>
              <h3 className="text-sm font-semibold text-white">100% Shuddh Desi Ghee</h3>
              <p className="text-xs text-slate-400">
                Left pane highlights the traditional iron kadhai and pure golden cow ghee simmered to golden perfection.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1.5">
              <span className="text-xl">🥨</span>
              <h3 className="text-sm font-semibold text-white">Live Karigar Jalebis</h3>
              <p className="text-xs text-slate-400">
                Middle pane showcases master halwai piping fresh circular crispy golden jalebis in hot aromatic ghee.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1.5">
              <span className="text-xl">✨</span>
              <h3 className="text-sm font-semibold text-white">Pure Silver Foil Kaju Katli</h3>
              <p className="text-xs text-slate-400">
                Right pane shows delicate silver leaf being smoothed onto diamond-cut cashew sweets on a royal brass thali.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Live Replica of the Requested Design */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">Design Photo 2</span>
            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
              Interactive Web Component (Live Clickable Buttons & Crest)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Fully interactive replica with live links, responsive text scaling, and smooth hover dynamics:
            </p>
          </div>

          {/* Interactive Component Frame */}
          <div className="rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative bg-[#071330]">
            {/* Top Gujarati Royal Blue Bar */}
            <div className="bg-[#0b1b4f] border-b border-[#dfb755]/40 py-2 px-4 flex items-center justify-center relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-4 pointer-events-none">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#dfb755]/50 to-transparent" />
              </div>
              <div className="relative z-10 px-6 py-1 rounded-xl bg-[#0b2468] border border-[#dfb755]/60 text-center shadow-lg">
                <p className="text-sm font-bold tracking-wider text-[#f5df9e] font-[family-name:var(--font-display)]">
                  સ્વીટ માર્ટ
                </p>
                <p className="text-[9px] uppercase tracking-widest text-[#dfb755]/80 font-semibold">
                  Since 1976
                </p>
              </div>
            </div>

            {/* Banner Media with Centered Typography & Action Buttons */}
            <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full min-h-[320px] flex items-center justify-center text-center px-4 overflow-hidden">
              <Image
                src="/images/heritage-hero-banner.png"
                alt="Heritage Craftsmanship"
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/50" />

              <div className="relative z-10 max-w-3xl mx-auto space-y-5 py-6">
                <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-tight drop-shadow-md">
                  Tradition Preserved Since 1976 —
                  <br />
                  <span className="italic">Pure Desi Ghee, Zero Compromise</span>
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <Link
                    href="/shop"
                    className="px-7 py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#e5b84c] hover:bg-[#f3cb69] text-slate-950 transition shadow-lg hover:scale-105 active:scale-95 duration-200"
                  >
                    Explore Heritage Menu
                  </Link>
                  <Link
                    href="/shop?category=gift-hampers"
                    className="px-7 py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#d8a838] hover:bg-[#eec157] text-slate-950 transition shadow-lg hover:scale-105 active:scale-95 duration-200"
                  >
                    Gift Hampers
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Clean Scrolling Photos Showcase (Label-Free) */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">Design Photo 3</span>
            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
              Clean Scrolling Photos Gallery (No Obstructing Labels)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Your requested clean photo showcase with smooth horizontal drag/swipe, frosted glass chevrons, and interactive jump thumbnails:
            </p>
          </div>

          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/50 border border-white/10 flex justify-center">
            <GlassyHeroShowcase />
          </div>
        </section>

        {/* Section 4: Individual Product Photography High-Res Assets */}
        <section className="space-y-6">
          <div>
            <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">Design Photo 4</span>
            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
              Individual Handcrafted Sweets & Farsan Photography
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              High-resolution studio photography used across your customer storefront:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Photo 1: Kaju Katli */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 group">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                <Image
                  src="/images/kaju-katli-showcase.jpg"
                  alt="Kaju Katli"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfb755]">Mithai</span>
                <h3 className="text-base font-semibold text-white">Kaju Katli</h3>
                <p className="text-xs text-slate-400">Pure cashew diamond confection with genuine silver leaf.</p>
              </div>
            </div>

            {/* Photo 2: Motichoor Ladoo */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 group">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                <Image
                  src="/images/motichoor-showcase.jpg"
                  alt="Motichoor Ladoo"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfb755]">Mithai</span>
                <h3 className="text-base font-semibold text-white">Motichoor Ladoo</h3>
                <p className="text-xs text-slate-400">Melt-in-mouth micro gram pearls infused with saffron & pure cow ghee.</p>
              </div>
            </div>

            {/* Photo 3: Nylon Khaman */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 group">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                <Image
                  src="/images/khaman-showcase.jpg"
                  alt="Nylon Khaman Dhokla"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfb755]">Live Farsan</span>
                <h3 className="text-base font-semibold text-white">Nylon Khaman Dhokla</h3>
                <p className="text-xs text-slate-400">Morning steamed, ultra-soft sponge with mustard seed & green chilli vaghar.</p>
              </div>
            </div>

            {/* Photo 4: Surati Khandvi */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 group">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                <Image
                  src="/images/khandvi-showcase.jpg"
                  alt="Surati Khandvi"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfb755]">Live Farsan</span>
                <h3 className="text-base font-semibold text-white">Surati Khandvi</h3>
                <p className="text-xs text-slate-400">Silk gram flour rolls garnished with fresh coconut & coriander.</p>
              </div>
            </div>

            {/* Photo 5: Shahi Platter */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 group">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                <Image
                  src="/images/mithai-platter-showcase.jpg"
                  alt="Shahi Festive Platter"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfb755]">Festive</span>
                <h3 className="text-base font-semibold text-white">Shahi Festive Platter</h3>
                <p className="text-xs text-slate-400">Handpicked celebration assortment for Diwali, weddings, and gifts.</p>
              </div>
            </div>

            {/* Photo 6: Wide Mithai Row */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 group">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                <Image
                  src="/images/mithai-row-banner.png"
                  alt="Traditional Assorted Mithai Row"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfb755]">Collection</span>
                <h3 className="text-base font-semibold text-white">Traditional Mithai Panorama</h3>
                <p className="text-xs text-slate-400">Authentic sweet counter array showcasing heritage recipes since 1976.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Newly Implemented Footer Menu Structure */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-bold text-[#dfb755] tracking-widest uppercase">Design Photo 5</span>
            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
              Footer Menu Structure (Sweets • Namkeen • Bakery • Policies)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Spacious 4-column menu layout with gold accent underlines, integrated seamlessly with your Vadodara brand and store locations:
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-[#071c54] p-6 sm:p-10 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Sweets */}
              <div>
                <h3 className="font-bold text-lg text-white">Sweets</h3>
                <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  {["Kaju Sweets", "Mawa Sweets", "Penda", "Sugarless Sweets", "Premium Packed Sweets", "Indian Ghee Sweets"].map((item) => (
                    <li key={item} className="hover:text-white transition">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Namkeen */}
              <div>
                <h3 className="font-bold text-lg text-white">Namkeen</h3>
                <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  {["Millet", "Farali", "Gujarati", "Khakhra", "Roasted", "Mixture", "Indian", "Daal/Lentil", "Sev", "Chips and Puris"].map((item) => (
                    <li key={item} className="hover:text-white transition">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bakery */}
              <div>
                <h3 className="font-bold text-lg text-white">Bakery</h3>
                <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  {["Biscuits and Cookies", "Toast and Khari"].map((item) => (
                    <li key={item} className="hover:text-white transition">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Policies */}
              <div>
                <h3 className="font-bold text-lg text-white">Policies</h3>
                <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  {["Terms & Conditions", "Privacy Policy", "Cancellation Policy", "Returns Policy", "Refund Policy"].map((item) => (
                    <li key={item} className="hover:text-white transition">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
