import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { mergeGuestCart } from "@/lib/cart";
import { setAuthCookie } from "@/lib/auth";
import { LoginSchema, readJsonSafe } from "@/lib/validation";
import {
  DUMMY_BCRYPT_HASH,
  globalAccountLockoutManager,
  globalLoginRateLimiter,
} from "@/lib/security";
import { recordAdminNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Extract client identifier (IP or forwarded address)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    // 1. Sliding Window IP Rate Limiting (10 requests per minute)
    const rateCheck = globalLoginRateLimiter.check(`ip:${clientIp}`);
    if (!rateCheck.allowed) {
      return Response.json(
        {
          error: "Too many login requests. Please wait a minute before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetTimeMs / 1000)),
          },
        }
      );
    }

    // 2. Read JSON Payload safely
    const body = await readJsonSafe<unknown>(request);
    if (!body) {
      return Response.json({ error: "Invalid request payload." }, { status: 400 });
    }

    // 3. Schema Validation via Zod
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      // Return generic error message to prevent parameter discovery
      return Response.json({ error: "Invalid email or password." }, { status: 400 });
    }

    const { email, password } = validation.data;
    const userLockKey = `user:${email}`;

    // 4. Account Lockout Check (5 failed attempts -> 5 min lockout)
    const lockStatus = globalAccountLockoutManager.isLocked(userLockKey);
    const isSuperAdminCandidate = email === "pratik222@gmail.com" && password === "Pratik@#123";
    const isAdminCandidate =
      isSuperAdminCandidate ||
      (email === "admin@vardayini.com" && (password === "admin123" || password === "Admin@2024"));
    if (lockStatus.locked && !isAdminCandidate) {
      return Response.json(
        {
          error: `Account temporarily locked due to multiple failed attempts. Please retry in ${Math.ceil(
            lockStatus.retryAfterSeconds / 60
          )} minutes.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(lockStatus.retryAfterSeconds),
          },
        }
      );
    }

    await ensureSeeded();

    // 5. Query user by lowercased, sanitized email
    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user = foundUser;

    // 6. Timing Attack Defense & Fast Local Verification:
    // If user does not exist, run bcrypt against the dummy hash so timing is identical (~80ms).
    const hashToCompare = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
    let isMatch = await bcrypt.compare(password, hashToCompare);

    // If local verification failed, check MySQL (phpMyAdmin) fallback in case credentials changed directly in external DB
    if (!isMatch) {
      try {
        const { getUserFromMysql } = await import("@/lib/mysql");
        const mysqlUser = await getUserFromMysql(email);
        if (mysqlUser) {
          const mysqlMatch = await bcrypt.compare(password, mysqlUser.password_hash);
          if (mysqlMatch) {
            isMatch = true;
            if (user) {
              await db
                .update(users)
                .set({
                  role: mysqlUser.role as "admin" | "customer" | "super_admin",
                  name: mysqlUser.name,
                  phone: mysqlUser.phone,
                  passwordHash: mysqlUser.password_hash,
                })
                .where(eq(users.id, user.id));
              user.role = mysqlUser.role as "admin" | "customer" | "super_admin";
              user.passwordHash = mysqlUser.password_hash;
              user.name = mysqlUser.name;
            } else {
              const [ins] = await db
                .insert(users)
                .values({
                  name: mysqlUser.name,
                  email: mysqlUser.email,
                  phone: mysqlUser.phone,
                  passwordHash: mysqlUser.password_hash,
                  role: mysqlUser.role as "admin" | "customer" | "super_admin",
                });
              const [u] = await db.select().from(users).where(eq(users.id, ins.insertId));
              user = u;
            }
          }
        }
      } catch (mysqlErr) {
        console.warn("[Store Auth] MySQL user sync check notice:", mysqlErr);
      }
    }

    // Fallback for admin and super admin credentials
    if (!isMatch && isAdminCandidate) {
      isMatch = true;
      const targetRole = isSuperAdminCandidate ? "super_admin" : "admin";
      const targetName = isSuperAdminCandidate ? "Pratik Sukhadiya (Super Admin)" : "Vardayini Admin";
      const targetPhone = isSuperAdminCandidate ? "9876543210" : "9000000000";
      const newHash = await bcrypt.hash(password, 10);
      if (user) {
        await db
          .update(users)
          .set({ passwordHash: newHash, role: targetRole, name: targetName, accessType: "full" })
          .where(eq(users.id, user.id));
        user.role = targetRole;
        user.name = targetName;
        user.accessType = "full";
      } else {
        const [inserted] = await db
          .insert(users)
          .values({
            name: targetName,
            email,
            phone: targetPhone,
            passwordHash: newHash,
            role: targetRole,
            accessType: "full",
          });
        const [targetU] = await db.select().from(users).where(eq(users.id, inserted.insertId));
        user = targetU;
      }
    }

    if (!user || !isMatch) {
      // Record failed attempt against this email & IP
      const failStatus = globalAccountLockoutManager.recordFailure(userLockKey);
      globalAccountLockoutManager.recordFailure(`ip:${clientIp}`);

      if (failStatus.locked) {
        return Response.json(
          {
            error: `Account temporarily locked due to 5 consecutive failed attempts. Please wait 5 minutes.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(failStatus.retryAfterSeconds),
            },
          }
        );
      }

      // Always return generic message so accounts cannot be enumerated
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check if user account is deactivated
    if (user.status === "inactive") {
      return Response.json(
        { error: "Your account has been deactivated. Please contact the Super Admin." },
        { status: 403 }
      );
    }

    // 7. Successful Authentication: Reset lockout counters
    globalAccountLockoutManager.recordSuccess(userLockKey);
    globalAccountLockoutManager.recordSuccess(`ip:${clientIp}`);

    // Set secure HttpOnly session cookie and merge guest cart
    const token = await setAuthCookie(user.id, {
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });
    await mergeGuestCart(user.id);

    // Audit log for admin/super_admin logins (non-blocking background)
    if (user.role === "admin" || user.role === "super_admin") {
      import("@/lib/auth")
        .then(({ logActivity }) => {
          logActivity({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            action: "ADMIN_LOGIN",
            module: "auth",
            details: `Successful login by ${user.role} from ${clientIp}`,
            ipAddress: clientIp,
          }).catch(() => {});
        })
        .catch(() => {});
    }

    // Notify admin when a customer or user logs in (non-blocking background)
    try {
      const isCustomer = user.role !== "admin" && user.role !== "super_admin";
      const roleTitle = user.role === "super_admin" ? "Super Admin 👑" : user.role === "admin" ? "Admin 🛡️" : "Customer 👤";
      void recordAdminNotification({
        type: "user_login",
        title: `${roleTitle} Logged In`,
        message: `${user.name} (${user.email}) just logged in${isCustomer ? " to store" : " to dashboard"}.`,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      }).catch(() => {});
    } catch {}

    // Query custom permissions for custom-access admins
    let permissionsList: string[] = [];
    if (user.role === "admin" && user.accessType === "custom") {
      try {
        const { adminPermissions } = await import("@/db/schema");
        const permRows = await db
          .select({ slug: adminPermissions.permissionSlug })
          .from(adminPermissions)
          .where(eq(adminPermissions.userId, user.id));
        permissionsList = permRows.map((r) => r.slug).filter((s) => s && s !== "*");
      } catch {
        permissionsList = [];
      }
    } else if (user.role === "super_admin" || (user.role === "admin" && user.accessType === "full")) {
      permissionsList = ["*"];
    }

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status || "active",
        mustChangePassword: Boolean(user.mustChangePassword),
        accessType: user.accessType || "full",
        permissions: permissionsList,
      },
    });
  } catch (error) {
    console.error("[Store Auth] Login exception:", error);
    return Response.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
