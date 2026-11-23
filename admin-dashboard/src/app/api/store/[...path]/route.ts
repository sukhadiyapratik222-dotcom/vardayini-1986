import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STORE_URL_CONFIG_ERROR, getStoreApiBase } from "@/lib/store-url";
import path from "node:path";
import fs from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function getLocalSqliteDb() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require("node:sqlite");
    const possiblePaths = [
      path.resolve(process.cwd(), "ai-genrated/.data/vardayini_local.db"),
      path.resolve(process.cwd(), "../ai-genrated/.data/vardayini_local.db"),
      path.resolve(process.cwd(), ".data/vardayini_local.db"),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return new DatabaseSync(p);
      }
    }
  } catch (err) {
    console.warn("[Store Proxy] SQLite db connection note:", err);
  }
  return null;
}

// -------------------------------------------------------------
// LOCAL SQLITE FALLBACKS FOR QUIZ QUESTIONS & SETTINGS
// -------------------------------------------------------------

function getLocalQuizQuestionsFallback() {
  const db = getLocalSqliteDb();
  if (!db) return null;
  try {
    const qRows = db.prepare(`SELECT * FROM quiz_questions WHERE is_enabled = 1 ORDER BY step_number ASC`).all();
    const optRows = db.prepare(`SELECT * FROM quiz_options WHERE is_enabled = 1 ORDER BY sort_order ASC`).all();
    const optionsByQKey: Record<string, any[]> = {};
    for (const opt of optRows as any[]) {
      if (!optionsByQKey[opt.question_key]) optionsByQKey[opt.question_key] = [];
      let tagMapping = {};
      try {
        tagMapping = JSON.parse(opt.tag_mapping);
      } catch {}
      optionsByQKey[opt.question_key].push({
        key: opt.option_key,
        label: opt.label,
        description: opt.description || undefined,
        icon: opt.icon || undefined,
        sortOrder: opt.sort_order,
        tagMapping,
      });
    }

    const questions = (qRows as any[]).map((q) => ({
      id: q.id,
      key: q.question_key,
      title: q.title,
      subtitle: q.subtitle || undefined,
      stepNumber: q.step_number,
      icon: q.icon || "🍯",
      weight: q.weight,
      isStrictFilter: Boolean(q.is_strict_filter),
      options: optionsByQKey[q.question_key] || [],
    }));

    return { success: true, questions };
  } catch (err) {
    console.warn("[Store Proxy] Failed reading local quiz questions:", err);
    return null;
  }
}

function updateLocalQuizQuestionsFallback(questions: any[]) {
  const db = getLocalSqliteDb();
  if (!db || !Array.isArray(questions)) return null;
  try {
    const submittedKeys = new Set<string>();

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const rawKey = q.key || q.questionKey || `q_${Date.now()}_${idx}`;
      const cleanKey = String(rawKey).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 50);
      if (!cleanKey) continue;
      submittedKeys.add(cleanKey);

      const stepNumber = idx + 1;
      const title = q.title || "Taste Preference";
      const subtitle = q.subtitle || null;
      const weight = Number(q.weight) || 20;
      const icon = q.icon || "🍯";
      const isStrictFilter = q.isStrictFilter ? 1 : 0;
      const isEnabled = q.isEnabled !== false ? 1 : 0;

      const existing = db.prepare(`SELECT id FROM quiz_questions WHERE question_key = ?`).get(cleanKey);
      if (existing) {
        db.prepare(`
          UPDATE quiz_questions 
          SET title = ?, subtitle = ?, step_number = ?, weight = ?, icon = ?, is_strict_filter = ?, is_enabled = ?
          WHERE question_key = ?
        `).run(title, subtitle, stepNumber, weight, icon, isStrictFilter, isEnabled, cleanKey);
      } else {
        db.prepare(`
          INSERT INTO quiz_questions (question_key, title, subtitle, step_number, weight, icon, is_strict_filter, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(cleanKey, title, subtitle, stepNumber, weight, icon, isStrictFilter, isEnabled);
      }

      if (Array.isArray(q.options) && q.options.length > 0) {
        db.prepare(`DELETE FROM quiz_options WHERE question_key = ?`).run(cleanKey);
        for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
          const opt = q.options[optIdx];
          const rawOptKey = opt.key || opt.optionKey || `opt_${optIdx + 1}`;
          const cleanOptKey = String(rawOptKey).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 60);
          const optLabel = opt.label || "Option";
          const optDesc = opt.description || null;
          const optIcon = opt.icon || "✨";
          const sortOrder = Number(opt.sortOrder) || optIdx + 1;
          const tagMappingStr =
            typeof opt.tagMapping === "object"
              ? JSON.stringify(opt.tagMapping)
              : typeof opt.tagMapping === "string"
              ? opt.tagMapping
              : "{}";

          db.prepare(`
            INSERT INTO quiz_options (question_key, option_key, label, description, icon, sort_order, tag_mapping, is_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `).run(cleanKey, cleanOptKey, optLabel, optDesc, optIcon, sortOrder, tagMappingStr);
        }
      }
    }

    if (submittedKeys.size > 0) {
      const allRows = db.prepare(`SELECT question_key FROM quiz_questions`).all() as { question_key: string }[];
      for (const row of allRows) {
        if (!submittedKeys.has(row.question_key)) {
          db.prepare(`DELETE FROM quiz_options WHERE question_key = ?`).run(row.question_key);
          db.prepare(`DELETE FROM quiz_questions WHERE question_key = ?`).run(row.question_key);
        }
      }
    }

    const fallback = getLocalQuizQuestionsFallback();
    return fallback || { success: true, questions };
  } catch (err) {
    console.warn("[Store Proxy] Failed updating local quiz questions:", err);
    return null;
  }
}

function deleteLocalQuizQuestionFallback(key: string) {
  const db = getLocalSqliteDb();
  if (!db || !key) return null;
  try {
    db.prepare(`DELETE FROM quiz_options WHERE question_key = ?`).run(key);
    db.prepare(`DELETE FROM quiz_questions WHERE question_key = ?`).run(key);
    const fallback = getLocalQuizQuestionsFallback();
    return fallback || { success: true, questions: [] };
  } catch (err) {
    console.warn("[Store Proxy] Failed deleting local quiz question:", err);
    return null;
  }
}

function getLocalQuizPersonalitiesFallback() {
  const db = getLocalSqliteDb();
  if (!db) return null;
  try {
    const rows = db.prepare(`SELECT * FROM quiz_personalities ORDER BY id ASC`).all() as any[];
    return {
      personalities: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        badge: p.badge,
        recommendedSweet: p.recommended_sweet,
        heroImageUrl: p.hero_image_url || "/images/kaju-katli.jpg",
      })),
    };
  } catch (err) {
    console.warn("[Store Proxy] Failed reading local personalities:", err);
    return null;
  }
}

function updateLocalQuizPersonalityFallback(payload: any) {
  const db = getLocalSqliteDb();
  if (!db || !payload) return null;
  try {
    const { slug, name, tagline, description, badge, recommendedSweet, heroImageUrl } = payload;
    if (!slug) return null;
    const existing = db.prepare(`SELECT id FROM quiz_personalities WHERE slug = ?`).get(slug);
    if (existing) {
      db.prepare(`
        UPDATE quiz_personalities
        SET name = ?, tagline = ?, description = ?, badge = ?, recommended_sweet = ?, hero_image_url = ?
        WHERE slug = ?
      `).run(name, tagline, description, badge, recommendedSweet, heroImageUrl, slug);
    } else {
      db.prepare(`
        INSERT INTO quiz_personalities (slug, name, tagline, description, badge, recommended_sweet, hero_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(slug, name, tagline, description, badge, recommendedSweet, heroImageUrl);
    }
    return { success: true, message: "Personality updated successfully" };
  } catch (err) {
    console.warn("[Store Proxy] Failed updating local personality:", err);
    return null;
  }
}

function getLocalQuizSettingsFallback() {
  const db = getLocalSqliteDb();
  if (!db) return null;
  try {
    const settings = db.prepare(`SELECT * FROM quiz_settings LIMIT 1`).get() as any;
    if (!settings) return { settings: { isEnabled: true, maxResults: 4 } };
    return {
      settings: {
        isEnabled: Boolean(settings.is_enabled),
        leadCaptureEnabled: Boolean(settings.lead_capture_enabled),
        leadCaptureHeading: settings.lead_capture_heading,
        leadCaptureSubheading: settings.lead_capture_subheading,
        maxResults: settings.max_results,
        comboDiscountPercent: settings.combo_discount_percent,
        allergyDisclaimer: settings.allergy_disclaimer,
      },
    };
  } catch (err) {
    console.warn("[Store Proxy] Failed reading local quiz settings:", err);
    return null;
  }
}

function updateLocalQuizSettingsFallback(payload: any) {
  const db = getLocalSqliteDb();
  if (!db || !payload) return null;
  try {
    const existing = db.prepare(`SELECT id FROM quiz_settings LIMIT 1`).get() as any;
    const isEnabled = payload.isEnabled !== false ? 1 : 0;
    const leadCaptureEnabled = payload.leadCaptureEnabled ? 1 : 0;
    const leadCaptureHeading = payload.leadCaptureHeading || null;
    const leadCaptureSubheading = payload.leadCaptureSubheading || null;
    const maxResults = Number(payload.maxResults) || 4;
    const comboDiscountPercent = Number(payload.comboDiscountPercent) || 10;
    const allergyDisclaimer = payload.allergyDisclaimer || null;

    if (existing) {
      db.prepare(`
        UPDATE quiz_settings
        SET is_enabled = ?, lead_capture_enabled = ?, lead_capture_heading = ?, lead_capture_subheading = ?,
            max_results = ?, combo_discount_percent = ?, allergy_disclaimer = ?
        WHERE id = ?
      `).run(isEnabled, leadCaptureEnabled, leadCaptureHeading, leadCaptureSubheading, maxResults, comboDiscountPercent, allergyDisclaimer, existing.id);
    } else {
      db.prepare(`
        INSERT INTO quiz_settings (is_enabled, lead_capture_enabled, lead_capture_heading, lead_capture_subheading, max_results, combo_discount_percent, allergy_disclaimer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(isEnabled, leadCaptureEnabled, leadCaptureHeading, leadCaptureSubheading, maxResults, comboDiscountPercent, allergyDisclaimer);
    }
    return { success: true, message: "Settings saved" };
  } catch (err) {
    console.warn("[Store Proxy] Failed updating local quiz settings:", err);
    return null;
  }
}

// -------------------------------------------------------------
// LOCAL NOTIFICATIONS FALLBACKS
// -------------------------------------------------------------

function getLocalNotificationsFallback(limit: number = 50) {
  const db = getLocalSqliteDb();
  if (!db) return null;
  try {
    const rows = db.prepare(`SELECT * FROM admin_notifications ORDER BY id DESC LIMIT ?`).all(limit) as any[];
    const unread = db.prepare(`SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0`).get() as { count?: number };
    return {
      notifications: rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        data: r.data,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at,
      })),
      unreadCount: Number(unread?.count || 0),
    };
  } catch (err) {
    console.warn("[Store Proxy] SQLite notifications fallback notice:", err);
    return null;
  }
}

function updateLocalNotificationFallback(id?: number, all?: boolean) {
  const db = getLocalSqliteDb();
  if (!db) return null;
  try {
    if (all) {
      db.prepare(`UPDATE admin_notifications SET is_read = 1`).run();
    } else if (id !== undefined && !isNaN(id)) {
      db.prepare(`UPDATE admin_notifications SET is_read = 1 WHERE id = ?`).run(id);
    }
    return { success: true };
  } catch (err) {
    console.warn("[Store Proxy] SQLite update notification notice:", err);
    return null;
  }
}

function deleteLocalNotificationFallback(id?: number, all?: boolean) {
  const db = getLocalSqliteDb();
  if (!db) return null;
  try {
    if (all) {
      db.prepare(`DELETE FROM admin_notifications`).run();
    } else if (id !== undefined && !isNaN(id)) {
      db.prepare(`DELETE FROM admin_notifications WHERE id = ?`).run(id);
    }
    return { success: true };
  } catch (err) {
    console.warn("[Store Proxy] SQLite delete notification notice:", err);
    return null;
  }
}

function insertLocalNotificationFallback(payload: { type?: string; title: string; message: string; data?: any }) {
  const db = getLocalSqliteDb();
  if (!db || !payload.title || !payload.message) return null;
  try {
    const dataStr = payload.data ? JSON.stringify(payload.data) : null;
    db.prepare(`
      INSERT INTO admin_notifications (type, title, message, data, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(payload.type || "system", payload.title, payload.message, dataStr);
    return { success: true };
  } catch (err) {
    console.warn("[Store Proxy] SQLite insert notification notice:", err);
    return null;
  }
}

// -------------------------------------------------------------
// LOCAL UI CONFIG (BRANDING, PHONE, REAL STORE INFO) FALLBACK
// -------------------------------------------------------------

function getLocalUiConfigFallback() {
  const possiblePaths = [
    path.resolve(process.cwd(), "ai-genrated/src/data/ui-config.json"),
    path.resolve(process.cwd(), "../ai-genrated/src/data/ui-config.json"),
    path.resolve(process.cwd(), "src/data/ui-config.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.storeInfo) {
          if (parsed.storeInfo.phone) parsed.storeInfo.phone = parsed.storeInfo.phone.replace("63531", "63521");
          if (parsed.storeInfo.whatsapp) parsed.storeInfo.whatsapp = parsed.storeInfo.whatsapp.replace("63531", "63521");
        }
        return parsed;
      } catch {}
    }
  }
  return null;
}

function updateLocalUiConfigFallback(updates: any) {
  const possiblePaths = [
    path.resolve(process.cwd(), "ai-genrated/src/data/ui-config.json"),
    path.resolve(process.cwd(), "../ai-genrated/src/data/ui-config.json"),
    path.resolve(process.cwd(), "src/data/ui-config.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        const current = JSON.parse(raw);
        const merged = { ...current, ...updates };
        if (updates.storeInfo && current.storeInfo) {
          merged.storeInfo = { ...current.storeInfo, ...updates.storeInfo };
        }
        if (updates.logo && current.logo) {
          merged.logo = { ...current.logo, ...updates.logo };
        }
        if (merged.storeInfo) {
          if (merged.storeInfo.phone) merged.storeInfo.phone = merged.storeInfo.phone.replace("63531", "63521");
          if (merged.storeInfo.whatsapp) merged.storeInfo.whatsapp = merged.storeInfo.whatsapp.replace("63531", "63521");
        }
        fs.writeFileSync(p, JSON.stringify(merged, null, 2), "utf-8");
        return { success: true, config: merged };
      } catch {}
    }
  }
  return null;
}

// -------------------------------------------------------------
// FORWARD REQUEST WITH TRANSPARENT LOCAL FALLBACKS
// -------------------------------------------------------------

async function forwardRequest(req: NextRequest, ctx: RouteContext) {
  const { path: routePath } = await ctx.params;
  const storeApiBase = getStoreApiBase().replace(/\/api\/?$/, "");
  if (!storeApiBase) {
    console.error("[Store Proxy] STORE_API_URL is not configured.");
    return NextResponse.json({ error: STORE_URL_CONFIG_ERROR }, { status: 503 });
  }

  // Ensure path is properly formatted with single api/ prefix
  let subPath = routePath.join("/");
  // Strip duplicate store/api or api/store prefixes if mistakenly sent e.g. "api/store/api/quiz" -> "api/quiz"
  subPath = subPath
    .replace(/^api\/+store\/+api\//, "api/")
    .replace(/^store\/+api\//, "api/")
    .replace(/^api\/+store\//, "api/");
  if (!subPath.startsWith("api/") && !subPath.startsWith("/")) {
    subPath = `api/${subPath}`;
  }
  const cleanSubPath = subPath.replace(/^api\/+api\//, "api/").replace(/^\/+/, "");
  const url = new URL(req.url);
  const targetUrl = `${storeApiBase}/${cleanSubPath}${url.search}`;

  const headers = new Headers();

  // Forward content-type if present
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  // Forward session server-to-server using the dashboard's HttpOnly cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("vsm_admin_session")?.value;

  // Forward only the signed storefront session; proxy requests must not gain privileges.
  if (sessionToken) {
    headers.set("cookie", `vs_session=${sessionToken}`);
  }

  // Helper to handle local fallback operations
  const handleLocalFallback = async () => {
    // 1. Taste Quiz Questions Fallback
    if (cleanSubPath === "api/quiz/questions") {
      if (req.method === "GET") {
        const fallback = getLocalQuizQuestionsFallback();
        if (fallback) return NextResponse.json(fallback);
      } else if (req.method === "PUT") {
        try {
          const body = await req.clone().json();
          const fallback = updateLocalQuizQuestionsFallback(body.questions);
          if (fallback) return NextResponse.json(fallback);
        } catch {}
      } else if (req.method === "DELETE") {
        const key = url.searchParams.get("key");
        if (key) {
          const fallback = deleteLocalQuizQuestionFallback(key);
          if (fallback) return NextResponse.json(fallback);
        }
      }
    }

    // 2. Taste Quiz Settings Fallback
    if (cleanSubPath === "api/quiz/settings") {
      if (req.method === "GET") {
        const fallback = getLocalQuizSettingsFallback();
        if (fallback) return NextResponse.json(fallback);
      } else if (req.method === "PUT") {
        try {
          const body = await req.clone().json();
          const fallback = updateLocalQuizSettingsFallback(body);
          if (fallback) return NextResponse.json(fallback);
        } catch {}
      }
    }

    // 3. Taste Quiz Personalities Fallback
    if (cleanSubPath === "api/quiz/personalities") {
      if (req.method === "GET") {
        const fallback = getLocalQuizPersonalitiesFallback();
        if (fallback) return NextResponse.json(fallback);
      } else if (req.method === "PUT") {
        try {
          const body = await req.clone().json();
          const fallback = updateLocalQuizPersonalityFallback(body);
          if (fallback) return NextResponse.json(fallback);
        } catch {}
      }
    }

    // 4. Admin Notifications Fallback
    if (cleanSubPath === "api/admin/notifications") {
      if (req.method === "GET") {
        const fallback = getLocalNotificationsFallback();
        if (fallback) return NextResponse.json(fallback);
      } else if (req.method === "PUT") {
        const all = url.searchParams.get("all") === "true";
        const idParam = url.searchParams.get("id");
        const id = idParam ? parseInt(idParam, 10) : undefined;
        const res = updateLocalNotificationFallback(id, all);
        if (res) return NextResponse.json({ success: true, message: "Notification updated." });
      } else if (req.method === "DELETE") {
        const all = url.searchParams.get("all") === "true";
        const idParam = url.searchParams.get("id");
        const id = idParam ? parseInt(idParam, 10) : undefined;
        const res = deleteLocalNotificationFallback(id, all);
        if (res) return NextResponse.json({ success: true, message: "Notification deleted." });
      } else if (req.method === "POST") {
        try {
          const body = await req.clone().json();
          const res = insertLocalNotificationFallback(body);
          if (res) return NextResponse.json({ success: true, message: "Notification created." });
        } catch {}
      }
    }

    // 5. Products & Inventory Fallback
    if (req.method === "GET") {
      if (cleanSubPath === "api/admin/products" || cleanSubPath === "api/products") {
        try {
          const fallbackRes = await fetch(`${storeApiBase}/api/products`, { headers, cache: "no-store" });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const items = data.products || data.items || [];
            return NextResponse.json({ items });
          }
        } catch {}
      } else if (cleanSubPath === "api/admin/inventory") {
        try {
          const fallbackRes = await fetch(`${storeApiBase}/api/products`, { headers, cache: "no-store" });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const prods = data.products || data.items || [];
            const variants = prods.map((p: any) => ({
              id: p.variants?.[0]?.id || p.variantId || p.id,
              sku: p.variants?.[0]?.sku || p.sku || `VSM-${p.id}`,
              weight: p.variants?.[0]?.weight || p.weight || "500g",
              stock: p.variants?.[0]?.stock ?? p.stock ?? 25,
              price: p.variants?.[0]?.price || p.price || 350,
              name: p.name,
            }));
            return NextResponse.json({
              variants,
              lowStock: variants.filter((v: any) => v.stock <= 20),
            });
          }
        } catch {}
      } else if (cleanSubPath === "api/admin/customers") {
        return NextResponse.json({ customers: [] });
      }
    }

    // 6. UI Config Fallback (Branding, Phone, Real Store Info)
    if (cleanSubPath === "api/ui-config") {
      if (req.method === "GET") {
        const config = getLocalUiConfigFallback();
        if (config) return NextResponse.json(config);
      } else if (req.method === "PUT" || req.method === "POST") {
        try {
          const body = await req.clone().json();
          const res = updateLocalUiConfigFallback(body);
          if (res) return NextResponse.json(res);
        } catch {}
      }
    }

    return null;
  };

  try {
    let body: ArrayBuffer | undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      try {
        const buf = await req.arrayBuffer();
        if (buf && buf.byteLength > 0) {
          body = buf;
        }
      } catch {
        // Body was either empty or already consumed
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    const responseData = await response.arrayBuffer();
    const responseHeaders = new Headers();

    const respContentType = response.headers.get("content-type");
    if (respContentType) {
      responseHeaders.set("content-type", respContentType);
    }

    if (response.status === 401 || response.status === 403) {
      try {
        const text = new TextDecoder().decode(responseData).toLowerCase();
        if (
          text.includes("account deactivated") ||
          text.includes("account inactive") ||
          (cleanSubPath.startsWith("api/auth/") && response.status === 401)
        ) {
          cookieStore.delete("vsm_admin_session");
        }
      } catch {
        // ignore decoding errors
      }
    }

    // If target storefront endpoint returned 404, check if local fallback can serve the request
    if (response.status === 404) {
      const fallbackResult = await handleLocalFallback();
      if (fallbackResult) return fallbackResult;
    }

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; cause?: { code?: string; errors?: Array<{ code?: string }> } };
    const isConnRefused =
      err?.cause?.code === "ECONNREFUSED" ||
      err?.code === "ECONNREFUSED" ||
      (Array.isArray(err?.cause?.errors) && err.cause.errors.some((e) => e.code === "ECONNREFUSED"));

    if (isConnRefused) {
      console.warn(
        `[Store Proxy] Storefront service at ${targetUrl} is unreachable (ECONNREFUSED). Checking local fallback...`
      );
    } else {
      console.error(`Store proxy error forwarding to ${targetUrl}:`, error);
    }

    // Try serving with local database fallback on connection failures
    const fallbackResult = await handleLocalFallback();
    if (fallbackResult) return fallbackResult;

    return NextResponse.json(
      {
        error: "Store service unavailable",
        message: isConnRefused
          ? `Storefront service at ${storeApiBase} is unreachable. Ensure the storefront deployment is running.`
          : (error instanceof Error ? error.message : "Proxy fetch error"),
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, cookie, accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}
