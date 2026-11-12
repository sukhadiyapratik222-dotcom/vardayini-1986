import { describe, it, expect, beforeEach } from "vitest";
import { GET as trackPickupCam } from "@/app/api/kitchen-cam/track/[token]/route";
import { POST as updateStage } from "@/app/api/kitchen-cam/stage/route";
import { GET as getSettings } from "@/app/api/kitchen-cam/settings/route";
import {
  getOrCreatePickupTrackingToken,
  getCustomerTrackingDataByToken,
} from "@/lib/kitchen-cam";
import { db } from "@/db";
import { orders, users, stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";

describe("Live Kitchen Cam & Preparation Timeline API (Pickup Orders Only)", () => {
  let customer: any;
  let admin: any;
  let store: any;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    customer = fixtures.customer;
    admin = fixtures.admin;

    const [outlet] = await db.select().from(stores).limit(1);
    store = outlet;

    await logout();
    mockCookieStore.clear();
  });

  it("generates a secure, random tracking token for store pickup orders", async () => {
    const pickupOrderNumber = `VSM-PICKUP-${Date.now()}`;
    await db
      .insert(orders)
      .values({
        orderNumber: pickupOrderNumber,
        userId: customer.id,
        status: "confirmed",
        fulfillmentType: "pickup",
        deliverySlot: "Store Pickup",
        pickupStoreId: store?.id || 1,
        pickupDate: "2026-11-15",
        pickupSlot: "11:00 AM - 01:00 PM",
        pickupOtp: "456789",
        subtotal: 500,
        discount: 0,
        deliveryFee: 0,
        tax: 25,
        total: 525,
        paymentMethod: "cod",
        paymentStatus: "pending",
        addressSnapshot: JSON.stringify({ name: "Pickup Customer", phone: "9876543210" }),
      });

    const [insertedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, pickupOrderNumber));

    const token = await getOrCreatePickupTrackingToken(insertedOrder.id, insertedOrder.orderNumber);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(16);

    // Calling again returns the same existing token
    const tokenAgain = await getOrCreatePickupTrackingToken(insertedOrder.id, insertedOrder.orderNumber);
    expect(tokenAgain).toBe(token);
  });

  it("retrieves public tracking data via GET /api/kitchen-cam/track/[token] without requiring login", async () => {
    const pickupOrderNumber = `VSM-TRACK-${Date.now()}`;
    await db
      .insert(orders)
      .values({
        orderNumber: pickupOrderNumber,
        userId: customer.id,
        status: "confirmed",
        fulfillmentType: "pickup",
        deliverySlot: "Store Pickup",
        pickupStoreId: store?.id || 1,
        pickupDate: "2026-11-15",
        pickupSlot: "02:00 PM - 04:00 PM",
        pickupOtp: "981234",
        subtotal: 600,
        discount: 0,
        deliveryFee: 0,
        tax: 30,
        total: 630,
        paymentMethod: "cod",
        paymentStatus: "pending",
        addressSnapshot: JSON.stringify({ name: "Ramesh Bhai", phone: "9876543210" }),
      });

    const [insertedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, pickupOrderNumber));

    const token = await getOrCreatePickupTrackingToken(insertedOrder.id, insertedOrder.orderNumber);

    // Call tracking route as public guest (no session cookies)
    const req = buildRequest({ url: `http://localhost:9449/api/kitchen-cam/track/${token}` });
    const res = await trackPickupCam(req as any, { params: Promise.resolve({ token }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    const tracking = body.tracking;
    expect(tracking.orderNumber).toBe(pickupOrderNumber);
    expect(tracking.fulfillmentType).toBe("pickup");
    expect(tracking.pickupOtp).toBe("981234");
    expect(Array.isArray(tracking.timeline)).toBe(true);
    expect(tracking.timeline.length).toBe(5);

    // First stage "order_received" should be current for confirmed order
    expect(tracking.timeline[0].key).toBe("order_received");
    expect(tracking.timeline[0].status).toBe("current");
  });

  it("allows kitchen staff to advance order stages and upload media", async () => {
    await loginAs(admin.id);

    const pickupOrderNumber = `VSM-STAGE-${Date.now()}`;
    await db
      .insert(orders)
      .values({
        orderNumber: pickupOrderNumber,
        userId: customer.id,
        status: "confirmed",
        fulfillmentType: "pickup",
        deliverySlot: "Store Pickup",
        pickupStoreId: store?.id || 1,
        pickupDate: "2026-11-15",
        pickupSlot: "05:00 PM - 07:00 PM",
        pickupOtp: "554433",
        subtotal: 800,
        discount: 0,
        deliveryFee: 0,
        tax: 40,
        total: 840,
        paymentMethod: "cod",
        paymentStatus: "pending",
        addressSnapshot: JSON.stringify({ name: "Staff Test", phone: "9876543210" }),
      });

    const [insertedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, pickupOrderNumber));

    // Advance to 'preparing' with a message and photo URL
    const reqPreparing = buildRequest({
      url: "http://localhost:9449/api/kitchen-cam/stage",
      method: "POST",
      body: {
        orderNumber: pickupOrderNumber,
        newStage: "preparing",
        staffName: "Head Halwai",
        fileUrl: "/uploads/kitchen-cam/sample-kaju.jpg",
        mediaType: "image",
        caption: "Rolling fresh cashew dough",
      },
    });

    const resPreparing = await updateStage(reqPreparing as any);
    expect(resPreparing.status).toBe(200);

    // Check order status was updated in DB
    const [refreshedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, insertedOrder.id));
    expect(refreshedOrder.status).toBe("preparing");

    // Retrieve via tracking token to ensure stage has media
    const token = await getOrCreatePickupTrackingToken(insertedOrder.id, insertedOrder.orderNumber);
    const trackingData = await getCustomerTrackingDataByToken(token);
    expect(trackingData).not.toBeNull();
    expect(trackingData?.status).toBe("preparing");
    expect(trackingData?.currentStage).toBe("preparing");

    const prepStage = trackingData?.timeline.find((s) => s.key === "preparing");
    expect(prepStage?.status).toBe("current");
    expect(prepStage?.media?.[0]?.fileUrl).toBe("/uploads/kitchen-cam/sample-kaju.jpg");
    expect(prepStage?.media?.[0]?.caption).toBe("Rolling fresh cashew dough");
  });

  it("fetches kitchen cam configuration settings", async () => {
    const res = await getSettings();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.settings).toBeDefined();
    expect(body.settings.mode).toBeDefined();
    expect(body.settings.workingHoursStart).toBeDefined();
  });
});
