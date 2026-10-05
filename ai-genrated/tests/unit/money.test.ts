import { describe, it, expect } from "vitest";
import { unitPrice, calcTotals, formatInr } from "@/lib/money";

describe("Unit Tests: Money & Pricing Utilities (lib/money.ts)", () => {
  describe("unitPrice", () => {
    const basePrice = 250;

    it("returns base price when discountedPrice is null", () => {
      expect(unitPrice(basePrice, null)).toBe(basePrice);
    });

    it("returns base price when discountedPrice is zero", () => {
      expect(unitPrice(basePrice, 0)).toBe(basePrice);
    });

    it("returns base price when discountedPrice is negative", () => {
      expect(unitPrice(basePrice, -50)).toBe(basePrice);
    });

    it("returns base price when discountedPrice is equal to price", () => {
      expect(unitPrice(basePrice, 250)).toBe(basePrice);
    });

    it("returns base price when discountedPrice is higher than price", () => {
      expect(unitPrice(basePrice, 300)).toBe(basePrice);
    });

    it("returns discountedPrice when it is valid and strictly lower than base price", () => {
      expect(unitPrice(basePrice, 199)).toBe(199);
    });
  });

  describe("calcTotals", () => {
    it("returns delivery fee of 49 and total 49 for subtotal 0, discount 0", () => {
      const res = calcTotals(0, 0);
      expect(res.subtotal).toBe(0);
      expect(res.discount).toBe(0);
      expect(res.tax).toBe(0);
      expect(res.deliveryFee).toBe(49);
      expect(res.total).toBe(49);
    });

    it("subtotal 798 gives tax 40, delivery 49, and total 887", () => {
      // 798 * 0.05 = 39.9 -> 40 tax. Delivery fee = 49 (798 < 799). Total = 798 + 40 + 49 = 887.
      const res = calcTotals(798, 0);
      expect(res.tax).toBe(40);
      expect(res.deliveryFee).toBe(49);
      expect(res.total).toBe(887);
    });

    it("subtotal 799 gives tax 40, delivery 0, and total 839", () => {
      // 799 * 0.05 = 39.95 -> 40 tax. Delivery fee = 0 (799 >= 799 free delivery threshold). Total = 799 + 40 + 0 = 839.
      const res = calcTotals(799, 0);
      expect(res.tax).toBe(40);
      expect(res.deliveryFee).toBe(0);
      expect(res.total).toBe(839);
    });

    it("calcTotals(800, 2) includes delivery fee because taxable subtotal falls to 798", () => {
      // subtotal 800 - discount 2 = 798 taxable (< 799 threshold).
      // Delivery fee of 49 must be charged!
      const res = calcTotals(800, 2);
      expect(res.discount).toBe(2);
      expect(res.tax).toBe(40);
      expect(res.deliveryFee).toBe(49);
      expect(res.total).toBe(887);
    });

    it("clamps negative discount to 0", () => {
      const res = calcTotals(500, -100);
      expect(res.discount).toBe(0);
      expect(res.tax).toBe(25);
      expect(res.deliveryFee).toBe(49);
      expect(res.total).toBe(574);
    });

    it("clamps discount above subtotal to subtotal", () => {
      const res = calcTotals(300, 500);
      expect(res.discount).toBe(300);
      expect(res.tax).toBe(0);
      expect(res.deliveryFee).toBe(49);
      expect(res.total).toBe(49);
    });

    it("freeDelivery override sets delivery to 0 even if subtotal is below threshold", () => {
      const res = calcTotals(200, 0, true);
      expect(res.deliveryFee).toBe(0);
      expect(res.tax).toBe(10);
      expect(res.total).toBe(210);
    });
  });

  describe("formatInr", () => {
    it("formats amounts using en-IN grouping (e.g. ₹1,00,000)", () => {
      const formatted = formatInr(100000).replace(/\u00a0|\u202f/g, " ");
      expect(formatted).toContain("1,00,000");
      expect(formatted).toContain("₹");
    });

    it("displays 0 decimals (no .00 or fractional digits)", () => {
      const formatted = formatInr(250);
      expect(formatted).not.toContain(".00");
      expect(formatted).not.toContain(".0");
      expect(formatted).toContain("250");
    });
  });
});
