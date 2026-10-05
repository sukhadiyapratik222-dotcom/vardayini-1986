import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

import { NextResponse } from "next/server";

const AUTH_COOKIE = "vs_session";
const CART_COOKIE = "vs_cart";
const COUPON_COOKIE = "vs_coupon";
const DEV_SECRET_FALLBACK = "vardayini-dev-secret-change-me";

export function secret(): string {
  const s = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  if (!s || s.trim() === "" || (isProd && s === DEV_SECRET_FALLBACK)) {
    if (isProd) {
      throw new Error("SESSION_SECRET must be set and secure in production");
    }
    return DEV_SECRET_FALLBACK;
  }
  return s.trim();
}

// Fail at startup in production if SESSION_SECRET is missing or equals dev fallback
if (process.env.NODE_ENV === "production") {
  const initialSecret = process.env.SESSION_SECRET;
  if (!initialSecret || initialSecret.trim() === "" || initialSecret === DEV_SECRET_FALLBACK) {
    throw new Error("SESSION_SECRET must be set and secure in production");
  }
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function getCartSessionId() {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const id = randomBytes(16).toString("hex");
  try {
    store.set(CART_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // Server Components cannot set cookies; middleware attaches vs_cart.
  }
  return id;
}

export async function setAuthCookie(userId: number) {
  const payload = JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  const token = Buffer.from(payload).toString("base64url") + "." + sign(payload);
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}

export async function getAuthUser(req?: Request) {
  await ensureSeeded();
  let token: string | undefined;

  try {
    const store = await cookies();
    token = store.get(AUTH_COOKIE)?.value;
  } catch {}

  if (!token && req) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]+)`));
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token && req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const candidate = authHeader.slice(7).trim();
      if (candidate.includes(".")) {
        token = candidate;
      }
    }
  }

  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [raw, signature] = parts;
  if (!raw || !signature) return null;

  const payload = Buffer.from(raw, "base64url").toString("utf8");
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let data: any;
  try {
    data = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object") return null;
  if (typeof data.exp !== "number" || !Number.isFinite(data.exp) || data.exp < Date.now()) {
    return null;
  }
  if (typeof data.userId !== "number" || !Number.isInteger(data.userId) || data.userId <= 0) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export async function getCouponCode() {
  const store = await cookies();
  const val = store.get(COUPON_COOKIE)?.value;
  return val ? val.trim().toUpperCase() : null;
}

export async function setCouponCode(code: string | null) {
  const store = await cookies();
  if (!code) {
    store.delete(COUPON_COOKIE);
    return;
  }
  const cleanCode = code.trim().toUpperCase();
  store.set(COUPON_COOKIE, cleanCode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export type RequireAdminResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

/**
 * Validates that the request has an active, authenticated admin session.
 * Supports session cookies and service-to-service admin key authorization.
 * Returns { user } if valid admin, or { error: NextResponse } with status 401 or 403.
 */
export async function requireAdmin(req?: Request): Promise<RequireAdminResult> {
  const user = await getAuthUser(req);
  if (!user) {
    const adminKey = process.env.ADMIN_API_KEY;
    if (adminKey && req) {
      const headerKey = req.headers.get("x-admin-key") || req.headers.get("x-api-key");
      const authHeader = req.headers.get("authorization");
      const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      if (headerKey === adminKey || bearerKey === adminKey) {
        return {
          user: {
            id: 1,
            name: "Vardayini Admin",
            email: "admin@vardayini.com",
            phone: "9000000000",
            role: "admin",
          },
        };
      }
    }
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
