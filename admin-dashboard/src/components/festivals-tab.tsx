"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  UiConfig,
  FestivalPageConfig,
  FestivalSpecificPageConfig,
  FestivalProductItem,
  FestivalHeroConfig,
  FestivalSectionConfig,
  FestivalTrustPerk,
  FestivalCorporateGiftingConfig,
  api,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";
import { getPublicStoreUrl } from "@/lib/store-url";

interface FestivalsTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

const DEFAULT_HERO: FestivalHeroConfig = {
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

const DEFAULT_SECTIONS: FestivalSectionConfig[] = [
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
    enabled: true,
    order: 1,
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
    enabled: true,
    order: 2,
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
    enabled: true,
    order: 3,
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
    enabled: true,
    order: 4,
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
    enabled: true,
    order: 5,
  },
];

const DEFAULT_TRUST_PERKS: FestivalTrustPerk[] = [
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
    title: "Traditional Karigar Recipes",
    description: "Authentic heritage recipes preserved across four generations since 1976.",
  },
  {
    icon: "🚚",
    title: "Express All-India Delivery",
    description: "Same-day dispatch for Gujarat, 2-3 days delivery across India with freshness lock.",
  },
];

const DEFAULT_CORPORATE: FestivalCorporateGiftingConfig = {
  enabled: true,
  badge: "Corporate & Family Bulk Orders",
  title: "Festive Corporate Hampers with Your Brand Logo",
  description:
    "Custom tin boxes, dry fruit platters, and silver-foiled mithai boxes packed with your company's custom greeting cards and ribbon branding. Special wholesale discounts for orders above 25 boxes.",
  whatsappNumber: "6352119329",
  whatsappText: "WhatsApp Bulk Inquiry",
  phoneNumber: "+91 6352119329",
};

const DEFAULT_FESTIVAL_PAGES: Record<string, FestivalSpecificPageConfig> = {
  diwali: {
    hero: {
      badgeText: "🪔 SHUBH DIWALI & NUTAN VARSHABHINANDAN",
      phone: "+91 6352119329",
      titlePrefix: "Celebrate Shubh Deepavali & New Year with",
      titleHighlight: "Royal Desi Ghee Mithai",
      subtitle:
        "Handcrafted Diwali gift hampers, silver vark Kaju Katli, slow-roasted Mohanthal, and authentic Surati Ghari crafted with 100% pure Gir cow ghee.",
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

const THEME_OPTIONS = [
  { id: "diwali", label: "Diwali Royal Burgundy & Gold", color: "#dfb755", bg: "bg-[#4a0e17]" },
  { id: "navratri", label: "Navratri Crimson & Garba Amber", color: "#f59e0b", bg: "bg-[#540922]" },
  { id: "rakhi", label: "Raksha Bandhan Royal Silk Indigo", color: "#c084fc", bg: "bg-[#32134a]" },
  { id: "ganesh", label: "Ganesh Temple Saffron & Modak Gold", color: "#fbbf24", bg: "bg-[#4d1808]" },
  { id: "holi-uttarayan", label: "Holi & Uttarayan Festive Turquoise", color: "#38bdf8", bg: "bg-[#133b4d]" },
];

const PRESET_EMOJIS = ["🪔", "💃", "🧵", "🐘", "🪁", "🦚", "🍯", "🥥", "🌸", "🕉️", "🌙", "🥁", "🌾", "🎁", "✨", "🔥", "🥭"];

export function FestivalsTab({ config, onRefresh }: FestivalsTabProps) {
  // Page selector: "all" or specific festival id
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [subTab, setSubTab] = useState<string>("hero");

  // State from server
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productsList, setProductsList] = useState<FestivalProductItem[]>([]);

  // Hero form state (Global)
  const [heroState, setHeroState] = useState<FestivalHeroConfig>(
    config?.festivalPage?.hero || DEFAULT_HERO
  );

  // Sections form state (Festival list)
  const [sectionsState, setSectionsState] = useState<FestivalSectionConfig[]>(
    config?.festivalPage?.sections || DEFAULT_SECTIONS
  );

  // Trust perks state (Global)
  const [trustPerksState, setTrustPerksState] = useState<FestivalTrustPerk[]>(
    config?.festivalPage?.trustPerks || DEFAULT_TRUST_PERKS
  );

  // Corporate bulk gifting state (Global)
  const [corporateState, setCorporateState] = useState<FestivalCorporateGiftingConfig>(
    config?.festivalPage?.corporateGifting || DEFAULT_CORPORATE
  );

  // Festival-specific pages state map
  const [festivalPagesState, setFestivalPagesState] = useState<Record<string, FestivalSpecificPageConfig>>(
    config?.festivalPage?.festivalPages || DEFAULT_FESTIVAL_PAGES
  );

  // Filter state for products list
  const [productSearch, setProductSearch] = useState("");

  // Product Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FestivalProductItem | null>(null);
  const [productToDelete, setProductToDelete] = useState<FestivalProductItem | null>(null);

  // Festival Creation & Deletion Modals
  const [showAddFestivalModal, setShowAddFestivalModal] = useState(false);
  const [festivalToDelete, setFestivalToDelete] = useState<FestivalSectionConfig | null>(null);

  // Form state for creating a new festival
  const [newFestId, setNewFestId] = useState("");
  const [newFestLabel, setNewFestLabel] = useState("");
  const [newFestIcon, setNewFestIcon] = useState("🪔");
  const [newFestGujarati, setNewFestGujarati] = useState("");
  const [newFestCategoryTag, setNewFestCategoryTag] = useState("");
  const [newFestTitle, setNewFestTitle] = useState("");
  const [newFestSubtitle, setNewFestSubtitle] = useState("");
  const [newFestBackgroundImage, setNewFestBackgroundImage] = useState("/images/festive-hamper.jpg");
  const [newFestTheme, setNewFestTheme] = useState("diwali");
  const [newFestCouponCode, setNewFestCouponCode] = useState("");
  const [newFestCouponText, setNewFestCouponText] = useState("");

  // Form fields for Add / Edit Product
  const [formName, setFormName] = useState("");
  const [formGujaratiName, setFormGujaratiName] = useState("");
  const [formFestivalId, setFormFestivalId] = useState("diwali");
  const [formBadge, setFormBadge] = useState("Festive Special");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("/images/hamper.jpg");
  const [formPrice, setFormPrice] = useState(750);
  const [formComparePrice, setFormComparePrice] = useState(890);
  const [formWeight, setFormWeight] = useState("1 kg");
  const [formStock, setFormStock] = useState(100);
  const [modalSaving, setModalSaving] = useState(false);

  // Load latest festival data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const res = await api.getFestivalData();
      if (res.config) {
        if (res.config.hero) setHeroState(res.config.hero);
        if (res.config.sections) setSectionsState(res.config.sections);
        if (res.config.trustPerks) setTrustPerksState(res.config.trustPerks);
        if (res.config.corporateGifting) setCorporateState(res.config.corporateGifting);
        if (res.config.festivalPages) {
          setFestivalPagesState({
            ...DEFAULT_FESTIVAL_PAGES,
            ...res.config.festivalPages,
          });
        }
      }
      setProductsList(res.items || []);
    } catch (err) {
      toast.error("Failed to load festival data");
    } finally {
      setIsLoading(false);
    }
  }

  // Save all page config (Global + Festival-specific pages)
  async function handleSaveGlobalConfig(
    overrideSections?: FestivalSectionConfig[],
    overridePages?: Record<string, FestivalSpecificPageConfig>
  ) {
    setIsSaving(true);
    try {
      const payload: FestivalPageConfig = {
        hero: heroState,
        sections: overrideSections || sectionsState,
        trustPerks: trustPerksState,
        corporateGifting: corporateState,
        festivalPages: overridePages || festivalPagesState,
      };

      await api.saveFestivalConfig(payload);
      toast.success(
        selectedPageId === "all"
          ? "✓ All Festival Specials settings saved successfully!"
          : `✓ "${currentSection?.tabLabel || selectedPageId}" festival page updated on storefront!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update festival settings");
    } finally {
      setIsSaving(false);
    }
  }

  // Current active festival section
  const currentSection = sectionsState.find((s) => s.id === selectedPageId);
  const currentSectionIndex = sectionsState.findIndex((s) => s.id === selectedPageId);

  // Get current active festival custom config
  const currentFestivalConfig: FestivalSpecificPageConfig = useMemo(() => {
    if (selectedPageId === "all") return {};
    const defaultData = DEFAULT_FESTIVAL_PAGES[selectedPageId] || {};
    const existing = festivalPagesState[selectedPageId] || {};
    return {
      ...defaultData,
      ...existing,
      hero: {
        badgeText: `${currentSection?.tabIcon || "🪔"} ${currentSection?.tabLabel?.toUpperCase() || selectedPageId.toUpperCase()} SPECIALS`,
        titlePrefix: `Celebrate ${currentSection?.tabLabel || selectedPageId} with`,
        titleHighlight: "Shuddh Mithai",
        subtitle: currentSection?.subtitle || DEFAULT_HERO.subtitle,
        button1Text: `Shop ${currentSection?.tabLabel || "Festival"} Mithai 🪔`,
        button1Link: "#festive-catalog",
        button2Text: "Corporate Gifting 🎁",
        button2Link: "#corporate-gifting",
        backgroundImage: currentSection?.backgroundImage || "/images/festive-hamper.jpg",
        ...defaultData.hero,
        ...existing.hero,
      },
      couponPromo: {
        enabled: true,
        text: `${currentSection?.tabLabel || "Festival"} Offer: Flat 15% OFF on ₹999+`,
        code: `${selectedPageId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}15`,
        ...defaultData.couponPromo,
        ...existing.couponPromo,
      },
      corporateGifting: {
        enabled: true,
        badge: `${currentSection?.tabLabel || "Festival"} Corporate Orders`,
        title: `${currentSection?.tabLabel || "Festive"} Corporate Hampers with Your Brand Logo`,
        description: DEFAULT_CORPORATE.description,
        whatsappNumber: "6352119329",
        whatsappText: `WhatsApp ${currentSection?.tabLabel || "Festival"} Inquiry`,
        phoneNumber: "+91 6352119329",
        ...defaultData.corporateGifting,
        ...existing.corporateGifting,
      },
      trustPills: existing.trustPills || defaultData.trustPills || DEFAULT_HERO.trustPills,
    };
  }, [selectedPageId, festivalPagesState, currentSection]);

  // Update a nested field for the selected festival
  function updateFestField(
    section: "hero" | "couponPromo" | "corporateGifting" | "theme" | "storyTitle" | "storyDescription",
    fieldOrValue: any,
    value?: any
  ) {
    if (selectedPageId === "all") return;
    setFestivalPagesState((prev) => {
      const current = prev[selectedPageId] || DEFAULT_FESTIVAL_PAGES[selectedPageId] || {};

      if (section === "theme" || section === "storyTitle" || section === "storyDescription") {
        return {
          ...prev,
          [selectedPageId]: {
            ...current,
            [section]: fieldOrValue,
          },
        };
      }

      const nextSection = {
        ...current[section],
        [fieldOrValue]: value,
      };

      return {
        ...prev,
        [selectedPageId]: {
          ...current,
          [section]: nextSection,
        },
      };
    });
  }

  // Update a trust pill for the selected festival
  function updateFestPill(idx: number, key: "icon" | "text", val: string) {
    if (selectedPageId === "all") return;
    setFestivalPagesState((prev) => {
      const current = prev[selectedPageId] || DEFAULT_FESTIVAL_PAGES[selectedPageId] || {};
      const currentPills = [...(current.trustPills || DEFAULT_HERO.trustPills)];
      currentPills[idx] = {
        ...currentPills[idx],
        [key]: val,
      };
      return {
        ...prev,
        [selectedPageId]: {
          ...current,
          trustPills: currentPills,
        },
      };
    });
  }

  // Update Section metadata for the current selected festival
  function updateCurrentSectionMetadata(field: keyof FestivalSectionConfig, val: any) {
    if (selectedPageId === "all" || currentSectionIndex === -1) return;
    const next = [...sectionsState];
    next[currentSectionIndex] = {
      ...next[currentSectionIndex],
      [field]: val,
    };
    setSectionsState(next);
  }

  // Reset to default festive preset copy
  function handleResetPreset(festId: string) {
    const preset = DEFAULT_FESTIVAL_PAGES[festId];
    if (preset) {
      setFestivalPagesState((prev) => ({
        ...prev,
        [festId]: JSON.parse(JSON.stringify(preset)),
      }));
      toast.success(`✓ "${festId}" reset to traditional festive preset`);
    } else {
      toast.info("No preset available for custom festival.");
    }
  }

  // Open Add Festival Modal
  function handleOpenAddFestival() {
    setNewFestId("");
    setNewFestLabel("");
    setNewFestIcon("🪔");
    setNewFestGujarati("");
    setNewFestCategoryTag("");
    setNewFestTitle("");
    setNewFestSubtitle("");
    setNewFestBackgroundImage("/images/festive-hamper.jpg");
    setNewFestTheme("diwali");
    setNewFestCouponCode("");
    setNewFestCouponText("");
    setShowAddFestivalModal(true);
  }

  // Create New Festival
  async function handleCreateFestival() {
    const label = newFestLabel.trim();
    if (!label) {
      toast.error("Festival name is required");
      return;
    }

    let slug = newFestId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (!slug) {
      slug = label.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    }

    if (sectionsState.some((s) => s.id === slug)) {
      toast.error(`A festival with ID "${slug}" already exists. Please choose a unique identifier.`);
      return;
    }

    const newSection: FestivalSectionConfig = {
      id: slug,
      tabLabel: label,
      tabIcon: newFestIcon || "🪔",
      tabGujarati: newFestGujarati.trim() || label,
      categoryTag: newFestCategoryTag.trim().toUpperCase() || `${label.toUpperCase()} SPECIAL`,
      title: newFestTitle.trim() || `${label} Specials`,
      subtitle: newFestSubtitle.trim() || `Celebrate ${label} with pure desi ghee sweets and festive hampers.`,
      viewAllText: `View All ${label}`,
      festivalIds: [slug],
      backgroundImage: newFestBackgroundImage || "/images/festive-hamper.jpg",
      enabled: true,
      order: sectionsState.length + 1,
    };

    const newPageConfig: FestivalSpecificPageConfig = {
      hero: {
        badgeText: `${newFestIcon || "🪔"} ${label.toUpperCase()} SPECIALS`,
        phone: "+91 6352119329",
        titlePrefix: `Celebrate ${label} with`,
        titleHighlight: "Shuddh Mithai",
        subtitle: newSection.subtitle,
        button1Text: `Shop ${label} Mithai 🪔`,
        button1Link: "#festive-catalog",
        button2Text: "Corporate Gifting 🎁",
        button2Link: "#corporate-gifting",
        backgroundImage: newSection.backgroundImage,
      },
      couponPromo: {
        enabled: true,
        text: newFestCouponText.trim() || `${label} Special: Extra 15% OFF on ₹999+`,
        code: newFestCouponCode.trim().toUpperCase() || `${slug.slice(0, 8).toUpperCase()}15`,
      },
      trustPills: [
        { icon: "🧈", text: "100% Shuddh Desi Ghee" },
        { icon: "🥈", text: "99.9% Pure Silver Vark" },
        { icon: "🎁", text: "Royal Festive Packaging" },
        { icon: "🚚", text: "Same-Day Gujarat Dispatch" },
      ],
      corporateGifting: {
        enabled: true,
        badge: `${label} Bulk Gifting`,
        title: `${label} Corporate Hampers with Your Brand Logo`,
        description: DEFAULT_CORPORATE.description,
        whatsappNumber: "6352119329",
        whatsappText: `WhatsApp ${label} Bulk Inquiry`,
        phoneNumber: "+91 6352119329",
      },
      theme: newFestTheme,
      storyTitle: `${label} Sweet Celebrations`,
      storyDescription: `Celebrate ${label} with timeless heritage sweets handcrafted with devotion in Gir cow ghee.`,
    };

    const updatedSections = [...sectionsState, newSection];
    const updatedPages = {
      ...festivalPagesState,
      [slug]: newPageConfig,
    };

    setSectionsState(updatedSections);
    setFestivalPagesState(updatedPages);
    setSelectedPageId(slug);
    setSubTab("hero");
    setShowAddFestivalModal(false);

    toast.success(`✓ Festival "${label}" created! Saving all settings...`);
    await handleSaveGlobalConfig(updatedSections, updatedPages);
  }

  // Delete Festival Action
  async function handleConfirmDeleteFestival() {
    if (!festivalToDelete) return;
    const targetId = festivalToDelete.id;

    if (targetId === "all") {
      toast.error("Cannot delete the All Festivals overview page.");
      return;
    }

    const updatedSections = sectionsState.filter((s) => s.id !== targetId);
    const updatedPages = { ...festivalPagesState };
    delete updatedPages[targetId];

    setSectionsState(updatedSections);
    setFestivalPagesState(updatedPages);
    setFestivalToDelete(null);
    setSelectedPageId("all");
    setSubTab("hero");

    toast.success(`✓ Festival "${festivalToDelete.tabLabel}" removed. Saving settings...`);
    await handleSaveGlobalConfig(updatedSections, updatedPages);
  }

  // Available pages to select
  const availablePages = useMemo(() => {
    const list = [{ id: "all", label: "All Festivals Overview", icon: "✨", count: productsList.length }];
    sectionsState.forEach((sec) => {
      const count = productsList.filter((p) =>
        (sec.festivalIds || [sec.id]).includes(p.festivalId) || p.festivalId === sec.id
      ).length;
      list.push({
        id: sec.id,
        label: `${sec.tabLabel} Page`,
        icon: sec.tabIcon || "🪔",
        count,
      });
    });
    return list;
  }, [sectionsState, productsList]);

  // Products filtered for the current selected page
  const pageProducts = useMemo(() => {
    return productsList.filter((prod) => {
      const q = productSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        (prod.gujaratiName && prod.gujaratiName.toLowerCase().includes(q)) ||
        (prod.badge && prod.badge.toLowerCase().includes(q));

      if (selectedPageId === "all") return matchesSearch;
      if (!currentSection) return matchesSearch && prod.festivalId === selectedPageId;
      return (
        matchesSearch &&
        ((currentSection.festivalIds || [currentSection.id]).includes(prod.festivalId) ||
          prod.festivalId === selectedPageId)
      );
    });
  }, [productsList, productSearch, selectedPageId, currentSection]);

  // Open modal for editing
  function handleOpenEdit(prod: FestivalProductItem) {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormGujaratiName(prod.gujaratiName || "");
    setFormFestivalId(prod.festivalId || "diwali");
    setFormBadge(prod.badge || "");
    setFormDescription(prod.description || "");
    setFormImageUrl(prod.imageUrl || "/images/hamper.jpg");
    setFormPrice(prod.price || 0);
    setFormComparePrice(prod.comparePrice || prod.price || 0);
    setFormWeight(prod.weight || "1 kg");
    setFormStock(prod.stock || prod.actualStock || 50);
  }

  // Open modal for adding (pre-selects current festival page!)
  function handleOpenAdd() {
    setEditingProduct(null);
    setFormName("");
    setFormGujaratiName("");
    const defaultFest = selectedPageId === "all" ? "diwali" : selectedPageId;
    setFormFestivalId(defaultFest);
    setFormBadge("Festive Special");
    setFormDescription("Handcrafted festive sweet delicacy prepared with 100% pure desi ghee.");
    setFormImageUrl(
      defaultFest === "dussehra"
        ? "/images/dussehra-jalebi.jpg"
        : defaultFest === "ganesh"
        ? "/images/modak-bhog.jpg"
        : defaultFest === "rakhi"
        ? "/images/festive-hamper.jpg"
        : defaultFest === "holi-uttarayan"
        ? "/images/holi-gujiya.jpg"
        : "/images/hamper.jpg"
    );
    setFormPrice(750);
    setFormComparePrice(890);
    setFormWeight("1 kg");
    setFormStock(100);
    setShowAddModal(true);
  }

  // Save product from modal
  async function handleSaveProduct() {
    if (!formName.trim()) {
      toast.error("Product name is required");
      return;
    }
    setModalSaving(true);

    const matchingSection = sectionsState.find((s) => s.id === formFestivalId);
    const resolvedFestivalName = matchingSection?.tabLabel || "Festival Special";

    const payload: Partial<FestivalProductItem> = {
      name: formName.trim(),
      gujaratiName: formGujaratiName.trim(),
      festivalId: formFestivalId,
      festivalName: resolvedFestivalName,
      badge: formBadge.trim(),
      description: formDescription.trim(),
      imageUrl: formImageUrl,
      price: Number(formPrice),
      comparePrice: Number(formComparePrice),
      weight: formWeight.trim(),
      stock: Number(formStock),
      tags: [formFestivalId, "festival", formBadge],
    };

    try {
      if (editingProduct) {
        payload.id = editingProduct.id;
        payload.legacyId = editingProduct.legacyId;
        payload.dbProductId = editingProduct.dbProductId;
        payload.dbVariantId = editingProduct.dbVariantId;
        payload.slug = editingProduct.slug;

        await api.saveFestivalProduct(payload);
        toast.success(`✓ "${formName}" updated successfully!`);
      } else {
        await api.createFestivalProduct(payload);
        toast.success(`✓ "${formName}" added to Festival Specials!`);
      }

      setEditingProduct(null);
      setShowAddModal(false);
      await loadData();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save festival product");
    } finally {
      setModalSaving(false);
    }
  }

  // Delete product
  async function handleDeleteProduct() {
    if (!productToDelete) return;
    try {
      const targetId = productToDelete.id || productToDelete.legacyId || productToDelete.dbVariantId;
      if (targetId) {
        await api.deleteFestivalProduct(targetId);
        toast.success(`"${productToDelete.name}" removed from Festival Specials`);
      }
      setProductToDelete(null);
      await loadData();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
    }
  }

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* 1. TOP HEADER BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-[#2e050d] via-[#4a0e17] to-[#26040b] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#dfb755]/30">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dfb755]/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#dfb755]">
            <span>🪔</span>
            <span>Festival Specials Control Desk</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Festival Pages Manager
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Create, delete, and configure each festival&apos;s unique landing page. Add your own festivals (Janmashtami, Shivratri, etc.), customize hero banners, background photos, coupon codes, trust badges, bulk gifting, and sweet catalogs!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleOpenAddFestival}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#dfb755] hover:bg-[#cf9e32] text-slate-950 transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>+</span>
            <span>Add New Festival</span>
          </button>

          <a
            href={
              selectedPageId === "all"
                ? `${getPublicStoreUrl()}/festivals`
                : `${getPublicStoreUrl()}/festivals#${selectedPageId}`
            }
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/25 text-white transition flex items-center gap-1.5"
          >
            <span>Preview Storefront</span>
            <span>↗</span>
          </a>

          <button
            onClick={() => handleSaveGlobalConfig()}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. FESTIVAL PAGE SELECTOR & ADD FESTIVAL BUTTON */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>🎯</span>
            <span>Select Festival Page to Manage</span>
          </h3>
          <button
            onClick={handleOpenAddFestival}
            className="text-xs font-bold text-[#4a0e17] hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>+ Add New Festival</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {availablePages.map((page) => {
            const isSelected = selectedPageId === page.id;
            return (
              <button
                key={page.id}
                onClick={() => {
                  setSelectedPageId(page.id);
                  if (subTab === "sections" && page.id !== "all") {
                    setSubTab("hero");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/25 ring-2 ring-[#dfb755]"
                    : "bg-slate-50 hover:bg-amber-50/60 text-slate-700 border border-slate-200/80"
                }`}
              >
                <span className="text-sm">{page.icon}</span>
                <span>{page.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? "bg-[#dfb755] text-slate-950" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {page.count}
                </span>
              </button>
            );
          })}

          <button
            onClick={handleOpenAddFestival}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-dashed border-[#4a0e17]/40 text-[#4a0e17] hover:bg-amber-50/70 transition shrink-0 cursor-pointer"
          >
            <span>+</span>
            <span>Add Festival</span>
          </button>
        </div>
      </div>

      {/* 3. ACTIVE FESTIVAL PAGE PREVIEW & ACTION BAR */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-3xl p-5 border border-amber-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl border border-amber-200 shrink-0">
            {selectedPageId === "all" ? "✨" : currentSection?.tabIcon || "🪔"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#4a0e17] uppercase tracking-wider">
                Currently Managing:
              </span>
              <span className="bg-[#4a0e17] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {selectedPageId === "all" ? "All Festivals Overview" : currentSection?.tabLabel || selectedPageId}
              </span>
              {currentSection?.tabGujarati && (
                <span className="text-amber-800 font-bold text-xs">
                  ({currentSection.tabGujarati})
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900/80 mt-0.5">
              {selectedPageId === "all"
                ? "Configuring default hero banner, universal perks, and all festival product sections."
                : `Configuring dedicated hero banner, background photo, coupon code, trust pills, and bulk order offers for ${currentSection?.tabLabel || selectedPageId}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {selectedPageId !== "all" && (
            <>
              <button
                onClick={() => setSubTab("sectionMeta")}
                className="text-xs font-semibold text-slate-700 hover:text-[#4a0e17] px-3 py-1.5 rounded-xl border border-slate-300 bg-white cursor-pointer"
              >
                ⚙️ Festival Tab Info
              </button>

              <button
                onClick={() => handleResetPreset(selectedPageId)}
                className="text-xs font-semibold text-amber-800 hover:text-[#4a0e17] hover:underline px-3 py-1.5 rounded-xl border border-amber-300 bg-white/70 cursor-pointer"
              >
                ↺ Reset Presets
              </button>

              {currentSection && (
                <button
                  onClick={() => setFestivalToDelete(currentSection)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>Delete Festival</span>
                </button>
              )}
            </>
          )}

          <a
            href={
              selectedPageId === "all"
                ? `${getPublicStoreUrl()}/festivals`
                : `${getPublicStoreUrl()}/festivals#${selectedPageId}`
            }
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold bg-[#dfb755] hover:bg-[#cf9e32] text-slate-950 px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
          >
            <span>Live Page</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* 4. SUB-NAVIGATION TABS (ADAPTED TO CURRENT SELECTED PAGE) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSubTab("hero")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            subTab === "hero"
              ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span>🪔</span>
          <span>{selectedPageId === "all" ? "Hero Banner" : "Hero & Identity"}</span>
        </button>

        {selectedPageId !== "all" && (
          <button
            onClick={() => setSubTab("coupon")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "coupon"
                ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <span>🎉</span>
            <span>Promo Coupon</span>
          </button>
        )}

        <button
          onClick={() => setSubTab("products")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            subTab === "products"
              ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span>🍬</span>
          <span>
            {selectedPageId === "all" ? "All Products" : `${currentSection?.tabLabel || selectedPageId} Sweets`}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              subTab === "products" ? "bg-[#dfb755] text-slate-950" : "bg-slate-100 text-slate-700"
            }`}
          >
            {pageProducts.length}
          </span>
        </button>

        {selectedPageId === "all" ? (
          <button
            onClick={() => setSubTab("sections")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "sections"
                ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <span>📁</span>
            <span>Festival Sections &amp; Order</span>
          </button>
        ) : (
          <button
            onClick={() => setSubTab("sectionMeta")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "sectionMeta"
                ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <span>⚙️</span>
            <span>Festival Tab Info</span>
          </button>
        )}

        <button
          onClick={() => setSubTab("perks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            subTab === "perks"
              ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span>🛡️</span>
          <span>{selectedPageId === "all" ? "Universal Trust Perks" : "Festive Trust Badges"}</span>
        </button>

        <button
          onClick={() => setSubTab("corporate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            subTab === "corporate"
              ? "bg-[#4a0e17] text-white shadow-md shadow-[#4a0e17]/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span>🎁</span>
          <span>Bulk &amp; Corporate Gifting</span>
        </button>
      </div>

      {/* 5. SUB-TAB: HERO BANNER & IDENTITY */}
      {subTab === "hero" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {selectedPageId === "all"
                    ? "Global Overview Hero Banner"
                    : `${currentSection?.tabLabel || selectedPageId} Hero Banner`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPageId === "all"
                    ? "Top banner displayed when customers visit /festivals."
                    : `Dedicated banner displayed when customers view ${currentSection?.tabLabel || selectedPageId}.`}
                </p>
              </div>
            </div>

            {/* Theme Selector for Specific Festival Page */}
            {selectedPageId !== "all" && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Festival Color Scheme &amp; Ambient Lighting Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_OPTIONS.map((th) => {
                    const isCurrent = (currentFestivalConfig.theme || selectedPageId) === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => updateFestField("theme", th.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                          isCurrent
                            ? "border-[#4a0e17] bg-white ring-2 ring-[#dfb755] text-slate-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg ${th.bg} shrink-0 shadow-xs`} />
                        <span className="flex-1">{th.label}</span>
                        {isCurrent && <span className="text-[#dfb755]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Announcement Pill Badge
                </label>
                <input
                  type="text"
                  value={
                    selectedPageId === "all"
                      ? heroState.badgeText
                      : currentFestivalConfig.hero?.badgeText || ""
                  }
                  onChange={(e) => {
                    if (selectedPageId === "all") {
                      setHeroState({ ...heroState, badgeText: e.target.value });
                    } else {
                      updateFestField("hero", "badgeText", e.target.value);
                    }
                  }}
                  placeholder="🪔 SPECIAL FESTIVE COLLECTION"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Helpline / Contact Phone
                </label>
                <input
                  type="text"
                  value={
                    selectedPageId === "all"
                      ? heroState.phone
                      : currentFestivalConfig.hero?.phone || heroState.phone
                  }
                  onChange={(e) => {
                    if (selectedPageId === "all") {
                      setHeroState({ ...heroState, phone: e.target.value });
                    } else {
                      updateFestField("hero", "phone", e.target.value);
                    }
                  }}
                  placeholder="+91 6352119329"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Main Headline Prefix
                </label>
                <input
                  type="text"
                  value={
                    selectedPageId === "all"
                      ? heroState.titlePrefix
                      : currentFestivalConfig.hero?.titlePrefix || ""
                  }
                  onChange={(e) => {
                    if (selectedPageId === "all") {
                      setHeroState({ ...heroState, titlePrefix: e.target.value });
                    } else {
                      updateFestField("hero", "titlePrefix", e.target.value);
                    }
                  }}
                  placeholder="Celebrate Indian Festivals with"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Main Headline Highlight Title
                </label>
                <input
                  type="text"
                  value={
                    selectedPageId === "all"
                      ? heroState.titleHighlight
                      : currentFestivalConfig.hero?.titleHighlight || ""
                  }
                  onChange={(e) => {
                    if (selectedPageId === "all") {
                      setHeroState({ ...heroState, titleHighlight: e.target.value });
                    } else {
                      updateFestField("hero", "titleHighlight", e.target.value);
                    }
                  }}
                  placeholder="Shuddh Mithai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Hero Subtitle / Description
              </label>
              <textarea
                rows={3}
                value={
                  selectedPageId === "all"
                    ? heroState.subtitle
                    : currentFestivalConfig.hero?.subtitle || ""
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setHeroState({ ...heroState, subtitle: e.target.value });
                  } else {
                    updateFestField("hero", "subtitle", e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none leading-relaxed"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  CTA Button 1 (Primary Action)
                </label>
                <input
                  type="text"
                  value={
                    selectedPageId === "all"
                      ? heroState.button1Text
                      : currentFestivalConfig.hero?.button1Text || ""
                  }
                  onChange={(e) => {
                    if (selectedPageId === "all") {
                      setHeroState({ ...heroState, button1Text: e.target.value });
                    } else {
                      updateFestField("hero", "button1Text", e.target.value);
                    }
                  }}
                  placeholder="Shop Festival Mithai 🪔"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  CTA Button 2 (Secondary Action)
                </label>
                <input
                  type="text"
                  value={
                    selectedPageId === "all"
                      ? heroState.button2Text
                      : currentFestivalConfig.hero?.button2Text || ""
                  }
                  onChange={(e) => {
                    if (selectedPageId === "all") {
                      setHeroState({ ...heroState, button2Text: e.target.value });
                    } else {
                      updateFestField("hero", "button2Text", e.target.value);
                    }
                  }}
                  placeholder="Corporate Gifting 🎁"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
                />
              </div>
            </div>

            {/* Hero Background Photo */}
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>🖼️</span>
                    <span>
                      {selectedPageId === "all"
                        ? "Global Hero Festive Background Photo"
                        : `${currentSection?.tabLabel || selectedPageId} Background Photo`}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This photo appears as the rich background for this festival&apos;s hero banner on the storefront.
                  </p>
                </div>
              </div>
              <ImagePickerField
                label="Hero Background Photo"
                value={
                  selectedPageId === "all"
                    ? heroState.backgroundImage || "/images/diwali-bg.jpg"
                    : currentFestivalConfig.hero?.backgroundImage || "/images/festive-hamper.jpg"
                }
                onChange={(url) => {
                  if (selectedPageId === "all") {
                    setHeroState({ ...heroState, backgroundImage: url });
                  } else {
                    updateFestField("hero", "backgroundImage", url);
                  }
                }}
                helperText="Upload custom festival photo or choose from preset gallery."
                presetFilter="Festive"
              />
            </div>

            {/* Cultural Tradition Story Note */}
            {selectedPageId !== "all" && (
              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>📜</span>
                  <span>Cultural Heritage &amp; Sweet Tradition Note</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Displayed as an auspicious cultural note explaining why these sweets are celebratory for this festival.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Story / Heritage Note Title
                    </label>
                    <input
                      type="text"
                      value={currentFestivalConfig.storyTitle || ""}
                      onChange={(e) => updateFestField("storyTitle", e.target.value)}
                      placeholder="The Joyous Dussehra Jalebi-Fafda Tradition"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Story Description
                    </label>
                    <textarea
                      rows={2}
                      value={currentFestivalConfig.storyDescription || ""}
                      onChange={(e) => updateFestField("storyDescription", e.target.value)}
                      placeholder="Celebrate the victory of Good over Evil on Vijayadashami..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SUB-TAB: PROMO COUPON */}
      {subTab === "coupon" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {currentSection?.tabLabel || selectedPageId} Promo Coupon Banner
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Special festive discount code highlighted under the hero on this festival&apos;s unique page.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={currentFestivalConfig.couponPromo?.enabled !== false}
                onChange={(e) => updateFestField("couponPromo", "enabled", e.target.checked)}
                className="w-4 h-4 text-[#4a0e17] rounded"
              />
              <span>Show Banner</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Banner Promo Text
              </label>
              <input
                type="text"
                value={currentFestivalConfig.couponPromo?.text || ""}
                onChange={(e) => updateFestField("couponPromo", "text", e.target.value)}
                placeholder="Dussehra Special: Extra 10% OFF on Jalebi & Farali Platters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Coupon Promo Code
              </label>
              <input
                type="text"
                value={currentFestivalConfig.couponPromo?.code || ""}
                onChange={(e) => updateFestField("couponPromo", "code", e.target.value.toUpperCase())}
                placeholder="NAVRATRI10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wider text-[#b89130] focus:border-[#4a0e17] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. SUB-TAB: TRUST BADGES (PERKS) */}
      {subTab === "perks" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {selectedPageId === "all"
                  ? "Universal Value Proposition Perks (4 Cards)"
                  : `${currentSection?.tabLabel || selectedPageId} Trust Badges (4 Hero Pills)`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedPageId === "all"
                  ? "Displayed in the royal dark banner near the bottom of the overview page."
                  : "Displayed as 4 highlighted badges under the hero description for this festival."}
              </p>
            </div>
          </div>

          {selectedPageId === "all" ? (
            /* Universal 4 Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {trustPerksState.map((perk, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={perk.icon}
                      onChange={(e) => {
                        const next = [...trustPerksState];
                        next[idx].icon = e.target.value;
                        setTrustPerksState(next);
                      }}
                      className="w-12 text-center py-2 rounded-xl border border-slate-200 text-xs"
                      title="Emoji Icon"
                    />
                    <input
                      type="text"
                      value={perk.title}
                      onChange={(e) => {
                        const next = [...trustPerksState];
                        next[idx].title = e.target.value;
                        setTrustPerksState(next);
                      }}
                      placeholder="Title"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={perk.description}
                    onChange={(e) => {
                      const next = [...trustPerksState];
                      next[idx].description = e.target.value;
                      setTrustPerksState(next);
                    }}
                    placeholder="Description"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-light text-slate-600"
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Festival-specific 4 Hero Pills */
            <div className="space-y-4">
              {(currentFestivalConfig.trustPills || DEFAULT_HERO.trustPills).map((pill: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                  <input
                    type="text"
                    value={pill.icon}
                    onChange={(e) => updateFestPill(idx, "icon", e.target.value)}
                    className="w-12 text-center py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                    title="Emoji Icon"
                  />
                  <input
                    type="text"
                    value={pill.text}
                    onChange={(e) => updateFestPill(idx, "text", e.target.value)}
                    placeholder="Pill Text (e.g., 100% Shuddh Desi Ghee)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. SUB-TAB: CORPORATE & BULK ORDERS */}
      {subTab === "corporate" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {selectedPageId === "all"
                  ? "Global Corporate Bulk Orders Banner"
                  : `${currentSection?.tabLabel || selectedPageId} Corporate Bulk Orders Banner`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The inquiry banner for custom gift hampers, bulk team boxes, and WhatsApp ordering.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedPageId === "all"
                    ? corporateState.enabled !== false
                    : currentFestivalConfig.corporateGifting?.enabled !== false
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setCorporateState({ ...corporateState, enabled: e.target.checked });
                  } else {
                    updateFestField("corporateGifting", "enabled", e.target.checked);
                  }
                }}
                className="w-4 h-4 text-[#4a0e17] rounded"
              />
              <span>Show Banner</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Banner Badge</label>
              <input
                type="text"
                value={
                  selectedPageId === "all"
                    ? corporateState.badge
                    : currentFestivalConfig.corporateGifting?.badge || ""
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setCorporateState({ ...corporateState, badge: e.target.value });
                  } else {
                    updateFestField("corporateGifting", "badge", e.target.value);
                  }
                }}
                placeholder="Corporate & Family Bulk Orders"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Banner Title</label>
              <input
                type="text"
                value={
                  selectedPageId === "all"
                    ? corporateState.title
                    : currentFestivalConfig.corporateGifting?.title || ""
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setCorporateState({ ...corporateState, title: e.target.value });
                  } else {
                    updateFestField("corporateGifting", "title", e.target.value);
                  }
                }}
                placeholder="Festive Corporate Hampers with Your Brand Logo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description Text
              </label>
              <textarea
                rows={3}
                value={
                  selectedPageId === "all"
                    ? corporateState.description
                    : currentFestivalConfig.corporateGifting?.description || ""
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setCorporateState({ ...corporateState, description: e.target.value });
                  } else {
                    updateFestField("corporateGifting", "description", e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Button Text
              </label>
              <input
                type="text"
                value={
                  selectedPageId === "all"
                    ? corporateState.whatsappText
                    : currentFestivalConfig.corporateGifting?.whatsappText || ""
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setCorporateState({ ...corporateState, whatsappText: e.target.value });
                  } else {
                    updateFestField("corporateGifting", "whatsappText", e.target.value);
                  }
                }}
                placeholder="WhatsApp Bulk Inquiry"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                value={
                  selectedPageId === "all"
                    ? corporateState.whatsappNumber
                    : currentFestivalConfig.corporateGifting?.whatsappNumber || corporateState.whatsappNumber
                }
                onChange={(e) => {
                  if (selectedPageId === "all") {
                    setCorporateState({ ...corporateState, whatsappNumber: e.target.value });
                  } else {
                    updateFestField("corporateGifting", "whatsappNumber", e.target.value);
                  }
                }}
                placeholder="6352119329"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. SUB-TAB: FESTIVAL TAB INFO & SETTINGS (FOR SPECIFIC FESTIVAL) */}
      {subTab === "sectionMeta" && selectedPageId !== "all" && currentSection && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Festival Tab &amp; Identity Settings ({currentSection.tabLabel})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure how this festival appears in the filter tabs and overview sections on the storefront.
              </p>
            </div>

            <button
              onClick={() => setFestivalToDelete(currentSection)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>🗑️ Delete Festival</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Festival Name / Tab Label *</label>
              <input
                type="text"
                value={currentSection.tabLabel}
                onChange={(e) => updateCurrentSectionMetadata("tabLabel", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:border-[#4a0e17] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Festival Emoji / Icon</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentSection.tabIcon}
                  onChange={(e) => updateCurrentSectionMetadata("tabIcon", e.target.value)}
                  className="w-14 text-center py-2.5 rounded-xl border border-slate-200 text-base"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_EMOJIS.slice(0, 8).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => updateCurrentSectionMetadata("tabIcon", em)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 flex items-center justify-center text-sm cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gujarati Name</label>
              <input
                type="text"
                value={currentSection.tabGujarati || ""}
                onChange={(e) => updateCurrentSectionMetadata("tabGujarati", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Tag Badge</label>
              <input
                type="text"
                value={currentSection.categoryTag}
                onChange={(e) => updateCurrentSectionMetadata("categoryTag", e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase focus:border-[#4a0e17] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Section Title on Overview</label>
              <input
                type="text"
                value={currentSection.title}
                onChange={(e) => updateCurrentSectionMetadata("title", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Section Subtitle</label>
              <input
                type="text"
                value={currentSection.subtitle}
                onChange={(e) => updateCurrentSectionMetadata("subtitle", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#4a0e17] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSection.enabled !== false}
                  onChange={(e) => updateCurrentSectionMetadata("enabled", e.target.checked)}
                  className="w-4 h-4 text-[#4a0e17] rounded"
                />
                <span>Active on Storefront (Show Tab &amp; Section)</span>
              </label>
            </div>

            <div className="md:col-span-2 pt-2">
              <ImagePickerField
                label={`${currentSection.tabLabel} Overview Card Background Photo`}
                value={currentSection.backgroundImage || ""}
                onChange={(url) => updateCurrentSectionMetadata("backgroundImage", url)}
                helperText="Optional custom background photo behind this festival's section card on the overview page."
                presetFilter="Festive"
              />
            </div>
          </div>
        </div>
      )}

      {/* 10. SUB-TAB: FESTIVAL PRODUCTS */}
      {subTab === "products" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {selectedPageId === "all"
                  ? "All Festival Sweets & Gift Boxes"
                  : `${currentSection?.tabLabel || selectedPageId} Sweets & Combos`}
              </h3>
              <p className="text-xs text-slate-500">
                Found {pageProducts.length} items for this festival
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by sweet name..."
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs w-52 outline-none focus:border-[#4a0e17]"
              />

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4a0e17] hover:bg-[#380911] text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>+</span>
                <span>
                  Add Sweet to {selectedPageId === "all" ? "Festival" : currentSection?.tabLabel || selectedPageId}
                </span>
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {pageProducts.map((prod) => (
              <div
                key={prod.id || prod.legacyId}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full bg-slate-100">
                    <Image
                      src={prod.imageUrl || "/images/hamper.jpg"}
                      alt={prod.name}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-[#4a0e17] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {prod.festivalName || prod.festivalId}
                    </span>
                    {prod.badge && (
                      <span className="absolute top-2 right-2 bg-[#dfb755] text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {prod.badge}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5">
                    {prod.gujaratiName && (
                      <div className="text-[10px] font-bold text-[#b89130] uppercase">
                        {prod.gujaratiName}
                      </div>
                    )}
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{prod.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                    <div className="text-[11px] text-slate-600 font-medium pt-1">
                      Pack: <strong>{prod.weight}</strong> • Stock: <strong>{prod.stock ?? 50}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-base text-[#4a0e17]">₹{prod.price}</span>
                    {prod.comparePrice > prod.price && (
                      <span className="text-xs text-slate-400 line-through">₹{prod.comparePrice}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setProductToDelete(prod)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11. SUB-TAB: FESTIVAL SECTIONS LIST & ORDER (ON "ALL FESTIVALS") */}
      {subTab === "sections" && selectedPageId === "all" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Manage All Festivals</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, remove, reorder, or edit festival tabs and card backgrounds.
              </p>
            </div>

            <button
              onClick={handleOpenAddFestival}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4a0e17] hover:bg-[#380911] text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>+ Add New Festival</span>
            </button>
          </div>

          <div className="space-y-4">
            {sectionsState.map((sec, idx) => (
              <div
                key={sec.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center border border-slate-200 shrink-0">
                    {sec.tabIcon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{sec.tabLabel}</h4>
                      {sec.tabGujarati && (
                        <span className="text-xs text-amber-800 font-semibold">({sec.tabGujarati})</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 font-mono text-slate-700">
                        #{sec.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{sec.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs font-semibold mr-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sec.enabled !== false}
                      onChange={(e) => {
                        const next = [...sectionsState];
                        next[idx].enabled = e.target.checked;
                        setSectionsState(next);
                      }}
                      className="w-4 h-4 text-[#4a0e17] rounded"
                    />
                    <span>Active</span>
                  </label>

                  <button
                    onClick={() => {
                      setSelectedPageId(sec.id);
                      setSubTab("hero");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 transition cursor-pointer"
                  >
                    Edit Page
                  </button>

                  <button
                    onClick={() => setFestivalToDelete(sec)}
                    className="p-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                    title="Delete Festival"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. MODAL: ADD NEW FESTIVAL */}
      {showAddFestivalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Add New Festival &amp; Page</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a dedicated festival page on your storefront with custom hero, colors, and sweet collection.
                </p>
              </div>
              <button
                onClick={() => setShowAddFestivalModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Festival Name (English) *
                  </label>
                  <input
                    type="text"
                    value={newFestLabel}
                    onChange={(e) => {
                      setNewFestLabel(e.target.value);
                      if (!newFestId || newFestId === newFestLabel.toLowerCase().replace(/[^a-z0-9_-]/g, "-")) {
                        setNewFestId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));
                      }
                      if (!newFestTitle) {
                        setNewFestTitle(`${e.target.value} Specials`);
                      }
                      if (!newFestCategoryTag) {
                        setNewFestCategoryTag(`${e.target.value.toUpperCase()} SPECIAL`);
                      }
                    }}
                    placeholder="e.g., Janmashtami & Gokulashtami"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:border-[#4a0e17] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Festival Emoji Icon
                  </label>
                  <input
                    type="text"
                    value={newFestIcon}
                    onChange={(e) => setNewFestIcon(e.target.value)}
                    className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-base font-bold"
                  />
                </div>
              </div>

              {/* Emoji Quick Picker */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick pick:</span>
                {PRESET_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewFestIcon(em)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 flex items-center justify-center text-sm cursor-pointer shrink-0"
                  >
                    {em}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unique Slug / ID (URL Hash) *
                  </label>
                  <input
                    type="text"
                    value={newFestId}
                    onChange={(e) => setNewFestId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                    placeholder="e.g., janmashtami"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gujarati Name</label>
                  <input
                    type="text"
                    value={newFestGujarati}
                    onChange={(e) => setNewFestGujarati(e.target.value)}
                    placeholder="e.g., જન્માષ્ટમી"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headline Title</label>
                <input
                  type="text"
                  value={newFestTitle}
                  onChange={(e) => setNewFestTitle(e.target.value)}
                  placeholder="e.g., Janmashtami Gopal Bhog Specials"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Festival Subtitle</label>
                <textarea
                  rows={2}
                  value={newFestSubtitle}
                  onChange={(e) => setNewFestSubtitle(e.target.value)}
                  placeholder="Celebrate with pure Gir cow ghee sweets, pedas, and gift boxes."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Color Palette Theme</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {THEME_OPTIONS.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setNewFestTheme(th.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                        newFestTheme === th.id
                          ? "border-[#4a0e17] bg-amber-50/50 ring-2 ring-[#dfb755]"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md ${th.bg} shrink-0`} />
                      <span className="truncate">{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <ImagePickerField
                  label="Festival Background Photo"
                  value={newFestBackgroundImage}
                  onChange={setNewFestBackgroundImage}
                  helperText="Choose photo from gallery or upload new."
                  presetFilter="Festive"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFestivalModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFestival}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4a0e17] hover:bg-[#380911] text-white shadow-md cursor-pointer"
              >
                Create Festival Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. MODAL: CONFIRM DELETE FESTIVAL */}
      {festivalToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold">
              🗑️
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Delete &ldquo;{festivalToDelete.tabLabel}&rdquo; Festival?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove <strong>{festivalToDelete.tabLabel}</strong> and its dedicated festival page from your storefront?
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              ⚠️ Note: Sweets belonging to this festival will remain in your master database and can be reassigned to other festivals.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFestivalToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteFestival}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                Confirm Delete Festival
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. MODAL: ADD / EDIT FESTIVAL PRODUCT */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingProduct ? "Edit Festival Sweet" : "Add Sweet to Festival Specials"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Delicacies crafted for festive celebrations &amp; gift hampers.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Shahi Diwali Royal Sweets Hamper"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gujarati Name</label>
                  <input
                    type="text"
                    value={formGujaratiName}
                    onChange={(e) => setFormGujaratiName(e.target.value)}
                    placeholder="e.g., શાહી દિવાળી હેમ્પર"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Festival Assignment *</label>
                  <select
                    value={formFestivalId}
                    onChange={(e) => setFormFestivalId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:border-[#4a0e17] outline-none bg-white"
                  >
                    {sectionsState.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.tabIcon} {sec.tabLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  placeholder="e.g., Bestseller Hamper, Fasting Pure"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the sweet ingredients, aroma, and packaging..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:border-[#4a0e17] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Compare Price</label>
                  <input
                    type="number"
                    value={formComparePrice}
                    onChange={(e) => setFormComparePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pack Size</label>
                  <input
                    type="text"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    placeholder="1 kg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Units</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#4a0e17] outline-none"
                  />
                </div>
              </div>

              <div>
                <ImagePickerField
                  label="Product Photo"
                  value={formImageUrl}
                  onChange={setFormImageUrl}
                  helperText="Choose sweet photo from gallery or upload new photo."
                  presetFilter="Festive"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={modalSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4a0e17] hover:bg-[#380911] text-white shadow-md cursor-pointer disabled:opacity-50"
              >
                {modalSaving ? "Saving..." : editingProduct ? "Update Sweet" : "Add Sweet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. MODAL: DELETE PRODUCT CONFIRMATION */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Remove from Festival Specials?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>&ldquo;{productToDelete.name}&rdquo;</strong> from this festival&apos;s catalog?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
