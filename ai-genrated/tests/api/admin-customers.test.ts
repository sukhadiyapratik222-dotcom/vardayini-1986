import { describe, it, expect, beforeEach } from "vitest";
import { GET as getCustomers, DELETE as deleteCustomer } from "@/app/api/admin/customers/route";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { users, addresses, orders } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Security & Operations: Admin Customer Management", () => {
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

  describe("GET /api/admin/customers", () => {
    it("returns 403 for unauthenticated request", async () => {
      const req = buildRequest({ method: "GET", url: "/api/admin/customers" });
      const res = await getCustomers(req);
      expect(res.status).toBe(403);
    });

    it("returns 403 for regular customer session", async () => {
      await loginAs(customerId);
      const req = buildRequest({ method: "GET", url: "/api/admin/customers" });
      const res = await getCustomers(req);
      expect(res.status).toBe(403);
    });

    it("returns 200 with customer list for authorized admin", async () => {
      await loginAs(adminId);
      const req = buildRequest({ method: "GET", url: "/api/admin/customers" });
      const res = await getCustomers(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.customers)).toBe(true);
      expect(data.customers.length).toBeGreaterThan(0);

      const foundCustomer = data.customers.find((c: any) => c.id === customerId);
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer.name).toBeDefined();
      expect(foundCustomer.email).toBeDefined();
    });
  });

  describe("DELETE /api/admin/customers", () => {
    it("returns 403 for unauthenticated request", async () => {
      const req = buildRequest({
        method: "DELETE",
        url: `/api/admin/customers?id=${customerId}`,
      });
      const res = await deleteCustomer(req);
      expect(res.status).toBe(403);
    });

    it("prevents deleting an admin account with a 400 error", async () => {
      await loginAs(adminId);
      const req = buildRequest({
        method: "DELETE",
        url: `/api/admin/customers?id=${adminId}`,
      });
      const res = await deleteCustomer(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Administrator and Super Admin accounts cannot be deleted");
    });

    it("safely deletes a customer account and cleans up associated records", async () => {
      await loginAs(adminId);

      // Create a temporary customer with address & order to test cascade
      const [userRes] = await db
        .insert(users)
        .values({
          name: "Test Customer For Deletion",
          email: "temp-delete@vardayini.com",
          phone: "9998887770",
          passwordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
          role: "customer",
        });
      const tempUserId = (userRes as any).insertId;

      // Add address for temp customer
      const [addressRes] = await db
        .insert(addresses)
        .values({
          userId: tempUserId,
          label: "Home",
          line1: "123, Mandvi Heritage",
          city: "Vadodara",
          state: "Gujarat",
          pincode: "390001",
          phone: "9998887770",
        });
      const tempAddressId = (addressRes as any).insertId;

      // Add order for temp customer
      const [orderRes] = await db
        .insert(orders)
        .values({
          orderNumber: `VSM-TEST-DEL-${Date.now()}`,
          userId: tempUserId,
          guestName: "Test Customer For Deletion",
          guestPhone: "9998887770",
          subtotal: 500,
          total: 500,
          addressSnapshot: "123, Mandvi Heritage, Vadodara, Gujarat 390001",
          deliverySlot: "Today, 5:00–7:00 PM",
          paymentMethod: "cod",
        });
      const tempOrderId = (orderRes as any).insertId;

      // Execute DELETE
      const req = buildRequest({
        method: "DELETE",
        url: `/api/admin/customers?id=${tempUserId}`,
      });
      const res = await deleteCustomer(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify user was deleted from users table
      const [deletedUser] = await db.select().from(users).where(eq(users.id, tempUserId));
      expect(deletedUser).toBeUndefined();

      // Verify user's address was cleaned up
      const [deletedAddress] = await db.select().from(addresses).where(eq(addresses.id, tempAddressId));
      expect(deletedAddress).toBeUndefined();

      // Verify historical order still exists with userId set to NULL (sales retained!)
      const [retainedOrder] = await db.select().from(orders).where(eq(orders.id, tempOrderId));
      expect(retainedOrder).toBeDefined();
      expect(retainedOrder.userId).toBeNull();
      expect(retainedOrder.guestName).toBe("Test Customer For Deletion");
    });
  });
});
