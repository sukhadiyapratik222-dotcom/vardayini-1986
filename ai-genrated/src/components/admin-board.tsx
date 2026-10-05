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

export function AdminBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [lowStock, setLowStock] = useState<Variant[]>([]);

  async function load() {
    const [orderRes, invRes] = await Promise.all([fetch("/api/orders"), fetch("/api/admin/inventory")]);
    const orderData = await orderRes.json();
    const invData = await invRes.json();
    setOrders(orderData.orders || []);
    setVariants(invData.variants || []);
    setLowStock(invData.lowStock || []);
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      const [orderRes, invRes] = await Promise.all([fetch("/api/orders"), fetch("/api/admin/inventory")]);
      const orderData = await orderRes.json();
      const invData = await invRes.json();
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
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section className="mithai-card rounded-3xl p-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#6b1d1d]">Orders</h2>
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-[#6b1d1d]/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs uppercase tracking-wide text-[#2a1a12]/50">
                    {order.paymentMethod} · {formatInr(order.total)}
                  </p>
                </div>
                <select
                  value={order.status}
                  onChange={(e) => setStatus(order.orderNumber, e.target.value)}
                  className="rounded-full border border-[#6b1d1d]/15 px-3 py-1 text-sm"
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
      <section className="mithai-card rounded-3xl p-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#6b1d1d]">Inventory</h2>
        {lowStock.length > 0 ? (
          <p className="mt-2 text-sm text-[#c45c26]">{lowStock.length} variants at or below 20 packs.</p>
        ) : null}
        <div className="mt-4 max-h-[540px] space-y-2 overflow-auto">
          {variants.map((variant) => (
            <div key={variant.id} className="flex items-center gap-3 rounded-2xl border border-[#6b1d1d]/10 px-3 py-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">{variant.name}</p>
                <p className="text-xs text-[#2a1a12]/50">
                  {variant.weight} · {variant.sku}
                </p>
              </div>
              <input
                type="number"
                defaultValue={variant.stock}
                className="w-20 rounded-full border border-[#6b1d1d]/15 px-2 py-1"
                onBlur={(e) => setStock(variant.id, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
