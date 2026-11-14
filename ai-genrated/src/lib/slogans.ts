/**
 * Vardayini Sweets - Weekly Slogan & Sweet of the Week Engine
 * Complete IST (Asia/Kolkata) Calendar calculations, text highlight parsing,
 * active slogan resolution, auto-rotation fallback, and analytics helpers.
 */

import { db, getSqliteDb } from "@/db";
import {
  slogans,
  sloganSettings,
  sloganTemplates,
  sloganAnalytics,
  products,
  productVariants,
  categories,
} from "@/db/schema";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import { unitPrice } from "./money";

export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
}

export interface FeaturedSweetDetails {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  weight: string;
  stock: number;
  inStock: boolean;
  categoryName: string;
  badge: string;
}

export interface WeeklySloganPayload {
  id: number;
  text: string;
  highlightSegments: HighlightSegment[];
  subText: string;
  textHi?: string | null;
  subTextHi?: string | null;
  textGu?: string | null;
  subTextGu?: string | null;
  themeColor: string;
  bgStyle: string;
  buttonText: string;
  buttonLink: string;
  storyLine: string;
  badges: string[];
  startAt: string;
  endAt: string;
  weekLabel: string;
  status: string;
  sweet: FeaturedSweetDetails;
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    label: string;
  };
  settings: {
    enabled: boolean;
    location: string;
    showCountdown: boolean;
    showPastArchive: boolean;
    showShareButton: boolean;
    showAnnouncementStrip: boolean;
    autoRotateEnabled: boolean;
  };
  isFallback: boolean;
}

// ==========================================
// 1. IST (Asia/Kolkata) Date & Week Calculations
// ==========================================

export function getNowInIST(): Date {
  // Current UTC time offset to IST (+05:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

export function getISTWeekBoundaries(date?: Date): {
  startAt: Date;
  endAt: Date;
  startIso: string;
  endIso: string;
  label: string;
  weekNumber: number;
  year: number;
} {
  const d = date ? new Date(date) : getNowInIST();
  
  // Day of week: 0 (Sun), 1 (Mon), ..., 6 (Sat)
  const day = d.getDay();
  // Distance to Monday (if Sunday (0), back 6 days; if Mon (1), back 0 days)
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // ISO strings format for DB comparison (YYYY-MM-DD HH:mm:ss)
  const pad = (n: number) => String(n).padStart(2, "0");
  const toIsoStr = (target: Date) =>
    `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())} ${pad(target.getHours())}:${pad(target.getMinutes())}:${pad(target.getSeconds())}`;

  // Month formatter in Indian English
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = monthNames[monday.getMonth()];
  const endMonth = monthNames[sunday.getMonth()];
  const year = sunday.getFullYear();

  const label =
    startMonth === endMonth
      ? `${startDay} to ${endDay} ${startMonth} ${year}`
      : `${startDay} ${startMonth} to ${endDay} ${endMonth} ${year}`;

  // Week number of year
  const firstJan = new Date(monday.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((monday.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);

  return {
    startAt: monday,
    endAt: sunday,
    startIso: toIsoStr(monday),
    endIso: toIsoStr(sunday),
    label,
    weekNumber,
    year,
  };
}

export function formatISTDateRange(start: Date | string, end: Date | string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const sDay = startDate.getDate();
  const eDay = endDate.getDate();
  const sMonth = monthNames[startDate.getMonth()];
  const eMonth = monthNames[endDate.getMonth()];
  const year = endDate.getFullYear();

  if (sMonth === eMonth) {
    return `${sDay} to ${eDay} ${sMonth} ${year}`;
  }
  return `${sDay} ${sMonth} to ${eDay} ${eMonth} ${year}`;
}

export function getCountdownToSundayMidnightIST(now?: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  label: string;
} {
  const istNow = now || getNowInIST();
  const { endAt } = getISTWeekBoundaries(istNow);
  
  const diffMs = Math.max(0, endAt.getTime() - istNow.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const label = `${days}d ${hours}h ${minutes}m`;
  return { days, hours, minutes, seconds, totalSeconds, label };
}

// ==========================================
// 2. Highlighting Parser: Asterisks to Gold Accent
// ==========================================

export function parseHighlightedSlogan(rawText: string): HighlightSegment[] {
  if (!rawText) return [];

  const segments: HighlightSegment[] = [];
  const parts = rawText.split("*");

  for (let i = 0; i < parts.length; i++) {
    const text = parts[i];
    if (text.length === 0) continue;
    // Odd indices between asterisks are highlighted
    const isHighlight = i % 2 === 1;
    segments.push({ text, isHighlight });
  }

  return segments;
}

// ==========================================
// 3. Featured Sweet Hydration Helper
// ==========================================

export async function hydrateSweetDetails(productId: number | null): Promise<FeaturedSweetDetails> {
  const defaultFallback: FeaturedSweetDetails = {
    id: 1,
    name: "Kaju Katli (Royal Silver Foil)",
    slug: "kaju-katli",
    imageUrl: "/images/kaju-katli.jpg",
    price: 340,
    originalPrice: 380,
    weight: "250g",
    stock: 50,
    inStock: true,
    categoryName: "Kaju Sweets",
    badge: "100% Desi Ghee",
  };

  if (!productId) return defaultFallback;

  try {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: products.imageUrl,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return defaultFallback;

    // Fetch primary variant
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.price))
      .limit(1);

    const price = variant ? unitPrice(variant.price, variant.discountedPrice) : 340;
    const originalPrice = variant && variant.discountedPrice && variant.price > price ? variant.price : Math.round(price * 1.15);
    const weight = variant?.weight || "250g";
    const stock = Number(variant?.stock ?? 45);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl || "/images/kaju-katli.jpg",
      price,
      originalPrice,
      weight,
      stock,
      inStock: stock > 0,
      categoryName: product.categoryName || "Traditional Sweets",
      badge: "Sweet of the Week",
    };
  } catch (err) {
    console.warn("[Weekly Slogan] Hydrate sweet error:", err);
    return defaultFallback;
  }
}

// ==========================================
// 4. Active Slogan Engine (Never Empty)
// ==========================================

export async function getActiveWeeklySlogan(): Promise<WeeklySloganPayload | null> {
  const istNow = getNowInIST();
  const currentBoundaries = getISTWeekBoundaries(istNow);
  const nowIso = currentBoundaries.startIso; // or current timestamp

  // 1. Fetch Global Settings
  let settings = {
    enabled: true,
    location: "between_categories_bestsellers",
    showCountdown: true,
    showPastArchive: true,
    showShareButton: true,
    showAnnouncementStrip: true,
    autoRotateEnabled: true,
    rotationMode: "sequential",
    fallbackSloganText: "Pure *Desi Ghee*. Pure *Tradition*. Handcrafted in Vadodara.",
    fallbackSubText: "Experience our royal Shuddh Desi Ghee sweets fresh from our morning bhatti.",
    fallbackProductId: 1,
  };

  try {
    const [dbSettings] = await db.select().from(sloganSettings).limit(1);
    if (dbSettings) {
      settings = {
        enabled: dbSettings.enabled !== false,
        location: dbSettings.location || "between_categories_bestsellers",
        showCountdown: dbSettings.showCountdown !== false,
        showPastArchive: dbSettings.showPastArchive !== false,
        showShareButton: dbSettings.showShareButton !== false,
        showAnnouncementStrip: dbSettings.showAnnouncementStrip !== false,
        autoRotateEnabled: dbSettings.autoRotateEnabled !== false,
        rotationMode: dbSettings.rotationMode || "sequential",
        fallbackSloganText: dbSettings.fallbackSloganText || settings.fallbackSloganText,
        fallbackSubText: dbSettings.fallbackSubText || settings.fallbackSubText,
        fallbackProductId: dbSettings.fallbackProductId || 1,
      };
    }
  } catch (err) {
    console.warn("[Weekly Slogan] Settings fetch error:", err);
  }

  if (!settings.enabled) {
    return null;
  }

  // 2. Query for scheduled or active slogan matching current IST week
  let activeSloganRow: any = null;
  let isFallback = false;

  try {
    const sqlite = getSqliteDb();
    
    // Exact week window match or currently active
    const candidate = sqlite.prepare(`
      SELECT * FROM slogans 
      WHERE (status = 'active' OR status = 'scheduled')
        AND (
          (datetime('now', '+5 hours', '30 minutes') BETWEEN start_at AND end_at)
          OR (start_at <= datetime('now', '+5 hours', '30 minutes') AND end_at >= datetime('now', '+5 hours', '30 minutes'))
          OR (status = 'active')
        )
      ORDER BY 
        CASE WHEN status = 'active' THEN 1 ELSE 2 END,
        start_at DESC
      LIMIT 1
    `).get() as any;

    if (candidate) {
      activeSloganRow = candidate;
    }
  } catch (err) {
    console.warn("[Weekly Slogan] Active candidate lookup error:", err);
  }

  // 3. Fallback / Auto-rotation if no scheduled slogan for this week
  if (!activeSloganRow && settings.autoRotateEnabled) {
    try {
      const sqlite = getSqliteDb();
      const allSlogans = sqlite.prepare(`
        SELECT * FROM slogans 
        WHERE status != 'archived' AND status != 'draft'
        ORDER BY id ASC
      `).all() as any[];

      if (allSlogans && allSlogans.length > 0) {
        // Week number cyclically selects the next slogan
        const weekIdx = currentBoundaries.weekNumber % allSlogans.length;
        activeSloganRow = allSlogans[weekIdx] || allSlogans[0];
      }
    } catch (autoErr) {
      console.warn("[Weekly Slogan] Auto-rotation notice:", autoErr);
    }
  }

  // 4. Default Hard Fallback so section is NEVER empty
  if (!activeSloganRow) {
    isFallback = true;
    activeSloganRow = {
      id: 99999,
      text: settings.fallbackSloganText,
      sub_text: settings.fallbackSubText,
      product_id: settings.fallbackProductId || 1,
      theme_color: "#dfb755",
      bg_style: "glass_aurora",
      button_text: "Shop Sweet of the Week →",
      button_link: "/shop",
      story_line: "Handcrafted in our Vadodara kitchen daily with pure Gir cow desi ghee.",
      badges_json: JSON.stringify(["100% Desi Ghee", "Handcrafted", "Made Fresh Daily", "Silver Leaf"]),
      start_at: currentBoundaries.startIso,
      end_at: currentBoundaries.endIso,
      status: "active",
    };
  }

  // 5. Parse Badges
  let badges: string[] = ["100% Desi Ghee", "Handcrafted Daily", "Vadodara Heritage"];
  try {
    const rawBadges = activeSloganRow.badges_json || activeSloganRow.badgesJson;
    if (rawBadges) {
      badges = typeof rawBadges === "string" ? JSON.parse(rawBadges) : rawBadges;
    }
  } catch {}

  // 6. Hydrate sweet details
  const sweet = await hydrateSweetDetails(activeSloganRow.product_id || activeSloganRow.productId);

  // 7. Calculate countdown to Sunday midnight IST
  const countdown = getCountdownToSundayMidnightIST(istNow);

  // 8. Parse Highlight Segments (*word* -> gold highlight)
  const sloganText = activeSloganRow.text || "Pure *Desi Ghee*. Pure *Love*.";
  const highlightSegments = parseHighlightedSlogan(sloganText);

  // 9. Date Range Label
  const startAt = activeSloganRow.start_at || activeSloganRow.startAt || currentBoundaries.startIso;
  const endAt = activeSloganRow.end_at || activeSloganRow.endAt || currentBoundaries.endIso;
  const weekLabel = formatISTDateRange(startAt, endAt);

  return {
    id: activeSloganRow.id,
    text: sloganText,
    highlightSegments,
    subText: activeSloganRow.sub_text || activeSloganRow.subText || "A hundred memories in every bite of our fresh royal mithai.",
    textHi: activeSloganRow.text_hi || activeSloganRow.textHi || null,
    subTextHi: activeSloganRow.sub_text_hi || activeSloganRow.subTextHi || null,
    textGu: activeSloganRow.text_gu || activeSloganRow.textGu || null,
    subTextGu: activeSloganRow.sub_text_gu || activeSloganRow.subTextGu || null,
    themeColor: activeSloganRow.theme_color || activeSloganRow.themeColor || "#dfb755",
    bgStyle: activeSloganRow.bg_style || activeSloganRow.bgStyle || "glass_aurora",
    buttonText: activeSloganRow.button_text || activeSloganRow.buttonText || `Shop ${sweet.name} →`,
    buttonLink: activeSloganRow.button_link || activeSloganRow.buttonLink || `/shop/${sweet.slug}`,
    storyLine: activeSloganRow.story_line || activeSloganRow.storyLine || "Made with 100% pure desi ghee, freshly ground aromatic cardamoms, and four decades of Gujarati craft.",
    badges,
    startAt,
    endAt,
    weekLabel,
    status: activeSloganRow.status || "active",
    sweet,
    countdown,
    settings: {
      enabled: settings.enabled,
      location: settings.location,
      showCountdown: settings.showCountdown,
      showPastArchive: settings.showPastArchive,
      showShareButton: settings.showShareButton,
      showAnnouncementStrip: settings.showAnnouncementStrip,
      autoRotateEnabled: settings.autoRotateEnabled,
    },
    isFallback,
  };
}

/**
 * 10. Get Past Slogans Archive (For modal & customer discovery)
 */
export async function getPastSlogansArchive(limit: number = 20) {
  try {
    const sqlite = getSqliteDb();
    const rows = sqlite
      .prepare(`
        SELECT s.*, p.name as product_name, p.slug as product_slug, p.image_url as product_image_url
        FROM slogans s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE s.status = 'expired' OR s.end_at < datetime('now', '+5 hours', '30 minutes')
        ORDER BY s.end_at DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    const archive = [];
    for (const r of rows) {
      const sweet = await hydrateSweetDetails(r.product_id);
      archive.push({
        id: r.id,
        text: r.text,
        subText: r.sub_text,
        themeColor: r.theme_color || "#dfb755",
        weekLabel: formatISTDateRange(r.start_at, r.end_at),
        startAt: r.start_at,
        endAt: r.end_at,
        sweet: {
          name: sweet.name,
          slug: sweet.slug,
          imageUrl: sweet.imageUrl,
          price: sweet.price,
        },
      });
    }

    return archive;
  } catch (err) {
    console.error("[getPastSlogansArchive] error:", err);
    return [];
  }
}

/**
 * 11. Record Slogan Metric (Views, Clicks, Add To Cart)
 */
export async function recordSloganMetric(
  sloganId: number,
  eventType: "view" | "click" | "add_to_cart"
) {
  try {
    const sqlite = getSqliteDb();

    // Check if analytics row exists
    const existing = sqlite
      .prepare("SELECT * FROM slogan_analytics WHERE slogan_id = ?")
      .get(sloganId) as any;

    if (!existing) {
      sqlite
        .prepare(`
          INSERT INTO slogan_analytics (slogan_id, views_count, clicks_count, add_to_cart_count, last_tracked_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `)
        .run(
          sloganId,
          eventType === "view" ? 1 : 0,
          eventType === "click" ? 1 : 0,
          eventType === "add_to_cart" ? 1 : 0
        );
    } else {
      const col =
        eventType === "view"
          ? "views_count"
          : eventType === "click"
          ? "clicks_count"
          : "add_to_cart_count";

      sqlite
        .prepare(`
          UPDATE slogan_analytics 
          SET ${col} = ${col} + 1, last_tracked_at = datetime('now')
          WHERE slogan_id = ?
        `)
        .run(sloganId);
    }
  } catch (err) {
    console.error("[recordSloganMetric] error:", err);
  }
}

/**
 * 12. Check for Schedule Conflict
 */
export async function checkScheduleConflict(
  startAt: string,
  endAt: string,
  excludeId?: number
): Promise<{ id: number; text: string; startAt: string; endAt: string } | null> {
  try {
    const sqlite = getSqliteDb();
    let query = `
      SELECT id, text, start_at, end_at 
      FROM slogans
      WHERE (status = 'active' OR status = 'scheduled')
        AND NOT (end_at <= ? OR start_at >= ?)
    `;
    const params: any[] = [startAt, endAt];

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    const conflict = sqlite.prepare(query).get(...params) as any;
    if (conflict) {
      return {
        id: conflict.id,
        text: conflict.text,
        startAt: conflict.start_at,
        endAt: conflict.end_at,
      };
    }
    return null;
  } catch (err) {
    console.warn("[checkScheduleConflict] error:", err);
    return null;
  }
}

/**
 * 13. Get All Slogans Admin
 */
export async function getAllSlogansAdmin() {
  const sqlite = getSqliteDb();

  const rawRows = sqlite
    .prepare(`
      SELECT 
        s.*,
        p.name as product_name,
        p.slug as product_slug,
        p.image_url as product_image_url,
        COALESCE(a.views_count, 0) as views_count,
        COALESCE(a.clicks_count, 0) as clicks_count,
        COALESCE(a.add_to_cart_count, 0) as add_to_cart_count
      FROM slogans s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN slogan_analytics a ON s.id = a.slogan_id
      ORDER BY 
        CASE 
          WHEN s.status = 'active' THEN 1
          WHEN s.status = 'scheduled' THEN 2
          WHEN s.status = 'draft' THEN 3
          ELSE 4
        END,
        s.start_at DESC
    `)
    .all() as any[];

  let activeSlogan: any = null;
  const slogansList = [];

  let totalViews = 0;
  let totalClicks = 0;
  let totalAddToCart = 0;
  let activeCount = 0;
  let scheduledCount = 0;
  let draftCount = 0;
  let expiredCount = 0;

  for (const r of rawRows) {
    let badges: string[] = [];
    try {
      if (r.badges_json) badges = JSON.parse(r.badges_json);
    } catch {}

    const item = {
      id: r.id,
      text: r.text,
      subText: r.sub_text,
      textHi: r.text_hi,
      subTextHi: r.sub_text_hi,
      textGu: r.text_gu,
      subTextGu: r.sub_text_gu,
      productId: r.product_id,
      productName: r.product_name || "Handcrafted Sweet",
      productSlug: r.product_slug || "kaju-katli",
      productImageUrl: r.product_image_url || "/images/kaju-katli.jpg",
      customImageUrl: r.custom_image_url,
      themeColor: r.theme_color || "#dfb755",
      bgStyle: r.bg_style || "glass_aurora",
      buttonText: r.button_text || "Shop Sweet of the Week →",
      buttonLink: r.button_link || `/shop/${r.product_slug || "kaju-katli"}`,
      storyLine: r.story_line,
      badges,
      startAt: r.start_at,
      endAt: r.end_at,
      weekLabel: formatISTDateRange(r.start_at, r.end_at),
      status: r.status,
      createdAt: r.created_at,
      viewsCount: r.views_count || 0,
      clicksCount: r.clicks_count || 0,
      addToCartCount: r.add_to_cart_count || 0,
    };

    if (r.status === "active" && !activeSlogan) {
      activeSlogan = item;
    }

    if (r.status === "active") activeCount++;
    else if (r.status === "scheduled") scheduledCount++;
    else if (r.status === "draft") draftCount++;
    else if (r.status === "expired") expiredCount++;

    totalViews += r.views_count || 0;
    totalClicks += r.clicks_count || 0;
    totalAddToCart += r.add_to_cart_count || 0;

    slogansList.push(item);
  }

  // Check if upcoming 2 weeks have slogans scheduled
  const now = getNowInIST();
  const nextWeekBoundaries = getISTWeekBoundaries(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  );
  const weekAfterBoundaries = getISTWeekBoundaries(
    new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  );

  const hasNextWeek = slogansList.some(
    (s) =>
      s.status === "scheduled" &&
      new Date(s.startAt) <= nextWeekBoundaries.endAt &&
      new Date(s.endAt) >= nextWeekBoundaries.startAt
  );

  const hasWeekAfter = slogansList.some(
    (s) =>
      s.status === "scheduled" &&
      new Date(s.startAt) <= weekAfterBoundaries.endAt &&
      new Date(s.endAt) >= weekAfterBoundaries.startAt
  );

  const missingNextWeeks = !hasNextWeek || !hasWeekAfter;

  return {
    slogans: slogansList,
    activeSlogan,
    missingNextWeeks,
    stats: {
      total: slogansList.length,
      active: activeCount,
      scheduled: scheduledCount,
      draft: draftCount,
      expired: expiredCount,
      totalViews,
      totalClicks,
      totalAddToCart,
    },
  };
}

/**
 * 14. Save Slogan (Create or Update)
 */
export async function saveSloganAdmin(payload: any) {
  const sqlite = getSqliteDb();

  const {
    id,
    text,
    subText,
    textHi,
    subTextHi,
    textGu,
    subTextGu,
    productId,
    customImageUrl,
    themeColor,
    bgStyle,
    buttonText,
    buttonLink,
    storyLine,
    badges,
    badgesJson,
    startAt,
    endAt,
    status,
    createdBy,
  } = payload;

  const finalBadgesJson =
    badgesJson || (badges && Array.isArray(badges) ? JSON.stringify(badges) : null);

  // If status is active, optionally demote existing active slogans
  if (status === "active") {
    sqlite
      .prepare(`
        UPDATE slogans 
        SET status = 'expired' 
        WHERE status = 'active' ${id ? "AND id != " + Number(id) : ""}
      `)
      .run();
  }

  if (id) {
    sqlite
      .prepare(`
        UPDATE slogans SET
          text = ?,
          sub_text = ?,
          text_hi = ?,
          sub_text_hi = ?,
          text_gu = ?,
          sub_text_gu = ?,
          product_id = ?,
          custom_image_url = ?,
          theme_color = ?,
          bg_style = ?,
          button_text = ?,
          button_link = ?,
          story_line = ?,
          badges_json = ?,
          start_at = ?,
          end_at = ?,
          status = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(
        text,
        subText || null,
        textHi || null,
        subTextHi || null,
        textGu || null,
        subTextGu || null,
        productId,
        customImageUrl || null,
        themeColor || "#dfb755",
        bgStyle || "glass_aurora",
        buttonText || "Shop Sweet of the Week →",
        buttonLink || `/shop`,
        storyLine || null,
        finalBadgesJson,
        startAt || null,
        endAt || null,
        status || "scheduled",
        id
      );

    return { id, text, status };
  } else {
    const info = sqlite
      .prepare(`
        INSERT INTO slogans (
          text, sub_text, text_hi, sub_text_hi, text_gu, sub_text_gu,
          product_id, custom_image_url, theme_color, bg_style,
          button_text, button_link, story_line, badges_json,
          start_at, end_at, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `)
      .run(
        text,
        subText || null,
        textHi || null,
        subTextHi || null,
        textGu || null,
        subTextGu || null,
        productId,
        customImageUrl || null,
        themeColor || "#dfb755",
        bgStyle || "glass_aurora",
        buttonText || "Shop Sweet of the Week →",
        buttonLink || `/shop`,
        storyLine || null,
        finalBadgesJson,
        startAt || null,
        endAt || null,
        status || "scheduled",
        createdBy || 1
      );

    const insertedId = Number(info.lastInsertRowid);

    // Initialize analytics row
    sqlite
      .prepare(`
        INSERT INTO slogan_analytics (slogan_id, views_count, clicks_count, add_to_cart_count)
        VALUES (?, 0, 0, 0)
      `)
      .run(insertedId);

    return { id: insertedId, text, status };
  }
}

/**
 * 15. Delete Slogan Admin
 */
export async function deleteSloganAdmin(id: number) {
  const sqlite = getSqliteDb();
  sqlite.prepare("DELETE FROM slogan_analytics WHERE slogan_id = ?").run(id);
  sqlite.prepare("DELETE FROM slogans WHERE id = ?").run(id);
  return true;
}

/**
 * 16. Slogan Settings Admin
 */
export async function getSloganSettingsAdmin() {
  const sqlite = getSqliteDb();
  const row = sqlite.prepare("SELECT * FROM slogan_settings LIMIT 1").get() as any;
  if (!row) {
    return {
      enabled: true,
      location: "between_categories_bestsellers",
      showCountdown: true,
      showPastArchive: true,
      showShareButton: true,
      showAnnouncementStrip: true,
      autoRotateEnabled: true,
      rotationMode: "sequential",
      fallbackSloganText: "Pure *Desi Ghee*. Pure *Love*. This Week's Kaju Katli.",
      fallbackSubText: "Handcrafted with hand-roasted Goan cashews and 100% pure desi ghee.",
      fallbackProductId: 1,
    };
  }

  return {
    id: row.id,
    enabled: row.enabled === 1 || row.enabled === true,
    location: row.location || "between_categories_bestsellers",
    showCountdown: row.show_countdown === 1 || row.show_countdown === true,
    showPastArchive: row.show_past_archive === 1 || row.show_past_archive === true,
    showShareButton: row.show_share_button === 1 || row.show_share_button === true,
    showAnnouncementStrip: row.show_announcement_strip === 1 || row.show_announcement_strip === true,
    autoRotateEnabled: row.auto_rotate_enabled === 1 || row.auto_rotate_enabled === true,
    rotationMode: row.rotation_mode || "sequential",
    fallbackSloganText: row.fallback_slogan_text,
    fallbackSubText: row.fallback_sub_text,
    fallbackProductId: row.fallback_product_id || 1,
  };
}

export async function updateSloganSettingsAdmin(payload: any) {
  const sqlite = getSqliteDb();
  const current = await getSloganSettingsAdmin();

  if (current.id) {
    sqlite
      .prepare(`
        UPDATE slogan_settings SET
          enabled = ?,
          location = ?,
          show_countdown = ?,
          show_past_archive = ?,
          show_share_button = ?,
          show_announcement_strip = ?,
          auto_rotate_enabled = ?,
          rotation_mode = ?,
          fallback_slogan_text = ?,
          fallback_sub_text = ?,
          fallback_product_id = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(
        payload.enabled ? 1 : 0,
        payload.location || current.location,
        payload.showCountdown ? 1 : 0,
        payload.showPastArchive ? 1 : 0,
        payload.showShareButton ? 1 : 0,
        payload.showAnnouncementStrip ? 1 : 0,
        payload.autoRotateEnabled ? 1 : 0,
        payload.rotationMode || current.rotationMode,
        payload.fallbackSloganText || current.fallbackSloganText,
        payload.fallbackSubText || current.fallbackSubText,
        payload.fallbackProductId || current.fallbackProductId,
        current.id
      );
  } else {
    sqlite
      .prepare(`
        INSERT INTO slogan_settings (
          enabled, location, show_countdown, show_past_archive,
          show_share_button, show_announcement_strip, auto_rotate_enabled,
          rotation_mode, fallback_slogan_text, fallback_sub_text, fallback_product_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        payload.enabled ? 1 : 0,
        payload.location || "between_categories_bestsellers",
        payload.showCountdown ? 1 : 0,
        payload.showPastArchive ? 1 : 0,
        payload.showShareButton ? 1 : 0,
        payload.showAnnouncementStrip ? 1 : 0,
        payload.autoRotateEnabled ? 1 : 0,
        payload.rotationMode || "sequential",
        payload.fallbackSloganText || "Pure *Desi Ghee*. Pure *Love*.",
        payload.fallbackSubText || "",
        payload.fallbackProductId || 1
      );
  }

  return await getSloganSettingsAdmin();
}

/**
 * 17. Generate Slogan Suggestions
 */
export async function generateSloganSuggestions(params: {
  productId?: number;
  sweetName?: string;
  festival?: string;
}) {
  const sqlite = getSqliteDb();

  let sweetName = params.sweetName;
  if (!sweetName && params.productId) {
    const prod = sqlite.prepare("SELECT name FROM products WHERE id = ?").get(params.productId) as any;
    sweetName = prod?.name || "Mithai";
  }
  if (!sweetName) sweetName = "Handcrafted Sweet";

  // Clean sweet name (remove brackets, weights)
  const cleanName = sweetName.replace(/\([^)]*\)/g, "").trim();

  // Fetch templates from database
  const templates = sqlite
    .prepare("SELECT * FROM slogan_templates ORDER BY id ASC")
    .all() as any[];

  const suggestions = [];

  for (const t of templates) {
    const renderedText = t.template_text.replace(/\[Sweet\]/gi, cleanName);
    const renderedSubText = t.template_sub_text ? t.template_sub_text.replace(/\[Sweet\]/gi, cleanName) : "";

    suggestions.push({
      title: t.title,
      text: renderedText,
      subText: renderedSubText,
      themeColor: t.suggested_theme_color || "#dfb755",
      category: t.category || "general",
    });
  }

  return suggestions.slice(0, 10);
}

/**
 * 18. Export Slogan Analytics CSV
 */
export async function exportSloganAnalyticsCsv(): Promise<string> {
  const { slogans } = await getAllSlogansAdmin();

  const headers = [
    "Slogan ID",
    "Main Slogan",
    "Featured Sweet",
    "Status",
    "Start Date",
    "End Date",
    "Views Count",
    "Clicks Count",
    "CTR (%)",
    "Add To Cart Count",
  ];

  const rows = slogans.map((s) => {
    const cleanText = `"${(s.text || "").replace(/"/g, '""')}"`;
    const cleanSweet = `"${(s.productName || "").replace(/"/g, '""')}"`;
    const ctr = s.viewsCount && s.viewsCount > 0 ? (((s.clicksCount || 0) / s.viewsCount) * 100).toFixed(2) : "0.00";

    return [
      s.id,
      cleanText,
      cleanSweet,
      s.status,
      s.startAt ? new Date(s.startAt).toISOString().slice(0, 10) : "",
      s.endAt ? new Date(s.endAt).toISOString().slice(0, 10) : "",
      s.viewsCount || 0,
      s.clicksCount || 0,
      `${ctr}%`,
      s.addToCartCount || 0,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

