import { NextResponse } from "next/server";
import { desc, eq, or, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { orderItems, orders, stores, orderStatusHistory } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  time?: string | null;
  completed: boolean;
  current: boolean;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return cleaned;
  return "******" + cleaned.slice(-4);
}

function maskName(name?: string | null): string {
  if (!name) return "Valued Patron";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]?.toUpperCase() || ""}.`;
}

function maskAddress(snapshotRaw?: string | null): {
  city: string;
  state: string;
  pincode: string;
  maskedSummary: string;
  fullAddress: string;
} {
  const result = {
    city: "Vadodara",
    state: "Gujarat",
    pincode: "",
    maskedSummary: "Vadodara Hub Dispatch, Gujarat",
    fullAddress: "Vadodara, Gujarat",
  };

  if (!snapshotRaw) return result;

  try {
    const snap = typeof snapshotRaw === "string" ? JSON.parse(snapshotRaw) : snapshotRaw;
    if (snap && typeof snap === "object") {
      result.city = snap.city || "Vadodara";
      result.state = snap.state || "Gujarat";
      result.pincode = snap.pincode || "";
      const line1 = snap.line1 ? `${snap.line1}, ` : "";
      const locality = snap.city || "Vadodara";
      const pin = snap.pincode ? ` - ${snap.pincode}` : "";
      result.maskedSummary = `******, ${locality}, ${result.state}${pin}`;
      result.fullAddress = `${line1}${locality}, ${result.state}${pin}`.trim();
    }
  } catch {
    const rawClean = typeof snapshotRaw === "string" && !snapshotRaw.startsWith("{") ? snapshotRaw : "Vadodara, Gujarat";
    result.maskedSummary = rawClean;
    result.fullAddress = rawClean;
  }

  return result;
}

export async function GET(request: Request) {
  try {
    await ensureDbMigrations();
    const url = new URL(request.url);
    const rawQuery = (url.searchParams.get("orderId") || url.searchParams.get("id") || "").trim();

    if (!rawQuery) {
      return NextResponse.json(
        { error: "Please provide an Order ID or Order Number to track." },
        { status: 400 }
      );
    }

    const cleanQuery = rawQuery.replace(/^#/, "").trim();
    const numericId = parseInt(cleanQuery, 10);
    const isNumeric = !isNaN(numericId) && String(numericId) === cleanQuery;

    // 1. Query SQLite / Primary Database
    let orderRow: any = null;
    try {
      if (isNumeric) {
        const rows = await db
          .select()
          .from(orders)
          .where(or(eq(orders.id, numericId), eq(orders.orderNumber, cleanQuery)))
          .limit(1);
        orderRow = rows[0] || null;
      } else {
        const rows = await db
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, cleanQuery))
          .limit(1);
        orderRow = rows[0] || null;
      }
    } catch (dbErr) {
      console.warn("[Order Track] Local DB query error:", dbErr);
    }

    // 2. Fallback to MongoDB if not found in SQLite
    if (!orderRow) {
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          const col = mongo.collection("orders");
          let mDoc: any = null;
          if (isNumeric) {
            mDoc = await col.findOne({
              $or: [{ id: numericId }, { orderNumber: cleanQuery }],
            });
          } else {
            mDoc = await col.findOne({ orderNumber: cleanQuery });
          }

          if (mDoc) {
            orderRow = {
              id: mDoc.id || 0,
              orderNumber: mDoc.orderNumber || cleanQuery,
              userId: mDoc.userId || null,
              guestName: mDoc.guestName || "Customer",
              guestPhone: mDoc.guestPhone || "",
              status: mDoc.status || "confirmed",
              subtotal: mDoc.subtotal || 0,
              discount: mDoc.discount || 0,
              deliveryFee: mDoc.deliveryFee || 0,
              total: mDoc.total || 0,
              addressSnapshot: typeof mDoc.addressSnapshot === "object" ? JSON.stringify(mDoc.addressSnapshot) : mDoc.addressSnapshot,
              deliverySlot: mDoc.deliverySlot || "Standard Delivery",
              fulfillmentType: mDoc.fulfillmentType || (mDoc.pickupStoreId ? "pickup" : "delivery"),
              pickupStoreId: mDoc.pickupStoreId || null,
              pickupDate: mDoc.pickupDate || null,
              pickupSlot: mDoc.pickupSlot || null,
              estimatedReadyAt: mDoc.estimatedReadyAt || null,
              actualReadyAt: mDoc.actualReadyAt || null,
              pickupOtp: mDoc.pickupOtp || null,
              paymentMethod: mDoc.paymentMethod || "cod",
              paymentStatus: mDoc.paymentStatus || "pending",
              courierName: mDoc.courierName || null,
              trackingNumber: mDoc.trackingNumber || null,
              trackingUrl: mDoc.trackingUrl || null,
              expectedDeliveryDate: mDoc.expectedDeliveryDate || null,
              deliveredAt: mDoc.deliveredAt || null,
              cancelledAt: mDoc.cancelledAt || null,
              cancelReason: mDoc.cancelReason || null,
              createdAt: mDoc.createdAt || new Date().toISOString(),
              items: mDoc.items || [],
            };
          }
        }
      } catch (mErr) {
        console.warn("[Order Track] MongoDB fallback error:", mErr);
      }
    }

    if (!orderRow) {
      return NextResponse.json(
        {
          error: `No order found matching "${rawQuery}". Please check your Order ID and try again.`,
        },
        { status: 404 }
      );
    }

    // 3. Fetch Items
    let items: any[] = [];
    if (orderRow.items && Array.isArray(orderRow.items) && orderRow.items.length > 0) {
      items = orderRow.items;
    } else if (orderRow.id) {
      try {
        items = await db
          .select({
            id: orderItems.id,
            productName: orderItems.productName,
            variantWeight: orderItems.variantWeight,
            unitPrice: orderItems.unitPrice,
            quantity: orderItems.quantity,
            imageUrl: orderItems.imageUrl,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, orderRow.id));
      } catch (itemErr) {
        console.warn("[Order Track] Items fetch notice:", itemErr);
      }
    }

    // 4. Fetch Pickup Store Details if Store Pickup Order
    const isPickup = orderRow.fulfillmentType === "pickup" || Boolean(orderRow.pickupStoreId);
    let pickupStoreDetails: any = null;

    if (orderRow.pickupStoreId) {
      try {
        const [foundStore] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, orderRow.pickupStoreId))
          .limit(1);

        if (foundStore) {
          const lat = foundStore.lat;
          const lng = foundStore.lng;
          const addressEncoded = encodeURIComponent(
            `${foundStore.name}, ${foundStore.address}, ${foundStore.city}, Gujarat ${foundStore.pincode}`
          );

          pickupStoreDetails = {
            id: foundStore.id,
            name: foundStore.name,
            address: foundStore.address,
            city: foundStore.city,
            pincode: foundStore.pincode,
            phone: foundStore.phone,
            hours: foundStore.hours,
            openingTime: foundStore.openingTime,
            closingTime: foundStore.closingTime,
            prepTimeMinutes: foundStore.prepTimeMinutes,
            latitude: lat,
            longitude: lng,
            googleMapsUrl: lat && lng
              ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
              : `https://www.google.com/maps/search/?api=1&query=${addressEncoded}`,
            directionsUrl: lat && lng
              ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
              : `https://www.google.com/maps/dir/?api=1&destination=${addressEncoded}`,
          };
        }
      } catch (stErr) {
        console.warn("[Order Track] Store fetch error:", stErr);
      }
    }

    // 5. Fetch Order Status History
    let statusHistory: any[] = [];
    if (orderRow.id) {
      try {
        statusHistory = await db
          .select({
            status: orderStatusHistory.status,
            notes: orderStatusHistory.note,
            createdAt: orderStatusHistory.createdAt,
          })
          .from(orderStatusHistory)
          .where(eq(orderStatusHistory.orderId, orderRow.id))
          .orderBy(desc(orderStatusHistory.createdAt));
      } catch {}
    }

    // Check if requester is logged in as the order owner
    const authUser = await getAuthUser();
    const isOwner = Boolean(
      (authUser && orderRow.userId && authUser.id === orderRow.userId) ||
      authUser?.role === "admin" ||
      authUser?.role === "super_admin" ||
      !orderRow.userId // Guest order viewed with direct link/order number
    );

    // Format address
    const addr = maskAddress(orderRow.addressSnapshot);

    // 6. Construct Live Tracking Timeline
    const createdAtDate = orderRow.createdAt ? new Date(orderRow.createdAt) : new Date();
    const createdDateStr = createdAtDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const status = (orderRow.status || "confirmed").toLowerCase();
    const isCancelled = status === "cancelled";

    let timeline: TimelineStep[] = [];
    let currentStepIndex = 0;

    if (isCancelled) {
      currentStepIndex = -1;
      timeline = [
        {
          key: "confirmed",
          title: "Order Placed",
          description: "Your order was successfully recorded.",
          time: createdDateStr,
          completed: true,
          current: false,
        },
        {
          key: "cancelled",
          title: "Order Cancelled",
          description: orderRow.cancelReason || "Order was cancelled upon request.",
          time: orderRow.cancelledAt
            ? new Date(orderRow.cancelledAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Cancelled",
          completed: true,
          current: true,
        },
      ];
    } else if (isPickup) {
      // Store Pickup Timeline:
      // Stage 0: Order Placed & Confirmed
      // Stage 1: Kitchen Fresh Preparation
      // Stage 2: Ready for Pickup
      // Stage 3: Picked Up
      if (status === "picked_up" || status === "delivered") {
        currentStepIndex = 3;
      } else if (status === "ready_for_pickup") {
        currentStepIndex = 2;
      } else if (status === "preparing" || status === "processing" || status === "packed") {
        currentStepIndex = 1;
      } else {
        currentStepIndex = 0;
      }

      const readyTimeStr = orderRow.actualReadyAt
        ? new Date(orderRow.actualReadyAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : orderRow.estimatedReadyAt || "As scheduled";

      const pickupTimeStr = orderRow.deliveredAt
        ? new Date(orderRow.deliveredAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Collected";

      timeline = [
        {
          key: "confirmed",
          title: "Order Placed & Confirmed",
          description: `Order accepted for pickup at ${pickupStoreDetails?.name || "Store"}.`,
          time: createdDateStr,
          completed: currentStepIndex >= 0,
          current: currentStepIndex === 0,
        },
        {
          key: "preparing",
          title: "Fresh Kitchen Preparation",
          description: "Halwais are preparing your fresh sweets in 100% Shuddh Desi Ghee.",
          time: currentStepIndex >= 1 ? "In Progress / Handcrafted" : "Scheduled",
          completed: currentStepIndex >= 1,
          current: currentStepIndex === 1,
        },
        {
          key: "ready_for_pickup",
          title: "Ready for Pickup",
          description: currentStepIndex >= 2
            ? `Your order is freshly packed at the counter. Show OTP: ${orderRow.pickupOtp || "******"}`
            : `Estimated ready around: ${orderRow.estimatedReadyAt || "Scheduled window"}`,
          time: currentStepIndex >= 2 ? readyTimeStr : "Estimated Soon",
          completed: currentStepIndex >= 2,
          current: currentStepIndex === 2,
        },
        {
          key: "picked_up",
          title: "Order Picked Up",
          description: currentStepIndex >= 3
            ? `Handed over to customer${orderRow.pickupVerifiedBy ? ` (Verified by ${orderRow.pickupVerifiedBy})` : ""}. Enjoy!`
            : "Pending customer collection at counter.",
          time: currentStepIndex >= 3 ? pickupTimeStr : "Awaiting Pickup",
          completed: currentStepIndex >= 3,
          current: currentStepIndex === 3,
        },
      ];
    } else {
      // Home Delivery Timeline
      if (status === "delivered") {
        currentStepIndex = 4;
      } else if (status === "shipped") {
        currentStepIndex = 3;
      } else if (status === "processing" || status === "packed") {
        currentStepIndex = 2;
      } else if (status === "confirmed" || status === "preparing") {
        currentStepIndex = 1;
      } else {
        currentStepIndex = 0;
      }

      timeline = [
        {
          key: "confirmed",
          title: "Order Placed & Confirmed",
          description: "Order accepted by Vardayini Sweet Mart kitchen desk.",
          time: createdDateStr,
          completed: currentStepIndex >= 0,
          current: currentStepIndex === 0,
        },
        {
          key: "kitchen",
          title: "Fresh Handcrafted Preparation",
          description: "Mithai crafted with 100% Shuddh Desi Ghee & fresh batch preparation.",
          time: currentStepIndex >= 1 ? "In Progress / Prepared" : "Scheduled",
          completed: currentStepIndex >= 1,
          current: currentStepIndex === 1,
        },
        {
          key: "packed",
          title: "Aroma-Lock Insulated Packaging",
          description: "Inspected for golden texture, sealed in food-grade fresh box.",
          time: currentStepIndex >= 2 ? "Sealed & Labeled" : "Pending Packing",
          completed: currentStepIndex >= 2,
          current: currentStepIndex === 2,
        },
        {
          key: "shipped",
          title: "Out for Express Dispatch",
          description: orderRow.courierName
            ? `Dispatched via ${orderRow.courierName} ${orderRow.trackingNumber ? `(#${orderRow.trackingNumber})` : ""}`
            : "Handed over to our Vadodara express delivery partner.",
          time: currentStepIndex >= 3 ? "On the Way" : "Estimated Dispatch",
          completed: currentStepIndex >= 3,
          current: currentStepIndex === 3,
        },
        {
          key: "delivered",
          title: "Delivered to Doorstep",
          description: "Enjoy sweet moments with authentic Gujarati mithai!",
          time: orderRow.deliveredAt
            ? new Date(orderRow.deliveredAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : orderRow.deliverySlot || "Expected Soon",
          completed: currentStepIndex >= 4,
          current: currentStepIndex === 4,
        },
      ];
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderRow.id,
        orderNumber: orderRow.orderNumber,
        status: orderRow.status,
        fulfillmentType: isPickup ? "pickup" : "delivery",
        isCancelled,
        total: orderRow.total,
        subtotal: orderRow.subtotal,
        discount: orderRow.discount,
        deliveryFee: orderRow.deliveryFee,
        deliverySlot: orderRow.deliverySlot || "Standard Delivery Slot",
        paymentMethod: orderRow.paymentMethod || "cod",
        paymentStatus: orderRow.paymentStatus || "pending",
        createdAt: orderRow.createdAt,
        expectedDeliveryDate: orderRow.expectedDeliveryDate,
        deliveredAt: orderRow.deliveredAt,
        cancelledAt: orderRow.cancelledAt,
        cancelReason: orderRow.cancelReason,
        // Store Pickup specific payload
        pickupDetails: isPickup
          ? {
              storeId: pickupStoreDetails?.id || orderRow.pickupStoreId,
              storeName: pickupStoreDetails?.name || "Vardayini Sweet Mart",
              storeAddress: pickupStoreDetails?.address || "Mandvi Main Road",
              storeCity: pickupStoreDetails?.city || "Vadodara",
              storePincode: pickupStoreDetails?.pincode || "390001",
              storePhone: pickupStoreDetails?.phone || "+91 98250 19760",
              storeHours: pickupStoreDetails?.hours || "8:00 AM - 10:00 PM",
              pickupDate: orderRow.pickupDate,
              pickupSlot: orderRow.pickupSlot,
              estimatedReadyAt: orderRow.estimatedReadyAt,
              actualReadyAt: orderRow.actualReadyAt,
              pickupOtp: isOwner ? orderRow.pickupOtp : "******",
              pickupVerifiedBy: orderRow.pickupVerifiedBy,
              googleMapsUrl: pickupStoreDetails?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Vardayini Sweet Mart Vadodara")}`,
              directionsUrl: pickupStoreDetails?.directionsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Vardayini Sweet Mart Vadodara")}`,
              instructions: [
                "Please show your 6-digit Pickup OTP or Order Number at the store express counter.",
                "Inspect sweets packaging seal before leaving the counter.",
                orderRow.paymentStatus === "paid"
                  ? "Order is prepaid online. Collect directly without payment."
                  : "Pay at counter via Cash, UPI, or Card upon collection.",
              ],
            }
          : null,
        courier: !isPickup
          ? {
              name: orderRow.courierName || (currentStepIndex >= 3 ? "Gujarat Express Local Fleet" : null),
              trackingNumber: orderRow.trackingNumber || (currentStepIndex >= 3 ? `VSM-EXP-${orderRow.id}` : null),
              trackingUrl: orderRow.trackingUrl || null,
            }
          : null,
        recipient: {
          name: isOwner ? (orderRow.guestName || "Customer") : maskName(orderRow.guestName),
          phone: isOwner ? orderRow.guestPhone : maskPhone(orderRow.guestPhone),
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          addressDisplay: isOwner ? addr.fullAddress : addr.maskedSummary,
        },
        timeline,
        currentStepIndex,
        history: statusHistory,
        items: items.map((it) => ({
          id: it.id,
          productName: it.productName,
          variantWeight: it.variantWeight || "500g",
          unitPrice: it.unitPrice,
          quantity: it.quantity || 1,
          imageUrl: it.imageUrl || "/images/motichoor-showcase.jpg",
        })),
      },
    });
  } catch (error: any) {
    console.error("[Order Tracking API Error]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve order tracking information. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Support POST with { orderId: "..." }
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId || body.orderNumber || body.id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }
    const mockReq = new Request(`http://localhost/api/orders/track?orderId=${encodeURIComponent(String(orderId))}`);
    return GET(mockReq);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
