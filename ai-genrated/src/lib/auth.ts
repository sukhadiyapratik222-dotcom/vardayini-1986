import { checkUserPermission } from "@/lib/rbac";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, rolePermissions, permissions as permissionsTable, adminPermissions, activityLogs, adminSessions, loginHistory } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

import { NextResponse } from "next/server";

const AUTH_COOKIE = "vs_session";
const CART_COOKIE = "vs_cart";
const COUPON_COOKIE = "vs_coupon";
let ephemeralSessionSecret: string | undefined;

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

export function secret(): string {
  const configuredSecret = process.env.SESSION_SECRET?.trim();
  const isDevFallback =
    !configuredSecret ||
    configuredSecret === "vardayini-dev-secret-change-me" ||
    configuredSecret === "dev-secret-change-in-production";

  if (process.env.NODE_ENV === "production" && !isBuildPhase()) {
    if (isDevFallback) {
      throw new Error("SESSION_SECRET must be set and secure in production");
    }
    return configuredSecret;
  }

  if (configuredSecret) return configuredSecret;
  if (!ephemeralSessionSecret) {
    ephemeralSessionSecret = randomBytes(32).toString("hex");
  }
  return ephemeralSessionSecret;
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

export async function setAuthCookie(
  userId: number,
  extra?: { email?: string; phone?: string; role?: string; name?: string }
): Promise<string> {
  const payload = JSON.stringify({
    userId,
    email: extra?.email,
    phone: extra?.phone,
    role: extra?.role,
    name: extra?.name,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  });
  const token = Buffer.from(payload).toString("base64url") + "." + sign(payload);
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return token;
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
  } catch { }

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

  let [user] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);

  // If not found in local SQLite (e.g. serverless instance cold start), attempt hydration from MongoDB Atlas
  if (!user && (data.email || data.phone || data.userId)) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const query: any = { $or: [] };
        if (data.userId) query.$or.push({ id: data.userId });
        if (data.email) query.$or.push({ email: String(data.email).toLowerCase().trim() });
        if (data.phone) query.$or.push({ phone: data.phone });
        if (query.$or.length > 0) {
          const mongoUser = await mongo.collection("users").findOne(query);
          if (mongoUser) {
            try {
              const { getSqliteDb } = await import("@/db");
              const sqlite = getSqliteDb();
              sqlite.prepare(`
                INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, status, access_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                mongoUser.id || data.userId,
                mongoUser.name || data.name || "Customer",
                mongoUser.email || data.email || "",
                mongoUser.phone || data.phone || "",
                mongoUser.passwordHash || "",
                mongoUser.role || data.role || "customer",
                mongoUser.status || "active",
                mongoUser.accessType || "full"
              );
              [user] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
            } catch {
              user = {
                id: mongoUser.id || data.userId,
                name: mongoUser.name || data.name || "Customer",
                email: mongoUser.email || data.email || "",
                phone: mongoUser.phone || data.phone || "",
                passwordHash: mongoUser.passwordHash || "",
                role: mongoUser.role || data.role || "customer",
                status: mongoUser.status || "active",
                mustChangePassword: false,
                accessType: mongoUser.accessType || "full",
                createdAt: new Date().toISOString(),
              } as any;
            }
          }
        }
      }
    } catch (mErr) {
      console.warn("[getAuthUser] MongoDB lookup notice:", mErr);
    }
  }

  if (!user) return null;

  let permissionsList: string[] = [];
  if (user.role === "super_admin") {
    permissionsList = ["*"];
  } else {
    try {
      // 1. Fetch permissions from user's assigned role
      const [userRoleRow] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.slug, user.role))
        .limit(1);

      if (userRoleRow) {
        const rolePermRows = await db
          .select({ slug: permissionsTable.slug })
          .from(rolePermissions)
          .innerJoin(permissionsTable, eq(rolePermissions.permissionId, permissionsTable.id))
          .where(eq(rolePermissions.roleId, userRoleRow.id));
        permissionsList.push(...rolePermRows.map((r) => r.slug));
      }

      // 2. Fetch direct adminPermissions
      const directPermRows = await db
        .select({ slug: adminPermissions.permissionSlug })
        .from(adminPermissions)
        .where(eq(adminPermissions.userId, user.id));
      permissionsList.push(...directPermRows.map((r) => r.slug));

      // Legacy fallback for admin with full access
      if (user.role === "admin" && user.accessType === "full") {
        permissionsList.push("*");
      }
    } catch (permErr) {
      console.warn("[getAuthUser] Perm fetch notice:", permErr);
    }
  }

  const uniquePerms = Array.from(new Set(permissionsList));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    storeId: (user as any).storeId ?? null,
    status: user.status || "active",
    mustChangePassword: Boolean(user.mustChangePassword),
    accessType: user.accessType || "full",
    permissions: uniquePerms,
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

export type RequireSuperAdminResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

export function getClientIp(req?: Request): string {
  if (!req) return "127.0.0.1";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Records an entry into the administrative audit activity log.
 */
export async function logActivity(options: {
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  module: string;
  recordId?: number | null;
  previousValue?: any;
  updatedValue?: any;
  details?: string | null;
  ipAddress?: string | null;
  req?: Request;
}) {
  try {
    const ip = options.ipAddress || (options.req ? getClientIp(options.req) : "127.0.0.1");
    const prevStr = options.previousValue
      ? (typeof options.previousValue === "object" ? JSON.stringify(options.previousValue) : String(options.previousValue))
      : null;
    const nextStr = options.updatedValue
      ? (typeof options.updatedValue === "object" ? JSON.stringify(options.updatedValue) : String(options.updatedValue))
      : null;

    await db.insert(activityLogs).values({
      userId: options.userId ?? null,
      userName: options.userName ?? null,
      userEmail: options.userEmail ?? null,
      userRole: options.userRole ?? null,
      action: options.action,
      module: options.module,
      recordId: options.recordId ?? null,
      previousValue: prevStr,
      updatedValue: nextStr,
      details: options.details ?? null,
      ipAddress: ip,
    });
  } catch (err) {
    console.warn("[ActivityLog] Failed to record log:", err);
  }
}

/**
 * Validates that the request has an active, authenticated super_admin session.
 * Rejects deactivated users or standard admins with 403 Forbidden.
 */
export async function requireSuperAdmin(req?: Request): Promise<RequireSuperAdminResult> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (user.status === "inactive") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Account deactivated. Contact Super Admin." },
        { status: 403 }
      ),
    };
  }
  if (user.role !== "super_admin") {
    if (req) {
      logActivity({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: "UNAUTHORIZED_SUPER_ADMIN_ATTEMPT",
        module: "admin_management",
        details: `Unauthorized attempt to access Super Admin section from IP ${getClientIp(req)}`,
        req,
      });
    }
    return {
      error: NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

/**
 * Validates that the request has an active, authenticated admin session.
 * Requires an active signed user session.
 * Checks optional requiredPermission for custom-access admins.
 * Returns { user } if valid admin, or { error: NextResponse } with status 401 or 403.
 */
export async function requireAdmin(
  req?: Request,
  requiredPermission?: string
): Promise<RequireAdminResult> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (user.status === "inactive") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Account deactivated. Contact administrator." },
        { status: 403 }
      ),
    };
  }

  if (user.role === "customer") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      ),
    };
  }

  // Super Admin has unrestricted access to everything
  if (user.role === "super_admin") {
    return { user };
  }

  // If a specific granular permission is required, enforce RBAC check
  if (requiredPermission) {
    const hasPerm = checkUserPermission(user.role, user.permissions, requiredPermission);

    if (!hasPerm) {
      const moduleName = requiredPermission.split(":")[0] || "admin";
      if (req) {
        logActivity({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action: "PERMISSION_DENIED",
          module: moduleName,
          details: `Access denied to permission ${requiredPermission}`,
          req,
        });
      }
      return {
        error: NextResponse.json(
          { error: `Forbidden: Insufficient permissions for ${requiredPermission}` },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}
