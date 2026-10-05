import { describe, it, expect, beforeEach } from "vitest";
import { GET as listOrders } from "@/app/api/orders/route";
import {
  GET as getOrder,
  POST as cancelOrder,
} from "@/app/api/orders/[orderNumber]/route";
import { DELETE as deleteWishlistItem } from "@/app/api/wishlist/[id]/route";
import { POST as postReview } from "@/app/api/reviews/route";
import {
  buildRequest,
  loginAs,
  logout,
  setGuestCart,
  getTestFixtures,
  mockCookieStore,
} from "../helpers";
import { db } from "@/db";
import { orders, orderItems, wishlistItems, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Security Tests: Orders, Wishlist & Review Permissions", () => {
  let customerAId: number;
  let customerBId: number;
  let adminId: number;
  let productId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customerAId = fixtures.customer.id;
    adminId = fixtures.admin.id;
    productId = fixtures.productKajuKatli.id;

    // Find or create customer B
    const [secondUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "customer"))
      .limit(2);
    if (!secondUser || secondUser.id === customerAId) {
      const [allCust] = await db
        .select()
        .from(users)
        .where(eq(users.email, "rajesh@gmail.com"))
        .limit(1);
      customerBId = allCust ? allCust.id : customerAId + 999;
    } else {
      customerBId = secondUser.id;
    }

    await logout();
    mockCookieStore.clear();
  });

  describe("GET /api/orders Session Requirement", () => {
    it("returns 401 when requested without a session", async () => {
      const req = buildRequest({ method: "GET", url: "/api/orders" });
      const res = await listOrders(req);
      expect(res.status).toBe(401);
    });
  });

  describe("GET and POST (cancel) /api/orders/[orderNumber] Authorization", () => {
    let userOrderNumber: string;
    let guestOrderNumber: string;
    const matchingGuestSession = "guest-session-secret-owner-12345";
    const unrelatedGuestSession = "guest-session-unrelated-67890";

    beforeEach(async () => {
      userOrderNumber = `TEST-USER-ORD-${Date.now()}`;
      guestOrderNumber = `TEST-GUEST-ORD-${Date.now()}`;

      // Insert customer order
      const [uOrder] = await db
        .insert(orders)
        .values({
          orderNumber: userOrderNumber,
          userId: customerAId,
          status: "confirmed",
          subtotal: 500,
          discount: 0,
          deliveryFee: 0,
          tax: 25,
          total: 525,
          addressSnapshot: JSON.stringify({ line1: "Test street" }),
          deliverySlot: "Morning",
          paymentMethod: "cod",
          paymentStatus: "pending",
        })
        .returning();

      await db.insert(orderItems).values({
        orderId: uOrder.id,
        productName: "Test Sweet",
        variantWeight: "250 g",
        unitPrice: 250,
        quantity: 2,
        imageUrl: "/images/test.jpg",
      });

      // Insert guest order tied to matching guest session
      const [gOrder] = await db
        .insert(orders)
        .values({
          orderNumber: guestOrderNumber,
          userId: null,
          guestName: "Guest Visitor",
          guestPhone: "9998887776",
          status: "confirmed",
          subtotal: 300,
          discount: 0,
          deliveryFee: 49,
          tax: 15,
          total: 364,
          addressSnapshot: JSON.stringify({
            line1: "Guest street",
            sessionId: matchingGuestSession,
          }),
          deliverySlot: "Evening",
          paymentMethod: "cod",
          paymentStatus: "pending",
        })
        .returning();

      await db.insert(orderItems).values({
        orderId: gOrder.id,
        productName: "Guest Namkeen",
        variantWeight: "200 g",
        unitPrice: 150,
        quantity: 2,
        imageUrl: "/images/test.jpg",
      });
    });

    it("allows order owner (customer A) to read and cancel order", async () => {
      await loginAs(customerAId);

      // Read
      const readReq = buildRequest({ url: `/api/orders/${userOrderNumber}` });
      const readRes = await getOrder(readReq, {
        params: Promise.resolve({ orderNumber: userOrderNumber }),
      });
      expect(readRes.status).toBe(200);

      // Cancel
      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${userOrderNumber}`,
        body: { action: "cancel" },
      });
      const cancelRes = await cancelOrder(cancelReq, {
        params: Promise.resolve({ orderNumber: userOrderNumber }),
      });
      expect(cancelRes.status).toBe(200);
    });

    it("rejects unrelated user (customer B) from reading or cancelling customer A's order", async () => {
      await loginAs(customerBId);

      // Read must be hidden (404) or forbidden (403)
      const readReq = buildRequest({ url: `/api/orders/${userOrderNumber}` });
      const readRes = await getOrder(readReq, {
        params: Promise.resolve({ orderNumber: userOrderNumber }),
      });
      expect([403, 404]).toContain(readRes.status);

      // Cancel must be forbidden (403)
      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${userOrderNumber}`,
        body: { action: "cancel" },
      });
      const cancelRes = await cancelOrder(cancelReq, {
        params: Promise.resolve({ orderNumber: userOrderNumber }),
      });
      expect([403, 404]).toContain(cancelRes.status);
    });

    it("allows admin to read and cancel any customer order", async () => {
      await loginAs(adminId);

      const readReq = buildRequest({ url: `/api/orders/${userOrderNumber}` });
      const readRes = await getOrder(readReq, {
        params: Promise.resolve({ orderNumber: userOrderNumber }),
      });
      expect(readRes.status).toBe(200);

      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${userOrderNumber}`,
        body: { action: "cancel" },
      });
      const cancelRes = await cancelOrder(cancelReq, {
        params: Promise.resolve({ orderNumber: userOrderNumber }),
      });
      expect(cancelRes.status).toBe(200);
    });

    it("allows matching guest session to read guest order", async () => {
      setGuestCart(matchingGuestSession);

      const readReq = buildRequest({ url: `/api/orders/${guestOrderNumber}` });
      const readRes = await getOrder(readReq, {
        params: Promise.resolve({ orderNumber: guestOrderNumber }),
      });
      expect(readRes.status).toBe(200);
    });

    it("rejects unrelated guest session from reading or cancelling guest order", async () => {
      setGuestCart(unrelatedGuestSession);

      // Unrelated guest must not read or cancel another guest's order
      const readReq = buildRequest({ url: `/api/orders/${guestOrderNumber}` });
      const readRes = await getOrder(readReq, {
        params: Promise.resolve({ orderNumber: guestOrderNumber }),
      });
      expect([403, 404]).toContain(readRes.status);

      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${guestOrderNumber}`,
        body: { action: "cancel" },
      });
      const cancelRes = await cancelOrder(cancelReq, {
        params: Promise.resolve({ orderNumber: guestOrderNumber }),
      });
      expect([403, 404]).toContain(cancelRes.status);
    });
  });

  describe("Wishlist Item Security", () => {
    it("delete of another user's row must not delete it from database", async () => {
      // Customer A saves a favourite product
      const [itemA] = await db
        .insert(wishlistItems)
        .values({
          userId: customerAId,
          productId,
        })
        .returning();

      // Customer B attempts to delete Customer A's wishlist item
      await loginAs(customerBId);
      const req = buildRequest({
        method: "DELETE",
        url: `/api/wishlist/${itemA.id}`,
      });
      await deleteWishlistItem(req, {
        params: Promise.resolve({ id: String(itemA.id) }),
      });

      // Verification: Customer A's row must STILL exist in the database
      const [stillExists] = await db
        .select()
        .from(wishlistItems)
        .where(eq(wishlistItems.id, itemA.id))
        .limit(1);

      expect(stillExists).toBeDefined();
      expect(stillExists.userId).toBe(customerAId);
    });
  });

  describe("Review Submission Security", () => {
    it("returns 401 when anonymous user attempts to post a review", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/reviews",
        body: {
          productId,
          rating: 5,
          comment: "Authentic Gujarati taste and fresh desi ghee!",
        },
      });

      const res = await postReview(req);
      expect(res.status).toBe(401);
    });
  });
});
