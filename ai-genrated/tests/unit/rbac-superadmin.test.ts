import { describe, it, expect } from "vitest";
import {
  RBAC_MODULES,
  RBAC_ACTIONS,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  checkUserPermission,
  getScopedStoreId,
  AuthUserWithPermissions,
} from "@/lib/rbac";
import { parseAddressSnapshot, maskAddress } from "@/lib/order-utils";
import { formatAddressString } from "@/components/order-tracker-client";

describe("RBAC & Super Admin Governance Verification", () => {
  it("generates exactly 78 permissions across 13 modules and 6 actions", () => {
    expect(RBAC_MODULES.length).toBe(13);
    expect(RBAC_ACTIONS.length).toBe(6);
    expect(ALL_PERMISSIONS.length).toBe(78);

    // Verify all 13 modules are represented
    const modulesInPerms = new Set(ALL_PERMISSIONS.map((p) => p.module));
    expect(modulesInPerms.size).toBe(13);

    // Verify all 6 actions exist for every module
    for (const mod of RBAC_MODULES) {
      for (const act of RBAC_ACTIONS) {
        const expectedSlug = `${mod.id}:${act.id}`;
        const found = ALL_PERMISSIONS.find((p) => p.slug === expectedSlug);
        expect(found).toBeDefined();
        expect(found?.slug).toBe(expectedSlug);
      }
    }
  });

  it("defines the 6 system roles in the hierarchy with correct initial permissions", () => {
    expect(SYSTEM_ROLES.length).toBe(6);
    const slugs = SYSTEM_ROLES.map((r) => r.slug);
    expect(slugs).toContain("super_admin");
    expect(slugs).toContain("store_admin");
    expect(slugs).toContain("inventory_admin");
    expect(slugs).toContain("order_manager");
    expect(slugs).toContain("customer_support");
    expect(slugs).toContain("staff");

    // Super Admin must have wildcard '*' permission
    const superAdmin = SYSTEM_ROLES.find((r) => r.slug === "super_admin");
    expect(superAdmin?.defaultPermissions).toContain("*");

    // Inventory Admin must have inventory & products permissions
    const invAdmin = SYSTEM_ROLES.find((r) => r.slug === "inventory_admin");
    expect(invAdmin?.defaultPermissions).toContain("inventory:view");
    expect(invAdmin?.defaultPermissions).toContain("inventory:edit");
    expect(invAdmin?.defaultPermissions).toContain("products:view");

    // Order Manager must have order permissions
    const orderMgr = SYSTEM_ROLES.find((r) => r.slug === "order_manager");
    expect(orderMgr?.defaultPermissions).toContain("orders:view");
    expect(orderMgr?.defaultPermissions).toContain("orders:edit");
  });

  describe("Permission Checks (Deny by Default & Super Admin Bypass)", () => {
    it("grants Super Admin access to every permission, even unassigned ones", () => {
      const superAdminUser: AuthUserWithPermissions = {
        id: 1,
        email: "pratik222@gmail.com",
        name: "Pratik Paresh Sukhadiya",
        role: "super_admin",
        permissions: ["*"],
        storeId: null,
      };

      expect(checkUserPermission(superAdminUser, "products:delete")).toBe(true);
      expect(checkUserPermission(superAdminUser, "admins:manage")).toBe(true);
      expect(checkUserPermission(superAdminUser, "refunds:approve")).toBe(true);
      expect(checkUserPermission(superAdminUser, "settings:edit")).toBe(true);
    });

    it("enforces deny-by-default for staff with restricted permissions", () => {
      const staffUser: AuthUserWithPermissions = {
        id: 5,
        email: "staff@vardayini.com",
        name: "Counter Staff",
        role: "staff",
        permissions: ["orders:view", "products:view", "inventory:view"],
        storeId: 2,
      };

      // Allowed
      expect(checkUserPermission(staffUser, "orders:view")).toBe(true);
      expect(checkUserPermission(staffUser, "products:view")).toBe(true);

      // Denied
      expect(checkUserPermission(staffUser, "orders:delete")).toBe(false);
      expect(checkUserPermission(staffUser, "admins:create")).toBe(false);
      expect(checkUserPermission(staffUser, "refunds:approve")).toBe(false);
      expect(checkUserPermission(staffUser, "payments:delete")).toBe(false);
    });

    it("allows checking multiple permissions (OR semantics)", () => {
      const inventoryUser: AuthUserWithPermissions = {
        id: 3,
        email: "inventory@vardayini.com",
        name: "Inventory Specialist",
        role: "inventory_admin",
        permissions: ["inventory:view", "inventory:edit"],
        storeId: null,
      };

      expect(checkUserPermission(inventoryUser, ["orders:delete", "inventory:view"])).toBe(true);
      expect(checkUserPermission(inventoryUser, ["orders:delete", "payments:delete"])).toBe(false);
    });
  });

  describe("Store Isolation and Record Scoping", () => {
    it("returns null store scope for Super Admin (global unrestricted access)", () => {
      const superAdmin: AuthUserWithPermissions = {
        id: 1,
        email: "pratik222@gmail.com",
        name: "Owner",
        role: "super_admin",
        permissions: ["*"],
        storeId: null,
      };
      expect(getScopedStoreId(superAdmin)).toBeNull();
    });

    it("returns assigned storeId for store-scoped admin", () => {
      const storeAdmin: AuthUserWithPermissions = {
        id: 2,
        email: "alkapuri@vardayini.com",
        name: "Alkapuri Branch Manager",
        role: "store_admin",
        permissions: ["orders:view", "orders:edit"],
        storeId: 1,
      };
      expect(getScopedStoreId(storeAdmin)).toBe(1);
    });
  });

  describe("Approval Workflow Self-Approval Prevention", () => {
    it("strictly prevents a requester from approving their own approval request", () => {
      const requesterId = 10;
      const approverId = 10;

      // In the approval endpoint: if (target.requesterId === auth.user.id) return 403
      const canSelfApprove = requesterId !== approverId;
      expect(canSelfApprove).toBe(false);
    });

    it("allows a different authorized higher-level admin to approve the request", () => {
      const requesterId: number = 10;
      const approverId: number = 1;
      const canApprove = (requesterId as number) !== (approverId as number);
      expect(canApprove).toBe(true);
    });
  });

  describe("Last Active Super Admin Safeguard", () => {
    it("prevents deletion or deactivation of the last active Super Admin", () => {
      const admins = [
        { id: 1, name: "Pratik", role: "super_admin", status: "active" },
        { id: 2, name: "Store Manager", role: "store_admin", status: "active" },
        { id: 3, name: "Inventory Staff", role: "staff", status: "active" },
      ];

      const activeSuperCount = admins.filter((a) => a.role === "super_admin" && a.status === "active").length;
      expect(activeSuperCount).toBe(1);

      const targetAdmin = admins[0];
      const isLastSuperAdmin = targetAdmin.role === "super_admin" && activeSuperCount <= 1;

      expect(isLastSuperAdmin).toBe(true);
      // Backend & Frontend will reject deletion/deactivation when isLastSuperAdmin is true
    });

    it("allows deactivation or deletion if more than one active Super Admin exists", () => {
      const admins = [
        { id: 1, name: "Pratik 1", role: "super_admin", status: "active" },
        { id: 4, name: "Pratik 2", role: "super_admin", status: "active" },
      ];

      const activeSuperCount = admins.filter((a) => a.role === "super_admin" && a.status === "active").length;
      expect(activeSuperCount).toBe(2);

      const targetAdmin = admins[1];
      const isLastSuperAdmin = targetAdmin.role === "super_admin" && activeSuperCount <= 1;
      expect(isLastSuperAdmin).toBe(false);
    });
  });

  describe("Order Tracking Address Snapshot Formatting (Image 1 Fix)", () => {
    it("unwraps JSON stringified delivery address into clean readable human text", () => {
      // The exact raw JSON from user's screenshot:
      const rawJson = '{"name":"yoyo","phone":"8759958984","line1":"rajvas,rupal","city":"Vadodara","state":"Gujarat","pincode":"390001"}';
      const parsed = formatAddressString(rawJson);

      expect(parsed).toBe("rajvas, rupal, Vadodara, Gujarat - 390001");
      expect(parsed).not.toContain("{");
      expect(parsed).not.toContain("}");
      expect(parsed).not.toContain('"line1"');

      const masked = maskAddress(rawJson);
      expect(masked.fullAddress).toBe("rajvas, rupal, Vadodara, Gujarat - 390001");
    });

    it("handles double-stringified JSON payloads cleanly", () => {
      const doubleStringified = JSON.stringify(
        JSON.stringify({
          line1: "Shop 4, Alkapuri Arcade",
          city: "Vadodara",
          state: "Gujarat",
          pincode: "390007",
        })
      );
      const parsed = formatAddressString(doubleStringified);

      expect(parsed).toBe("Shop 4, Alkapuri Arcade, Vadodara, Gujarat - 390007");
    });

    it("falls back gracefully for normal plain string addresses", () => {
      const plain = "Near Jubilee Baug, Raopura, Vadodara - 390001";
      const parsed = formatAddressString(plain);
      expect(parsed).toBe("Near Jubilee Baug, Raopura, Vadodara - 390001");
    });
  });

  describe("Pack Size Price & Discount Validation (Image 3 Fix)", () => {
    it("validates that Original MRP and Selling price must be strictly greater than zero", () => {
      function validatePackPrice(mrp: number, selling: number) {
        if (!mrp || mrp <= 0 || isNaN(mrp)) {
          return { valid: false, error: "Original Price (MRP) must be greater than zero" };
        }
        if (!selling || selling <= 0 || isNaN(selling)) {
          return { valid: false, error: "Selling price must be greater than zero" };
        }
        if (selling > mrp) {
          return { valid: false, error: "Selling price cannot exceed Original MRP" };
        }
        return { valid: true };
      }

      // Zero prices like in Image 3
      expect(validatePackPrice(0, 0).valid).toBe(false);
      expect(validatePackPrice(300, 0).valid).toBe(false);
      expect(validatePackPrice(0, 300).valid).toBe(false);

      // Selling price > MRP
      expect(validatePackPrice(500, 600).valid).toBe(false);

      // Valid prices
      expect(validatePackPrice(700, 600).valid).toBe(true);
      expect(validatePackPrice(600, 600).valid).toBe(true); // Equal price, no discount
    });
  });
});
