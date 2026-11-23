"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInr } from "@/lib/money";
import { LogoutButton } from "@/components/logout-button";
import { AccountAddressManager, AddressItem } from "@/components/account-address-manager";
import { AccountSecurityManager } from "@/components/account-security-manager";

export interface AccountPortalProps {
  initialUser: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    avatarUrl?: string | null;
    customerId: string;
    memberSince: string;
    stats: {
      completedOrders: number;
      totalOrders: number;
      totalSpent: number;
      savedAddressesCount: number;
      activeReturnsCount: number;
    };
    rewards: {
      points: number;
      earnedPoints: number;
      bonusPoints: number;
      rupeeValue: number;
      tier: { id: string; name: string; badge: string; level: number };
      nextTier: { id: string; name: string; minSpend: number; neededSpend: number; progressPercent: number } | null;
      perks: Array<{ id: string; title: string; description: string; requiredTier: string; icon: string; isUnlocked: boolean; status: string }>;
    };
    preferences: {
      preferredTimeSlot: string;
      giftWrapping: boolean;
      dietaryPreference: string;
      orderNotifications: boolean;
      offersNewsletter: boolean;
      savedPaymentMethods: Array<{ id: string; type: string; label: string; masked: string; isDefault: boolean }>;
    };
  };
  initialOrders: any[];
  initialWishlist: any[];
  initialAddresses: AddressItem[];
  hasPassword?: boolean;
}

type TabKey = "overview" | "orders" | "saved" | "addresses" | "rewards" | "settings";

const TABS: { id: TabKey; label: string; icon: string }[] = [
  { id: "overview", label: "Profile Overview", icon: "👤" },
  { id: "orders", label: "Orders & Returns", icon: "📦" },
  { id: "saved", label: "Saved Items", icon: "❤️" },
  { id: "addresses", label: "Addresses & Payments", icon: "📍" },
  { id: "rewards", label: "Sweet Rewards", icon: "👑" },
  { id: "settings", label: "Account Settings", icon: "⚙️" },
];

export function CustomerAccountPortal({
  initialUser,
  initialOrders,
  initialWishlist,
  initialAddresses,
  hasPassword = true,
}: AccountPortalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // State slices
  const [user, setUser] = useState(initialUser);
  const [orders, setOrders] = useState(initialOrders);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [preferences, setPreferences] = useState(initialUser.preferences);

  // UI state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profilePhone, setProfilePhone] = useState(user.phone);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(user.avatarUrl || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Review modal state
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Order Details Modal
  const [detailsOrder, setDetailsOrder] = useState<any | null>(null);

  // Buy Again / Reorder state
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Payment method add modal
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"upi" | "card">("upi");
  const [newPaymentVpa, setNewPaymentVpa] = useState("");
  const [newPaymentCardLast4, setNewPaymentCardLast4] = useState("");
  const [newPaymentBank, setNewPaymentBank] = useState("HDFC Bank");

  // Sync preference updates to backend
  const handleSavePreferences = async (newPrefs: Partial<typeof preferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: updated }),
      });
    } catch (err) {
      console.warn("Failed to persist preferences:", err);
    }
  };

  // Profile update handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          email: profileEmail.trim(),
          phone: profilePhone.trim(),
          avatarUrl: profileAvatarUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile." });
      } else {
        setUser((prev) => ({
          ...prev,
          name: profileName.trim(),
          email: profileEmail.trim(),
          phone: profilePhone.trim(),
          avatarUrl: profileAvatarUrl.trim() || null,
        }));
        setProfileMsg({ type: "success", text: "Profile details updated successfully!" });
        setTimeout(() => setIsEditProfileOpen(false), 1200);
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setProfileSaving(false);
    }
  };

  // Buy Again handler (re-adds all valid items from the order to cart)
  const handleBuyAgain = async (order: any) => {
    setReorderingId(order.orderNumber);
    try {
      const itemsToAdd = (order.items || []).filter((it: any) => it.variantId && it.variantId > 0);
      if (itemsToAdd.length === 0) {
        router.push("/shop");
        return;
      }
      for (const item of itemsToAdd) {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: item.variantId,
            quantity: item.quantity || 1,
          }),
        });
      }
      router.push("/cart");
    } catch (err) {
      alert("Failed to re-add items to cart. Please try again.");
    } finally {
      setReorderingId(null);
    }
  };

  // Move from Wishlist to Cart
  const handleMoveToCart = async (item: any) => {
    if (!item.variantId) {
      router.push(`/shop/${item.slug}`);
      return;
    }
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: item.variantId, quantity: 1 }),
      });
      // Remove from wishlist
      await fetch(`/api/wishlist/${item.id}`, { method: "DELETE" });
      setWishlist((prev) => prev.filter((w) => w.id !== item.id));
      router.push("/cart");
    } catch {
      alert("Failed to move item to cart.");
    }
  };

  // Remove from Wishlist
  const handleRemoveWishlist = async (id: number) => {
    try {
      await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
      setWishlist((prev) => prev.filter((w) => w.id !== id));
    } catch {
      alert("Failed to remove item.");
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: reviewItem.productId || reviewItem.variantId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      if (res.ok) {
        setReviewSuccess(true);
        setTimeout(() => {
          setReviewOrder(null);
          setReviewItem(null);
          setReviewComment("");
          setReviewSuccess(false);
        }, 1500);
      } else {
        alert("Could not submit review. Please try again.");
      }
    } catch {
      alert("Error submitting review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Add Masked Payment Method
  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    let newMethod: any = null;
    if (newPaymentType === "upi") {
      const cleanVpa = newPaymentVpa.trim();
      if (!cleanVpa.includes("@")) {
        alert("Please enter a valid UPI ID (e.g. name@okhdfcbank).");
        return;
      }
      const parts = cleanVpa.split("@");
      const masked = `${parts[0].slice(0, 2)}••••@${parts[1]}`;
      newMethod = {
        id: `pm_${Date.now()}`,
        type: "upi",
        label: `${newPaymentBank} UPI`,
        masked,
        isDefault: preferences.savedPaymentMethods.length === 0,
      };
    } else {
      const cleanDigits = newPaymentCardLast4.replace(/\D/g, "");
      if (cleanDigits.length !== 4) {
        alert("Please enter the last 4 digits of your card.");
        return;
      }
      newMethod = {
        id: `pm_${Date.now()}`,
        type: "card",
        label: `${newPaymentBank} Debit/Credit`,
        masked: `•••• •••• •••• ${cleanDigits}`,
        isDefault: preferences.savedPaymentMethods.length === 0,
      };
    }
    const updatedMethods = [...preferences.savedPaymentMethods, newMethod];
    handleSavePreferences({ savedPaymentMethods: updatedMethods });
    setIsAddPaymentOpen(false);
    setNewPaymentVpa("");
    setNewPaymentCardLast4("");
  };

  const handleRemovePaymentMethod = (id: string) => {
    const updated = preferences.savedPaymentMethods.filter((pm) => pm.id !== id);
    handleSavePreferences({ savedPaymentMethods: updated });
  };

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* 1. TOP RESPONSIVE TAB BAR */}
      <nav aria-label="Account Navigation" className="border-b border-[#2a1a12]/10 bg-white/80 backdrop-blur-md sticky top-16 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                  isActive
                    ? "text-[#0b2f8a] bg-[#0b2f8a]/8 shadow-2xs"
                    : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-slate-50"
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === "orders" && orders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#0b2f8a] text-white">
                    {orders.length}
                  </span>
                )}
                {tab.id === "saved" && wishlist.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
                    {wishlist.length}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#dfb755] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2. PROFILE HEADER CARD & STATS STRIP */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2f8a] via-[#09256e] to-[#06184a] text-white p-6 sm:p-8 shadow-xl border border-[#dfb755]/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#dfb755]/25 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          {/* Customer Avatar & Identity */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#dfb755] via-[#b89130] to-[#fef08a] p-0.5 shadow-md">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="w-full h-full rounded-[14px] bg-[#0b2f8a] flex items-center justify-center font-[family-name:var(--font-display)] text-2xl font-black text-[#dfb755]">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : "VS"}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 text-xs select-none" title="Patron Crest">
                👑
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {user.name || "Valued Patron"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-xs">
                  {user.rewards.tier.badge}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/70">
                <span className="font-mono text-amber-200">{user.customerId}</span>
                <span>•</span>
                <span>Member since {user.memberSince}</span>
              </div>
              <p className="text-xs text-white/60 font-mono">
                {user.email} · +91 {user.phone.replace(/^(?:\+91|91|0)/, "")}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition backdrop-blur-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>✏️</span>
              <span>Edit Profile</span>
            </button>
            {(user.role === "admin" || user.role === "super_admin") && (
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#dfb755] hover:bg-[#c99f3b] text-[#0b2f8a] text-xs font-bold px-3.5 py-2 transition shadow-sm flex items-center gap-1"
              >
                <span>Desk ↗</span>
              </a>
            )}
            <LogoutButton />
          </div>
        </div>

        {/* 4-Metric Statistics Strip */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/60 block">Completed Orders</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {user.stats.completedOrders}
            </span>
            <span className="text-[10px] text-white/50">{user.stats.totalOrders} lifetime orders</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/60 block">Sweet Rewards</span>
            <span className="text-2xl font-bold font-mono text-amber-300 mt-1 block">
              {user.rewards.points} <span className="text-xs font-normal text-white/80">pts</span>
            </span>
            <span className="text-[10px] text-amber-200/90 font-medium">Worth ₹{user.rewards.rupeeValue} discount</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/60 block">Saved Addresses</span>
            <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">
              {user.stats.savedAddressesCount}
            </span>
            <span className="text-[10px] text-white/50">Verified dispatch hubs</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/60 block">Active Returns</span>
            <span className="text-2xl font-bold font-mono text-rose-300 mt-1 block">
              {user.stats.activeReturnsCount}
            </span>
            <span className="text-[10px] text-white/50">24-hour perishable SLA</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT: 2-COLUMN LAYOUT (MAIN LEFT + QUICK LINKS RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT / MAIN COLUMN (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-8">
          {/* TAB 1: PROFILE OVERVIEW (Shows Recent Orders, Sweet Rewards summary, and Wishlist preview) */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Sweet Rewards Card */}
              <div className="rounded-3xl border border-[#dfb755]/30 bg-gradient-to-br from-[#fff9ea] via-[#fdf6e2] to-[#ffffff] p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfb755]/20">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#b89130]">Loyalty &amp; Tier Status</span>
                    <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d] mt-0.5">
                      {user.rewards.tier.name}
                    </h2>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-xs text-[#5e6d82]">Balance:</span>
                    <span className="block font-mono font-bold text-lg text-[#0b2f8a]">
                      {user.rewards.points} Points (₹{user.rewards.rupeeValue})
                    </span>
                  </div>
                </div>

                {/* Progress bar to next tier */}
                {user.rewards.nextTier ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#2a1a12]/80">
                      <span>Progress to <strong className="text-[#6b1d1d]">{user.rewards.nextTier.name}</strong></span>
                      <span className="font-bold text-[#0b2f8a]">{user.rewards.nextTier.progressPercent}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[#dfb755] via-amber-500 to-[#0b2f8a] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, user.rewards.nextTier.progressPercent)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#5e6d82]">
                      Spend <strong className="text-[#6b1d1d]">₹{user.rewards.nextTier.neededSpend}</strong> more to unlock {user.rewards.nextTier.name} perks!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                    <span>👑</span>
                    <span>You have attained our highest Platinum Connoisseur status with all royal privileges unlocked!</span>
                  </div>
                )}

                {/* 3 Perk Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {user.rewards.perks.map((perk) => (
                    <div
                      key={perk.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        perk.isUnlocked
                          ? "bg-white border-emerald-300 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">{perk.icon}</span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            perk.isUnlocked
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {perk.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">{perk.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">{perk.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders Section with View All */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
                      Recent Orders
                    </h2>
                    <p className="text-xs text-slate-500">Track shipments, download GST tax invoices, and reorder</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-[#0b2f8a] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View All ({orders.length}) →</span>
                  </button>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                    <span className="text-3xl block mb-2">🍬</span>
                    <p className="text-xs font-bold text-slate-700">No orders placed yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Explore our fresh desi ghee kaju katli, mawa pedas &amp; farsan</p>
                    <Link
                      href="/shop"
                      className="mt-3 inline-block rounded-full bg-[#0b2f8a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#071c54] transition"
                    >
                      Browse Sweets Store
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onBuyAgain={() => handleBuyAgain(order)}
                        isReordering={reorderingId === order.orderNumber}
                        onViewDetails={() => setDetailsOrder(order)}
                        onWriteReview={(item: any) => {
                          setReviewOrder(order);
                          setReviewItem(item);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Items / Wishlist Preview (Quick 3-4 cards) */}
              {wishlist.length > 0 && (
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                        Saved Sweets &amp; Farsan
                      </h2>
                      <p className="text-xs text-slate-500">{wishlist.length} items saved in your wishlist</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("saved")}
                      className="text-xs font-bold text-[#0b2f8a] hover:underline cursor-pointer"
                    >
                      Manage Wishlist →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {wishlist.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200/70 hover:border-[#dfb755]/50 transition bg-[#fdfcfa]"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{item.name}</h4>
                          <span className="text-[10px] text-slate-500">{item.weight || "500g"}</span>
                          <p className="font-bold text-xs text-[#6b1d1d] mt-0.5">{formatInr(item.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMoveToCart(item)}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-[#0b2f8a] hover:bg-[#071c54] text-white text-[11px] font-bold shadow-2xs transition"
                        >
                          Cart 🛒
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDERS & RETURNS (Full order history with status timeline and return policy form link) */}
          {activeTab === "orders" && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d]">
                    Orders &amp; Returns Desk
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review delivery timelines, download tax invoices, and initiate 24-hour return claims
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="px-3.5 py-1.5 rounded-xl bg-[#0b2f8a] text-white text-xs font-bold hover:bg-[#071c54] transition shadow-2xs"
                >
                  Order Sweets →
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-slate-50/50 space-y-2">
                  <span className="text-4xl block">📦</span>
                  <h3 className="font-bold text-sm text-slate-800">No orders placed yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Explore our authentic Gujarati mithai, fresh morning fafda, and festive gifting hampers.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-3 inline-block rounded-full bg-[#0b2f8a] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#071c54] transition"
                  >
                    Start Sweet Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onBuyAgain={() => handleBuyAgain(order)}
                      isReordering={reorderingId === order.orderNumber}
                      onViewDetails={() => setDetailsOrder(order)}
                      onWriteReview={(item: any) => {
                        setReviewOrder(order);
                        setReviewItem(item);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVED ITEMS / WISHLIST */}
          {activeTab === "saved" && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
                    Saved Sweets &amp; Wishlist
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your personal collection of favourite Gujarati mithai, dryfruit boxes, and live bhatti farsan
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  ❤️ {wishlist.length} Items
                </span>
              </div>

              {wishlist.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-slate-50/50 space-y-2">
                  <span className="text-4xl block">🤍</span>
                  <h3 className="font-bold text-sm text-slate-800">Your wishlist is empty</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Save your favourite sweets by tapping the heart icon on any product page.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-3 inline-block rounded-full bg-[#0b2f8a] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#071c54] transition"
                  >
                    Browse Catalogs
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlist.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200/80 bg-[#fdfcfa] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs hover:border-[#dfb755]/50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] uppercase font-bold text-[#b89130]">
                              {item.categoryName || "Mithai"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveWishlist(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition text-sm cursor-pointer"
                              title="Remove from saved"
                            >
                              ✕
                            </button>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1">
                            {item.name}
                          </h4>
                          <span className="text-[11px] text-slate-500">{item.weight || "500g"}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-sm text-[#6b1d1d]">{formatInr(item.price)}</span>
                            {item.discountedPrice && item.price > item.discountedPrice && (
                              <span className="text-[11px] text-slate-400 line-through">
                                {formatInr(item.discountedPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            item.stockBadgeColor || "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {item.stockBadge || "In Stock"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveToCart(item)}
                          disabled={item.stock <= 0}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0b2f8a] hover:bg-[#071c54] text-white text-xs font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🛒 Move to Cart</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADDRESSES & PAYMENTS */}
          {activeTab === "addresses" && (
            <div className="space-y-6">
              {/* Delivery Address Manager */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <AccountAddressManager
                  initialAddresses={initialAddresses}
                  userPhone={user.phone}
                  userName={user.name}
                />
              </div>

              {/* Saved Payment Methods (Masked) */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                      Saved Payment Methods
                    </h3>
                    <p className="text-xs text-slate-500">
                      Masked payment references for expedited checkout (PCI compliant, full card credentials never stored)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPaymentOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0b2f8a]/10 hover:bg-[#0b2f8a]/20 text-[#0b2f8a] transition cursor-pointer"
                  >
                    + Add Method
                  </button>
                </div>

                <div className="space-y-2.5">
                  {preferences.savedPaymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-[#fdfcfa]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{pm.type === "upi" ? "📱" : "💳"}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{pm.label}</span>
                            {pm.isDefault && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-slate-600">{pm.masked}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentMethod(pm.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Remove payment method"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SWEET REWARDS (Dedicated Loyalty Hub) */}
          {activeTab === "rewards" && (
            <div className="rounded-3xl border border-[#dfb755]/30 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#b89130] tracking-wider">Vardayini Mithai Club</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d] mt-0.5">
                    Sweet Rewards &amp; Membership
                  </h2>
                  <p className="text-xs text-slate-500">
                    Earn 1 Mithai Point for every ₹10 spent. Redeem points directly on checkout orders!
                  </p>
                </div>
                <div className="bg-gradient-to-br from-[#fff9ea] to-[#fef08a] border border-[#dfb755]/40 rounded-2xl p-4 text-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-[#b89130]">Current Balance</span>
                  <span className="block text-3xl font-extrabold text-[#0b2f8a] font-mono">
                    {user.rewards.points}
                  </span>
                  <span className="text-xs font-bold text-[#6b1d1d]">₹{user.rewards.rupeeValue} discount value</span>
                </div>
              </div>

              {/* Tier Progress Bar with Milestones */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Tier Standing: <span className="text-[#6b1d1d]">{user.rewards.tier.name}</span></span>
                  {user.rewards.nextTier && (
                    <span className="text-slate-500 font-medium">
                      Next Milestone: <strong className="text-[#0b2f8a]">{user.rewards.nextTier.name}</strong>
                    </span>
                  )}
                </div>

                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#dfb755] via-amber-500 to-[#0b2f8a] rounded-full transition-all duration-500"
                    style={{ width: `${user.rewards.nextTier ? Math.max(5, user.rewards.nextTier.progressPercent) : 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 text-center text-[11px] pt-1 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-600 block">✨ Silver</span>
                    <span className="text-[10px] text-slate-400">₹1,500 spend</span>
                  </div>
                  <div>
                    <span className="font-bold text-amber-700 block">👑 Gold</span>
                    <span className="text-[10px] text-slate-400">₹5,000 spend</span>
                  </div>
                  <div>
                    <span className="font-bold text-purple-700 block">💎 Platinum</span>
                    <span className="text-[10px] text-slate-400">₹12,000 spend</span>
                  </div>
                </div>
              </div>

              {/* 3 Perk Cards */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900">Your Tier Benefits &amp; Privileges</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {user.rewards.perks.map((perk) => (
                    <div
                      key={perk.id}
                      className={`p-4 rounded-2xl border transition ${
                        perk.isUnlocked
                          ? "bg-gradient-to-br from-emerald-50/50 to-white border-emerald-300 shadow-2xs"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{perk.icon}</span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            perk.isUnlocked
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {perk.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">{perk.title}</h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">{perk.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACCOUNT SETTINGS & SECURITY */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Delivery & Dietary Preferences */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                    Delivery &amp; Dietary Preferences
                  </h3>
                  <p className="text-xs text-slate-500">Tailor your sweet boxes, gifting presentation, and delivery windows</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preferred Delivery Slot</label>
                    <select
                      value={preferences.preferredTimeSlot}
                      onChange={(e) => handleSavePreferences({ preferredTimeSlot: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none focus:border-[#0b2f8a]"
                    >
                      <option value="Morning (9:00 AM – 1:00 PM)">Morning (9:00 AM – 1:00 PM)</option>
                      <option value="Afternoon (1:00 PM – 5:00 PM)">Afternoon (1:00 PM – 5:00 PM)</option>
                      <option value="Evening (5:00 PM – 9:00 PM)">Evening (5:00 PM – 9:00 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dietary Specialization</label>
                    <select
                      value={preferences.dietaryPreference}
                      onChange={(e) => handleSavePreferences({ dietaryPreference: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none focus:border-[#0b2f8a]"
                    >
                      <option value="eggless">100% Eggless Sweets Only</option>
                      <option value="sugar_free">Sugar-Free / Diabetic Friendly Mithai</option>
                      <option value="jain">Jain Friendly (No Root Ingredients)</option>
                      <option value="standard">Standard Halwai Selection</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">Default Gift Wrapping</span>
                    <span className="text-[11px] text-slate-500">Apply festive golden ribbon and personalized mithai card</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.giftWrapping}
                    onChange={(e) => handleSavePreferences({ giftWrapping: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0b2f8a] cursor-pointer"
                  />
                </div>
              </div>

              {/* Notification Settings */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2f8a]">
                    Notification Settings
                  </h3>
                  <p className="text-xs text-slate-500">Choose how you receive order dispatches and festival announcements</p>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800 block">Order SMS &amp; WhatsApp Alerts</span>
                      <span className="text-[11px] text-slate-500">Real-time status updates, out for delivery and OTP verification</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.orderNotifications}
                      onChange={(e) => handleSavePreferences({ orderNotifications: e.target.checked })}
                      className="w-4 h-4 rounded text-[#0b2f8a]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800 block">Festival Specials &amp; VIP Offers</span>
                      <span className="text-[11px] text-slate-500">Early booking access for Diwali, Rakhi, and seasonal mohanthal bhattis</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.offersNewsletter}
                      onChange={(e) => handleSavePreferences({ offersNewsletter: e.target.checked })}
                      className="w-4 h-4 rounded text-[#0b2f8a]"
                    />
                  </label>
                </div>
              </div>

              {/* Security Manager (Password & 2FA) */}
              <AccountSecurityManager hasPassword={hasPassword} />
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (1 col on lg) */}
        <aside className="space-y-6">
          {/* Quick Account Links Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#0b2f8a] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <span>⚡</span>
              <span>Quick Account Access</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span>👤</span>
                  <span>Personal Details</span>
                </div>
                <span className="text-slate-400">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("addresses")}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span>📍</span>
                  <span>Delivery Addresses</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{user.stats.savedAddressesCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("addresses")}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span>💳</span>
                  <span>Saved Payment Methods</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {preferences.savedPaymentMethods.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span>🕒</span>
                  <span>Delivery Preferences</span>
                </div>
                <span className="text-slate-400">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span>🔔</span>
                  <span>Notification Toggles</span>
                </div>
                <span className="text-slate-400">→</span>
              </button>
            </div>
          </div>

          {/* Dark Premium "Need Assistance?" Card */}
          <div className="rounded-3xl bg-gradient-to-br from-[#182230] via-[#0f172a] to-[#071330] text-white p-6 shadow-xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 text-lg">
                💬
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">Need Assistance?</h4>
                <p className="text-[11px] text-white/60">Kalol Flagship Counter Support</p>
              </div>
            </div>

            <p className="text-xs text-white/75 leading-relaxed">
              Have questions about an active order, bulk wedding mithai boxes, or immediate cancellations?
            </p>

            <div className="space-y-2 pt-1">
              <a
                href="https://wa.me/916352119329"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md"
              >
                <span>💬</span>
                <span>WhatsApp Chat (+91 63521 19329)</span>
              </a>

              <Link
                href="/return-policy"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10"
              >
                <span>🛡️</span>
                <span>Easy Returns Guide (24H SLA)</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-white/10 text-[10px] text-white/50 text-center">
              Available 8:00 AM – 8:30 PM (All 7 Days)
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL 1: EDIT PROFILE */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#0b2f8a]">
                Edit Profile Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  profileMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Number (10 Digits)</label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Avatar / Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={profileAvatarUrl}
                  onChange={(e) => setProfileAvatarUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-xs transition disabled:opacity-50"
                >
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER DETAILS */}
      {detailsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-[#0b2f8a]">#{detailsOrder.orderNumber}</span>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900">
                  Order Details Breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Items Billed ({detailsOrder.items?.length || 0})</span>
              <div className="space-y-2">
                {(detailsOrder.items || []).map((it: any) => (
                  <div key={it.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{it.productName}</span>
                      <span className="text-[11px] text-slate-500">{it.variantWeight} × {it.quantity}</span>
                    </div>
                    <span className="font-mono font-bold text-[#6b1d1d]">
                      {formatInr(it.unitPrice * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatInr(detailsOrder.subtotal)}</span>
              </div>
              {detailsOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Special Discount</span>
                  <span>-{formatInr(detailsOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span>{detailsOrder.deliveryFee === 0 ? "FREE" : formatInr(detailsOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold pt-1.5 border-t border-amber-200 text-sm">
                <span>Total Amount Paid</span>
                <span className="text-[#6b1d1d] font-mono">{formatInr(detailsOrder.total)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                href={detailsOrder.invoiceUrl}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition"
              >
                📄 Open Printable GST Invoice
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: WRITE REVIEW */}
      {reviewOrder && reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#6b1d1d]">
                  Write a Sweet Review
                </h3>
                <p className="text-xs text-slate-500">For {reviewItem.productName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewOrder(null);
                  setReviewItem(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reviewSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <span className="text-2xl block">✨</span>
                <p className="text-xs font-bold text-emerald-800">Thank you for your valuable feedback!</p>
                <p className="text-[11px] text-emerald-600">Your review will help fellow mithai lovers discover pure ghee sweets.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Rating (1 to 5 Stars)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl transition ${
                          star <= reviewRating ? "text-amber-400 scale-110" : "text-slate-200 hover:text-amber-200"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="font-bold text-slate-700 ml-2">{reviewRating} / 5 Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Review / Taste Experience</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe the freshness, desi ghee fragrance, sweetness balance..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-[#0b2f8a]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewOrder(null);
                      setReviewItem(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting || reviewComment.trim().length < 4}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#6b1d1d] hover:bg-[#521515] text-white shadow-xs transition disabled:opacity-50"
                  >
                    {reviewSubmitting ? "Submitting..." : "Publish Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: ADD MASKED PAYMENT */}
      {isAddPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#0b2f8a]">
                Add Payment Reference
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="space-y-3.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPaymentType("upi")}
                  className={`flex-1 py-2 rounded-xl font-bold border transition ${
                    newPaymentType === "upi"
                      ? "bg-[#0b2f8a] text-white border-[#0b2f8a]"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  📱 UPI ID
                </button>
                <button
                  type="button"
                  onClick={() => setNewPaymentType("card")}
                  className={`flex-1 py-2 rounded-xl font-bold border transition ${
                    newPaymentType === "card"
                      ? "bg-[#0b2f8a] text-white border-[#0b2f8a]"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  💳 Debit / Credit Card
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank / Provider</label>
                <input
                  type="text"
                  required
                  value={newPaymentBank}
                  onChange={(e) => setNewPaymentBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                />
              </div>

              {newPaymentType === "upi" ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UPI VPA Handle</label>
                  <input
                    type="text"
                    required
                    value={newPaymentVpa}
                    onChange={(e) => setNewPaymentVpa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. 9825019329@okhdfcbank"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Your handle is stored in masked form (e.g. 98••••@okhdfcbank).
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Card Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={newPaymentCardLast4}
                    onChange={(e) => setNewPaymentCardLast4(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    placeholder="e.g. 4242"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Security note: CVV and full 16-digit card numbers are never stored.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54]"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: ORDER CARD WITH PROGRESS TIMELINE & 6 ACTION BUTTONS
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  onBuyAgain,
  isReordering,
  onViewDetails,
  onWriteReview,
}: {
  order: any;
  onBuyAgain: () => void;
  isReordering: boolean;
  onViewDetails: () => void;
  onWriteReview: (item: any) => void;
}) {
  const isDelivered = (order.status || "").toLowerCase() === "delivered";
  const isCancelled = ["cancelled", "canceled"].includes((order.status || "").toLowerCase());

  const statusBadgeColor = isDelivered
    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
    : isCancelled
    ? "bg-rose-50 text-rose-800 border-rose-300"
    : "bg-amber-50 text-amber-800 border-amber-300";

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-[#fdfcfa] p-5 sm:p-6 shadow-2xs hover:shadow-xs transition space-y-4">
      {/* Top Bar: Order number, date, total, status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono font-extrabold text-sm text-[#0b2f8a]">
            #{order.orderNumber}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusBadgeColor}`}>
            {order.status}
          </span>
          <span className="text-[11px] text-slate-500">
            {order.fulfillmentType === "pickup" ? "🛍️ Store Pickup (Kalol Hub)" : "🏠 Express Delivery"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="font-mono font-extrabold text-base text-[#6b1d1d]">
            {formatInr(order.total)}
          </span>
        </div>
      </div>

      {/* Progress Timeline: Ordered -> Packed -> Out for Delivery -> Delivered */}
      {!isCancelled ? (
        <div className="py-2">
          <div className="grid grid-cols-4 gap-2 relative">
            {(order.timeline || []).map((step: any, idx: number) => (
              <div key={step.step} className="text-center relative">
                {/* Connecting bar */}
                {idx < 3 && (
                  <div
                    className={`absolute top-2.5 left-1/2 w-full h-1 -z-0 ${
                      step.completed ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
                {/* Circle step indicator */}
                <div
                  className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold z-10 relative shadow-2xs ${
                    step.completed
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {step.completed ? "✓" : idx + 1}
                </div>
                <span className="block text-[11px] font-bold text-slate-800 mt-1.5 leading-tight">
                  {step.label}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                  {step.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <span>❌</span>
          <span>Order #{order.orderNumber} was cancelled. Any prepaid amount is refunded in 5-7 working days.</span>
        </div>
      )}

      {/* Items Snapshot */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-slate-200/60 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Items in parcel:
          </span>
          <div className="flex flex-wrap gap-2">
            {order.items.map((it: any) => (
              <div
                key={it.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
              >
                {it.imageUrl && (
                  <img
                    src={it.imageUrl}
                    alt={it.productName}
                    className="w-7 h-7 rounded-lg object-cover shrink-0"
                  />
                )}
                <span className="font-medium">{it.productName}</span>
                <span className="text-slate-400 text-[11px]">({it.variantWeight})</span>
                <span className="font-bold text-[#6b1d1d]">×{it.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Track Order */}
          <Link
            href={order.trackingUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b2f8a] text-white text-xs font-bold hover:bg-[#071c54] transition shadow-2xs"
          >
            <span>📍</span>
            <span>Track Order</span>
          </Link>

          {/* 2. View Details */}
          <button
            type="button"
            onClick={onViewDetails}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            View Details
          </button>

          {/* 3. Download Invoice */}
          <Link
            href={order.invoiceUrl}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
          >
            <span>📄</span>
            <span>Invoice</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 4. Buy Again */}
          <button
            type="button"
            onClick={onBuyAgain}
            disabled={isReordering}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#dfb755] hover:bg-[#c99f3b] text-[#0b2f8a] text-xs font-extrabold shadow-2xs transition disabled:opacity-50 cursor-pointer"
          >
            <span>🔄</span>
            <span>{isReordering ? "Re-ordering..." : "Buy Again"}</span>
          </button>

          {/* 5. Write Review (Only for delivered orders) */}
          {isDelivered && order.items && order.items[0] && (
            <button
              type="button"
              onClick={() => onWriteReview(order.items[0])}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
            >
              <span>⭐</span>
              <span>Write Review</span>
            </button>
          )}

          {/* 6. Return / Exchange (Strict 24h SLA for delivered orders) */}
          {order.canReturn && (
            <Link
              href={order.returnFormUrl}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Claim within 24 hours of delivery under perishable food return policy"
            >
              <span>🛡️</span>
              <span>Return / Exchange (24h)</span>
            </Link>
          )}
          {order.activeReturn && (
            <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1">
              <span>🛡️</span>
              <span>Claim: {order.activeReturn.status.replace("_", " ")}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
