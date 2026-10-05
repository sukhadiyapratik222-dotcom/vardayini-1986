"use client";

import { useState, useMemo } from "react";
import { CustomerItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { TablePagination } from "./table-pagination";

interface CustomersTabProps {
  customers: CustomerItem[];
  onRefresh: () => Promise<void> | void;
}

export function CustomersTab({ customers, onRefresh }: CustomersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "customer" | "admin">("all");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Record<number, boolean>>({});

  // Summary statistics
  const totalCustomers = customers.filter((c) => c.role !== "admin").length;
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

  const toggleAddressExpand = (id: number) => {
    setExpandedAddresses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d] flex items-center gap-2">
            <span>👥</span> Customer Directory & Account Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered patrons across Vadodara & Pan-India with delivery addresses, order analytics, and deletion controls.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Patrons
          </p>
          <p className="text-3xl font-bold text-[#0b2f8a] mt-1">{totalCustomers}</p>
          <p className="text-xs text-slate-400 mt-1">Verified customer accounts</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Saved Delivery Addresses
          </p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{totalAddresses}</p>
          <p className="text-xs text-slate-400 mt-1">Residential & office locations</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Customer LTV
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            ₹{totalSpentAll.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Cumulative spend across registered patrons</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-2.5 text-xs text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by patron name, email, phone, city, or PIN..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto flex-wrap">
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter:</span>
            {(["all", "customer", "admin"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setFilterRole(role);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition ${
                  filterRole === role
                    ? "bg-[#0b2f8a] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {role === "all" ? "All Users" : `${role}s`}
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No customers found</p>
                    <p className="text-xs mt-1">Try modifying your search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
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
                              isAdmin
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-blue-100 text-[#0b2f8a] border border-blue-200"
                            }`}
                          >
                            {customer.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{customer.name}</span>
                              {isAdmin && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {customer.email}
                            </span>
                          </div>
                        </div>
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
                            <p className="text-[11px] text-slate-400 pl-4 font-mono">
                              {addresses[0].city}, {addresses[0].state} - {addresses[0].pincode}
                            </p>

                            {/* Expanded extra addresses */}
                            {isExpanded &&
                              addresses.slice(1).map((a, i) => (
                                <div
                                  key={a.id || i}
                                  className="pt-1.5 border-t border-slate-100 text-[11px] pl-4 text-slate-600"
                                >
                                  <p className="font-medium text-slate-800">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">
                                      [{a.label || "Other"}]:
                                    </span>
                                    {a.line1}
                                  </p>
                                  <p className="text-slate-400 font-mono">
                                    {a.city}, {a.state} - {a.pincode}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {customer.totalOrders} {customer.totalOrders === 1 ? "order" : "orders"}
                        </span>
                      </td>

                      {/* Total Spend */}
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

                      {/* Delete Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-400 bg-slate-100 cursor-not-allowed"
                            title="Administrator accounts cannot be deleted."
                          >
                            🔒 Protected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(customer)}
                            disabled={isDeletingId === customer.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/60 shadow-sm transition active:scale-95 disabled:opacity-50"
                            title={`Delete customer ${customer.name}`}
                          >
                            <span>🗑️</span>
                            <span>{isDeletingId === customer.id ? "Deleting..." : "Delete"}</span>
                          </button>
                        )}
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
          itemName="patrons"
        />
      </div>

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

            <div className="rounded-2xl bg-rose-50/60 border border-rose-100 p-4 text-xs text-slate-700 space-y-2">
              <p>
                You are about to permanently delete patron:{" "}
                <span className="font-bold text-slate-900">{customerToDelete.name}</span>
              </p>
              <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                <p>• Email: {customerToDelete.email}</p>
                <p>• Mobile: {customerToDelete.phone || "N/A"}</p>
                <p>• Total Orders: {customerToDelete.totalOrders} order(s)</p>
                <p>• Saved Addresses: {customerToDelete.addresses?.length || 0} location(s)</p>
              </div>
              <p className="text-rose-700 text-[11px] pt-1 font-medium">
                Note: Profile and saved delivery addresses will be wiped. Past order receipts will be retained as anonymous guest orders to protect accounting and GST financial compliance.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeletingId !== null}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeletingId !== null}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingId !== null ? (
                  <span>Deleting Account...</span>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
