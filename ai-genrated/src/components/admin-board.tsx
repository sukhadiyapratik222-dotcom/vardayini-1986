"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/money";

type Order = {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
};

type Variant = {
  id: number;
  sku: string;
  weight: string;
  stock: number;
  price: number;
  name: string;
};

import { AdminOutletsManager } from "@/components/admin-outlets-manager";

export function AdminBoard() {
  const [activeTab, setActiveTab] = useState<"outlets" | "orders" | "inventory" | "all">("outlets");
  const [orders, setOrders] = useState<Order[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [lowStock, setLowStock] = useState<Variant[]>([]);

  function checkAuthRevoked(res: Response, data: any) {
    if (
      res.status === 401 ||
      res.status === 403 ||
      (data && typeof data.error === "string" && data.error.toLowerCase().includes("deactivated"))
    ) {
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        window.location.href = "/login?error=deactivated";
      });
      return true;
    }
    return false;
  }

  async function load() {
    const [orderRes, invRes] = await Promise.all([fetch("/api/orders"), fetch("/api/admin/inventory")]);
    const orderData = await orderRes.json().catch(() => ({}));
    const invData = await invRes.json().catch(() => ({}));
    if (checkAuthRevoked(orderRes, orderData) || checkAuthRevoked(invRes, invData)) return;
    setOrders(orderData.orders || []);
    setVariants(invData.variants || []);
    setLowStock(invData.lowStock || []);
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      const [orderRes, invRes] = await Promise.all([fetch("/api/orders"), fetch("/api/admin/inventory")]);
      const orderData = await orderRes.json().catch(() => ({}));
      const invData = await invRes.json().catch(() => ({}));
      if (checkAuthRevoked(orderRes, orderData) || checkAuthRevoked(invRes, invData)) return;
      if (!ignore) {
        setOrders(orderData.orders || []);
        setVariants(invData.variants || []);
        setLowStock(invData.lowStock || []);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  async function setStatus(orderNumber: string, status: string) {
    await fetch(`/api/admin/orders/${orderNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function setStock(id: number, stock: number) {
    await fetch("/api/admin/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock }),
    });
    load();
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Admin Tab Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#6b1d1d]/10 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("outlets")}
          className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "outlets"
              ? "bg-[#6b1d1d] text-white shadow-md scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
          }`}
        >
          <span>📍 Outlets &amp; Stores</span>
          <span className="rounded-full bg-amber-400 text-[#6b1d1d] px-2 py-0.5 text-[10px] font-extrabold">
            Manage
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "orders"
              ? "bg-[#6b1d1d] text-white shadow-md scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
          }`}
        >
          <span>📦 Orders</span>
          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "inventory"
              ? "bg-[#6b1d1d] text-white shadow-md scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
          }`}
        >
          <span>📊 Inventory</span>
          {lowStock.length > 0 && (
            <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold">
              {lowStock.length} Low
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-[#6b1d1d] text-white shadow-md font-bold"
              : "bg-white text-slate-500 hover:bg-amber-50 border border-slate-200"
          }`}
        >
          View All Panels
        </button>
      </div>

      {/* Outlets Manager Section */}
      {(activeTab === "outlets" || activeTab === "all") && (
        <AdminOutletsManager />
      )}

      {/* Orders & Inventory Panels */}
      {(activeTab === "orders" || activeTab === "inventory" || activeTab === "all") && (
        <div className="grid gap-8 lg:grid-cols-2">
          {(activeTab === "orders" || activeTab === "all") && (
            <section className="mithai-card rounded-3xl p-6 bg-white border border-[#6b1d1d]/15 shadow-sm">
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#6b1d1d]">
                Orders
              </h2>
              <div className="mt-4 space-y-3">
                {orders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-[#6b1d1d]/10 p-4 bg-[#faf6ee]/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#24142e]">{order.orderNumber}</p>
                        <p className="text-xs uppercase tracking-wide text-[#2a1a12]/50">
                          {order.paymentMethod} · {formatInr(order.total)}
                        </p>
                      </div>
                      <select
                        value={order.status}
                        onChange={(e) => setStatus(order.orderNumber, e.target.value)}
                        className="rounded-full border border-[#6b1d1d]/20 px-3 py-1 text-sm bg-white cursor-pointer"
                      >
                        {["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
                {orders.length === 0 ? <p className="text-sm text-[#2a1a12]/60">No orders yet.</p> : null}
              </div>
            </section>
          )}

          {(activeTab === "inventory" || activeTab === "all") && (
            <section className="mithai-card rounded-3xl p-6 bg-white border border-[#6b1d1d]/15 shadow-sm">
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#6b1d1d]">
                Inventory
              </h2>
              {lowStock.length > 0 ? (
                <p className="mt-2 text-sm text-[#c45c26] font-medium">
                  ⚠️ {lowStock.length} variants at or below 20 packs.
                </p>
              ) : null}
              <div className="mt-4 max-h-[540px] space-y-2 overflow-auto pr-1">
                {variants.map((variant) => (
                  <div key={variant.id} className="flex items-center gap-3 rounded-2xl border border-[#6b1d1d]/10 px-3 py-2 text-sm bg-[#faf6ee]/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#24142e] truncate">{variant.name}</p>
                      <p className="text-xs text-[#2a1a12]/50">
                        {variant.weight} · {variant.sku}
                      </p>
                    </div>
                    <input
                      type="number"
                      defaultValue={variant.stock}
                      className="w-20 rounded-full border border-[#6b1d1d]/20 bg-white px-2.5 py-1 text-center font-bold"
                      onBlur={(e) => setStock(variant.id, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
