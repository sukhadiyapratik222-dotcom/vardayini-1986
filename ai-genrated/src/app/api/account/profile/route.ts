import { NextResponse } from "next/server";
import { eq, and, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { addresses, orders, returnRequests, users } from "@/db/schema";
import { getAuthUser, setAuthCookie } from "@/lib/auth";
import { sanitizeString } from "@/lib/security";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.id))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 1. Aggregate customer orders
  const userOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      dbUser.phone
        ? or(eq(orders.userId, dbUser.id), eq(orders.guestPhone, dbUser.phone))
        : eq(orders.userId, dbUser.id)
    );

  const completedOrders = userOrders.filter(
    (o) => o.status === "delivered" || o.status === "confirmed" || o.status === "packed"
  ).length;
  const totalOrders = userOrders.length;
  const totalSpent = userOrders.reduce((sum, o) => {
    return ["cancelled", "canceled"].includes((o.status || "").toLowerCase())
      ? sum
      : sum + (o.total || 0);
  }, 0);

  // 2. Fetch saved addresses count
  const userAddresses = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.userId, dbUser.id));

  // 3. Fetch active return requests count
  const userReturns = await db
    .select({ id: returnRequests.id, status: returnRequests.status })
    .from(returnRequests)
    .where(
      dbUser.phone
        ? or(eq(returnRequests.customerPhone, dbUser.phone), eq(returnRequests.customerEmail, dbUser.email))
        : eq(returnRequests.customerEmail, dbUser.email)
    );
  const activeReturnsCount = userReturns.filter((r) =>
    ["requested", "under_review"].includes(r.status.toLowerCase())
  ).length;

  // 4. Calculate loyalty rewards & tier progress
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

  // 5. Compute perks states
  const perkRank: Record<string, number> = { silver: 1, gold: 2, platinum: 3 };
  const evaluatedPerks = (loyaltyConfig.perks || []).map((p: any) => {
    const requiredRank = perkRank[p.requiredTier] ?? 1;
    const isUnlocked = currentTier.level >= requiredRank;
    return {
      ...p,
      isUnlocked,
      status: isUnlocked ? "Active" : "Locked",
    };
  });

  // 6. Parse preferences safely
  let userPreferences = {
    preferredTimeSlot: "Morning (9:00 AM – 1:00 PM)",
    giftWrapping: false,
    dietaryPreference: "eggless",
    orderNotifications: true,
    offersNewsletter: true,
    savedPaymentMethods: [
      { id: "pm_upi_1", type: "upi", label: "UPI", masked: `${dbUser.phone || "98250"}••••@okhdfcbank`, isDefault: true },
      { id: "pm_card_1", type: "card", label: "Debit Card", masked: "•••• •••• •••• 4242", isDefault: false },
    ],
  };

  if ((dbUser as any).preferences) {
    try {
      const parsed = JSON.parse((dbUser as any).preferences);
      if (parsed && typeof parsed === "object") {
        userPreferences = { ...userPreferences, ...parsed };
      }
    } catch {}
  }

  return NextResponse.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: dbUser.role,
      status: dbUser.status,
      avatarUrl: (dbUser as any).avatarUrl || null,
      customerId: `VSM-CUST-${String(dbUser.id).padStart(4, "0")}`,
      createdAt: dbUser.createdAt,
      memberSince: new Date(dbUser.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
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
        perks: evaluatedPerks,
        rules: {
          pointsPerTenRupees,
          rupeeValuePerPoint,
        },
      },
      preferences: userPreferences,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawName = sanitizeString(body?.name || "").trim();
    const rawEmail = sanitizeString(body?.email || "").trim().toLowerCase();
    const rawPhone = sanitizeString(body?.phone || "").trim();
    const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : undefined;
    const incomingPreferences = body?.preferences;

    if (rawName && rawName.length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    // Email validation if provided
    let finalEmail = auth.email;
    if (rawEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address." },
          { status: 400 }
        );
      }
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, rawEmail), ne(users.id, auth.id)))
        .limit(1);

      if (existingUser) {
        return NextResponse.json(
          { error: "This email address is already in use by another account." },
          { status: 409 }
        );
      }
      finalEmail = rawEmail;
    }

    // Phone validation if provided
    let finalPhone = auth.phone;
    if (rawPhone) {
      const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
      if (cleanPhone.length !== 10) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit Indian mobile number." },
          { status: 400 }
        );
      }
      finalPhone = cleanPhone;
    }

    // Existing preferences merge
    const [existing] = await db.select().from(users).where(eq(users.id, auth.id)).limit(1);
    let currentPrefs = {};
    if ((existing as any)?.preferences) {
      try {
        currentPrefs = JSON.parse((existing as any).preferences);
      } catch {}
    }
    const finalPreferences = incomingPreferences
      ? JSON.stringify({ ...currentPrefs, ...incomingPreferences })
      : (existing as any)?.preferences || null;

    const updatePayload: any = {
      name: rawName || auth.name,
      email: finalEmail,
      phone: finalPhone,
      preferences: finalPreferences,
    };
    if (avatarUrl !== undefined) {
      updatePayload.avatarUrl = avatarUrl;
    }

    await db.update(users).set(updatePayload).where(eq(users.id, auth.id));

    // Sync with session cookie
    await setAuthCookie(auth.id, {
      name: updatePayload.name,
      email: finalEmail,
      phone: finalPhone,
      role: auth.role,
    });

    return NextResponse.json({
      success: true,
      message: "Customer profile and preferences updated successfully!",
      user: {
        id: auth.id,
        name: updatePayload.name,
        email: finalEmail,
        phone: finalPhone,
        avatarUrl: updatePayload.avatarUrl,
        preferences: incomingPreferences ? { ...currentPrefs, ...incomingPreferences } : currentPrefs,
      },
    });
  } catch (err: any) {
    console.error("[Profile Update Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}

export async function POST(request: Request) {
  return PUT(request);
}
