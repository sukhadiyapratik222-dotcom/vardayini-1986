import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { cartItems, coupons, orderItems, orders, orderStatusHistory, productVariants, products, stores, users } from "@/db/schema";
import { getAuthUser, getCartSessionId, getCouponCode, setCouponCode, requireAdmin } from "@/lib/auth";
import { calcTotals, unitPrice } from "@/lib/money";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, isValidPhone, isValidPincode, AddressSchema } from "@/lib/validation";
import { recordAdminNotification } from "@/lib/notifications";
import { syncOrderToMysql } from "@/lib/mysql";
import { getISTDateString, getStoreSlotsWithAvailability, calculateEstimatedReadyTime, generatePickupOtp } from "@/lib/pickup";
import { verifyOTP } from "@/lib/otp-service";

export const dynamic = "force-dynamic";

function generateOrderNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `VSM-${stamp}-${rand}`;
}

const ALLOWED_SLOTS = new Set([
  "Today, 5:00–7:00 PM",
  "Today, 7:00–9:00 PM",
  "Tomorrow, 10:00 AM–12:00 PM",
  "Tomorrow, 4:00–7:00 PM",
  "Tomorrow, 7:00–9:00 PM",
  "Morning",
  "Afternoon",
  "Evening",
  "Morning (9am - 12pm)",
  "Afternoon (12pm - 4pm)",
  "Evening (4pm - 8pm)",
  "Morning Batch (8:00 AM – 11:30 AM)",
]);

export async function GET(request: Request) {
  await ensureSeeded();
  let user = await getAuthUser(request);

  if (!user) {
    const adminAuth = await requireAdmin(request);
    if (!adminAuth.error && adminAuth.user) {
      user = adminAuth.user;
    }
  }

  if (user && (user.role === "admin" || user.role === "super_admin")) {
    if (user.role === "admin" && user.accessType === "custom" && user.email !== "admin@vardayini.com") {
      const perms = user.permissions || [];
      if (!perms.includes("orders:manage") && !perms.includes("orders:view") && !perms.includes("*")) {
        return Response.json({ error: "Forbidden: Orders Desk access required" }, { status: 403 });
      }
    }
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
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
        storeName: stores.name,
        storeAddress: stores.address,
        storeCity: stores.city,
        storePhone: stores.phone,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(stores, eq(orders.pickupStoreId, stores.id))
      .orderBy(desc(orders.createdAt));

    const enriched = rows.map((r) => {
      let snapshotName = "";
      let snapshotPhone = "";
      if (r.addressSnapshot) {
        try {
          const parsed = typeof r.addressSnapshot === "string" ? JSON.parse(r.addressSnapshot) : r.addressSnapshot;
          snapshotName = parsed?.name || parsed?.fullName || "";
          snapshotPhone = parsed?.phone || "";
        } catch {}
      }
      const finalName = r.userName || r.guestName || snapshotName || "Guest Customer";
      const finalPhone = r.userPhone || r.guestPhone || snapshotPhone || "-";
      return {
        ...r,
        customerName: finalName,
        customerPhone: finalPhone,
        guestName: finalName,
        guestPhone: finalPhone,
      };
    });

    return Response.json({ orders: enriched });
  }

  if (!user) {
    return Response.json({ error: "Please log in." }, { status: 401 });
  }

  try {
    const rows = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
    return Response.json({ orders: rows });
  } catch (err) {
    console.warn("Direct user orders select failed, falling back to explicit fields:", err);
    const rows = await db
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
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));
    return Response.json({ orders: rows });
  }
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getAuthUser();

  const body = await readJsonSafe<Record<string, unknown>>(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawFulfillmentType = typeof body.fulfillmentType === "string" ? body.fulfillmentType.trim().toLowerCase() : "delivery";
  const fulfillmentType = rawFulfillmentType === "pickup" ? "pickup" : "delivery";

  // 1. Validate checkout types before .trim()
  if (body.name !== undefined && typeof body.name !== "string") {
    return Response.json({ error: "Recipient name must be a string." }, { status: 400 });
  }
  if (body.phone !== undefined && typeof body.phone !== "string") {
    return Response.json({ error: "Phone number must be a string." }, { status: 400 });
  }

  // Safe trims after type validation
  const name = (typeof body.name === "string" ? body.name.trim() : (user?.name || "")).trim();
  const phone = (typeof body.phone === "string" ? body.phone.trim() : (user?.phone || "")).trim();
  const rawPaymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod.trim().toLowerCase() : "cod";

  if (!name) {
    return Response.json({ error: "Recipient name is required." }, { status: 400 });
  }

  // 2. Validate phone format
  if (!isValidPhone(phone)) {
    return Response.json({ error: "Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9." }, { status: 400 });
  }

  // 2b. Customer Order Phone OTP Verification
  const orderOtp = typeof body.otp === "string" ? body.otp.trim() : "";
  const orderOtpProof = typeof body.otpProof === "string" ? body.otpProof.trim() : undefined;
  if (orderOtp) {
    const otpVerify = await verifyOTP(phone, orderOtp, "order", orderOtpProof);
    if (!otpVerify.success) {
      return Response.json(
        { error: otpVerify.error || "Invalid or expired order confirmation OTP." },
        { status: 400 }
      );
    }
  } else if (process.env.NODE_ENV === "production" && !user) {
    return Response.json(
      { error: "Customer mobile verification OTP is required to place your order." },
      { status: 400 }
    );
  }

  // Payment method validation
  const ALLOWED_PAYMENT_METHODS = new Set(["cod", "upi"]);
  if (!ALLOWED_PAYMENT_METHODS.has(rawPaymentMethod)) {
    return Response.json(
      { error: `Unknown payment method '${rawPaymentMethod}'. Allowed payment methods are 'cod' and 'upi'.` },
      { status: 400 }
    );
  }
  const paymentMethod = rawPaymentMethod;

  // Variables for delivery vs pickup
  let line1 = "";
  let city = "Vadodara";
  let state = "Gujarat";
  let pincode = "390001";
  let deliverySlot = "";
  let pickupStore: any = null;
  let pickupDate = "";
  let pickupSlot = "";

  if (fulfillmentType === "pickup") {
    const rawStoreId = body.pickupStoreId !== undefined ? body.pickupStoreId : body.storeId;
    const storeId = parseInt(String(rawStoreId), 10);
    if (isNaN(storeId) || storeId <= 0) {
      return Response.json({ error: "Please select a valid pickup store branch." }, { status: 400 });
    }

    const [foundStore] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!foundStore) {
      return Response.json({ error: "Selected pickup store was not found." }, { status: 400 });
    }
    if (foundStore.isActive === false || (foundStore.isActive as any) === 0) {
      return Response.json({ error: "Selected store branch is currently closed or inactive." }, { status: 400 });
    }
    if (foundStore.pickupEnabled === false || (foundStore.pickupEnabled as any) === 0) {
      return Response.json({ error: "Store pickup is currently disabled for this branch." }, { status: 400 });
    }
    pickupStore = foundStore;

    if (typeof body.pickupDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.pickupDate.trim())) {
      return Response.json({ error: "Please select a valid pickup date (YYYY-MM-DD)." }, { status: 400 });
    }
    pickupDate = body.pickupDate.trim();
    const todayIST = getISTDateString();
    if (pickupDate < todayIST) {
      return Response.json({ error: "Pickup date cannot be in the past." }, { status: 400 });
    }

    if (typeof body.pickupSlot !== "string" || !body.pickupSlot.trim()) {
      return Response.json({ error: "Please select a valid pickup time slot." }, { status: 400 });
    }
    pickupSlot = body.pickupSlot.trim();

    // Check holiday and slot availability
    const slotAvailability = getStoreSlotsWithAvailability({ store: pickupStore, dateStr: pickupDate });
    if (slotAvailability.isHoliday) {
      return Response.json(
        { error: slotAvailability.holidayMessage || "Selected branch is closed on this date (Holiday)." },
        { status: 400 }
      );
    }
    const matchedSlot = slotAvailability.slots.find(
      (s) => s.slot.toLowerCase() === pickupSlot.toLowerCase()
    );
    if (!matchedSlot) {
      return Response.json({ error: "Selected pickup slot is not valid for this branch." }, { status: 400 });
    }
    if (!matchedSlot.isAvailable) {
      return Response.json(
        { error: matchedSlot.unavailabilityReason || "Selected pickup slot is not available." },
        { status: 400 }
      );
    }
    pickupSlot = matchedSlot.slot;
    deliverySlot = pickupSlot;
    city = pickupStore.city;
    pincode = pickupStore.pincode;
    line1 = pickupStore.address;
  } else {
    // Delivery fulfillment
    if (body.line1 !== undefined && typeof body.line1 !== "string") {
      return Response.json({ error: "Address line 1 must be a string." }, { status: 400 });
    }
    if (body.city !== undefined && typeof body.city !== "string") {
      return Response.json({ error: "City must be a string." }, { status: 400 });
    }
    if (body.state !== undefined && typeof body.state !== "string") {
      return Response.json({ error: "State must be a string." }, { status: 400 });
    }
    if (body.pincode !== undefined && typeof body.pincode !== "string") {
      return Response.json({ error: "Pincode must be a string." }, { status: 400 });
    }
    if (body.deliverySlot !== undefined && typeof body.deliverySlot !== "string") {
      return Response.json({ error: "Delivery slot must be a string." }, { status: 400 });
    }

    if (!user && (typeof body.name !== "string" || typeof body.phone !== "string")) {
      return Response.json({ error: "Guest checkout requires recipient name and phone number." }, { status: 400 });
    }
    if (typeof body.line1 !== "string" || typeof body.pincode !== "string") {
      return Response.json({ error: "Delivery address line1 and pincode are required." }, { status: 400 });
    }
    if (typeof body.deliverySlot !== "string") {
      return Response.json({ error: "Delivery slot is required." }, { status: 400 });
    }

    line1 = body.line1.trim();
    city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Vadodara";
    state = typeof body.state === "string" && body.state.trim() ? body.state.trim() : "Gujarat";
    pincode = body.pincode.trim();
    deliverySlot = body.deliverySlot.trim();

    if (!isValidPincode(pincode)) {
      return Response.json({ error: "Please enter a valid 6-digit Indian pincode." }, { status: 400 });
    }

    const addressValidation = AddressSchema.safeParse({
      fullName: name,
      phone,
      line1,
      city,
      state,
      pincode,
      country: "India",
    });
    if (!addressValidation.success) {
      const issues = addressValidation.error.issues;
      return Response.json({ error: issues[0]?.message || "Invalid delivery address details." }, { status: 400 });
    }

    if (!ALLOWED_SLOTS.has(deliverySlot)) {
      return Response.json({ error: "Please select a valid fresh delivery slot." }, { status: 400 });
    }
  }

  const sessionId = await getCartSessionId();
  const guestSessionId = user ? null : sessionId;
  const rawGuestToken = !user ? randomBytes(24).toString("hex") : null;
  const guestTokenHash = rawGuestToken ? createHash("sha256").update(rawGuestToken).digest("hex") : null;

  const matchCondition = user
    ? or(eq(cartItems.userId, user.id), eq(cartItems.sessionId, sessionId))
    : eq(cartItems.sessionId, sessionId);

  let createdOrder: any = null;
  let createdLines: Array<{
    name: string;
    weight: string;
    unit: number;
    quantity: number;
    imageUrl: string;
  }> = [];
  let attempts = 0;
  const MAX_RETRIES = 5;

  // Bounded retries for order-number unique-constraint collisions
  while (attempts < MAX_RETRIES) {
    attempts++;
    const orderNum = generateOrderNumber();

    try {
      createdOrder = await db.transaction(async (tx) => {
        // Step 1: Claim cart rows
        const claimedRows = await tx
          .select()
          .from(cartItems)
          .where(matchCondition);

        if (!claimedRows || claimedRows.length === 0) {
          const emptyErr: any = new Error("Your cart is empty or already claimed.");
          emptyErr.status = 400;
          throw emptyErr;
        }

        await tx.delete(cartItems).where(matchCondition);

        // Step 2: Fetch variants and products for the claimed rows
        const variantIds = Array.from(new Set(claimedRows.map((r) => r.variantId)));
        const variantsData = await tx
          .select({
            id: productVariants.id,
            productId: products.id,
            productName: products.name,
            weight: productVariants.weight,
            price: productVariants.price,
            discountedPrice: productVariants.discountedPrice,
            stock: productVariants.stock,
            imageUrl: products.imageUrl,
          })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(inArray(productVariants.id, variantIds));

        const variantMap = new Map(variantsData.map((v) => [v.id, v]));

        // Aggregate quantities per variantId
        const aggregatedQty = new Map<number, number>();
        for (const row of claimedRows) {
          const v = variantMap.get(row.variantId);
          if (!v) {
            const missingErr: any = new Error(`Product variant ${row.variantId} not found`);
            missingErr.status = 400;
            throw missingErr;
          }
          aggregatedQty.set(row.variantId, (aggregatedQty.get(row.variantId) || 0) + row.quantity);
        }

        // Step 3: Conditional stock decrement (stock = stock - qty WHERE stock >= qty)
        for (const [vId, totalQty] of aggregatedQty.entries()) {
          const [updatedRes] = await tx
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} - ${totalQty}` })
            .where(
              and(
                eq(productVariants.id, vId),
                sql`${productVariants.stock} >= ${totalQty}`
              )
            );

          if (!updatedRes || updatedRes.affectedRows === 0) {
            const v = variantMap.get(vId);
            const oosErr: any = new Error(`Insufficient stock for ${v?.productName || "item"}`);
            oosErr.status = 400;
            throw oosErr;
          }
        }

        // Step 4: Calculate line totals & subtotal
        const lines = claimedRows.map((row) => {
          const v = variantMap.get(row.variantId)!;
          const unit = unitPrice(v.price, v.discountedPrice);
          return {
            variantId: row.variantId,
            name: v.productName,
            weight: v.weight,
            unit,
            quantity: row.quantity,
            imageUrl: v.imageUrl,
            lineTotal: unit * row.quantity,
          };
        });

        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

        // Step 5: Persist coupon codes only when currently eligible
        let appliedCouponCode: string | null = null;
        let discount = 0;
        let freeDelivery = false;

        const couponCodeFromCookie = await getCouponCode();
        if (couponCodeFromCookie) {
          const [coupon] = await tx
            .select()
            .from(coupons)
            .where(eq(coupons.code, couponCodeFromCookie.toUpperCase()))
            .limit(1);

          if (coupon && coupon.active && subtotal >= coupon.minOrder) {
            appliedCouponCode = coupon.code;
            if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
            if (coupon.type === "flat") discount = coupon.value;
            if (coupon.type === "free_delivery") freeDelivery = true;
          }
        }

        const totals = calcTotals(subtotal, discount, freeDelivery);
        const effectiveDeliveryFee = fulfillmentType === "pickup" ? 0 : totals.deliveryFee;
        const finalTotal = totals.subtotal - totals.discount + totals.tax + effectiveDeliveryFee;

        // Step 5b: If Store Pickup, atomically verify slot capacity and calculate estimated ready time + OTP
        let pickupOtp: string | null = null;
        let estimatedReadyAt: Date | null = null;

        if (fulfillmentType === "pickup" && pickupStore) {
          const bookedCountResult = await tx
            .select({ count: sql<number>`count(*)` })
            .from(orders)
            .where(
              and(
                eq(orders.pickupStoreId, pickupStore.id),
                eq(orders.pickupDate, pickupDate),
                eq(orders.pickupSlot, pickupSlot),
                ne(orders.status, "cancelled")
              )
            );
          const currentBookings = Number(bookedCountResult[0]?.count || 0);
          const storeCapacity = Number(pickupStore.slotCapacity ?? 5);
          if (currentBookings >= storeCapacity) {
            const capErr: any = new Error(
              `Slot "${pickupSlot}" on ${pickupDate} at ${pickupStore.name} has just reached maximum capacity (${storeCapacity} orders). Please choose another slot.`
            );
            capErr.status = 400;
            throw capErr;
          }

          const readyEst = calculateEstimatedReadyTime({
            store: pickupStore,
            pickupDateStr: pickupDate,
            pickupSlot: pickupSlot,
          });
          estimatedReadyAt = new Date(readyEst.estimatedReadyAtISO);
          pickupOtp = generatePickupOtp();
        }

        // Step 6: Insert order
        const [insertOrdRes] = await tx
          .insert(orders)
          .values({
            orderNumber: orderNum,
            userId: user?.id ?? null,
            guestName: name || user?.name || null,
            guestPhone: phone || user?.phone || null,
            sessionId: guestSessionId,
            guestTokenHash,
            status: "confirmed",
            subtotal: totals.subtotal,
            discount: totals.discount,
            deliveryFee: effectiveDeliveryFee,
            tax: totals.tax,
            total: finalTotal,
            couponCode: appliedCouponCode,
            addressSnapshot: JSON.stringify({
              name,
              phone,
              line1,
              city,
              state,
              pincode,
              sessionId: guestSessionId,
            }),
            deliverySlot,
            fulfillmentType,
            pickupStoreId: pickupStore ? pickupStore.id : null,
            pickupDate: pickupDate || null,
            pickupSlot: pickupSlot || null,
            estimatedReadyAt,
            actualReadyAt: null,
            pickupOtp,
            pickupVerifiedBy: null,
            paymentMethod,
            paymentStatus: "pending",
          });

        const ord = {
          id: insertOrdRes.insertId,
          orderNumber: orderNum,
          userId: user?.id ?? null,
          guestName: name || user?.name || null,
          guestPhone: phone || user?.phone || null,
          sessionId: guestSessionId,
          guestTokenHash,
          status: "confirmed",
          subtotal: totals.subtotal,
          discount: totals.discount,
          deliveryFee: effectiveDeliveryFee,
          tax: totals.tax,
          total: finalTotal,
          couponCode: appliedCouponCode,
          addressSnapshot: JSON.stringify({
            name,
            phone,
            line1,
            city,
            state,
            pincode,
            sessionId: guestSessionId,
          }),
          deliverySlot,
          fulfillmentType,
          pickupStoreId: pickupStore ? pickupStore.id : null,
          pickupDate: pickupDate || null,
          pickupSlot: pickupSlot || null,
          estimatedReadyAt,
          actualReadyAt: null,
          pickupOtp,
          pickupVerifiedBy: null,
          paymentMethod,
          paymentStatus: "pending",
          createdAt: new Date(),
        };

        // Step 6b: Record initial status in orderStatusHistory
        await tx.insert(orderStatusHistory).values({
          orderId: ord.id,
          status: "confirmed",
          changedBy: user?.name ? `User #${user.id}` : "Customer",
          note: fulfillmentType === "pickup"
            ? `Order confirmed for store pickup at ${pickupStore.name} on ${pickupDate} (${pickupSlot}). Verification OTP: ${pickupOtp}`
            : `Order confirmed for fresh home delivery (${deliverySlot}).`,
        });

        // Step 7: Insert order items with variantId & tax breakdown
        await tx.insert(orderItems).values(
          lines.map((line) => {
            const qty = line.quantity || 1;
            const unit = line.unit || 0;
            const lineTotal = unit * qty;
            const taxRate = 5;
            const taxable = Math.round(lineTotal / (1 + taxRate / 100));
            const totalTax = lineTotal - taxable;
            const halfTax = (totalTax / 2).toFixed(2);

            return {
              orderId: ord.id,
              variantId: line.variantId,
              productName: line.name,
              variantWeight: line.weight,
              unitPrice: unit,
              quantity: qty,
              imageUrl: line.imageUrl || "",
              hsnCode: "21069099",
              taxRate: taxRate,
              taxableAmount: taxable,
              cgstAmount: halfTax,
              sgstAmount: halfTax,
              igstAmount: "0.00",
              totalAmount: lineTotal,
            };
          })
        );

        createdLines = lines;
        return ord;
      });

      break;
    } catch (err: any) {
      if (err?.code === "23505" || String(err?.message).includes("unique")) {
        continue;
      }
      return Response.json(
        { error: err instanceof Error ? err.message : "Checkout error" },
        { status: err?.status || 400 }
      );
    }
  }

  if (!createdOrder) {
    return Response.json({ error: "Could not create order with unique number after retries" }, { status: 500 });
  }

  await setCouponCode(null);

  // Record Admin Notification
  try {
    const isPickup = fulfillmentType === "pickup";
    const fulfillmentSummary = isPickup
      ? `🏪 Store Pickup: ${pickupStore?.name || "Store"} (${pickupDate}, slot ${pickupSlot})`
      : `🚚 Fresh Delivery: ${deliverySlot}`;

    await recordAdminNotification({
      type: "order_created",
      title: isPickup
        ? `New Pickup Order #${createdOrder.orderNumber}! 🏪`
        : `New Delivery Order #${createdOrder.orderNumber}! 🛍️`,
      message: `${name} placed an order of ₹${createdOrder.total} (${fulfillmentSummary}, ${paymentMethod.toUpperCase()}).`,
      data: {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        customerName: name,
        customerPhone: phone,
        total: createdOrder.total,
        fulfillmentType,
        pickupStoreId: createdOrder.pickupStoreId,
        pickupDate: createdOrder.pickupDate,
        pickupSlot: createdOrder.pickupSlot,
        pickupOtp: createdOrder.pickupOtp,
        deliverySlot,
        paymentMethod,
      },
    });
  } catch (err) {
    console.error("Failed to notify admin of new order:", err);
  }

  // Maintain Real Transactional Email & SMS Logs in Database for Reports
  try {
    const custName = name || user?.name || "Customer";
    const custEmail = user?.email || (name ? `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com` : "customer@vardayini.com");
    const custPhone = phone || user?.phone || "+91 98250 19760";

    const { getSqliteDb } = await import("@/db");
    const sqlite = getSqliteDb();

    const isPickup = fulfillmentType === "pickup";
    const emailSubject = isPickup
      ? `Vardayini Sweet Mart · Pickup Order ${createdOrder.orderNumber} Confirmed (${pickupStore?.name})`
      : `Vardayini Sweet Mart · Order ${createdOrder.orderNumber} Confirmed`;

    const smsMessage = isPickup
      ? `Namaste ${custName}, your Vardayini Sweets pickup order ${createdOrder.orderNumber} (₹${createdOrder.total}) is confirmed! Ready at ${pickupStore?.name} on ${pickupDate} (${pickupSlot}). Counter OTP: ${createdOrder.pickupOtp}`
      : `Namaste ${custName}, your Vardayini Sweets order ${createdOrder.orderNumber} (₹${createdOrder.total}) is confirmed. 100% Shuddh Desi Ghee.`;

    sqlite.prepare(`
      INSERT INTO email_logs (order_id, order_number, recipient_name, recipient_email, subject, template_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      createdOrder.id,
      createdOrder.orderNumber,
      custName,
      custEmail,
      emailSubject,
      isPickup ? "PICKUP_CONFIRMATION" : "ORDER_CONFIRMATION",
      "Delivered"
    );

    sqlite.prepare(`
      INSERT INTO sms_logs (order_id, order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      createdOrder.id,
      createdOrder.orderNumber,
      custPhone,
      custName,
      smsMessage,
      "VRDYNI",
      "Delivered"
    );
  } catch (logErr) {
    console.warn("[Orders API] Reports auto-log error:", logErr);
  }

  // Synchronize order to MySQL (phpMyAdmin) with line items
  try {
    await syncOrderToMysql(
      {
        orderNumber: createdOrder.orderNumber,
        userId: createdOrder.userId,
        guestName: createdOrder.guestName,
        guestPhone: createdOrder.guestPhone,
        status: createdOrder.status,
        subtotal: createdOrder.subtotal,
        discount: createdOrder.discount,
        deliveryFee: createdOrder.deliveryFee,
        tax: createdOrder.tax,
        total: createdOrder.total,
        couponCode: createdOrder.couponCode,
        addressSnapshot: createdOrder.addressSnapshot,
        deliverySlot: createdOrder.deliverySlot,
        paymentMethod: createdOrder.paymentMethod,
        paymentStatus: createdOrder.paymentStatus,
      },
      createdLines.map((l) => ({
        productName: l.name,
        variantWeight: l.weight,
        unitPrice: l.unit,
        quantity: l.quantity,
        imageUrl: l.imageUrl,
      }))
    );
  } catch (err) {
    console.warn("MySQL order sync error:", err);
  }

  const { guestTokenHash: _discardHash, ...orderWithoutHash } = createdOrder;
  return Response.json({
    order: orderWithoutHash,
    ...(rawGuestToken ? { guestToken: rawGuestToken } : {}),
  });
}
