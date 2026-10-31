import { describe, it, expect, beforeEach } from "vitest";
import { GET as getOrder } from "@/app/api/orders/[orderNumber]/route";
import { POST as cancelOrderRoute } from "@/app/api/orders/[orderNumber]/cancel/route";
import { POST as returnOrderRoute } from "@/app/api/orders/[orderNumber]/return/route";
import { GET as getInvoice } from "@/app/api/orders/[orderNumber]/invoice/route";
import {
  buildRequest,
  loginAs,
  logout,
  getTestFixtures,
  mockCookieStore,
} from "../helpers";
import { db } from "@/db";
import { orders, orderItems, productVariants, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Order Lifecycle & GST Invoice API Tests", () => {
  let customerA: any;
  let customerB: any;
  let admin: any;
  let sampleVariant: any;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customerA = fixtures.customer;
    admin = fixtures.admin;

    const [userB] = await db
      .select()
      .from(users)
      .where(eq(users.email, "rajesh@gmail.com"))
      .limit(1);
    customerB = userB || { id: customerA.id + 100, role: "customer" };

    const [variant] = await db.select().from(productVariants).limit(1);
    sampleVariant = variant;

    await logout();
    mockCookieStore.clear();
  });

  describe("GET /api/orders/[orderNumber] Details & Eligibility", () => {
    it("returns order, items, tracking info, payment and cancellation/return eligibility flags", async () => {
      await loginAs(customerA.id);

      // Create test order in confirmed status
      const testOrderNumber = `VSM-TEST-${Date.now()}-CONF`;
      const [newOrder] = await db
        .insert(orders)
        .values({
          orderNumber: testOrderNumber,
          userId: customerA.id,
          status: "confirmed",
          subtotal: 500,
          discount: 0,
          deliveryFee: 49,
          tax: 25,
          total: 574,
          addressSnapshot: JSON.stringify({
            name: "Pratik Test",
            phone: "+91 98250 11111",
            line1: "12, Mandvi Pol",
            city: "Vadodara",
            state: "Gujarat",
            stateCode: "24",
            pincode: "390001",
          }),
          deliverySlot: "Morning",
          paymentMethod: "UPI",
          paymentStatus: "completed",
        });
      const orderId1 = (newOrder as any).insertId;

      await db.insert(orderItems).values({
        orderId: orderId1,
        variantId: sampleVariant.id,
        productName: "Kaju Katli Special",
        variantWeight: "500g",
        unitPrice: 500,
        quantity: 1,
        imageUrl: "/images/kaju-katli.jpg",
        hsnCode: "21069099",
        taxRate: 5,
        taxableAmount: 500,
        cgstAmount: "12.50",
        sgstAmount: "12.50",
        igstAmount: "0.00",
        totalAmount: 500,
      });

      const req = buildRequest({ method: "GET", url: `/api/orders/${testOrderNumber}` });
      const res = await getOrder(req, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.order.orderNumber).toBe(testOrderNumber);
      expect(data.items.length).toBe(1);
      expect(data.items[0].productName).toBe("Kaju Katli Special");
      expect(data.items[0].hsnCode).toBe("21069099");
      expect(data.eligibility.canCancel).toBe(true); // Confirmed order can be cancelled
      expect(data.eligibility.canReturn).toBe(false); // Not delivered yet
    });

    it("prevents IDOR: unauthorized customer cannot view another customer's order", async () => {
      // Create order belonging to customer A
      const testOrderNumber = `VSM-TEST-IDOR-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customerA.id,
        status: "confirmed",
        subtotal: 500,
        deliveryFee: 49,
        total: 549,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "UPI",
      });

      // Login as Customer B and attempt to view Customer A's order
      await loginAs(customerB.id);
      const req = buildRequest({ method: "GET", url: `/api/orders/${testOrderNumber}` });
      const res = await getOrder(req, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/orders/[orderNumber]/cancel", () => {
    it("successfully cancels an un-shipped order, restocks stock, and records cancellation history", async () => {
      await loginAs(customerA.id);

      const initialStock = sampleVariant.stock;

      const testOrderNumber = `VSM-TEST-CANCEL-${Date.now()}`;
      const [testOrder] = await db
        .insert(orders)
        .values({
          orderNumber: testOrderNumber,
          userId: customerA.id,
          status: "confirmed",
          subtotal: 500,
          deliveryFee: 49,
          total: 549,
          addressSnapshot: "{}",
          deliverySlot: "Morning",
          paymentMethod: "UPI",
          paymentStatus: "completed",
        });
      const orderId2 = (testOrder as any).insertId;

      await db.insert(orderItems).values({
        orderId: orderId2,
        variantId: sampleVariant.id,
        productName: "Kaju Katli",
        variantWeight: "500g",
        unitPrice: 500,
        quantity: 2,
        imageUrl: "/images/kaju-katli.jpg",
      });

      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/cancel`,
        body: { reason: "Need to change delivery date" },
      });
      const cancelRes = await cancelOrderRoute(cancelReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(cancelRes.status).toBe(200);

      const cancelData = await cancelRes.json();
      expect(cancelData.order.status).toBe("cancelled");
      expect(cancelData.order.cancelReason).toContain("Need to change delivery date");

      // Verify stock was restocked (+2)
      const [updatedVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, sampleVariant.id));
      expect(updatedVariant.stock).toBe(initialStock + 2);
    });

    it("rejects cancellation if order has already shipped or delivered", async () => {
      await loginAs(customerA.id);

      const testOrderNumber = `VSM-TEST-SHIPPED-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customerA.id,
        status: "shipped", // Cannot cancel once shipped
        subtotal: 400,
        deliveryFee: 49,
        total: 449,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "UPI",
      });

      const cancelReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/cancel`,
        body: { reason: "Too late" },
      });
      const cancelRes = await cancelOrderRoute(cancelReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(cancelRes.status).toBe(400);
      const data = await cancelRes.json();
      expect(data.error).toContain("cannot be cancelled");
    });
  });

  describe("POST /api/orders/[orderNumber]/return (7-Day Policy)", () => {
    it("accepts return/exchange request for delivered order within 7 days", async () => {
      await loginAs(customerA.id);

      const testOrderNumber = `VSM-TEST-DELIV-RECENT-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customerA.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // 2 days ago (within 7 days)
        subtotal: 600,
        deliveryFee: 0,
        total: 600,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "UPI",
      });

      const returnReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "exchange",
          reason: "Wrong item received",
          comments: "Ordered Kaju Katli but received Peda",
        },
      });
      const returnRes = await returnOrderRoute(returnReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(returnRes.status).toBe(200);

      const data = await returnRes.json();
      expect(data.success).toBe(true);
      expect(data.order.returnStatus).toBe("requested");
      expect(data.order.returnReason).toContain("Wrong item received");
    });

    it("rejects return request if more than 7 days have passed since delivery", async () => {
      await loginAs(customerA.id);

      const testOrderNumber = `VSM-TEST-DELIV-EXPIRED-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customerA.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), // 10 days ago (> 7 days)
        subtotal: 600,
        deliveryFee: 0,
        total: 600,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "UPI",
      });

      const returnReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: { reason: "Taste not as expected" },
      });
      const returnRes = await returnOrderRoute(returnReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(returnRes.status).toBe(400);

      const data = await returnRes.json();
      expect(data.error).toContain("Return window expired");
    });
  });

  describe("GET /api/orders/[orderNumber]/invoice (GST Invoice Generation & Immutability)", () => {
    it("generates sequential GST invoice with CGST + SGST for intra-state (Gujarat) order", async () => {
      await loginAs(customerA.id);

      const testOrderNumber = `VSM-INV-GUJ-${Date.now()}`;
      const [order] = await db
        .insert(orders)
        .values({
          orderNumber: testOrderNumber,
          userId: customerA.id,
          status: "confirmed",
          subtotal: 1000,
          discount: 100, // 900 taxable
          deliveryFee: 0,
          tax: 45,
          total: 945,
          addressSnapshot: JSON.stringify({
            name: "Pratik Gujarat",
            phone: "+91 98250 12345",
            line1: "14, Heritage Enclave, Raopura",
            city: "Vadodara",
            state: "Gujarat",
            stateCode: "24",
            pincode: "390001",
          }),
          deliverySlot: "Evening",
          paymentMethod: "UPI",
          paymentStatus: "completed",
        });
      const orderId3 = (order as any).insertId;

      await db.insert(orderItems).values({
        orderId: orderId3,
        productName: "Assorted Mithai Box",
        variantWeight: "1kg",
        unitPrice: 1000,
        quantity: 1,
        imageUrl: "/images/kaju-katli.jpg",
        hsnCode: "21069099",
        taxRate: 5,
      });

      const invReq = buildRequest({ method: "GET", url: `/api/orders/${testOrderNumber}/invoice` });
      const invRes = await getInvoice(invReq, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      expect(invRes.status).toBe(200);

      const data = await invRes.json();
      expect(data.invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
      expect(data.invoice.isInterState).toBe(false);
      expect(data.invoice.placeOfSupply).toBe("Gujarat (24)");
      expect(data.invoice.seller.gstin).toBe("24AAACV1234F1Z5");
      expect(data.invoice.buyer.state).toBe("Gujarat");
      expect(data.invoice.taxableValue).toBe(900);
      expect(data.invoice.cgst).toBe(22.5); // 2.5% of 900
      expect(data.invoice.sgst).toBe(22.5); // 2.5% of 900
      expect(data.invoice.igst).toBe(0);
      expect(data.invoice.grandTotal).toBe(945);
      expect(data.invoice.totalInWords).toContain("Rupees Nine Hundred Forty-Five Only");

      // Verify Immutability: Calling again returns the exact same invoice number
      const secondRes = await getInvoice(invReq, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      const secondData = await secondRes.json();
      expect(secondData.invoice.invoiceNumber).toBe(data.invoice.invoiceNumber);
    });

    it("generates IGST for inter-state (Maharashtra) order", async () => {
      await loginAs(customerA.id);

      const testOrderNumber = `VSM-INV-MUM-${Date.now()}`;
      const [order] = await db
        .insert(orders)
        .values({
          orderNumber: testOrderNumber,
          userId: customerA.id,
          status: "confirmed",
          subtotal: 1000,
          discount: 0,
          deliveryFee: 49,
          tax: 50,
          total: 1099,
          addressSnapshot: JSON.stringify({
            name: "Rohit Sharma",
            phone: "+91 98200 98200",
            line1: "Flat 402, Sea Face Apartments, Worli",
            city: "Mumbai",
            state: "Maharashtra",
            stateCode: "27",
            pincode: "400018",
          }),
          deliverySlot: "Morning",
          paymentMethod: "Card",
          paymentStatus: "completed",
        });
      const orderId4 = (order as any).insertId;

      await db.insert(orderItems).values({
        orderId: orderId4,
        productName: "Festive Gift Hamper",
        variantWeight: "1kg",
        unitPrice: 1000,
        quantity: 1,
        imageUrl: "/images/kaju-katli.jpg",
        hsnCode: "21069099",
        taxRate: 5,
      });

      const invReq = buildRequest({ method: "GET", url: `/api/orders/${testOrderNumber}/invoice` });
      const invRes = await getInvoice(invReq, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      expect(invRes.status).toBe(200);

      const data = await invRes.json();
      expect(data.invoice.isInterState).toBe(true);
      expect(data.invoice.placeOfSupply).toBe("Maharashtra (27)");
      expect(data.invoice.cgst).toBe(0);
      expect(data.invoice.sgst).toBe(0);
      expect(data.invoice.igst).toBe(50); // 5% IGST on 1000
      expect(data.invoice.grandTotal).toBe(1099);
    });
  });
});
