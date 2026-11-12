export interface QuizOptionItem {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  tagMapping?: Record<string, any>;
}

export interface QuizQuestionItem {
  id?: number;
  key: string;
  title: string;
  subtitle?: string;
  stepNumber: number;
  icon?: string;
  weight: number;
  isStrictFilter: boolean;
  options: QuizOptionItem[];
}

export interface QuizPersonalityItem {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  recommendedSweet: string;
  heroImageUrl?: string;
}

export interface QuizMatchAnswerPayload {
  sweetness?: "low" | "medium" | "high" | string;
  nuts?: "love_nuts" | "no_nuts" | "neutral" | string;
  occasion?: "festival" | "birthday_anniversary" | "wedding_gifting" | "everyday" | "corporate" | string;
  budget?: "under_500" | "500_1000" | "1000_2000" | "above_2000" | string;
  type?: "dry" | "milk_based" | "ghee_based" | "surprise_me" | string;
  [key: string]: any;
}

export interface QuizMatchedProduct {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  categoryName: string;
  price: number;
  discountedPrice: number | null;
  defaultWeight: string;
  variantId: number;
  matchScore: number;
  matchPercentage: number;
  whySuitsYou: string;
  dietaryTags: string[];
  sweetnessLevel: string;
  containsNuts: string;
  mithaiType: string;
}

export interface QuizMatchResult {
  personality: QuizPersonalityItem;
  matches: QuizMatchedProduct[];
  totalMatchesCount: number;
  relaxedFilter: boolean;
  relaxedFilterReason?: string;
  comboBundle: {
    title: string;
    description: string;
    originalTotal: number;
    discountPercent: number;
    bundlePrice: number;
    savings: number;
    itemCount: number;
  };
  allergyDisclaimer: string;
  shareText: string;
  shareUrl: string;
}

// -------------------------------------------------------------
// DEFAULT DATA DEFINITIONS
// -------------------------------------------------------------

export const DEFAULT_QUESTIONS: QuizQuestionItem[] = [
  {
    key: "sweetness",
    title: "How sweet do you like your mithai?",
    subtitle: "From gentle, subtle flavours to rich traditional syrupy sweetness",
    stepNumber: 1,
    icon: "🍯",
    weight: 30,
    isStrictFilter: false,
    options: [
      {
        key: "low",
        label: "Mild / Low Sweetness",
        description: "Subtle, delicate sweetness that lets dry fruits & mawa shine",
        icon: "🌱",
        sortOrder: 1,
        tagMapping: { sweetnessLevel: "low" },
      },
      {
        key: "medium",
        label: "Balanced / Just Right",
        description: "Classic royal Indian balance like fine Kaju Katli & Penda",
        icon: "✨",
        sortOrder: 2,
        tagMapping: { sweetnessLevel: "medium" },
      },
      {
        key: "high",
        label: "Rich & Full Sweet Tooth",
        description: "Grand traditional indulgence, syrupy and lavish",
        icon: "🍯",
        sortOrder: 3,
        tagMapping: { sweetnessLevel: "high" },
      },
    ],
  },
  {
    key: "nuts",
    title: "What is your stance on dry fruits & nuts?",
    subtitle: "Cashews, almonds, pistachios, or strictly nut-free",
    stepNumber: 2,
    icon: "🥜",
    weight: 100, // strict filter when no_nuts
    isStrictFilter: true,
    options: [
      {
        key: "love_nuts",
        label: "I love nuts!",
        description: "Loaded with cashews, almonds, pistachios & saffron",
        icon: "🌰",
        sortOrder: 1,
        tagMapping: { containsNuts: "yes" },
      },
      {
        key: "no_nuts",
        label: "No nuts please (Allergy or Dislike)",
        description: "Strictly nut-free pure ghee, mawa, or besan sweets only",
        icon: "🚫",
        sortOrder: 2,
        tagMapping: { containsNuts: "no" },
      },
      {
        key: "neutral",
        label: "Doesn't matter",
        description: "Open to any authentic Gujarati or heritage delight",
        icon: "👌",
        sortOrder: 3,
        tagMapping: { containsNuts: "any" },
      },
    ],
  },
  {
    key: "occasion",
    title: "What's the special occasion?",
    subtitle: "We'll suggest sweets suited for the celebration or mood",
    stepNumber: 3,
    icon: "🎉",
    weight: 20,
    isStrictFilter: false,
    options: [
      {
        key: "festival",
        label: "Festivals (Diwali, Rakhi, Holi...)",
        description: "Vibrant, auspicious royal sweets for celebration and pooja",
        icon: "🪔",
        sortOrder: 1,
        tagMapping: { occasion: "festival" },
      },
      {
        key: "birthday_anniversary",
        label: "Birthday or Anniversary",
        description: "Melt-in-mouth treats for sharing joyous milestone moments",
        icon: "🎂",
        sortOrder: 2,
        tagMapping: { occasion: "birthday_anniversary" },
      },
      {
        key: "wedding_gifting",
        label: "Wedding or Family Gifting",
        description: "Silver-foiled, elegant hampers that leave a lasting impression",
        icon: "🎁",
        sortOrder: 3,
        tagMapping: { occasion: "wedding_gifting" },
      },
      {
        key: "everyday",
        label: "Everyday Cravings & Chai Snack",
        description: "Fresh daily tea-time indulgence or after-dinner bite",
        icon: "☕",
        sortOrder: 4,
        tagMapping: { occasion: "everyday" },
      },
      {
        key: "corporate",
        label: "Corporate & Client Gifting",
        description: "Refined, long-shelf-life premium packaging for partners",
        icon: "💼",
        sortOrder: 5,
        tagMapping: { occasion: "corporate" },
      },
    ],
  },
  {
    key: "budget",
    title: "What's your preferred budget per box?",
    subtitle: "Options across every range with authentic pure ingredients",
    stepNumber: 4,
    icon: "💰",
    weight: 15,
    isStrictFilter: false,
    options: [
      {
        key: "under_500",
        label: "Under ₹500",
        description: "Affordable authentic favorites and daily fresh boxes",
        icon: "🏷️",
        sortOrder: 1,
        tagMapping: { maxPrice: 500 },
      },
      {
        key: "500_1000",
        label: "₹500 to ₹1,000",
        description: "The sweet spot for premium pure ghee and cashew delights",
        icon: "⭐",
        sortOrder: 2,
        tagMapping: { minPrice: 500, maxPrice: 1000 },
      },
      {
        key: "1000_2000",
        label: "₹1,000 to ₹2,000",
        description: "Grand gifting boxes, assorted platters & kesar specials",
        icon: "💎",
        sortOrder: 3,
        tagMapping: { minPrice: 1000, maxPrice: 2000 },
      },
      {
        key: "above_2000",
        label: "Above ₹2,000 (Luxury Hampers)",
        description: "Executive wooden boxes, multi-tier festive hampers",
        icon: "👑",
        sortOrder: 4,
        tagMapping: { minPrice: 2000 },
      },
    ],
  },
  {
    key: "type",
    title: "Which style of mithai speaks to your heart?",
    subtitle: "Texture, foundation, and karigar craftsmanship",
    stepNumber: 5,
    icon: "✨",
    weight: 25,
    isStrictFilter: false,
    options: [
      {
        key: "dry",
        label: "Dry Sweets (Barfi, Ladoo, Kaju)",
        description: "Clean to hold, non-sticky, rich in pure nuts & aromatics",
        icon: "🔷",
        sortOrder: 1,
        tagMapping: { mithaiType: "dry" },
      },
      {
        key: "milk_based",
        label: "Milk-Based (Peda, Mawa, Gulab Jamun)",
        description: "Slow-reduced milk fudge with delicate cardamom & saffron",
        icon: "🥛",
        sortOrder: 2,
        tagMapping: { mithaiType: "milk_based" },
      },
      {
        key: "ghee_based",
        label: "Pure Ghee Delights (Mohanthal, Mysore Pak)",
        description: "Slow-roasted gram flour & pure cow desi ghee goodness",
        icon: "🧈",
        sortOrder: 3,
        tagMapping: { mithaiType: "ghee_based" },
      },
      {
        key: "surprise_me",
        label: "Surprise Me!",
        description: "Let the Vadodara sweet masters handpick a divine curation",
        icon: "🪄",
        sortOrder: 4,
        tagMapping: { mithaiType: "surprise_me" },
      },
    ],
  },
];

export const DEFAULT_PERSONALITIES: QuizPersonalityItem[] = [
  {
    slug: "classic-kaju-lover",
    name: "The Classic Kaju Katli Lover",
    tagline: "Refined, nutty, and pure melt-in-mouth luxury",
    description:
      "You appreciate timeless elegance over fleeting fads. For you, the silky texture of premium whole cashew diamonds with edible silver foil is the pinnacle of Indian sweet craftsmanship. Subtle, smooth, and unforgettable.",
    badge: "Melt-In-Mouth Royale",
    recommendedSweet: "Kaju Katli (Royal Silver Foil)",
    heroImageUrl: "/images/kaju-katli.jpg",
  },
  {
    slug: "royal-kesar-connoisseur",
    name: "The Royal Kesar Connoisseur",
    tagline: "Rich Kashmiri saffron, pistachios, and heritage elegance",
    description:
      "You believe celebration deserves nothing short of regal grandeur. You savor deep saffron aromas, golden textures, and the delicate crunch of roasted pistachios steeped in pure cow desi ghee.",
    badge: "Regal Heritage",
    recommendedSweet: "Kesar Kaju Roll & Motichoor",
    heroImageUrl: "/images/kaju-katli-showcase.jpg",
  },
  {
    slug: "mindful-mithai-enthusiast",
    name: "The Mindful Mithai Enthusiast",
    tagline: "Balanced sweetness, conscious ingredients, pure wholesome joy",
    description:
      "You crave authentic flavors without the overwhelming sugar rush. You love treats sweetened with natural anjeer, dates, light organic sugar, or slow-roasted millets that nourish both body and spirit.",
    badge: "Gentle Sweetness",
    recommendedSweet: "Sugar-Free Anjeer Barfi & Millet Sweets",
    heroImageUrl: "/images/sugarfree-sweets.jpg",
  },
  {
    slug: "nut-free-heritage-purist",
    name: "The Nut-Free Heritage Purist",
    tagline: "Rich desi cow ghee and velvety mawa with zero nut worry",
    description:
      "You savor the pure, honest richness of farm-fresh milk mawa, slow-cooked caramelized peda, and aromatic golden ghee sweets crafted cleanly without nuts.",
    badge: "100% Nut-Safe & Pure",
    recommendedSweet: "Mathura Peda & Pure Ghee Mohanthal",
    heroImageUrl: "/images/penda-sweets.jpg",
  },
  {
    slug: "grand-festive-traditionalist",
    name: "The Grand Festive Traditionalist",
    tagline: "Classic besan laddoos, mohanthal, and joyous celebrations",
    description:
      "For you, mithai is nostalgia, warmth, and festivals with family. The fragrance of slow-roasted gram flour, cardamom pods, and bubbling pure cow desi ghee brings back beloved festive memories.",
    badge: "Since 1976 Tradition",
    recommendedSweet: "Shuddh Desi Ghee Mohanthal & Besan Ladoo",
    heroImageUrl: "/images/ghee-sweets.jpg",
  },
  {
    slug: "sweet-tooth-royal",
    name: "The Sweet Tooth Royal",
    tagline: "Indulgent, decadent, syrup-infused milk mithai bliss",
    description:
      "You don't hold back when dessert is served! You relish rich milk solids, warm aromatic syrup, and velvety textures that coat the tongue with pure celebratory bliss.",
    badge: "Max Decadence",
    recommendedSweet: "Gulab Jamun & Mawa Malai Peda",
    heroImageUrl: "/images/mawa-sweets.jpg",
  },
];

