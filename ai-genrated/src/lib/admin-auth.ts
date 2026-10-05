import { getAuthUser, requireAdmin, type RequireAdminResult } from "@/lib/auth";

export { requireAdmin, type RequireAdminResult };

/**
 * Validates admin authorization for administrative API endpoints.
 * Supports session cookies and service-to-service admin key authorization.
 */
export async function isAuthorizedAdmin(req?: Request): Promise<boolean> {
  const res = await requireAdmin(req);
  return Boolean(res.user && res.user.role === "admin");
}
