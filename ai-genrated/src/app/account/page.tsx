import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { addresses, orders, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { formatInr } from "@/lib/money";
import { LogoutButton } from "@/components/logout-button";
import { ensureSeeded } from "@/db/seed";
import { AccountAddressManager, AddressItem } from "@/components/account-address-manager";
import { AccountProfileManager } from "@/components/account-profile-manager";

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
  } catch { }
  return raw;
}

export default async function AccountPage() {
  await ensureSeeded();
  // Ensure the addresses.gstin column migration has run before querying
  await ensureDbMigrations();
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  // Fetch full user profile details from database
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  // Fetch user's saved addresses — select explicit columns to be safe
  // if gstin column migration hasn't run yet, fall back gracefully
  let userAddresses: AddressItem[] = [];
  try {
    userAddresses = (await db
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
  } catch {
    // gstin column not yet migrated — fetch without it
    const rows = await db
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
      })
      .from(addresses)
      .where(eq(addresses.userId, authUser.id));
    userAddresses = rows.map((r) => ({ ...r, gstin: null })) as AddressItem[];
  }

  // Fetch user's full order history
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
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, authUser.id))
    .orderBy(desc(orders.createdAt));

  const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    })
    : "September 2026";

  const userInitial = (authUser.name || "V")[0].toUpperCase();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-10">
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
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Total Spent</p>
            <p className="text-2xl font-bold text-[#dfb755] mt-0.5">{formatInr(totalSpent)}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Saved Addresses</p>
            <p className="text-2xl font-bold text-white mt-0.5 font-mono">{userAddresses.length}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">Delivery Region</p>
            <p className="text-base font-semibold text-emerald-300 mt-1">Gujarat Express</p>
          </div>
        </div>
      </section>

      {/* 2. Saved Addresses Section */}
      <section className="bg-white/80 rounded-3xl border border-[#2a1a12]/10 p-6 sm:p-8 shadow-sm">
        <AccountAddressManager
          initialAddresses={userAddresses}
          userPhone={authUser.phone}
        />
      </section>

      {/* 3. Orders History Section with Full Delivery Address */}
      <section className="bg-white/80 rounded-3xl border border-[#2a1a12]/10 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d]">
              Order History & Deliveries
            </h2>
            <p className="text-xs text-[#2a1a12]/70 mt-0.5">
              Review destination addresses, payment receipts and dispatch tracking
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

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-[#2a1a12]/10 bg-white p-5 shadow-sm hover:border-[#c45c26]/30 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2a1a12]/8 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-[#0b2f8a]">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === "confirmed" || order.status === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : order.status === "cancelled"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                      >
                        {order.status}
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

                  {/* Delivery Location & Slot Snapshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#fcfbf9] rounded-2xl p-3 border border-[#2a1a12]/5">
                      <p className="text-[10px] uppercase font-bold text-[#c45c26] tracking-wider flex items-center gap-1">
                        📍 Delivery Address
                      </p>
                      <p className="mt-1 font-medium text-[#2a1a12] leading-snug">
                        {formattedAddress}
                      </p>
                    </div>

                    <div className="bg-[#fcfbf9] rounded-2xl p-3 border border-[#2a1a12]/5 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#2a1a12]/60 tracking-wider">
                          🕒 Delivery Slot & Payment
                        </p>
                        <p className="mt-1 text-[#2a1a12] font-medium">
                          {order.deliverySlot}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#2a1a12]/60 mt-1 capitalize">
                        Payment: {order.paymentMethod} ({order.paymentStatus})
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link
                      href={`/orders/${order.orderNumber}`}
                      className="text-xs font-semibold text-[#0b2f8a] hover:underline"
                    >
                      View Full Order Invoice →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
