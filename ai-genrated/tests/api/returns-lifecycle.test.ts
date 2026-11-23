import { describe, it, expect, beforeEach } from "vitest";
import { GET as getReturnEligibility, POST as submitReturnRoute } from "@/app/api/orders/[orderNumber]/return/route";
import { GET as getAdminReturns } from "@/app/api/admin/returns/route";
import { PATCH as updateAdminReturn } from "@/app/api/admin/returns/[id]/route";
import {
  buildRequest,
  loginAs,
  logout,
  getTestFixtures,
  mockCookieStore,
} from "../helpers";
import { db } from "@/db";
import { orders, returnRequests, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("24-Hour Perishable Sweets Exchange & Return Policy Tests", () => {
  let customer: any;
  let admin: any;
  let otherUser: any;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customer = fixtures.customer;
    admin = fixtures.admin;

    const [userB] = await db
      .select()
      .from(users)
      .where(eq(users.email, "rajesh@gmail.com"))
      .limit(1);
    otherUser = userB || { id: customer.id + 999, role: "customer" };

    await logout();
    mockCookieStore.clear();
  });

  describe("Customer Return Eligibility & Policy Checks", () => {
    it("rejects unauthorized users attempting to access another customer's order (IDOR protection)", async () => {
      const testOrderNumber = `VSM-RETURN-SEC-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "delivered",
        deliveredAt: new Date(),
        subtotal: 500,
        deliveryFee: 0,
        total: 500,
        addressSnapshot: "{}",
        deliverySlot: "Standard",
        paymentMethod: "cod",
      });

      // Login as other customer
      await loginAs(otherUser.id);

      const req = buildRequest({
        method: "GET",
        url: `/api/orders/${testOrderNumber}/return`,
      });
      const res = await getReturnEligibility(req, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(res.status).toBe(403);
    });

    it("reports correctly when order is not delivered yet", async () => {
      await loginAs(customer.id);

      const testOrderNumber = `VSM-RETURN-NOTDEL-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "confirmed",
        subtotal: 750,
        deliveryFee: 0,
        total: 750,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "upi",
      });

      const getReq = buildRequest({
        method: "GET",
        url: `/api/orders/${testOrderNumber}/return`,
      });
      const getRes = await getReturnEligibility(getReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.isDelivered).toBe(false);
      expect(getData.isEligible).toBe(false);

      // Attempting to submit return before delivery must be blocked (400)
      const postReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "exchange",
          reason: "wrong_item",
          description: "Received wrong sweet package",
          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
      });
      const postRes = await submitReturnRoute(postReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(postRes.status).toBe(400);
      const postData = await postRes.json();
      expect(postData.error).toContain("Only delivered orders are eligible");
    });

    it("rejects return if delivery timestamp exceeds strict 24-hour perishable window", async () => {
      await loginAs(customer.id);

      const testOrderNumber = `VSM-RETURN-EXP-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 30 * 3600 * 1000), // 30 hours ago (> 24 hours)
        subtotal: 800,
        deliveryFee: 0,
        total: 800,
        addressSnapshot: "{}",
        deliverySlot: "Evening",
        paymentMethod: "cod",
      });

      const getReq = buildRequest({
        method: "GET",
        url: `/api/orders/${testOrderNumber}/return`,
      });
      const getRes = await getReturnEligibility(getReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      const getData = await getRes.json();
      expect(getData.isDelivered).toBe(true);
      expect(getData.isWithin24Hours).toBe(false);
      expect(getData.isEligible).toBe(false);

      // POST submission must fail with 400 Return window expired
      const postReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "exchange",
          reason: "damaged_packaging",
          description: "Box was damaged upon delivery",
          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
      });
      const postRes = await submitReturnRoute(postReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(postRes.status).toBe(400);
      const postData = await postRes.json();
      expect(postData.error).toContain("Return window expired");
    });

    it("rejects ineligible reasons such as change of mind or customer address error", async () => {
      await loginAs(customer.id);

      const testOrderNumber = `VSM-RETURN-INEL-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago (< 24 hours)
        subtotal: 600,
        deliveryFee: 0,
        total: 600,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "upi",
      });

      const postReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "return",
          reason: "change_of_mind",
          description: "Family decided they don't want sweets today",
          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
      });
      const postRes = await submitReturnRoute(postReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(postRes.status).toBe(400);
      const postData = await postRes.json();
      expect(postData.error).toContain("not eligible for return");
    });

    it("requires mandatory photo proof and minimum description length", async () => {
      await loginAs(customer.id);

      const testOrderNumber = `VSM-RETURN-VAL-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 1 * 3600 * 1000),
        subtotal: 500,
        deliveryFee: 0,
        total: 500,
        addressSnapshot: "{}",
        deliverySlot: "Morning",
        paymentMethod: "cod",
      });

      // Missing photo
      const noPhotoReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "exchange",
          reason: "wrong_item",
          description: "Received wrong item in parcel box",
        },
      });
      const noPhotoRes = await submitReturnRoute(noPhotoReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(noPhotoRes.status).toBe(400);
      const noPhotoData = await noPhotoRes.json();
      expect(noPhotoData.error).toContain("photo proof");

      // Short description < 10 chars
      const shortDescReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "exchange",
          reason: "wrong_item",
          description: "Bad",
          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
      });
      const shortDescRes = await submitReturnRoute(shortDescReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(shortDescRes.status).toBe(400);
      const shortDescData = await shortDescRes.json();
      expect(shortDescData.error).toContain("at least 10 characters");
    });

    it("successfully creates return request within 24 hours with valid photo and reason", async () => {
      await loginAs(customer.id);

      const testOrderNumber = `VSM-RETURN-SUCCESS-${Date.now()}`;
      const [order] = await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
        subtotal: 950,
        deliveryFee: 0,
        total: 950,
        addressSnapshot: JSON.stringify({
          recipientName: "Bhavin Patel",
          phone: "9825012345",
          email: "bhavin@patel.com",
        }),
        deliverySlot: "Morning",
        paymentMethod: "upi",
      });

      const postReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "exchange",
          reason: "spoiled_product",
          description: "Sweets smelled spoiled upon parcel opening today",
          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
      });
      const postRes = await submitReturnRoute(postReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(postRes.status).toBe(200);

      const postData = await postRes.json();
      expect(postData.success).toBe(true);
      expect(postData.order.returnStatus).toBe("requested");

      // Verify record exists in return_requests table
      const [dbReq] = await db
        .select()
        .from(returnRequests)
        .where(eq(returnRequests.orderNumber, testOrderNumber))
        .limit(1);
      expect(dbReq).toBeDefined();
      expect(dbReq.reason).toBe("spoiled_product");
      expect(dbReq.customerName).toBe("Bhavin Patel");
      expect(dbReq.status).toBe("requested");

      // Prevent duplicate submission
      const dupRes = await submitReturnRoute(postReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });
      expect(dupRes.status).toBe(400);
      const dupData = await dupRes.json();
      expect(dupData.error).toContain("already in 'requested' status");
    });
  });

  describe("Admin Returns Desk & Full Status Lifecycle Flow", () => {
    it("allows admin to view return requests and update status flow to approved and refunded", async () => {
      await loginAs(customer.id);

      // Create delivered order and submit claim
      const testOrderNumber = `VSM-ADMIN-RET-${Date.now()}`;
      await db.insert(orders).values({
        orderNumber: testOrderNumber,
        userId: customer.id,
        status: "delivered",
        deliveredAt: new Date(Date.now() - 4 * 3600 * 1000),
        subtotal: 1200,
        deliveryFee: 0,
        total: 1200,
        addressSnapshot: JSON.stringify({
          recipientName: "Mehul Shah",
          phone: "9825098765",
        }),
        deliverySlot: "Morning",
        paymentMethod: "upi",
      });

      const customerClaimReq = buildRequest({
        method: "POST",
        url: `/api/orders/${testOrderNumber}/return`,
        body: {
          type: "return",
          reason: "damaged_packaging",
          description: "Ghee container seal was completely broken and leaking in box",
          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
      });
      await submitReturnRoute(customerClaimReq, {
        params: Promise.resolve({ orderNumber: testOrderNumber }),
      });

      // Login as Admin
      await loginAs(admin.id);

      // Admin GET /api/admin/returns
      const adminGetReq = buildRequest({
        method: "GET",
        url: `/api/admin/returns?search=${testOrderNumber}`,
      });
      const adminGetRes = await getAdminReturns(adminGetReq);
      expect(adminGetRes.status).toBe(200);

      const listData = await adminGetRes.json();
      expect(listData.items.length).toBeGreaterThan(0);
      const foundItem = listData.items.find((i: any) => i.orderNumber === testOrderNumber);
      expect(foundItem).toBeDefined();
      expect(foundItem.status).toBe("requested");
      expect(foundItem.customerName).toBe("Mehul Shah");

      const claimId = foundItem.id;

      // 1. Admin advances to 'under_review'
      const reviewPatchReq = buildRequest({
        method: "PATCH",
        url: `/api/admin/returns/${claimId}`,
        body: {
          status: "under_review",
          adminNotes: "Inspecting defect photo with Kalol dispatch supervisor",
        },
      });
      const reviewRes = await updateAdminReturn(reviewPatchReq, {
        params: Promise.resolve({ id: String(claimId) }),
      });
      expect(reviewRes.status).toBe(200);
      const reviewData = await reviewRes.json();
      expect(reviewData.request.status).toBe("under_review");

      // 2. Admin advances to 'approved'
      const approvePatchReq = buildRequest({
        method: "PATCH",
        url: `/api/admin/returns/${claimId}`,
        body: {
          status: "approved",
          adminNotes: "Transit seal damage confirmed. Reverse pickup initiated.",
          refundAmount: 1200,
        },
      });
      const approveRes = await updateAdminReturn(approvePatchReq, {
        params: Promise.resolve({ id: String(claimId) }),
      });
      expect(approveRes.status).toBe(200);

      // Verify orders table synchronized
      const [orderAfterApprove] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, testOrderNumber))
        .limit(1);
      expect(orderAfterApprove.returnStatus).toBe("approved");
      expect(orderAfterApprove.refundStatus).toBe("approved");
      expect(orderAfterApprove.refundAmount).toBe(1200);

      // 3. Admin marks 'refunded' (5-7 working days SLA complete)
      const refundPatchReq = buildRequest({
        method: "PATCH",
        url: `/api/admin/returns/${claimId}`,
        body: {
          status: "refunded",
          adminNotes: "UPI refund reference TXN-REF-772199 credited to customer.",
          refundAmount: 1200,
        },
      });
      const refundRes = await updateAdminReturn(refundPatchReq, {
        params: Promise.resolve({ id: String(claimId) }),
      });
      expect(refundRes.status).toBe(200);

      const [orderAfterRefund] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, testOrderNumber))
        .limit(1);
      expect(orderAfterRefund.returnStatus).toBe("refunded");
      expect(orderAfterRefund.refundStatus).toBe("refunded");
      expect(orderAfterRefund.refundAmount).toBe(1200);
    });
  });
});
