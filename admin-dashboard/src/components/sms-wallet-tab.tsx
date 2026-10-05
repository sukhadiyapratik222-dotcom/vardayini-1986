"use client";

import { useState, useMemo } from "react";
import { toast } from "@/lib/toast";
import { TablePagination } from "./table-pagination";

interface Transaction {
  id: string;
  date: string;
  packName: string;
  amount: number;
  credits: number;
  paymentMethod: string;
  status: "Completed" | "Pending";
}

export function SmsWalletTab() {
  const [balance, setBalance] = useState(3850);
  const [credits, setCredits] = useState(12833);
  const [isRecharging, setIsRecharging] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(1000);
  const [alertPhone, setAlertPhone] = useState("+91 98250 19760");
  const [autoAlert, setAutoAlert] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "INV-2026-901",
      date: "2026-09-28",
      packName: "Festive Blast Pack",
      amount: 3999,
      credits: 15000,
      paymentMethod: "UPI / Net Banking",
      status: "Completed",
    },
    {
      id: "INV-2026-842",
      date: "2026-08-15",
      packName: "Starter Pack",
      amount: 1499,
      credits: 5000,
      paymentMethod: "Corporate Card",
      status: "Completed",
    },
  ]);

  const packs = [
    {
      id: "starter",
      name: "Starter Pack",
      credits: 5000,
      price: 1499,
      rate: "₹0.30 / SMS",
      description: "Ideal for daily order confirmations and OTP verification",
      popular: false,
    },
    {
      id: "festive",
      name: "Festive Blast Pack",
      credits: 15000,
      price: 3999,
      rate: "₹0.26 / SMS",
      description: "Best for Diwali, Holi & Rakhi festival discount promotions",
      popular: true,
    },
    {
      id: "mega",
      name: "Mega Commercial Pack",
      credits: 50000,
      price: 11999,
      rate: "₹0.24 / SMS",
      description: "High volume daily dispatch alerts and broadcast lists",
      popular: false,
    },
    {
      id: "enterprise",
      name: "Enterprise Karigar Pack",
      credits: 100000,
      price: 21999,
      rate: "₹0.22 / SMS",
      description: "Maximum savings for wholesale and full-year coverage",
      popular: false,
    },
  ];

  const handleRecharge = async (pack: (typeof packs)[0]) => {
    setIsRecharging(pack.id);
    setTimeout(() => {
      setBalance((prev) => prev + pack.price);
      setCredits((prev) => prev + pack.credits);

      const newTxn: Transaction = {
        id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().slice(0, 10),
        packName: pack.name,
        amount: pack.price,
        credits: pack.credits,
        paymentMethod: "UPI Instant Payment",
        status: "Completed",
      };
      setTransactions((prev) => [newTxn, ...prev]);

      setIsRecharging(null);
      toast.success(`Successfully recharged ${pack.credits.toLocaleString()} SMS credits (₹${pack.price})`);
    }, 600);
  };

  const handleSaveAlerts = () => {
    toast.success("SMS Low Balance threshold updated to " + alertThreshold + " credits");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0b2f8a] uppercase tracking-wider mb-1">
            <span>Communications</span>
            <span>/</span>
            <span className="text-[#dfb755] font-bold">SMS Wallet & Credits</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#182230] flex items-center gap-3">
            <span>💬</span>
            <span>SMS Wallet & Credits</span>
          </h1>
          <p className="text-xs text-[#5e6d82] mt-1 max-w-2xl">
            Manage TRAI DLT approved transactional SMS balance, instant credit recharges, and sender ID: <strong className="text-[#0b2f8a]">VRDYNI</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            DLT Gateway Live
          </span>
        </div>
      </div>

      {/* Wallet Balance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0b2f8a] to-[#071c54] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-7xl font-bold">💬</div>
          <p className="text-xs uppercase tracking-wider font-semibold text-[#dfb755]">
            Remaining SMS Credits
          </p>
          <p className="text-4xl font-extrabold mt-2 tracking-tight">
            {credits.toLocaleString()}
          </p>
          <p className="text-xs text-white/70 mt-2 flex items-center gap-1.5">
            <span>Active Sender ID:</span>
            <span className="px-2 py-0.5 rounded bg-white/20 font-mono font-bold text-white">
              VRDYNI
            </span>
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Wallet Ledger Balance
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-2">
              ₹{balance.toLocaleString()}.00
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Avg Cost per Transactional SMS: <strong className="text-slate-700">₹0.26</strong>
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Gateway Delivery Rate
            </p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              99.6%
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Telecom Handover latency: <strong className="text-slate-700">&lt; 2.4 seconds</strong>
          </p>
        </div>
      </div>

      {/* Recharge Packages Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>⚡</span>
            <span>Instant Top-Up SMS Credit Packs</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose a recharge pack to instantly top up your account with instant GST tax invoices
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-2xl p-5 border flex flex-col justify-between transition relative ${
                pack.popular
                  ? "border-[#0b2f8a] bg-blue-50/40 shadow-md ring-2 ring-[#0b2f8a]/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0b2f8a] text-white shadow-sm uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{pack.name}</h3>
                  <span className="text-[11px] text-slate-500">{pack.rate}</span>
                </div>

                <div>
                  <p className="text-2xl font-black text-slate-900">
                    ₹{pack.price.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold text-[#0b2f8a] mt-0.5">
                    {pack.credits.toLocaleString()} SMS Credits
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  {pack.description}
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  disabled={isRecharging === pack.id}
                  onClick={() => handleRecharge(pack)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                    pack.popular
                      ? "bg-[#0b2f8a] hover:bg-[#071c54] text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {isRecharging === pack.id ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Crediting...</span>
                    </>
                  ) : (
                    <>
                      <span>Recharge Now</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: DLT Registered Templates & Low Balance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DLT Registered Headers & Templates */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>🛡️</span>
                <span>TRAI DLT Template Registry</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Approved templates bound to Sender ID VRDYNI</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              100% Compliant
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Order Placed Template</span>
                <span className="font-mono text-[10px] text-slate-400">ID: 140716123456789</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                Namaste {'{#var#}'}, your Vardayini Sweet Mart order {'{#var#}'} is confirmed. Fresh sweets dispatching soon!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Dispatch & Delivery PIN</span>
                <span className="font-mono text-[10px] text-slate-400">ID: 140716123456791</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                Your order {'{#var#}'} is out for morning delivery. Share PIN {'{#var#}'} with the delivery executive.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Festival Coupon Announcement</span>
                <span className="font-mono text-[10px] text-slate-400">ID: 140716123456792</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                Celebrate Diwali with pure desi ghee sweets! Use code FESTIVE15 for 15% off orders above ₹999 at vardayini.com.
              </p>
            </div>
          </div>
        </div>

        {/* Low Balance Automated Alerts */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span>🔔</span>
              <span>Low Balance Safeguard Alerts</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Never run out of OTP or order confirmation credits</p>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alert Minimum Credit Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a] w-36"
                />
                <span className="text-xs text-slate-500">remaining SMS credits</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Notify WhatsApp / Mobile Phone
              </label>
              <input
                type="text"
                value={alertPhone}
                onChange={(e) => setAlertPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a]"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="autoAlertCheck"
                checked={autoAlert}
                onChange={(e) => setAutoAlert(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b2f8a] focus:ring-[#0b2f8a]"
              />
              <label htmlFor="autoAlertCheck" className="text-xs text-slate-700 font-medium">
                Send emergency WhatsApp alert when credits drop below threshold
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAlerts}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-sm transition"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Up Ledger History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Wallet Top-Up Ledger & GST Invoices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Historical recharge records and downloadable bills</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs self-start sm:self-auto">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Pack Name</th>
                <th className="py-3 px-4">Credits Added</th>
                <th className="py-3 px-4 font-bold text-slate-900">Amount Paid</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#0b2f8a]">{t.id}</td>
                  <td className="py-3 px-4 text-slate-500">{t.date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{t.packName}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">+{t.credits.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">₹{t.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-600">{t.paymentMethod}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toast.info(`Downloading GST tax invoice ${t.id}`)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#0b2f8a] hover:bg-blue-50 transition"
                    >
                      📄 Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Length & Pagination Footer */}
        <TablePagination
          totalItems={transactions.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemName="recharge invoices"
        />
      </div>
    </div>
  );
}
