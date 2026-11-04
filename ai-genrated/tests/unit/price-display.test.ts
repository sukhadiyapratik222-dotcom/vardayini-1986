import { describe, it, expect } from "vitest";
import { formatInr, unitPrice } from "@/lib/money";

describe("Product Price Display Logic Verification", () => {
  function computePriceDisplay(variant: {
    price: number;
    discountedPrice: number | null;
    weight?: string;
  }, comparePrice?: number | null) {
    const sellingPrice = unitPrice(variant.price, variant.discountedPrice);
    const rawOriginalPrice = variant.discountedPrice ? variant.price : comparePrice || null;
    const hasDiscount = Boolean(rawOriginalPrice && rawOriginalPrice > sellingPrice);
    const originalPrice = hasDiscount ? rawOriginalPrice : null;
    const discountPercent = hasDiscount && originalPrice
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : 0;
    const currentWeight = variant.weight || "1 kg";
    const packSizeText = currentWeight.toLowerCase().includes("pack")
      ? currentWeight
      : `Standard Pack • ${currentWeight}`;

    return {
      packSizeText,
      sellingPrice,
      sellingPriceFormatted: formatInr(sellingPrice),
      hasDiscount,
      originalPrice,
      originalPriceFormatted: originalPrice ? formatInr(originalPrice) : null,
      discountPercent,
      discountBadge: discountPercent > 0 ? `${discountPercent}% OFF` : null,
    };
  }

  it("Requirement 1: displays pack size clearly (e.g. Standard Pack • 1 kg)", () => {
    const res = computePriceDisplay({ price: 1450, discountedPrice: null, weight: "1 kg" });
    expect(res.packSizeText).toBe("Standard Pack • 1 kg");

    const res500 = computePriceDisplay({ price: 750, discountedPrice: null, weight: "500g" });
    expect(res500.packSizeText).toBe("Standard Pack • 500g");

    const resNamed = computePriceDisplay({ price: 1200, discountedPrice: null, weight: "Festive Box Pack" });
    expect(resNamed.packSizeText).toBe("Festive Box Pack");
  });

  it("Requirement 2: shows current selling price prominently", () => {
    const res = computePriceDisplay({ price: 1450, discountedPrice: 1200 });
    expect(res.sellingPrice).toBe(1200);
    expect(res.sellingPriceFormatted).toMatch(/1,?200/);
  });

  it("Requirement 3: shows original price with strikethrough only when greater than selling price", () => {
    const res = computePriceDisplay({ price: 1800, discountedPrice: 1450 });
    expect(res.hasDiscount).toBe(true);
    expect(res.originalPrice).toBe(1800);
    expect(res.originalPriceFormatted).toMatch(/1,?800/);
  });

  it("Requirement 4: calculates discount percentage automatically", () => {
    // 1800 -> 1450 is ((1800-1450)/1800)*100 = 19.44% -> 19%
    const res1 = computePriceDisplay({ price: 1800, discountedPrice: 1450 });
    expect(res1.discountPercent).toBe(19);
    expect(res1.discountBadge).toBe("19% OFF");

    // 1000 -> 800 is ((1000-800)/1000)*100 = 20%
    const res2 = computePriceDisplay({ price: 1000, discountedPrice: 800 });
    expect(res2.discountPercent).toBe(20);
    expect(res2.discountBadge).toBe("20% OFF");
  });

  it("Requirement 5: if original price and selling price are identical, hides original price and discount badge", () => {
    // Exact case from the user's screenshot: ₹1,450 and ₹1,450
    const res = computePriceDisplay({ price: 1450, discountedPrice: 1450 });
    expect(res.sellingPrice).toBe(1450);
    expect(res.hasDiscount).toBe(false);
    expect(res.originalPrice).toBeNull();
    expect(res.originalPriceFormatted).toBeNull();
    expect(res.discountPercent).toBe(0);
    expect(res.discountBadge).toBeNull();
  });

  it("Requirement 5 (fallback/null discountedPrice): hides original price when no discount", () => {
    const res = computePriceDisplay({ price: 1450, discountedPrice: null });
    expect(res.sellingPrice).toBe(1450);
    expect(res.hasDiscount).toBe(false);
    expect(res.originalPrice).toBeNull();
    expect(res.discountBadge).toBeNull();
  });

  it("Edge case: if discountedPrice is higher than price, do not treat as discount", () => {
    const res = computePriceDisplay({ price: 1450, discountedPrice: 1600 });
    expect(res.sellingPrice).toBe(1450);
    expect(res.hasDiscount).toBe(false);
    expect(res.originalPrice).toBeNull();
    expect(res.discountBadge).toBeNull();
  });
});

