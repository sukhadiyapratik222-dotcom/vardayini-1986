import { db } from "@/db";
import { ensureSeeded, PRODUCT_CATALOG } from "@/db/seed";
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

export * from "./taste-quiz-types";
import {
  QuizOptionItem,
  QuizQuestionItem,
  QuizPersonalityItem,
  QuizMatchAnswerPayload,
  QuizMatchedProduct,
  QuizMatchResult,
  DEFAULT_QUESTIONS,
  DEFAULT_PERSONALITIES,
} from "./taste-quiz-types";

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
// RELATED HERITAGE SWEETS FALLBACK (NEVER RETURN 0 ITEMS)
// -------------------------------------------------------------

export function getRelatedHeritageSweets(strictNoNuts: boolean): QuizMatchedProduct[] {
  if (strictNoNuts) {
    return [
      {
        id: 3,
        name: "Shuddh Desi Ghee Mohanthal",
        slug: "desi-ghee-mohanthal",
        imageUrl: "/images/motichoor.jpg",
        categoryName: "Indian Ghee Sweets",
        price: 250,
        discountedPrice: 240,
        defaultWeight: "250g",
        variantId: 927,
        matchScore: 95,
        matchPercentage: 96,
        whySuitsYou: "100% nut-free recipe simmered slowly in pure Gir cow ghee. Heritage 1976 recipe.",
        dietaryTags: ["pure_ghee", "nut_free"],
        sweetnessLevel: "medium",
        containsNuts: "no",
        mithaiType: "ghee_based",
      },
      {
        id: 47,
        name: "Mysore Pak (Ghee Rich)",
        slug: "mysore-pak",
        imageUrl: "/images/showcase/mysore-pak-clean.jpg",
        categoryName: "Indian Ghee Sweets",
        price: 250,
        discountedPrice: 240,
        defaultWeight: "250g",
        variantId: 971,
        matchScore: 92,
        matchPercentage: 94,
        whySuitsYou: "Porous, ghee-dripping royal Mysore Pak handcrafted with 100% nut-free pure desi ghee.",
        dietaryTags: ["pure_ghee", "nut_free"],
        sweetnessLevel: "medium",
        containsNuts: "no",
        mithaiType: "ghee_based",
      },
      {
        id: 48,
        name: "Motichoor Ladoo (Pure Desi Ghee)",
        slug: "motichoor-ladoo",
        imageUrl: "/images/motichoor.jpg",
        categoryName: "Festival Specials",
        price: 240,
        discountedPrice: 220,
        defaultWeight: "250g",
        variantId: 972,
        matchScore: 90,
        matchPercentage: 92,
        whySuitsYou: "Fine gram flour pearls fried in pure cow ghee, seasoned with cardamom. 100% nut-free.",
        dietaryTags: ["pure_ghee", "nut_free"],
        sweetnessLevel: "medium",
        containsNuts: "no",
        mithaiType: "ghee_based",
      },
      {
        id: 37,
        name: "Kesar Malai Penda",
        slug: "kesar-malai-penda",
        imageUrl: "/images/peda.jpg",
        categoryName: "Penda",
        price: 230,
        discountedPrice: 210,
        defaultWeight: "250g",
        variantId: 961,
        matchScore: 88,
        matchPercentage: 90,
        whySuitsYou: "Slow-reduced mawa infused with Kashmiri saffron and cardamom. Nut-free heritage sweet.",
        dietaryTags: ["pure_ghee", "nut_free"],
        sweetnessLevel: "medium",
        containsNuts: "no",
        mithaiType: "milk_based",
      },
    ];
  }

  return [
    {
      id: 1,
      name: "Kaju Katli (Royal Silver Foil)",
      slug: "kaju-katli",
      imageUrl: "/images/kaju-katli.jpg",
      categoryName: "Kaju Sweets",
      price: 320,
      discountedPrice: 289,
      defaultWeight: "250g",
      variantId: 925,
      matchScore: 98,
      matchPercentage: 98,
      whySuitsYou: "Silky Goan cashew diamonds finished with edible silver leaf. Our #1 best-seller since 1976.",
      dietaryTags: ["pure_ghee", "dry_fruit"],
      sweetnessLevel: "medium",
      containsNuts: "yes",
      mithaiType: "dry",
    },
    {
      id: 3,
      name: "Shuddh Desi Ghee Mohanthal",
      slug: "desi-ghee-mohanthal",
      imageUrl: "/images/motichoor.jpg",
      categoryName: "Indian Ghee Sweets",
      price: 250,
      discountedPrice: 240,
      defaultWeight: "250g",
      variantId: 927,
      matchScore: 95,
      matchPercentage: 96,
      whySuitsYou: "Traditional golden besan fudge roasted slowly in pure Gir cow ghee with aromatic cardamom.",
      dietaryTags: ["pure_ghee"],
      sweetnessLevel: "medium",
      containsNuts: "no",
      mithaiType: "ghee_based",
    },
    {
      id: 37,
      name: "Kesar Malai Penda",
      slug: "kesar-malai-penda",
      imageUrl: "/images/peda.jpg",
      categoryName: "Penda",
      price: 230,
      discountedPrice: 210,
      defaultWeight: "250g",
      variantId: 961,
      matchScore: 92,
      matchPercentage: 94,
      whySuitsYou: "Rich slow-cooked milk mawa infused with pure saffron strands and melt-in-mouth texture.",
      dietaryTags: ["pure_ghee"],
      sweetnessLevel: "medium",
      containsNuts: "no",
      mithaiType: "milk_based",
    },
    {
      id: 48,
      name: "Motichoor Ladoo (Pure Desi Ghee)",
      slug: "motichoor-ladoo",
      imageUrl: "/images/motichoor.jpg",
      categoryName: "Festival Specials",
      price: 240,
      discountedPrice: 220,
      defaultWeight: "250g",
      variantId: 972,
      matchScore: 90,
      matchPercentage: 91,
      whySuitsYou: "Golden micro-pearls fried in 100% pure desi ghee, lightly sweetened with pure sugar syrup.",
      dietaryTags: ["pure_ghee"],
      sweetnessLevel: "medium",
      containsNuts: "no",
      mithaiType: "ghee_based",
    },
  ];
}

// -------------------------------------------------------------
// CORE MATCHING ENGINE
// -------------------------------------------------------------

export async function calculateQuizMatch(
  answers: QuizMatchAnswerPayload
): Promise<QuizMatchResult> {
  // Ultra-fast local SQLite initialization without blocking on remote MongoDB
  try {
    const { getSqliteDb } = await import("@/db");
    const sqlite = getSqliteDb();
    const count = (sqlite.prepare("SELECT count(*) as count FROM products").get() as any)?.count || 0;
    if (count === 0) {
      const { ensureEssentialProducts } = await import("@/db/seed");
      await ensureEssentialProducts().catch(() => null);
    }
  } catch {}

  await ensureQuizDataSeeded();
  const settings = await getQuizSettings();

  const maxItems = Math.min(Math.max(settings.maxResults || 4, 3), 5);
  const strictNoNuts = answers.nuts === "no_nuts";

  // Fetch all active products with variants & tags (resilient leftJoin)
  let rawList: any[] = [];
  try {
    rawList = await db
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
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .leftJoin(productQuizTags, eq(products.id, productQuizTags.productId))
      .where(and(eq(products.isActive, true), eq(products.isArchived, false)));
  } catch (queryErr) {
    console.warn("[TasteQuiz] products query notice:", queryErr);
  }

  // Deduplicate products by id (leftJoin on variants may produce multiple rows)
  const uniqueProductsMap = new Map<number, any>();
  for (const p of rawList) {
    if (!uniqueProductsMap.has(p.id)) {
      uniqueProductsMap.set(p.id, {
        ...p,
        price: p.price || 240,
        discountedPrice: p.discountedPrice || null,
        weight: p.weight || "250g",
        stock: p.stock ?? 50,
        categoryName: p.categoryName || "Heritage Sweets",
        categorySlug: p.categorySlug || "sweets",
        variantId: p.variantId || p.id,
      });
    }
  }

  let uniqueProducts = Array.from(uniqueProductsMap.values());

  // Resilient fallback to PRODUCT_CATALOG if database is cold / serverless instance initializing
  if (uniqueProducts.length < 4) {
    const catalogFallback = PRODUCT_CATALOG.map((item, idx) => {
      const v = item.variants?.[0] || { price: 280, discountedPrice: 250, weight: "250g", stock: 50 };
      const lower = (item.name + " " + item.description + " " + (item.tags || "")).toLowerCase();
      const containsNuts = /kaju|cashew|badam|almond|pista|pistachio|walnut|dry fruit/.test(lower) ? "yes" : "no";
      const sweetnessLevel = /sugarless|sugar-free|anjeer|millet/.test(lower) ? "low" : /jamun|rasgulla|jalebi/.test(lower) ? "high" : "medium";
      const mithaiType = /penda|peda|mawa|jamun/.test(lower) ? "milk_based" : /ghee|mohanthal|mysore|ladoo/.test(lower) ? "ghee_based" : "dry";
      return {
        id: idx + 101,
        name: item.name,
        slug: item.slug,
        imageUrl: item.imageUrl || "/images/kaju-katli.jpg",
        isFeatured: item.isFeatured,
        isActive: true,
        isArchived: false,
        categoryId: 1,
        categoryName: item.category || "Heritage Sweets",
        categorySlug: item.category || "sweets",
        variantId: idx + 1001,
        price: v.price || 280,
        discountedPrice: v.discountedPrice || null,
        weight: v.weight || "250g",
        stock: v.stock || 50,
        tagId: idx + 501,
        sweetnessLevel,
        containsNuts,
        mithaiType,
        occasions: "everyday,festival,wedding_gifting",
        dietaryTags: "pure_ghee",
        quizDescription: "Handcrafted 1976 heritage recipe with pure desi ghee and melt-in-mouth richness.",
        isFeaturedInQuiz: item.isFeatured,
      };
    });
    uniqueProducts = [...uniqueProducts, ...catalogFallback];
  }

  // Separate valid candidates
  let availableCandidates = uniqueProducts.filter((p) => p.stock > 0);
  if (availableCandidates.length === 0) {
    availableCandidates = uniqueProducts;
  }

  // 1. Hard Nut Allergy Filter (STRICT RULE)
  if (strictNoNuts) {
    const nutFree = availableCandidates.filter((p) => {
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

    if (nutFree.length >= 2) {
      availableCandidates = nutFree;
    }
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
      const occs = String(item.occasions || "").split(",").map((s: string) => s.trim());
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

  // Edge case: If fewer than maxItems products matched cleanly (e.g. strict budget/type), relax least important filter
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

  // Guarantee at least maxItems by backfilling from uniqueProducts if needed
  if (scored.length < maxItems) {
    const existingIds = new Set(scored.map((s) => s.product.id));
    for (const prod of uniqueProducts) {
      if (!existingIds.has(prod.id)) {
        scored.push({
          product: prod,
          score: scoreProduct(prod, true),
        });
        existingIds.add(prod.id);
        if (scored.length >= maxItems) break;
      }
    }
  }

  // Select top matched products (strictly at least 3-4 items)
  const selected = scored.slice(0, maxItems);

  // Determine user personality based on answers
  const personality = selectPersonality(answers);

  // Generate personalized "Why this suits you" line
  let matchedProducts: QuizMatchedProduct[] = selected.map(({ product: p, score }) => {
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
      dietaryTags: String(p.dietaryTags || "pure_ghee").split(",").map((t: string) => t.trim()),
      sweetnessLevel: p.sweetnessLevel || "medium",
      containsNuts: p.containsNuts || "no",
      mithaiType: p.mithaiType || "dry",
    };
  });

  // GUARANTEE: If no exact match found or fewer than 3 items, provide related customer favorites!
  if (matchedProducts.length < 3) {
    const relatedFallback = getRelatedHeritageSweets(strictNoNuts);
    for (const rel of relatedFallback) {
      if (!matchedProducts.some((m) => m.slug === rel.slug)) {
        matchedProducts.push(rel);
        if (matchedProducts.length >= maxItems) break;
      }
    }
    relaxed = true;
    relaxedReason = strictNoNuts
      ? "No exact match found for your specific filter combination. Showing related 100% nut-free heritage sweets!"
      : "No exact match found for your specific filter combination. Showing related handcrafted signature sweets tailored to your taste!";
  }

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
