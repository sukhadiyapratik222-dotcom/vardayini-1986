import { redirect } from "next/navigation";
import { desc, eq, or, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { addresses, categories, orderItems, orders, products, productVariants, returnRequests, users, wishlistItems } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerAccountPortal } from "@/components/customer-account-portal";
import { AddressItem } from "@/components/account-address-manager";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;

function getLoyaltyConfig() {
  try {
    const configPath = path.resolve(process.cwd(), "src/data/ui-config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data.loyaltyRewards) return data.loyaltyRewards;
    }
  } catch {}
  return {
    pointsPerTenRupees: 1,
    rupeeValuePerPoint: 0.1,
    welcomeBonus: 50,
    tiers: [
      { id: "silver", name: "Silver Patron", badge: "✨ Silver", minSpend: 1500, perk: "5% festive discount" },
      { id: "gold", name: "Gold Connoisseur", badge: "👑 Gold", minSpend: 5000, perk: "Free express delivery on ₹499+" },
      { id: "platinum", name: "Platinum Royal Club", badge: "💎 Platinum", minSpend: 12000, perk: "Early festival access & halwai gift" },
    ],
    perks: [
      { id: "free_delivery", title: "Free Delivery on Gold", description: "Complimentary express delivery on orders over ₹499", requiredTier: "gold", icon: "🚚" },
      { id: "birthday_discount", title: "Birthday Gift Discount", description: "Exclusive 15% discount voucher during your birthday week", requiredTier: "silver", icon: "🎁" },
      { id: "festival_early_access", title: "Early Festival Access", description: "48-hour advance pre-booking for Diwali & Rakhi bhattis", requiredTier: "platinum", icon: "🪔" },
    ],
  };
}

export default async function AccountPage() {
  await ensureSeeded();
  await ensureDbMigrations();
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  // Fetch full user profile details from database
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!dbUser) redirect("/login");

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
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      expectedDeliveryDate: orders.expectedDeliveryDate,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
      cancelReason: orders.cancelReason,
      returnReason: orders.returnReason,
      returnStatus: orders.returnStatus,
      refundStatus: orders.refundStatus,
      refundAmount: orders.refundAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      authUser.phone
        ? or(eq(orders.userId, authUser.id), eq(orders.guestPhone, authUser.phone))
        : eq(orders.userId, authUser.id)
    )
    .orderBy(desc(orders.createdAt));

  const orderIds = userOrders.map((o) => o.id);

  // Fetch items for all orders
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
            imageUrl: orderItems.imageUrl,
            variantId: orderItems.variantId,
          })
          .from(orderItems)
          .where(sql`${orderItems.orderId} IN ${orderIds}`)
      : [];

  const itemsByOrder = new Map<number, typeof allOrderItems>();
  for (const it of allOrderItems) {
    if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
    itemsByOrder.get(it.orderId)!.push(it);
  }

  // Fetch return requests for these orders
  const returns =
    orderIds.length > 0
      ? await db
          .select({
            id: returnRequests.id,
            orderId: returnRequests.orderId,
            orderNumber: returnRequests.orderNumber,
            reason: returnRequests.reason,
            reasonLabel: returnRequests.reasonLabel,
            description: returnRequests.description,
            status: returnRequests.status,
            photoUrl: returnRequests.photoUrl,
            adminNotes: returnRequests.adminNotes,
            createdAt: returnRequests.requestedAt,
          })
          .from(returnRequests)
          .where(sql`${returnRequests.orderId} IN ${orderIds}`)
      : [];

  const returnsByOrder = new Map<number, (typeof returns)[0]>();
  for (const r of returns) {
    returnsByOrder.set(r.orderId, r);
  }

  const now = Date.now();

  const enrichedOrders = userOrders.map((ord) => {
    const items = itemsByOrder.get(ord.id) || [];
    const returnReq = returnsByOrder.get(ord.id) || null;

    // Determine 24h return window
    const deliveryTime = ord.deliveredAt ? new Date(ord.deliveredAt).getTime() : 0;
    const isDelivered = (ord.status || "").toLowerCase() === "delivered";
    const within24h = isDelivered && deliveryTime > 0 && now - deliveryTime <= RETURN_WINDOW_MS;
    const canReturn = within24h && !returnReq;

    // Timeline calculation
    const isCancelled = ["cancelled", "canceled"].includes((ord.status || "").toLowerCase());
    const isConfirmed = ["confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"].includes(
      (ord.status || "").toLowerCase()
    );
    const isPacked = ["packed", "shipped", "out_for_delivery", "delivered"].includes(
      (ord.status || "").toLowerCase()
    );
    const isOutForDelivery = ["out_for_delivery", "delivered"].includes(
      (ord.status || "").toLowerCase()
    );

    const ordDateStr = new Date(ord.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const deliveryDateStr = ord.deliveredAt
      ? new Date(ord.deliveredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : ord.expectedDeliveryDate
      ? new Date(ord.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "Estimated 24-48 hrs";

    const timeline = isCancelled
      ? [
          { key: "ordered", label: "Ordered", icon: "📝", date: ordDateStr, isCompleted: true, isCurrent: false },
          { key: "cancelled", label: "Cancelled", icon: "❌", date: ord.cancelledAt ? new Date(ord.cancelledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Cancelled", isCompleted: true, isCurrent: true },
        ]
      : [
          { key: "ordered", label: "Ordered", icon: "📝", date: ordDateStr, isCompleted: true, isCurrent: !isConfirmed },
          { key: "packed", label: "Packed", icon: "📦", date: isPacked ? "Bhatti Packed" : "Pending", isCompleted: isPacked, isCurrent: isConfirmed && !isPacked },
          { key: "out_for_delivery", label: "Out for Delivery", icon: "🚚", date: isOutForDelivery ? "Dispatched" : "Scheduled", isCompleted: isOutForDelivery, isCurrent: isPacked && !isOutForDelivery },
          { key: "delivered", label: "Delivered", icon: "✅", date: isDelivered ? deliveryDateStr : `Est: ${deliveryDateStr}`, isCompleted: isDelivered, isCurrent: isOutForDelivery && !isDelivered },
        ];

    const statusColors: Record<string, string> = {
      pending: "text-amber-800 bg-amber-50 border-amber-200",
      confirmed: "text-blue-800 bg-blue-50 border-blue-200",
      packed: "text-indigo-800 bg-indigo-50 border-indigo-200",
      shipped: "text-purple-800 bg-purple-50 border-purple-200",
      out_for_delivery: "text-orange-800 bg-orange-50 border-orange-200",
      delivered: "text-emerald-800 bg-emerald-50 border-emerald-200",
      cancelled: "text-rose-800 bg-rose-50 border-rose-200",
      canceled: "text-rose-800 bg-rose-50 border-rose-200",
    };

    const statusBadge = {
      label: (ord.status || "Pending").replace(/_/g, " ").toUpperCase(),
      color: statusColors[(ord.status || "").toLowerCase()] || "text-slate-800 bg-slate-50 border-slate-200",
    };

    return {
      ...ord,
      items,
      timeline,
      canReturn,
      returnRequest: returnReq,
      statusBadge,
      invoiceUrl: `/orders/${ord.orderNumber}/invoice`,
      trackUrl: `/orders/${ord.orderNumber}#tracking`,
    };
  });

  // Fetch Wishlist Items
  const wishlistRows = await db
    .select({
      id: wishlistItems.id,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(wishlistItems.userId, authUser.id))
    .orderBy(desc(wishlistItems.createdAt));

  const pVariants = await db.select().from(productVariants);
  const variantsByProduct = new Map<number, typeof pVariants>();
  for (const v of pVariants) {
    if (!variantsByProduct.has(v.productId)) variantsByProduct.set(v.productId, []);
    variantsByProduct.get(v.productId)!.push(v);
  }

  const enrichedWishlist = wishlistRows.map((item) => {
    const list = variantsByProduct.get(item.productId) || [];
    const defaultVariant = list.find((v) => v.isDefault) || list[0] || null;
    const price = defaultVariant ? defaultVariant.price : 350;
    const discountedPrice = defaultVariant ? defaultVariant.discountedPrice : null;
    const stock = defaultVariant ? defaultVariant.stock : 50;
    const variantId = defaultVariant ? defaultVariant.id : null;
    const weight = defaultVariant ? defaultVariant.weight : "500g";

    let stockBadge = "In Stock";
    let stockBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (stock <= 0) {
      stockBadge = "Out of Stock";
      stockBadgeColor = "text-rose-700 bg-rose-50 border-rose-200";
    } else if (stock <= 2) {
      stockBadge = `Only ${stock} Left`;
      stockBadgeColor = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (stock <= 5) {
      stockBadge = "Low Stock";
      stockBadgeColor = "text-amber-700 bg-amber-50 border-amber-200";
    }

    return {
      ...item,
      variantId,
      weight,
      price,
      discountedPrice,
      stock,
      stockBadge,
      stockBadgeColor,
    };
  });

  // Aggregate user stats & rewards
  const completedOrders = userOrders.filter(
    (o) => o.status === "delivered" || o.status === "confirmed" || o.status === "packed"
  ).length;
  const totalOrders = userOrders.length;
  const totalSpent = userOrders.reduce((sum, o) => {
    return ["cancelled", "canceled"].includes((o.status || "").toLowerCase())
      ? sum
      : sum + (o.total || 0);
  }, 0);

  const activeReturnsCount = returns.filter((r) =>
    ["requested", "under_review"].includes(r.status.toLowerCase())
  ).length;

  const loyaltyConfig = getLoyaltyConfig();
  const pointsPerTenRupees = loyaltyConfig.pointsPerTenRupees ?? 1;
  const rupeeValuePerPoint = loyaltyConfig.rupeeValuePerPoint ?? 0.1;

  const earnedPoints = Math.floor((totalSpent / 10) * pointsPerTenRupees);
  const bonusPoints = (dbUser as any).bonusPoints ?? 0;
  const totalPoints = earnedPoints + bonusPoints;
  const pointsRupeeValue = Math.floor(totalPoints * rupeeValuePerPoint);

  const silverTier = loyaltyConfig.tiers.find((t: any) => t.id === "silver") || { minSpend: 1500, name: "Silver Patron", badge: "✨ Silver" };
  const goldTier = loyaltyConfig.tiers.find((t: any) => t.id === "gold") || { minSpend: 5000, name: "Gold Connoisseur", badge: "👑 Gold" };
  const platinumTier = loyaltyConfig.tiers.find((t: any) => t.id === "platinum") || { minSpend: 12000, name: "Platinum Royal Club", badge: "💎 Platinum" };

  let currentTier = {
    id: "member",
    name: "Royal Mithai Member",
    badge: "🌿 Member",
    level: 0,
  };
  let nextTier: { id: string; name: string; minSpend: number; neededSpend: number; progressPercent: number } | null = null;

  if (totalSpent >= platinumTier.minSpend) {
    currentTier = { id: "platinum", name: platinumTier.name, badge: platinumTier.badge, level: 3 };
    nextTier = null;
  } else if (totalSpent >= goldTier.minSpend) {
    currentTier = { id: "gold", name: goldTier.name, badge: goldTier.badge, level: 2 };
    const needed = Math.max(0, platinumTier.minSpend - totalSpent);
    const range = platinumTier.minSpend - goldTier.minSpend;
    const progress = Math.min(100, Math.floor(((totalSpent - goldTier.minSpend) / range) * 100));
    nextTier = { id: "platinum", name: platinumTier.name, minSpend: platinumTier.minSpend, neededSpend: needed, progressPercent: progress };
  } else if (totalSpent >= silverTier.minSpend) {
    currentTier = { id: "silver", name: silverTier.name, badge: silverTier.badge, level: 1 };
    const needed = Math.max(0, goldTier.minSpend - totalSpent);
    const range = goldTier.minSpend - silverTier.minSpend;
    const progress = Math.min(100, Math.floor(((totalSpent - silverTier.minSpend) / range) * 100));
    nextTier = { id: "gold", name: goldTier.name, minSpend: goldTier.minSpend, neededSpend: needed, progressPercent: progress };
  } else {
    const needed = Math.max(0, silverTier.minSpend - totalSpent);
    const progress = Math.min(100, Math.floor((totalSpent / silverTier.minSpend) * 100));
    nextTier = { id: "silver", name: silverTier.name, minSpend: silverTier.minSpend, neededSpend: needed, progressPercent: progress };
  }

  const perks = (loyaltyConfig.perks || []).map((p: any) => {
    let isUnlocked = false;
    if (p.requiredTier === "silver" && currentTier.level >= 1) isUnlocked = true;
    if (p.requiredTier === "gold" && currentTier.level >= 2) isUnlocked = true;
    if (p.requiredTier === "platinum" && currentTier.level >= 3) isUnlocked = true;
    return {
      ...p,
      isUnlocked,
      status: isUnlocked ? "Active" : "Locked",
    };
  });

  // Parse preferences
  let preferences = {
    preferredTimeSlot: "evening",
    giftWrapping: false,
    dietaryPreference: "all",
    orderNotifications: true,
    offersNewsletter: true,
    savedPaymentMethods: [
      {
        id: "pm_upi_default",
        type: "upi",
        label: "HDFC Bank UPI",
        masked: "su••••@okhdfcbank",
        isDefault: true,
      },
    ],
  };
  if ((dbUser as any).preferences) {
    try {
      const parsed = typeof (dbUser as any).preferences === "string"
        ? JSON.parse((dbUser as any).preferences)
        : (dbUser as any).preferences;
      preferences = { ...preferences, ...parsed };
    } catch {}
  }

  const memberSince = dbUser.createdAt
    ? new Date(dbUser.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Sep 2026";

  const customerId = `VSM-CUST-${String(dbUser.id).padStart(4, "0")}`;

  const initialUser = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone || "",
    role: dbUser.role || "customer",
    status: dbUser.status || "active",
    avatarUrl: (dbUser as any).avatarUrl || null,
    customerId,
    memberSince,
    stats: {
      completedOrders,
      totalOrders,
      totalSpent,
      savedAddressesCount: userAddresses.length,
      activeReturnsCount,
    },
    rewards: {
      points: totalPoints,
      earnedPoints,
      bonusPoints,
      rupeeValue: pointsRupeeValue,
      tier: currentTier,
      nextTier,
      perks,
    },
    preferences,
  };

  const hasPassword = Boolean(dbUser.passwordHash && dbUser.passwordHash.length > 5);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[{ label: "My Account" }]} />
      <CustomerAccountPortal
        initialUser={initialUser}
        initialOrders={enrichedOrders}
        initialWishlist={enrichedWishlist}
        initialAddresses={userAddresses}
        hasPassword={hasPassword}
      />
    </main>
  );
}
