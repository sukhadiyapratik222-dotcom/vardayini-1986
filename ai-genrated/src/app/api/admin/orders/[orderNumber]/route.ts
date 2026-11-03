import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db, getSqliteDb } from "@/db";
import {
  orders,
  orderItems,
  productVariants,
  invoices,
  payments,
  orderStatusHistory,
  stores,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { canTransitionOrder } from "@/lib/order-transitions";
import { readJsonSafe } from "@/lib/validation";
import { NextResponse } from "next/server";
import {
  updateOrderDetailsInMysql,
  deleteOrderFromMysql,
  updateVariantStockInMysql,
} from "@/lib/mysql";
import { logOrderStatusHistory } from "@/lib/invoice";

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe<{
    status?: string;
    expectedStatus?: string;
    guestName?: string;
    guestPhone?: string;
    deliverySlot?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    cancelReason?: string;
    total?: number;
    // Tracking & Courier
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    expectedDeliveryDate?: string | null;
    // Pickup specific
    pickupDate?: string;
    pickupSlot?: string;
    estimatedReadyAt?: string | null;
    actualReadyAt?: string | null;
    pickupVerifiedBy?: string;
    verifyPickup?: boolean;
    // Tracking milestone note
    note?: string;
    location?: string;
  }>(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { orderNumber } = await context.params;
  const decodedNum = decodeURIComponent(orderNumber || "").trim();
  const cleanOrderNum = decodedNum.replace(/^#/, "").trim();

  let [existingOrder] = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.orderNumber, cleanOrderNum),
        eq(orders.orderNumber, `#${cleanOrderNum}`),
        eq(orders.orderNumber, decodedNum)
      )
    )
    .limit(1);

  if (!existingOrder) {
    try {
      const sqlite = getSqliteDb();
      const sqliteRow = sqlite
        .prepare(`
          SELECT * FROM orders 
          WHERE order_number = ? 
             OR REPLACE(order_number, '#', '') = ? 
             OR LOWER(order_number) = LOWER(?)
          LIMIT 1
        `)
        .get(cleanOrderNum, cleanOrderNum, cleanOrderNum) as any;
      if (sqliteRow) {
        existingOrder = sqliteRow;
      }
    } catch {}
  }

  // MongoDB Atlas fallback (multi-container synchronization)
  if (!existingOrder) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const mDoc = await mongo.collection("orders").findOne({
          $or: [
            { orderNumber: cleanOrderNum },
            { orderNumber: `#${cleanOrderNum}` },
            { orderNumber: decodedNum },
          ],
        });
        if (mDoc) {
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
              mDoc.id || 9999,
              mDoc.orderNumber || cleanOrderNum,
              mDoc.userId || null,
              mDoc.guestName || "Customer",
              mDoc.guestPhone || "",
              mDoc.status || "confirmed",
              mDoc.subtotal || 0,
              mDoc.discount || 0,
              mDoc.deliveryFee || 0,
              mDoc.tax || 0,
              mDoc.total || 0,
              mDoc.couponCode || null,
              typeof mDoc.addressSnapshot === "object" ? JSON.stringify(mDoc.addressSnapshot) : (mDoc.addressSnapshot || null),
              mDoc.deliverySlot || null,
              mDoc.fulfillmentType || "delivery",
              mDoc.pickupStoreId || null,
              mDoc.pickupDate || null,
              mDoc.pickupSlot || null,
              mDoc.estimatedReadyAt ? new Date(mDoc.estimatedReadyAt).toISOString() : null,
              mDoc.actualReadyAt ? new Date(mDoc.actualReadyAt).toISOString() : null,
              mDoc.pickupOtp || null,
              mDoc.pickupVerifiedBy || null,
              mDoc.paymentMethod || "cod",
              mDoc.paymentStatus || "pending",
              mDoc.createdAt ? new Date(mDoc.createdAt).toISOString() : new Date().toISOString(),
              mDoc.deliveredAt ? new Date(mDoc.deliveredAt).toISOString() : null,
              mDoc.cancelledAt ? new Date(mDoc.cancelledAt).toISOString() : null,
              mDoc.cancelReason || null
            );
            [existingOrder] = await db.select().from(orders).where(eq(orders.orderNumber, cleanOrderNum)).limit(1);
          } catch {}
          if (!existingOrder) {
            existingOrder = mDoc as any;
          }
        }
      }
    } catch (mErr) {
      console.warn("[orders PUT] MongoDB fallback notice:", mErr);
    }
  }

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const expectedStatus = body.expectedStatus || existingOrder.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};

  if (body.deliverySlot !== undefined) patch.deliverySlot = body.deliverySlot;
  if (body.paymentMethod !== undefined) patch.paymentMethod = body.paymentMethod;
  if (body.paymentStatus !== undefined) patch.paymentStatus = body.paymentStatus;

  // Tracking & Courier fields
  if (body.courierName !== undefined) patch.courierName = body.courierName;
  if (body.trackingNumber !== undefined) patch.trackingNumber = body.trackingNumber;
  if (body.trackingUrl !== undefined) patch.trackingUrl = body.trackingUrl;
  if (body.expectedDeliveryDate !== undefined) {
    patch.expectedDeliveryDate = body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null;
  }

  // Pickup fields
  if (body.pickupDate !== undefined) patch.pickupDate = body.pickupDate;
  if (body.pickupSlot !== undefined) patch.pickupSlot = body.pickupSlot;
  if (body.estimatedReadyAt !== undefined) {
    patch.estimatedReadyAt = body.estimatedReadyAt ? new Date(body.estimatedReadyAt) : null;
  }
  if (body.actualReadyAt !== undefined) {
    patch.actualReadyAt = body.actualReadyAt ? new Date(body.actualReadyAt) : null;
  }
  if (body.pickupVerifiedBy !== undefined) patch.pickupVerifiedBy = body.pickupVerifiedBy;

  if (body.verifyPickup) {
    patch.pickupVerifiedBy = body.pickupVerifiedBy || auth.user?.name || "Store Counter Staff";
    patch.deliveredAt = new Date();
    patch.actualReadyAt = patch.actualReadyAt || new Date();
    if (existingOrder.paymentMethod === "cod" || existingOrder.paymentMethod === "counter") {
      patch.paymentStatus = "paid";
    }
  }

  const targetStatus = body.status;

  if (targetStatus && targetStatus !== existingOrder.status) {
    // Validate state machine transition graph
    if (!canTransitionOrder(existingOrder.status, targetStatus)) {
      return NextResponse.json(
        { error: `Cannot transition order from '${existingOrder.status}' to '${targetStatus}'` },
        { status: 400 }
      );
    }

    patch.status = targetStatus;

    if (targetStatus === "delivered" || targetStatus === "picked_up") {
      patch.deliveredAt = new Date();
      if (!patch.actualReadyAt && (existingOrder.fulfillmentType === "pickup" || existingOrder.pickupStoreId)) {
        patch.actualReadyAt = new Date();
      }
    }

    // COD is marked as paid ONLY at delivered/picked_up
    const effectivePaymentMethod = patch.paymentMethod || existingOrder.paymentMethod;
    if (effectivePaymentMethod === "cod" || effectivePaymentMethod === "counter") {
      if (targetStatus === "delivered" || targetStatus === "picked_up") {
        patch.paymentStatus = "paid";
      } else if (patch.paymentStatus === "paid") {
        delete patch.paymentStatus;
      }
    }

    // If transitioning to cancelled: execute atomic conditional cancellation, stock restoration, and refund marking
    if (targetStatus === "cancelled" && existingOrder.status !== "cancelled") {
      const isPaid = existingOrder.paymentStatus === "paid" || existingOrder.paymentStatus === "completed";

      const updated = await db.transaction(async (tx) => {
        const [updateRes] = await tx
          .update(orders)
          .set({
            ...patch,
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: body.cancelReason || body.note || "Cancelled by administrator",
            refundStatus: isPaid ? "pending" : "none",
            refundAmount: isPaid ? existingOrder.total : 0,
          })
          .where(and(eq(orders.id, existingOrder.id), eq(orders.status, expectedStatus)));

        if (!updateRes || updateRes.affectedRows === 0) return null;
        const [order] = await tx.select().from(orders).where(eq(orders.id, existingOrder.id)).limit(1);

        // Restore stock once in the same cancellation transaction
        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, existingOrder.id));

        for (const item of items) {
          if (item.variantId) {
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
              .where(eq(productVariants.id, item.variantId));
          }
        }

        return order;
      });

      if (!updated) {
        return NextResponse.json(
          { error: "Order status conflict: order was updated concurrently" },
          { status: 409 }
        );
      }

      await logOrderStatusHistory(
        existingOrder.id,
        "cancelled",
        body.cancelReason || body.note || "Order cancelled by administrator",
        body.location || "Store Management Desk",
        "admin"
      );

      // Sync cancelled order status to MySQL
      try {
        await updateOrderDetailsInMysql(orderNumber, {
          status: "cancelled",
          paymentStatus: updated.paymentStatus,
        });
      } catch (err) {
        console.warn("MySQL admin order cancel sync notice:", err);
      }

      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          await mongo.collection("orders").updateOne(
            { orderNumber: updated.orderNumber },
            {
              $set: {
                status: "cancelled",
                cancelledAt: updated.cancelledAt,
                cancelReason: updated.cancelReason,
                paymentStatus: updated.paymentStatus,
                updatedAt: new Date(),
              },
            }
          );
        }
      } catch (mCancelErr) {
        console.warn("MongoDB admin order cancel sync notice:", mCancelErr);
      }

      const { guestTokenHash: _discardHash1, ...safeUpdated1 } = updated;
      return NextResponse.json({ order: safeUpdated1 });
    }
  } else {
    // If not transitioning status, still enforce COD paid only at delivered
    const effectivePaymentMethod = patch.paymentMethod || existingOrder.paymentMethod;
    const effectiveStatus = existingOrder.status;
    if (effectivePaymentMethod === "cod" || effectivePaymentMethod === "counter") {
      if (effectiveStatus === "delivered" || effectiveStatus === "picked_up") {
        patch.paymentStatus = "paid";
      } else if (patch.paymentStatus === "paid") {
        delete patch.paymentStatus;
      }
    }
  }

  if (Object.keys(patch).length === 0 && !body.note) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (Object.keys(patch).length > 0) {
    // Conditional update on expected status; return 409 on conflict
    const [updateRes] = await db
      .update(orders)
      .set(patch)
      .where(and(eq(orders.id, existingOrder.id), eq(orders.status, expectedStatus)));

    if (!updateRes || updateRes.affectedRows === 0) {
      return NextResponse.json(
        { error: "Order status conflict: order was updated concurrently" },
        { status: 409 }
      );
    }
  }

  const [updated] = await db.select().from(orders).where(eq(orders.id, existingOrder.id)).limit(1);

  // Log status history milestone if status changed, note provided, or courier updated
  const historyStatus = targetStatus || existingOrder.status;
  const historyNote =
    body.note ||
    (targetStatus && targetStatus !== existingOrder.status
      ? `Order status transitioned to ${targetStatus.toUpperCase().replace(/_/g, " ")}`
      : body.trackingNumber
      ? `Dispatched via ${body.courierName || "Courier"} (Tracking/AWB: ${body.trackingNumber})`
      : body.verifyPickup
      ? `Counter pickup verified by ${patch.pickupVerifiedBy}`
      : "Order tracking details updated by administrator");

  await logOrderStatusHistory(
    existingOrder.id,
    historyStatus,
    historyNote,
    body.location || "Vadodara Central Operations",
    "admin"
  );

  // Sync updated order fields to MySQL
  try {
    await updateOrderDetailsInMysql(orderNumber, {
      status: updated.status,
      guestName: updated.guestName || undefined,
      guestPhone: updated.guestPhone || undefined,
      deliverySlot: updated.deliverySlot || undefined,
      paymentMethod: updated.paymentMethod || undefined,
      paymentStatus: updated.paymentStatus || undefined,
      total: updated.total,
    });
  } catch (err) {
    console.warn("MySQL admin order update sync notice:", err);
  }

  try {
    const { getMongoDb } = await import("@/lib/mongodb");
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection("orders").updateOne(
        { orderNumber: updated.orderNumber },
        {
          $set: {
            ...patch,
            status: updated.status,
            paymentStatus: updated.paymentStatus,
            updatedAt: new Date(),
          },
        }
      );
    }
  } catch (mUpErr) {
    console.warn("MongoDB admin order update sync notice:", mUpErr);
  }

  // Fetch updated history and items
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, updated.id));
  let history: any[] = [];
  try {
    history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, updated.id))
      .orderBy(desc(orderStatusHistory.createdAt));
  } catch {}

  let store: any = null;
  if (updated.pickupStoreId) {
    try {
      const [s] = await db.select().from(stores).where(eq(stores.id, updated.pickupStoreId)).limit(1);
      store = s || null;
    } catch {}
  }

  const { guestTokenHash: _discardHash2, ...safeUpdated2 } = updated;
  return NextResponse.json({
    order: {
      ...safeUpdated2,
      items,
      history,
      store,
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { orderNumber } = await context.params;
  const cleanNum = decodeURIComponent(orderNumber || "").trim();

  let [order] = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.orderNumber, cleanNum),
        eq(orders.orderNumber, cleanNum.toUpperCase()),
        eq(sql`LOWER(${orders.orderNumber})`, cleanNum.toLowerCase()),
        like(orders.orderNumber, `%${cleanNum}%`)
      )
    )
    .limit(1);

  // Fast direct SQLite fallback if Drizzle misses or pool was busy
  if (!order) {
    try {
      const sqlite = getSqliteDb();
      const sqliteRow = sqlite
        .prepare(
          "SELECT * FROM orders WHERE order_number = ? OR UPPER(order_number) = UPPER(?) OR order_number LIKE ? LIMIT 1"
        )
        .get(cleanNum, cleanNum, `%${cleanNum}%`) as any;
      if (sqliteRow) {
        order = {
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
          fulfillmentType: sqliteRow.fulfillment_type || "delivery",
          pickupStoreId: sqliteRow.pickup_store_id,
          pickupDate: sqliteRow.pickup_date,
          pickupSlot: sqliteRow.pickup_slot,
          estimatedReadyAt: sqliteRow.estimated_ready_at ? new Date(sqliteRow.estimated_ready_at) : null,
          actualReadyAt: sqliteRow.actual_ready_at ? new Date(sqliteRow.actual_ready_at) : null,
          pickupOtp: sqliteRow.pickup_otp,
          pickupVerifiedBy: sqliteRow.pickup_verified_by,
          paymentMethod: sqliteRow.payment_method,
          paymentStatus: sqliteRow.payment_status,
          sessionId: sqliteRow.session_id,
          guestTokenHash: sqliteRow.guest_token_hash,
          courierName: sqliteRow.courier_name,
          trackingNumber: sqliteRow.tracking_number,
          trackingUrl: sqliteRow.tracking_url,
          expectedDeliveryDate: sqliteRow.expected_delivery_date ? new Date(sqliteRow.expected_delivery_date) : null,
          deliveredAt: sqliteRow.delivered_at ? new Date(sqliteRow.delivered_at) : null,
          cancelledAt: sqliteRow.cancelled_at ? new Date(sqliteRow.cancelled_at) : null,
          cancelReason: sqliteRow.cancel_reason,
          returnReason: sqliteRow.return_reason,
          returnStatus: sqliteRow.return_status || "none",
          refundStatus: sqliteRow.refund_status || "none",
          refundAmount: sqliteRow.refund_amount || 0,
          createdAt: sqliteRow.created_at ? new Date(sqliteRow.created_at) : new Date(),
        } as any;
      }
    } catch (sqlErr) {
      console.warn("Direct SQLite fallback lookup error:", sqlErr);
    }
  }

  // Fallback to MongoDB Atlas (multi-container synchronization)
  if (!order) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const rawClean = cleanNum.replace(/^#/, "").trim();
        const mDoc = await mongo.collection("orders").findOne({
          $or: [
            { orderNumber: rawClean },
            { orderNumber: `#${rawClean}` },
            { orderNumber: cleanNum },
          ],
        });
        if (mDoc) {
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
              mDoc.id || 9999,
              mDoc.orderNumber || rawClean,
              mDoc.userId || null,
              mDoc.guestName || "Customer",
              mDoc.guestPhone || "",
              mDoc.status || "confirmed",
              mDoc.subtotal || 0,
              mDoc.discount || 0,
              mDoc.deliveryFee || 0,
              mDoc.tax || 0,
              mDoc.total || 0,
              mDoc.couponCode || null,
              typeof mDoc.addressSnapshot === "object" ? JSON.stringify(mDoc.addressSnapshot) : (mDoc.addressSnapshot || null),
              mDoc.deliverySlot || null,
              mDoc.fulfillmentType || "delivery",
              mDoc.pickupStoreId || null,
              mDoc.pickupDate || null,
              mDoc.pickupSlot || null,
              mDoc.estimatedReadyAt ? new Date(mDoc.estimatedReadyAt).toISOString() : null,
              mDoc.actualReadyAt ? new Date(mDoc.actualReadyAt).toISOString() : null,
              mDoc.pickupOtp || null,
              mDoc.pickupVerifiedBy || null,
              mDoc.paymentMethod || "cod",
              mDoc.paymentStatus || "pending",
              mDoc.createdAt ? new Date(mDoc.createdAt).toISOString() : new Date().toISOString(),
              mDoc.deliveredAt ? new Date(mDoc.deliveredAt).toISOString() : null,
              mDoc.cancelledAt ? new Date(mDoc.cancelledAt).toISOString() : null,
              mDoc.cancelReason || null
            );
            [order] = await db.select().from(orders).where(eq(orders.orderNumber, mDoc.orderNumber)).limit(1);
          } catch {}
          if (!order) {
            order = {
              id: mDoc.id || 9999,
              orderNumber: mDoc.orderNumber || rawClean,
              userId: mDoc.userId || null,
              guestName: mDoc.guestName || "Customer",
              guestPhone: mDoc.guestPhone || "",
              status: mDoc.status || "confirmed",
              subtotal: mDoc.subtotal || 0,
              discount: mDoc.discount || 0,
              deliveryFee: mDoc.deliveryFee || 0,
              tax: mDoc.tax || 0,
              total: mDoc.total || 0,
              couponCode: mDoc.couponCode || null,
              addressSnapshot: typeof mDoc.addressSnapshot === "object" ? JSON.stringify(mDoc.addressSnapshot) : (mDoc.addressSnapshot || null),
              deliverySlot: mDoc.deliverySlot || null,
              fulfillmentType: mDoc.fulfillmentType || "delivery",
              pickupStoreId: mDoc.pickupStoreId || null,
              pickupDate: mDoc.pickupDate || null,
              pickupSlot: mDoc.pickupSlot || null,
              estimatedReadyAt: mDoc.estimatedReadyAt ? new Date(mDoc.estimatedReadyAt) : null,
              actualReadyAt: mDoc.actualReadyAt ? new Date(mDoc.actualReadyAt) : null,
              pickupOtp: mDoc.pickupOtp || null,
              pickupVerifiedBy: mDoc.pickupVerifiedBy || null,
              paymentMethod: mDoc.paymentMethod || "cod",
              paymentStatus: mDoc.paymentStatus || "pending",
              createdAt: mDoc.createdAt ? new Date(mDoc.createdAt) : new Date(),
              deliveredAt: mDoc.deliveredAt ? new Date(mDoc.deliveredAt) : null,
              cancelledAt: mDoc.cancelledAt ? new Date(mDoc.cancelledAt) : null,
              cancelReason: mDoc.cancelReason || null,
            } as any;
          }
        }
      }
    } catch (mErr) {
      console.warn("MongoDB fallback order lookup error:", mErr);
    }
  }

  if (!order) {
    return NextResponse.json({ error: `Order #${cleanNum} not found` }, { status: 404 });
  }

  // 1. Order Items (with SQLite fallback)
  let items: any[] = [];
  try {
    items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
  } catch (err) {
    try {
      const sqlite = getSqliteDb();
      const rawItems = sqlite.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) as any[];
      items = rawItems.map((it) => ({
        id: it.id,
        orderId: it.order_id,
        productName: it.product_name,
        variantWeight: it.variant_weight,
        unitPrice: it.unit_price,
        quantity: it.quantity,
        imageUrl: it.image_url,
        variantId: it.variant_id,
        hsnCode: it.hsn_code,
        taxRate: it.tax_rate,
        taxableAmount: it.taxable_amount,
        cgstAmount: it.cgst_amount,
        sgstAmount: it.sgst_amount,
        igstAmount: it.igst_amount,
        totalAmount: it.total_amount,
      }));
    } catch {}
  }

  // 2. Status History (most recent first, with guaranteed history entry)
  let history: any[] = [];
  try {
    history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(desc(orderStatusHistory.createdAt));
  } catch (err) {
    try {
      const sqlite = getSqliteDb();
      const rawHist = sqlite
        .prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id DESC")
        .all(order.id) as any[];
      history = rawHist.map((h) => ({
        id: h.id,
        orderId: h.order_id,
        status: h.status,
        note: h.note,
        location: h.location,
        changedBy: h.changed_by,
        createdAt: h.created_at ? new Date(h.created_at) : new Date(),
      }));
    } catch {}
  }

  if (history.length === 0) {
    history.push({
      id: 0,
      orderId: order.id,
      status: order.status || "confirmed",
      note: "Order confirmed in system",
      location: "Vadodara Operations Desk",
      changedBy: "system",
      createdAt: order.createdAt || new Date(),
    });
  }

  // 3. Store details if Store Pickup
  let store: any = null;
  if (order.pickupStoreId) {
    try {
      const [s] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, order.pickupStoreId))
        .limit(1);
      store = s || null;
    } catch {
      try {
        const sqlite = getSqliteDb();
        store = sqlite.prepare("SELECT * FROM stores WHERE id = ? LIMIT 1").get(order.pickupStoreId) as any;
      } catch {}
    }
  }

  // 4. User profile if registered customer
  let userProfile: any = null;
  if (order.userId) {
    try {
      const [u] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);
      userProfile = u || null;
    } catch {
      try {
        const sqlite = getSqliteDb();
        userProfile = sqlite
          .prepare("SELECT id, name, email, phone, role FROM users WHERE id = ? LIMIT 1")
          .get(order.userId) as any;
      } catch {}
    }
  }

  // 5. Parsed Address Snapshot
  let parsedAddress: any = null;
  if (order.addressSnapshot) {
    try {
      parsedAddress =
        typeof order.addressSnapshot === "string"
          ? JSON.parse(order.addressSnapshot)
          : order.addressSnapshot;
    } catch {
      parsedAddress = { raw: order.addressSnapshot };
    }
  }

  // 6. Payment Record
  let paymentRecord: any = null;
  try {
    const [p] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);
    paymentRecord = p || null;
  } catch {
    try {
      const sqlite = getSqliteDb();
      paymentRecord = sqlite.prepare("SELECT * FROM payments WHERE order_id = ? LIMIT 1").get(order.id) as any;
    } catch {}
  }

  // 7. Invoice Record
  let invoiceSummary: any = null;
  try {
    const [inv] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        grandTotal: invoices.grandTotal,
        pdfUrl: invoices.pdfUrl,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.orderId, order.id))
      .limit(1);
    invoiceSummary = inv || null;
  } catch {
    try {
      const sqlite = getSqliteDb();
      invoiceSummary = sqlite
        .prepare("SELECT id, invoice_number as invoiceNumber, invoice_date as invoiceDate, grand_total as grandTotal, pdf_url as pdfUrl, status FROM invoices WHERE order_id = ? LIMIT 1")
        .get(order.id) as any;
    } catch {}
  }

  const customerName =
    userProfile?.name ||
    order.guestName ||
    parsedAddress?.name ||
    parsedAddress?.fullName ||
    "Customer";
  const customerPhone =
    userProfile?.phone ||
    order.guestPhone ||
    parsedAddress?.phone ||
    "-";

  const { guestTokenHash: _discard, ...safeOrder } = order;
  return NextResponse.json({
    order: {
      ...safeOrder,
      customerName,
      customerPhone,
      items,
      history,
      store,
      user: userProfile,
      parsedAddress,
      payment: paymentRecord,
      invoice: invoiceSummary,
    },
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { orderNumber } = await context.params;
  const cleanNum = orderNumber?.trim();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, cleanNum))
    .limit(1);

  if (!order) {
    return NextResponse.json({ success: true, deleted: cleanNum, alreadyDeleted: true });
  }

  // Delete child dependencies first (foreign keys), then the order
  try { await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)); } catch {}
  try { await db.delete(payments).where(eq(payments.orderId, order.id)); } catch {}
  try { await db.delete(invoices).where(eq(invoices.orderId, order.id)); } catch {}
  try { await db.delete(orderItems).where(eq(orderItems.orderId, order.id)); } catch {}
  await db.delete(orders).where(eq(orders.id, order.id));

  // Sync deletion directly to MySQL
  try {
    await deleteOrderFromMysql(cleanNum);
  } catch (err) {
    console.warn("MySQL admin order delete sync notice:", err);
  }

  return NextResponse.json({ success: true, deleted: cleanNum });
}

export const PATCH = PUT;


