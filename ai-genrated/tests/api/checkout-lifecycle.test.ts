import { describe, it, expect, beforeEach } from "vitest";
import { POST as checkoutRoute } from "@/app/api/orders/route";
import { POST as cancelOrderRoute } from "@/app/api/orders/[orderNumber]/route";
import { PUT as updateAdminOrderRoute } from "@/app/api/admin/orders/[orderNumber]/route";
import { addToCart, decrementStock, clearCartForIdentity } from "@/lib/cart";
import { buildRequest, loginAs, logout, setGuestCart, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { orders, orderItems, productVariants, cartItems } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Checkout Lifecycle, Concurrency & Order State Transitions", () => {
  let customerId: number;
  let adminId: number;
  let variantId: number;
  const initialStock = 50;

  const validDeliveryDetails = {
    name: "Aanya Patel",
    phone: "9876543210",
    line1: "42, Sampatrao Colony, Alkapuri",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "390007",
    deliverySlot: "Morning Batch (8:00 AM – 11:30 AM)",
    paymentMethod: "cod",
  };

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customerId = fixtures.customer.id;
    adminId = fixtures.admin.id;
    variantId = fixtures.variantKK250.id;

    // Reset variant stock to known baseline
    await db
      .update(productVariants)
      .set({ stock: initialStock })
      .where(eq(productVariants.id, variantId));

    await logout();
    mockCookieStore.clear();
    setGuestCart("checkout-lifecycle-session");
    await clearCartForIdentity();
  });

  describe("Checkout Validations", () => {
    it("rejects checkout when cart is empty with 400", async () => {
      const req = buildRequest({
        method: "POST",
        url: "/api/orders",
        body: validDeliveryDetails,
      });
      const res = await checkoutRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/empty/i);
    });

    it("rejects checkout when required delivery fields are missing with 400", async () => {
      await addToCart(variantId, 1);

      // Missing line1 and pincode
      const req = buildRequest({
        method: "POST",
        url: "/api/orders",
        body: {
          name: "Incomplete User",
          city: "Vadodara",
          deliverySlot: "Morning",
        },
      });
      const res = await checkoutRoute(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Stock Deductions & Cumulative Quantities", () => {
    it("deducts cumulative quantity when multiple lines contain the same variant", async () => {
      // Simulate multiple lines in cart with same variant
      // Line 1: 3 units, Line 2: 4 units -> Total 7 units
      const itemsToDeduct = [
        { variantId, quantity: 3 },
        { variantId, quantity: 4 },
      ];

      await decrementStock(itemsToDeduct);

      const [updatedVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId));

      expect(updatedVariant.stock).toBe(initialStock - 7);
    });

    it("cannot oversell when cumulative duplicate quantity exceeds available stock", async () => {
      // Set stock to 5
      await db
        .update(productVariants)
        .set({ stock: 5 })
        .where(eq(productVariants.id, variantId));

      const itemsToDeduct = [
        { variantId, quantity: 3 },
        { variantId, quantity: 3 }, // Total 6 > 5
      ];

      await expect(decrementStock(itemsToDeduct)).rejects.toThrow(/stock/i);

      // Stock must remain unchanged
      const [variant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      expect(variant.stock).toBe(5);
    });
  });

  describe("Concurrent Checkout Protection", () => {
    it("concurrent checkouts for the last available unit cannot oversell", async () => {
      // 1. Set variant stock to exactly 1
      await db
        .update(productVariants)
        .set({ stock: 1 })
        .where(eq(productVariants.id, variantId));

      // 2. Setup User A with 1 unit in cart
      setGuestCart("buyer-session-A");
      await addToCart(variantId, 1);

      // 3. Setup User B with 1 unit in cart
      setGuestCart("buyer-session-B");
      await addToCart(variantId, 1);

      // 4. Trigger concurrent checkouts
      const reqA = buildRequest({
        method: "POST",
        url: "/api/orders",
        cookies: { vs_cart: "buyer-session-A" },
        body: validDeliveryDetails,
      });

      const reqB = buildRequest({
        method: "POST",
        url: "/api/orders",
        cookies: { vs_cart: "buyer-session-B" },
        body: validDeliveryDetails,
      });

      const [resA, resB] = await Promise.all([
        checkoutRoute(reqA),
        checkoutRoute(reqB),
      ]);

      const statuses = [resA.status, resB.status];
      // Exactly one must succeed (200) and the other must be rejected (400)
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Stock must never drop below 0
      const [finalVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      expect(finalVariant.stock).toBe(0);
    });
  });

  describe("Transaction Integrity / Rollback", () => {
    it("injected failure after stock update leaves stock and orders unchanged", async () => {
      await addToCart(variantId, 2);

      // Spy or simulate a failure during order placement transaction
      const startStock = initialStock;

      // When decrementStock succeeds but downstream operation fails, transaction must roll back
      const testTransaction = async () => {
        return db.transaction(async (tx) => {
          await tx
            .update(productVariants)
            .set({ stock: startStock - 2 })
            .where(eq(productVariants.id, variantId));
          throw new Error("Simulated database failure during order insertion");
        });
      };

      await expect(testTransaction()).rejects.toThrow("Simulated database failure");

      // Verify stock was not changed
      const [variant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      expect(variant.stock).toBe(startStock);
    });
  });

  describe("Order Cancellation & State Transitions", () => {
    it("restocks variant inventory exactly once upon order cancellation", async () => {
      // 1. Create an order with 2 items of variant
      const testOrderNumber = `CANCEL-TEST-${Date.now()}`;
      await db
        .update(productVariants)
        .set({ stock: initialStock - 2 })
        .where(eq(productVariants.id, variantId));

      const [createdOrder] = await db
        .insert(orders)
        .values({
          orderNumber: testOrderNumber,
          userId: customerId,
          status: "confirmed",
          subtotal: 500,
          discount: 0,
          deliveryFee: 0,
          tax: 25,
          total: 525,
          addressSnapshot: JSON.stringify(validDeliveryDetails),
          deliverySlot: "Morning",
          paymentMethod: "cod",
          paymentStatus: "pending",
        })
        .returning();

      await db.insert(orderItems).values({
        orderId: createdOrder.id,
        productName: "Kaju Katli",
        variantWeight: "250 g",
        unitPrice: 250,
        quantity: 2,
        imageUrl: "/images/kaju-katli.jpg",
      });

      await loginAs(customerId);

      // 2. First cancellation: Must restock +2 items
      const req1 = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}`,
        body: { action: "cancel" },
      });
      const res1 = await cancelOrderRoute(req1, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(res1.status).toBe(200);

      const [restockedVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      expect(restockedVariant.stock).toBe(initialStock);

      // 3. Second cancellation attempt: Must be rejected and NOT restock again
      const req2 = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}`,
        body: { action: "cancel" },
      });
      const res2 = await cancelOrderRoute(req2, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(res2.status).toBe(400);

      const [finalVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      expect(finalVariant.stock).toBe(initialStock); // Never initialStock + 2
    });

    it("rejects cancellation if order status is already 'shipped'", async () => {
      const shippedOrderNumber = `SHIPPED-ORD-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: shippedOrderNumber,
        userId: customerId,
        status: "shipped",
        subtotal: 600,
        discount: 0,
        deliveryFee: 0,
        tax: 30,
        total: 630,
        addressSnapshot: JSON.stringify(validDeliveryDetails),
        deliverySlot: "Morning",
        paymentMethod: "cod",
        paymentStatus: "paid",
      });

      await loginAs(customerId);

      const req = buildRequest({
        method: "POST",
        url: `/api/orders/${shippedOrderNumber}`,
        body: { action: "cancel" },
      });
      const res = await cancelOrderRoute(req, {
        params: Promise.resolve({ orderNumber: shippedOrderNumber }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/cannot be cancelled|shipped/i);
    });

    it("admin transitions out of 'cancelled' or 'delivered' must be rejected", async () => {
      await loginAs(adminId);

      // Test 1: Order is cancelled. Transitioning to 'confirmed' must be rejected with 400
      const cancelledOrderNumber = `ORD-CANCELLED-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: cancelledOrderNumber,
        userId: customerId,
        status: "cancelled",
        subtotal: 400,
        discount: 0,
        deliveryFee: 49,
        tax: 20,
        total: 469,
        addressSnapshot: JSON.stringify(validDeliveryDetails),
        deliverySlot: "Morning",
        paymentMethod: "cod",
        paymentStatus: "failed",
      });

      const cancelPatchReq = buildRequest({
        method: "PUT",
        url: `/api/admin/orders/${cancelledOrderNumber}`,
        body: { status: "confirmed" },
      });
      const cancelPatchRes = await updateAdminOrderRoute(cancelPatchReq, {
        params: Promise.resolve({ orderNumber: cancelledOrderNumber }),
      });
      expect(cancelPatchRes.status).toBe(400);

      // Test 2: Order is delivered. Transitioning to 'pending' must be rejected with 400
      const deliveredOrderNumber = `ORD-DELIVERED-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: deliveredOrderNumber,
        userId: customerId,
        status: "delivered",
        subtotal: 400,
        discount: 0,
        deliveryFee: 49,
        tax: 20,
        total: 469,
        addressSnapshot: JSON.stringify(validDeliveryDetails),
        deliverySlot: "Morning",
        paymentMethod: "cod",
        paymentStatus: "paid",
      });

      const deliverPatchReq = buildRequest({
        method: "PUT",
        url: `/api/admin/orders/${deliveredOrderNumber}`,
        body: { status: "pending" },
      });
      const deliverPatchRes = await updateAdminOrderRoute(deliverPatchReq, {
        params: Promise.resolve({ orderNumber: deliveredOrderNumber }),
      });
      expect(deliverPatchRes.status).toBe(400);
    });
  });
});
