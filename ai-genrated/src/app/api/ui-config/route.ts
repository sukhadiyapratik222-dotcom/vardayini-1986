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
}).strict();

const HeroSettingsSchema = z.object({
  autoScroll: z.boolean().optional(),
  intervalSeconds: z.number().positive().optional(),
}).strict();

const AnnouncementSectionSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  text: z.string().optional(),
  linkText: z.string().optional(),
  linkUrl: z.string().optional(),
}).strict();

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
}).strict();

const PromotionsSchema = z.object({
  couponCode: z.string().optional(),
  discountPercent: z.number().nonnegative().optional(),
  minOrder: z.number().nonnegative().optional(),
  freeDeliveryThreshold: z.number().nonnegative().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
}).strict();

const LogoSchema = z.object({
  type: z.enum(["crest", "image"]).optional(),
  crestLetter: z.string().optional(),
  crestBgColor: z.string().optional(),
  crestBorderColor: z.string().optional(),
  crestTextColor: z.string().optional(),
  imageUrl: z.string().optional(),
  brandName: z.string().optional(),
  brandSubtitle: z.string().optional(),
}).strict();

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
}).strict();

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
}).strict();

const SpecialItemsSchema = z.object({
  enabled: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  productIds: z.array(z.number()).optional(),
  linkText: z.string().optional(),
  linkUrl: z.string().optional(),
}).strict();

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
}).strict();

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
    const data = JSON.parse(raw);
    return NextResponse.json(data);
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

  const body = await readJsonSafe(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
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

    await fs.writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return NextResponse.json({ success: true, config: updated }, { status: 200 });
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
