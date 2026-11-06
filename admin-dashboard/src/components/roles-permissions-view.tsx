"use client";

import { useEffect, useState } from "react";
import { api, RoleItem } from "@/lib/api";
import { toast } from "@/lib/toast";

const MODULES = [
  { id: "dashboard", name: "Dashboard", icon: "📊" },
  { id: "products", name: "Products", icon: "🍬" },
  { id: "inventory", name: "Inventory", icon: "📦" },
  { id: "categories", name: "Categories", icon: "🏷️" },
  { id: "orders", name: "Orders", icon: "🛍️" },
  { id: "payments", name: "Payments", icon: "💳" },
  { id: "refunds", name: "Refunds", icon: "💸" },
  { id: "customers", name: "Customers", icon: "👥" },
  { id: "admins", name: "Admin Management", icon: "🛡️" },
  { id: "stores", name: "Store Management", icon: "🏬" },
  { id: "reports", name: "Reports", icon: "📈" },
  { id: "notifications", name: "Notifications", icon: "🔔" },
  { id: "settings", name: "Settings", icon: "⚙️" },
];

const ACTIONS = [
  { id: "view", name: "View" },
  { id: "create", name: "Create" },
  { id: "edit", name: "Edit" },
  { id: "delete", name: "Delete" },
  { id: "approve", name: "Approve" },
  { id: "export", name: "Export" },
];

export function RolesPermissionsView() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [matrixPermissions, setMatrixPermissions] = useState<string[]>([]);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Create Role Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleSlug, setNewRoleSlug] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete Role confirmation
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.getRoles();
      setRoles(res.roles || []);
      if (res.roles?.length && !selectedRole) {
        setSelectedRole(res.roles[0]);
        setMatrixPermissions(res.roles[0].permissions || []);
      } else if (selectedRole) {
        const updated = res.roles.find((r) => r.id === selectedRole.id);
        if (updated) {
          setSelectedRole(updated);
          setMatrixPermissions(updated.permissions || []);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSelectRole = (role: RoleItem) => {
    setSelectedRole(role);
    setMatrixPermissions(role.permissions || []);
  };

  const handleTogglePermission = (slug: string) => {
    if (selectedRole?.slug === "super_admin") return;
    setMatrixPermissions((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug]
    );
  };

  const handleSelectAll = () => {
    if (selectedRole?.slug === "super_admin") return;
    const all = MODULES.flatMap((m) => ACTIONS.map((a) => `${m.id}:${a.id}`));
    setMatrixPermissions(all);
  };

  const handleSelectReadOnly = () => {
    if (selectedRole?.slug === "super_admin") return;
    const views = MODULES.map((m) => `${m.id}:view`);
    setMatrixPermissions(views);
  };

  const handleClearAll = () => {
    if (selectedRole?.slug === "super_admin") return;
    setMatrixPermissions([]);
  };

  const handleSaveMatrix = async () => {
    if (!selectedRole) return;
    setSavingMatrix(true);
    try {
      await api.updateRole({
        id: selectedRole.id,
        permissions: matrixPermissions,
      });
      toast.success(`Permissions for role "${selectedRole.name}" updated successfully.`);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await api.createRole({
        name: newRoleName.trim(),
        slug: newRoleSlug.trim() || undefined,
        description: newRoleDesc.trim() || undefined,
        permissions: ["dashboard:view", "orders:view", "products:view"],
      });
      toast.success(`Role "${res.role.name}" created successfully!`);
      setIsCreateOpen(false);
      setNewRoleName("");
      setNewRoleSlug("");
      setNewRoleDesc("");
      await fetchRoles();
      setSelectedRole(res.role);
      setMatrixPermissions(res.role.permissions || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    try {
      await api.deleteRole(roleToDelete.id);
      toast.success(`Role "${roleToDelete.name}" deleted successfully.`);
      setRoleToDelete(null);
      setSelectedRole(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleRoleActive = async (role: RoleItem) => {
    if (role.slug === "super_admin") {
      toast.error("The Super Admin role cannot be deactivated.");
      return;
    }
    try {
      await api.updateRole({
        id: role.id,
        isActive: !role.isActive,
      });
      toast.success(`Role "${role.name}" ${!role.isActive ? "activated" : "deactivated"}.`);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle role status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="font-bold text-base text-[#182230]">Dynamic Role & Permission Management</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure system roles, create custom permissions for staff, and enforce granular module-wise actions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold btn-gold shadow-xs shrink-0 cursor-pointer"
        >
          <span>➕</span>
          <span>Create Custom Role</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a]"></div>
          <span>Loading roles & permission matrix...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List (Left 1 Col) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Configured Roles ({roles.length})</span>
            </div>

            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "border-[#0b2f8a] bg-[#0b2f8a]/5 ring-2 ring-[#0b2f8a]/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{r.name}</span>
                        {r.isSystem && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            System
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2">{r.description || "Custom staff role"}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <span>👥 {r.userCount} assigned</span>
                      <span className="font-mono">
                        {r.slug === "super_admin" ? "All (*) Access" : `${r.permissions.length} perms`}
                      </span>
                    </div>

                    {/* Role actions if custom */}
                    {!r.isSystem && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRoleActive(r);
                          }}
                          className="text-[#0b2f8a] font-semibold hover:underline"
                        >
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(r);
                          }}
                          className="text-rose-600 font-semibold hover:underline"
                        >
                          Delete Role
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permission Matrix Table (Right 2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            {selectedRole ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">{selectedRole.name} Permissions Matrix</h4>
                      {selectedRole.slug === "super_admin" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dfb755]/20 text-[#b89130] border border-[#dfb755]/40">
                          👑 Unrestricted System Super Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedRole.slug === "super_admin"
                        ? "Super Admin holds permanent wildcard (*) access across all modules."
                        : `Select granular action capabilities for the ${selectedRole.name} role.`}
                    </p>
                  </div>

                  {selectedRole.slug !== "super_admin" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectReadOnly}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        View Only
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMatrix}
                        disabled={savingMatrix}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-xs disabled:opacity-50"
                      >
                        {savingMatrix ? "Saving..." : "Save Matrix"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 13 Modules x 6 Actions Matrix Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Module</th>
                        {ACTIONS.map((a) => (
                          <th key={a.id} className="py-2.5 px-2 text-center">
                            {a.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULES.map((m) => {
                        const isSuper = selectedRole.slug === "super_admin";
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{m.icon}</span>
                              <span>{m.name}</span>
                            </td>
                            {ACTIONS.map((a) => {
                              const slug = `${m.id}:${a.id}`;
                              const checked = isSuper || matrixPermissions.includes(slug) || matrixPermissions.includes("*");
                              return (
                                <td key={a.id} className="py-2.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isSuper}
                                    onChange={() => handleTogglePermission(slug)}
                                    className="w-4 h-4 text-[#0b2f8a] rounded border-slate-300 focus:ring-[#0b2f8a]/30 cursor-pointer disabled:cursor-not-allowed"
                                    title={`${a.name} ${m.name}`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedRole.slug !== "super_admin" && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveMatrix}
                      disabled={savingMatrix}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-xs disabled:opacity-50"
                    >
                      {savingMatrix ? "Saving Permissions..." : "Save Role Permissions"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Select a role on the left to inspect and configure its permissions matrix.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create Custom Role</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mithai Quality Supervisor"
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (!newRoleSlug) {
                      setNewRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Slug Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. quality_supervisor"
                  value={newRoleSlug}
                  onChange={(e) => setNewRoleSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of responsibilities and permissions"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none focus:border-[#0b2f8a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-[#0b2f8a] text-white font-bold hover:bg-[#071c54] disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-rose-600 mb-2">Delete Custom Role</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to permanently delete the custom role <strong>{roleToDelete.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
