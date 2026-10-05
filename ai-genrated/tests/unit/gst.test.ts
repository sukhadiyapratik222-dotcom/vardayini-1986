import { describe, it, expect } from "vitest";
import {
  calculateGst,
  numberToIndianWords,
  resolveStateCode,
  roundToTwo,
  SELLER_DETAILS,
} from "@/lib/gst";

describe("Unit Tests: GST Engine & Invoice Calculations (lib/gst.ts)", () => {
  // Test Case 1: Same-state (Intra-state: Gujarat to Gujarat)
  it("Test 1: Same-state supply (Gujarat to Gujarat) splits tax equally into CGST 2.5% and SGST 2.5%", () => {
    const result = calculateGst({
      items: [
        {
          productName: "Kaju Katli",
          variantWeight: "500g",
          hsnCode: "21069099",
          quantity: 2,
          unitPrice: 500, // Total 1000
          taxRatePercent: 5,
        },
      ],
      buyerState: "Gujarat",
      buyerStateCode: "24",
      deliveryFee: 0,
    });

    expect(result.isInterState).toBe(false);
    expect(result.sellerStateCode).toBe("24");
    expect(result.buyerStateCode).toBe("24");
    expect(result.placeOfSupply).toBe("Gujarat (24)");
    expect(result.subtotal).toBe(1000);
    expect(result.totalTaxableAmount).toBe(1000);
    expect(result.totalCgst).toBe(25); // 2.5% of 1000
    expect(result.totalSgst).toBe(25); // 2.5% of 1000
    expect(result.totalIgst).toBe(0);
    expect(result.totalTax).toBe(50);
    expect(result.grandTotal).toBe(1050);
    expect(result.totalInWords).toBe("Rupees One Thousand Fifty Only");
  });

  // Test Case 2: Different-state (Inter-state: Gujarat to Maharashtra)
  it("Test 2: Inter-state supply (Gujarat to Maharashtra) levies 100% IGST (5%) with 0 CGST and 0 SGST", () => {
    const result = calculateGst({
      items: [
        {
          productName: "Kaju Katli",
          variantWeight: "500g",
          quantity: 1,
          unitPrice: 1000,
          taxRatePercent: 5,
        },
      ],
      buyerState: "Maharashtra",
      buyerStateCode: "27",
      deliveryFee: 0,
    });

    expect(result.isInterState).toBe(true);
    expect(result.placeOfSupply).toBe("Maharashtra (27)");
    expect(result.totalCgst).toBe(0);
    expect(result.totalSgst).toBe(0);
    expect(result.totalIgst).toBe(50); // 5% IGST on 1000
    expect(result.totalTax).toBe(50);
    expect(result.grandTotal).toBe(1050);
  });

  // Test Case 3: Direct item-level discount reduces taxable base before tax calculation
  it("Test 3: Item-level discount reduces taxable base before GST calculation", () => {
    const result = calculateGst({
      items: [
        {
          productName: "Motichoor Ladoo",
          variantWeight: "1kg",
          quantity: 1,
          unitPrice: 600,
          discount: 100, // 600 - 100 = 500 taxable
          taxRatePercent: 5,
        },
      ],
      buyerState: "Gujarat",
      buyerStateCode: "24",
    });

    expect(result.subtotal).toBe(600);
    expect(result.totalDiscount).toBe(100);
    expect(result.totalTaxableAmount).toBe(500);
    expect(result.totalCgst).toBe(12.5); // 2.5% of 500
    expect(result.totalSgst).toBe(12.5); // 2.5% of 500
    expect(result.totalTax).toBe(25);
    expect(result.grandTotal).toBe(525);
  });

  // Test Case 4: Order-level coupon discount allocated proportionally across line items
  it("Test 4: Order-level coupon discount is allocated proportionally without loss or drift", () => {
    const result = calculateGst({
      items: [
        { productName: "Kaju Katli", quantity: 1, unitPrice: 600 },
        { productName: "Pista Ghari", quantity: 1, unitPrice: 400 },
      ],
      orderDiscount: 100, // Total order 1000, discount 100 (10%)
      buyerState: "Gujarat",
    });

    expect(result.subtotal).toBe(1000);
    expect(result.totalDiscount).toBe(100);
    expect(result.totalTaxableAmount).toBe(900);

    // Item 1: 60% of 100 = 60 discount => 540 taxable
    expect(result.items[0].discountAmount).toBe(60);
    expect(result.items[0].taxableAmount).toBe(540);

    // Item 2: 40% of 100 = 40 discount => 360 taxable
    expect(result.items[1].discountAmount).toBe(40);
    expect(result.items[1].taxableAmount).toBe(360);

    expect(result.totalCgst).toBe(22.5); // 2.5% of 900
    expect(result.totalSgst).toBe(22.5); // 2.5% of 900
    expect(result.totalTax).toBe(45);
    expect(result.grandTotal).toBe(945);
  });

  // Test Case 5: Multi-item cart with mixed quantities and different GST rates
  it("Test 5: Multi-item cart with mixed quantities and custom tax rates calculates each line accurately", () => {
    const result = calculateGst({
      items: [
        {
          productName: "Kaju Katli (5% GST)",
          quantity: 2,
          unitPrice: 400, // Gross 800
          taxRatePercent: 5,
        },
        {
          productName: "Celebration Dry Fruit Hamper (12% GST)",
          quantity: 1,
          unitPrice: 1500, // Gross 1500
          taxRatePercent: 12,
        },
      ],
      buyerState: "Karnataka", // Inter-state
    });

    expect(result.isInterState).toBe(true);
    expect(result.subtotal).toBe(2300);
    expect(result.items[0].igstAmount).toBe(40); // 5% of 800
    expect(result.items[1].igstAmount).toBe(180); // 12% of 1500
    expect(result.totalIgst).toBe(220);
    expect(result.grandTotal).toBe(2520);
  });

  // Test Case 6: Fractional paise rounding and round-off calculation to nearest rupee
  it("Test 6: Rounds off fractional amounts cleanly to 2 decimal places and provides roundOff adjustment", () => {
    // 333 * 5% = 16.65 => CGST 8.325 -> 8.33, SGST 8.325 -> 8.33 => Total Tax = 16.66
    const result = calculateGst({
      items: [
        {
          productName: "Special Peda",
          quantity: 1,
          unitPrice: 333,
          taxRatePercent: 5,
        },
      ],
      buyerState: "Gujarat",
    });

    expect(result.items[0].taxableAmount).toBe(333);
    expect(result.items[0].cgstAmount).toBe(8.33);
    expect(result.items[0].sgstAmount).toBe(8.33);
    expect(result.totalTax).toBe(16.66);
    // Unrounded grand total = 333 + 16.66 = 349.66
    expect(result.grandTotal).toBe(350);
    expect(result.roundOff).toBe(0.34); // 350 - 349.66 = +0.34
  });

  // Test Case 7: Inter-state order including delivery fee
  it("Test 7: Handles delivery charges in order totals with transparent itemization", () => {
    const result = calculateGst({
      items: [
        {
          productName: "Bhakharwadi",
          quantity: 1,
          unitPrice: 200,
          taxRatePercent: 5,
        },
      ],
      deliveryFee: 49,
      buyerState: "Rajasthan",
    });

    expect(result.isInterState).toBe(true);
    expect(result.deliveryFee).toBe(49);
    expect(result.totalTaxableAmount).toBe(200);
    expect(result.totalIgst).toBe(10);
    // Total = 200 + 10 + 49 = 259
    expect(result.grandTotal).toBe(259);
    expect(result.totalInWords).toBe("Rupees Two Hundred Fifty-Nine Only");
  });

  // Test Case 8: Number to Indian currency words with Crores, Lakhs, Thousands, and Paise
  it("Test 8: Converts currency numbers into standard Indian numbering words with and without paise", () => {
    expect(numberToIndianWords(0)).toBe("Rupees Zero Only");
    expect(numberToIndianWords(839)).toBe("Rupees Eight Hundred Thirty-Nine Only");
    expect(numberToIndianWords(1250)).toBe("Rupees One Thousand Two Hundred Fifty Only");
    expect(numberToIndianWords(45750)).toBe("Rupees Forty-Five Thousand Seven Hundred Fifty Only");
    expect(numberToIndianWords(100000)).toBe("Rupees One Lakh Only");
    expect(numberToIndianWords(2543210)).toBe(
      "Rupees Twenty-Five Lakh Forty-Three Thousand Two Hundred Ten Only"
    );
    expect(numberToIndianWords(1234.5)).toBe(
      "Rupees One Thousand Two Hundred Thirty-Four and Fifty Paise Only"
    );
  });

  // Test Case 9: Case-insensitive state code resolution & default fallback
  it("Test 9: Resolves state code reliably from state names with case insensitivity", () => {
    expect(resolveStateCode("GUJARAT")).toEqual({ state: "GUJARAT", stateCode: "24" });
    expect(resolveStateCode("maharashtra")).toEqual({ state: "maharashtra", stateCode: "27" });
    expect(resolveStateCode("Delhi")).toEqual({ state: "Delhi", stateCode: "07" });
    expect(resolveStateCode(undefined, "24")).toEqual({ state: "Gujarat", stateCode: "24" });
    // Unknown defaults to Gujarat seller state code
    expect(resolveStateCode("Unknown Territory")).toEqual({ state: "Unknown Territory", stateCode: "24" });
  });
});
