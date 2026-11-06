import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { RBAC_MODULES, RBAC_ACTIONS, ALL_PERMISSIONS } from "@/lib/rbac";
import { db } from "@/db";
import { permissions as permissionsTable } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/permissions
 * Returns all granular module-wise permissions grouped by module.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req, "admins:view");
  if (auth.error) return auth.error;

  try {
    const dbPerms = await db.select().from(permissionsTable);
    const dbPermMap = new Map(dbPerms.map((p) => [p.slug, p]));

    // Group the 78 permissions by module
    const grouped = RBAC_MODULES.map((mod) => {
      const modulePermissions = RBAC_ACTIONS.map((act) => {
        const slug = `${mod.id}:${act.id}`;
        const dbPerm = dbPermMap.get(slug);
        return {
          id: dbPerm?.id || null,
          slug,
          name: `${act.name} ${mod.name}`,
          module: mod.id,
          action: act.id,
          description: dbPerm?.description || `Allows admin to ${act.name.toLowerCase()} ${mod.name.toLowerCase()} records.`,
        };
      });

      return {
        module: mod.id,
        name: mod.name,
        icon: mod.icon,
        description: mod.description,
        permissions: modulePermissions,
      };
    });

    return NextResponse.json({
      success: true,
      modules: RBAC_MODULES,
      actions: RBAC_ACTIONS,
      grouped,
      allPermissions: ALL_PERMISSIONS,
    });
  } catch (err: any) {
    console.error("[GetPermissions] Error:", err);
    return NextResponse.json({ error: "Failed to retrieve permissions" }, { status: 500 });
  }
}
