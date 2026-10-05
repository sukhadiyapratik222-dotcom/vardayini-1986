import { describe, it, expect, beforeEach } from "vitest";
import { POST as addToCartRoute } from "@/app/api/cart/route";
import { PUT as updateCartItemRoute } from "@/app/api/cart/[itemId]/route";
import { addToCart, mergeGuestCart, loadCartLines, clearCartForIdentity } from "@/lib/cart";
import { buildRequest, loginAs, logout, setGuestCart, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { cartItems, productVariants } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Cart Operations & Quantity Validation", () => {
  let variantId: number;
  let currentStock: number;
  let customerId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    variantId = fixtures.variantKK250.id;
    currentStock = fixtures.variantKK250.stock;
    customerId = fixtures.customer.id;

    await logout();
    mockCookieStore.clear();
    setGuestCart("cart-test-session-1");
    await clearCartForIdentity();
  });

  describe("POST /api/cart Quantity Boundary & Validation", () => {
    it("rejects quantity 0 with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: 0 },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(400);
    });

    it("rejects negative quantity with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: -2 },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(400);
    });

    it("rejects fractional quantity (e.g. 1.5) with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: 1.5 },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(400);
    });

    it("rejects NaN quantity with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: NaN },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(400);
    });

    it("rejects non-numeric string quantity (e.g. 'five') with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: "five" },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(400);
    });

    it("allows adding exact stock quantity", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: currentStock },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(200);

      const cart = await loadCartLines();
      expect(cart.lines[0]?.quantity).toBe(currentStock);
    });

    it("rejects adding stock + 1 quantity with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/cart",
        body: { productVariantId: variantId, quantity: currentStock + 1 },
      });
      const res = await addToCartRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/stock/i);
    });
  });

  describe("PUT /api/cart/[itemId] Validation", () => {
    it("returns 400 when updating quantity with NaN or invalid value", async () => {
      // Add valid item first
      await addToCart(variantId, 2);
      const cart = await loadCartLines();
      const itemId = cart.lines[0].id;

      const req = buildRequest({
        method: "PUT",
        url: `/api/cart/${itemId}`,
        body: { quantity: "not-a-number" },
      });
      const res = await updateCartItemRoute(req, {
        params: Promise.resolve({ itemId: String(itemId) }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Guest Cart Merge Limits", () => {
    it("guest merge must not exceed available stock", async () => {
      // Set variant stock to a known value, e.g., 10
      await db
        .update(productVariants)
        .set({ stock: 10 })
        .where(eq(productVariants.id, variantId));

      // 1. User has 6 units in their cart
      await loginAs(customerId);
      await addToCart(variantId, 6);
      await logout();

      // 2. Guest has 6 units in their cart (6 + 6 = 12, which exceeds stock of 10)
      setGuestCart("guest-cart-oversell-test");
      await addToCart(variantId, 6);

      // 3. User logs in, triggering cart merge
      await loginAs(customerId);
      await mergeGuestCart(customerId);

      // 4. Verification: Merged quantity must NOT exceed variant stock (10)
      const mergedCart = await loadCartLines();
      const line = mergedCart.lines.find((l) => l.variantId === variantId);
      expect(line).toBeDefined();
      expect(line!.quantity).toBeLessThanOrEqual(10);
    });
  });
});
