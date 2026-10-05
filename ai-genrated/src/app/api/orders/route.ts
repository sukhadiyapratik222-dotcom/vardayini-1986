import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { cartItems, coupons, orderItems, orders, productVariants, products } from "@/db/schema";
import { getAuthUser, getCartSessionId, getCouponCode, setCouponCode, requireAdmin } from "@/lib/auth";
import { calcTotals, unitPrice } from "@/lib/money";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, isValidPhone, isValidPincode, AddressSchema } from "@/lib/validation";
import { recordAdminNotification } from "@/lib/notifications";

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

  if (user && user.role === "admin") {
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
      .orderBy(desc(orders.createdAt));
    return Response.json({ orders: rows });
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

  // 1. Validate checkout types before .trim()
  if (body.name !== undefined && typeof body.name !== "string") {
    return Response.json({ error: "Recipient name must be a string." }, { status: 400 });
  }
  if (body.phone !== undefined && typeof body.phone !== "string") {
    return Response.json({ error: "Phone number must be a string." }, { status: 400 });
  }
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
  if (body.paymentMethod !== undefined && typeof body.paymentMethod !== "string") {
    return Response.json({ error: "Payment method must be a string." }, { status: 400 });
  }

  // Required field checks
  if (!user && (typeof body.name !== "string" || typeof body.phone !== "string")) {
    return Response.json({ error: "Guest checkout requires recipient name and phone number." }, { status: 400 });
  }
  if (typeof body.line1 !== "string" || typeof body.pincode !== "string") {
    return Response.json({ error: "Delivery address line1 and pincode are required." }, { status: 400 });
  }
  if (typeof body.deliverySlot !== "string") {
    return Response.json({ error: "Delivery slot is required." }, { status: 400 });
  }

  // Safe trims after type validation
  const name = (typeof body.name === "string" ? body.name.trim() : (user?.name || "")).trim();
  const phone = (typeof body.phone === "string" ? body.phone.trim() : (user?.phone || "")).trim();
  const line1 = body.line1.trim();
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Vadodara";
  const state = typeof body.state === "string" && body.state.trim() ? body.state.trim() : "Gujarat";
  const pincode = body.pincode.trim();
  const deliverySlot = body.deliverySlot.trim();
  const rawPaymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod.trim().toLowerCase() : "cod";

  if (!name) {
    return Response.json({ error: "Recipient name is required." }, { status: 400 });
  }

  // 2. Validate phone and pincode formats
  if (!isValidPhone(phone)) {
    return Response.json({ error: "Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9." }, { status: 400 });
  }
  if (!isValidPincode(pincode)) {
    return Response.json({ error: "Please enter a valid 6-digit Indian pincode." }, { status: 400 });
  }

  // Address Schema Validation
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

  // 3. Allow only known delivery slots
  if (!ALLOWED_SLOTS.has(deliverySlot)) {
    return Response.json({ error: "Please select a valid fresh delivery slot." }, { status: 400 });
  }

  // 4. Return 400 for unknown payment methods instead of converting to COD
  const ALLOWED_PAYMENT_METHODS = new Set(["cod", "upi"]);
  if (!ALLOWED_PAYMENT_METHODS.has(rawPaymentMethod)) {
    return Response.json(
      { error: `Unknown payment method '${rawPaymentMethod}'. Allowed payment methods are 'cod' and 'upi'.` },
      { status: 400 }
    );
  }
  const paymentMethod = rawPaymentMethod;

  const sessionId = await getCartSessionId();
  const guestSessionId = user ? null : sessionId;
  const rawGuestToken = !user ? randomBytes(24).toString("hex") : null;
  const guestTokenHash = rawGuestToken ? createHash("sha256").update(rawGuestToken).digest("hex") : null;

  const matchCondition = user
    ? or(eq(cartItems.userId, user.id), eq(cartItems.sessionId, sessionId))
    : eq(cartItems.sessionId, sessionId);

  let createdOrder: any = null;
  let attempts = 0;
  const MAX_RETRIES = 5;

  // Bounded retries for order-number unique-constraint collisions
  while (attempts < MAX_RETRIES) {
    attempts++;
    const orderNum = generateOrderNumber();

    try {
      createdOrder = await db.transaction(async (tx) => {
        // Step 1: Claim cart rows first by deleting with RETURNING (single transaction)
        const claimedRows = await tx
          .delete(cartItems)
          .where(matchCondition)
          .returning();

        if (!claimedRows || claimedRows.length === 0) {
          const emptyErr: any = new Error("Your cart is empty or already claimed.");
          emptyErr.status = 400;
          throw emptyErr;
        }

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
          const [updatedVariant] = await tx
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} - ${totalQty}` })
            .where(
              and(
                eq(productVariants.id, vId),
                sql`${productVariants.stock} >= ${totalQty}`
              )
            )
            .returning();

          if (!updatedVariant) {
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

        // Step 6: Insert order
        const [ord] = await tx
          .insert(orders)
          .values({
            orderNumber: orderNum,
            userId: user?.id ?? null,
            guestName: user ? null : name,
            guestPhone: user ? null : phone,
            sessionId: guestSessionId,
            guestTokenHash,
            status: "confirmed",
            subtotal: totals.subtotal,
            discount: totals.discount,
            deliveryFee: totals.deliveryFee,
            tax: totals.tax,
            total: totals.total,
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
            paymentMethod,
            paymentStatus: "pending",
          })
          .returning();

        // Step 7: Insert order items with variantId
        await tx.insert(orderItems).values(
          lines.map((line) => ({
            orderId: ord.id,
            variantId: line.variantId,
            productName: line.name,
            variantWeight: line.weight,
            unitPrice: line.unit,
            quantity: line.quantity,
            imageUrl: line.imageUrl,
          }))
        );

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
    await recordAdminNotification({
      type: "order_created",
      title: `New Order #${createdOrder.orderNumber}! 🛍️`,
      message: `${name} placed an order of ₹${createdOrder.total} (${deliverySlot}, ${paymentMethod.toUpperCase()}).`,
      data: {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        customerName: name,
        customerPhone: phone,
        total: createdOrder.total,
        deliverySlot,
        paymentMethod,
      },
    });
  } catch (err) {
    console.error("Failed to notify admin of new order:", err);
  }

  const { guestTokenHash: _discardHash, ...orderWithoutHash } = createdOrder;
  return Response.json({
    order: orderWithoutHash,
    ...(rawGuestToken ? { guestToken: rawGuestToken } : {}),
  });
}
