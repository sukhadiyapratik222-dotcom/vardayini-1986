/**
 * Role-Based Access Control (RBAC) Architecture
 * Vardayini Sweet Mart Enterprise Administration
 * 
 * Hierarchy:
 * 1. Super Admin (super_admin) - Unconstrained system control (*)
 * 2. Store Admin (store_admin) - Store-scoped full administration
 * 3. Inventory Admin (inventory_admin) - Products, stock, catalog
 * 4. Order Manager (order_manager) - Orders, pickups, dispatches, refunds
 * 5. Customer Support (customer_support) - Inquiries, customer relations
 * 6. Staff (staff) - Counter / kitchen operations view
 * 7. Custom Roles - Dynamic roles created by Super Admin
 */

export interface RbacModule {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface RbacAction {
  id: string;
  name: string;
  description: string;
}

export const RBAC_MODULES: RbacModule[] = [
  { id: "dashboard", name: "Dashboard", description: "Store telemetry, live metrics, executive KPI overview", icon: "📊" },
  { id: "products", name: "Products", description: "Catalog, sweet varieties, pack sizes, and prices", icon: "🍬" },
  { id: "inventory", name: "Inventory", description: "Stock levels, replenishment alerts, warehouse count", icon: "📦" },
  { id: "categories", name: "Categories", description: "Mithai, Farsan, Dry Fruits taxonomies", icon: "🏷️" },
  { id: "orders", name: "Orders", description: "Orders processing, dispatch tracking, doorstep delivery", icon: "🛍️" },
  { id: "payments", name: "Payments", description: "UPI, COD, Card settlements and financial records", icon: "💳" },
  { id: "refunds", name: "Refunds", description: "Cancellation refunds and payment reversals", icon: "💸" },
  { id: "customers", name: "Customers", description: "Registered patrons, guest accounts, delivery addresses", icon: "👥" },
  { id: "admins", name: "Admin Management", description: "Admin accounts, roles assignment, security audits", icon: "🛡️" },
  { id: "stores", name: "Store Management", description: "Physical outlet addresses, pickup slots & fleet hubs", icon: "🏬" },
  { id: "reports", name: "Reports", description: "Sales analytics, financial audit logs & SMS usage", icon: "📈" },
  { id: "notifications", name: "Notifications", description: "Admin broadcast alerts & DLT order triggers", icon: "🔔" },
  { id: "settings", name: "Settings", description: "Global storefront configuration, banner & identity", icon: "⚙️" },
];

export const RBAC_ACTIONS: RbacAction[] = [
  { id: "view", name: "View", description: "Read-only access to view module data" },
  { id: "create", name: "Create", description: "Ability to add new records" },
  { id: "edit", name: "Edit", description: "Ability to modify existing records" },
  { id: "delete", name: "Delete", description: "Ability to delete or archive records" },
  { id: "approve", name: "Approve", description: "Authorize high-value changes or requests" },
  { id: "export", name: "Export", description: "Download CSV, Excel or PDF reports" },
];

export interface SystemRoleDefinition {
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  defaultPermissions: string[];
}

// Generate the 78 permissions (13 modules x 6 actions)
export const ALL_PERMISSIONS = RBAC_MODULES.flatMap((mod) =>
  RBAC_ACTIONS.map((act) => ({
    slug: `${mod.id}:${act.id}`,
    name: `${act.name} ${mod.name}`,
    module: mod.id,
    action: act.id,
    description: `Allows admin to ${act.name.toLowerCase()} ${mod.name.toLowerCase()} records.`,
  }))
);

export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    slug: "super_admin",
    name: "Super Admin",
    description: "Complete unrestricted access across all modules, stores, and security controls.",
    isSystem: true,
    defaultPermissions: ["*"],
  },
  {
    slug: "store_admin",
    name: "Store Admin",
    description: "Full administrative control scoped to the assigned retail store location.",
    isSystem: true,
    defaultPermissions: [
      "dashboard:view", "dashboard:export",
      "products:view", "products:create", "products:edit", "products:export",
      "inventory:view", "inventory:create", "inventory:edit", "inventory:export",
      "categories:view", "categories:create", "categories:edit",
      "orders:view", "orders:create", "orders:edit", "orders:approve", "orders:export",
      "payments:view", "payments:export",
      "refunds:view", "refunds:create", "refunds:approve",
      "customers:view", "customers:export",
      "stores:view", "stores:edit",
      "reports:view", "reports:export",
      "notifications:view", "notifications:create",
      "settings:view", "settings:edit",
    ],
  },
  {
    slug: "inventory_admin",
    name: "Inventory Admin",
    description: "Dedicated to catalog curation, pricing updates, pack sizes, and warehouse stock balance.",
    isSystem: true,
    defaultPermissions: [
      "dashboard:view",
      "products:view", "products:create", "products:edit", "products:delete", "products:approve", "products:export",
      "inventory:view", "inventory:create", "inventory:edit", "inventory:approve", "inventory:export",
      "categories:view", "categories:create", "categories:edit", "categories:delete", "categories:export",
      "reports:view", "reports:export",
      "notifications:view",
    ],
  },
  {
    slug: "order_manager",
    name: "Order Manager",
    description: "Handles live orders, kitchen prep statuses, packing seals, dispatch, and pickup verification.",
    isSystem: true,
    defaultPermissions: [
      "dashboard:view",
      "orders:view", "orders:create", "orders:edit", "orders:approve", "orders:export",
      "refunds:view", "refunds:create", "refunds:approve", "refunds:export",
      "customers:view",
      "stores:view",
      "reports:view", "reports:export",
      "notifications:view", "notifications:create",
    ],
  },
  {
    slug: "customer_support",
    name: "Customer Support",
    description: "Assists patrons with order tracking, reviews, address updates, and ticket resolutions.",
    isSystem: true,
    defaultPermissions: [
      "dashboard:view",
      "orders:view",
      "customers:view", "customers:edit",
      "refunds:view", "refunds:create",
      "products:view",
      "stores:view",
      "notifications:view",
    ],
  },
  {
    slug: "staff",
    name: "Staff",
    description: "Counter personnel and kitchen team with view access to active orders and inventory counts.",
    isSystem: true,
    defaultPermissions: [
      "dashboard:view",
      "orders:view",
      "inventory:view",
      "products:view",
      "stores:view",
    ],
  },
];

export interface AuthUserWithPermissions {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  storeId?: number | null;
}

/**
 * Checks whether an authenticated user holds a specific permission.
 * Evaluates wildcards, super_admin bypass, and granular slug matching.
 * Accepts either (userObject, requiredPermission) or (role, permissionsArray, requiredPermission).
 */
export function checkUserPermission(
  userOrRole: string | { role?: string; permissions?: string[] },
  permissionsOrRequired?: string[] | string | string[],
  requiredPermission?: string | string[]
): boolean {
  let role = "";
  let permissions: string[] = [];
  let required: string | string[] = "";

  if (typeof userOrRole === "object" && userOrRole !== null) {
    role = userOrRole.role || "";
    permissions = userOrRole.permissions || [];
    required = (permissionsOrRequired as string | string[]) || "";
  } else {
    role = String(userOrRole || "");
    if (Array.isArray(permissionsOrRequired)) {
      permissions = permissionsOrRequired;
      required = requiredPermission || "";
    } else {
      permissions = [];
      required = (permissionsOrRequired as string | string[]) || "";
    }
  }

  if (role === "super_admin") return true;
  if (!required) return true;

  const reqList = Array.isArray(required) ? required : [required];
  if (reqList.length === 0) return true;

  return reqList.some((req) => {
    if (permissions.includes("*")) return true;
    if (permissions.includes(req)) return true;

    const [reqModule, reqAction] = req.split(":");
    if (permissions.includes(`${reqModule}:*`)) return true;
    if (permissions.includes(reqModule)) return true;

    if (
      reqAction === "view" &&
      (permissions.includes(`${reqModule}:edit`) ||
        permissions.includes(`${reqModule}:create`) ||
        permissions.includes(`${reqModule}:delete`) ||
        permissions.includes(`${reqModule}:approve`) ||
        permissions.includes(`${reqModule}:manage`))
    ) {
      return true;
    }

    if (permissions.includes(`${reqModule}:manage`)) {
      return true;
    }

    return false;
  });
}

/**
 * Retrieves the store scope for an admin user.
 * Returns null if the admin has global multi-store visibility (e.g. Super Admin or unassigned Store Admin).
 */
export function getScopedStoreId(user: { role?: string; storeId?: number | null }): number | null {
  if (!user || user.role === "super_admin") return null;
  return user.storeId ?? null;
}
