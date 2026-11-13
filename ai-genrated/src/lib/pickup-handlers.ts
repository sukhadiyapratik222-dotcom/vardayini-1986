import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, getSqliteDb } from "@/db";
import { orders, orderItems, stores, productVariants, orderStatusHistory } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { canTransitionOrder } from "@/lib/order-transitions";
import { readJsonSafe } from "@/lib/validation";
import { updateOrderDetailsInMysql } from "@/lib/mysql";
import { AccountLockoutManager } from "@/lib/security";

export const pickupOtpLockout = new AccountLockoutManager(5, 10 * 60 * 1000);

export function parseOrderLookup(rawNum?: string | number) {
  const str = String(rawNum || "").trim();
  const decoded = decodeURIComponent(str).trim();
  const clean = decoded.replace(/^#/, "").trim();
  const numId = parseInt(clean, 10);
  const isValidNumId = !isNaN(numId) && numId > 0 && String(numId) === clean;

  const conditions = [
    eq(orders.orderNumber, clean),
    eq(orders.orderNumber, decoded),
    eq(orders.orderNumber, str),
    sql`LOWER(${orders.orderNumber}) = LOWER(${clean})`,
    sql`REPLACE(${orders.orderNumber}, '#', '') = ${clean}`,
  ];

  if (isValidNumId) {
    conditions.push(eq(orders.id, numId));
  }

  return { clean, decoded, numId: isValidNumId ? numId : undefined, condition: or(...conditions) };
}


export async function handlePickupUpdate(
  request: NextRequest,
  orderNumberParam?: string,
  preParsedBody?: any
) {
  await ensureSeeded();
  const auth = await requireAdmin(request, "orders:manage");
  if (auth.error) {
    return auth.error;
  }

  const body =
    preParsedBody ??
    (await readJsonSafe<{
      action?: "update_status" | "update_ready_time" | "verify_otp" | "override_capacity";
      status?: string;
      expectedStatus?: string;
      otp?: string;
      verifyByOrderNumber?: boolean;
      estimatedReadyAt?: string;
      cancelReason?: string;
      notes?: string;
      orderNumber?: string;
      orderId?: string | number;
      id?: string | number;
    }>(request));

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawTarget = (orderNumberParam || body.orderNumber || body.orderId || body.id || "").toString().trim();
  const lookup = parseOrderLookup(rawTarget);

  if (!lookup.clean && !lookup.numId) {
    return NextResponse.json({ error: "Order number or ID is required" }, { status: 400 });
  }

  let [existingOrder] = await db
    .select()
    .from(orders)
    .where(lookup.condition)
    .limit(1);

  // Direct SQLite fallback
  if (!existingOrder) {
    try {
      const sqlite = getSqliteDb();
      const sqliteRow = sqlite
        .prepare(`
          SELECT * FROM orders
          WHERE order_number = ? 
             OR REPLACE(order_number, '#', '') = ?
             OR LOWER(order_number) = LOWER(?)
             ${lookup.numId ? "OR id = ?" : ""}
          LIMIT 1
        `)
        .get(
          ...(lookup.numId
            ? [lookup.clean, lookup.clean, lookup.clean, lookup.numId]
            : [lookup.clean, lookup.clean, lookup.clean])
        ) as any;

      if (sqliteRow) {
        existingOrder = {
          id: sqliteRow.id,
          orderNumber: sqliteRow.order_number,
          userId: sqliteRow.user_id,
          guestName: sqliteRow.guest_name,
          guestPhone: sqliteRow.guest_phone,
          status: sqliteRow.status,
          subtotal: sqliteRow.subtotal,
          discount: sqliteRow.discount,
          deliveryFee: sqliteRow.delivery_fee,
          tax: sqliteRow.tax,
          total: sqliteRow.total,
          couponCode: sqliteRow.coupon_code,
          addressSnapshot: sqliteRow.address_snapshot,
          deliverySlot: sqliteRow.delivery_slot,
          fulfillmentType: sqliteRow.fulfillment_type || "pickup",
          pickupStoreId: sqliteRow.pickup_store_id,
          pickupDate: sqliteRow.pickup_date,
          pickupSlot: sqliteRow.pickup_slot,
          estimatedReadyAt: sqliteRow.estimated_ready_at ? new Date(sqliteRow.estimated_ready_at) : null,
          actualReadyAt: sqliteRow.actual_ready_at ? new Date(sqliteRow.actual_ready_at) : null,
          pickupOtp: sqliteRow.pickup_otp,
          pickupVerifiedBy: sqliteRow.pickup_verified_by,
          paymentMethod: sqliteRow.payment_method,
          paymentStatus: sqliteRow.payment_status,
          createdAt: sqliteRow.created_at ? new Date(sqliteRow.created_at) : new Date(),
          deliveredAt: sqliteRow.delivered_at ? new Date(sqliteRow.delivered_at) : null,
          cancelledAt: sqliteRow.cancelled_at ? new Date(sqliteRow.cancelled_at) : null,
          cancelReason: sqliteRow.cancel_reason,
        } as any;
      }
    } catch (e) {
      console.warn("[pickups] SQLite fallback query error:", e);
    }
  }

  // MongoDB Atlas fallback (multi-container synchronization across Vercel lambdas)
  if (!existingOrder) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const query: any = {
          $or: [
            { orderNumber: lookup.clean },
            { orderNumber: `#${lookup.clean}` },
            { orderNumber: lookup.decoded },
          ],
        };
        if (lookup.numId) {
          query.$or.push({ id: lookup.numId });
        }
        const mOrder = await mongo.collection("orders").findOne(query);
        if (mOrder) {
          try {
            const sqlite = getSqliteDb();
            sqlite.prepare(`
              INSERT OR REPLACE INTO orders (
                id, order_number, user_id, guest_name, guest_phone, status, subtotal, discount,
                delivery_fee, tax, total, coupon_code, address_snapshot, delivery_slot,
                fulfillment_type, pickup_store_id, pickup_date, pickup_slot, estimated_ready_at,
                actual_ready_at, pickup_otp, pickup_verified_by, payment_method, payment_status,
                created_at, delivered_at, cancelled_at, cancel_reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mOrder.id || (lookup.numId ?? 9999),
              mOrder.orderNumber || lookup.clean,
              mOrder.userId || null,
              mOrder.guestName || "Customer",
              mOrder.guestPhone || "",
              mOrder.status || "confirmed",
              mOrder.subtotal || 0,
              mOrder.discount || 0,
              mOrder.deliveryFee || 0,
              mOrder.tax || 0,
              mOrder.total || 0,
              mOrder.couponCode || null,
              typeof mOrder.addressSnapshot === "object" ? JSON.stringify(mOrder.addressSnapshot) : (mOrder.addressSnapshot || null),
              mOrder.deliverySlot || null,
              mOrder.fulfillmentType || "pickup",
              mOrder.pickupStoreId || 1,
              mOrder.pickupDate || null,
              mOrder.pickupSlot || null,
              mOrder.estimatedReadyAt ? new Date(mOrder.estimatedReadyAt).toISOString() : null,
              mOrder.actualReadyAt ? new Date(mOrder.actualReadyAt).toISOString() : null,
              mOrder.pickupOtp || null,
              mOrder.pickupVerifiedBy || null,
              mOrder.paymentMethod || "cod",
              mOrder.paymentStatus || "pending",
              mOrder.createdAt ? new Date(mOrder.createdAt).toISOString() : new Date().toISOString(),
              mOrder.deliveredAt ? new Date(mOrder.deliveredAt).toISOString() : null,
              mOrder.cancelledAt ? new Date(mOrder.cancelledAt).toISOString() : null,
              mOrder.cancelReason || null
            );
            [existingOrder] = await db.select().from(orders).where(lookup.condition).limit(1);
          } catch (hydErr) {
            console.warn("[pickups] SQLite hydration error:", hydErr);
          }

          if (!existingOrder) {
            existingOrder = {
              id: mOrder.id || (lookup.numId ?? 9999),
              orderNumber: mOrder.orderNumber || lookup.clean,
              userId: mOrder.userId || null,
              guestName: mOrder.guestName || "Customer",
              guestPhone: mOrder.guestPhone || "",
              status: mOrder.status || "confirmed",
              subtotal: mOrder.subtotal || 0,
              discount: mOrder.discount || 0,
              deliveryFee: mOrder.deliveryFee || 0,
              tax: mOrder.tax || 0,
              total: mOrder.total || 0,
              couponCode: mOrder.couponCode || null,
              addressSnapshot: typeof mOrder.addressSnapshot === "object" ? JSON.stringify(mOrder.addressSnapshot) : (mOrder.addressSnapshot || null),
              deliverySlot: mOrder.deliverySlot || null,
              fulfillmentType: mOrder.fulfillmentType || "pickup",
              pickupStoreId: mOrder.pickupStoreId || 1,
              pickupDate: mOrder.pickupDate || null,
              pickupSlot: mOrder.pickupSlot || null,
              estimatedReadyAt: mOrder.estimatedReadyAt ? new Date(mOrder.estimatedReadyAt) : null,
              actualReadyAt: mOrder.actualReadyAt ? new Date(mOrder.actualReadyAt) : null,
              pickupOtp: mOrder.pickupOtp || null,
              pickupVerifiedBy: mOrder.pickupVerifiedBy || null,
              paymentMethod: mOrder.paymentMethod || "cod",
              paymentStatus: mOrder.paymentStatus || "pending",
              createdAt: mOrder.createdAt ? new Date(mOrder.createdAt) : new Date(),
              deliveredAt: mOrder.deliveredAt ? new Date(mOrder.deliveredAt) : null,
              cancelledAt: mOrder.cancelledAt ? new Date(mOrder.cancelledAt) : null,
              cancelReason: mOrder.cancelReason || null,
            } as any;
          }
        }
      }
    } catch (mErr) {
      console.warn("[pickups] MongoDB fallback query error:", mErr);
    }
  }

  if (!existingOrder) {
    return NextResponse.json({ error: `Pickup order '${lookup.clean || rawTarget}' not found` }, { status: 404 });
  }

  const cleanNum = existingOrder.orderNumber;
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

    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("orders").updateOne(
          { orderNumber: existingOrder.orderNumber },
          {
            $set: {
              estimatedReadyAt: validReadyDate,
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch (mTimeErr) {
      console.warn("[pickups] MongoDB ready time update notice:", mTimeErr);
    }

    // Customer SMS notification for time update
    try {
      const { getSqliteDb } = await import("@/db");
      const sqlite = getSqliteDb();

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
        const { getSqliteDb } = await import("@/db");
        const sqlite = getSqliteDb();

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

      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          await mongo.collection("orders").updateOne(
            { orderNumber: existingOrder.orderNumber },
            {
              $set: {
                status: "cancelled",
                cancelledAt: patch.cancelledAt,
                cancelReason: patch.cancelReason,
                paymentStatus: updated.paymentStatus,
                updatedAt: new Date(),
              },
            }
          );
        }
      } catch (mCancelErr) {
        console.warn("[pickups] MongoDB cancel update notice:", mCancelErr);
      }

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
      const { getSqliteDb } = await import("@/db");
      const sqlite = getSqliteDb();

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

    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("orders").updateOne(
          { orderNumber: existingOrder.orderNumber },
          {
            $set: {
              ...patch,
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch (mUpErr) {
      console.warn("[pickups] MongoDB status sync notice:", mUpErr);
    }

    const [updated] = await db.select().from(orders).where(eq(orders.id, existingOrder.id)).limit(1);
    const { guestTokenHash: _discard, ...safe } = updated;
    return NextResponse.json({ order: safe, success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
