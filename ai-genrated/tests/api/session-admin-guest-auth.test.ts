import { describe, it, expect, beforeEach } from "vitest";
import { requireAdmin, getAuthUser, secret } from "@/lib/auth";
import { GET as listOrders, POST as createOrder } from "@/app/api/orders/route";
import { GET as getOrder, POST as cancelOrder } from "@/app/api/orders/[orderNumber]/route";
import { PUT as updateUiConfig, GET as getUiConfig } from "@/app/api/ui-config/route";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Session-Based Admin Authorization & Guest Order Security", () => {
  let customerId: number;
  let adminId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customerId = fixtures.customer.id;
    adminId = fixtures.admin.id;

    await logout();
    mockCookieStore.clear();
  });

  describe("requireAdmin() utility", () => {
    it("returns 401 response for unauthenticated request", async () => {
      const res = await requireAdmin();
      expect(res.error).toBeDefined();
      expect(res.error?.status).toBe(401);
      const json = await res.error?.json();
      expect(json.error).toMatch(/Authentication required|Unauthorized/);
    });

    it("returns 403 response for customer session", async () => {
      await loginAs(customerId);
      const res = await requireAdmin();
      expect(res.error).toBeDefined();
      expect(res.error?.status).toBe(403);
      const json = await res.error?.json();
      expect(json.error).toMatch(/Forbidden/);
    });

    it("returns admin user object for admin session", async () => {
      await loginAs(adminId);
      const res = await requireAdmin();
      expect(res.error).toBeUndefined();
      expect(res.user).toBeDefined();
      expect(res.user?.role).toBe("admin");
      expect(res.user?.id).toBe(adminId);
    });
  });

  describe("GET /api/orders - All-Orders Branch", () => {
    it("returns explicit fields and does not leak guestTokenHash to admin", async () => {
      // First insert an order with guestTokenHash
      const guestToken = "test-token-" + crypto.randomBytes(12).toString("hex");
      const guestTokenHash = crypto.createHash("sha256").update(guestToken).digest("hex");
      const orderNumber = "ORD-TEST-" + Date.now();

      await db.insert(orders).values({
        orderNumber,
        userId: null,
        status: "confirmed",
        subtotal: 500,
        discount: 0,
        deliveryFee: 49,
        tax: 25,
        total: 574,
        paymentMethod: "upi",
        paymentStatus: "pending",
        deliverySlot: "Morning",
        guestName: "Guest User",
        guestPhone: "9876543210",
        addressSnapshot: JSON.stringify({ line1: "Test Address", city: "Vadodara" }),
        guestTokenHash,
      });

      await loginAs(adminId);
      const req = buildRequest({ method: "GET", url: "/api/orders" });
      const res = await listOrders(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.orders).toBeDefined();
      expect(Array.isArray(data.orders)).toBe(true);

      const matched = data.orders.find((o: any) => o.orderNumber === orderNumber);
      expect(matched).toBeDefined();
      // Verify guestTokenHash is NOT exposed in the output
      expect(matched).not.toHaveProperty("guestTokenHash");
      // Explicit fields check
      expect(matched).toHaveProperty("id");
      expect(matched).toHaveProperty("orderNumber");
      expect(matched).toHaveProperty("status");
      expect(matched).toHaveProperty("total");
    });
  });

  describe("Token-Based Guest Order Access", () => {
    let guestToken: string;
    let orderNumber: string;

    beforeEach(async () => {
      guestToken = crypto.randomBytes(24).toString("hex");
      const guestTokenHash = crypto.createHash("sha256").update(guestToken).digest("hex");
      orderNumber = "ORD-GUEST-" + Date.now();

      const [gOrder] = await db.insert(orders).values({
        orderNumber,
        userId: null,
        status: "confirmed",
        subtotal: 400,
        discount: 0,
        deliveryFee: 49,
        tax: 20,
        total: 469,
        paymentMethod: "upi",
        paymentStatus: "pending",
        deliverySlot: "Evening",
        guestName: "Guest Buyer",
        guestPhone: "9876501234",
        addressSnapshot: JSON.stringify({ line1: "Guest Address", city: "Vadodara" }),
        guestTokenHash,
      });
      const orderId = (gOrder as any).insertId;

      await db.insert(orderItems).values({
        orderId,
        productName: "Guest Kaju Katli",
        variantWeight: "250 g",
        unitPrice: 400,
        quantity: 1,
        imageUrl: "/images/kaju-katli.jpg",
      });
    });

    it("allows guest GET /api/orders/[orderNumber]?token=<token> with valid token", async () => {
      const req = buildRequest({
        method: "GET",
        url: `/api/orders/${orderNumber}?token=${guestToken}`,
      });
      const res = await getOrder(req, {
        params: Promise.resolve({ orderNumber }),
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.order).toBeDefined();
      expect(data.order.orderNumber).toBe(orderNumber);
      // Ensure guestTokenHash is stripped from response
      expect(data.order).not.toHaveProperty("guestTokenHash");
    });

    it("rejects guest GET /api/orders/[orderNumber] with invalid or missing token (returns 404)", async () => {
      // Missing token
      const noTokenReq = buildRequest({
        method: "GET",
        url: `/api/orders/${orderNumber}`,
      });
      const noTokenRes = await getOrder(noTokenReq, {
        params: Promise.resolve({ orderNumber }),
      });
      expect(noTokenRes.status).toBe(404);

      // Invalid token
      const invalidTokenReq = buildRequest({
        method: "GET",
        url: `/api/orders/${orderNumber}?token=wrong-token-value`,
      });
      const invalidTokenRes = await getOrder(invalidTokenReq, {
        params: Promise.resolve({ orderNumber }),
      });
      expect(invalidTokenRes.status).toBe(404);
    });

    it("allows guest cancel order with valid token", async () => {
      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${orderNumber}?token=${guestToken}`,
        body: { action: "cancel" },
      });
      const cancelRes = await cancelOrder(cancelReq, {
        params: Promise.resolve({ orderNumber }),
      });
      expect(cancelRes.status).toBe(200);

      const [updated] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
      expect(updated.status).toBe("cancelled");
    });

    it("rejects guest cancel order with wrong token", async () => {
      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${orderNumber}?token=bogus-token`,
        body: { action: "cancel" },
      });
      const cancelRes = await cancelOrder(cancelReq, {
        params: Promise.resolve({ orderNumber }),
      });
      expect([403, 404]).toContain(cancelRes.status);
    });
  });

  describe("UI Configuration Security & Validation", () => {
    it("public GET /api/ui-config succeeds without authentication", async () => {
      const res = await getUiConfig();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("heroPhotos");
      expect(data).toHaveProperty("announcement");
    });

    it("rejects unauthenticated PUT /api/ui-config with 401", async () => {
      const req = buildRequest({
        method: "PUT",
        url: "/api/ui-config",
        body: { announcement: { enabled: false, text: "Sale" } },
      });
      const res = await updateUiConfig(req);
      expect([401, 403]).toContain(res.status);
    });

    it("rejects admin PUT /api/ui-config with invalid or unknown fields with 400", async () => {
      await loginAs(adminId);
      // Case 1: mistyped field type
      const mistypedReq = buildRequest({
        method: "PUT",
        url: "/api/ui-config",
        body: {
          announcement: {
            enabled: "NOT_A_BOOLEAN", // Mistyped field
          },
        },
      });
      const mistypedRes = await updateUiConfig(mistypedReq);
      expect(mistypedRes.status).toBe(400);
      const json1 = await mistypedRes.json();
      expect(json1.error).toMatch(/Validation failed/);

      // Case 2: unknown/disallowed root field
      const unknownReq = buildRequest({
        method: "PUT",
        url: "/api/ui-config",
        body: {
          disallowedSecretSection: { exploit: true },
        },
      });
      const unknownRes = await updateUiConfig(unknownReq);
      expect(unknownRes.status).toBe(400);
      const json2 = await unknownRes.json();
      expect(json2.error).toMatch(/Validation failed/);
    });
  });

  describe("Production Session Secret Safety", () => {
    it("fails in production if SESSION_SECRET is unset or equals dev fallback", () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.SESSION_SECRET;

      try {
        (process.env as any).NODE_ENV = "production";
        delete process.env.SESSION_SECRET;

        expect(() => secret()).toThrow(/SESSION_SECRET must be set and secure in production/);

        process.env.SESSION_SECRET = "vardayini-dev-secret-change-me";
        expect(() => secret()).toThrow(/SESSION_SECRET must be set and secure in production/);

        process.env.SESSION_SECRET = "my-secure-production-secret-1234567890123456";
        expect(secret()).toBe("my-secure-production-secret-1234567890123456");
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        if (origSecret !== undefined) {
          process.env.SESSION_SECRET = origSecret;
        } else {
          delete process.env.SESSION_SECRET;
        }
      }
    });
  });
});
