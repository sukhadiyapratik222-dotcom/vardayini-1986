import { describe, it, expect, beforeEach } from "vitest";
import { GET as getQuestions } from "@/app/api/quiz/questions/route";
import { POST as matchQuiz } from "@/app/api/quiz/match/route";
import { POST as recordLead } from "@/app/api/quiz/lead/route";
import { GET as getTags, POST as autoTag } from "@/app/api/quiz/tags/route";
import { GET as getSettings } from "@/app/api/quiz/settings/route";
import {
  ensureQuizDataSeeded,
  calculateQuizMatch,
  getQuizQuestions,
  autoTagCatalogProducts,
} from "@/lib/taste-quiz";
import { db } from "@/db";
import { products, productVariants, productQuizTags, categories } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";

describe("Taste Quiz API & Matching Engine", () => {
  let customer: any;
  let admin: any;

  beforeEach(async () => {
    await ensureSeeded();
    await ensureQuizDataSeeded();
    const fixtures = await getTestFixtures();
    customer = fixtures.customer;
    admin = fixtures.admin;

    await logout();
    mockCookieStore.clear();
  });

  it("fetches active quiz questions and options in step order", async () => {
    const res = await getQuestions();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions.length).toBeGreaterThanOrEqual(5);

    const qKeys = body.questions.map((q: any) => q.key);
    expect(qKeys).toContain("sweetness");
    expect(qKeys).toContain("nuts");
    expect(qKeys).toContain("occasion");
    expect(qKeys).toContain("budget");
    expect(qKeys).toContain("type");

    // Check sweetness question has options
    const sweetnessQ = body.questions.find((q: any) => q.key === "sweetness");
    expect(sweetnessQ.options.length).toBeGreaterThanOrEqual(3);
  });

  it("calculates matches for a customer who loves nuts and festival sweets", async () => {
    const req = buildRequest({
      url: "http://localhost:9449/api/quiz/match",
      method: "POST",
      body: {
        answers: {
          sweetness: "medium",
          nuts: "love_nuts",
          occasion: "festival",
          budget: "500_1000",
          type: "dry",
        },
      },
    });

    const res = await matchQuiz(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result).toBeDefined();

    const { personality, matches, comboBundle } = body.result;
    expect(personality.name).toBeDefined();
    expect(matches.length).toBeGreaterThanOrEqual(3);
    expect(matches.length).toBeLessThanOrEqual(5);

    // Each match has tailored explanations
    for (const item of matches) {
      expect(item.name).toBeDefined();
      expect(item.whySuitsYou).toBeDefined();
      expect(item.matchPercentage).toBeGreaterThanOrEqual(80);
      expect(typeof item.price).toBe("number");
    }

    // Verify combo bundle calculation
    expect(comboBundle.bundlePrice).toBeLessThan(comboBundle.originalTotal);
    expect(comboBundle.discountPercent).toBe(10);
    expect(comboBundle.savings).toBe(comboBundle.originalTotal - comboBundle.bundlePrice);
  });

  it("STRICT ALLERGY RULE: never returns products with nuts when customer picks 'no_nuts'", async () => {
    const req = buildRequest({
      url: "http://localhost:9449/api/quiz/match",
      method: "POST",
      body: {
        answers: {
          sweetness: "medium",
          nuts: "no_nuts", // Strict allergy constraint
          occasion: "everyday",
          budget: "under_500",
          type: "milk_based",
        },
      },
    });

    const res = await matchQuiz(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    const { personality, matches, allergyDisclaimer } = body.result;
    expect(personality.slug).toBe("nut-free-heritage-purist");
    expect(matches.length).toBeGreaterThanOrEqual(1);

    for (const item of matches) {
      expect(item.containsNuts).not.toBe("yes");
      const lower = item.name.toLowerCase();
      expect(lower).not.toContain("kaju");
      expect(lower).not.toContain("cashew");
      expect(lower).not.toContain("almond");
      expect(lower).not.toContain("pista");
    }

    expect(allergyDisclaimer.toLowerCase()).toContain("allergy");
  });

  it("relaxes filter criteria when strict selections have few items to ensure at least 3-4 matches", async () => {
    // Extreme combination
    const matchResult = await calculateQuizMatch({
      sweetness: "high",
      nuts: "no_nuts",
      occasion: "corporate",
      budget: "above_2000",
      type: "ghee_based",
    });

    expect(matchResult.matches.length).toBeGreaterThanOrEqual(3);
    // Relaxed flag should be true if it fell back to close matches
    if (matchResult.relaxedFilter) {
      expect(matchResult.relaxedFilterReason).toBeDefined();
    }
  });

  it("captures customer lead with optional marketing consent", async () => {
    const req = buildRequest({
      url: "http://localhost:9449/api/quiz/lead",
      method: "POST",
      body: {
        name: "Devendra Mehta",
        phone: "+91 98250 99999",
        email: "devendra@gmail.com",
        marketingConsent: true,
        personalitySlug: "royal-kesar-connoisseur",
        answers: { sweetness: "medium", occasion: "festival" },
        matchedProductIds: [1, 2, 3],
      },
    });

    const res = await recordLead(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.leadId).toBeDefined();
  });

  it("auto-tags catalog products and provides admin tag overview", async () => {
    const autoRes = await autoTag();
    expect(autoRes.status).toBe(200);

    const tagsRes = await getTags();
    expect(tagsRes.status).toBe(200);

    const data = await tagsRes.json();
    expect(data.success).toBe(true);
    expect(data.stats.total).toBeGreaterThan(0);
    expect(data.stats.tagged).toBeGreaterThan(0);
  });
});

