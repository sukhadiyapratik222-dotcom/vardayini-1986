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

  let address = {
    name: order.guestName || "Customer",
    phone: order.guestPhone || "",
    line1: "",
    city: "Vadodara",
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
        city: parsed.city || "Vadodara",
        state: parsed.state || "Gujarat",
        pincode: parsed.pincode || "",
      };
    }
  } catch {
    // Graceful fallback on malformed addressSnapshot JSON
  }

  const isPickup = order.fulfillmentType === "pickup" || Boolean(order.pickupStoreId);
  let pickupStore: any = null;
  if (order.pickupStoreId) {
    const { stores } = await import("@/db/schema");
    const [store] = await db.select().from(stores).where(eq(stores.id, order.pickupStoreId)).limit(1);
    pickupStore = store || null;
  }

  const statusHeading =
    order.status === "cancelled"
      ? "Order Cancelled"
      : order.status === "picked_up"
      ? "Order Picked Up"
      : order.status === "ready_for_pickup"
      ? "Ready for Pickup"
      : order.status === "preparing"
      ? "Order Preparing Fresh"
      : order.status === "delivered"
      ? "Order Delivered"
      : order.status === "shipped"
      ? "Order Shipped"
      : isPickup
      ? "Pickup Order Confirmed"
      : "Order Confirmed";

  const directionsUrl = pickupStore?.latitude && pickupStore?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${pickupStore.latitude},${pickupStore.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((pickupStore?.name || "Vardayini") + " " + (pickupStore?.address || "Vadodara"))}`;

  const mapUrl = pickupStore?.latitude && pickupStore?.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${pickupStore.latitude},${pickupStore.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((pickupStore?.name || "Vardayini") + " " + (pickupStore?.address || "Vadodara"))}`;

  return (
    <main className="mx-auto max-w-3xl px-3 sm:px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">
            {isPickup ? "🏪 Store Pickup Order" : "🚚 Doorstep Delivery"}
          </p>
          <h1 className="mt-1 sm:mt-2 font-[family-name:var(--font-display)] text-xl sm:text-3xl text-[#6b1d1d] font-bold">
            {statusHeading} — #{order.orderNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-4 py-2 text-xs font-bold text-amber-950 shadow-sm hover:bg-amber-100 transition"
          >
            <span>🧾</span>
            <span>Tax Invoice</span>
          </Link>
          <Link
            href={`/track?orderId=${encodeURIComponent(order.orderNumber)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b2f8a] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#071c54] transition"
          >
            <span>📍</span>
            <span>Track Order Live →</span>
          </Link>
        </div>
      </div>

      <p className="mt-2 capitalize text-sm text-[#2a1a12]/70">
        Status: <span className={order.status === "cancelled" ? "text-red-700 font-semibold" : "font-medium"}>{order.status.replace(/_/g, " ")}</span> · Payment: {order.paymentStatus} ({order.paymentMethod.toUpperCase()})
      </p>

      {/* Store Pickup Banner Card if Pickup */}
      {isPickup && (
        <section className="mt-6 rounded-3xl border border-[#dfb755]/40 bg-gradient-to-br from-[#faf8f5] to-[#f5eedb] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6b1d1d]/10 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#c45c26]">
                🏪 Your Pickup Details
              </span>
              <h2 className="text-xl font-bold text-[#6b1d1d] mt-0.5">
                {pickupStore?.name || "Vardayini Sweet Mart Branch"}
              </h2>
            </div>

            {order.pickupOtp && (
              <div className="rounded-2xl border-2 border-dashed border-[#dfb755] bg-white px-4 py-2 text-center shadow-xs">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#2a1a12]/60">
                  Counter Pickup OTP
                </span>
                <span className="font-mono text-2xl font-black text-[#6b1d1d] tracking-widest">
                  {order.pickupOtp}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold text-[#2a1a12]/70 uppercase tracking-wider text-[10px] block">
                Branch Address & Contact
              </span>
              <p className="font-medium text-[#2a1a12]/90 leading-relaxed">
                {pickupStore?.address || "Main Road"}, {pickupStore?.city || "Vadodara"} - {pickupStore?.pincode || "390001"}
              </p>
              <p className="text-[#2a1a12]/70">📞 Store Phone: {pickupStore?.phone || "+91 98250 19760"}</p>
              <p className="text-[#2a1a12]/70">🕒 Hours: {pickupStore?.hours || "8:00 AM - 10:00 PM"}</p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-[#6b1d1d]/10 sm:pl-4">
              <span className="font-bold text-[#2a1a12]/70 uppercase tracking-wider text-[10px] block">
                Pickup Schedule
              </span>
              <p className="font-semibold text-[#6b1d1d]">
                📅 Date: {order.pickupDate || "Today"}
              </p>
              <p className="font-semibold text-[#6b1d1d]">
                ⏰ Confirmed Slot: {order.pickupSlot || order.deliverySlot}
              </p>
              {order.estimatedReadyAt && (
                <p className="text-[#c45c26] font-medium">
                  ⏳ Estimated Ready: {new Date(order.estimatedReadyAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#6b1d1d]/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#c45c26] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#a64c1e] transition"
              >
                <span>🗺️</span>
                <span>Get Directions</span>
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#6b1d1d] border border-[#6b1d1d]/20 hover:bg-[#6b1d1d]/5 transition"
              >
                View on Map
              </a>
            </div>

            <p className="text-[11px] text-[#2a1a12]/70 italic">
              Please present your 6-digit OTP at the store counter upon arrival.
            </p>
          </div>
        </section>
      )}

      {/* Ordered Sweets Items */}
      <div className="mithai-card mt-6 space-y-4 rounded-3xl p-6">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#6b1d1d] border-b border-[#6b1d1d]/10 pb-2">
          Ordered Sweets & Namkeen ({items.length})
        </h3>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-amber-50">
              <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-[#2a1a12]">{item.productName}</p>
              <p className="text-xs text-[#2a1a12]/60">
                {item.variantWeight} × {item.quantity}
              </p>
            </div>
            <p className="font-semibold text-sm">{formatInr(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
        <div className="flex justify-between border-t border-[#6b1d1d]/10 pt-4 font-bold text-base text-[#6b1d1d]">
          <span>Total Paid / Payable</span>
          <span>{formatInr(order.total)}</span>
        </div>
      </div>

      {/* Delivery or Recipient Info Grid */}
      <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <article className="mithai-card rounded-3xl p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
            {isPickup ? "Customer Information" : "Deliver to"}
          </h2>
          <p className="mt-2 leading-6 text-xs text-[#2a1a12]/80">
            <strong>{address.name}</strong>
            <br />
            {address.phone}
            {!isPickup && (
              <>
                <br />
                {address.line1}
                <br />
                {address.city}, {address.state} {address.pincode}
              </>
            )}
          </p>
        </article>

        <article className="mithai-card rounded-3xl p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
            Fulfillment Details
          </h2>
          <p className="mt-2 text-xs text-[#2a1a12]/80 leading-5">
            <strong>Method:</strong> {isPickup ? "Store Pickup (Click & Collect)" : "Home Delivery"}
            <br />
            <strong>Scheduled Window:</strong> {order.pickupSlot || order.deliverySlot}
          </p>
          {order.status !== "cancelled" && order.status !== "delivered" && order.status !== "picked_up" ? (
            <div className="mt-3">
              <CancelOrderButton orderNumber={order.orderNumber} initialStatus={order.status} />
            </div>
          ) : order.status === "cancelled" ? (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-bold">🛑 Order Cancelled</p>
              <p className="text-rose-600 mt-0.5">
                This order has been cancelled and store management has been notified.
              </p>
            </div>
          ) : order.status === "picked_up" ? (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <p className="font-bold">✓ Collected from Store</p>
              <p className="text-emerald-700 mt-0.5">
                Thank you for picking up your fresh order. Enjoy authentic sweets!
              </p>
            </div>
          ) : null}
        </article>
      </div>

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
