import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { addresses, orderItems, orders, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { formatInr } from "@/lib/money";
import { LogoutButton } from "@/components/logout-button";
import { ensureSeeded } from "@/db/seed";
import { AccountAddressManager, AddressItem } from "@/components/account-address-manager";
import { AccountProfileManager } from "@/components/account-profile-manager";
import { AccountSecurityManager } from "@/components/account-security-manager";
import { AccountReorderButton } from "@/components/account-reorder-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

function parseAddressSnapshot(raw: string | null | undefined): string {
  if (!raw) return "Standard Dispatch (Kalol Hub)";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const parts = [parsed.line1, parsed.city, parsed.state, parsed.pincode].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  } catch {}
  return raw;
}

export default async function AccountPage() {
  await ensureSeeded();
  await ensureDbMigrations();
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  // Fetch full user profile details from database
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  // Link any past guest orders placed with this phone number to the user account
  if (authUser.phone) {
    try {
      const { getSqliteDb } = await import("@/db");
      const sqlite = getSqliteDb();
      sqlite
        .prepare("UPDATE orders SET user_id = ? WHERE guest_phone = ? AND user_id IS NULL")
        .run(authUser.id, authUser.phone);
    } catch {}
  }

  // Fetch user's saved addresses
  const userAddresses = (await db
    .select({
      id: addresses.id,
      userId: addresses.userId,
      label: addresses.label,
      line1: addresses.line1,
      city: addresses.city,
      state: addresses.state,
      stateCode: addresses.stateCode,
      pincode: addresses.pincode,
      phone: addresses.phone,
      gstin: addresses.gstin,
    })
    .from(addresses)
    .where(eq(addresses.userId, authUser.id))) as AddressItem[];

  // Fetch user's full order history (both user_id and matching guest_phone)
  const userOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      status: orders.status,
      subtotal: orders.subtotal,
      discount: orders.discount,
      deliveryFee: orders.deliveryFee,
      total: orders.total,
      couponCode: orders.couponCode,
      addressSnapshot: orders.addressSnapshot,
      deliverySlot: orders.deliverySlot,
      fulfillmentType: orders.fulfillmentType,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      authUser.phone
        ? or(eq(orders.userId, authUser.id), eq(orders.guestPhone, authUser.phone))
        : eq(orders.userId, authUser.id)
    )
    .orderBy(desc(orders.createdAt));

  // Fetch items for past orders to enable one-click Reorder
  const orderIds = userOrders.map((o) => o.id);
  const allOrderItems =
    orderIds.length > 0
      ? await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            productName: orderItems.productName,
            variantWeight: orderItems.variantWeight,
            unitPrice: orderItems.unitPrice,
            quantity: orderItems.quantity,
            variantId: orderItems.variantId,
          })
          .from(orderItems)
          .where(sql`${orderItems.orderId} IN ${orderIds}`)
      : [];

  const itemsByOrderId = new Map<number, typeof allOrderItems>();
  for (const it of allOrderItems) {
    const list = itemsByOrderId.get(it.orderId) || [];
    list.push(it);
    itemsByOrderId.set(it.orderId, list);
  }

  const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const rewardPoints = Math.floor(totalSpent / 10);
  const pointsRupeeValue = Math.floor(rewardPoints / 2);

  const tierName =
    totalSpent >= 5000
      ? "👑 Vardayini Gold Connoisseur"
      : totalSpent >= 1500
      ? "✨ Vardayini Silver Patron"
      : totalSpent > 0
      ? "🌟 Royal Mithai Member"
      : "🌿 Welcome Member";

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "September 2026";

  const hasPassword = Boolean(userProfile?.passwordHash && userProfile.passwordHash.length > 5);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <Breadcrumbs items={[{ label: "My Account" }]} />

      {/* 1. Profile Header Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2f8a] via-[#09256e] to-[#06184a] text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#dfb755]/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-end gap-3 mb-2">
            {(authUser.role === "admin" || authUser.role === "super_admin") && (
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#dfb755] px-4 py-2 text-xs font-bold text-[#0b2f8a] shadow-sm hover:bg-[#c99f3b] transition flex items-center gap-1.5"
              >
                <span>{authUser.role === "super_admin" ? "👑 Admin Desk (3001) →" : "Admin Desk (3001) →"}</span>
              </a>
            )}
            <LogoutButton />
          </div>

          <AccountProfileManager
            initialProfile={{
              id: authUser.id,
              name: userProfile?.name || authUser.name,
              email: userProfile?.email || authUser.email,
              phone: userProfile?.phone || authUser.phone,
              role: authUser.role,
              memberSince,
            }}
          />
        </div>

        {/* Profile Statistics Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Orders Placed</p>
            <p className="text-2xl font-bold text-white mt-0.5 font-mono">{userOrders.length}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Lifetime Spend</p>
            <p className="text-2xl font-bold text-[#dfb755] mt-0.5">{formatInr(totalSpent)}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Mithai Points</p>
            <p className="text-2xl font-bold text-amber-300 mt-0.5 font-mono">
              {rewardPoints} <span className="text-xs font-normal text-white/70">pts</span>
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Saved Addresses</p>
            <p className="text-2xl font-bold text-emerald-300 mt-0.5 font-mono">{userAddresses.length}</p>
          </div>
        </div>
      </section>

      {/* 2. Vardayini Royal Loyalty & Rewards Banner Card */}
      <section className="relative overflow-hidden rounded-3xl border border-[#dfb755]/30 bg-gradient-to-r from-[#fff9ea] via-[#fdf6e2] to-[#fffdf7] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#dfb755]/20 text-[#6b1d1d] border border-[#dfb755]/40">
                {tierName}
              </span>
              <span className="text-xs text-[#2a1a12]/60 font-medium">Kalol Flagship Patron Club</span>
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d]">
              Mithai Rewards Balance: <span className="text-[#0b2f8a]">{rewardPoints} Points</span>
            </h3>
            <p className="text-xs text-[#2a1a12]/75 max-w-xl leading-relaxed">
              You earn 1 Mithai Point for every ₹10 spent. Your points are worth approx.{" "}
              <strong className="text-[#6b1d1d] font-bold">₹{pointsRupeeValue}</strong> in festive discounts and special halwai hampers.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/shop"
              className="rounded-full bg-[#0b2f8a] hover:bg-[#082266] text-white text-xs font-bold px-5 py-2.5 text-center transition shadow-xs"
            >
              Order Sweets & Earn Points →
            </Link>
          </div>
        </div>

        {/* Member Perks Strip */}
        <div className="mt-5 pt-4 border-t border-[#dfb755]/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#2a1a12]/80">
          <div className="flex items-center gap-2">
            <span className="text-base">🚚</span>
            <span>Free Express Delivery across Kalol on orders above ₹499</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🍯</span>
            <span>100% Shuddh Desi Ghee & Daily Fresh Bhatti Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🎁</span>
            <span>Priority Festive Pre-Booking & Fresh Halwai Hampers</span>
          </div>
        </div>
      </section>

      {/* 3. Orders History & One-Click Reorder */}
      <section className="bg-white/90 rounded-3xl border border-[#2a1a12]/10 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d]">
              Order History & Deliveries
            </h2>
            <p className="text-xs text-[#2a1a12]/70 mt-0.5">
              Review destination addresses, live tracking, and reorder your favourite sweets with one click
            </p>
          </div>
          <Link
            href="/shop"
            className="text-xs font-semibold text-[#c45c26] hover:underline flex items-center gap-1"
          >
            Order More Mithai →
          </Link>
        </div>

        <div className="space-y-4">
          {userOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#2a1a12]/20 p-8 text-center bg-white/40">
              <p className="text-sm font-medium text-[#2a1a12]/70">No orders placed yet.</p>
              <p className="text-xs text-[#2a1a12]/50 mt-1">
                Explore our festive Kaju Katli, Mawa Pedas, and Gujarati Farsan boxes!
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-block rounded-full bg-[#c45c26] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#a64a1b] transition"
              >
                Browse Mithai Store
              </Link>
            </div>
          ) : (
            userOrders.map((order) => {
              const formattedAddress = parseAddressSnapshot(order.addressSnapshot);
              const items = itemsByOrderId.get(order.id) || [];

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-[#2a1a12]/10 bg-white p-5 shadow-sm hover:border-[#c45c26]/30 transition space-y-4"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2a1a12]/8 pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-[#0b2f8a]">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === "confirmed" || order.status === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : order.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2a1a12]/5 text-[#2a1a12]/70">
                        {order.fulfillmentType === "pickup" ? "🛍️ Kalol Store Pickup" : "🏠 Express Delivery"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#2a1a12]/60">
                      <span>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-base text-[#6b1d1d]">
                        {formatInr(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Sweets items ordered preview */}
                  {items.length > 0 && (
                    <div className="bg-[#faf8f5] rounded-2xl p-3 border border-[#2a1a12]/5">
                      <p className="text-[10px] uppercase font-bold text-[#6b1d1d] tracking-wider mb-1.5 flex items-center gap-1">
                        <span>🍯</span> Sweets in this Order:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((it) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1 rounded-xl bg-white border border-[#2a1a12]/10 px-2.5 py-1 text-xs text-[#2a1a12]/90 font-medium"
                          >
                            <span>{it.productName}</span>
                            <span className="text-[#2a1a12]/50 text-[11px]">({it.variantWeight})</span>
                            <span className="font-bold text-[#c45c26]">×{it.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Location & Slot Snapshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#fcfbf9] rounded-2xl p-3 border border-[#2a1a12]/5">
                      <p className="text-[10px] uppercase font-bold text-[#c45c26] tracking-wider flex items-center gap-1">
                        📍 {order.fulfillmentType === "pickup" ? "Pickup Store" : "Delivery Address"}
                      </p>
                      <p className="mt-1 font-medium text-[#2a1a12] leading-snug">
                        {order.fulfillmentType === "pickup"
                          ? "Vardayini Sweet Mart — Kalol Flagship Store (Near Navjivan, Kalol)"
                          : formattedAddress}
                      </p>
                    </div>

                    <div className="bg-[#fcfbf9] rounded-2xl p-3 border border-[#2a1a12]/5 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#2a1a12]/60 tracking-wider">
                          🕒 Time Slot & Payment
                        </p>
                        <p className="mt-1 text-[#2a1a12] font-medium">
                          {order.deliverySlot || "Standard Express Slot"}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#2a1a12]/60 mt-1 capitalize">
                        Payment: {order.paymentMethod} ({order.paymentStatus})
                      </p>
                    </div>
                  </div>

                  {/* Actions Toolbar: Reorder, Invoice, Tracking */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#2a1a12]/5">
                    <div>
                      {items.length > 0 && (
                        <AccountReorderButton
                          items={items}
                          orderNumber={order.orderNumber}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="text-xs font-semibold text-[#0b2f8a] hover:underline flex items-center gap-1"
                      >
                        <span>📄</span>
                        <span>View Invoice</span>
                      </Link>
                      <span>•</span>
                      <Link
                        href={`/orders/${order.orderNumber}#tracking`}
                        className="text-xs font-semibold text-[#c45c26] hover:underline flex items-center gap-1"
                      >
                        <span>📍</span>
                        <span>Track Live →</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. Saved Delivery Addresses */}
      <section className="bg-white/90 rounded-3xl border border-[#2a1a12]/10 p-6 sm:p-8 shadow-sm">
        <AccountAddressManager
          initialAddresses={userAddresses}
          userPhone={authUser.phone}
          userName={authUser.name}
        />
      </section>

      {/* 5. Account Security & Password */}
      <section>
        <AccountSecurityManager hasPassword={hasPassword} />
      </section>

      {/* 6. Helpdesk & Traditional Halwai Support */}
      <section className="rounded-3xl border border-[#2a1a12]/10 bg-[#faf8f5] p-6 text-xs text-[#2a1a12]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-bold text-sm text-[#6b1d1d] flex items-center gap-1.5">
            <span>🏪</span> Vardayini Sweet Mart — Kalol Flagship Desk
          </p>
          <p className="mt-0.5">
            Need urgent assistance, bulk wedding orders, or custom corporate gift hampers? Reach out to our master halwais.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3 font-medium">
          <a
            href="tel:+918866169447"
            className="rounded-full border border-[#2a1a12]/20 bg-white px-3.5 py-1.5 text-xs text-[#6b1d1d] font-bold hover:bg-[#6b1d1d] hover:text-white transition"
          >
            📞 +91 88661 69447
          </a>
          <a
            href="https://wa.me/918866169447"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs text-white font-bold hover:bg-emerald-700 transition"
          >
            💬 WhatsApp Support
          </a>
        </div>
      </section>
    </main>
  );
}
