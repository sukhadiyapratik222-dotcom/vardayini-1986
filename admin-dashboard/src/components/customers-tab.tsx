"use client";

import { useState, useMemo } from "react";
import { CustomerItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { TablePagination } from "./table-pagination";

interface CustomersTabProps {
  customers: CustomerItem[];
  onRefresh: () => Promise<void> | void;
  currentUser?: { id?: number; name?: string; email?: string; role?: string } | null;
}

export function CustomersTab({ customers, onRefresh, currentUser }: CustomersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "customer" | "admin" | "super_admin">("all");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Record<number, boolean>>({});

  // Super Admin role management state
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
  const [roleModalTarget, setRoleModalTarget] = useState<{
    customer: CustomerItem;
    targetRole: "admin" | "customer";
  } | null>(null);

  const isSuperAdminUser = currentUser?.role === "super_admin";

  // Summary statistics
  const totalCustomers = customers.filter((c) => c.role !== "admin" && c.role !== "super_admin").length;
  const totalAdmins = customers.filter((c) => c.role === "admin").length;
  const totalSuperAdmins = customers.filter((c) => c.role === "super_admin").length;
  const totalAddresses = customers.reduce(
    (acc, c) => acc + (c.addresses ? c.addresses.length : 0),
    0
  );
  const totalSpentAll = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterRole !== "all" && c.role !== filterRole) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchAddress = c.addresses?.some(
        (a) =>
          a.line1.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.pincode.includes(q) ||
          a.state.toLowerCase().includes(q)
      );

      return matchName || matchEmail || matchPhone || matchAddress;
    });
  }, [customers, searchQuery, filterRole]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Execute customer deletion
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    setIsDeletingId(customerToDelete.id);
    try {
      const res = await api.deleteCustomer(customerToDelete.id);
      if (res.success) {
        toast.success(`Patron "${customerToDelete.name}" was permanently removed.`);
        setCustomerToDelete(null);
        await onRefresh();
      } else {
        toast.error(res.message || "Failed to delete customer");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting customer");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Execute role update (Super Admin privilege)
  const handleUpdateRole = async () => {
    if (!roleModalTarget) return;

    setUpdatingRoleId(roleModalTarget.customer.id);
    try {
      const res = await api.updateCustomerRole(
        roleModalTarget.customer.id,
        roleModalTarget.targetRole
      );
      if (res.success) {
        toast.success(
          roleModalTarget.targetRole === "admin"
            ? `Granted administrator access to ${roleModalTarget.customer.name}!`
            : `Revoked admin privileges for ${roleModalTarget.customer.name}. User is now a customer.`
        );
        setRoleModalTarget(null);
        await onRefresh();
      } else {
        toast.error(res.message || "Failed to update role");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const toggleAddressExpand = (id: number) => {
    setExpandedAddresses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d] flex items-center gap-2">
            <span>👥</span> Customer Directory & Admin Access Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered patrons across Kalol & Pan-India with delivery addresses, order analytics, and super admin access controls.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRefresh()}
          className="self-start md:self-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center gap-1.5"
        >
          <span>🔄</span> Refresh Directory
        </button>
      </div>

      {/* Super Admin Status Banner */}
      {isSuperAdminUser && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-purple-500/10 border border-amber-300/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              👑
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                Super Admin Privileges Active
                <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  Full Authority
                </span>
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5">
                You can manage entire site operations, promote patrons to Administrators, or revoke Admin privileges back to Customers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-900 bg-white/70 px-3 py-1.5 rounded-xl border border-amber-200 shrink-0">
            <span>🛡️ Admins: <strong>{totalAdmins}</strong></span>
            <span>•</span>
            <span>👑 Super Admin: <strong>{totalSuperAdmins}</strong></span>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0b2f8a] flex items-center justify-center text-lg">
            👥
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Active Patrons</span>
            <p className="text-xl font-bold text-slate-900">{totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg">
            🛡️
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Administrators</span>
            <p className="text-xl font-bold text-slate-900">{totalAdmins + totalSuperAdmins}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            📍
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Saved Locations</span>
            <p className="text-xl font-bold text-slate-900">{totalAddresses}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
            💳
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Cumulative Spend</span>
            <p className="text-xl font-bold text-slate-900">
              ₹{totalSpentAll.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by patron name, email, phone, city, or pincode..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#0b2f8a] focus:ring-2 focus:ring-[#0b2f8a]/10 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium">Table Length:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Math.min(50, Number(e.target.value)));
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-[#0b2f8a] outline-none cursor-pointer"
            >
              <option value={10}>10 records</option>
              <option value={25}>25 records</option>
              <option value={50}>50 records (Max)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
            {(
              [
                { id: "all", label: "All Users" },
                { id: "customer", label: "Customers" },
                { id: "admin", label: "Admins" },
                { id: "super_admin", label: "Super Admin" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterRole(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  filterRole === tab.id
                    ? "bg-[#0b2f8a] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Patron / Email</th>
                <th className="py-3.5 px-4">Role / Access</th>
                <th className="py-3.5 px-4">Mobile Contact</th>
                <th className="py-3.5 px-4">Saved Delivery Locations</th>
                <th className="py-3.5 px-4 text-center">Orders Placed</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No accounts found</p>
                    <p className="text-xs mt-1">Try modifying your search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const isSuperAdmin = customer.role === "super_admin";
                  const isAdmin = customer.role === "admin";
                  const addresses = customer.addresses || [];
                  const isExpanded = !!expandedAddresses[customer.id];

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50/70 transition group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                              isSuperAdmin
                                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white border border-amber-400 shadow-amber-500/20"
                                : isAdmin
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-blue-100 text-[#0b2f8a] border border-blue-200"
                            }`}
                          >
                            {isSuperAdmin ? "👑" : customer.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{customer.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {customer.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-xs">
                            👑 Super Admin
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            🛡️ Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200">
                            👤 Customer
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="hover:text-[#0b2f8a] underline-offset-2 hover:underline"
                          >
                            +91 {customer.phone.replace(/^(?:\+91|91|0)/, "")}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Saved Addresses */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {addresses.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">No addresses saved</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <span className="text-amber-600 text-xs">📍</span>
                              <span className="truncate max-w-[200px]" title={addresses[0].line1}>
                                {addresses[0].line1}
                              </span>
                              {addresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => toggleAddressExpand(customer.id)}
                                  className="text-[10px] font-bold text-[#0b2f8a] bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 transition"
                                >
                                  {isExpanded ? "Hide" : `+${addresses.length - 1} more`}
                                </button>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                              {addresses[0].city}, {addresses[0].state} - {addresses[0].pincode}
                            </span>

                            {isExpanded && addresses.length > 1 && (
                              <div className="pt-2 pl-3 border-l-2 border-amber-200 space-y-1.5 mt-1 bg-amber-50/40 p-1.5 rounded-r-lg">
                                {addresses.slice(1).map((a, i) => (
                                  <div key={i} className="text-[10px] text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                      {a.label || "Alternate"}:
                                    </span>{" "}
                                    {a.line1}, {a.city} ({a.pincode})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {customer.totalOrders}
                        </span>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{customer.totalSpent.toLocaleString()}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuperAdmin ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 shadow-xs cursor-default"
                              title="Super Administrator account is immune and permanently protected."
                            >
                              👑 Immune
                            </span>
                          ) : isAdmin ? (
                            isSuperAdminUser ? (
                              <button
                                type="button"
                                onClick={() => setRoleModalTarget({ customer, targetRole: "customer" })}
                                disabled={updatingRoleId === customer.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition active:scale-95 disabled:opacity-50"
                                title={`Demote ${customer.name} to customer role`}
                              >
                                <span>⬇️</span>
                                <span>{updatingRoleId === customer.id ? "Updating..." : "Demote to Customer"}</span>
                              </button>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-400 bg-slate-100 cursor-not-allowed"
                                title="Administrator accounts cannot be deleted."
                              >
                                🔒 Protected
                              </span>
                            )
                          ) : (
                            <>
                              {isSuperAdminUser && (
                                <button
                                  type="button"
                                  onClick={() => setRoleModalTarget({ customer, targetRole: "admin" })}
                                  disabled={updatingRoleId === customer.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition active:scale-95 disabled:opacity-50"
                                  title={`Promote ${customer.name} to Administrator`}
                                >
                                  <span>⬆️</span>
                                  <span>{updatingRoleId === customer.id ? "Updating..." : "Make Admin"}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setCustomerToDelete(customer)}
                                disabled={isDeletingId === customer.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/60 shadow-xs transition active:scale-95 disabled:opacity-50"
                                title={`Delete patron account for ${customer.name}`}
                              >
                                <span>🗑️</span>
                                <span>{isDeletingId === customer.id ? "..." : "Delete"}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={filteredCustomers.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="accounts"
        />
      </div>

      {/* Confirmation Modal for Role Modification (Super Admin privilege) */}
      {roleModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  roleModalTarget.targetRole === "admin"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {roleModalTarget.targetRole === "admin" ? "🛡️" : "👤"}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {roleModalTarget.targetRole === "admin"
                    ? "Promote to Administrator?"
                    : "Revoke Administrator Access?"}
                </h3>
                <p className="text-xs text-slate-500">Super Admin Access Control</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to change the access level for{" "}
              <strong className="text-slate-900 font-semibold">{roleModalTarget.customer.name}</strong> (
              <span className="font-mono text-slate-700">{roleModalTarget.customer.email}</span>) to{" "}
              <strong className="capitalize text-slate-900">
                {roleModalTarget.targetRole === "admin" ? "Administrator" : "Customer"}
              </strong>?
            </p>

            {roleModalTarget.targetRole === "admin" ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed">
                ℹ️ This will grant this user administrative privileges to manage products, categories, orders, and view reports.
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                ⚠️ This will revoke their administrative dashboard access. They will only have standard customer access to browse and purchase sweets.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRoleModalTarget(null)}
                disabled={updatingRoleId !== null}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={updatingRoleId !== null}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 ${
                  roleModalTarget.targetRole === "admin"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {updatingRoleId !== null
                  ? "Updating..."
                  : `Confirm ${roleModalTarget.targetRole === "admin" ? "Promotion" : "Demotion"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Customer Deletion */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Delete Customer Account?
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900 font-semibold">{customerToDelete.name}</strong> (
              <span className="font-mono text-slate-700">{customerToDelete.email}</span>)?
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              ℹ️ Their saved delivery addresses, active carts, and wishlists will be purged. Historical orders are disassociated to protect accounting records.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeletingId !== null}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeletingId !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>{isDeletingId !== null ? "Deleting..." : "Delete Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
