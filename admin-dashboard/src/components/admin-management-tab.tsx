"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminItem, PermissionOption, api } from "@/lib/api";
import { RolesPermissionsView } from "./roles-permissions-view";
import { ApprovalsView } from "./approvals-view";
import { SecuritySessionsView } from "./security-sessions-view";
import { toast } from "@/lib/toast";

export interface SystemModuleDefinition {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  description: string;
  hasManageOption: boolean;
  viewSlug: string;
  manageSlug?: string;
}

export const SYSTEM_MODULES: SystemModuleDefinition[] = [
  {
    id: "overview",
    name: "Dashboard Overview",
    icon: "🌟",
    description: "Inspect live business metrics, gross revenue, order volume & activity stream",
    hasManageOption: false,
    viewSlug: "overview:view",
  },
  {
    id: "branding",
    name: "Change Logo & Identity",
    icon: "✨",
    description: "Store name, brand identity, header logos, contact details & color palette",
    hasManageOption: true,
    viewSlug: "branding:view",
    manageSlug: "branding:manage",
  },
  {
    id: "outlets",
    name: "Outlets & Stores",
    icon: "📍",
    badge: "Manage",
    description: "Physical sweet mart branches, pickup counters, addresses & GPS coordinates",
    hasManageOption: true,
    viewSlug: "outlets:view",
    manageSlug: "outlets:manage",
  },
  {
    id: "hero",
    name: "Change Hero Banner",
    icon: "🖼️",
    description: "Homepage hero banner carousel slides, headings, tags & call-to-action buttons",
    hasManageOption: true,
    viewSlug: "hero:view",
    manageSlug: "hero:manage",
  },
  {
    id: "announcements",
    name: "Banners & Promos",
    icon: "📢",
    description: "Top promotional announcement bars, festival ticker & seasonal alert banners",
    hasManageOption: true,
    viewSlug: "announcements:view",
    manageSlug: "announcements:manage",
  },
  {
    id: "bestsellers",
    name: "Customer Bestsellers",
    icon: "💎",
    badge: "Most Loved",
    description: "Real sales-ranked bestseller sweets, automated calculation & display rules",
    hasManageOption: true,
    viewSlug: "bestsellers:view",
    manageSlug: "bestsellers:manage",
  },
  {
    id: "welcome_offer",
    name: "Welcome Offer (10% Off)",
    icon: "🎁",
    badge: "Promo",
    description: "First-time visitor discount modal, voucher code & instant checkout perks",
    hasManageOption: true,
    viewSlug: "welcome_offer:view",
    manageSlug: "welcome_offer:manage",
  },
  {
    id: "testimonials",
    name: "Customer Testimonials",
    icon: "💬",
    badge: "Quotes",
    description: "Real customer review quotes, newest-first ordering & moderation controls",
    hasManageOption: true,
    viewSlug: "testimonials:view",
    manageSlug: "testimonials:manage",
  },
  {
    id: "new_launches",
    name: "New Launches (2026)",
    icon: "🚀",
    badge: "Page",
    description: "Newly released artisanal sweets, innovation showcase & seasonal launches",
    hasManageOption: true,
    viewSlug: "new_launches:view",
    manageSlug: "new_launches:manage",
  },
  {
    id: "special_items",
    name: "Our Special Items",
    icon: "⭐",
    badge: "14 items",
    description: "Curated royal mithai showcase, signature dry fruit & ghee specialties",
    hasManageOption: true,
    viewSlug: "special_items:view",
    manageSlug: "special_items:manage",
  },
  {
    id: "festivals",
    name: "Festival Specials",
    icon: "🪔",
    badge: "Manage",
    description: "Festive celebration sweets, Diwali/Rakhi hampers & limited edition boxes",
    hasManageOption: true,
    viewSlug: "festivals:view",
    manageSlug: "festivals:manage",
  },
  {
    id: "categories",
    name: "Categories",
    icon: "📁",
    badge: "23",
    description: "Product category catalog, category hierarchy, images & custom sort order",
    hasManageOption: true,
    viewSlug: "categories:view",
    manageSlug: "categories:manage",
  },
  {
    id: "products",
    name: "Products & Stock",
    icon: "🍬",
    badge: "Stock",
    description: "Sweets inventory, pricing, packaging weights, stock alerts & product creation",
    hasManageOption: true,
    viewSlug: "products:view",
    manageSlug: "products:manage",
  },
  {
    id: "orders",
    name: "Orders Desk",
    icon: "📦",
    description: "Customer online orders, status workflow, shipping details & invoice generation",
    hasManageOption: true,
    viewSlug: "orders:view",
    manageSlug: "orders:manage",
  },
  {
    id: "pickups",
    name: "Store Pickups",
    icon: "🏬",
    badge: "Live",
    description: "In-store pickup slots, customer OTP verification & counter handover desk",
    hasManageOption: true,
    viewSlug: "pickups:view",
    manageSlug: "pickups:manage",
  },
  {
    id: "reviews",
    name: "Customer Reviews",
    icon: "⭐",
    description: "Direct customer product ratings, feedback comments & review moderation",
    hasManageOption: true,
    viewSlug: "reviews:view",
    manageSlug: "reviews:manage",
  },
  {
    id: "customers",
    name: "Customer Directory",
    icon: "👥",
    badge: "5",
    description: "Registered patrons, phone numbers, delivery addresses & purchasing history",
    hasManageOption: true,
    viewSlug: "customers:view",
    manageSlug: "customers:manage",
  },
  {
    id: "pages",
    name: "CMS Pages & Policies",
    icon: "📄",
    description: "Corporate about us, quality assurance, terms, privacy & customer policy articles",
    hasManageOption: true,
    viewSlug: "pages:view",
    manageSlug: "pages:manage",
  },
  {
    id: "preview",
    name: "Live Store Preview",
    icon: "👁️",
    description: "Interactive real-time storefront preview for desktop, tablet and mobile",
    hasManageOption: false,
    viewSlug: "preview:view",
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    icon: "📊",
    badge: "Reports",
    description: "Sales, order volume, inventory movement, payment reconciliation & audit reports",
    hasManageOption: true,
    viewSlug: "reports:view",
    manageSlug: "reports:export",
  },
  {
    id: "sms_wallet",
    name: "SMS Wallet & Credits",
    icon: "💬",
    description: "Fast2SMS wallet balance, DLT SMS notifications, delivery logs & test alerts",
    hasManageOption: true,
    viewSlug: "sms_wallet:view",
    manageSlug: "sms_wallet:manage",
  },
];

export const getModuleAccessLevel = (
  mod: SystemModuleDefinition,
  perms: string[]
): "none" | "view" | "manage" => {
  if (perms.includes("*")) return "manage";

  // Check manage permissions
  if (mod.manageSlug && perms.includes(mod.manageSlug)) return "manage";
  if (perms.includes(`${mod.id}:manage`) || perms.includes(`${mod.id}:write`)) return "manage";

  // Legacy mappings for settings and products
  if (
    [
      "branding",
      "hero",
      "announcements",
      "bestsellers",
      "welcome_offer",
      "testimonials",
      "new_launches",
      "special_items",
      "sms_wallet",
    ].includes(mod.id) &&
    perms.includes("settings:manage")
  ) {
    return "manage";
  }

  if (["special_items", "categories"].includes(mod.id) && perms.includes("products:manage")) {
    return "manage";
  }

  // Check view permissions
  if (perms.includes(mod.viewSlug)) return "view";
  if (perms.includes(`${mod.id}:view`) || perms.includes(`${mod.id}:read`) || perms.includes(mod.id)) {
    return "view";
  }

  // Modules without distinct manage slug
  if (!mod.hasManageOption && perms.includes(mod.viewSlug)) return "view";

  return "none";
};

export const setModuleAccessLevel = (
  mod: SystemModuleDefinition,
  level: "none" | "view" | "manage",
  currentPerms: string[],
  setter: (perms: string[]) => void
) => {
  const slugsToRemove = new Set<string>([
    mod.viewSlug,
    mod.manageSlug || "",
    `${mod.id}:manage`,
    `${mod.id}:view`,
    `${mod.id}:read`,
    `${mod.id}:write`,
    mod.id,
  ].filter(Boolean));

  let next = currentPerms.filter((s) => !slugsToRemove.has(s) && s !== "*");

  if (level === "view") {
    next.push(mod.viewSlug);
  } else if (level === "manage") {
    next.push(mod.viewSlug);
    if (mod.manageSlug) {
      next.push(mod.manageSlug);
    }
  }

  setter(Array.from(new Set(next)));
};

export const grantAllModules = (setter: (perms: string[]) => void) => {
  const allSlugs: string[] = [];
  for (const m of SYSTEM_MODULES) {
    allSlugs.push(m.viewSlug);
    if (m.manageSlug) allSlugs.push(m.manageSlug);
  }
  setter(Array.from(new Set(allSlugs)));
};

export const setAllToReadOnly = (setter: (perms: string[]) => void) => {
  const viewSlugs = SYSTEM_MODULES.map((m) => m.viewSlug);
  setter(Array.from(new Set(viewSlugs)));
};

export const revokeAllModules = (setter: (perms: string[]) => void) => {
  setter([]);
};

function AccessControlMatrix({
  selectedPermissions,
  onUpdatePermissions,
}: {
  selectedPermissions: string[];
  onUpdatePermissions: (perms: string[]) => void;
}) {
  const stats = useMemo(() => {
    let manageCount = 0;
    let viewCount = 0;
    let noneCount = 0;
    for (const m of SYSTEM_MODULES) {
      const level = getModuleAccessLevel(m, selectedPermissions);
      if (level === "manage") manageCount++;
      else if (level === "view") viewCount++;
      else noneCount++;
    }
    return { manageCount, viewCount, noneCount, total: SYSTEM_MODULES.length };
  }, [selectedPermissions]);

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-3">
      {/* Matrix Toolbar & Stats */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5">
            <span>🛡️ 21 System Modules Access Matrix</span>
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            Allowed: <strong className="text-emerald-700">{stats.manageCount + stats.viewCount} of 21</strong> (
            <span className="text-emerald-700 font-semibold">{stats.manageCount} Full Manage</span>,{" "}
            <span className="text-amber-700 font-semibold">{stats.viewCount} Read-Only</span>,{" "}
            <span className="text-rose-700 font-semibold">{stats.noneCount} Blocked</span>)
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => grantAllModules(onUpdatePermissions)}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1"
          >
            <span>🌟</span>
            <span>Grant All (Full Manage)</span>
          </button>
          <button
            type="button"
            onClick={() => setAllToReadOnly(onUpdatePermissions)}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition flex items-center gap-1"
          >
            <span>👁️</span>
            <span>Set All to Read Only</span>
          </button>
          <button
            type="button"
            onClick={() => revokeAllModules(onUpdatePermissions)}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 transition flex items-center gap-1"
          >
            <span>🚫</span>
            <span>Revoke All</span>
          </button>
        </div>
      </div>

      {/* 21 Module List */}
      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
        {SYSTEM_MODULES.map((mod, idx) => {
          const currentLevel = getModuleAccessLevel(mod, selectedPermissions);

          return (
            <div
              key={mod.id}
              className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                currentLevel === "manage"
                  ? "bg-emerald-50/50 border-emerald-300 shadow-xs"
                  : currentLevel === "view"
                  ? "bg-amber-50/50 border-amber-300 shadow-xs"
                  : "bg-white border-gray-200 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base shrink-0">{mod.icon}</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {idx + 1}. {mod.name}
                  </span>
                  {mod.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      {mod.badge}
                    </span>
                  )}
                  {currentLevel === "manage" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Read & Write
                    </span>
                  )}
                  {currentLevel === "view" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                      👁️ Read Only (View)
                    </span>
                  )}
                  {currentLevel === "none" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">
                      ❌ No Access
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              {/* 3-State Access Selector */}
              <div className="flex items-center rounded-xl bg-gray-100 p-1 shrink-0 self-start sm:self-auto shadow-inner text-[11px]">
                <button
                  type="button"
                  onClick={() => setModuleAccessLevel(mod, "none", selectedPermissions, onUpdatePermissions)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    currentLevel === "none"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Block and hide module for this admin"
                >
                  <span>❌</span>
                  <span>No Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModuleAccessLevel(mod, "view", selectedPermissions, onUpdatePermissions)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    currentLevel === "view"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Allow viewing/browsing only, no editing"
                >
                  <span>👁️</span>
                  <span>Read Only</span>
                </button>

                {mod.hasManageOption ? (
                  <button
                    type="button"
                    onClick={() => setModuleAccessLevel(mod, "manage", selectedPermissions, onUpdatePermissions)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      currentLevel === "manage"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    title="Allow viewing and full editing, saving & deleting"
                  >
                    <span>✏️</span>
                    <span>Full Manage</span>
                  </button>
                ) : (
                  <span className="px-2 py-1 text-[10px] text-gray-400 italic">
                    (View Only)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AdminManagementTabProps {
  currentUserId?: number;
  currentUserRole?: string;
  onLogout?: () => Promise<void> | void;
}

export function AdminManagementTab({ currentUserId, currentUserRole, onLogout }: AdminManagementTabProps) {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [activeSubTab, setActiveSubTab] = useState<"admins" | "roles" | "approvals" | "security">("admins");
  const [availableStores, setAvailableStores] = useState<{ id: number; name: string; city?: string }[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null);
  const [resettingAdmin, setResettingAdmin] = useState<AdminItem | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminItem | null>(null);

  // Add Form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addAccessType, setAddAccessType] = useState<"full" | "custom">("full");
  const [addSelectedPermissions, setAddSelectedPermissions] = useState<string[]>([]);
  const [addForceChange, setAddForceChange] = useState(true);
  const [addRole, setAddRole] = useState("staff");
  const [addStoreId, setAddStoreId] = useState<number | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editAccessType, setEditAccessType] = useState<"full" | "custom">("full");
  const [editSelectedPermissions, setEditSelectedPermissions] = useState<string[]>([]);
  const [editForceChange, setEditForceChange] = useState(false);
  const [editRole, setEditRole] = useState("staff");
  const [editStoreId, setEditStoreId] = useState<number | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reset Password state
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  // Delete state
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.getAdmins();
      setAdmins(data.admins || []);
      setPermissions(data.availablePermissions || []);
      if (data.availableStores) setAvailableStores(data.availableStores);
      if (data.availableRoles) setAvailableRoles(data.availableRoles);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load administrators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      const matchesSearch =
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (admin.phone && admin.phone.includes(searchQuery));
      const matchesStatus =
        statusFilter === "all" ? true : admin.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [admins, searchQuery, statusFilter]);

  const permissionsByModule = useMemo(() => {
    const map: Record<string, PermissionOption[]> = {};
    for (const p of permissions) {
      const slug = p.slug || String(p.id);
      // Super Admin permissions cannot be assigned to sub-admins
      if (
        slug === "admins:manage" ||
        slug === "logs:view" ||
        p.module === "admin_management" ||
        p.module === "activity_logs"
      ) {
        continue;
      }
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    }
    return map;
  }, [permissions]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Handle Add Admin
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addPassword || !addName) {
      toast.error("Name, email, and password are required.");
      return;
    }
    setSubmittingAdd(true);
    try {
      await api.createAdmin({
        name: addName.trim(),
        email: addEmail.trim().toLowerCase(),
        phone: addPhone.trim() || undefined,
        password: addPassword,
        role: addRole,
        storeId: addStoreId,
        accessType: addAccessType,
        permissions:
          addAccessType === "custom"
            ? addSelectedPermissions.filter((p) => p && p !== "*")
            : [],
        mustChangePassword: addForceChange,
      });
      toast.success(`Admin "${addName}" created successfully!`);
      setIsAddModalOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddPassword("");
      setAddAccessType("full");
      setAddSelectedPermissions([]);
      setAddForceChange(true);
      fetchAdmins();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create administrator");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (admin: AdminItem) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditPhone(admin.phone || "");
    setEditRole(admin.role || "staff");
    setEditStoreId(admin.storeId ?? null);
    setEditStatus((admin.status as "active" | "inactive") || "active");
    setEditAccessType((admin.accessType as "full" | "custom") || "full");
    // Strip '*' so custom permissions only contain actual module slugs
    const cleanPerms = (admin.permissions || []).filter((p) => p && p !== "*");
    setEditSelectedPermissions(cleanPerms);
    setEditForceChange(admin.mustChangePassword || false);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSubmittingEdit(true);
    const targetAdmin = editingAdmin;
    try {
      await api.updateAdmin({
        id: targetAdmin.id,
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim() || undefined,
        role: targetAdmin.role === "super_admin" ? "super_admin" : editRole,
        storeId: editStoreId,
        status: targetAdmin.role === "super_admin" ? "active" : editStatus,
        accessType: targetAdmin.role === "super_admin" || editRole === "super_admin" ? "full" : editAccessType,
        permissions:
          targetAdmin.role === "super_admin" || editAccessType === "full"
            ? []
            : editSelectedPermissions.filter((p) => p && p !== "*"),
        mustChangePassword: editForceChange,
      });

      // STRICT RULE: Super Admin is NEVER logged out!
      // Only a regular admin (role === "admin") editing their own active session is auto logged out.
      const shouldLogoutAdmin =
        currentUserRole !== "super_admin" &&
        targetAdmin.role === "admin" &&
        currentUserId === targetAdmin.id;

      if (shouldLogoutAdmin) {
        toast.success(`Admin credentials updated successfully! Auto logging out...`);
        setEditingAdmin(null);
        try {
          await api.logout();
        } catch (logoutErr) {
          console.error("Auto logout failed:", logoutErr);
        }
        if (onLogout) {
          await onLogout();
        }
        setTimeout(() => {
          window.location.reload();
        }, 900);
      } else {
        toast.success(`Admin "${editName}" updated successfully.`);
        setEditingAdmin(null);
        fetchAdmins();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update administrator");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingAdmin) return;
    setSubmittingReset(true);
    const targetAdmin = resettingAdmin;
    try {
      const res = await api.resetAdminPassword(
        targetAdmin.id,
        newPassword.trim() || undefined
      );

      // STRICT RULE: Super Admin is NEVER logged out!
      const shouldLogoutAdmin =
        currentUserRole !== "super_admin" &&
        targetAdmin.role === "admin" &&
        currentUserId === targetAdmin.id;

      if (shouldLogoutAdmin) {
        toast.success(
          res.temporaryPassword
            ? `Password reset! Temporary password: ${res.temporaryPassword}. Auto logging out...`
            : "Password reset successfully! Auto logging out..."
        );
        setResettingAdmin(null);
        setNewPassword("");
        try {
          await api.logout();
        } catch (logoutErr) {
          console.error("Auto logout failed:", logoutErr);
        }
        if (onLogout) {
          await onLogout();
        }
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.success(
          res.temporaryPassword
            ? `Password reset! Temporary password: ${res.temporaryPassword}`
            : "Password reset successfully! Admin must change it upon next login."
        );
        setResettingAdmin(null);
        setNewPassword("");
        fetchAdmins();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSubmittingReset(false);
    }
  };

  // Handle Quick Toggle Status
  const handleToggleStatus = async (admin: AdminItem) => {
    const activeSuperCount = admins.filter((a) => a.role === "super_admin" && a.status === "active").length;
    if (admin.role === "super_admin" && activeSuperCount <= 1) {
      toast.error("Cannot deactivate the last active Super Admin account.");
      return;
    }
    const newStatus = admin.status === "active" ? "inactive" : "active";
    try {
      await api.updateAdmin({
        id: admin.id,
        status: newStatus,
      });

      // STRICT RULE: Super Admin is NEVER logged out!
      const shouldLogoutAdmin =
        currentUserRole !== "super_admin" &&
        admin.role === "admin" &&
        currentUserId === admin.id;

      if (shouldLogoutAdmin) {
        toast.success(
          `Admin "${admin.name}" ${newStatus === "active" ? "activated" : "deactivated"}. Auto logging out...`
        );
        try {
          await api.logout();
        } catch (logoutErr) {
          console.error("Auto logout failed:", logoutErr);
        }
        if (onLogout) {
          await onLogout();
        }
        setTimeout(() => {
          window.location.reload();
        }, 900);
      } else {
        toast.success(
          `Admin "${admin.name}" ${newStatus === "active" ? "activated" : "deactivated"}.`
        );
        fetchAdmins();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change admin status");
    }
  };

  // Handle Delete Admin
  const handleDeleteSubmit = async () => {
    if (!deletingAdmin) return;
    const activeSuperCount = admins.filter((a) => a.role === "super_admin" && a.status === "active").length;
    if (deletingAdmin.role === "super_admin") {
      if (activeSuperCount <= 1) {
        toast.error("Cannot delete the last active Super Admin account.");
        return;
      }
    }
    const targetAdmin = deletingAdmin;
    setSubmittingDelete(true);
    try {
      await api.deleteAdmin(targetAdmin.id);

      // STRICT RULE: Super Admin is NEVER logged out!
      const shouldLogoutAdmin =
        currentUserRole !== "super_admin" &&
        targetAdmin.role === "admin" &&
        currentUserId === targetAdmin.id;

      if (shouldLogoutAdmin) {
        toast.success(`Admin "${targetAdmin.name}" deleted. Auto logging out...`);
        setDeletingAdmin(null);
        try {
          await api.logout();
        } catch (logoutErr) {
          console.error("Auto logout failed:", logoutErr);
        }
        if (onLogout) {
          await onLogout();
        }
        setTimeout(() => {
          window.location.reload();
        }, 900);
      } else {
        toast.success(`Admin "${targetAdmin.name}" deleted successfully.`);
        setDeletingAdmin(null);
        fetchAdmins();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete administrator");
    } finally {
      setSubmittingDelete(false);
    }
  };

  const togglePermission = (
    permId: string,
    currentList: string[],
    setter: (val: string[]) => void
  ) => {
    if (currentList.includes(permId)) {
      setter(currentList.filter((p) => p !== permId));
    } else {
      setter([...currentList, permId]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Stats */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b2f8a] via-[#103a9f] to-[#0b2f8a] p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 text-[#dfb755] text-xs font-bold tracking-wide uppercase">
                🛡️ Super Admin Control Center
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Administrator Accounts & Permissions
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Create sub-admin profiles, grant module access, audit active credentials, and enforce mandatory security policies.
            </p>
          </div>
          <button
            onClick={() => {
              setAddPassword(generateRandomPassword());
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold btn-gold shadow-sm transition shrink-0"
          >
            <span>➕</span>
            <span>Add New Administrator</span>
          </button>
        </div>
      </div>

      {/* RBAC Sub-navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("admins")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "admins"
              ? "bg-white text-[#0b2f8a] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>👥</span>
          <span>Admins Directory</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-[#0b2f8a] font-bold">
            {admins.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("roles")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "roles"
              ? "bg-white text-[#0b2f8a] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🛡️</span>
          <span>Dynamic Roles &amp; Permissions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-bold">
            78 Matrix
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("approvals")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "approvals"
              ? "bg-white text-[#0b2f8a] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>⚖️</span>
          <span>Approval Queue</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 font-bold">
            Governance
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("security")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "security"
              ? "bg-white text-[#0b2f8a] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🔒</span>
          <span>Security, 2FA &amp; Active Sessions</span>
        </button>
      </div>

      {activeSubTab === "roles" && <RolesPermissionsView />}
      {activeSubTab === "approvals" && (
        <ApprovalsView currentUserId={currentUserId} currentUserRole={currentUserRole} />
      )}
      {activeSubTab === "security" && (
        <SecuritySessionsView currentUserId={currentUserId} currentUserRole={currentUserRole} />
      )}

      {activeSubTab === "admins" && (
        <>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#0b2f8a]/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-[#0b2f8a]/20 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
          />
          <span className="absolute left-3 top-2.5 text-xs text-gray-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5e6d82] font-medium">Status:</span>
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition ${
                  statusFilter === s
                    ? "bg-white text-[#0b2f8a] shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="p-2 rounded-xl border border-[#0b2f8a]/15 text-[#0b2f8a] hover:bg-[#0b2f8a]/5 transition disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
            title="Refresh list"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
          </button>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="bg-white rounded-2xl border border-[#0b2f8a]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a]"></div>
            <span>Loading administrative accounts...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No administrator accounts found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-[#0b2f8a]/10 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Administrator</th>
                  <th className="py-3.5 px-4">Role & Access</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Security Flags</th>
                  <th className="py-3.5 px-4">Created On</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdmins.map((admin) => {
                  const isSuperAdmin = admin.role === "super_admin";
                  const isCurrent = currentUserId === admin.id;
                  const activeSuperCount = admins.filter((a) => a.role === "super_admin" && a.status === "active").length;
                  const isLastSuperAdmin = isSuperAdmin && activeSuperCount <= 1;
                  const roleLabel = admin.roleName || (
                    admin.role === "super_admin" ? "Super Admin" :
                    admin.role === "store_admin" ? "Store Admin" :
                    admin.role === "inventory_admin" ? "Inventory Admin" :
                    admin.role === "order_manager" ? "Order Manager" :
                    admin.role === "customer_support" ? "Customer Support" :
                    admin.role === "staff" ? "Staff" : admin.role
                  );
                  const storeLabel = admin.storeName || (admin.storeId ? `Store #${admin.storeId}` : "🌐 All Stores");

                  return (
                    <tr
                      key={admin.id}
                      className={`hover:bg-blue-50/30 transition ${
                        isSuperAdmin ? "bg-[#dfb755]/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSuperAdmin
                                ? "bg-gradient-to-br from-[#dfb755] to-[#b89130] text-[#0b2f8a] shadow-sm"
                                : "bg-[#0b2f8a]/10 text-[#0b2f8a]"
                            }`}
                          >
                            {isSuperAdmin ? "👑" : admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{admin.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-[11px] font-mono">
                              {admin.email}
                            </div>
                            {admin.phone && (
                              <div className="text-gray-400 text-[10px]">
                                📞 {admin.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isSuperAdmin
                                ? "bg-[#dfb755]/20 text-[#b89130] border border-[#dfb755]/40"
                                : "bg-[#0b2f8a]/10 text-[#0b2f8a] border border-[#0b2f8a]/20"
                            }`}>
                              {isSuperAdmin ? "👑 " : "🛡️ "}{roleLabel}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {storeLabel}
                            </span>
                          </div>

                          <span className="text-[11px] text-gray-500 font-medium">
                            {isSuperAdmin || admin.accessType === "full"
                              ? "🌟 Full Access to All 21 Modules"
                              : (() => {
                                  const allowed = SYSTEM_MODULES.filter(
                                    (m) => getModuleAccessLevel(m, admin.permissions || []) !== "none"
                                  );
                                  const manageCount = allowed.filter(
                                    (m) => getModuleAccessLevel(m, admin.permissions || []) === "manage"
                                  ).length;
                                  const viewCount = allowed.length - manageCount;
                                  return (
                                    <div className="flex flex-col gap-1 mt-0.5">
                                      <span className="font-semibold text-gray-700">
                                        🔒 Custom: {allowed.length}/21 Modules ({manageCount} Manage, {viewCount} View)
                                      </span>
                                      <div className="flex flex-wrap gap-1 max-w-xs">
                                        {allowed.slice(0, 5).map((m) => (
                                          <span
                                            key={m.id}
                                            className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-medium border border-slate-200 flex items-center gap-0.5"
                                          >
                                            <span>{m.icon}</span>
                                            <span>{m.name.split(" ")[0]}</span>
                                          </span>
                                        ))}
                                        {allowed.length > 5 && (
                                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px]">
                                            +{allowed.length - 5} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              admin.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                admin.status === "active"
                                  ? "bg-emerald-600 animate-pulse"
                                  : "bg-rose-600"
                              }`}
                            ></span>
                            {admin.status === "active" ? "Active" : "Deactivated"}
                          </span>

                          {!isSuperAdmin && (
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              className="text-[10px] font-medium text-gray-500 hover:text-gray-900 underline ml-1"
                              title={
                                admin.status === "active"
                                  ? "Deactivate this account"
                                  : "Activate this account"
                              }
                            >
                              {admin.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {admin.twoFactorEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🔒 2FA Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                              2FA Off
                            </span>
                          )}
                          {admin.mustChangePassword && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⚠️ Forced PW Reset
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                        {new Date(admin.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="px-2.5 py-1 rounded-lg border border-[#0b2f8a]/15 text-[#0b2f8a] hover:bg-[#0b2f8a]/10 font-semibold text-[11px] transition flex items-center gap-1"
                            title="Edit Permissions & Details"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setResettingAdmin(admin);
                              setNewPassword(generateRandomPassword());
                            }}
                            className="px-2.5 py-1 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold text-[11px] transition flex items-center gap-1"
                            title="Reset Password"
                          >
                            <span>🔑</span>
                            <span>Reset PW</span>
                          </button>

                          {!isLastSuperAdmin ? (
                            <button
                              onClick={() => setDeletingAdmin(admin)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-[11px] transition flex items-center gap-1"
                              title="Delete Administrator"
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          ) : (
                            <span
                              className="px-2 py-1 text-[10px] text-amber-700 bg-amber-50 rounded border border-amber-200 font-bold cursor-not-allowed"
                              title="Last active Super Admin is protected and cannot be deleted"
                            >
                              🔒 Last Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

        </>
      )}

      {/* ADD ADMINISTRATOR MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="shrink-0 bg-gradient-to-r from-[#0b2f8a] to-[#103a9f] px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>➕</span> Add New Administrator
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Set credentials and assign either Full or Custom module permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh@vardayini.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-700 font-semibold">
                      Initial Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddPassword(generateRandomPassword())}
                      className="text-[11px] text-[#0b2f8a] hover:underline font-semibold"
                    >
                      🎲 Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>
              </div>

              {/* Role Selection & Store Scoping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setAddRole(r);
                      if (r === "super_admin") {
                        setAddAccessType("full");
                        setAddStoreId(null);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:outline-none focus:border-[#0b2f8a]"
                  >
                    <optgroup label="System Roles">
                      <option value="super_admin">👑 Super Admin (Full unconstrained system control)</option>
                      <option value="store_admin">🏬 Store Admin (Store branch & operations)</option>
                      <option value="inventory_admin">📦 Inventory Admin (Stock, batches & pricing)</option>
                      <option value="order_manager">📑 Order Manager (Orders, dispatch & tracking)</option>
                      <option value="customer_support">🎧 Customer Support (Refunds, complaints & customers)</option>
                      <option value="staff">👥 Staff (Store counter, view & print orders)</option>
                    </optgroup>
                    {availableRoles && availableRoles.filter(r => !["super_admin", "store_admin", "inventory_admin", "order_manager", "customer_support", "staff"].includes(r.slug)).length > 0 && (
                      <optgroup label="Custom Roles">
                        {availableRoles.filter(r => !["super_admin", "store_admin", "inventory_admin", "order_manager", "customer_support", "staff"].includes(r.slug)).map(r => (
                          <option key={r.id} value={r.slug}>{r.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Store Assignment (Record Scope)
                  </label>
                  <select
                    disabled={addRole === "super_admin"}
                    value={addStoreId === null ? "" : addStoreId}
                    onChange={(e) => setAddStoreId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:outline-none focus:border-[#0b2f8a] disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <option value="">🌐 All Stores / Central Unrestricted</option>
                    {availableStores && availableStores.map(s => (
                      <option key={s.id} value={s.id}>📍 {s.name} ({s.city})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {addRole === "super_admin" ? "Super Admin has global unconstrained access to all stores." : "Restricts admin data access to their assigned sweet mart outlet."}
                  </p>
                </div>
              </div>

              {/* Access Scope Toggle */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <label className="block text-gray-800 font-bold mb-2">
                  Access Permissions Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      addAccessType === "full"
                        ? "border-[#0b2f8a] bg-[#0b2f8a]/5 shadow-sm"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addAccessType"
                      value="full"
                      checked={addAccessType === "full"}
                      onChange={() => setAddAccessType("full")}
                      className="mt-0.5 text-[#0b2f8a] focus:ring-[#0b2f8a]"
                    />
                    <div>
                      <div className="font-bold text-gray-900">🌟 Full Access</div>
                      <div className="text-[11px] text-gray-500">
                        Admin can manage all store modules (pages, products, orders, categories, settings, etc.).
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      addAccessType === "custom"
                        ? "border-[#0b2f8a] bg-[#0b2f8a]/5 shadow-sm"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addAccessType"
                      value="custom"
                      checked={addAccessType === "custom"}
                      onChange={() => setAddAccessType("custom")}
                      className="mt-0.5 text-[#0b2f8a] focus:ring-[#0b2f8a]"
                    />
                    <div>
                      <div className="font-bold text-gray-900">🔒 Custom Access</div>
                      <div className="text-[11px] text-gray-500">
                        Select specific module permissions granted to this admin.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Custom Permissions Checklist */}
                {addAccessType === "custom" && (
                  <AccessControlMatrix
                    selectedPermissions={addSelectedPermissions}
                    onUpdatePermissions={setAddSelectedPermissions}
                  />
                )}
              </div>

              {/* Forced Password Change Option */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForceChange}
                  onChange={(e) => setAddForceChange(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold">Require password change on first login</span>
                  <div className="text-[11px] text-amber-700">
                    The admin will be immediately prompted to create a new password upon logging in.
                  </div>
                </div>
              </label>

              </div>

              <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-5 py-3.5 flex items-center justify-end gap-3 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-6 py-2 rounded-xl btn-gold font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submittingAdd ? "Creating..." : "Create Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMINISTRATOR MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="shrink-0 bg-gradient-to-r from-[#0b2f8a] to-[#103a9f] px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>✏️</span> Edit Administrator: {editingAdmin.name} (Admin ID #{editingAdmin.id})
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Update administrative status, contact details, and module permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 text-xs">
                {/* Auto Logout Security Notice */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                  <span className="text-base shrink-0">🔒</span>
                  <div>
                    <span className="font-bold">Security Notice:</span> Updating this Admin ID will automatically log out the admin session and refresh this page.
                  </div>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>

                              {/* Role Selection & Store Scoping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Assigned Role
                  </label>
                  <select
                    disabled={editingAdmin.role === "super_admin"}
                    value={editRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setEditRole(r);
                      if (r === "super_admin") {
                        setEditAccessType("full");
                        setEditStoreId(null);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:outline-none focus:border-[#0b2f8a] disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <optgroup label="System Roles">
                      <option value="super_admin">👑 Super Admin</option>
                      <option value="store_admin">🏬 Store Admin</option>
                      <option value="inventory_admin">📦 Inventory Admin</option>
                      <option value="order_manager">📑 Order Manager</option>
                      <option value="customer_support">🎧 Customer Support</option>
                      <option value="staff">👥 Staff</option>
                    </optgroup>
                    {availableRoles && availableRoles.filter(r => !["super_admin", "store_admin", "inventory_admin", "order_manager", "customer_support", "staff"].includes(r.slug)).length > 0 && (
                      <optgroup label="Custom Roles">
                        {availableRoles.filter(r => !["super_admin", "store_admin", "inventory_admin", "order_manager", "customer_support", "staff"].includes(r.slug)).map(r => (
                          <option key={r.id} value={r.slug}>{r.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Assigned Store (Record Scope)
                  </label>
                  <select
                    disabled={editingAdmin.role === "super_admin" || editRole === "super_admin"}
                    value={editStoreId === null ? "" : editStoreId}
                    onChange={(e) => setEditStoreId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:outline-none focus:border-[#0b2f8a] disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <option value="">🌐 All Stores / Central Unrestricted</option>
                    {availableStores && availableStores.map(s => (
                      <option key={s.id} value={s.id}>📍 {s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>
              </div>

                {editingAdmin.role !== "super_admin" ? (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Account Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="inactive">Inactive / Suspended (Blocked with 403)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Account Status
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold">
                      Permanent Owner (Always Active)
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions scope */}
              {editingAdmin.role !== "super_admin" ? (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <label className="block text-gray-800 font-bold mb-2">
                    Access Permissions Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editAccessType === "full"
                          ? "border-[#0b2f8a] bg-[#0b2f8a]/5 shadow-sm"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="editAccessType"
                        value="full"
                        checked={editAccessType === "full"}
                        onChange={() => setEditAccessType("full")}
                        className="mt-0.5 text-[#0b2f8a] focus:ring-[#0b2f8a]"
                      />
                      <div>
                        <div className="font-bold text-gray-900">🌟 Full Access</div>
                        <div className="text-[11px] text-gray-500">
                          Admin can manage all non-super-admin store modules.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editAccessType === "custom"
                          ? "border-[#0b2f8a] bg-[#0b2f8a]/5 shadow-sm"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="editAccessType"
                        value="custom"
                        checked={editAccessType === "custom"}
                        onChange={() => {
                          setEditAccessType("custom");
                          setEditSelectedPermissions((prev) => prev.filter((p) => p && p !== "*"));
                        }}
                        className="mt-0.5 text-[#0b2f8a] focus:ring-[#0b2f8a]"
                      />
                      <div>
                        <div className="font-bold text-gray-900">🔒 Custom Access</div>
                        <div className="text-[11px] text-gray-500">
                          Select specific module permissions granted to this admin.
                        </div>
                      </div>
                    </label>
                  </div>

                  {editAccessType === "custom" && (
                    <AccessControlMatrix
                      selectedPermissions={editSelectedPermissions}
                      onUpdatePermissions={setEditSelectedPermissions}
                    />
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold">
                  👑 Super Admin inherently retains complete, unrestricted authority over all modules and settings.
                </div>
              )}

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForceChange}
                  onChange={(e) => setEditForceChange(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold">Require password change upon next login</span>
                  <div className="text-[11px] text-amber-700">
                    Admin must select a new personal password when they next authenticate.
                  </div>
                </div>
              </label>

              </div>

              <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-5 py-3.5 flex items-center justify-end gap-3 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-6 py-2 rounded-xl btn-gold font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submittingEdit ? "Saving & Logging Out..." : "Save & Auto Log Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>🔑</span> Reset Password
                </h3>
                <p className="text-white/80 text-xs mt-0.5">
                  Admin: {resettingAdmin.name} ({resettingAdmin.email})
                </p>
              </div>
              <button
                onClick={() => setResettingAdmin(null)}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 flex flex-col gap-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Enter a new temporary password or click Generate. The user will be automatically forced to change it on their next login.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-700 font-semibold">
                    New Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] text-[#0b2f8a] hover:underline font-semibold"
                  >
                    🎲 Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResettingAdmin(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submittingReset ? "Resetting..." : "Confirm Password Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-rose-600 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>⚠️</span> Delete Administrator
                </h3>
              </div>
              <button
                onClick={() => setDeletingAdmin(null)}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <p className="text-gray-700 text-sm">
                Are you sure you want to permanently delete administrator{" "}
                <span className="font-bold text-gray-900">"{deletingAdmin.name}"</span> (
                {deletingAdmin.email})?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
                This will immediately revoke their access and terminate all active sessions. This action cannot be undone.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeletingAdmin(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={submittingDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submittingDelete ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
