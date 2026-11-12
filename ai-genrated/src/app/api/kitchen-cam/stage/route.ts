import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderMedia, orderStatusHistory } from "@/db/schema";
import { getOrCreatePickupTrackingToken } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderNumber,
      newStage,
      staffName = "Kitchen Staff",
      fileUrl,
      mediaType = "image",
      caption,
      sizeBytes = 0,
      pickupVerifiedBy,
    } = body;

    if (!orderNumber || !newStage) {
      return Response.json(
        { error: "orderNumber and newStage are required" },
        { status: 400 }
      );
    }

    const cleanNum = String(orderNumber).replace(/^#/, "").trim();

    // 1. Find the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, cleanNum))
      .limit(1);

    if (!order) {
      return Response.json({ error: `Order #${cleanNum} not found` }, { status: 404 });
    }

    // 2. Map stage to order status
    let mappedStatus = order.status;
    let statusNote = "";

    switch (newStage) {
      case "order_received":
        mappedStatus = "confirmed";
        statusNote = "Order confirmed & queued in Vadodara kitchen";
        break;
      case "preparing":
        mappedStatus = "preparing";
        statusNote = `Our Master Halwai started preparing fresh sweets (${staffName})`;
        break;
      case "packed":
        mappedStatus = "packed";
        statusNote = `Sweets freshly weighed, quality-checked and packed at store counter (${staffName})`;
        break;
      case "ready_for_pickup":
        mappedStatus = "ready_for_pickup";
        statusNote = `Order is ready at store counter! Verification OTP: ${order.pickupOtp || "ready"}`;
        break;
      case "completed":
        mappedStatus = "delivered";
        statusNote = `Order collected at store counter. Verified by ${pickupVerifiedBy || staffName}.`;
        break;
      default:
        mappedStatus = newStage;
        statusNote = `Order stage advanced to ${newStage}`;
    }

    // 3. Update the order
    const updatePayload: any = {
      status: mappedStatus,
    };

    if (newStage === "ready_for_pickup" && !order.actualReadyAt) {
      updatePayload.actualReadyAt = new Date();
    }

    if (newStage === "completed") {
      updatePayload.deliveredAt = new Date();
      if (pickupVerifiedBy || staffName) {
        updatePayload.pickupVerifiedBy = pickupVerifiedBy || staffName;
      }
    }

    await db.update(orders).set(updatePayload).where(eq(orders.id, order.id));

    // 4. Log in order_status_history
    try {
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: mappedStatus,
        note: caption ? `${statusNote}: ${caption}` : statusNote,
        location: "Vadodara Flagship Kitchen",
        changedBy: staffName,
      });
    } catch (hErr) {
      console.warn("[KitchenCam Stage] Status history insert notice:", hErr);
    }

    // 5. If photo/video file provided, record in order_media
    let createdMedia: any = null;
    if (fileUrl && typeof fileUrl === "string") {
      try {
        const [mRes] = await db.insert(orderMedia).values({
          orderId: order.id,
          orderNumber: order.orderNumber,
          stage: newStage,
          fileUrl,
          mediaType: mediaType === "video" ? "video" : "image",
          sizeBytes: Number(sizeBytes) || 0,
          caption: caption || statusNote,
          uploadedBy: staffName,
          hidden: false,
        });
        createdMedia = {
          stage: newStage,
          fileUrl,
          caption,
          uploadedBy: staffName,
        };
      } catch (mErr) {
        console.warn("[KitchenCam Stage] Media record insert notice:", mErr);
      }
    }

    // 6. Ensure tracking token exists for customer
    const token = await getOrCreatePickupTrackingToken(
      order.id,
      order.orderNumber,
      order.fulfillmentType || "pickup"
    );

    // 7. Multi-container persistence: sync status to MongoDB
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("orders").updateOne(
          { orderNumber: cleanNum },
          {
            $set: {
              status: mappedStatus,
              ...(updatePayload.actualReadyAt ? { actualReadyAt: updatePayload.actualReadyAt } : {}),
              ...(updatePayload.deliveredAt ? { deliveredAt: updatePayload.deliveredAt } : {}),
              ...(updatePayload.pickupVerifiedBy ? { pickupVerifiedBy: updatePayload.pickupVerifiedBy } : {}),
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch {}

    return Response.json({
      success: true,
      orderNumber: order.orderNumber,
      stage: newStage,
      status: mappedStatus,
      trackingToken: token,
      trackingUrl: `/pickup-cam/${token}`,
      media: createdMedia,
    });
  } catch (err: any) {
    console.error("[KitchenCam Stage API] Error:", err);
    return Response.json({ error: err.message || "Failed to update order stage" }, { status: 500 });
  }
}
