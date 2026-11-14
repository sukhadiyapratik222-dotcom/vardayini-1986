"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { InView } from "@/components/core/in-view";

interface FestiveProduct {
  id: number;
  dbVariantId?: number;
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

interface FestivalSectionMeta {
  id: string;
  categoryTag: string;
  title: string;
  subtitle: string;
  viewAllText: string;
  festivalIds: string[];
  tabLabel?: string;
  tabIcon?: string;
  tabGujarati?: string;
  backgroundImage?: string;
  enabled?: boolean;
}

const DEFAULT_HERO = {
  badgeText: "🪔 SPECIAL FESTIVE COLLECTION",
  phone: "+91 6352119329",
  titlePrefix: "Celebrate Indian Festivals with",
  titleHighlight: "Shuddh Mithai",
  subtitle:
    "Diwali gift hampers, Dussehra Jalebi-Fafda, Rakhi sweets boxes, and Ganesh Chaturthi 21-modak prasad handcrafted with 100% pure desi ghee.",
  button1Text: "Shop Festival Mithai 🪔",
  button1Link: "#festive-catalog",
  button2Text: "Corporate Gifting 🎁",
  button2Link: "#corporate-gifting",
  trustPills: [
    { icon: "🧈", text: "100% Shuddh Desi Ghee" },
    { icon: "🥈", text: "99.9% Pure Silver Vark" },
    { icon: "🚚", text: "Same-Day Gujarat Dispatch" },
    { icon: "🎁", text: "Custom Corporate Branding" },
  ],
  couponPromo: {
    enabled: true,
    text: "Festive Offer: Flat 15% OFF on ₹999+",
    code: "FESTIVE15",
  },
  backgroundImage: "/images/diwali-bg.jpg",
};

const DEFAULT_CORPORATE = {
  enabled: true,
  badge: "Corporate & Family Bulk Orders",
  title: "Festive Corporate Hampers with Your Brand Logo",
  description:
    "Custom tin boxes, dry fruit platters, and silver-foiled mithai boxes packed with your company's custom greeting cards and ribbon branding. Special wholesale discounts for orders above 25 boxes.",
  whatsappNumber: "6352119329",
  whatsappText: "WhatsApp Bulk Inquiry",
  phoneNumber: "+91 6352119329",
};

const DEFAULT_TRUST_PERKS = [
  {
    icon: "📦",
    title: "Premium Packaging",
    description: "Gift-ready packaging with individual airtight vacuum sealing.",
  },
  {
    icon: "🧈",
    title: "100% Shuddh Desi Ghee",
    description: "Handcrafted in traditional copper kadhais with Gir cow ghee.",
  },
  {
    icon: "👑",
    title: "Customers' Favorite Recipes",
    description: "Authentic heritage recipes preserved across four generations since 1976.",
  },
  {
    icon: "🚚",
    title: "Express All-India Delivery",
    description: "Same-day dispatch for Gujarat, 2-3 days delivery across India with freshness lock.",
  },
];

const DEFAULT_FESTIVAL_PAGES: Record<string, any> = {
  diwali: {
    hero: {
      badgeText: "🪔 SHUBH DIWALI & NUTAN VARSHABHINANDAN",
      phone: "+91 6352119329",
      titlePrefix: "Celebrate Shubh Deepavali & New Year with",
      titleHighlight: "Royal Desi Ghee Mithai",
      subtitle:
        "Handcrafted Diwali gift hampers, silver vark Kaju Katli, slow-roasted Mohanthal, and authentic Kalol Ghari crafted with 100% pure Gir cow ghee.",
      button1Text: "Shop Diwali Hampers 🪔",
      button1Link: "#festive-catalog",
      button2Text: "Corporate Gifting 🎁",
      button2Link: "#corporate-gifting",
      backgroundImage: "/images/diwali-bg.jpg",
    },
    couponPromo: {
      enabled: true,
      text: "Shubh Diwali Offer: Flat 15% OFF on ₹999+",
      code: "DIWALI15",
    },
    trustPills: [
      { icon: "🪔", text: "100% Shuddh Desi Ghee" },
      { icon: "🥈", text: "99.9% Pure Silver Vark" },
      { icon: "🎁", text: "Royal Velvet Gift Boxes" },
      { icon: "🚚", text: "Same-Day Gujarat Dispatch" },
    ],
    corporateGifting: {
      enabled: true,
      badge: "Diwali Corporate & Family Hampers",
      title: "Custom Diwali Gift Hampers with Your Brand Crest",
      description:
        "Custom tin boxes, dry fruit platters, and silver-foiled mithai hampers embossed with your company logo & custom greeting message. Special wholesale pricing for 25+ boxes.",
      whatsappNumber: "6352119329",
      whatsappText: "WhatsApp Diwali Bulk Inquiry",
      phoneNumber: "+91 6352119329",
    },
    theme: "diwali",
    storyTitle: "Diwali Tradition of Shuddh Mithai",
    storyDescription:
      "In Gujarati culture, sharing sweets on Diwali and Nutan Varsh marks the welcoming of Goddess Lakshmi, spreading prosperity and auspicious beginnings.",
  },
  dussehra: {
    hero: {
      badgeText: "💃 SHUBH NAVRATRI & VIJAYADASHAMI",
      phone: "+91 6352119329",
      titlePrefix: "Celebrate Sacred Navratri & Dussehra with",
      titleHighlight: "Fresh Crispy Jalebi-Fafda & Farali Sweets",
      subtitle:
        "Vijayadashami early-morning hot Jalebi-Fafda tradition with raw papaya sambharo, paired with 100% pure fasting Upvas Rajgara & makhana sweets.",
      button1Text: "Order Dussehra Jalebi Now 🍯",
      button1Link: "#festive-catalog",
      button2Text: "Bulk Team Boxes 🎁",
      button2Link: "#corporate-gifting",
      backgroundImage: "/images/dussehra-jalebi.jpg",
    },
    couponPromo: {
      enabled: true,
      text: "Dussehra Special: Extra 10% OFF on Jalebi & Farali Combos",
      code: "NAVRATRI10",
    },
    trustPills: [
      { icon: "🍯", text: "Live Early-Morning Frying" },
      { icon: "🌿", text: "100% Upvas Pure Farali Ghee" },
      { icon: "🥗", text: "Crunchy Papaya Sambharo" },
      { icon: "🚚", text: "Pre-Dawn Dussehra Dispatch" },
    ],
    corporateGifting: {
      enabled: true,
      badge: "Dussehra Morning Corporate Treats",
      title: "Festive Dussehra Breakfast & Jalebi Boxes for Teams",
      description:
        "Delight your employees and partners with hot fresh Kesar Jalebi, crispy Fafda, and festive sweet platters packed in individual hygienic corporate boxes.",
      whatsappNumber: "6352119329",
      whatsappText: "WhatsApp Dussehra Order",
      phoneNumber: "+91 6352119329",
    },
    theme: "navratri",
    storyTitle: "The Joyous Dussehra Jalebi-Fafda Tradition",
    storyDescription:
      "According to Gujarati heritage, celebrating the victory of Good over Evil on Vijayadashami begins at dawn with hot golden kesar jalebi and spicy crunchy fafda.",
  },
  rakhi: {
    hero: {
      badgeText: "🧵 RAKSHA BANDHAN CELEBRATIONS",
      phone: "+91 6352119329",
      titlePrefix: "Celebrate the Sacred Bond of Siblings with",
      titleHighlight: "Handcrafted Rakhi Sweets & Hampers",
      subtitle:
        "Express brother-sister love with artisan Motichoor Ladoos, Dry Fruit Anjeer Rolls, premium Kaju Katli, and free designer eco-friendly rakhis with roli-chawal.",
      button1Text: "Shop Rakhi Sweet Boxes 🧵",
      button1Link: "#festive-catalog",
      button2Text: "Corporate Sister Gifting 🎁",
      button2Link: "#corporate-gifting",
      backgroundImage: "/images/festive-hamper.jpg",
    },
    couponPromo: {
      enabled: true,
      text: "Rakhi Prem Offer: Flat 20% OFF on Gift Hampers",
      code: "RAKHI20",
    },
    trustPills: [
      { icon: "🧵", text: "Free Designer Rakhi Included" },
      { icon: "🌾", text: "Sacred Roli-Akshat Chawal" },
      { icon: "📦", text: "Air-Tight Freshness Lock" },
      { icon: "💌", text: "Free Custom Sister Card" },
    ],
    corporateGifting: {
      enabled: true,
      badge: "Rakhi Corporate & Family Hampers",
      title: "Express Appreciation with Premium Raksha Bandhan Hampers",
      description:
        "Bespoke Mithai & Dryfruit boxes with custom sleeve bands, personalized notes, and courier dispatch across all major cities in India.",
      whatsappNumber: "6352119329",
      whatsappText: "WhatsApp Rakhi Hampers",
      phoneNumber: "+91 6352119329",
    },
    theme: "rakhi",
    storyTitle: "The Eternal Bond of Raksha Bandhan",
    storyDescription:
      "A sister's prayer for her brother's long life sealed with a sacred thread, sweetened with authentic homemade desi ghee sweets.",
  },
  ganesh: {
    hero: {
      badgeText: "🐘 GANESHOTSAV 21-MODAK BHOG",
      phone: "+91 6352119329",
      titlePrefix: "Welcome Vighnaharta Lord Ganesha with",
      titleHighlight: "21 Shuddh Modak Bhog Prasad",
      subtitle:
        "Handcrafted sacred 21-Modak bhog assortments: Kesar Mawa Modak, Kaju Modak, Malai Peda Modak, and Coconut Jaggery Modak in pure desi cow ghee.",
      button1Text: "Book 21 Modak Bhog 🐘",
      button1Link: "#festive-catalog",
      button2Text: "Pandal & Mandal Bulk 🪔",
      button2Link: "#corporate-gifting",
      backgroundImage: "/images/modak-bhog.jpg",
    },
    couponPromo: {
      enabled: true,
      text: "Bapa's Blessings: Flat ₹100 OFF on 21-Modak Assortment",
      code: "BAPABHOG",
    },
    trustPills: [
      { icon: "🐘", text: "Sacred 21-Modak Bhog Box" },
      { icon: "🧈", text: "Gir Cow Desi Ghee Purity" },
      { icon: "🥥", text: "Fresh Coconut & Organic Jaggery" },
      { icon: "🪔", text: "Daily Fresh Morning Batch" },
    ],
    corporateGifting: {
      enabled: true,
      badge: "Mandal & Corporate Bhog Prasad",
      title: "Bulk Modak Prasad Boxes for Ganesh Pandals & Offices",
      description:
        "Hygienically packed individual modak prasad boxes for office poojas, residential societies, and Ganesh mandal distributions.",
      whatsappNumber: "6352119329",
      whatsappText: "WhatsApp Modak Prasad",
      phoneNumber: "+91 6352119329",
    },
    theme: "ganesh",
    storyTitle: "Devotion of 21 Modaks",
    storyDescription:
      "Modak is Lord Ganesha's most beloved sweet, symbolising divine knowledge, inner satisfaction, and supreme devotion.",
  },
  "holi-uttarayan": {
    hero: {
      badgeText: "🪁 HOLI & UTTARAYAN CELEBRATIONS",
      phone: "+91 6352119329",
      titlePrefix: "Celebrate Vibrant Holi & Kite-Flying Uttarayan with",
      titleHighlight: "Royal Chikki, Gujiya & Thandai Peda",
      subtitle:
        "Crispy Gir-cow-ghee khoya gujiyas, rich saffron thandai pedas, crunchy organic jaggery til-chikki, and authentic peanut brittle crafted in our Anand workshop.",
      button1Text: "Shop Chikki & Gujiya 🪁",
      button1Link: "#festive-catalog",
      button2Text: "Rooftop Bulk Orders 🪁",
      button2Link: "#corporate-gifting",
      backgroundImage: "/images/holi-gujiya.jpg",
    },
    couponPromo: {
      enabled: true,
      text: "Festive Crunch Offer: Flat 15% OFF on Chikki & Gujiya",
      code: "RANGOLI15",
    },
    trustPills: [
      { icon: "🪁", text: "Authentic Anand Workshop Chikki" },
      { icon: "🌾", text: "100% Organic Desi Gud (Jaggery)" },
      { icon: "🥛", text: "Saffron Infused Thandai Mawa" },
      { icon: "📦", text: "Crunch-Lock Airtight Tins" },
    ],
    corporateGifting: {
      enabled: true,
      badge: "Seasonal Festivity Gifting",
      title: "Corporate Chikki Hampers & Holi Celebration Boxes",
      description:
        "Crispy Til-Sing chikki gift boxes and festive Gujiya platters for client gifting, Makar Sankranti rooftop parties, and Holi gatherings.",
      whatsappNumber: "6352119329",
      whatsappText: "WhatsApp Chikki & Gujiya",
      phoneNumber: "+91 6352119329",
    },
    theme: "holi-uttarayan",
    storyTitle: "Colors of Spring and Winter Crunch",
    storyDescription:
      "From sesame-jaggery winter warmers during kite-flying Makar Sankranti to saffron-scented mawa gujiyas on Holi, celebrate nature's joyful rhythm.",
  },
};

const THEME_STYLES: Record<string, {
  gradient: string;
  accent: string;
  badge: string;
  pillBorder: string;
  buttonClass: string;
  glow1: string;
  glow2: string;
  tagClass: string;
}> = {
  diwali: {
    gradient: "from-[#2a040b] via-[#480a14] to-[#1e0207]",
    accent: "#dfb755",
    badge: "bg-[#dfb755]/20 text-[#dfb755] border-[#dfb755]/40",
    pillBorder: "border-[#dfb755]/30",
    buttonClass: "bg-[#dfb755] hover:bg-[#cf9e32] text-slate-950 shadow-[#dfb755]/30",
    glow1: "bg-[#dfb755]/15",
    glow2: "bg-[#f3b137]/15",
    tagClass: "bg-[#dfb755] text-slate-950 border-amber-300",
  },
  navratri: {
    gradient: "from-[#33081a] via-[#540922] to-[#20030f]",
    accent: "#f59e0b",
    badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    pillBorder: "border-amber-400/30",
    buttonClass: "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-amber-500/30",
    glow1: "bg-amber-500/20",
    glow2: "bg-rose-500/15",
    tagClass: "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-300",
  },
  rakhi: {
    gradient: "from-[#1b0d2b] via-[#32134a] to-[#140822]",
    accent: "#c084fc",
    badge: "bg-purple-500/20 text-purple-200 border-purple-400/40",
    pillBorder: "border-purple-400/30",
    buttonClass: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-purple-500/30",
    glow1: "bg-purple-500/20",
    glow2: "bg-pink-500/15",
    tagClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300",
  },
  ganesh: {
    gradient: "from-[#2d0e04] via-[#4d1808] to-[#1c0802]",
    accent: "#fbbf24",
    badge: "bg-orange-500/20 text-orange-200 border-orange-400/40",
    pillBorder: "border-orange-400/30",
    buttonClass: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-orange-500/30",
    glow1: "bg-orange-500/20",
    glow2: "bg-amber-500/15",
    tagClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300",
  },
  "holi-uttarayan": {
    gradient: "from-[#0a232e] via-[#133b4d] to-[#071922]",
    accent: "#38bdf8",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
    pillBorder: "border-cyan-400/30",
    buttonClass: "bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-500 text-slate-950 shadow-cyan-500/30",
    glow1: "bg-cyan-500/20",
    glow2: "bg-yellow-400/15",
    tagClass: "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 border-cyan-300",
  },
  all: {
    gradient: "from-[#2e050d] via-[#4a0e17] to-[#26040b]",
    accent: "#dfb755",
    badge: "bg-[#dfb755]/20 text-[#dfb755] border-[#dfb755]/40",
    pillBorder: "border-[#dfb755]/30",
    buttonClass: "bg-[#dfb755] hover:bg-[#cf9e32] text-slate-950 shadow-[#dfb755]/30",
    glow1: "bg-[#dfb755]/15",
    glow2: "bg-[#f3b137]/15",
    tagClass: "bg-[#dfb755] text-slate-950 border-amber-300",
  },
};

const FESTIVAL_SECTIONS: FestivalSectionMeta[] = [
  {
    id: "diwali",
    tabLabel: "Diwali & New Year",
    tabIcon: "🪔",
    tabGujarati: "દિવાળી",
    categoryTag: "DIWALI SPECIAL",
    title: "Diwali Royal Hamper Specials",
    subtitle: "Celebrate the Festival of Lights with our finest pure desi ghee hampers & silver vark sweets",
    viewAllText: "View All Diwali Products",
    festivalIds: ["diwali"],
    backgroundImage: "/images/diwali-bg.jpg",
  },
  {
    id: "dussehra",
    tabLabel: "Navratri & Dussehra",
    tabIcon: "💃",
    tabGujarati: "નવરાત્રી & દશેરા",
    categoryTag: "NAVRATRI & DUSSEHRA",
    title: "Navratri & Dussehra Specials",
    subtitle: "Celebrate Vijayadashami with fresh crispy jalebi-fafda and 100% pure fasting sweets",
    viewAllText: "View All Navratri",
    festivalIds: ["dussehra"],
    backgroundImage: "/images/dussehra-jalebi.jpg",
  },
  {
    id: "rakhi",
    tabLabel: "Raksha Bandhan",
    tabIcon: "🧵",
    tabGujarati: "રક્ષાબંધન",
    categoryTag: "RAKSHA BANDHAN SPECIAL",
    title: "Raksha Bandhan Specials",
    subtitle: "Celebrate the eternal bond of brotherhood with handcrafted sweets & designer rakhis",
    viewAllText: "View All Rakhi Specials",
    festivalIds: ["rakhi"],
    backgroundImage: "/images/festive-hamper.jpg",
  },
  {
    id: "ganesh",
    tabLabel: "Ganesh Chaturthi",
    tabIcon: "🐘",
    tabGujarati: "ગણેશોત્સવ",
    categoryTag: "GANESH CHATURTHI SPECIAL",
    title: "Ganesh Chaturthi Specials",
    subtitle: "Devotional 21-modak bhog prasad and handcrafted mawa modaks for Lord Ganesha",
    viewAllText: "View All Modak Bhog",
    festivalIds: ["ganesh"],
    backgroundImage: "/images/modak-bhog.jpg",
  },
  {
    id: "holi-uttarayan",
    tabLabel: "Holi & Uttarayan",
    tabIcon: "🪁",
    tabGujarati: "હોળી & ઉત્તરાયણ",
    categoryTag: "HOLI & UTTARAYAN",
    title: "Holi & Uttarayan Festival Specials",
    subtitle: "Festive sweets for colorful Holi and crispy chikki for kite-flying celebrations",
    viewAllText: "View All Chikki & Gujiya",
    festivalIds: ["holi", "uttarayan"],
    backgroundImage: "/images/holi-gujiya.jpg",
  },
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
    name: "Heritage Mohanthal & Kalol Ghari Box",
    badge: "Gujarati Authentic",
    description: "Slow-roasted gram flour mohanthal in Gir cow ghee with pistachios, paired with Kalol mawa ghari.",
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

function normalizeFestivalId(raw: string): string {
  const t = raw.toLowerCase().trim();
  if (t === "all") return FESTIVAL_SECTIONS[0]?.id || "diwali";
  if (t === "navratri" || t === "dussehra" || t === "dashera" || t === "vijayadashami") return "dussehra";
  if (t === "rakhi" || t === "rakshabandhan" || t === "raksha-bandhan") return "rakhi";
  if (t === "ganesh" || t === "ganeshotsav" || t === "ganpati" || t === "ganesha") return "ganesh";
  if (t === "holi" || t === "uttarayan" || t === "makarsankranti" || t === "holi-uttarayan") return "holi-uttarayan";
  if (t === "diwali" || t === "deepavali" || t === "newyear") return "diwali";
  return t;
}

export default function FestivalsPage() {
  const [activeTab, setActiveTab] = useState(FESTIVAL_SECTIONS[0]?.id || "diwali");
  const [searchQuery, setSearchQuery] = useState("");
  const [productsList, setProductsList] = useState<FestiveProduct[]>(FESTIVE_PRODUCTS);
  const [pageConfig, setPageConfig] = useState<any>(null);

  useEffect(() => {
    fetch("/api/festivals")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          if (data.config) {
            setPageConfig(data.config);
          }
          if (Array.isArray(data.items) && data.items.length > 0) {
            const mapped: FestiveProduct[] = data.items.map((item: any) => ({
              id: item.legacyId || item.id,
              dbVariantId: item.dbVariantId,
              festivalId: item.festivalId,
              festivalName: item.festivalName,
              gujaratiName: item.gujaratiName,
              name: item.name,
              badge: item.badge,
              description: item.description,
              imageUrl: item.imageUrl,
              price: item.price,
              comparePrice: item.comparePrice,
              weight: item.weight,
              tags: item.tags || [],
            }));
            setProductsList(mapped);
          }
        }
      })
      .catch(() => {});

    function syncFromUrl() {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "").toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const target = params.get("festival") || params.get("tab") || hash;
        if (target) {
          const norm = normalizeFestivalId(target);
          if (norm) {
            setActiveTab(norm);
          }
        }
      }
    }

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const sectionsList: FestivalSectionMeta[] = useMemo(() => {
    if (Array.isArray(pageConfig?.sections) && pageConfig.sections.length > 0) {
      return pageConfig.sections
        .filter((s: any) => s.enabled !== false)
        .map((s: any): FestivalSectionMeta => ({
          id: s.id,
          categoryTag: s.categoryTag || s.title?.toUpperCase() || "FESTIVAL SPECIAL",
          title: s.title,
          subtitle: s.subtitle || "",
          viewAllText: s.viewAllText || "View All Products",
          festivalIds: Array.isArray(s.festivalIds) && s.festivalIds.length > 0 ? s.festivalIds : [s.id],
          tabLabel: s.tabLabel || s.title,
          tabIcon: s.tabIcon || "🪔",
          tabGujarati: s.tabGujarati || "",
          backgroundImage: s.backgroundImage || DEFAULT_FESTIVAL_PAGES[s.id]?.hero?.backgroundImage,
          enabled: s.enabled,
        }));
    }
    return FESTIVAL_SECTIONS;
  }, [pageConfig?.sections]);

  // Ensure activeTab points to a valid available section if custom config loads
  useEffect(() => {
    if (sectionsList.length > 0) {
      const exists = sectionsList.some((s) => s.id === activeTab);
      if (!exists) {
        setActiveTab(sectionsList[0].id);
      }
    }
  }, [sectionsList, activeTab]);

  const tabsList = useMemo(() => {
    return sectionsList.map((s: FestivalSectionMeta) => ({
      id: s.id,
      label: s.tabLabel || s.title,
      icon: s.tabIcon || "🪔",
      gujarati: s.tabGujarati || "",
    }));
  }, [sectionsList]);

  const getTabCount = (tabId: string) => {
    if (tabId === "all") return productsList.length;
    const section = sectionsList.find((s: FestivalSectionMeta) => s.id === tabId);
    if (!section) return 0;
    return productsList.filter((p) => section.festivalIds.includes(p.festivalId)).length;
  };

  // Resolve current active festival custom page config
  const activeFestivalData = useMemo(() => {
    if (activeTab === "all") return null;
    const currentSection = sectionsList.find((s: FestivalSectionMeta) => s.id === activeTab);
    const serverCustom = pageConfig?.festivalPages?.[activeTab];
    const defaultCustom = DEFAULT_FESTIVAL_PAGES[activeTab];

    const fallbackHero = {
      badgeText: `${currentSection?.tabIcon || "🪔"} ${currentSection?.categoryTag || currentSection?.title?.toUpperCase() || "FESTIVAL SPECIAL"}`,
      phone: "+91 6352119329",
      titlePrefix: "Celebrate with Pure Desi Ghee",
      titleHighlight: currentSection?.title || "Handcrafted Sweets",
      subtitle: currentSection?.subtitle || "Authentic traditional sweets prepared fresh in our Anand workshop.",
      button1Text: `Shop ${currentSection?.tabLabel || "Festival"} Mithai 🪔`,
      button1Link: "#festive-catalog",
      button2Text: "Corporate Gifting 🎁",
      button2Link: "#corporate-gifting",
      backgroundImage: currentSection?.backgroundImage || "/images/festive-hamper.jpg",
    };

    return {
      ...defaultCustom,
      ...serverCustom,
      hero: {
        ...fallbackHero,
        ...defaultCustom?.hero,
        ...serverCustom?.hero,
      },
      couponPromo: {
        enabled: true,
        text: `${currentSection?.tabLabel || "Festival"} Special: Extra 15% OFF on ₹999+`,
        code: `${activeTab.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}15`,
        ...defaultCustom?.couponPromo,
        ...serverCustom?.couponPromo,
      },
      corporateGifting: {
        enabled: true,
        badge: `${currentSection?.tabLabel || "Festival"} Gifting`,
        title: `${currentSection?.tabLabel || "Festive"} Corporate Hampers with Your Brand Logo`,
        description:
          "Custom tin boxes, dry fruit platters, and silver-foiled mithai boxes packed with your company's custom greeting cards and ribbon branding.",
        whatsappNumber: "6352119329",
        whatsappText: `WhatsApp ${currentSection?.tabLabel || "Festival"} Inquiry`,
        phoneNumber: "+91 6352119329",
        ...defaultCustom?.corporateGifting,
        ...serverCustom?.corporateGifting,
      },
      trustPills: serverCustom?.trustPills || defaultCustom?.trustPills || [
        { icon: "🧈", text: "100% Shuddh Desi Ghee" },
        { icon: "🥈", text: "99.9% Pure Silver Vark" },
        { icon: "🎁", text: "Royal Festive Packaging" },
        { icon: "🚚", text: "Same-Day Gujarat Dispatch" },
      ],
      storyTitle: serverCustom?.storyTitle || defaultCustom?.storyTitle || `${currentSection?.tabLabel || "Festival"} Celebrations`,
      storyDescription:
        serverCustom?.storyDescription ||
        defaultCustom?.storyDescription ||
        `Celebrate ${currentSection?.tabLabel || "this auspicious occasion"} with traditional sweets handcrafted with pure ingredients and devotion.`,
    };
  }, [activeTab, pageConfig, sectionsList]);

  // Resolve Theme styling
  const themeKey = activeTab === "all" ? "all" : (activeFestivalData?.theme || activeTab);
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.all;

  // Resolve Active Hero
  const hero = useMemo(() => {
    if (activeFestivalData?.hero) {
      return {
        ...DEFAULT_HERO,
        ...pageConfig?.hero,
        ...activeFestivalData.hero,
        trustPills: activeFestivalData.trustPills || pageConfig?.hero?.trustPills || DEFAULT_HERO.trustPills,
        couponPromo: activeFestivalData.couponPromo || pageConfig?.hero?.couponPromo || DEFAULT_HERO.couponPromo,
      };
    }
    return pageConfig?.hero || DEFAULT_HERO;
  }, [activeFestivalData, pageConfig?.hero]);

  // Resolve Active Corporate Gifting
  const corporate = useMemo(() => {
    if (activeFestivalData?.corporateGifting) {
      return {
        ...DEFAULT_CORPORATE,
        ...pageConfig?.corporateGifting,
        ...activeFestivalData.corporateGifting,
      };
    }
    return pageConfig?.corporateGifting || DEFAULT_CORPORATE;
  }, [activeFestivalData, pageConfig?.corporateGifting]);

  const trustPerks = pageConfig?.trustPerks || DEFAULT_TRUST_PERKS;

  const isSearching = searchQuery.trim().length > 0;
  const searchResults = productsList.filter((prod) => {
    const q = searchQuery.toLowerCase();
    return (
      prod.name.toLowerCase().includes(q) ||
      prod.festivalName.toLowerCase().includes(q) ||
      prod.gujaratiName.toLowerCase().includes(q) ||
      prod.description.toLowerCase().includes(q)
    );
  });

  const activeSectionList: FestivalSectionMeta[] =
    activeTab === "all"
      ? sectionsList
      : sectionsList.filter((s: FestivalSectionMeta) => s.id === activeTab);

  const handleTabClick = (festId: string) => {
    setActiveTab(festId);
    setSearchQuery("");
    if (typeof window !== "undefined") {
      const newUrl = festId === "all" ? "/festivals" : `/festivals#${festId}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-24 text-slate-900 selection:bg-[#dfb755] selection:text-[#3a0913] transition-colors duration-500">
      {/* 1. DYNAMIC FESTIVAL HERO BANNER (TRANSFORMS COMPLETELY PER FESTIVAL!) */}
      <section
        className={`relative overflow-hidden bg-gradient-to-b ${theme.gradient} text-white py-14 sm:py-20 shadow-2xl transition-all duration-700 ease-in-out`}
      >
        {/* Dynamic Festival Background Photo with Cross-fade and Vignette */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700">
          {hero.backgroundImage ? (
            <Image
              key={hero.backgroundImage}
              src={hero.backgroundImage}
              alt={`${hero.titlePrefix || "Festival"} Sweets Celebration`}
              fill
              priority
              className="object-cover object-center scale-105 filter saturate-105 brightness-105 contrast-105 transition-all duration-700 animate-fadeIn"
            />
          ) : null}
          {/* Ambient Dark Gradient Vignette for high readability and warm glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65 backdrop-blur-[0.5px]" />
        </div>

        {/* Ambient Festival Glow Orbs */}
        <div className={`absolute top-0 right-1/4 w-96 h-96 rounded-full ${theme.glow1} blur-3xl pointer-events-none z-1`} />
        <div className={`absolute bottom-0 left-1/4 w-96 h-96 rounded-full ${theme.glow2} blur-3xl pointer-events-none z-1`} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <InView
            variants={{
              hidden: { opacity: 0, y: 25, scale: 0.96 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
          >
            {/* Top Announcement Badge */}
            <div
              className={`inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full ${theme.badge} text-xs font-extrabold uppercase tracking-wider shadow-md backdrop-blur-md transition-all duration-500`}
            >
              <span>{hero.badgeText || "🪔 SPECIAL FESTIVE COLLECTION"}</span>
              {hero.phone && (
                <>
                  <span className="opacity-40">•</span>
                  <span>📞 {hero.phone}</span>
                </>
              )}
            </div>

            {/* Dynamic Headline Prefix + Gold Highlight */}
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
              {hero.titlePrefix || "Celebrate Indian Festivals with"}{" "}
              <span className="italic drop-shadow-[0_2px_12px_rgba(223,183,85,0.4)]" style={{ color: theme.accent }}>
                {hero.titleHighlight || "Shuddh Mithai"}
              </span>
            </h1>

            <p className="mt-4 max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed font-light drop-shadow-sm">
              {hero.subtitle || DEFAULT_HERO.subtitle}
            </p>

            {/* Hero Quick CTA Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href={hero.button1Link || "#festive-catalog"}
                className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold ${theme.buttonClass} transition shadow-xl hover:scale-105 active:scale-95 duration-200 cursor-pointer`}
              >
                {hero.button1Text || "Shop Festival Mithai 🪔"}
              </a>
              <a
                href={hero.button2Link || "#corporate-gifting"}
                className="px-6 py-3 rounded-full text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/25 text-white transition hover:scale-105 active:scale-95 duration-200 cursor-pointer backdrop-blur-md shadow-md"
              >
                {hero.button2Text || "Corporate Gifting 🎁"}
              </a>
            </div>
          </InView>

          {/* Festival Trust Pills & Coupon */}
          <InView
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1 },
            }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
          >
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 pt-2 text-xs font-semibold text-white/95">
              {(hero.trustPills || DEFAULT_HERO.trustPills).map((pill: any, idx: number) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm"
                >
                  <span className="text-sm">{pill.icon}</span> <span>{pill.text}</span>
                </span>
              ))}
            </div>

            {/* Coupon Code Banner tailored per festival */}
            {hero.couponPromo?.enabled !== false && (
              <div className="pt-4 max-w-md mx-auto">
                <div
                  className="p-3 rounded-2xl bg-gradient-to-r from-white/15 via-white/25 to-white/15 border border-white/30 backdrop-blur-md flex items-center justify-between text-xs text-white shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <span className="font-medium text-left">{hero.couponPromo?.text || "Festive Offer: Flat 15% OFF on ₹999+"}</span>
                  </div>
                  <span
                    className="font-black px-3 py-1 rounded-xl text-[11px] tracking-wider uppercase shadow-md shrink-0 ml-2 text-slate-950"
                    style={{ backgroundColor: theme.accent }}
                  >
                    CODE: {hero.couponPromo?.code || "FESTIVE15"}
                  </span>
                </div>
              </div>
            )}
          </InView>
        </div>
      </section>

      {/* 2. FESTIVAL SELECTOR BAR (Sticky Filter Pills) */}
      <section className="sticky top-[64px] z-30 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-amber-900/10 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2 shrink-0">
              {tabsList.map((fest) => {
                const isActive = activeTab === fest.id;
                const count = getTabCount(fest.id);
                return (
                  <button
                    key={fest.id}
                    onClick={() => handleTabClick(fest.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/25 scale-105"
                        : "bg-white text-slate-700 hover:bg-amber-50 hover:text-[#4a0e17] border border-slate-200/80"
                    }`}
                  >
                    <span>{fest.icon}</span>
                    <span>{fest.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive ? "bg-[#dfb755] text-slate-950" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="relative shrink-0 hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search festival sweets..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white focus:border-[#4a0e17] focus:ring-1 focus:ring-[#4a0e17] outline-none w-52 transition"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CULTURAL HERITAGE NOTE (Appears on specific festival page!) */}
      {activeFestivalData?.storyTitle && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start sm:items-center gap-3.5 text-xs text-amber-950 shadow-xs">
            <span className="text-2xl shrink-0">🪔</span>
            <div>
              <h4 className="font-bold text-amber-900 text-sm mb-0.5">
                {activeFestivalData.storyTitle}
              </h4>
              <p className="text-amber-800 leading-relaxed font-light">
                {activeFestivalData.storyDescription}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4. FESTIVE SWEETS SHOWCASE (Organized Uniform Grid Layout) */}
      <main id="festive-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Search Mode View */}
        {isSearching ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#4a0e17]">
                  Search Results for &ldquo;{searchQuery}&rdquo;
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Found {searchResults.length} festive sweets matching your search
                </p>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-[#4a0e17] hover:underline cursor-pointer"
              >
                Clear Search ✕
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
                <span className="text-4xl block mb-2">🔍</span>
                <p className="font-bold text-slate-700">No festival sweets matched your search</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for &quot;Kaju&quot;, &quot;Modak&quot;, &quot;Jalebi&quot;, or &quot;Hamper&quot;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((prod) => renderProductCard(prod))}
              </div>
            )}
          </div>
        ) : (
          /* Normal Structured Festival Sections View */
          <div className="space-y-10 sm:space-y-12">
            {activeSectionList.map((section: FestivalSectionMeta) => {
              const sectionProducts = productsList.filter((p) =>
                section.festivalIds.includes(p.festivalId)
              );

              if (sectionProducts.length === 0) return null;

              const hasCustomBg = Boolean(section.backgroundImage);

              return (
                <section
                  key={section.id}
                  className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all duration-300 ${
                    hasCustomBg
                      ? "text-white border-[#dfb755]/80 shadow-2xl shadow-[#dfb755]/25"
                      : "bg-white text-slate-900 border-amber-950/10 shadow-sm"
                  }`}
                >
                  {/* Festival Background Photo */}
                  {hasCustomBg && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                      <Image
                        src={section.backgroundImage!}
                        alt={`${section.title} Background`}
                        fill
                        className="object-cover object-center scale-100 filter brightness-100 contrast-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />
                    </div>
                  )}

                  {/* Section Header */}
                  <div
                    className={`relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-5 sm:p-6 rounded-2xl mb-6 ${
                      hasCustomBg
                        ? "bg-black/40 backdrop-blur-md border border-white/20 shadow-lg text-white"
                        : "bg-transparent border-b border-slate-100 pb-6"
                    }`}
                  >
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md ${
                          hasCustomBg
                            ? theme.tagClass
                            : "text-[#b89130] bg-amber-50"
                        }`}
                      >
                        <span>{section.tabIcon || "🪔"}</span>
                        <span>{section.categoryTag}</span>
                      </span>
                      <h2
                        className={`font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold leading-tight mt-2 ${
                          hasCustomBg
                            ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                            : "text-[#4a0e17]"
                        }`}
                      >
                        {section.title}
                      </h2>
                      <p
                        className={`text-xs sm:text-sm mt-1 max-w-2xl ${
                          hasCustomBg
                            ? "text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-normal"
                            : "text-slate-500"
                        }`}
                      >
                        {section.subtitle}
                      </p>
                    </div>

                    {/* Quick Section View Action */}
                    {activeTab === "all" && (
                      <button
                        onClick={() => {
                          handleTabClick(section.id);
                          window.scrollTo({ top: 380, behavior: "smooth" });
                        }}
                        className={`text-xs font-extrabold flex items-center gap-2 transition shrink-0 cursor-pointer ${
                          hasCustomBg
                            ? "bg-[#dfb755] hover:bg-[#eac468] text-slate-950 px-5 py-2.5 rounded-full shadow-xl hover:scale-105 active:scale-95 duration-200"
                            : "text-[#b89130] hover:text-[#4a0e17]"
                        }`}
                      >
                        <span>{section.viewAllText}</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>

                  {/* UNIFIED BALANCED GRID */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6">
                    {sectionProducts.map((prod) => renderProductCard(prod))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* 5. VALUE PROPOSITIONS & TRUST BANNER */}
        <InView
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.96 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          viewOptions={{ margin: "0px 0px -40px 0px" }}
        >
          <div
            className={`mt-14 sm:mt-16 rounded-3xl bg-gradient-to-r ${theme.gradient} text-white p-8 sm:p-10 shadow-xl border border-white/15 transition-all duration-500`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {(trustPerks || DEFAULT_TRUST_PERKS).map((perk: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center text-center space-y-2">
                  <div
                    className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl shadow-sm"
                    style={{ color: theme.accent }}
                  >
                    {perk.icon}
                  </div>
                  <h4 className="font-bold text-sm" style={{ color: theme.accent }}>
                    {perk.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    {perk.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </InView>

        {/* 6. CORPORATE & FAMILY BULK GIFTING BANNER (TAILORED PER FESTIVAL) */}
        {corporate.enabled !== false && (
          <InView
            variants={{
              hidden: { opacity: 0, y: 30, scale: 0.96 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            viewOptions={{ margin: "0px 0px -40px 0px" }}
          >
            <div
              id="corporate-gifting"
              className={`mt-8 rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-8 sm:p-10 shadow-xl border border-white/20 relative overflow-hidden transition-all duration-500`}
            >
              <div className="relative z-10 max-w-2xl space-y-4">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md"
                  style={{ backgroundColor: `${theme.accent}33`, color: theme.accent }}
                >
                  {corporate.badge || "Corporate & Family Bulk Orders"}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-white">
                  {corporate.title || "Festive Corporate Hampers with Your Brand Logo"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
                  {corporate.description || DEFAULT_CORPORATE.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href={`https://wa.me/${(corporate.whatsappNumber || "916352119329").replace(
                      /[^0-9]/g,
                      ""
                    )}?text=Hello%20Vardayini%20Sweets,%20I%20would%20like%20to%20inquire%20about%20${encodeURIComponent(
                      activeTab === "all" ? "Festival Specials" : activeTab.toUpperCase()
                    )}%20Bulk%20Orders`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 rounded-full text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white transition shadow-md flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 duration-200"
                  >
                    <span>💬</span>
                    <span>{corporate.whatsappText || "WhatsApp Bulk Inquiry"}</span>
                  </a>
                  {corporate.phoneNumber && (
                    <a
                      href={`tel:${corporate.phoneNumber.replace(/[^0-9+]/g, "")}`}
                      className="px-6 py-3 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer"
                    >
                      Call: {corporate.phoneNumber}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </InView>
        )}
      </main>
    </div>
  );

  // Helper renderer for unified, balanced product card
  function renderProductCard(prod: FestiveProduct) {
    const discount =
      prod.comparePrice > prod.price
        ? Math.round(((prod.comparePrice - prod.price) / prod.comparePrice) * 100)
        : 0;

    return (
      <article
        key={prod.id}
        className="group bg-[#fdfbf7] sm:bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-[#dfb755]/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden hover:-translate-y-1"
      >
        {/* Product Visual Area */}
        <div>
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
            <Image
              src={prod.imageUrl}
              alt={prod.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            />
            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
              <span className="bg-[#4a0e17]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-white/10">
                {prod.festivalName}
              </span>
            </div>
            <div className="absolute top-2.5 right-2.5">
              <span className="bg-[#dfb755] text-slate-950 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                {prod.badge}
              </span>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-4 sm:p-5 space-y-2">
            {/* Rating */}
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex text-amber-500">★★★★★</div>
              <span className="font-semibold text-slate-700 text-[11px]">4.9</span>
              <span className="text-slate-400 text-[11px]">(48)</span>
            </div>

            <div className="text-[11px] font-bold text-[#b89130] uppercase tracking-wider">
              {prod.gujaratiName}
            </div>

            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900 group-hover:text-[#4a0e17] transition leading-snug line-clamp-1">
              {prod.name}
            </h3>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-light">
              {prod.description}
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/80 border border-amber-200/50 text-amber-900 text-[11px] font-medium">
                <span>⚖️</span>
                <span>
                  Pack size: <strong>{prod.weight}</strong>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer (Price & Action) */}
        <div className="p-4 sm:p-5 pt-0 mt-2 border-t border-slate-100">
          <div className="pt-3 space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#4a0e17]">
                  {formatInr(prod.price)}
                </span>
                {prod.comparePrice > prod.price && (
                  <span className="text-xs text-slate-400 line-through">
                    {formatInr(prod.comparePrice)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {discount}% OFF
                </span>
              )}
            </div>

            <p className="text-[10px] text-emerald-600 font-medium">
              ✓ Fresh Batch • Pure Desi Ghee
            </p>

            <AddToCartButton
              variantId={prod.dbVariantId || prod.id}
              label="Add to Festive Box"
              className="w-full bg-[#4a0e17] hover:bg-[#32060e] text-white rounded-full py-2.5 px-4 text-xs font-bold transition shadow-md active:scale-95 cursor-pointer text-center block"
            />
          </div>
        </div>
      </article>
    );
  }
}
