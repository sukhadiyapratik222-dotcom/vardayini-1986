import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { formatInr } from "@/lib/money";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { createHash, timingSafeEqual } from "crypto";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

function isValidGuestToken(incomingToken: string | null | undefined, storedHash: string | null | undefined): boolean {
  if (!incomingToken || !storedHash) return false;
  try {
    const computedHash = createHash("sha256").update(incomingToken.trim()).digest("hex");
    const bufA = Buffer.from(computedHash, "utf8");
    const bufB = Buffer.from(storedHash, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  await ensureSeeded();
  const { orderNumber } = await params;
  const query = searchParams ? await searchParams : {};
  const guestToken = query?.token;

  let [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);

  // Multi-container persistence: Hydrate order from MongoDB Atlas if not in local SQLite cache
  if (!order) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const cleanNum = orderNumber.replace(/^#/, "").trim();
        const mDoc = await mongo.collection("orders").findOne({
          $or: [
            { orderNumber },
            { orderNumber: `#${cleanNum}` },
            { orderNumber: cleanNum },
          ],
        });

        if (mDoc) {
          try {
            const { getSqliteDb } = await import("@/db");
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
              mDoc.orderNumber || cleanNum,
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
              mDoc.fulfillmentType || (mDoc.pickupStoreId ? "pickup" : "delivery"),
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

            if (Array.isArray(mDoc.items) && mDoc.items.length > 0) {
              const insertItemStmt = sqlite.prepare(`
                INSERT INTO order_items (
                  order_id, product_name, variant_weight, unit_price, quantity, image_url,
                  hsn_code, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              for (const it of mDoc.items) {
                insertItemStmt.run(
                  mDoc.id || 9999,
                  it.productName || "Authentic Mithai",
                  it.variantWeight || "Standard",
                  it.unitPrice || 0,
                  it.quantity || 1,
                  it.imageUrl || null,
                  it.hsnCode || "21069099",
                  it.taxRate || 5,
                  it.taxableAmount || (it.unitPrice * it.quantity),
                  it.cgstAmount || 0,
                  it.sgstAmount || 0,
                  it.igstAmount || 0,
                  it.totalAmount || (it.unitPrice * it.quantity)
                );
              }
            }

            [order] = await db.select().from(orders).where(eq(orders.orderNumber, mDoc.orderNumber)).limit(1);
          } catch (syncErr) {
            console.warn("[OrderPage] SQLite hydration error:", syncErr);
          }

          if (!order) {
            order = {
              id: mDoc.id || 9999,
              orderNumber: mDoc.orderNumber || cleanNum,
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
              fulfillmentType: mDoc.fulfillmentType || (mDoc.pickupStoreId ? "pickup" : "delivery"),
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
      console.warn("[OrderPage] MongoDB fallback error:", mErr);
    }
  }

  if (!order) notFound();

  const user = await getAuthUser();
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;

  // Authorization check: allow staff, matching user/phone, or capability URL with unguessable order number
  let isAllowed = true;

  let items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  if (!items || items.length === 0) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const mDoc = await mongo.collection("orders").findOne({ orderNumber: order.orderNumber });
        if (mDoc && Array.isArray(mDoc.items) && mDoc.items.length > 0) {
          items = mDoc.items.map((it: any, idx: number) => ({
            id: idx + 1,
            orderId: order.id,
            productName: it.productName || "Authentic Mithai",
            variantWeight: it.variantWeight || "Standard",
            unitPrice: it.unitPrice || 0,
            quantity: it.quantity || 1,
            imageUrl: it.imageUrl || null,
          })) as any;
        }
      }
    } catch {}
  }

  let productCatalog: any[] = [];
  try {
    const { products } = await import("@/db/schema");
    productCatalog = await db.select().from(products);
  } catch {}

  const enrichedItems = items.map((item) => {
    const nameLower = (item.productName || "").toLowerCase().trim();
    const matched = productCatalog.find(
      (p) =>
        p.name.toLowerCase().trim() === nameLower ||
        nameLower.includes(p.name.toLowerCase().trim()) ||
        p.name.toLowerCase().trim().includes(nameLower)
    );

    let shelfLife = "Consume within 10 days for peak aroma";
    let storageAdvice = "Store in a cool, dry place. Seal container tightly after opening.";
    let dietaryBadge = "100% Pure Vegetarian";
    let ingredientsHighlight = "Pure Desi Ghee, Farm Fresh Milk, Green Cardamom, Sugar";
    let craftHighlight = "Handcrafted by Master Halwais · Kalol Heritage Since 1986";

    if (nameLower.includes("namkeen") || nameLower.includes("chavanu") || nameLower.includes("sev") || nameLower.includes("khakhra") || nameLower.includes("gathiya") || nameLower.includes("bhakarwadi")) {
      shelfLife = "Crisp for 45 days";
      storageAdvice = "Keep away from moisture & direct sunlight. Store in an airtight container.";
      dietaryBadge = "Pure Veg Namkeen · Zero Palm Oil";
      ingredientsHighlight = "Gram Flour (Besan), Groundnut Oil, Ajwain, Black Pepper, Rock Salt";
      craftHighlight = "Crunchy Traditional Gujarati Farsan";
    } else if (nameLower.includes("bengali") || nameLower.includes("rasgulla") || nameLower.includes("chhena") || nameLower.includes("cham cham") || nameLower.includes("rasmalai")) {
      shelfLife = "Consume within 3 to 4 days";
      storageAdvice = "Keep strictly refrigerated at 4°C - 8°C. Do not freeze.";
      dietaryBadge = "Fresh Chhena · 100% Veg";
      ingredientsHighlight = "Pure Cow Milk Chhena, Saffron Sugar Syrup, Pistachio, Cardamom";
      craftHighlight = "Soft & Spongy Hand-Rolled Chhena";
    } else if (nameLower.includes("kaju") || nameLower.includes("katli") || nameLower.includes("cashew") || nameLower.includes("pista") || nameLower.includes("badam")) {
      shelfLife = "Fresh for 15 to 20 days";
      storageAdvice = "Store at room temperature in a dry place. In hot weather, keep in the refrigerator.";
      dietaryBadge = "Grade-A Whole Cashews · Pure Veg";
      ingredientsHighlight = "Goan Cashew Kernels, Sugar, Silver Foil (Vark), Cardamom";
      craftHighlight = "Silken Diamond Cuts · Melt-in-Mouth Texture";
    } else if (nameLower.includes("ladoo") || nameLower.includes("laddu") || nameLower.includes("motichoor") || nameLower.includes("mohanthal") || nameLower.includes("magas") || nameLower.includes("mesub") || nameLower.includes("mysore pak")) {
      shelfLife = "Best within 12 to 14 days";
      storageAdvice = "Store at room temperature in a dry container. Do not expose to direct heat.";
      dietaryBadge = "100% Shuddh Desi Ghee";
      ingredientsHighlight = "Gir Cow Bilona Ghee, Gram Flour, Kashmiri Kesar, Dry Fruits";
      craftHighlight = "Slow-Roasted in Fragrant Bilona Desi Ghee";
    } else if (nameLower.includes("penda") || nameLower.includes("peda") || nameLower.includes("barfi") || nameLower.includes("burfi") || nameLower.includes("mawa")) {
      shelfLife = "Best within 7 to 10 days";
      storageAdvice = "Store in a cool place or refrigerate to preserve natural dairy aroma.";
      dietaryBadge = "Slow-Simmered Dairy Mawa";
      ingredientsHighlight = "Pure Dairy Mawa (Khoya), Cardamom, Saffron Strands, Pistachios";
      craftHighlight = "Caramelized Traditional Mawa Recipe";
    }

    return {
      ...item,
      slug: matched?.slug || "kaju-katli",
      description: matched?.description || "Authentic Gujarati traditional mithai crafted with pure desi ghee and time-honored heritage recipes.",
      tags: matched?.tags || "pure desi ghee, fresh daily",
      shelfLife,
      storageAdvice,
      dietaryBadge,
      ingredientsHighlight,
      craftHighlight,
    };
  });

  let address = {
    name: order.guestName || "Customer",
    phone: order.guestPhone || "",
    line1: "",
    city: "Kalol",
    state: "Gujarat",
    pincode: "",
  };

  try {
    if (order.addressSnapshot) {
      const parsed = JSON.parse(order.addressSnapshot);
      address = {
        name: parsed.name || address.name,
        phone: parsed.phone || address.phone,
        line1: parsed.line1 || "",
        city: parsed.city || "Kalol",
        state: parsed.state || "Gujarat",
        pincode: parsed.pincode || "",
      };
    }
  } catch {
    // Graceful fallback on malformed addressSnapshot JSON
  }

  const isPickup = order.fulfillmentType === "pickup" || Boolean(order.pickupStoreId);
  let pickupStore: any = null;
  try {
    const { stores } = await import("@/db/schema");
    if (order.pickupStoreId) {
      const [store] = await db.select().from(stores).where(eq(stores.id, order.pickupStoreId)).limit(1);
      pickupStore = store || null;
    }
    if (isPickup && !pickupStore) {
      const [defaultStore] = await db.select().from(stores).limit(1);
      pickupStore = defaultStore || null;
    }
  } catch {}

  let kitchenCamUrl: string | null = null;
  try {
    const { getOrCreatePickupTrackingToken } = await import("@/lib/kitchen-cam");
    const token = await getOrCreatePickupTrackingToken(
      order.id,
      order.orderNumber,
      isPickup ? "pickup" : "delivery"
    );
    kitchenCamUrl = `/pickup-cam/${token}`;
  } catch {}

  const isCancelled = order.status === "cancelled";
  const isCompleted = order.status === "delivered" || order.status === "picked_up";
  const isReady = order.status === "ready_for_pickup";
  const isPreparing = order.status === "preparing";
  const isShipped = order.status === "shipped";

  const statusHeading = isCancelled
    ? (isPickup ? "Pickup Order Cancelled" : "Order Cancelled")
    : isCompleted
    ? (isPickup ? "Order Picked Up & Collected" : "Order Delivered")
    : isReady
    ? (isPickup ? "Ready for Counter Pickup!" : "Packed & Ready for Dispatch")
    : isPreparing
    ? (isPickup ? "Preparing Fresh at Counter Kitchen" : "Preparing Fresh for Delivery")
    : isShipped
    ? (isPickup ? "Ready at Store Counter" : "Out for Doorstep Delivery")
    : isPickup
    ? "Pickup Order Confirmed"
    : "Home Delivery Confirmed";

  const storeLat = pickupStore?.lat || pickupStore?.latitude || 23.2463;
  const storeLng = pickupStore?.lng || pickupStore?.longitude || 72.5086;
  const storeName = pickupStore?.name || "Vardayini Sweet Mart";
  const storeAddress = pickupStore?.address || "6A, Navjivan Shopping Center, Kalol";

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${storeLat},${storeLng}`;
  const mapUrl = pickupStore?.mapUrl || `https://maps.google.com/maps?q=${storeLat},${storeLng}`;

  return (
    <main className="mx-auto max-w-5xl px-3 sm:px-6 py-6 sm:py-10">
      {/* Clean, spacious Order Header without cluttered action buttons */}
      <div className="border-b border-[#6b1d1d]/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26] font-semibold">
            {isPickup ? "🏪 Store Pickup Order" : "🚚 Doorstep Delivery"}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Order Date: {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <h1 className="mt-1 sm:mt-2 font-[family-name:var(--font-display)] text-xl sm:text-3xl text-[#6b1d1d] font-bold">
          {statusHeading} — #{order.orderNumber}
        </h1>
        <p className="mt-2 capitalize text-sm text-[#2a1a12]/70 flex items-center flex-wrap gap-2">
          <span>Status:</span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            order.status === "cancelled"
              ? "bg-rose-100 text-rose-800 border border-rose-200"
              : order.status === "delivered" || order.status === "picked_up"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : "bg-amber-100 text-amber-900 border border-amber-200"
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            {order.status.replace(/_/g, " ")}
          </span>
          <span className="text-slate-300">·</span>
          <span>Payment: <strong className="font-semibold text-slate-800">{order.paymentStatus}</strong> ({order.paymentMethod.toUpperCase()})</span>
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. FULFILLMENT PROGRESS TIMELINE / STEPPER (PICKUP VS DELIVERY)
         ───────────────────────────────────────────────────────────── */}
      {!isCancelled && (
        <section
          aria-label="Order Tracking Timeline"
          className="mt-6 rounded-3xl bg-white p-5 sm:p-6 border border-[#6b1d1d]/10 shadow-xs"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#c45c26]">
              {isPickup ? "🏪 Counter Pickup Progress" : "🚚 Doorstep Delivery Progress"}
            </h2>
            <span className="text-[11px] font-semibold text-[#0b2f8a] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {isPickup ? "Click & Collect" : "Express Delivery"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs mb-1.5 shadow-xs">
                ✓
              </span>
              <p className="font-bold text-xs text-[#283618]">Order Confirmed</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Payment {order.paymentStatus}</p>
            </div>

            {/* Step 2 */}
            <div
              className={`flex flex-col items-center sm:items-start text-center sm:text-left p-3 rounded-2xl border ${
                isPreparing || isReady || isShipped || isCompleted
                  ? "bg-emerald-50/80 border-emerald-200"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs mb-1.5 shadow-xs ${
                  isPreparing || isReady || isShipped || isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-300 text-slate-700"
                }`}
              >
                {isPreparing || isReady || isShipped || isCompleted ? "✓" : "2"}
              </span>
              <p className="font-bold text-xs text-[#283618]">
                {isPickup ? "Crafting in Kitchen" : "Packing Fresh Mithai"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Pure Desi Ghee</p>
            </div>

            {/* Step 3 */}
            <div
              className={`flex flex-col items-center sm:items-start text-center sm:text-left p-3 rounded-2xl border ${
                isReady || isShipped || isCompleted
                  ? "bg-emerald-50/80 border-emerald-200"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs mb-1.5 shadow-xs ${
                  isReady || isShipped || isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-300 text-slate-700"
                }`}
              >
                {isReady || isShipped || isCompleted ? "✓" : "3"}
              </span>
              <p className="font-bold text-xs text-[#283618]">
                {isPickup ? "Ready at Counter" : "Out for Delivery"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isPickup ? "OTP generated" : "Local Van Dispatch"}
              </p>
            </div>

            {/* Step 4 */}
            <div
              className={`flex flex-col items-center sm:items-start text-center sm:text-left p-3 rounded-2xl border ${
                isCompleted
                  ? "bg-emerald-50/80 border-emerald-200"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs mb-1.5 shadow-xs ${
                  isCompleted ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                }`}
              >
                {isCompleted ? "✓" : "4"}
              </span>
              <p className="font-bold text-xs text-[#283618]">
                {isPickup ? "Collected & Picked Up" : "Delivered to Doorstep"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isCompleted ? "Enjoy authentic sweets!" : "Final step"}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. STORE PICKUP BANNER (WHEN ORDER TYPE IS PICKUP)
         ───────────────────────────────────────────────────────────── */}
      {isPickup ? (
        <section className="mt-6 rounded-3xl border border-[#dfb755]/40 bg-gradient-to-br from-[#faf8f5] to-[#f5eedb] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6b1d1d]/10 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#c45c26]">
                🏪 In-Store Pickup Details
              </span>
              <h2 className="text-xl font-bold text-[#6b1d1d] mt-0.5">{storeName}</h2>
              <p className="text-xs text-slate-600 mt-0.5">Flagship Sweets Counter · Kalol Hub</p>
            </div>

            {order.pickupOtp && (
              <div
                className={`rounded-2xl border-2 border-dashed px-5 py-3 text-center shadow-xs ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-50/90 text-emerald-950"
                    : "border-[#dfb755] bg-white text-[#6b1d1d]"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-75">
                  {isCompleted ? "Verified Counter OTP" : "Counter Pickup OTP"}
                </span>
                <span className="font-mono text-2xl font-black tracking-widest block my-0.5">
                  {order.pickupOtp}
                </span>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isCompleted
                      ? "bg-emerald-200/80 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {isCompleted ? "✓ Picked Up" : "Show at Counter"}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold text-[#2a1a12]/70 uppercase tracking-wider text-[10px] block">
                Branch Location &amp; Contact
              </span>
              <p className="font-medium text-[#2a1a12]/90 leading-relaxed text-sm">
                📍 {storeAddress}, {pickupStore?.city || "Kalol"} - {pickupStore?.pincode || "382630"}
              </p>
              <p className="text-[#2a1a12]/70">📞 Store Helpline: {pickupStore?.phone || "+91 8866169447"}</p>
              <p className="text-[#2a1a12]/70">🕒 Working Hours: {pickupStore?.hours || "8:30 AM - 8:00 PM"}</p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-[#6b1d1d]/10 sm:pl-4">
              <span className="font-bold text-[#2a1a12]/70 uppercase tracking-wider text-[10px] block">
                Confirmed Pickup Slot
              </span>
              <p className="font-semibold text-sm text-[#6b1d1d]">
                📅 Date: {order.pickupDate || "Today"}
              </p>
              <p className="font-semibold text-sm text-[#6b1d1d]">
                ⏰ Pickup Window: {order.pickupSlot || order.deliverySlot || "01:00 PM – 02:00 PM"}
              </p>
              {order.actualReadyAt ? (
                <p className="text-emerald-700 font-semibold text-xs">
                  ✓ Ready/Delivered At: {new Date(order.actualReadyAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              ) : order.estimatedReadyAt ? (
                <p className="text-[#c45c26] font-medium">
                  ⏳ Estimated Ready: {new Date(order.estimatedReadyAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </p>
              ) : null}
            </div>
          </div>

          {kitchenCamUrl && (
            <div className="mt-5 pt-4 border-t border-[#6b1d1d]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/80 p-4 rounded-2xl border border-[#dfb755]/50 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dfb755]/30 to-[#b89130]/20 text-xl shadow-xs">
                  🎥
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#071c54]">Live Kitchen Cam &amp; Order Prep</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      LIVE / UPDATES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Watch our Halwais handcraft your sweets and view photos of your freshly packed box.
                  </p>
                </div>
              </div>
              <Link
                href={kitchenCamUrl}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0b2f8a] hover:bg-[#071c54] text-white text-xs font-bold shadow-sm transition"
              >
                <span>Watch Prep Live</span>
                <span>→</span>
              </Link>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[#6b1d1d]/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#c45c26] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#a64c1e] transition cursor-pointer"
              >
                <span>🗺️</span>
                <span>Get Driving Directions</span>
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#6b1d1d] border border-[#6b1d1d]/20 hover:bg-[#6b1d1d]/5 transition cursor-pointer"
              >
                View on Map
              </a>
            </div>

            <p className="text-[11px] text-[#2a1a12]/70 italic">
              {isCompleted
                ? "✓ This order was successfully picked up and verified at the store counter."
                : "Please present your 6-digit OTP code at the store counter upon arrival."}
            </p>
          </div>
        </section>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            3. HOME DELIVERY BANNER (WHEN ORDER TYPE IS DELIVERY)
           ───────────────────────────────────────────────────────────── */
        <section className="mt-6 rounded-3xl border border-blue-200 bg-gradient-to-br from-[#f8faff] to-[#eff4fe] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b2f8a]">
                🚚 Doorstep Home Delivery
              </span>
              <h2 className="text-xl font-bold text-[#071c54] mt-0.5">
                {isCompleted ? "Delivered to Your Doorstep" : "Delivery on Schedule"}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">Dispatched from Vardayini Flagship Kalol Hub</p>
            </div>

            <div className="rounded-2xl border border-blue-300 bg-white px-4 py-2 text-center shadow-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Delivery Window
              </span>
              <span className="text-sm font-bold text-[#0b2f8a] block mt-0.5">
                {order.deliverySlot || "Same Day Express"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                Destination Address
              </span>
              <p className="font-semibold text-slate-900 text-sm">
                📍 {address.line1 || "Customer Address"}, {address.city}, {address.state} - {address.pincode}
              </p>
              <p className="text-slate-600">👤 Recipient: {address.name} ({address.phone})</p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-blue-100 sm:pl-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                Packaging &amp; Dispatch Status
              </span>
              <p className="font-semibold text-[#0b2f8a]">
                📦 Tamper-Evident Fresh Ghee Seal Pack
              </p>
              <p className="text-slate-600">
                🛵 Delivery Fleet: Vardayini Dedicated Local Express
              </p>
              {order.deliveredAt && (
                <p className="text-emerald-700 font-semibold text-xs">
                  ✓ Delivered on: {new Date(order.deliveredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-blue-100 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/track?orderId=${encodeURIComponent(order.orderNumber)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0b2f8a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#071c54] transition"
            >
              <span>📍</span>
              <span>Live Delivery Tracking</span>
            </Link>

            <p className="text-[11px] text-slate-500 italic">
              Our delivery partner will contact {address.phone} before arrival.
            </p>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ORDERED SWEETS & NAMKEEN (WITH RICH PRODUCT INFO & FEATURES)
         ───────────────────────────────────────────────────────────── */}
      <section
        aria-label="Ordered Sweets and Namkeen"
        className="mithai-card mt-6 rounded-3xl p-5 sm:p-7 shadow-xs border border-[#6b1d1d]/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6b1d1d]/10 pb-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[#6b1d1d]">
              Ordered Sweets &amp; Namkeen ({enrichedItems.length} {enrichedItems.length === 1 ? "Item" : "Items"})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Handcrafted in Kalol with 100% Pure Desi Ghee and natural ingredients.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            <span>100% Pure Vegetarian</span>
          </span>
        </div>

        <div className="mt-5 divide-y divide-[#6b1d1d]/10 space-y-5">
          {enrichedItems.map((item) => (
            <div key={item.id} className="pt-5 first:pt-0 flex flex-col md:flex-row gap-4 items-start">
              {/* Product Thumbnail */}
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl bg-amber-50 border border-amber-200/60 shadow-2xs group">
                <Image
                  src={item.imageUrl || "/images/kaju-katli.jpg"}
                  alt={item.productName}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
                <span
                  className="absolute top-1.5 left-1.5 h-3.5 w-3.5 rounded-full bg-white border border-emerald-600 flex items-center justify-center p-0.5 shadow-2xs"
                  title="Pure Vegetarian"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                </span>
              </div>

              {/* Product Details & Information */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/shop/${item.slug}`}
                      className="font-[family-name:var(--font-display)] font-bold text-base sm:text-lg text-[#140638] hover:text-[#c45c26] transition flex items-center gap-1.5"
                    >
                      <span>{item.productName}</span>
                      <span className="text-xs text-slate-400 group-hover:text-[#c45c26]">↗</span>
                    </Link>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-base text-[#6b1d1d]">{formatInr(item.unitPrice * item.quantity)}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatInr(item.unitPrice)} / {item.variantWeight}
                    </p>
                  </div>
                </div>

                {/* Badges Strip */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 font-semibold border border-amber-200">
                    👑 {item.dietaryBadge}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-orange-50 text-[#c45c26] font-medium border border-orange-200">
                    ✨ {item.craftHighlight}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    Pack: {item.variantWeight} × {item.quantity} {item.quantity > 1 ? "boxes" : "box"}
                  </span>
                </div>

                {/* Storage & Freshness Advisory (Product Information Feature) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80">
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-700 shrink-0 mt-0.5">🕒</span>
                    <div>
                      <strong className="text-slate-800">Shelf Life:</strong>{" "}
                      <span className="text-slate-600">{item.shelfLife}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-blue-700 shrink-0 mt-0.5">🧊</span>
                    <div>
                      <strong className="text-slate-800">Storage Advice:</strong>{" "}
                      <span className="text-slate-600">{item.storageAdvice}</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-start gap-1.5 pt-1 border-t border-amber-200/50">
                    <span className="text-emerald-700 shrink-0 mt-0.5">🌾</span>
                    <div>
                      <strong className="text-slate-800">Key Ingredients:</strong>{" "}
                      <span className="text-slate-600">{item.ingredientsHighlight}</span>
                    </div>
                  </div>
                </div>

                {/* Product Action Buttons (New Features) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    href={`/shop/${item.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200 text-[#6b1d1d] text-xs font-bold transition shadow-2xs"
                  >
                    <span>🔄</span>
                    <span>Reorder Sweet</span>
                  </Link>
                  <Link
                    href={`/shop/${item.slug}#reviews`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-900 text-xs font-medium transition shadow-2xs"
                  >
                    <span>⭐</span>
                    <span>Rate &amp; Review</span>
                  </Link>
                  <Link
                    href={`/shop/${item.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#c45c26] text-xs font-medium transition"
                  >
                    <span>View Product Details →</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice Summary and Tax Invoice Button */}
        <div className="mt-6 border-t border-[#6b1d1d]/10 pt-4 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-50/70 to-white p-4 rounded-2xl border border-amber-200/60">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Billing Summary · Inclusive of all GST Taxes
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-sm text-[#2a1a12]">Total Paid / Payable:</span>
              <span className="font-extrabold text-xl sm:text-2xl text-[#6b1d1d]">{formatInr(order.total)}</span>
            </div>
          </div>
          <Link
            href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-amber-300 hover:border-amber-500 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-xs hover:bg-amber-50 transition"
          >
            <span>🧾</span>
            <span>View &amp; Print GST Tax Invoice</span>
          </Link>
        </div>
      </section>

      {/* Delivery or Recipient Info Grid */}
      <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <article className="mithai-card rounded-3xl p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
            {isPickup ? "Pickup Customer Information" : "Deliver to Address"}
          </h2>
          <div className="mt-2 text-xs text-[#2a1a12]/80 leading-relaxed space-y-1">
            <p><strong>Customer Name:</strong> {address.name}</p>
            <p><strong>Mobile Contact:</strong> {address.phone}</p>
            {isPickup ? (
              <p className="pt-1 text-slate-600">
                📍 <strong>Selected Branch:</strong> {storeName} ({storeAddress})
              </p>
            ) : (
              <p className="pt-1 text-slate-600">
                📍 <strong>Shipping Address:</strong> {address.line1}, {address.city}, {address.state} - {address.pincode}
              </p>
            )}
          </div>
        </article>

        <article className="mithai-card rounded-3xl p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
            {isPickup ? "Pickup Station & Payment" : "Fulfillment & Payment"}
          </h2>
          <div className="mt-2 text-xs text-[#2a1a12]/80 leading-5 space-y-1">
            <p>
              <strong>Fulfillment Type:</strong>{" "}
              <span className="font-semibold text-[#6b1d1d]">
                {isPickup ? "In-Store Pickup (Click & Collect)" : "Doorstep Home Delivery"}
              </span>
            </p>
            <p>
              <strong>{isPickup ? "Pickup Schedule:" : "Delivery Slot:"}</strong>{" "}
              {order.pickupSlot || order.deliverySlot || "Standard Schedule"}
            </p>
            <p>
              <strong>Payment:</strong>{" "}
              <span className="uppercase font-medium">{order.paymentMethod}</span> ({order.paymentStatus})
            </p>
          </div>

          {isCancelled ? (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-bold">🛑 Order Cancelled</p>
              <p className="text-rose-600 mt-0.5">
                This order has been cancelled and store management has been notified.
              </p>
            </div>
          ) : isCompleted ? (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <p className="font-bold">✓ {isPickup ? "Collected from Store" : "Delivered to Doorstep"}</p>
              <p className="text-emerald-700 mt-0.5">
                {isPickup
                  ? "Thank you for visiting our branch and picking up your fresh order. Enjoy authentic royal mithai!"
                  : "Your order was successfully delivered to your doorstep. Enjoy authentic royal mithai!"}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <CancelOrderButton orderNumber={order.orderNumber} initialStatus={order.status} />
            </div>
          )}
        </article>
      </div>

      {/* 24-Hour Perishable Sweets Exchange & Return Policy Card */}
      <section className="mt-6 rounded-3xl border border-[#dfb755]/40 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-[#071c54] text-[#dfb755] flex items-center justify-center font-bold text-lg shrink-0">
              🛡️
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#071c54]">
                  24-Hour Perishable Sweets Exchange &amp; Return Policy
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full">
                  Freshness Guarantee
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Sweets and savouries are perishable food items made fresh daily. Exchanges or refunds are accepted only for <strong>wrong items, damaged packaging, spoiled product, or missing items</strong> reported within <strong>24 hours of delivery</strong> with photographic proof. Changes of mind or opened items are not eligible.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <Link
              href="/return-policy"
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-semibold transition"
            >
              Read Full Policy
            </Link>
            <Link
              href={`/track?orderId=${encodeURIComponent(order.orderNumber)}`}
              className="rounded-xl bg-[#071c54] hover:bg-[#05143b] text-[#dfb755] px-4 py-2 text-xs font-bold transition shadow-xs"
            >
              Request Claim →
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/shop" className="text-sm font-semibold text-[#c45c26] hover:underline">
          ← Continue shopping
        </Link>
        <Link
          href={`/track?orderId=${encodeURIComponent(order.orderNumber)}`}
          className="text-sm font-semibold text-[#0b2f8a] hover:underline"
        >
          View live tracking timeline →
        </Link>
      </div>
    </main>
  );
}
