import { getAuthUser, requireAdmin, type RequireAdminResult } from "@/lib/auth";

export { requireAdmin, type RequireAdminResult };

/**
 * Validates admin authorization for administrative API endpoints.
 * Supports session cookies and service-to-service admin key authorization.
 */
export async function isAuthorizedAdmin(req?: Request, requiredPermission?: string): Promise<boolean> {
  const res = await requireAdmin(req, requiredPermission);
  return Boolean(res.user && !res.error);
}

export async function isAuthorizedSuperAdmin(req?: Request): Promise<boolean> {
  const res = await requireAdmin(req);
  return Boolean(res.user && res.user.role === "super_admin");
}
