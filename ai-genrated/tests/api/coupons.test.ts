import { describe, it, expect, beforeEach } from "vitest";
import { POST as applyCouponRoute } from "@/app/api/cart/coupon/route";
import { PUT as updateCartItemRoute } from "@/app/api/cart/[itemId]/route";
import { addToCart, loadCartLines, clearCartForIdentity } from "@/lib/cart";
import { buildRequest, setGuestCart, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { coupons, productVariants } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Coupon Validation & Application Logic", () => {
  let variantId: number;
  let variantPrice: number;
  let productId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    variantId = fixtures.variantKK250.id;
    variantPrice = fixtures.variantKK250.discountedPrice || fixtures.variantKK250.price; // 289
    productId = fixtures.variantKK250.productId;

    mockCookieStore.clear();
    setGuestCart("coupon-test-session");
    await clearCartForIdentity();
  });

  describe("Valid Coupons: FESTIVE10, MITHAI50, FREEDEL", () => {
    it("applies FESTIVE10 (10% off) for subtotal >= 499", async () => {
      // 2 units * 289 = 578 (> 499)
      await addToCart(variantId, 2);

      const req = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "FESTIVE10" },
      });
      const res = await applyCouponRoute(req);
      expect(res.status).toBe(200);

      const cart = await loadCartLines();
      expect(cart.couponCode).toBe("FESTIVE10");
      // 10% of 578 = 57.8 -> round 58
      expect(cart.totals.discount).toBe(58);
    });

    it("verifies percent rounding on FESTIVE10", async () => {
      // Create cart line with subtotal that yields fractional discount
      // E.g. Subtotal 505 -> 10% is 50.5, must round to 51
      const customSku = `CUSTOM-${Date.now()}`;
      const [varRes] = await db
        .insert(productVariants)
        .values({
          productId,
          weight: "Custom",
          sku: customSku,
          price: 505,
          stock: 10,
        });
      const [foundVar] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.sku, customSku))
        .limit(1);
      const customVariantId = foundVar?.id || (varRes as any)?.insertId || Number((varRes as any)?.lastInsertRowid);

      await clearCartForIdentity();
      await addToCart(customVariantId, 1);

      const req = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "FESTIVE10" },
      });
      const res = await applyCouponRoute(req);
      expect(res.status).toBe(200);

      const cart = await loadCartLines();
      expect(cart.totals.subtotal).toBe(505);
      expect(cart.totals.discount).toBe(51);
    });

    it("applies MITHAI50 (₹50 flat off) for subtotal >= 499", async () => {
      await addToCart(variantId, 2); // 578 subtotal

      const req = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "MITHAI50" },
      });
      const res = await applyCouponRoute(req);
      expect(res.status).toBe(200);

      const cart = await loadCartLines();
      expect(cart.couponCode).toBe("MITHAI50");
      expect(cart.totals.discount).toBe(50);
    });

    it("applies FREEDEL and sets delivery fee to 0 on subtotal below free delivery threshold", async () => {
      await addToCart(variantId, 1); // 289 subtotal (< 799 free delivery threshold)

      const before = await loadCartLines();
      expect(before.totals.deliveryFee).toBe(49);

      const req = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "FREEDEL" },
      });
      const res = await applyCouponRoute(req);
      expect(res.status).toBe(200);

      const cart = await loadCartLines();
      expect(cart.totals.deliveryFee).toBe(0);
    });
  });

  describe("minOrder Boundary & Inactive Coupon", () => {
    it("rejects coupon when subtotal is strictly below minOrder boundary", async () => {
      // 1 unit of 289 is below 499 minOrder of FESTIVE10
      await addToCart(variantId, 1);

      const req = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "FESTIVE10" },
      });
      const res = await applyCouponRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toMatch(/499/);
    });

    it("rejects inactive coupon with 400", async () => {
      // Insert an inactive coupon
      await db.insert(coupons).values({
        code: "EXPIRED99",
        description: "Inactive seasonal discount",
        type: "flat",
        value: 100,
        minOrder: 100,
        active: false,
      });

      await addToCart(variantId, 2);

      const req = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "EXPIRED99" },
      });
      const res = await applyCouponRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toMatch(/invalid/i);
    });
  });

  describe("Coupon Dropped When Subtotal Falls Below minOrder", () => {
    it("drops applied coupon when an item quantity is reduced below minOrder", async () => {
      // 1. Add 2 units (subtotal 578 >= 499)
      await addToCart(variantId, 2);

      // 2. Apply FESTIVE10
      const applyReq = buildRequest({
        method: "POST",
        url: "/api/cart/coupon",
        body: { code: "FESTIVE10" },
      });
      const applyRes = await applyCouponRoute(applyReq);
      expect(applyRes.status).toBe(200);

      const appliedCart = await loadCartLines();
      expect(appliedCart.couponCode).toBe("FESTIVE10");
      expect(appliedCart.totals.discount).toBeGreaterThan(0);

      // 3. Reduce quantity to 1 unit (subtotal falls to 289 < 499)
      const itemId = appliedCart.lines[0].id;
      const updateReq = buildRequest({
        method: "PUT",
        url: `/api/cart/${itemId}`,
        body: { quantity: 1 },
      });
      await updateCartItemRoute(updateReq, {
        params: Promise.resolve({ itemId: String(itemId) }),
      });

      // 4. Verification: The coupon must be dropped and discount reset to 0
      const updatedCart = await loadCartLines();
      expect(updatedCart.couponCode).toBeNull();
      expect(updatedCart.totals.discount).toBe(0);
    });
  });
});
