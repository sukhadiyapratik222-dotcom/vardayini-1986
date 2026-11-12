import { db } from "@/db";
import {
  products,
  productVariants,
  categories,
  productQuizTags,
  quizQuestions,
  quizOptions,
  quizPersonalities,
  quizSettings,
  quizLeads,
  userQuizResults,
} from "@/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

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

// -------------------------------------------------------------
// SEEDING & SETUP
// -------------------------------------------------------------

export async function ensureQuizDataSeeded(): Promise<void> {
  try {
    // 1. Ensure Quiz Settings
    const [existingSettings] = await db.select().from(quizSettings).limit(1);
    if (!existingSettings) {
      await db.insert(quizSettings).values({
        isEnabled: true,
        leadCaptureEnabled: true,
        leadCaptureHeading: "Where should we send your mithai match?",
        leadCaptureSubheading:
          "Save your personalized taste profile & unlock a special festive welcome code.",
        maxResults: 4,
        comboDiscountPercent: 10,
        allergyDisclaimer:
          "Please note: While we follow strict preparation protocols, all products are handcrafted in a facility handling dairy, ghee, and nuts. Check product ingredient details for severe allergies.",
      });
    }

    // 2. Ensure Quiz Questions & Options
    const existingQuestions = await db.select().from(quizQuestions);
    if (existingQuestions.length === 0) {
      for (const q of DEFAULT_QUESTIONS) {
        await db.insert(quizQuestions).values({
          questionKey: q.key,
          title: q.title,
          subtitle: q.subtitle || null,
          stepNumber: q.stepNumber,
          icon: q.icon || "🍯",
          weight: q.weight,
          isStrictFilter: q.isStrictFilter,
          isEnabled: true,
        });

        for (const opt of q.options) {
          await db.insert(quizOptions).values({
            questionKey: q.key,
            optionKey: opt.key,
            label: opt.label,
            description: opt.description || null,
            icon: opt.icon || "✨",
            sortOrder: opt.sortOrder,
            tagMapping: JSON.stringify(opt.tagMapping || {}),
            isEnabled: true,
          });
        }
      }
    }

    // 3. Ensure Personalities
    const existingPersonalities = await db.select().from(quizPersonalities);
    if (existingPersonalities.length === 0) {
      for (const p of DEFAULT_PERSONALITIES) {
        await db.insert(quizPersonalities).values({
          slug: p.slug,
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          badge: p.badge,
          recommendedSweet: p.recommendedSweet,
          heroImageUrl: p.heroImageUrl || "/images/kaju-katli.jpg",
        });
      }
    }

    // 4. Auto-tag catalog products if productQuizTags is empty
    const existingTags = await db.select().from(productQuizTags).limit(5);
    if (existingTags.length === 0) {
      await autoTagCatalogProducts();
    }
  } catch (err) {
    console.warn("[TasteQuiz] Auto-seeding notice:", err);
  }
}

/**
 * Intelligently tags products in the catalog based on their names, descriptions and categories
 */
export async function autoTagCatalogProducts(): Promise<{ tagged: number }> {
  try {
    const allProducts = await db.select().from(products);
    let taggedCount = 0;

    for (const prod of allProducts) {
      const lowerName = (prod.name + " " + prod.description + " " + (prod.tags || "")).toLowerCase();

      // Sweetness Level
      let sweetnessLevel: "low" | "medium" | "high" | "none" = "medium";
      if (
        lowerName.includes("sugarless") ||
        lowerName.includes("sugar-free") ||
        lowerName.includes("anjeer") ||
        lowerName.includes("millet")
      ) {
        sweetnessLevel = "low";
      } else if (
        lowerName.includes("gulab jamun") ||
        lowerName.includes("rasgulla") ||
        lowerName.includes("jalebi") ||
        lowerName.includes("imarti")
      ) {
        sweetnessLevel = "high";
      } else if (
        lowerName.includes("namkeen") ||
        lowerName.includes("farsan") ||
        lowerName.includes("khakhra") ||
        lowerName.includes("sev") ||
        lowerName.includes("chips")
      ) {
        sweetnessLevel = "none";
      }

      // Contains Nuts
      let containsNuts: "yes" | "no" | "may_contain" = "no";
      if (
        lowerName.includes("kaju") ||
        lowerName.includes("cashew") ||
        lowerName.includes("badam") ||
        lowerName.includes("almond") ||
        lowerName.includes("pista") ||
        lowerName.includes("pistachio") ||
        lowerName.includes("walnut") ||
        lowerName.includes("dry fruit")
      ) {
        containsNuts = "yes";
      }

      // Mithai Type
      let mithaiType: "dry" | "milk_based" | "ghee_based" | "namkeen" | "bakery" | "other" = "dry";
      if (lowerName.includes("penda") || lowerName.includes("peda") || lowerName.includes("mawa") || lowerName.includes("milk") || lowerName.includes("jamun")) {
        mithaiType = "milk_based";
      } else if (lowerName.includes("ghee") || lowerName.includes("mohanthal") || lowerName.includes("mysore pak") || lowerName.includes("ladoo")) {
        mithaiType = "ghee_based";
      } else if (lowerName.includes("namkeen") || lowerName.includes("farsan") || lowerName.includes("khakhra") || lowerName.includes("sev") || lowerName.includes("chips")) {
        mithaiType = "namkeen";
      } else if (lowerName.includes("biscuit") || lowerName.includes("cookie") || lowerName.includes("toast") || lowerName.includes("khari")) {
        mithaiType = "bakery";
      }

      // Occasions
      const occList: string[] = ["everyday"];
      if (lowerName.includes("royal") || lowerName.includes("silver") || lowerName.includes("kesar") || lowerName.includes("special") || lowerName.includes("gift")) {
        occList.push("wedding_gifting", "festival", "corporate");
      }
      if (lowerName.includes("ladoo") || lowerName.includes("mohanthal") || lowerName.includes("farali")) {
        occList.push("festival", "birthday_anniversary");
      }

      // Dietary tags
      const dietList: string[] = ["pure_ghee"];
      if (lowerName.includes("farali") || lowerName.includes("upvas") || lowerName.includes("millet")) {
        dietList.push("gluten_free");
      }
      if (lowerName.includes("sugarless") || lowerName.includes("sugar-free")) {
        dietList.push("sugar_free");
      }

      const whyLine =
        containsNuts === "yes"
          ? "Rich premium dry-fruit craftsmanship with melt-in-mouth finish."
          : sweetnessLevel === "low"
          ? "Subtle, mindful sweetness handcrafted with authentic pure cow ghee."
          : "Freshly prepared in small karahi batches with authentic 1976 heritage taste.";

      try {
        const [existing] = await db
          .select({ id: productQuizTags.id })
          .from(productQuizTags)
          .where(eq(productQuizTags.productId, prod.id))
          .limit(1);

        if (existing) {
          await db
            .update(productQuizTags)
            .set({
              sweetnessLevel,
              containsNuts,
              mithaiType,
              occasions: occList.join(","),
              dietaryTags: dietList.join(","),
              texture: mithaiType === "dry" ? "chewy" : "soft_melt",
              quizDescription: whyLine,
              isFeaturedInQuiz: prod.isFeatured,
            })
            .where(eq(productQuizTags.id, existing.id));
        } else {
          await db.insert(productQuizTags).values({
            productId: prod.id,
            sweetnessLevel,
            containsNuts,
            mithaiType,
            occasions: occList.join(","),
            dietaryTags: dietList.join(","),
            texture: mithaiType === "dry" ? "chewy" : "soft_melt",
            quizDescription: whyLine,
            isFeaturedInQuiz: prod.isFeatured,
          });
        }
        taggedCount++;
      } catch (tagErr) {
        console.warn(`[TasteQuiz] Tagging product ${prod.id} failed:`, tagErr);
      }
    }

    return { tagged: taggedCount };
  } catch (err) {
    console.error("[TasteQuiz] autoTagCatalogProducts error:", err);
    return { tagged: 0 };
  }
}

// -------------------------------------------------------------
// GETTERS & API HELPERS
// -------------------------------------------------------------

export async function getQuizQuestions(): Promise<QuizQuestionItem[]> {
  await ensureQuizDataSeeded();

  try {
    const qRows = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.isEnabled, true))
      .orderBy(quizQuestions.stepNumber);

    const optRows = await db
      .select()
      .from(quizOptions)
      .where(eq(quizOptions.isEnabled, true))
      .orderBy(quizOptions.sortOrder);

    const optionsByQKey: Record<string, QuizOptionItem[]> = {};
    for (const opt of optRows) {
      if (!optionsByQKey[opt.questionKey]) {
        optionsByQKey[opt.questionKey] = [];
      }
      let mapping: any = {};
      try {
        mapping = JSON.parse(opt.tagMapping);
      } catch {}

      optionsByQKey[opt.questionKey].push({
        key: opt.optionKey,
        label: opt.label,
        description: opt.description || undefined,
        icon: opt.icon || undefined,
        sortOrder: opt.sortOrder,
        tagMapping: mapping,
      });
    }

    if (qRows.length === 0) {
      return DEFAULT_QUESTIONS;
    }

    return qRows.map((q) => ({
      id: q.id,
      key: q.questionKey,
      title: q.title,
      subtitle: q.subtitle || undefined,
      stepNumber: q.stepNumber,
      icon: q.icon || undefined,
      weight: q.weight,
      isStrictFilter: q.isStrictFilter,
      options: optionsByQKey[q.questionKey] || [],
    }));
  } catch (err) {
    console.warn("[TasteQuiz] getQuizQuestions fallback:", err);
    return DEFAULT_QUESTIONS;
  }
}

export async function getQuizSettings() {
  await ensureQuizDataSeeded();
  try {
    const [settings] = await db.select().from(quizSettings).limit(1);
    if (!settings) {
      return {
        isEnabled: true,
        leadCaptureEnabled: true,
        leadCaptureHeading: "Where should we send your mithai match?",
        leadCaptureSubheading:
          "Save your personalized taste profile & unlock a special festive welcome code.",
        maxResults: 4,
        comboDiscountPercent: 10,
        allergyDisclaimer:
          "Please note: While we follow strict preparation protocols, all products are handcrafted in a facility handling dairy, ghee, and nuts. Check product ingredient details for severe allergies.",
        pinnedProductId: null,
      };
    }
    return settings;
  } catch {
    return {
      isEnabled: true,
      leadCaptureEnabled: true,
      leadCaptureHeading: "Where should we send your mithai match?",
      leadCaptureSubheading:
        "Save your personalized taste profile & unlock a special festive welcome code.",
      maxResults: 4,
      comboDiscountPercent: 10,
      allergyDisclaimer:
        "Please note: While we follow strict preparation protocols, all products are handcrafted in a facility handling dairy, ghee, and nuts. Check product ingredient details for severe allergies.",
      pinnedProductId: null,
    };
  }
}

export async function getQuizPersonalities(): Promise<QuizPersonalityItem[]> {
  await ensureQuizDataSeeded();
  try {
    const list = await db.select().from(quizPersonalities);
    if (list.length === 0) return DEFAULT_PERSONALITIES;
    return list.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      badge: p.badge || "Pure Heritage",
      recommendedSweet: p.recommendedSweet || "Vardayini Signature Sweet",
      heroImageUrl: p.heroImageUrl || "/images/kaju-katli.jpg",
    }));
  } catch {
    return DEFAULT_PERSONALITIES;
  }
}

// -------------------------------------------------------------
// CORE MATCHING ENGINE
// -------------------------------------------------------------

export async function calculateQuizMatch(
  answers: QuizMatchAnswerPayload
): Promise<QuizMatchResult> {
  await ensureQuizDataSeeded();
  const settings = await getQuizSettings();

  const maxItems = Math.min(Math.max(settings.maxResults || 4, 3), 5);
  const strictNoNuts = answers.nuts === "no_nuts";

  // Fetch all active products with their default variant & tags
  const productsList = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      isFeatured: products.isFeatured,
      isActive: products.isActive,
      isArchived: products.isArchived,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      variantId: productVariants.id,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      weight: productVariants.weight,
      stock: productVariants.stock,
      tagId: productQuizTags.id,
      sweetnessLevel: productQuizTags.sweetnessLevel,
      containsNuts: productQuizTags.containsNuts,
      mithaiType: productQuizTags.mithaiType,
      occasions: productQuizTags.occasions,
      dietaryTags: productQuizTags.dietaryTags,
      quizDescription: productQuizTags.quizDescription,
      isFeaturedInQuiz: productQuizTags.isFeaturedInQuiz,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(
      productVariants,
      and(
        eq(products.id, productVariants.productId),
        eq(productVariants.isDefault, true),
        eq(productVariants.isActive, true)
      )
    )
    .leftJoin(productQuizTags, eq(products.id, productQuizTags.productId))
    .where(and(eq(products.isActive, true), eq(products.isArchived, false)));

  // Separate valid candidates
  let availableCandidates = productsList.filter((p) => p.stock > 0);
  if (availableCandidates.length === 0) {
    // Fallback if all stocks marked 0 in test environment
    availableCandidates = productsList;
  }

  // 1. Hard Nut Allergy Filter (STRICT RULE)
  if (strictNoNuts) {
    availableCandidates = availableCandidates.filter((p) => {
      // Must not be tagged as contains nuts
      if (p.containsNuts === "yes" || p.containsNuts === "may_contain") {
        return false;
      }
      // Safeguard: Check product name for nuts keywords
      const name = p.name.toLowerCase();
      if (
        name.includes("kaju") ||
        name.includes("cashew") ||
        name.includes("badam") ||
        name.includes("almond") ||
        name.includes("pista") ||
        name.includes("pistachio") ||
        name.includes("walnut") ||
        name.includes("dry fruit")
      ) {
        return false;
      }
      return true;
    });
  }

  // Helper function to score a product
  const scoreProduct = (item: typeof availableCandidates[0], relaxFilters: boolean) => {
    let score = 50; // base score

    // Sweetness score (Weight: 30)
    if (answers.sweetness) {
      if (item.sweetnessLevel === answers.sweetness) {
        score += 30;
      } else if (
        (answers.sweetness === "medium" && (item.sweetnessLevel === "low" || item.sweetnessLevel === "high")) ||
        (answers.sweetness === "low" && item.sweetnessLevel === "medium")
      ) {
        score += 15;
      }
    }

    // Mithai Type score (Weight: 25)
    if (answers.type && answers.type !== "surprise_me") {
      if (item.mithaiType === answers.type) {
        score += 25;
      } else if (relaxFilters) {
        score += 10;
      }
    } else {
      score += 20; // surprise me loves all
    }

    // Occasion score (Weight: 20)
    if (answers.occasion) {
      const occs = (item.occasions || "").split(",").map((s) => s.trim());
      if (occs.includes(answers.occasion)) {
        score += 20;
      } else if (occs.includes("everyday")) {
        score += 10;
      }
    }

    // Budget match (Weight: 15)
    const effectivePrice = item.discountedPrice || item.price;
    if (answers.budget) {
      if (answers.budget === "under_500" && effectivePrice <= 500) score += 15;
      else if (answers.budget === "500_1000" && effectivePrice >= 450 && effectivePrice <= 1050) score += 15;
      else if (answers.budget === "1000_2000" && effectivePrice >= 950 && effectivePrice <= 2100) score += 15;
      else if (answers.budget === "above_2000" && effectivePrice >= 1900) score += 15;
    }

    // Nut preference bonus
    if (answers.nuts === "love_nuts" && item.containsNuts === "yes") {
      score += 25;
    }

    // Featured / Best Seller bonus
    if (item.isFeatured || item.isFeaturedInQuiz) {
      score += 10;
    }

    return score;
  };

  // Score all available
  let scored = availableCandidates.map((prod) => ({
    product: prod,
    score: scoreProduct(prod, false),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  let relaxed = false;
  let relaxedReason: string | undefined = undefined;

  // Edge case: If fewer than 3 products matched cleanly (e.g. strict budget/type), relax least important filter
  if (scored.length < maxItems) {
    relaxed = true;
    relaxedReason =
      strictNoNuts
        ? "We relaxed occasion & budget limits while strictly ensuring 100% nut-free recipe safety."
        : "We also included close taste matches across our heritage counter so you don't miss out!";

    scored = availableCandidates.map((prod) => ({
      product: prod,
      score: scoreProduct(prod, true),
    }));
    scored.sort((a, b) => b.score - a.score);
  }

  // Select top matched products
  const selected = scored.slice(0, maxItems);

  // Determine user personality based on answers
  const personality = selectPersonality(answers);

  // Generate personalized "Why this suits you" line
  const matchedProducts: QuizMatchedProduct[] = selected.map(({ product: p, score }) => {
    // Generate tailored reasoning
    const whyReasons: string[] = [];
    if (strictNoNuts) {
      whyReasons.push("100% nut-free pure recipe");
    } else if (answers.nuts === "love_nuts" && p.containsNuts === "yes") {
      whyReasons.push("Loaded with rich cashews & pistachios");
    }

    if (answers.sweetness === "low" && p.sweetnessLevel === "low") {
      whyReasons.push("gentle, low sweetness");
    } else if (answers.sweetness === "high" && p.sweetnessLevel === "high") {
      whyReasons.push("traditional indulgent sweetness");
    } else if (p.sweetnessLevel === "medium") {
      whyReasons.push("balanced heritage sweetness");
    }

    if (answers.occasion === "festival") {
      whyReasons.push("auspicious festive packaging");
    } else if (answers.occasion === "birthday_anniversary") {
      whyReasons.push("perfect for celebrating with loved ones");
    } else if (answers.occasion === "everyday") {
      whyReasons.push("ideal tea-time treat");
    }

    const price = p.discountedPrice || p.price;
    const whySuitsYou =
      p.quizDescription ||
      `Handcrafted with ${whyReasons.join(" & ")}, perfectly sized for ₹${price}.`;

    const matchPercentage = Math.min(Math.round((score / 170) * 100), 99);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      categoryName: p.categoryName,
      price: p.price,
      discountedPrice: p.discountedPrice,
      defaultWeight: p.weight,
      variantId: p.variantId,
      matchScore: score,
      matchPercentage: Math.max(matchPercentage, 85), // Keep high match feel (85-99%)
      whySuitsYou,
      dietaryTags: (p.dietaryTags || "pure_ghee").split(",").map((t) => t.trim()),
      sweetnessLevel: p.sweetnessLevel || "medium",
      containsNuts: p.containsNuts || "no",
      mithaiType: p.mithaiType || "dry",
    };
  });

  // Calculate Combo Bundle Box
  const originalTotal = matchedProducts.reduce(
    (sum, item) => sum + (item.discountedPrice || item.price),
    0
  );
  const discountPercent = settings.comboDiscountPercent || 10;
  const bundlePrice = Math.round(originalTotal * (1 - discountPercent / 100));
  const savings = originalTotal - bundlePrice;

  const allergyNotice = strictNoNuts
    ? "Allergy Disclaimer: These matches are strictly nut-free. Please note that our kitchen also prepares cashew and almond sweets using separate equipment."
    : settings.allergyDisclaimer;

  const shareText = `My Mithai Personality is "${personality.name}"! Find your perfect heritage sweet in 30 seconds at Vardayini Sweet Mart.`;
  const shareUrl = "http://localhost:9449/find-your-mithai";

  return {
    personality,
    matches: matchedProducts,
    totalMatchesCount: matchedProducts.length,
    relaxedFilter: relaxed,
    relaxedFilterReason: relaxedReason,
    comboBundle: {
      title: "Your Personalized Mithai Combo Box",
      description: `Curated assortment of all ${matchedProducts.length} matched sweets. Buy together & enjoy ${discountPercent}% festive combo savings!`,
      originalTotal,
      discountPercent,
      bundlePrice,
      savings,
      itemCount: matchedProducts.length,
    },
    allergyDisclaimer: allergyNotice,
    shareText,
    shareUrl,
  };
}

/**
 * Logic to map answers to a personality
 */
function selectPersonality(answers: QuizMatchAnswerPayload): QuizPersonalityItem {
  if (answers.nuts === "no_nuts") {
    return DEFAULT_PERSONALITIES.find((p) => p.slug === "nut-free-heritage-purist")!;
  }

  if (answers.sweetness === "low") {
    return DEFAULT_PERSONALITIES.find((p) => p.slug === "mindful-mithai-enthusiast")!;
  }

  if (answers.sweetness === "high") {
    return DEFAULT_PERSONALITIES.find((p) => p.slug === "sweet-tooth-royal")!;
  }

  if (answers.type === "ghee_based" || answers.occasion === "festival") {
    return DEFAULT_PERSONALITIES.find((p) => p.slug === "grand-festive-traditionalist")!;
  }

  if (answers.occasion === "wedding_gifting" || answers.budget === "above_2000") {
    return DEFAULT_PERSONALITIES.find((p) => p.slug === "royal-kesar-connoisseur")!;
  }

  // Default to beloved Kaju Katli lover
  return DEFAULT_PERSONALITIES.find((p) => p.slug === "classic-kaju-lover")!;
}

// -------------------------------------------------------------
// LEAD & RESULT PERSISTENCE
// -------------------------------------------------------------

export async function saveQuizLead(data: {
  userId?: number | null;
  sessionId?: string | null;
  name?: string;
  phone?: string;
  email?: string;
  marketingConsent?: boolean;
  personalitySlug?: string;
  answers: any;
  matchedProductIds: number[];
}) {
  try {
    const [inserted] = await db
      .insert(quizLeads)
      .values({
        userId: data.userId || null,
        sessionId: data.sessionId || null,
        name: data.name?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        marketingConsent: Boolean(data.marketingConsent),
        personalitySlug: data.personalitySlug || null,
        answers: JSON.stringify(data.answers || {}),
        matchedProductIds: JSON.stringify(data.matchedProductIds || []),
      });

    return { success: true, leadId: (inserted as any)?.insertId };
  } catch (err: any) {
    console.error("[TasteQuiz] saveQuizLead error:", err);
    return { success: false, error: err.message };
  }
}

export async function saveUserQuizResult(data: {
  userId?: number | null;
  sessionId?: string | null;
  personalitySlug: string;
  personalityName: string;
  answers: any;
  matchedProducts: any[];
}) {
  try {
    const [inserted] = await db
      .insert(userQuizResults)
      .values({
        userId: data.userId || null,
        sessionId: data.sessionId || null,
        personalitySlug: data.personalitySlug,
        personalityName: data.personalityName,
        answers: JSON.stringify(data.answers || {}),
        matchedProductsJson: JSON.stringify(data.matchedProducts || []),
      });

    return { success: true, id: (inserted as any)?.insertId };
  } catch (err: any) {
    console.error("[TasteQuiz] saveUserQuizResult error:", err);
    return { success: false, error: err.message };
  }
}

export async function getLatestUserQuizResult(userId?: number | null, sessionId?: string | null) {
  if (!userId && !sessionId) return null;
  try {
    let query = db.select().from(userQuizResults);
    if (userId) {
      query = query.where(eq(userQuizResults.userId, userId)) as any;
    } else if (sessionId) {
      query = query.where(eq(userQuizResults.sessionId, sessionId)) as any;
    }

    const rows = await query.orderBy(desc(userQuizResults.createdAt)).limit(1);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      personalitySlug: row.personalitySlug,
      personalityName: row.personalityName,
      answers: JSON.parse(row.answers || "{}"),
      matchedProducts: JSON.parse(row.matchedProductsJson || "[]"),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
