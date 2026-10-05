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
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) notFound();

  const user = await getAuthUser();
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;

  let isAllowed = false;
  if (user?.role === "admin") {
    isAllowed = true;
  } else if (order.userId) {
    if (user?.id === order.userId) {
      isAllowed = true;
    }
  } else {
    // Guest order: timing-safe token validation or legacy session match
    let orderSession = order.sessionId;
    if (!orderSession && order.addressSnapshot) {
      try {
        const snap = JSON.parse(order.addressSnapshot);
        orderSession = snap.sessionId;
      } catch {}
    }

    if (order.guestTokenHash) {
      if (isValidGuestToken(guestToken, order.guestTokenHash)) {
        isAllowed = true;
      }
    } else if (guestCartId && orderSession && guestCartId === orderSession) {
      isAllowed = true;
    }
  }

  if (!isAllowed) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

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

  const statusHeading =
    order.status === "cancelled"
      ? "Order Cancelled"
      : order.status === "delivered"
      ? "Order Delivered"
      : order.status === "shipped"
      ? "Order Shipped"
      : order.status === "confirmed"
      ? "Order Confirmed"
      : "Order Placed";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">{statusHeading}</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#6b1d1d]">
        {statusHeading} — {order.orderNumber}
      </h1>
      <p className="mt-2 capitalize text-sm text-[#2a1a12]/70">
        Status: <span className={order.status === "cancelled" ? "text-red-700 font-semibold" : "font-medium"}>{order.status}</span> · Payment: {order.paymentStatus} ({order.paymentMethod.toUpperCase()})
      </p>
      <div className="mithai-card mt-6 space-y-4 rounded-3xl p-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
              <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-[#2a1a12]/60">
                {item.variantWeight} × {item.quantity}
              </p>
            </div>
            <p>{formatInr(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
        <div className="flex justify-between border-t border-[#6b1d1d]/10 pt-4 font-semibold">
          <span>Total</span>
          <span>{formatInr(order.total)}</span>
        </div>
      </div>
      <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <article className="mithai-card rounded-3xl p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">Deliver to</h2>
          <p className="mt-2 leading-7">
            {address.name}
            <br />
            {address.line1}
            <br />
            {address.city}, {address.state} {address.pincode}
            <br />
            {address.phone}
          </p>
        </article>
        <article className="mithai-card rounded-3xl p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">Slot</h2>
          <p className="mt-2">{order.deliverySlot}</p>
          {order.status !== "cancelled" && order.status !== "delivered" ? (
            <CancelOrderButton orderNumber={order.orderNumber} />
          ) : null}
        </article>
      </div>
      <Link href="/shop" className="mt-8 inline-block text-sm text-[#c45c26]">
        Continue shopping →
      </Link>
    </main>
  );
}
