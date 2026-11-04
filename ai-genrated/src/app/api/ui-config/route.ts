import { NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";

export const dynamic = "force-dynamic";

function resolveConfigPath(): string {
  const candidates = [
    path.join(process.cwd(), "src", "data", "ui-config.json"),
    path.join(process.cwd(), "ai-genrated", "src", "data", "ui-config.json"),
  ];
  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }
  return candidates[0];
}

const CONFIG_PATH = resolveConfigPath();

const HeroPhotoSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  category: z.string().optional(),
  active: z.boolean(),
  order: z.number(),
}).passthrough();

const HeroSettingsSchema = z.object({
  autoScroll: z.boolean().optional(),
  intervalSeconds: z.number().positive().optional(),
}).passthrough();

const AnnouncementSectionSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  text: z.string().optional(),
  linkText: z.string().optional(),
  linkUrl: z.string().optional(),
}).passthrough();

const StoreInfoSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  established: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  hours: z.string().optional(),
}).passthrough();

const PromotionsSchema = z.object({
  couponCode: z.string().optional(),
  discountPercent: z.number().nonnegative().optional(),
  minOrder: z.number().nonnegative().optional(),
  freeDeliveryThreshold: z.number().nonnegative().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
}).passthrough();

const LogoSchema = z.object({
  type: z.enum(["crest", "image"]).optional(),
  crestLetter: z.string().optional(),
  crestBgColor: z.string().optional(),
  crestBorderColor: z.string().optional(),
  crestTextColor: z.string().optional(),
  imageUrl: z.string().optional(),
  brandName: z.string().optional(),
  brandSubtitle: z.string().optional(),
}).passthrough();

const HeroContentSchema = z.object({
  badgeEst: z.string().optional(),
  badgeText: z.string().optional(),
  titlePrefix: z.string().optional(),
  titleHighlight1: z.string().optional(),
  titleMiddle: z.string().optional(),
  titleHighlight2: z.string().optional(),
  description: z.string().optional(),
  button1Text: z.string().optional(),
  button1Link: z.string().optional(),
  button2Text: z.string().optional(),
  button2Link: z.string().optional(),
  stat1Value: z.string().optional(),
  stat1Label: z.string().optional(),
  stat2Value: z.string().optional(),
  stat2Label: z.string().optional(),
  stat3Value: z.string().optional(),
  stat3Label: z.string().optional(),
}).passthrough();

const HeritageBannerSchema = z.object({
  enabled: z.boolean().optional(),
  topBadgeGujarati: z.string().optional(),
  topBadgeEnglish: z.string().optional(),
  titleLine1: z.string().optional(),
  titleLine2: z.string().optional(),
  showTextOverlay: z.boolean().optional(),
  button1Text: z.string().optional(),
  button1Link: z.string().optional(),
  button2Text: z.string().optional(),
  button2Link: z.string().optional(),
  bannerImage: z.string().optional(),
}).passthrough();

const SpecialItemsSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  productIds: z.array(z.number()).optional(),
  linkText: z.string().optional(),
  linkUrl: z.string().optional(),
}).passthrough();

const FestivalHeroSchema = z.object({
  badgeText: z.string().optional(),
  phone: z.string().optional(),
  titlePrefix: z.string().optional(),
  titleHighlight: z.string().optional(),
  subtitle: z.string().optional(),
  button1Text: z.string().optional(),
  button1Link: z.string().optional(),
  button2Text: z.string().optional(),
  button2Link: z.string().optional(),
  trustPills: z.array(z.object({
    icon: z.string(),
    text: z.string(),
  })).optional(),
  couponPromo: z.object({
    enabled: z.boolean().optional(),
    text: z.string().optional(),
    code: z.string().optional(),
  }).optional(),
}).passthrough().optional();

const FestivalSectionItemSchema = z.object({
  id: z.string(),
  tabLabel: z.string(),
  tabIcon: z.string(),
  tabGujarati: z.string(),
  categoryTag: z.string(),
  title: z.string(),
  subtitle: z.string(),
  viewAllText: z.string(),
  festivalIds: z.array(z.string()),
  enabled: z.boolean().optional(),
  order: z.number().optional(),
  backgroundImage: z.string().optional(),
}).passthrough();

const FestivalTrustPerkSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
}).passthrough();

const FestivalCorporateGiftingSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  whatsappNumber: z.string().optional(),
  whatsappText: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneLabel: z.string().optional(),
}).passthrough().optional();

const FestivalProductSchema = z.object({
  id: z.number(),
  dbProductId: z.number().optional(),
  dbVariantId: z.number().optional(),
  name: z.string(),
  gujaratiName: z.string().optional(),
  badge: z.string().optional(),
  festivalId: z.string(),
  festivalName: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number(),
  comparePrice: z.number().optional(),
  weight: z.string().optional(),
  stock: z.number().optional(),
  tags: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
}).passthrough();

const FestivalPageSchema = z.object({
  hero: FestivalHeroSchema.optional(),
  sections: z.array(FestivalSectionItemSchema).optional(),
  trustPerks: z.array(FestivalTrustPerkSchema).optional(),
  corporateGifting: FestivalCorporateGiftingSchema.optional(),
  customProducts: z.array(FestivalProductSchema).optional(),
}).passthrough().optional();

const BrowseByCategoryCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  itemCount: z.string(),
  imageUrl: z.string(),
  href: z.string(),
  active: z.boolean().optional(),
}).passthrough();

const BrowseByCategorySchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  linkText: z.string().optional(),
  linkUrl: z.string().optional(),
  cards: z.array(BrowseByCategoryCardSchema).optional(),
}).passthrough().optional();

const BestsellerCardItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  badge: z.string(),
  description: z.string(),
  price: z.number(),
  weight: z.string(),
  imageUrl: z.string(),
  variantId: z.number().optional(),
  active: z.boolean().optional(),
}).passthrough();

const BestsellersSectionSchema = z.object({
  enabled: z.boolean().optional(),
  autoCalculateFromSales: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  viewAllText: z.string().optional(),
  viewAllUrl: z.string().optional(),
  items: z.array(BestsellerCardItemSchema).optional(),
  realSalesRankings: z.array(BestsellerCardItemSchema).optional(),
}).passthrough().optional();

const WelcomeOfferSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  couponCode: z.string().optional(),
  discountPercent: z.number().optional(),
}).passthrough().optional();

const TestimonialItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  rating: z.number(),
  quote: z.string(),
  productName: z.string().optional(),
  isVerified: z.boolean().optional(),
  active: z.boolean().optional(),
}).passthrough();

const TestimonialsSectionSchema = z.object({
  enabled: z.boolean().optional(),
  autoShowRealReviews: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  showTrustBadge: z.boolean().optional(),
  trustBadgeText: z.string().optional(),
  reviews: z.array(TestimonialItemSchema).optional(),
  realDbReviews: z.array(TestimonialItemSchema).optional(),
}).passthrough().optional();

const NewLaunchPageSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  tickerTexts: z.array(z.string()).optional(),
}).passthrough().optional();

const CulinaryPillarItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
}).passthrough();

const CulinaryPillarsSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  pillars: z.array(CulinaryPillarItemSchema).optional(),
}).passthrough().optional();

const UiConfigUpdateSchema = z.object({
  heroPhotos: z.array(HeroPhotoSchema).optional(),
  heroSettings: HeroSettingsSchema.optional(),
  announcement: AnnouncementSectionSchema.optional(),
  announcements: AnnouncementSectionSchema.optional(),
  storeInfo: StoreInfoSchema.optional(),
  promotions: PromotionsSchema.optional(),
  logo: LogoSchema.optional(),
  heroContent: HeroContentSchema.optional(),
  heritageBanner: HeritageBannerSchema.optional(),
  specialItems: SpecialItemsSchema.optional(),
  festivalPage: FestivalPageSchema.optional(),
  browseByCategory: BrowseByCategorySchema.optional(),
  bestsellersSection: BestsellersSectionSchema.optional(),
  welcomeOffer: WelcomeOfferSchema.optional(),
  testimonialsSection: TestimonialsSectionSchema.optional(),
  newLaunchPage: NewLaunchPageSchema.optional(),
  culinaryPillars: CulinaryPillarsSchema.optional(),
}).passthrough();

function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else {
      output[key] = sourceVal;
    }
  }
  return output;
}

export async function GET() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    let data = JSON.parse(raw);

    // Merge MongoDB Atlas stored custom settings if present
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const doc = await mongo.collection("settings").findOne({ key: "ui_config" });
        if (doc?.value && typeof doc.value === "object") {
          data = deepMerge(data, doc.value);
        }
      }
    } catch (mErr) {
      console.warn("[UI Config] MongoDB read notice:", mErr);
    }

    // Attach dynamic live sales rankings to bestsellersSection
    try {
      const { getRealTopSellingProducts } = await import("@/lib/products");
      const realTopSellers = await getRealTopSellingProducts(8);
      if (data.bestsellersSection) {
        data.bestsellersSection.realSalesRankings = realTopSellers;
        if (data.bestsellersSection.autoCalculateFromSales !== false && realTopSellers.length > 0) {
          data.bestsellersSection.items = realTopSellers.slice(0, 4);
        }
      }
    } catch (e) {
      console.warn("[UI Config] Could not load live sales rankings:", e);
    }

    // Attach dynamic real database customer reviews to testimonialsSection (newest first)
    try {
      const { db } = await import("@/db");
      const { reviews, users, products, addresses } = await import("@/db/schema");
      const { desc, eq, sql } = await import("drizzle-orm");

      const rows = await db
        .select({
          id: reviews.id,
          productId: reviews.productId,
          productName: products.name,
          rating: reviews.rating,
          comment: reviews.comment,
          isVerified: reviews.isVerified,
          createdAt: reviews.createdAt,
          name: sql<string>`coalesce(${users.name}, ${reviews.userName}, 'Customer')`,
          city: sql<string>`coalesce(${addresses.city}, 'Gujarat')`,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(products, eq(reviews.productId, products.id))
        .leftJoin(addresses, eq(users.id, addresses.userId))
        .orderBy(desc(reviews.createdAt), desc(reviews.id));

      const seen = new Set<number>();
      const realReviews = rows
        .filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        })
        .map((r) => ({
          id: String(r.id),
          name: r.name,
          location: r.city,
          rating: r.rating,
          quote: r.comment,
          productName: r.productName || undefined,
          isVerified: r.isVerified ?? true,
          active: true,
          createdAt: r.createdAt
            ? typeof r.createdAt === "string"
              ? r.createdAt
              : new Date(r.createdAt).toISOString()
            : new Date().toISOString(),
        }));

      if (data.testimonialsSection) {
        data.testimonialsSection.realDbReviews = realReviews;
        if (data.testimonialsSection.autoShowRealReviews !== false && realReviews.length > 0) {
          data.testimonialsSection.reviews = realReviews;
        }
      }
    } catch (e) {
      console.warn("[UI Config] Could not load real database reviews:", e);
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[UI Config] Read error:", error);
    return NextResponse.json(
      { error: "Failed to read UI config" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return auth.error;
  }

  const body = await readJsonSafe<Record<string, unknown>>(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Super Admin Policy Lock: Customer Bestsellers is strictly restricted to Super Admin
  if (body.bestsellersSection !== undefined && auth.user.role !== "super_admin") {
    return NextResponse.json(
      {
        error:
          "Forbidden: Customer Bestsellers configuration is restricted to Super Admin only. Standard administrators cannot modify this section.",
      },
      { status: 403 }
    );
  }

  // Super Admin Policy Lock: Customer Testimonials is strictly restricted to Super Admin
  if (body.testimonialsSection !== undefined && auth.user.role !== "super_admin") {
    return NextResponse.json(
      {
        error:
          "Forbidden: Customer Testimonials configuration is restricted to Super Admin only. Standard administrators cannot modify this section.",
      },
      { status: 403 }
    );
  }

  if (auth.user.role === "admin" && auth.user.accessType === "custom") {
    const perms = auth.user.permissions || [];
    const hasWildcard = perms.includes("*");
    const hasSettings = perms.includes("settings:manage") || hasWildcard;

    for (const key of Object.keys(body)) {
      if (hasSettings) break;

      if ((key === "storeInfo" || key === "branding") && !perms.includes("branding:manage")) {
        return NextResponse.json({ error: "Forbidden: Logo & Identity management permission required" }, { status: 403 });
      }
      if ((key === "heroPhotos" || key === "heroSettings" || key === "heroContent") && !perms.includes("hero:manage")) {
        return NextResponse.json({ error: "Forbidden: Hero Banner management permission required" }, { status: 403 });
      }
      if ((key === "announcement" || key === "announcements") && !perms.includes("announcements:manage")) {
        return NextResponse.json({ error: "Forbidden: Banners & Promos management permission required" }, { status: 403 });
      }
      if (key === "welcomeOffer" && !perms.includes("welcome_offer:manage")) {
        return NextResponse.json({ error: "Forbidden: Welcome Offer management permission required" }, { status: 403 });
      }
      if (key === "specialItems" && !perms.includes("special_items:manage") && !perms.includes("products:manage")) {
        return NextResponse.json({ error: "Forbidden: Special Items management permission required" }, { status: 403 });
      }
      if (key === "festivalPage" && !perms.includes("festivals:manage")) {
        return NextResponse.json({ error: "Forbidden: Festival Specials management permission required" }, { status: 403 });
      }
      if (key === "newLaunchPage" && !perms.includes("new_launches:manage")) {
        return NextResponse.json({ error: "Forbidden: New Launches management permission required" }, { status: 403 });
      }
      if (key === "browseByCategory" && !perms.includes("categories:manage") && !perms.includes("products:manage")) {
        return NextResponse.json({ error: "Forbidden: Categories management permission required" }, { status: 403 });
      }
    }
  }

  const validation = UiConfigUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed: unknown or mistyped fields" },
      { status: 400 }
    );
  }

  // If current file cannot be read or parsed, stop the write immediately
  let currentData: any;
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    currentData = JSON.parse(raw);
  } catch (readErr) {
    console.error("[UI Config] Cannot read existing configuration; write aborted:", readErr);
    return NextResponse.json(
      { error: "Configuration read failure; write aborted" },
      { status: 500 }
    );
  }

  try {
    const normalizedBody = { ...validation.data };
    if (normalizedBody.announcements && !normalizedBody.announcement) {
      normalizedBody.announcement = normalizedBody.announcements;
      delete normalizedBody.announcements;
    }

    const updated = deepMerge(currentData, normalizedBody);

    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    } catch (fsErr) {
      console.warn("[UI Config] Local filesystem write notice (expected on Vercel):", fsErr);
    }

    // Also sync to MongoDB settings collection if available
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const db = await getMongoDb();
      if (db) {
        await db.collection("settings").updateOne(
          { key: "ui_config" },
          { $set: { key: "ui_config", value: updated, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } catch (mErr) {
      console.warn("[UI Config] MongoDB sync notice:", mErr);
    }

    return NextResponse.json(
      { success: true, config: updated },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[UI Config] Write error:", error);
    return NextResponse.json(
      { error: "Failed to update UI config" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return PUT(req);
}
