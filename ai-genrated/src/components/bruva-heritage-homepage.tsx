"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { formatInr, unitPrice } from "@/lib/money";
import { PincodeDeliveryChecker } from "@/components/pincode-delivery-checker";
import { ProductOptionsModal, ModalProductData } from "@/components/product-options-modal";
import { Magnetic } from "@/components/core/magnetic";
import type { SpecialItemsConfig } from "@/components/home-page-client";
import type { HomepageProductData } from "@/components/warm-cream-homepage";

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface BruvaHeritageHomepageProps {
  categories: CategoryData[];
  featuredProducts: HomepageProductData[];
  bestsellers: HomepageProductData[];
  specialItemsConfig?: SpecialItemsConfig;
  specialProducts?: HomepageProductData[];
  stores?: any[];
  reviews?: any[];
  uiConfig?: any;
  onToggleUiDesign?: () => void;
  currentUiDesign?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CRAFT STEPS DATA (The ancient halwai discipline)
// ─────────────────────────────────────────────────────────────────────────────
const CRAFT_STEPS = [
  {
    step: "01",
    tag: "ધીમી આંચે શેકવું",
    title: "Slow Nut & Flour Roasting",
    description:
      "Hand-selected royal cashews, mamra almonds, and coarse besan roasted gently over a measured flame until a deep amber hue and fragrance emerge.",
    details: "Temperature monitored at 120°C in heavy bottom vessels for uniform caramelization.",
    icon: "🔥",
  },
  {
    step: "02",
    tag: "શુદ્ધ ઘીમાં પકાવવું",
    title: "Copper Kadhai Ghee Simmering",
    description:
      "Simmered patiently in 100% Shuddh Gir Cow and Buffalo Desi Ghee inside heritage copper and brass kadhais to lock in natural moisture and fragrance.",
    details: "Zero hydrogenated oils or dalda. Only unadulterated pure village-churned ghee.",
    icon: "🧈",
  },
  {
    step: "03",
    tag: "હાથથી ઘાટ આપવો",
    title: "Generational Hand-Shaping",
    description:
      "Every single barfi, roll, and penda is shaped by third-generation halwai masters without automated factory stamping.",
    details: "Hand-kneaded while warm for velvety mawa texture and delicate crumb.",
    icon: "✨",
  },
  {
    step: "04",
    tag: "શુદ્ધ ચાંદીનો વરખ",
    title: "Silver Foil & Vacuum Sealing",
    description:
      "Delicately adorned with certified vegetarian 24K silver leaf (Chandi Varakh) and sealed warm in food-grade gold tins for pan-India freshness.",
    details: "Oxygen-barrier packaging guarantees crispness and peak freshness upon arrival.",
    icon: "👑",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. FESTIVE HAMPER SHOWCASE DATA
// ─────────────────────────────────────────────────────────────────────────────
const FESTIVE_HAMPERS = [
  {
    id: "hamper-royal-wooden",
    title: "The Maharani Wooden Chest",
    tag: "LIMITED EDITION",
    weight: "1.2 kg Assorted",
    price: 1850,
    originalPrice: 2200,
    description: "Handcrafted brass-embossed royal chest filled with Kaju Katli, Kesar Penda, Dry Fruit Halwa & Salted Pistachios.",
    image: "/images/festive-hamper.jpg",
  },
  {
    id: "hamper-velvet-gold",
    title: "Kalol Heritage Celebration Box",
    tag: "BESTSELLER",
    weight: "800 g Assorted",
    price: 1250,
    originalPrice: 1450,
    description: "Deep burgundy velvet rigid box with four compartments of our signature desi ghee sweets and spicy farsan.",
    image: "/images/hamper.jpg",
  },
  {
    id: "hamper-brass-thali",
    title: "Royal Brass Shahi Thali",
    tag: "PREMIUM GIFT",
    weight: "1.5 kg Royal Selection",
    price: 2400,
    originalPrice: 2800,
    description: "Traditional embossed brass serving platter packed with silver-foil Kaju rolls, anjeer barfi, and roasted cashews.",
    image: "/images/mithai-platter-showcase.jpg",
  },
];

export function BruvaHeritageHomepage({
  categories,
  featuredProducts,
  bestsellers,
  specialProducts = [],
  stores = [],
  reviews = [],
  uiConfig,
  onToggleUiDesign,
  currentUiDesign = "bruva-heritage",
}: BruvaHeritageHomepageProps) {
  // Modal state
  const [selectedProductForModal, setSelectedProductForModal] =
    useState<ModalProductData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Active Craft Step
  const [activeStep, setActiveStep] = useState(0);

  // Signature Menu active category
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>("all");

  // Festive countdown state
  const [countdown, setCountdown] = useState({
    days: 4,
    hours: 14,
    minutes: 36,
    seconds: 22,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick Add To Cart function
  async function handleQuickAddToCart(product: HomepageProductData, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (addingId === product.id) return;

    // If product has multiple variants, open modal instead
    if (product.variants && product.variants.length > 1) {
      handleOpenModal(product);
      return;
    }

    setAddingId(product.id);
    try {
      const variantId = product.variants?.[0]?.id || product.id;
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof data.count === "number") {
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: data.count } }));
        }
        setToastMessage(`✓ "${product.name}" added to your box!`);
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setToastMessage("Could not add item to cart");
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch {
      setToastMessage("Network error. Please try again.");
      setTimeout(() => setToastMessage(null), 2500);
    } finally {
      setAddingId(null);
    }
  }

  function handleOpenModal(product: HomepageProductData) {
    setSelectedProductForModal({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.imageUrl,
      categoryName: product.categoryName,
      variants: product.variants,
      fromPrice: product.fromPrice,
    });
  }

  function handleAddToCartSuccess(productName: string) {
    const cleanName = productName.replace(/^✓\s*"?|"?\s*added to your box!?/gi, "").trim();
    setToastMessage(`✓ "${cleanName}" added to your box!`);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Filter products for Signature Menu
  const filteredProducts = useMemo(() => {
    const all = featuredProducts && featuredProducts.length > 0 ? featuredProducts : bestsellers;
    if (activeCategorySlug === "all") return all.slice(0, 8);
    return all
      .filter(
        (p) =>
          p.categorySlug === activeCategorySlug ||
          (p.categoryName && p.categoryName.toLowerCase().includes(activeCategorySlug.toLowerCase()))
      )
      .slice(0, 8);
  }, [featuredProducts, bestsellers, activeCategorySlug]);

  // Verified reviews list
  const displayReviews = useMemo(() => {
    if (reviews && reviews.length > 0) return reviews.slice(0, 6);
    return [];
  }, [reviews]);

  return (
    <div className="relative w-full overflow-x-hidden bg-[#170b05] text-[#f6ead6] selection:bg-[#e6bf7a]/30 selection:text-[#fff]">

      {/* ─────────────────────────────────────────────────────────────
          GLOBAL TOAST NOTIFICATION PILL
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-[#e6bf7a]/40 bg-[#241208]/95 px-5 py-3 text-xs sm:text-sm font-semibold text-[#f6ead6] shadow-2xl backdrop-blur-xl"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e6bf7a] text-xs font-bold text-[#170b05]">
              ✓
            </span>
            <span>{toastMessage}</span>
            <Link
              href="/cart"
              className="ml-2 rounded-full bg-[#e6bf7a] px-3 py-1 text-[11px] font-bold text-[#170b05] hover:bg-[#fff] transition"
            >
              Go to Cart →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          DESIGN THEME SWITCHER PILL (Floats discretely in top corner)
         ───────────────────────────────────────────────────────────── */}
      {onToggleUiDesign && (
        <div className="fixed top-20 right-4 z-40 hidden lg:block">
          <button
            type="button"
            onClick={onToggleUiDesign}
            className="flex items-center gap-2 rounded-full border border-[#e6bf7a]/30 bg-[#23120b]/90 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-[#e6bf7a] shadow-lg backdrop-blur-md hover:border-[#e6bf7a] transition"
            title="Switch UI Style"
          >
            <span>☕ Bruva Dark</span>
            <span className="text-[10px] text-white/50">⇄</span>
            <span className="text-white/70">Cream</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CINEMATIC HERO (Bruva Reference Style)
          Full-screen dark roast, floating hero piece, word-by-word reveal
         ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] lg:min-h-screen w-full flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-12 pt-24 pb-16">
        {/* Ambient Dark Espresso Gradients & Saffron Glow */}
        <div className="absolute inset-0 bg-radial from-[#381c0d]/60 via-[#170b05] to-[#0c0502] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#e6bf7a]/10 via-[#ce803a]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Floating subtle gold particle embers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-[#e6bf7a] blur-[1px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-[#f3b137] blur-[2px] animate-pulse delay-700" />
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-[#e6bf7a] blur-[1px] animate-pulse delay-1000" />
          <div className="absolute top-2/3 right-12 w-2.5 h-2.5 rounded-full bg-[#ce803a] blur-[2px] animate-pulse delay-500" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column (7 cols): Editorial Typography & Staggered Reveal */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Heritage Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 0.7, 0.2, 1] }}
              className="inline-flex items-center gap-2.5 rounded-full border border-[#e6bf7a]/30 bg-[#25130a]/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#e6bf7a] shadow-inner backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-[#e6bf7a] animate-ping" />
              <span>ESTD. 1976 · KALOL, GUJARAT · 100% SHUDDH DESI GHEE</span>
            </motion.div>

            {/* Main Editorial Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 0.7, 0.2, 1] }}
              className="font-[family-name:var(--font-display)] text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#f6ead6] leading-[1.08]"
            >
              Pure Ghee. <br />
              <span className="italic font-normal text-[#e6bf7a]">Pure Tradition.</span>
            </motion.h1>

            {/* Editorial Storyline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 0.7, 0.2, 1] }}
              className="text-sm sm:text-base lg:text-lg text-[#f6ead6b8] max-w-2xl leading-relaxed mx-auto lg:mx-0 font-light"
            >
              Handcrafted in Kalol since 1976. Slow-cooked in heavy copper kadhai with 100% pure cow desi ghee, hand-rolled with generational precision, and served in brass and certified silver leaf.
            </motion.p>

            {/* CTAs and Quality Signatures */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 0.7, 0.2, 1] }}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Magnetic>
                <Link
                  href="/shop"
                  className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-[#e6bf7a] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#170b05] shadow-[0_0_30px_rgba(230,191,122,0.3)] transition hover:bg-[#fff] hover:scale-[1.02]"
                >
                  <span>Explore Royal Creations</span>
                  <span className="transition-transform group-hover:translate-x-1 font-mono">→</span>
                </Link>
              </Magnetic>

              <Link
                href="#our-heritage"
                className="inline-flex items-center gap-2 rounded-full border border-[#e6bf7a]/30 bg-transparent px-6 py-3.5 text-xs sm:text-sm font-semibold tracking-wider text-[#e6bf7a] transition hover:bg-[#e6bf7a]/10"
              >
                <span>The 1976 Story</span>
                <span>↓</span>
              </Link>
            </motion.div>

            {/* Trust Signatures */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="pt-6 border-t border-[#e6bf7a]/15 grid grid-cols-3 gap-4 text-center lg:text-left max-w-lg mx-auto lg:mx-0"
            >
              <div>
                <div className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#e6bf7a]">
                  50+ Yrs
                </div>
                <div className="text-[10px] sm:text-xs text-[#f6ead6b0] uppercase tracking-wider">
                  Kalol Legacy
                </div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#e6bf7a]">
                  100%
                </div>
                <div className="text-[10px] sm:text-xs text-[#f6ead6b0] uppercase tracking-wider">
                  Shuddh Desi Ghee
                </div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-[#e6bf7a]">
                  Dawn
                </div>
                <div className="text-[10px] sm:text-xs text-[#f6ead6b0] uppercase tracking-wider">
                  Fresh Batches
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column (5 cols): Floating Hero Sweet Showcase (Ken Burns float) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Glow Aura behind hero sweet */}
            <div className="absolute w-[340px] sm:w-[460px] aspect-square rounded-full bg-gradient-to-tr from-[#e6bf7a]/20 via-[#ce803a]/25 to-transparent blur-3xl pointer-events-none" />

            {/* Floating Frame */}
            <motion.div
              animate={{
                y: [0, -14, 0],
                rotate: [0, 1.2, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative w-full max-w-[380px] sm:max-w-[440px] aspect-square rounded-3xl p-3 border border-[#e6bf7a]/30 bg-gradient-to-b from-[#2e160b]/80 via-[#23120b]/90 to-[#170b05] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            >
              {/* Product Visual */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#170b05]/60">
                <Image
                  src="/images/kaju-katli-showcase.jpg"
                  alt="Vardayini Royal Silver Foil Kaju Katli"
                  fill
                  priority
                  className="object-cover transform transition duration-1000 hover:scale-105"
                  sizes="(min-width: 1024px) 440px, 90vw"
                />

                {/* Subtle vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#170b05] via-transparent to-transparent opacity-80" />

                {/* Floating Sweet Badge Card */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl border border-[#e6bf7a]/30 bg-[#170b05]/90 backdrop-blur-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bf7a]">
                      Signature Masterpiece
                    </span>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                      Royal Silver Foil Kaju Katli
                    </h3>
                    <p className="text-xs text-[#f6ead6b0]">Made with AAA Goan cashews</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-[#e6bf7a]">₹350</span>
                    <span className="block text-[10px] text-slate-400">/ 500g</span>
                  </div>
                </div>
              </div>

              {/* Decorative Corner Ornaments */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#e6bf7a]" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#e6bf7a]" />
            </motion.div>
          </div>

        </div>

        {/* Scroll mouse indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none opacity-60">
          <span className="text-[10px] uppercase tracking-widest text-[#e6bf7a]">Scroll</span>
          <div className="w-4 h-7 rounded-full border border-[#e6bf7a]/50 flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-1.5 rounded-full bg-[#e6bf7a]"
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: OUR STORY / HERITAGE (Since 1976)
          Scroll-driven editorial with large numbers counting up
         ───────────────────────────────────────────────────────────── */}
      <section id="our-heritage" className="relative py-20 lg:py-28 px-4 sm:px-6 lg:px-12 border-t border-[#e6bf7a]/15 bg-gradient-to-b from-[#170b05] via-[#201008] to-[#170b05]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left 6 Cols: The Story */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
                HALF A CENTURY OF HERITAGE
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6] leading-tight">
                Dawn Batches. Heavy Copper Kadhai. <br />
                <span className="italic font-normal text-[#e6bf7a]">Uncompromising Purity.</span>
              </h2>
              <p className="text-sm sm:text-base text-[#f6ead6b0] leading-relaxed font-light">
                In 1976, on the morning lanes of Kalol, Vardayini began with a single copper kadhai and an oath: never cut corners on Gir cow ghee, never mask flavor with artificial essences, and treat every tray of sweets as a sacred offering to the family table.
              </p>
              <p className="text-sm sm:text-base text-[#f6ead6b0] leading-relaxed font-light">
                Today, as Kalol evolves, our hearths still awaken at 4:30 AM. Generational halwai artisans inspect the roasting flour, churn the fresh mawa, and hand-cut every diamond of Kaju Katli under natural morning light.
              </p>

              {/* Verified Heritage Seal */}
              <div className="pt-2 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border border-[#e6bf7a]/40 bg-[#25130a] flex items-center justify-center text-2xl shadow-inner">
                  🏛️
                </div>
                <div>
                  <div className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                    Vardayini Sweet Mart · 1986
                  </div>
                  <div className="text-xs text-[#e6bf7a]">
                    Official Seal of Purity · Navjivan Center, Kalol
                  </div>
                </div>
              </div>
            </div>

            {/* Right 6 Cols: Heritage Stats Grid & Brass Platter Image */}
            <div className="lg:col-span-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Stat 1 */}
                <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#23120b]/70 backdrop-blur-md space-y-1">
                  <div className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#e6bf7a]">
                    50
                  </div>
                  <div className="text-xs font-bold text-[#f6ead6] uppercase tracking-wider">
                    Years of Heritage
                  </div>
                  <p className="text-[11px] text-[#f6ead6b0]">
                    Serving three generations across Kalol and Gujarat.
                  </p>
                </div>

                {/* Stat 2 */}
                <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#23120b]/70 backdrop-blur-md space-y-1">
                  <div className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#e6bf7a]">
                    100+
                  </div>
                  <div className="text-xs font-bold text-[#f6ead6] uppercase tracking-wider">
                    Authentic Recipes
                  </div>
                  <p className="text-[11px] text-[#f6ead6b0]">
                    From Royal Kaju sweets to savory Gujarati farsan.
                  </p>
                </div>

                {/* Stat 3 */}
                <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#23120b]/70 backdrop-blur-md space-y-1">
                  <div className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#e6bf7a]">
                    50K+
                  </div>
                  <div className="text-xs font-bold text-[#f6ead6] uppercase tracking-wider">
                    Happy Families
                  </div>
                  <p className="text-[11px] text-[#f6ead6b0]">
                    Sweetening weddings, Diwali, and festive milestones.
                  </p>
                </div>

                {/* Stat 4 */}
                <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#23120b]/70 backdrop-blur-md space-y-1">
                  <div className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#e6bf7a]">
                    100%
                  </div>
                  <div className="text-xs font-bold text-[#f6ead6] uppercase tracking-wider">
                    Shuddh Desi Ghee
                  </div>
                  <p className="text-[11px] text-[#f6ead6b0]">
                    Zero dalda, zero palm oil, zero chemical additives.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: THE CRAFT / HOW IT'S MADE
          4-step sticky/horizontal storytelling discipline
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-12 bg-[#1a0e07] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
              THE ANCIENT HALWAI DISCIPLINE
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6]">
              Four Sacred Steps to Perfection
            </h2>
            <p className="text-sm text-[#f6ead6b0]">
              Every tray at Vardayini follows an unbroken handwritten method recorded by our founders.
            </p>
          </div>

          {/* Step Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {CRAFT_STEPS.map((item, idx) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeStep === idx
                    ? "border-[#e6bf7a] bg-[#2a150b] shadow-[0_10px_25px_rgba(230,191,122,0.15)]"
                    : "border-[#e6bf7a]/15 bg-[#1f0f08]/60 hover:border-[#e6bf7a]/40"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#e6bf7a]">
                  <span>STEP {item.step}</span>
                  <span className="text-base">{item.icon}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-[#f6ead6] line-clamp-1">
                  {item.title}
                </div>
                <div className="text-[10px] text-[#ce803a] font-medium mt-0.5">
                  {item.tag}
                </div>
              </button>
            ))}
          </div>

          {/* Active Step Detailed Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="p-8 sm:p-12 rounded-3xl border border-[#e6bf7a]/30 bg-gradient-to-br from-[#29140b] via-[#200f07] to-[#170b05] shadow-2xl relative overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e6bf7a]/40 bg-[#170b05]/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#e6bf7a]">
                    <span>Step {CRAFT_STEPS[activeStep].step}</span>
                    <span>•</span>
                    <span>{CRAFT_STEPS[activeStep].tag}</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-4xl font-bold text-[#f6ead6]">
                    {CRAFT_STEPS[activeStep].title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#f6ead6b0] leading-relaxed font-light">
                    {CRAFT_STEPS[activeStep].description}
                  </p>
                  <div className="pt-2 p-4 rounded-xl border border-[#e6bf7a]/15 bg-[#170b05]/50 text-xs sm:text-sm text-[#e6bf7a] flex items-center gap-3">
                    <span className="text-xl">✨</span>
                    <span>{CRAFT_STEPS[activeStep].details}</span>
                  </div>
                </div>

                <div className="lg:col-span-4 flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-[#e6bf7a]/30 bg-radial from-[#e6bf7a]/20 to-transparent flex flex-col items-center justify-center text-center p-6 shadow-inner">
                    <span className="text-5xl mb-2">{CRAFT_STEPS[activeStep].icon}</span>
                    <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[#f6ead6]">
                      {CRAFT_STEPS[activeStep].tag}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[#e6bf7a] mt-1">
                      Pure Craft
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: SIGNATURE MENU (Editorial Tabs + Add to Bag)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-12 bg-[#170b05] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
                ROYAL PALETTE
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6]">
                Signature Mithai Collection
              </h2>
              <p className="mt-1 text-sm text-[#f6ead6b0]">
                Freshly prepared every dawn with 100% Shuddh Desi Ghee. Pick your favorites.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#e6bf7a] hover:text-[#fff] transition uppercase tracking-wider"
            >
              <span>View Full Menu ({bestsellers.length + featuredProducts.length}+ items)</span>
              <span>→</span>
            </Link>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategorySlug("all")}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeCategorySlug === "all"
                  ? "border-[#e6bf7a] bg-[#e6bf7a] text-[#170b05] shadow-md"
                  : "border-[#e6bf7a]/20 bg-[#25130a] text-[#f6ead6] hover:border-[#e6bf7a]/40"
              }`}
            >
              👑 All Specialties
            </button>
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategorySlug(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  activeCategorySlug === cat.slug
                    ? "border-[#e6bf7a] bg-[#e6bf7a] text-[#170b05] shadow-md"
                    : "border-[#e6bf7a]/20 bg-[#25130a] text-[#f6ead6] hover:border-[#e6bf7a]/40"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredProducts.map((product) => {
              const primaryVariant = product.variants?.[0];
              const displayPrice = primaryVariant
                ? unitPrice(primaryVariant.price, primaryVariant.discountedPrice)
                : product.fromPrice;
              const hasMultipleVariants = product.variants && product.variants.length > 1;

              return (
                <article
                  key={product.id}
                  className="group relative rounded-2xl border border-[#e6bf7a]/20 bg-gradient-to-b from-[#25130a] to-[#1c0d06] p-4 flex flex-col justify-between overflow-hidden shadow-lg transition duration-300 hover:border-[#e6bf7a]/60 hover:shadow-[0_10px_30px_rgba(230,191,122,0.12)] hover:-translate-y-1"
                >
                  <div>
                    {/* Food Photo Container */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#170b05]">
                      <Image
                        src={product.imageUrl || "/images/kaju-katli.jpg"}
                        alt={product.name}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(min-width: 1024px) 25vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#170b05]/80 via-transparent to-transparent" />

                      {/* Tag Badge */}
                      <span className="absolute top-2 left-2 rounded-full border border-[#e6bf7a]/30 bg-[#170b05]/90 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e6bf7a] backdrop-blur-md">
                        100% Desi Ghee
                      </span>

                      {/* Quick View Button on Desktop Hover */}
                      <button
                        type="button"
                        onClick={() => handleOpenModal(product)}
                        className="absolute inset-0 m-auto w-24 h-8 rounded-full border border-[#e6bf7a] bg-[#170b05]/90 text-[10px] font-bold uppercase tracking-wider text-[#e6bf7a] opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-md shadow-lg"
                      >
                        Quick View
                      </button>
                    </div>

                    {/* Product Name & Category */}
                    <div className="mt-3.5 space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#ce803a]">
                        {product.categoryName || "Handcrafted Mithai"}
                      </div>
                      <Link href={`/shop/${product.slug}`}>
                        <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#f6ead6] group-hover:text-[#e6bf7a] transition line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-[11px] text-[#f6ead6b0] line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  {/* Pricing & Add To Bag */}
                  <div className="mt-4 pt-3 border-t border-[#e6bf7a]/15 flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-[#e6bf7a]">
                        {formatInr(displayPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Pack: {primaryVariant?.weight || "250g"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAddToCart(product, e)}
                      disabled={addingId === product.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e6bf7a] px-3.5 py-2 text-xs font-bold text-[#170b05] hover:bg-[#fff] transition shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <span>{hasMultipleVariants ? "Choose" : addingId === product.id ? "Adding..." : "Add"}</span>
                      <span className="font-mono">{hasMultipleVariants ? "▾" : "+"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: GIFT HAMPERS & FESTIVE SEASON
          Dark glowing amber section with live countdown
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-[#200f07] via-[#2d150a] to-[#170b05] border-t border-[#e6bf7a]/20 relative overflow-hidden">
        {/* Amber aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-[#ce803a]/15 via-[#e6bf7a]/10 to-[#ce803a]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#e6bf7a]">
              ROYAL FESTIVE CELEBRATIONS
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6]">
              Festive Hampers & Wedding Boxes
            </h2>
            <p className="text-sm text-[#f6ead6b0]">
              Presented in velvet trunks, hand-carved wooden boxes, and traditional brass platters.
            </p>

            {/* Live Countdown Box */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
                Next Dispatch Window In:
              </span>
              <div className="flex items-center gap-2 font-mono text-xs font-bold">
                <span className="px-2 py-1 rounded bg-[#170b05] border border-[#e6bf7a]/30 text-[#e6bf7a]">
                  {countdown.days}d
                </span>
                <span>:</span>
                <span className="px-2 py-1 rounded bg-[#170b05] border border-[#e6bf7a]/30 text-[#e6bf7a]">
                  {countdown.hours}h
                </span>
                <span>:</span>
                <span className="px-2 py-1 rounded bg-[#170b05] border border-[#e6bf7a]/30 text-[#e6bf7a]">
                  {countdown.minutes}m
                </span>
                <span>:</span>
                <span className="px-2 py-1 rounded bg-[#170b05] border border-[#e6bf7a]/30 text-[#e6bf7a]">
                  {countdown.seconds}s
                </span>
              </div>
            </div>
          </div>

          {/* Hampers 3-Card Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {FESTIVE_HAMPERS.map((hamper) => (
              <div
                key={hamper.id}
                className="group rounded-3xl border border-[#e6bf7a]/30 bg-gradient-to-b from-[#241208] to-[#1a0c05] p-5 flex flex-col justify-between overflow-hidden shadow-2xl transition duration-500 hover:border-[#e6bf7a] hover:scale-[1.01]"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#170b05]">
                    <Image
                      src={hamper.image}
                      alt={hamper.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(min-width: 768px) 33vw, 90vw"
                    />
                    <span className="absolute top-3 left-3 rounded-full border border-[#e6bf7a]/40 bg-[#170b05]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e6bf7a] backdrop-blur-md">
                      {hamper.tag}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#f6ead6] group-hover:text-[#e6bf7a] transition">
                      {hamper.title}
                    </h3>
                    <p className="text-xs text-[#f6ead6b0] leading-relaxed">
                      {hamper.description}
                    </p>
                    <div className="text-[11px] text-[#ce803a] font-semibold">
                      Weight: {hamper.weight}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e6bf7a]/20 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-[#e6bf7a]">
                      {formatInr(hamper.price)}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 line-through">
                      {formatInr(hamper.originalPrice)}
                    </span>
                  </div>

                  <Link
                    href="/shop?tag=gift"
                    className="rounded-full bg-[#e6bf7a] px-4 py-2 text-xs font-bold text-[#170b05] hover:bg-[#fff] transition shadow-md"
                  >
                    Order Hamper →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Corporate Gifting Inquiry Banner */}
          <div className="mt-12 p-6 rounded-2xl border border-[#e6bf7a]/30 bg-[#1f0f08]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="text-sm font-bold text-[#f6ead6]">
                Planning Corporate Gifting or Wedding Sweets Boxes?
              </div>
              <div className="text-xs text-[#f6ead6b0]">
                Customized branding, personalized wax seals, and express pan-India bulk shipping available.
              </div>
            </div>
            <a
              href="https://wa.me/919876543210?text=Hello%20Vardayini%20Sweet%20Mart,%20I%20would%20like%20to%20inquire%20about%20corporate%20festive%20hampers"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#e6bf7a] bg-[#e6bf7a]/15 px-5 py-2.5 text-xs font-bold text-[#e6bf7a] hover:bg-[#e6bf7a] hover:text-[#170b05] transition whitespace-nowrap"
            >
              WhatsApp Gifting Desk 💬
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: TASTE QUIZ BANNER (/find-your-mithai)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-[#170b05] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[#e6bf7a]/30 bg-gradient-to-r from-[#2c150b] via-[#200f07] to-[#2c150b] p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e6bf7a]/30 bg-[#170b05]/60 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#e6bf7a]">
              <span>🎯</span>
              <span>PERSONALIZED PALATE</span>
            </span>

            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#f6ead6]">
              Find Your Signature Mithai Personality
            </h2>

            <p className="text-xs sm:text-sm text-[#f6ead6b0] leading-relaxed">
              Confused between rich Kaju Katli, slow-simmered mawa penda, or crunchy festive farsan? Answer 4 quick questions in our 30-second quiz to unlock your personalized recommendation.
            </p>

            <div className="pt-2">
              <Link
                href="/find-your-mithai"
                className="inline-flex items-center gap-3 rounded-full bg-[#e6bf7a] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#170b05] shadow-[0_0_25px_rgba(230,191,122,0.3)] transition hover:bg-[#fff] hover:scale-105"
              >
                <span>Take 30-Sec Taste Quiz</span>
                <span className="font-mono">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: WHY VARDAYINI (Purity Promises as Glass Cards)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-12 bg-[#1b0e07] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
              THE VARDAYINI STANDARD
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6]">
              Purity You Can Taste in Every Bite
            </h2>
            <p className="text-sm text-[#f6ead6b0]">
              Every box leaving our Kalol kitchens satisfies the strict purity oaths set in 1976.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#25130a]/70 backdrop-blur-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#e6bf7a]/15 border border-[#e6bf7a]/30 flex items-center justify-center text-2xl">
                🥛
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                100% Shuddh Desi Ghee
              </h3>
              <p className="text-xs text-[#f6ead6b0] leading-relaxed">
                Prepared exclusively with Gir cow and buffalo milk ghee. Absolutely zero hydrogenated oils or dalda.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#25130a]/70 backdrop-blur-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#e6bf7a]/15 border border-[#e6bf7a]/30 flex items-center justify-center text-2xl">
                🌿
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                Zero Preservatives
              </h3>
              <p className="text-xs text-[#f6ead6b0] leading-relaxed">
                Cooked fresh in morning dawn batches. We never add artificial colors, chemical binders, or artificial essences.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#25130a]/70 backdrop-blur-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#e6bf7a]/15 border border-[#e6bf7a]/30 flex items-center justify-center text-2xl">
                📦
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                Food-Grade Sealed Box
              </h3>
              <p className="text-xs text-[#f6ead6b0] leading-relaxed">
                Multi-layer food-grade packaging preserves the fresh-baked ghee fragrance and prevents moisture loss during transit.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#25130a]/70 backdrop-blur-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#e6bf7a]/15 border border-[#e6bf7a]/30 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                Kalol Same-Day Delivery
              </h3>
              <p className="text-xs text-[#f6ead6b0] leading-relaxed">
                Same-day doorstep delivery across Kalol for orders placed before 2:00 PM. Express courier pan-India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8: PINCODE & DELIVERY CHECKER
         ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-12 bg-[#170b05] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-4xl p-8 sm:p-10 rounded-3xl border border-[#e6bf7a]/30 bg-[#23120b]/80 backdrop-blur-xl">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
              DIRECT KALOL KITCHEN DISPATCH
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#f6ead6]">
              Check Express Delivery Availability
            </h2>
            <p className="text-xs text-[#f6ead6b0]">
              Enter your postal pincode to verify same-day Kalol delivery or express courier transit times.
            </p>
          </div>
          <PincodeDeliveryChecker />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 9: TESTIMONIALS CAROUSEL
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-12 bg-[#1a0e07] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
              VOICES OF GUJARAT
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6]">
              Loved by Over 50,000 Families
            </h2>
            <p className="text-sm text-[#f6ead6b0]">
              Real verified reviews from our patrons across Kalol, Gujarat, and pan-India.
            </p>
          </div>

          {displayReviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displayReviews.map((rev: any, idx: number) => (
                <div
                  key={rev.id || idx}
                  className="p-6 rounded-2xl border border-[#e6bf7a]/20 bg-[#25130a]/80 backdrop-blur-md flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-[#e6bf7a]">
                      {"★".repeat(rev.rating || 5)}
                    </div>
                    <p className="text-xs sm:text-sm text-[#f6ead6b0] leading-relaxed italic">
                      &ldquo;{rev.quote || rev.comment}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#e6bf7a]/15 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#f6ead6]">{rev.name}</div>
                      <div className="text-[10px] text-[#ce803a]">{rev.location || "Kalol, Gujarat"}</div>
                    </div>
                    {rev.isVerified && (
                      <span className="rounded-full bg-emerald-900/60 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-[#e6bf7a]/20 bg-[#25130a]/60 text-center max-w-md mx-auto space-y-3">
              <span className="text-3xl">⭐</span>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#f6ead6]">
                Be the first to review!
              </h3>
              <p className="text-xs text-[#f6ead6b0]">
                Have you tasted our dawn batch Kaju Katli or Penda? Share your experience with us.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 10: STORES & OUTLETS (Kalol & Gandhinagar)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-12 bg-[#170b05] border-t border-[#e6bf7a]/15">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ce803a]">
              VISIT OUR SWEET MARTS
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-[#f6ead6]">
              Our Flagship Locations
            </h2>
            <p className="text-sm text-[#f6ead6b0]">
              Experience the aroma of fresh desi ghee sweets crafted warm before your eyes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Store 1: Kalol Flagship */}
            <div className="p-8 rounded-3xl border border-[#e6bf7a]/30 bg-gradient-to-b from-[#25130a] to-[#1c0d06] space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[#e6bf7a]/40 bg-[#170b05] px-3.5 py-1 text-xs font-bold text-[#e6bf7a]">
                  FLAGSHIP STORE · SINCE 1976
                </span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Open Today
                </span>
              </div>

              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#f6ead6]">
                  Vardayini Sweet Mart — Kalol
                </h3>
                <p className="mt-1 text-xs text-[#f6ead6b0] leading-relaxed">
                  6A, Navjivan Shopping Center, Near Bus Station, Kalol, Gujarat 382721
                </p>
              </div>

              <div className="space-y-1 text-xs text-[#f6ead6b0]">
                <div>⏰ <strong>Hours:</strong> 8:00 AM – 10:00 PM (Monday – Sunday)</div>
                <div>📞 <strong>Phone:</strong> +91 98250 12345 / 02764 220000</div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href="https://maps.google.com/?q=Kalol+Navjivan+Shopping+Center"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#e6bf7a] bg-[#e6bf7a]/15 px-4 py-2 text-xs font-bold text-[#e6bf7a] hover:bg-[#e6bf7a] hover:text-[#170b05] transition"
                >
                  Get Directions 📍
                </a>
                <a
                  href="https://wa.me/919825012345?text=Hello%20Vardayini%20Sweet%20Mart%20Kalol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition"
                >
                  WhatsApp Store 💬
                </a>
              </div>
            </div>

            {/* Store 2: Gandhinagar Outlet */}
            <div className="p-8 rounded-3xl border border-[#e6bf7a]/30 bg-gradient-to-b from-[#25130a] to-[#1c0d06] space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[#e6bf7a]/40 bg-[#170b05] px-3.5 py-1 text-xs font-bold text-[#e6bf7a]">
                  HERITAGE OUTLET
                </span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Open Today
                </span>
              </div>

              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#f6ead6]">
                  Vardayini Sweets — Gandhinagar
                </h3>
                <p className="mt-1 text-xs text-[#f6ead6b0] leading-relaxed">
                  Shop 12, Pramukh Arcade, Kudasan / Sector 11, Gandhinagar, Gujarat 382421
                </p>
              </div>

              <div className="space-y-1 text-xs text-[#f6ead6b0]">
                <div>⏰ <strong>Hours:</strong> 8:30 AM – 10:00 PM (Monday – Sunday)</div>
                <div>📞 <strong>Phone:</strong> +91 98250 54321 / 079 2320000</div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href="https://maps.google.com/?q=Gandhinagar+Pramukh+Arcade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#e6bf7a] bg-[#e6bf7a]/15 px-4 py-2 text-xs font-bold text-[#e6bf7a] hover:bg-[#e6bf7a] hover:text-[#170b05] transition"
                >
                  Get Directions 📍
                </a>
                <a
                  href="https://wa.me/919825054321?text=Hello%20Vardayini%20Sweets%20Gandhinagar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition"
                >
                  WhatsApp Store 💬
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 11: FOOTER (Matches Dark Espresso Theme)
         ───────────────────────────────────────────────────────────── */}
      <footer className="py-16 px-4 sm:px-6 lg:px-12 bg-[#0d0502] border-t border-[#e6bf7a]/20 text-xs text-[#f6ead6b0]">
        <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#f6ead6]">
              Vardayini Sweet Mart
            </div>
            <p className="text-xs leading-relaxed max-w-sm">
              Handcrafting 100% Shuddh Desi Ghee sweets in Kalol since 1976. Slow-cooked in heavy copper kadhais, preserved with certified vegetarian silver leaf, and delivered fresh across India.
            </p>
            <div className="text-[11px] text-[#e6bf7a] font-semibold">
              Navjivan Shopping Center, Kalol, Gujarat 382721
            </div>
          </div>

          {/* Mithai Categories */}
          <div className="space-y-3">
            <div className="font-bold text-[#f6ead6] uppercase tracking-wider text-[11px]">
              Sweets & Namkeen
            </div>
            <ul className="space-y-2">
              <li><Link href="/shop" className="hover:text-[#e6bf7a] transition">Kaju Katli & Rolls</Link></li>
              <li><Link href="/shop" className="hover:text-[#e6bf7a] transition">Kesar Malai Penda</Link></li>
              <li><Link href="/shop" className="hover:text-[#e6bf7a] transition">Mohanthal (Pure Ghee)</Link></li>
              <li><Link href="/shop" className="hover:text-[#e6bf7a] transition">Gujarati Farsan</Link></li>
              <li><Link href="/shop" className="hover:text-[#e6bf7a] transition">Festive Gift Boxes</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <div className="font-bold text-[#f6ead6] uppercase tracking-wider text-[11px]">
              Customer Care
            </div>
            <ul className="space-y-2">
              <li><Link href="/track-order" className="hover:text-[#e6bf7a] transition">Track Order</Link></li>
              <li><Link href="/cart" className="hover:text-[#e6bf7a] transition">Your Box</Link></li>
              <li><Link href="/find-your-mithai" className="hover:text-[#e6bf7a] transition">Taste Quiz</Link></li>
              <li><Link href="/kitchen-live" className="hover:text-[#e6bf7a] transition">Kitchen Live Cam</Link></li>
              <li><Link href="/contact" className="hover:text-[#e6bf7a] transition">Contact Us</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <div className="font-bold text-[#f6ead6] uppercase tracking-wider text-[11px]">
              Festive Dispatch Alerts
            </div>
            <p className="text-[11px]">
              Receive early access to seasonal batches like Mohanthal, Adadiya Pak, and festival hampers.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Enter email or phone"
                className="w-full rounded-full border border-[#e6bf7a]/30 bg-[#170b05] px-3.5 py-2 text-xs text-[#f6ead6] placeholder:text-slate-500 focus:outline-none focus:border-[#e6bf7a]"
              />
              <button
                type="button"
                className="rounded-full bg-[#e6bf7a] px-4 py-2 text-xs font-bold text-[#170b05] hover:bg-white transition"
              >
                Join
              </button>
            </div>
          </div>

        </div>

        <div className="mx-auto max-w-7xl pt-8 border-t border-[#e6bf7a]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © 1976 – 2026 Vardayini Sweet Mart. All rights reserved. Kalol, Gujarat.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#e6bf7a] transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#e6bf7a] transition">Terms of Service</Link>
            <Link href="/shipping" className="hover:text-[#e6bf7a] transition">Shipping Policy</Link>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          PRODUCT OPTIONS MODAL (For choose options popup)
         ───────────────────────────────────────────────────────────── */}
      <ProductOptionsModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        onAddToCartSuccess={handleAddToCartSuccess}
      />
    </div>
  );
}
