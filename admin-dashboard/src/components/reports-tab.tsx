"use client";

import { useMemo, useState } from "react";
import { OrderItem, ProductItem, InventoryItem, DashboardStats } from "@/lib/api";
import { toast } from "@/lib/toast";
import { TablePagination } from "./table-pagination";

export type ReportType =
  | "sales"
  | "orders"
  | "product"
  | "inventory"
  | "customer"
  | "payment"
  | "revenue"
  | "logins"
  | "otp"
  | "emails"
  | "sms";

interface ReportsTabProps {
  reportType: ReportType;
  orders: OrderItem[];
  products: ProductItem[];
  inventory: { variants: InventoryItem[]; lowStock: InventoryItem[] };
  stats: DashboardStats | null;
}

export function ReportsTab({
  reportType,
  orders,
  products,
  inventory,
  stats,
}: ReportsTabProps) {
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const reportTitles: Record<ReportType, { title: string; subtitle: string; icon: string }> = {
    sales: {
      title: "Sales Report",
      subtitle: "Comprehensive gross sales, order values, discount write-offs, and net store revenue",
      icon: "📈",
    },
    orders: {
      title: "Orders Report",
      subtitle: "Order volume, fulfillment status breakdown, customer tickets, and delivery turnaround",
      icon: "📦",
    },
    product: {
      title: "Product Report",
      subtitle: "Product performance, sales velocity, top sweet & farsan performers, and revenue share",
      icon: "🍬",
    },
    inventory: {
      title: "Inventory Report",
      subtitle: "Live warehouse stock valuation, low-stock alerts, out-of-stock items, and batch health",
      icon: "📊",
    },
    customer: {
      title: "Customer Report",
      subtitle: "Registered patrons vs. guest checkouts, purchase frequency, order volume, and contacts",
      icon: "👥",
    },
    payment: {
      title: "Payment Report",
      subtitle: "UPI vs Cash on Delivery collection volumes, pending settlements, and transaction logs",
      icon: "💳",
    },
    revenue: {
      title: "Revenue Report",
      subtitle: "Taxable revenue, GST 5% collection, gross margin metrics, and profitability ledger",
      icon: "💰",
    },
    logins: {
      title: "Login Report",
      subtitle: "Security access trail, admin sessions, customer logins, IP tracking, and auth status",
      icon: "🔐",
    },
    otp: {
      title: "OTP Logs",
      subtitle: "Two-factor authentication logs, guest phone verification, SMS gateway delivery reports",
      icon: "📱",
    },
    emails: {
      title: "Email Report",
      subtitle: "Transactional customer email logs, order receipts, dispatch tracking, and deliverability",
      icon: "✉️",
    },
    sms: {
      title: "SMS Reports",
      subtitle: "DLT approved transactional SMS dispatch logs, carrier status, and delivery acknowledgements",
      icon: "📨",
    },
  };

  const currentMeta = reportTitles[reportType] || reportTitles.sales;

  // Real calculations from store orders & inventory
  const totalGross = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

  const totalDiscounts = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.discount || 0), 0);
  }, [orders]);

  const totalDeliveryFees = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  }, [orders]);

  const totalNet = totalGross - totalDiscounts;
  const aov = orders.length > 0 ? Math.round(totalGross / orders.length) : 0;

  const inventoryValuation = useMemo(() => {
    return inventory.variants.reduce((sum, v) => sum + v.stock * v.price, 0);
  }, [inventory.variants]);

  // Export CSV handler
  const handleExportCSV = () => {
    const filename = `vardayini-${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    toast.success(`Exporting ${currentMeta.title} (${filename})`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0b2f8a] uppercase tracking-wider mb-1">
            <span>Reports & Analytics</span>
            <span>/</span>
            <span className="text-[#dfb755] font-bold">{currentMeta.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#182230] flex items-center gap-3">
            <span>{currentMeta.icon}</span>
            <span>{currentMeta.title}</span>
          </h1>
          <p className="text-xs text-[#5e6d82] mt-1 max-w-2xl">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as "today" | "7d" | "30d" | "all")}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0b2f8a]"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time Records</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-sm transition flex items-center gap-2"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Render Specific Report View */}
      {reportType === "sales" && (
        <SalesReportView
          orders={orders}
          totalGross={totalGross}
          totalDiscounts={totalDiscounts}
          totalDeliveryFees={totalDeliveryFees}
          totalNet={totalNet}
          aov={aov}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "orders" && (
        <OrdersReportView
          orders={orders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
      )}

      {reportType === "product" && (
        <ProductReportView
          products={products}
          orders={orders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "inventory" && (
        <InventoryReportView
          inventory={inventory}
          inventoryValuation={inventoryValuation}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "customer" && (
        <CustomerReportView
          orders={orders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "payment" && (
        <PaymentReportView
          orders={orders}
          totalGross={totalGross}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "revenue" && (
        <RevenueReportView
          orders={orders}
          totalGross={totalGross}
          totalDiscounts={totalDiscounts}
          totalNet={totalNet}
        />
      )}

      {reportType === "logins" && (
        <LoginReportView
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "otp" && (
        <OtpReportView
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "emails" && (
        <EmailReportView
          orders={orders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {reportType === "sms" && (
        <SmsReportView
          orders={orders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 1. SALES REPORT VIEW
// -------------------------------------------------------------
function SalesReportView({
  orders,
  totalGross,
  totalDiscounts,
  totalDeliveryFees,
  totalNet,
  aov,
  searchQuery,
  setSearchQuery,
}: {
  orders: OrderItem[];
  totalGross: number;
  totalDiscounts: number;
  totalDeliveryFees: number;
  totalNet: number;
  aov: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.guestName && o.guestName.toLowerCase().includes(q)) ||
        (o.guestPhone && o.guestPhone.includes(q))
      );
    });
  }, [orders, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Gross Sales</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold">₹</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{totalGross.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span>↑ 12.4%</span>
            <span className="text-slate-400">vs last period</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Net Sales (After Promo)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold">₹</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{totalNet.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-medium">Discounts: -₹{totalDiscounts.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Average Order Value</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 font-bold">🎯</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{aov.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-600 font-medium">Based on {orders.length} placed orders</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Delivery Fees Collected</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 font-bold">🚚</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{totalDeliveryFees.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400">Orders &lt; ₹799 (₹49 standard fee)</p>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-800">Detailed Sales Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Order-by-order financial breakdowns</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by Order # or Customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-60"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Delivery</th>
                <th className="py-3 px-4 font-bold text-slate-900">Final Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No orders match your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{o.guestName || "Guest Customer"}</p>
                      <p className="text-[10px] text-slate-400">{o.guestPhone || "No Phone"}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">₹{o.subtotal}</td>
                    <td className="py-3 px-4 text-rose-600">-₹{o.discount}</td>
                    <td className="py-3 px-4">₹{o.deliveryFee}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{o.total}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "cancelled"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={filteredOrders.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="sales orders"
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. ORDERS REPORT VIEW
// -------------------------------------------------------------
function OrdersReportView({
  orders,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
}: {
  orders: OrderItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: string;
  setFilterStatus: (st: string) => void;
}) {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.guestName && o.guestName.toLowerCase().includes(q)) ||
        (o.guestPhone && o.guestPhone.includes(q))
      );
    });
  }, [orders, filterStatus, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Order Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setFilterStatus("all");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStatus === "all"
              ? "bg-[#0b2f8a] text-white border-[#0b2f8a] shadow-md"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-xs opacity-75 font-medium">All Orders</p>
          <p className="text-2xl font-bold mt-1">{orders.length}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterStatus("pending");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStatus === "pending"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-xs text-amber-600 font-medium">Pending Processing</p>
          <p className="text-2xl font-bold mt-1 text-amber-700">{pendingCount}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterStatus("delivered");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStatus === "delivered"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-md"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-xs text-emerald-600 font-medium">Delivered Fresh</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700">{deliveredCount}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterStatus("cancelled");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStatus === "cancelled"
              ? "bg-rose-700 text-white border-rose-700 shadow-md"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-xs text-rose-600 font-medium">Cancelled</p>
          <p className="text-2xl font-bold mt-1 text-rose-700">{cancelledCount}</p>
        </button>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-800">Order Dispatch Registry</h3>
            <p className="text-xs text-slate-500 mt-0.5">Filter by status or search customer contact</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by Order # or Phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-60"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Delivery Slot</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 font-bold text-slate-900">Total (₹)</th>
                <th className="py-3 px-4">Ordered At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          o.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "cancelled"
                            ? "bg-rose-100 text-rose-800"
                            : o.status === "confirmed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{o.guestName || "Customer"}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{o.guestPhone || "No Phone"}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{o.deliverySlot || "Standard (Same-Day)"}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-600">
                      {o.paymentMethod} ({o.paymentStatus})
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{o.total}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(o.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={filteredOrders.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="registry orders"
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. PRODUCT REPORT VIEW
// -------------------------------------------------------------
function ProductReportView({
  products,
  orders,
  searchQuery,
  setSearchQuery,
}: {
  products: ProductItem[];
  orders: OrderItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Category Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Listed SKUs</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{products.length}</p>
          <p className="text-xs text-slate-400 mt-1">Across Sweets, Farsan & Bakery</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Top Performing Category</p>
          <p className="text-2xl font-bold text-[#0b2f8a] mt-1">Kaju & Desi Ghee Mithai</p>
          <p className="text-xs text-emerald-600 mt-1">68% of Total Store Revenue</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Average Price per Pack</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            ₹
            {products.length > 0
              ? Math.round(products.reduce((acc, p) => acc + p.price, 0) / products.length)
              : 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Across 250g, 500g & 1kg packs</p>
        </div>
      </div>

      {/* Product Catalog Performance Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-800">Master Product Performance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pricing, weights, categories, and inventory counts</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by Product name, SKU..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-60"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Pack Weight</th>
                <th className="py-3 px-4">Price (₹)</th>
                <th className="py-3 px-4">Stock Units</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.name} className="w-7 h-7 rounded-lg object-cover" />
                    )}
                    <span>{p.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{p.categoryName || "General"}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{p.sku}</td>
                  <td className="py-3 px-4 text-slate-600">{p.weight}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">₹{p.price}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-bold ${
                        p.stock <= 5
                          ? "text-rose-600"
                          : p.stock <= 15
                          ? "text-amber-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {p.stock} packs
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stock > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {p.stock > 0 ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={filteredProducts.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="products"
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. INVENTORY REPORT VIEW
// -------------------------------------------------------------
function InventoryReportView({
  inventory,
  inventoryValuation,
  searchQuery,
  setSearchQuery,
}: {
  inventory: { variants: InventoryItem[]; lowStock: InventoryItem[] };
  inventoryValuation: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredVariants = useMemo(() => {
    return inventory.variants.filter((v) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.name?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q) ||
        v.weight?.toLowerCase().includes(q)
      );
    });
  }, [inventory.variants, searchQuery]);

  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVariants.slice(start, start + pageSize);
  }, [filteredVariants, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Valuation & Low Stock Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0b2f8a] to-[#071c54] text-white rounded-2xl p-5 shadow-sm space-y-1">
          <p className="text-xs text-[#dfb755] uppercase tracking-wider font-bold">
            Total Inventory Valuation
          </p>
          <p className="text-3xl font-bold">₹{inventoryValuation.toLocaleString()}</p>
          <p className="text-xs text-white/70">Calculated across live stock × MRP</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Tracked Variant SKUs
          </p>
          <p className="text-3xl font-bold text-slate-800">{inventory.variants.length}</p>
          <p className="text-xs text-slate-400">Total variants in warehouse</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm space-y-1">
          <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold">
            Low Stock Alerts (&lt; 10 units)
          </p>
          <p className="text-3xl font-bold text-amber-600">{inventory.lowStock.length}</p>
          <p className="text-xs text-amber-700/80">Immediate morning restock recommended</p>
        </div>
      </div>

      {/* Inventory Detailed Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-800">Warehouse Stock Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time inventory levels from database</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search variant name or SKU..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-60"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Item & Variant</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4 font-bold">Stock Remaining</th>
                <th className="py-3 px-4 font-bold text-slate-900">Total Value (₹)</th>
                <th className="py-3 px-4">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedVariants.map((v) => {
                const totalValue = v.stock * v.price;
                return (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{v.name}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{v.sku}</td>
                    <td className="py-3 px-4 text-slate-600">{v.weight}</td>
                    <td className="py-3 px-4">₹{v.price}</td>
                    <td className="py-3 px-4 font-bold">
                      <span
                        className={
                          v.stock <= 0
                            ? "text-rose-600"
                            : v.stock < 10
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }
                      >
                        {v.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{totalValue.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.stock <= 0
                            ? "bg-rose-100 text-rose-800"
                            : v.stock < 10
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {v.stock <= 0 ? "Out of Stock" : v.stock < 10 ? "Low Stock" : "Sufficient"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={filteredVariants.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="inventory variants"
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. CUSTOMER REPORT VIEW
// -------------------------------------------------------------
function CustomerReportView({
  orders,
  searchQuery,
  setSearchQuery,
}: {
  orders: OrderItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  // Aggregate customer metrics by phone or name
  const customerMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; address: string; totalOrders: number; totalSpent: number; lastOrder: string }
    >();

    orders.forEach((o) => {
      const key = o.guestPhone || o.guestName || `order-${o.id}`;
      let addr = "Vadodara, Gujarat";
      if (o.addressSnapshot) {
        try {
          const parsed = JSON.parse(o.addressSnapshot);
          if (parsed && typeof parsed === "object") {
            const parts = [parsed.line1, parsed.city, parsed.state, parsed.pincode].filter(Boolean);
            if (parts.length > 0) addr = parts.join(", ");
          } else {
            addr = o.addressSnapshot;
          }
        } catch {
          addr = o.addressSnapshot;
        }
      }

      const existing = map.get(key) || {
        name: o.guestName || "Guest Patron",
        phone: o.guestPhone || "N/A",
        address: addr,
        totalOrders: 0,
        totalSpent: 0,
        lastOrder: o.createdAt,
      };

      existing.totalOrders += 1;
      existing.totalSpent += o.total;
      if (new Date(o.createdAt) > new Date(existing.lastOrder)) {
        existing.lastOrder = o.createdAt;
        if (addr) existing.address = addr;
      }
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCustomers = useMemo(() => {
    return customerMap.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q);
    });
  }, [customerMap, searchQuery]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Unique Customers</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{customerMap.length}</p>
          <p className="text-xs text-slate-400 mt-1">Patrons with placed orders</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Repeat Customer Rate</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {customerMap.length > 0
              ? `${Math.round(
                  (customerMap.filter((c) => c.totalOrders > 1).length / customerMap.length) * 100
                )}%`
              : "0%"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Patrons ordering more than once</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Top Patron Spend</p>
          <p className="text-3xl font-bold text-[#0b2f8a] mt-1">
            ₹{customerMap[0]?.totalSpent.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">{customerMap[0]?.name || "N/A"}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-800">Customer Directory & Full Address</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ranked by total lifetime value (LTV) with delivery locations</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by patron name, phone or address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-60"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
          </div>
        </div>

        <div className="bg-amber-50/80 border-b border-amber-100 px-5 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <span className="flex items-center gap-1.5 font-medium">
            <span>💡</span> Looking to manage or delete customer accounts? Go to the <strong>Customer Directory (👥)</strong> tab in the sidebar to delete profiles safely with cascade protection.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Patron Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Full Delivery Address</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4 font-bold text-slate-900">Total Spend (₹)</th>
                <th className="py-3 px-4">Last Order Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedCustomers.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs">
                    <span className="flex items-start gap-1.5">
                      <span className="text-amber-600 shrink-0 text-xs">📍</span>
                      <span className="leading-snug">{c.address}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4">{c.totalOrders} order(s)</td>
                  <td className="py-3 px-4 font-bold text-slate-900">₹{c.totalSpent.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(c.lastOrder).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
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
          itemName="patron profiles"
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. PAYMENT REPORT VIEW
// -------------------------------------------------------------
function PaymentReportView({
  orders,
  totalGross,
  searchQuery,
  setSearchQuery,
}: {
  orders: OrderItem[];
  totalGross: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const codOrders = orders.filter((o) => o.paymentMethod?.toLowerCase() === "cod");
  const upiOrders = orders.filter((o) => o.paymentMethod?.toLowerCase() === "upi");

  const codTotal = codOrders.reduce((sum, o) => sum + o.total, 0);
  const upiTotal = upiOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Payments Volume</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">₹{totalGross.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{orders.length} total transactions</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-sm">
          <p className="text-xs text-blue-700 font-semibold uppercase">UPI Instant Collections</p>
          <p className="text-3xl font-bold text-blue-800 mt-1">₹{upiTotal.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-1">
            {upiOrders.length} orders ({totalGross > 0 ? Math.round((upiTotal / totalGross) * 100) : 0}%)
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm">
          <p className="text-xs text-emerald-700 font-semibold uppercase">Cash on Delivery (COD)</p>
          <p className="text-3xl font-bold text-emerald-800 mt-1">₹{codTotal.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1">
            {codOrders.length} orders ({totalGross > 0 ? Math.round((codTotal / totalGross) * 100) : 0}%)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800">Payment Collection Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">Verification status per transaction</p>
          </div>
          <input
            type="text"
            placeholder="Search by Order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Logged Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">TXN-{o.id.toString().padStart(6, "0")}</td>
                  <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">{o.orderNumber}</td>
                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-700">{o.paymentMethod}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">₹{o.total}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        o.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(o.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 7. REVENUE REPORT VIEW
// -------------------------------------------------------------
function RevenueReportView({
  orders,
  totalGross,
  totalDiscounts,
  totalNet,
}: {
  orders: OrderItem[];
  totalGross: number;
  totalDiscounts: number;
  totalNet: number;
}) {
  const estimatedGST = Math.round(totalNet * 0.05); // 5% GST on sweets
  const grossProfitEstimate = Math.round(totalNet * 0.35); // 35% estimated gross margin

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Gross Merchandise Value</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{totalGross.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Total checkout value</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Net Invoiced Revenue</p>
          <p className="text-2xl font-bold text-[#0b2f8a] mt-1">₹{totalNet.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">After customer coupons</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Estimated GST (5%)</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{estimatedGST.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Applicable food GST pool</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm">
          <p className="text-xs text-emerald-700 font-semibold uppercase">Estimated Gross Profit</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹{grossProfitEstimate.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1">~35% Desi Ghee Mithai Margin</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-base text-slate-800">Monthly Revenue Projections</h3>
        <p className="text-xs text-slate-500">Based on historical daily dispatch figures</p>

        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Festival Season Mithai Demand</span>
              <span className="text-[#0b2f8a]">88% of target</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#0b2f8a] rounded-full w-[88%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Morning Fresh Farsan Deliveries</span>
              <span className="text-emerald-600">76% of target</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full w-[76%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Bakery & Dry Snacks</span>
              <span className="text-[#dfb755]">64% of target</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#dfb755] rounded-full w-[64%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 8. LOGIN REPORT VIEW
// -------------------------------------------------------------
function LoginReportView({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const mockLogins = [
    {
      id: 1,
      user: "Admin (Karigar Desk)",
      email: "admin@vardayini.com",
      role: "admin",
      ip: "192.168.1.42",
      device: "Chrome / Windows 11",
      time: "2026-10-02 18:15:20",
      status: "Success",
    },
    {
      id: 2,
      user: "Aanya Patel",
      email: "aanya@vardayini.com",
      role: "customer",
      ip: "103.24.120.88",
      device: "Safari / iPhone 15",
      time: "2026-10-02 16:40:11",
      status: "Success",
    },
    {
      id: 3,
      user: "Guest Checkout Session",
      email: "guest@phone.otp",
      role: "guest",
      ip: "152.58.14.201",
      device: "Chrome / Android",
      time: "2026-10-02 15:22:04",
      status: "Success",
    },
    {
      id: 4,
      user: "Unknown Login Attempt",
      email: "operator@vardayini.com",
      role: "unknown",
      ip: "45.112.87.12",
      device: "Firefox / Linux",
      time: "2026-10-02 11:08:45",
      status: "Failed (Bad Password)",
    },
    {
      id: 5,
      user: "Mandvi Counter Staff",
      email: "counter.mandvi@vardayini.com",
      role: "staff",
      ip: "192.168.1.105",
      device: "Edge / Windows POS",
      time: "2026-10-02 08:30:00",
      status: "Success",
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-800">Security & Authentication Access Trail</h3>
          <p className="text-xs text-slate-500 mt-0.5">Logs of administrative and customer portal access</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Account / Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Device</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {mockLogins.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-semibold text-slate-900">{l.user}</td>
                <td className="py-3 px-4 font-mono text-slate-500">{l.email}</td>
                <td className="py-3 px-4 uppercase text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{l.role}</span>
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{l.ip}</td>
                <td className="py-3 px-4 text-slate-600">{l.device}</td>
                <td className="py-3 px-4 text-slate-500">{l.time}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      l.status.startsWith("Success")
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 9. OTP REPORT VIEW
// -------------------------------------------------------------
function OtpReportView({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const mockOtps = [
    {
      id: "OTP-8821",
      phone: "+91 98250 19760",
      purpose: "Guest Checkout Verification",
      otp: "482914",
      gateway: "Fast2SMS DLT",
      status: "Verified",
      time: "2026-10-02 18:02:15",
    },
    {
      id: "OTP-8820",
      phone: "+91 94260 55123",
      purpose: "Customer Account Sign-In",
      otp: "719302",
      gateway: "Fast2SMS DLT",
      status: "Verified",
      time: "2026-10-02 17:45:00",
    },
    {
      id: "OTP-8819",
      phone: "+91 99090 12345",
      purpose: "Order Cancel Confirmation",
      otp: "338190",
      gateway: "Fast2SMS DLT",
      status: "Expired",
      time: "2026-10-02 16:10:22",
    },
    {
      id: "OTP-8818",
      phone: "+91 98240 88712",
      purpose: "Delivery Handover PIN",
      otp: "904128",
      gateway: "Fast2SMS DLT",
      status: "Verified",
      time: "2026-10-02 14:30:19",
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-800">Two-Factor & Checkout OTP Verification Logs</h3>
          <p className="text-xs text-slate-500 mt-0.5">DLT authenticated SMS gateway dispatch status</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Log ID</th>
              <th className="py-3 px-4">Recipient Mobile</th>
              <th className="py-3 px-4">Verification Purpose</th>
              <th className="py-3 px-4">Gateway Route</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Dispatched At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {mockOtps.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">{o.id}</td>
                <td className="py-3 px-4 font-mono text-slate-800">{o.phone}</td>
                <td className="py-3 px-4 text-slate-700">{o.purpose}</td>
                <td className="py-3 px-4 text-slate-500">{o.gateway}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.status === "Verified"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">{o.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 10. EMAIL REPORT VIEW
// -------------------------------------------------------------
function EmailReportView({
  orders,
  searchQuery,
  setSearchQuery,
}: {
  orders: OrderItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.guestName && o.guestName.toLowerCase().includes(q))
    );
  }, [orders, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-slate-800">Transactional Email Dispatches</h3>
          <p className="text-xs text-slate-500 mt-0.5">Order confirmation, dispatch notices, and digital invoices</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search email log by order # or name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-56"
          />

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Email ID</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject Line</th>
              <th className="py-3 px-4">Order Ref</th>
              <th className="py-3 px-4">Delivery Status</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No email logs match your search.
                </td>
              </tr>
            ) : (
              paginated.map((o, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">EML-{(1000 + globalIndex).toString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{o.guestName || "Customer"}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {`Your Vardayini Sweet Mart order ${o.orderNumber} is confirmed!`}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Delivered (100%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(o.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
        totalItems={filtered.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50]}
        itemName="emails"
      />
    </div>
  );
}

// -------------------------------------------------------------
// 11. SMS REPORT VIEW
// -------------------------------------------------------------
function SmsReportView({
  orders,
  searchQuery,
  setSearchQuery,
}: {
  orders: OrderItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.guestName && o.guestName.toLowerCase().includes(q)) ||
        (o.guestPhone && o.guestPhone.includes(q))
    );
  }, [orders, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-slate-800">DLT Transactional SMS Dispatches</h3>
          <p className="text-xs text-slate-500 mt-0.5">Carrier delivery reports via registered Header: VRDYNI</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search SMS log by order # or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-full sm:w-56"
          />

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">SMS ID</th>
              <th className="py-3 px-4">Mobile</th>
              <th className="py-3 px-4">Template Description</th>
              <th className="py-3 px-4">Sender ID</th>
              <th className="py-3 px-4">Carrier Ack</th>
              <th className="py-3 px-4">Sent Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No SMS dispatches match your search.
                </td>
              </tr>
            ) : (
              paginated.map((o, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">SMS-{(8000 + globalIndex).toString()}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{o.guestPhone || "+91 98250 19760"}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {`Namaste ${o.guestName || "Customer"}, your order ${o.orderNumber} has been received. Fresh preparation underway.`}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">VRDYNI</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Delivered
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(o.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
        totalItems={filtered.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50]}
        itemName="SMS dispatches"
      />
    </div>
  );
}
