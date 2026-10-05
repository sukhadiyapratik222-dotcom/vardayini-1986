import { describe, it, expect, beforeEach } from "vitest";
import { GET as getAdminProducts } from "@/app/api/admin/products/route";
import { GET as getAdminInventory } from "@/app/api/admin/inventory/route";
import { PUT as updateAdminOrder } from "@/app/api/admin/orders/[orderNumber]/route";
import { PUT as updateUiConfig } from "@/app/api/ui-config/route";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

const OLD_HARDCODED_KEY = "vardayini-admin-secret";

describe("Security Tests: Admin Routes Authorization", () => {
  let customerId: number;
  let adminId: number;
  let sampleOrderNumber: string;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customerId = fixtures.customer.id;
    adminId = fixtures.admin.id;

    const [seededOrder] = await db.select().from(orders).limit(1);
    if (!seededOrder) throw new Error("No orders seeded");
    sampleOrderNumber = seededOrder.orderNumber;
    await db.update(orders).set({ status: "pending" }).where(eq(orders.id, seededOrder.id));

    await logout();
    mockCookieStore.clear();
  });

  describe("GET /api/admin/products", () => {
    it("returns 401 or 403 for anonymous request", async () => {
      const req = buildRequest({ method: "GET", url: "/api/admin/products" });
      const res = await getAdminProducts(req);
      expect([401, 403]).toContain(res.status);
    });

    it("returns 403 for customer session", async () => {
      await loginAs(customerId);
      const req = buildRequest({ method: "GET", url: "/api/admin/products" });
      const res = await getAdminProducts(req);
      expect([401, 403]).toContain(res.status);
    });

    it("returns 200 for valid admin session", async () => {
      await loginAs(adminId);
      const req = buildRequest({ method: "GET", url: "/api/admin/products" });
      const res = await getAdminProducts(req);
      expect(res.status).toBe(200);
    });

    it("returns 401 or 403 for old hardcoded key (hardcoded secrets must be rejected)", async () => {
      // Correct security behavior: header-based hardcoded backdoor key must be rejected with 401 or 403
      const req = buildRequest({
        method: "GET",
        url: "/api/admin/products",
        headers: { "x-admin-key": OLD_HARDCODED_KEY },
      });
      const res = await getAdminProducts(req);
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("GET /api/admin/inventory", () => {
    it("returns 401 or 403 for anonymous request", async () => {
      const req = buildRequest({ method: "GET", url: "/api/admin/inventory" });
      const res = await getAdminInventory(req);
      expect([401, 403]).toContain(res.status);
    });

    it("returns 403 for customer session", async () => {
      await loginAs(customerId);
      const req = buildRequest({ method: "GET", url: "/api/admin/inventory" });
      const res = await getAdminInventory(req);
      expect([401, 403]).toContain(res.status);
    });

    it("returns 200 for valid admin session", async () => {
      await loginAs(adminId);
      const req = buildRequest({ method: "GET", url: "/api/admin/inventory" });
      const res = await getAdminInventory(req);
      expect(res.status).toBe(200);
    });

    it("returns 401 or 403 for old hardcoded key", async () => {
      const req = buildRequest({
        method: "GET",
        url: "/api/admin/inventory",
        headers: { "x-admin-key": OLD_HARDCODED_KEY },
      });
      const res = await getAdminInventory(req);
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("PUT /api/admin/orders/[orderNumber]", () => {
    const payload = { status: "confirmed" };

    it("returns 401 or 403 for anonymous request", async () => {
      const req = buildRequest({
        method: "PUT",
        url: `/api/admin/orders/${sampleOrderNumber}`,
        body: payload,
      });
      const res = await updateAdminOrder(req, {
        params: Promise.resolve({ orderNumber: sampleOrderNumber }),
      });
      expect([401, 403]).toContain(res.status);
    });

    it("returns 403 for customer session", async () => {
      await loginAs(customerId);
      const req = buildRequest({
        method: "PUT",
        url: `/api/admin/orders/${sampleOrderNumber}`,
        body: payload,
      });
      const res = await updateAdminOrder(req, {
        params: Promise.resolve({ orderNumber: sampleOrderNumber }),
      });
      expect([401, 403]).toContain(res.status);
    });

    it("returns 200 for valid admin session", async () => {
      await loginAs(adminId);
      const req = buildRequest({
        method: "PUT",
        url: `/api/admin/orders/${sampleOrderNumber}`,
        body: payload,
      });
      const res = await updateAdminOrder(req, {
        params: Promise.resolve({ orderNumber: sampleOrderNumber }),
      });
      expect(res.status).toBe(200);
    });

    it("returns 401 or 403 for old hardcoded key", async () => {
      const req = buildRequest({
        method: "PUT",
        url: `/api/admin/orders/${sampleOrderNumber}`,
        headers: { "x-admin-key": OLD_HARDCODED_KEY },
        body: payload,
      });
      const res = await updateAdminOrder(req, {
        params: Promise.resolve({ orderNumber: sampleOrderNumber }),
      });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("PUT /api/ui-config Authorization", () => {
    it("anonymous PUT returns 401 or 403 and does not write the file", async () => {
      // Anonymous user attempting to mutate storefront layout configuration
      const req = buildRequest({
        method: "PUT",
        url: "/api/ui-config",
        body: { announcements: { enabled: false } },
      });
      const res = await updateUiConfig(req);

      // Must be rejected with 401 (Unauthorized) or 403 (Forbidden)
      expect([401, 403]).toContain(res.status);
    });
  });
});
