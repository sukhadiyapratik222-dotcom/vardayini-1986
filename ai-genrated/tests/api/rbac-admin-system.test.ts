import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { GET as getAdmins, POST as createAdmin, PUT as updateAdmin, DELETE as deleteAdmin } from "@/app/api/admin/admins/route";
import { POST as resetAdminPassword } from "@/app/api/admin/admins/reset-password/route";
import { GET as getActivityLogs } from "@/app/api/admin/activity-logs/route";
import { GET as getCmsPages, POST as createCmsPage, PUT as updateCmsPage, DELETE as deleteCmsPage } from "@/app/api/admin/pages/route";
import { GET as getPublicPage } from "@/app/api/pages/[slug]/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as changePasswordRoute } from "@/app/api/auth/change-password/route";
import { buildRequest, loginAs, logout, mockCookieStore } from "../helpers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, cmsPages, activityLogs } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

describe("Role-Based Access Control (RBAC) Admin Management System", () => {
  let superAdminUser: { id: number; email: string; role: string };
  let staffAdminUser: { id: number; email: string; role: string };
  let customerUser: { id: number; email: string; role: string };

  beforeEach(async () => {
    await ensureSeeded();

    // Query or seed Super Admin (pratik222@gmail.com)
    let [superAdmin] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, "pratik222@gmail.com"))
      .limit(1);

    if (!superAdmin) {
      const [newSuper] = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.role, "super_admin"))
        .limit(1);
      superAdmin = newSuper;
    }
    superAdminUser = superAdmin;

    // Query standard Admin (admin@vardayini.com)
    const [staffAdmin] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, "admin@vardayini.com"))
      .limit(1);
    staffAdminUser = staffAdmin;

    // Query standard Customer (aanya@vardayini.com)
    const [customer] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, "aanya@vardayini.com"))
      .limit(1);
    customerUser = customer;

    await logout();
    mockCookieStore.clear();
  });

  // 1. Super Admin Role Capabilities
  describe("Super Admin Privileges", () => {
    it("allows Super Admin to view all administrators and available permissions", async () => {
      await loginAs(superAdminUser.id);
      const req = buildRequest({ method: "GET", url: "/api/admin/admins" });
      const res = await getAdmins(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.admins)).toBe(true);
      expect(data.admins.some((a: { role: string }) => a.role === "super_admin")).toBe(true);
      expect(Array.isArray(data.availablePermissions)).toBe(true);
    });

    it("allows Super Admin to create a new sub-admin with custom permissions and forced password change", async () => {
      await loginAs(superAdminUser.id);
      const testEmail = `subadmin_${Date.now()}@test.com`;

      const req = buildRequest({
        method: "POST",
        url: "/api/admin/admins",
        body: {
          name: "Junior Content Admin",
          email: testEmail,
          phone: "9123456780",
          password: "TempPassword#123",
          role: "admin",
          accessType: "custom",
          permissions: ["pages:read", "pages:write"],
          mustChangePassword: true,
        },
      });

      const res = await createAdmin(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.admin.email).toBe(testEmail);
      expect(data.admin.role).toBe("admin");
      expect(data.admin.accessType).toBe("custom");
      expect(data.admin.permissions).toContain("pages:read");

      // Verify DB record
      const [dbUser] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
      expect(dbUser).toBeDefined();
      expect(dbUser.mustChangePassword).toBe(true);
    });

    it("allows Super Admin to reset an admin's password and enforce change on next login", async () => {
      await loginAs(superAdminUser.id);

      const req = buildRequest({
        method: "POST",
        url: "/api/admin/admins/reset-password",
        body: {
          adminId: staffAdminUser.id,
          newPassword: "ResetPassword@2026",
        },
      });

      const res = await resetAdminPassword(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify that mustChangePassword was set to true
      const [adminRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, staffAdminUser.id))
        .limit(1);
      expect(adminRecord.mustChangePassword).toBe(true);
    });

    it("allows Super Admin to inspect audit activity logs with who, what, when, and IP", async () => {
      await loginAs(superAdminUser.id);

      const req = buildRequest({ method: "GET", url: "/api/admin/activity-logs?limit=10" });
      const res = await getActivityLogs(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      if (data.logs.length > 0) {
        const log = data.logs[0];
        expect(log).toHaveProperty("action");
        expect(log).toHaveProperty("module");
        expect(log).toHaveProperty("ipAddress");
        expect(log).toHaveProperty("createdAt");
      }
    });
  });

  // 2. Super Admin Immunity
  describe("Super Admin Immunity Protection", () => {
    it("prohibits deactivating the Super Admin account (returns 403 Forbidden)", async () => {
      await loginAs(superAdminUser.id);

      const req = buildRequest({
        method: "PUT",
        url: "/api/admin/admins",
        body: {
          id: superAdminUser.id,
          status: "inactive",
        },
      });

      const res = await updateAdmin(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/cannot be deactivated/i);
    });

    it("prohibits deleting the Super Admin account (returns 403 Forbidden)", async () => {
      await loginAs(superAdminUser.id);

      const req = buildRequest({
        method: "DELETE",
        url: `/api/admin/admins?id=${superAdminUser.id}`,
      });

      const res = await deleteAdmin(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/cannot be deleted/i);
    });
  });

  // 3. Regular Admin Isolation & Unauthorized Access Denial (403 Forbidden)
  describe("Regular Admin Restrictions & 403 Access Denials", () => {
    it("returns 403 Forbidden when regular Admin attempts to view all admins", async () => {
      await loginAs(staffAdminUser.id);

      const req = buildRequest({ method: "GET", url: "/api/admin/admins" });
      const res = await getAdmins(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Super Admin access required/i);
    });

    it("returns 403 Forbidden when regular Admin attempts to create another admin", async () => {
      await loginAs(staffAdminUser.id);

      const req = buildRequest({
        method: "POST",
        url: "/api/admin/admins",
        body: {
          name: "Rogue Admin",
          email: "rogue@test.com",
          password: "Password123!",
        },
      });

      const res = await createAdmin(req);
      expect(res.status).toBe(403);
    });

    it("returns 403 Forbidden when regular Admin attempts to view activity audit logs", async () => {
      await loginAs(staffAdminUser.id);

      const req = buildRequest({ method: "GET", url: "/api/admin/activity-logs" });
      const res = await getActivityLogs(req);
      expect(res.status).toBe(403);
    });

    it("returns 401/403 when customer or anonymous user attempts admin endpoints", async () => {
      // Anonymous
      const anonReq = buildRequest({ method: "GET", url: "/api/admin/admins" });
      const anonRes = await getAdmins(anonReq);
      expect([401, 403]).toContain(anonRes.status);

      // Customer
      await loginAs(customerUser.id);
      const custReq = buildRequest({ method: "GET", url: "/api/admin/admins" });
      const custRes = await getAdmins(custReq);
      expect(custRes.status).toBe(403);
    });
  });

  // 4. Privilege Escalation Prevention
  describe("Privilege Escalation Prevention", () => {
    it("prevents assigning role: 'super_admin' when creating an admin", async () => {
      await loginAs(superAdminUser.id);

      const req = buildRequest({
        method: "POST",
        url: "/api/admin/admins",
        body: {
          name: "Fake Super Admin",
          email: `fake_${Date.now()}@test.com`,
          password: "Password123!",
          role: "super_admin", // Attempt privilege escalation
        },
      });

      const res = await createAdmin(req);
      // Either rejects or automatically forces role to 'admin'
      if (res.status === 201) {
        const data = await res.json();
        expect(data.admin.role).toBe("admin"); // Escalation blocked
      } else {
        expect([400, 403]).toContain(res.status);
      }
    });
  });

  // 5. Inactive Account Lockout
  describe("Account Inactivity Lockout", () => {
    it("blocks deactivated accounts with 403 Forbidden during login", async () => {
      // Create or update a test user to inactive
      const inactiveEmail = `inactive_${Date.now()}@test.com`;
      const testPassword = "DeactivatedPassword#123";
      const passwordHash = await bcrypt.hash(testPassword, 10);
      await db.insert(users).values({
        name: "Deactivated Staff",
        email: inactiveEmail,
        phone: "9123456789",
        passwordHash,
        role: "admin",
        status: "inactive",
      });

      const req = buildRequest({
        method: "POST",
        url: "/api/auth/login",
        body: {
          email: inactiveEmail,
          password: testPassword,
        },
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/inactive|deactivated/i);
    });
  });

  // 6. CMS Pages Module CRUD
  describe("CMS Pages Content Management", () => {
    let createdPageId: number;
    const testSlug = `about-heritage-${Date.now()}`;

    it("allows authorized admin to create a new CMS content page", async () => {
      await loginAs(superAdminUser.id);

      const req = buildRequest({
        method: "POST",
        url: "/api/admin/pages",
        body: {
          title: "Vardayini 1976 Heritage",
          slug: testSlug,
          content: "<p>Since 1976 in Mandvi, Vadodara, crafting pure Desi Ghee sweets.</p>",
          metaTitle: "Heritage of Vardayini Sweet Mart",
          metaDescription: "Our timeless legacy of authentic sweets and savouries.",
          isPublished: true,
        },
      });

      const res = await createCmsPage(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.page.slug).toBe(testSlug);
      createdPageId = data.page.id;
    });

    it("allows public access to read the published CMS page by slug", async () => {
      await logout();

      const req = buildRequest({ method: "GET", url: `/api/pages/${testSlug}` });
      const res = await getPublicPage(req, {
        params: Promise.resolve({ slug: testSlug }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.page.slug).toBe(testSlug);
      expect(data.page.title).toBe("Vardayini 1976 Heritage");
    });

    it("allows updating and deleting the CMS page", async () => {
      await loginAs(superAdminUser.id);

      // Update
      const updateReq = buildRequest({
        method: "PUT",
        url: "/api/admin/pages",
        body: {
          id: createdPageId,
          title: "Vardayini 1976 Heritage (Updated)",
        },
      });
      const updateRes = await updateCmsPage(updateReq);
      expect(updateRes.status).toBe(200);

      // Delete
      const delReq = buildRequest({
        method: "DELETE",
        url: `/api/admin/pages?id=${createdPageId}`,
      });
      const delRes = await deleteCmsPage(delReq);
      expect(delRes.status).toBe(200);
    });
  });
});
