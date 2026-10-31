import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, stores, productVariants, orderStatusHistory } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { canTransitionOrder } from "@/lib/order-transitions";
import { readJsonSafe } from "@/lib/validation";
import { updateOrderDetailsInMysql } from "@/lib/mysql";
import { AccountLockoutManager } from "@/lib/security";

export const dynamic = "force-dynamic";

const pickupOtpLockout = new AccountLockoutManager(5, 10 * 60 * 1000);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "orders:manage");
  if (auth.error) {
    return auth.error;
  }

  const { orderNumber } = await context.params;
  const cleanNum = orderNumber?.trim();

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      guestName: orders.guestName,
      guestPhone: orders.guestPhone,
      status: orders.status,
      subtotal: orders.subtotal,
      discount: orders.discount,
      deliveryFee: orders.deliveryFee,
      tax: orders.tax,
      total: orders.total,
      couponCode: orders.couponCode,
      addressSnapshot: orders.addressSnapshot,
      deliverySlot: orders.deliverySlot,
      fulfillmentType: orders.fulfillmentType,
      pickupStoreId: orders.pickupStoreId,
      pickupDate: orders.pickupDate,
      pickupSlot: orders.pickupSlot,
      estimatedReadyAt: orders.estimatedReadyAt,
      actualReadyAt: orders.actualReadyAt,
      pickupOtp: orders.pickupOtp,
      pickupVerifiedBy: orders.pickupVerifiedBy,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
      cancelReason: orders.cancelReason,
      storeName: stores.name,
      storeAddress: stores.address,
      storeCity: stores.city,
      storePhone: stores.phone,
      storeLat: stores.lat,
      storeLng: stores.lng,
      storeHours: stores.hours,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.pickupStoreId, stores.id))
    .where(eq(orders.orderNumber, cleanNum))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  let history: any[] = [];
  try {
    history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(desc(orderStatusHistory.createdAt));
  } catch {}

  return NextResponse.json({ order: { ...order, items, history } });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  return handleUpdate(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  return handleUpdate(request, context);
}

async function handleUpdate(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "orders:manage");
  if (auth.error) {
    return auth.error;
  }

  const { orderNumber } = await context.params;
  const cleanNum = orderNumber?.trim();

  const body = await readJsonSafe<{
    action?: "update_status" | "update_ready_time" | "verify_otp" | "override_capacity";
    status?: string;
    expectedStatus?: string;
    otp?: string;
    verifyByOrderNumber?: boolean;
    estimatedReadyAt?: string;
    cancelReason?: string;
    notes?: string;
  }>(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, cleanNum))
    .limit(1);

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const adminName = auth.user.name || auth.user.email || "Admin Staff";
  const action = body.action || (body.status ? "update_status" : body.estimatedReadyAt ? "update_ready_time" : "update_status");

  // 1. Action: verify_otp
  if (action === "verify_otp") {
    const inputOtp = body.otp?.trim();
    if (!inputOtp) {
      return NextResponse.json({ error: "Please enter the 6-digit pickup OTP." }, { status: 400 });
    }
    const isMatch = Boolean(existingOrder.pickupOtp && existingOrder.pickupOtp === inputOtp);
    return NextResponse.json({
      valid: isMatch,
      message: isMatch ? "OTP verified successfully!" : "Invalid OTP. Please check the customer's OTP.",
    });
  }

  // 2. Action: update_ready_time
  if (action === "update_ready_time") {
    if (!body.estimatedReadyAt || !body.estimatedReadyAt.trim()) {
      return NextResponse.json({ error: "Estimated ready time is required." }, { status: 400 });
    }
    const newReadyTime = body.estimatedReadyAt.trim();

    const readyDateObj = new Date(newReadyTime);
    const validReadyDate = isNaN(readyDateObj.getTime()) ? new Date() : readyDateObj;

    await db
      .update(orders)
      .set({ estimatedReadyAt: validReadyDate })
      .where(eq(orders.id, existingOrder.id));

    // Record in history
    try {
      await db.insert(orderStatusHistory).values({
        orderId: existingOrder.id,
        status: existingOrder.status,
        changedBy: String(auth.user?.id || auth.user?.email || "Admin"),
        note: `Estimated ready time updated to: ${newReadyTime} by ${adminName}`,
      });
    } catch {}

    // Customer SMS notification for time update
    try {
      const { DatabaseSync } = await import("node:sqlite");
      const path = await import("node:path");
      const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
      const sqlite = new DatabaseSync(dbPath);

      const custPhone = existingOrder.guestPhone || "+91 98250 19760";
      const custName = existingOrder.guestName || "Customer";

      sqlite.prepare(`
        INSERT INTO sms_logs (order_id, order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        existingOrder.id,
        existingOrder.orderNumber,
        custPhone,
        custName,
        `Namaste ${custName}, your Vardayini Sweets pickup order ${existingOrder.orderNumber} estimated ready time is updated to: ${newReadyTime}.`,
        "VRDYNI",
        "Delivered"
      );
    } catch (err) {
      console.warn("SMS log error:", err);
    }

    const [updated] = await db.select().from(orders).where(eq(orders.id, existingOrder.id)).limit(1);
    const { guestTokenHash: _discard, ...safe } = updated;
    return NextResponse.json({ order: safe, success: true });
  }

  // 3. Action: update_status
  if (action === "update_status") {
    const targetStatus = body.status;
    if (!targetStatus) {
      return NextResponse.json({ error: "Target status is required." }, { status: 400 });
    }

    if (targetStatus === existingOrder.status) {
      return NextResponse.json({ order: existingOrder, success: true, message: "Status unchanged" });
    }

    if (!canTransitionOrder(existingOrder.status, targetStatus)) {
      return NextResponse.json(
        { error: `Cannot transition order from '${existingOrder.status}' to '${targetStatus}'.` },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {
      status: targetStatus,
    };

    let historyNote = body.notes || `Order status updated to '${targetStatus}' by ${adminName}.`;

    // Special handling when ready for pickup
    if (targetStatus === "ready_for_pickup") {
      patch.actualReadyAt = new Date();
      historyNote = `Order is freshly prepared and ready for customer pickup. Verified by ${adminName}.`;
    }

    // Special handling when picked up
    if (targetStatus === "picked_up") {
      // Must verify OTP or explicitly verify by order number
      if (!body.verifyByOrderNumber) {
        const lockoutCheck = pickupOtpLockout.isLocked(cleanNum);
        if (lockoutCheck.locked) {
          return NextResponse.json(
            {
              error: `Too many invalid OTP attempts for this order. Verification is locked for security. Please retry in ${Math.ceil(lockoutCheck.retryAfterSeconds / 60)} minute(s) or verify via authorized Order Number override.`,
            },
            { status: 429 }
          );
        }

        const inputOtp = body.otp?.trim();
        if (!inputOtp) {
          return NextResponse.json(
            { error: "Please provide the customer's 6-digit pickup OTP to mark this order as Picked Up." },
            { status: 400 }
          );
        }
        if (existingOrder.pickupOtp && inputOtp !== existingOrder.pickupOtp) {
          const failState = pickupOtpLockout.recordFailure(cleanNum);
          if (failState.locked) {
            return NextResponse.json(
              {
                error: `Incorrect OTP. Maximum attempts exceeded. Verification locked for 10 minutes to protect customer security.`,
              },
              { status: 429 }
            );
          }
          return NextResponse.json(
            {
              error: `Incorrect OTP. Please ask the customer to show the OTP displayed on their order tracking page. (${failState.remainingAttempts} attempt(s) remaining)`,
            },
            { status: 400 }
          );
        }

        // Correct OTP provided
        pickupOtpLockout.recordSuccess(cleanNum);
      }

      patch.deliveredAt = new Date();
      patch.pickupVerifiedBy = adminName;
      historyNote = `Order handed over to customer. Pickup verified by ${adminName} (${body.verifyByOrderNumber ? "Verified by Order #" : "Verified via OTP"}).`;

      // If COD/Pay at Counter, mark as paid now that customer has collected items
      if (existingOrder.paymentMethod === "cod" || existingOrder.paymentMethod === "counter") {
        patch.paymentStatus = "paid";
      }
    }

    // Special handling when cancelled
    if (targetStatus === "cancelled") {
      patch.cancelledAt = new Date();
      patch.cancelReason = body.cancelReason || "Cancelled by store staff";
      historyNote = `Order cancelled: ${patch.cancelReason}. Items returned to inventory by ${adminName}.`;

      // Atomic cancellation and stock restoration inside transaction
      const updated = await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set(patch)
          .where(eq(orders.id, existingOrder.id));

        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, existingOrder.id));

        for (const it of items) {
          if (it.variantId) {
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${it.quantity}` })
              .where(eq(productVariants.id, it.variantId));
          }
        }

        await tx.insert(orderStatusHistory).values({
          orderId: existingOrder.id,
          status: "cancelled",
          changedBy: String(auth.user?.id || auth.user?.email || "Admin"),
          note: historyNote,
        });

        const [ord] = await tx.select().from(orders).where(eq(orders.id, existingOrder.id)).limit(1);
        return ord;
      });

      // Notification logs for cancellation
      try {
        const { DatabaseSync } = await import("node:sqlite");
        const path = await import("node:path");
        const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
        const sqlite = new DatabaseSync(dbPath);

        const custPhone = existingOrder.guestPhone || "+91 98250 19760";
        const custName = existingOrder.guestName || "Customer";

        sqlite.prepare(`
          INSERT INTO sms_logs (order_id, order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          existingOrder.id,
          existingOrder.orderNumber,
          custPhone,
          custName,
          `Namaste ${custName}, your Vardayini Sweets order ${existingOrder.orderNumber} has been cancelled. Reason: ${patch.cancelReason}.`,
          "VRDYNI",
          "Delivered"
        );
      } catch {}

      try {
        await updateOrderDetailsInMysql(cleanNum, {
          status: "cancelled",
          paymentStatus: updated.paymentStatus,
        });
      } catch {}

      const { guestTokenHash: _discard, ...safe } = updated;
      return NextResponse.json({ order: safe, success: true });
    }

    // Execute standard transition
    await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, existingOrder.id));

    try {
      await db.insert(orderStatusHistory).values({
        orderId: existingOrder.id,
        status: targetStatus,
        changedBy: String(auth.user?.id || auth.user?.email || "Admin"),
        note: historyNote,
      });
    } catch {}

    // Send customer notifications based on target status
    try {
      const { DatabaseSync } = await import("node:sqlite");
      const path = await import("node:path");
      const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
      const sqlite = new DatabaseSync(dbPath);

      const custPhone = existingOrder.guestPhone || "+91 98250 19760";
      const custName = existingOrder.guestName || "Customer";

      let smsText = "";
      let emailSubj = "";
      let template = "";

      if (targetStatus === "preparing") {
        smsText = `Namaste ${custName}, sweet masters at Vardayini Sweet Mart are now freshly preparing your pickup order ${existingOrder.orderNumber}!`;
        emailSubj = `Your Vardayini Order ${existingOrder.orderNumber} is Being Prepared Fresh`;
        template = "ORDER_PREPARING";
      } else if (targetStatus === "ready_for_pickup") {
        smsText = `Hooray ${custName}! Your Vardayini Sweets order ${existingOrder.orderNumber} is READY for pickup! Please visit the counter and show OTP: ${existingOrder.pickupOtp}`;
        emailSubj = `Your Vardayini Order ${existingOrder.orderNumber} is READY for Pickup!`;
        template = "ORDER_READY_FOR_PICKUP";
      } else if (targetStatus === "picked_up") {
        smsText = `Namaste ${custName}, thank you for picking up your order ${existingOrder.orderNumber}. Enjoy authentic Shuddh Desi Ghee sweets!`;
        emailSubj = `Thank You for Visiting Vardayini Sweet Mart · Order ${existingOrder.orderNumber}`;
        template = "ORDER_PICKED_UP";
      }

      if (smsText) {
        sqlite.prepare(`
          INSERT INTO sms_logs (order_id, order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          existingOrder.id,
          existingOrder.orderNumber,
          custPhone,
          custName,
          smsText,
          "VRDYNI",
          "Delivered"
        );
      }

      if (emailSubj) {
        const custEmail = existingOrder.guestName ? `${existingOrder.guestName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com` : "customer@vardayini.com";
        sqlite.prepare(`
          INSERT INTO email_logs (order_id, order_number, recipient_name, recipient_email, subject, template_name, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          existingOrder.id,
          existingOrder.orderNumber,
          custName,
          custEmail,
          emailSubj,
          template,
          "Delivered"
        );
      }
    } catch (err) {
      console.warn("Notification logging error:", err);
    }

    try {
      await updateOrderDetailsInMysql(cleanNum, {
        status: targetStatus,
        paymentStatus: patch.paymentStatus || existingOrder.paymentStatus,
      });
    } catch {}

    const [updated] = await db.select().from(orders).where(eq(orders.id, existingOrder.id)).limit(1);
    const { guestTokenHash: _discard, ...safe } = updated;
    return NextResponse.json({ order: safe, success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
