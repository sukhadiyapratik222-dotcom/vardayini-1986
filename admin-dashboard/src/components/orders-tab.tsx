"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { OrderItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { TablePagination } from "./table-pagination";

interface OrdersTabProps {
  orders: OrderItem[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-blue-50 text-blue-800 border-blue-200",
  packed: "bg-purple-50 text-purple-800 border-purple-200",
  shipped: "bg-cyan-50 text-cyan-800 border-cyan-200",
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
};

const ALL_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

/** Parse the JSON address snapshot into a human-readable string */
function parseAddress(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object") {
      return [p.line1, p.city, p.state, p.pincode].filter(Boolean).join(", ");
    }
  } catch { /* not JSON */ }
  return raw;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
interface EditOrderModalProps {
  order: OrderItem;
  onClose: () => void;
  onSaved: () => void;
}

function EditOrderModal({ order, onClose, onSaved }: EditOrderModalProps) {
  const [form, setForm] = useState({
    guestName: order.guestName || "",
    guestPhone: order.guestPhone || "",
    deliverySlot: order.deliverySlot || "",
    paymentMethod: order.paymentMethod || "",
    paymentStatus: order.paymentStatus || "",
    total: String(order.total || ""),
    status: order.status || "pending",
  });
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.updateOrder(order.orderNumber, {
        guestName: form.guestName || undefined,
        guestPhone: form.guestPhone || undefined,
        deliverySlot: form.deliverySlot || undefined,
        paymentMethod: form.paymentMethod || undefined,
        paymentStatus: form.paymentStatus || undefined,
        total: form.total ? Number(form.total) : undefined,
        status: form.status,
      });
      toast.success(`Order ${order.orderNumber} updated`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSave}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#0b2f8a]/10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#0b2f8a] text-white">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/70">Edit Order</p>
            <h2 className="font-bold text-base font-mono">{order.orderNumber}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/20 transition cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Customer Name</span>
              <input
                ref={nameInputRef}
                value={form.guestName}
                onChange={(e) => set("guestName", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230]"
                placeholder="Customer name"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Phone</span>
              <input
                value={form.guestPhone}
                onChange={(e) => set("guestPhone", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230]"
                placeholder="+91 98250 0000"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Delivery Slot</span>
            <input
              value={form.deliverySlot}
              onChange={(e) => set("deliverySlot", e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230]"
              placeholder="Morning Batch (8:00 AM – 11:30 AM)"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Payment Method</span>
              <select
                value={form.paymentMethod}
                onChange={(e) => set("paymentMethod", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230] bg-white cursor-pointer"
              >
                <option value="upi">UPI</option>
                <option value="cod">Cash on Delivery</option>
                <option value="card">Card</option>
                <option value="netbanking">Net Banking</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Payment Status</span>
              <select
                value={form.paymentStatus}
                onChange={(e) => set("paymentStatus", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230] bg-white cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Order Status</span>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230] bg-white cursor-pointer"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-[#5e6d82] uppercase tracking-wider">Total Amount (₹)</span>
              <input
                type="number"
                min={0}
                value={form.total}
                onChange={(e) => set("total", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#0b2f8a]/15 px-3 py-2 text-sm outline-none focus:border-[#0b2f8a] text-[#182230]"
                placeholder="0"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#0b2f8a]/8 bg-[#f8faff]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#0b2f8a]/15 px-5 py-2 text-sm font-medium text-[#182230] hover:bg-[#0b2f8a]/5 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#0b2f8a] px-6 py-2 text-sm font-bold text-white hover:bg-[#09256e] transition disabled:opacity-60 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {saving
              ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
              : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
interface DeleteConfirmProps {
  orderNumber: string;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({ orderNumber, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deleteOrder(orderNumber);
      toast.success(`Order ${orderNumber} permanently deleted`);
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
      setDeleting(false);
    }
  };

  useEffect(() => {
    // Automatically focus delete confirmation button on mount
    deleteBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !deleting) {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape" && !deleting) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleting, orderNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 border border-rose-100">
            <span className="text-2xl">🗑️</span>
          </div>
          <h3 className="font-bold text-[#182230] text-lg">Delete Order?</h3>
          <p className="mt-1 text-sm text-[#5e6d82]">
            Permanently delete <span className="font-mono font-bold text-rose-600">{orderNumber}</span> and all its items.
            This <strong>cannot be undone</strong>.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-[#0b2f8a]/15 py-2.5 text-sm font-medium text-[#182230] hover:bg-[#0b2f8a]/5 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={deleteBtnRef}
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-sm focus:ring-4 focus:ring-rose-200 outline-none"
          >
            {deleting
              ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Deleting…</>
              : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main OrdersTab ───────────────────────────────────────────────────────────
export function OrdersTab({ orders, onRefresh }: OrdersTabProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [editOrder, setEditOrder] = useState<OrderItem | null>(null);
  const [deleteOrderNumber, setDeleteOrderNumber] = useState<string | null>(null);

  const handleStatusChange = async (orderNumber: string, newStatus: string) => {
    setUpdatingId(orderNumber);
    try {
      await api.updateOrderStatus(orderNumber, newStatus);
      toast.success(`Order #${orderNumber} marked as ${newStatus.toUpperCase()}`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to update status for Order #${orderNumber}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => filter === "all" || o.status === filter);
  }, [orders, filter]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <>
      {editOrder && (
        <EditOrderModal order={editOrder} onClose={() => setEditOrder(null)} onSaved={onRefresh} />
      )}
      {deleteOrderNumber && (
        <DeleteConfirmModal
          orderNumber={deleteOrderNumber}
          onClose={() => setDeleteOrderNumber(null)}
          onDeleted={onRefresh}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
              Orders &amp; Dispatch Desk
            </h2>
            <p className="text-xs text-[#5e6d82] mt-1">
              Real-time tracking of fresh mithai &amp; farsan deliveries across Vadodara, Ahmedabad, Surat and Anand.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-400 font-medium">Table Length:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Math.min(50, Number(e.target.value))); setCurrentPage(1); }}
                className="bg-transparent font-bold text-[#0b2f8a] outline-none cursor-pointer"
              >
                <option value={10}>10 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records (Max)</option>
              </select>
            </div>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs rounded-xl bg-white border border-[#0b2f8a]/15 px-4 py-2 text-[#182230] focus:border-[#0b2f8a] outline-none shadow-sm"
            >
              <option value="all">All Orders ({orders.length})</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#0b2f8a]/10 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#182230]">
              <thead className="bg-[#0b2f8a]/5 text-[11px] uppercase tracking-wider text-[#0b2f8a] font-bold border-b border-[#0b2f8a]/10">
                <tr>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Date &amp; Slot</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Update Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0b2f8a]/8">
                {paginatedOrders.map((order) => {
                  const statusStyle = STATUS_COLORS[order.status] || "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <tr key={order.id} className="hover:bg-[#0b2f8a]/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#0b2f8a] text-xs">{order.orderNumber}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#182230]">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[10px] text-[#5e6d82]">{order.deliverySlot}</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-[#182230]">{order.guestName || "Guest Customer"}</p>
                        <p className="text-[10px] text-[#5e6d82] font-mono">{order.guestPhone || "-"}</p>
                        {order.addressSnapshot && (
                          <p className="text-[10px] text-slate-600 mt-1 flex items-start gap-1 leading-snug">
                            <span className="text-amber-600 shrink-0">📍</span>
                            <span>{parseAddress(order.addressSnapshot)}</span>
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#0b2f8a]">₹{order.total}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#182230] uppercase text-[10px]">{order.paymentMethod}</span>
                          <span className="text-[10px] text-emerald-700 font-medium">{order.paymentStatus}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyle}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          disabled={updatingId === order.orderNumber}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.orderNumber, e.target.value)}
                          className="text-[11px] rounded-lg bg-white border border-[#0b2f8a]/15 px-2.5 py-1 text-[#182230] focus:border-[#0b2f8a] outline-none disabled:opacity-50"
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="Edit order"
                            onClick={() => setEditOrder(order)}
                            className="rounded-lg border border-[#0b2f8a]/20 bg-[#eef3ff] hover:bg-[#0b2f8a] text-[#0b2f8a] hover:text-white px-2.5 py-1.5 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            title="Delete order"
                            onClick={() => setDeleteOrderNumber(order.orderNumber)}
                            className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white px-2.5 py-1.5 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#5e6d82]">
                      No orders recorded yet under this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            totalItems={filtered.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemName="orders"
          />
        </div>
      </div>
    </>
  );
}
