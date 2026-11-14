"use client";

import { useState, useEffect } from "react";
import { UiConfig, WelcomeOfferConfig, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface WelcomeOfferTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

interface WelcomeLead {
  id: number;
  contact: string;
  contact_type: string;
  coupon_code: string;
  discount_percent: number;
  marketing_consent: number;
  source_url: string;
  status: string;
  claimed_at: string;
}

export function WelcomeOfferTab({ config, onRefresh }: WelcomeOfferTabProps) {
  const currentCfg = config?.welcomeOffer || {};
  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
  const [delaySeconds, setDelaySeconds] = useState<number>(currentCfg.delaySeconds ?? 300);
  const [cooldownDays, setCooldownDays] = useState<number>(currentCfg.cooldownDays ?? 7);
  const [exitIntent, setExitIntent] = useState<boolean>(currentCfg.exitIntent ?? false);
  const [badge, setBadge] = useState(currentCfg.badge || "WELCOME OFFER");
  const [title, setTitle] = useState(currentCfg.title || "FLAT 10% OFF ON YOUR FIRST ORDER");
  const [subtitle, setSubtitle] = useState(
    currentCfg.subtitle ||
    "Sign up now with your email or phone number to receive your exclusive discount code instantly!"
  );
  const [buttonText, setButtonText] = useState(currentCfg.buttonText || "Get Code");
  const [couponCode, setCouponCode] = useState(currentCfg.couponCode || "FIRST10");
  const [discountPercent, setDiscountPercent] = useState<number>(currentCfg.discountPercent ?? 10);

  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<WelcomeLead[]>([]);
  const [leadStats, setLeadStats] = useState({ totalLeads: 0, emailLeads: 0, phoneLeads: 0 });
  const [loadingLeads, setLoadingLeads] = useState(false);

  useEffect(() => {
    async function fetchLeads() {
      setLoadingLeads(true);
      try {
        const res = await fetch("/api/admin/welcome-offer/leads");
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setLeads(data.leads || []);
            setLeadStats(data.stats || { totalLeads: 0, emailLeads: 0, phoneLeads: 0 });
          }
        }
      } catch {}
      setLoadingLeads(false);
    }
    fetchLeads();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateUiConfig({
        welcomeOffer: {
          enabled,
          delaySeconds: Number(delaySeconds),
          cooldownDays: Number(cooldownDays),
          exitIntent,
          badge,
          title,
          subtitle,
          buttonText,
          couponCode,
          discountPercent: Number(discountPercent),
        },
      });
      toast.success("Welcome Offer popup settings updated successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update Welcome Offer popup.");
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    window.open("/api/admin/welcome-offer/leads?format=csv", "_blank");
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#ba5d49]/15 text-[#ba5d49] text-xs font-bold uppercase tracking-wider">
            Lead Capture &amp; First Order Discount
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            Welcome Offer 5-Minute Popup Modal
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6d82] mt-1 max-w-xl">
            Timed popup ad triggered after 5 minutes (300s) of active engagement. Fully configurable copy, discount codes, 7-day cooldown, and collected customer leads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded text-[#ba5d49] focus:ring-0 w-4 h-4"
            />
            <span>Popup Enabled</span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold rounded-xl px-5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claimed Leads</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{leadStats.totalLeads}</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">✓ First order discount coupons</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Subscribers</span>
          <p className="text-2xl font-black text-[#6b1d1d] mt-1">{leadStats.phoneLeads}</p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">WhatsApp / SMS opted-in</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Subscribers</span>
          <p className="text-2xl font-black text-[#0b2f8a] mt-1">{leadStats.emailLeads}</p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Newsletter &amp; offers opted-in</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Timing & Trigger Controls */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Timing, Trigger &amp; Frequency Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Active Delay (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={3600}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
                placeholder="300"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Default: 300s (5 minutes active time)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dismissal Cooldown (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={cooldownDays}
                onChange={(e) => setCooldownDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
                placeholder="7"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Do not show again for X days after closing
              </span>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={exitIntent}
                  onChange={(e) => setExitIntent(e.target.checked)}
                  className="rounded text-[#ba5d49] focus:ring-0 w-4 h-4"
                />
                <span>Desktop Exit-Intent Trigger</span>
              </label>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Show if user moves mouse to exit tab
              </span>
            </div>
          </div>
        </div>

        {/* Content & Copy Controls */}
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Popup Text &amp; Discount Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Top Pill Badge
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
                placeholder="e.g. WELCOME OFFER"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Headline Title (Display Font)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
                placeholder="e.g. FLAT 10% OFF ON YOUR FIRST ORDER"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtitle Description
              </label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
                placeholder="Sign up now with your email or phone number to receive your exclusive discount code instantly!"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coupon Code
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-[#ba5d49] focus:outline-none focus:border-[#ba5d49]"
                placeholder="e.g. FIRST10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Button Label
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#ba5d49]"
                placeholder="e.g. Get Code"
              />
            </div>
          </div>
        </div>

        {/* Live Visual Preview */}
        <div className="bg-[#1e1411] rounded-3xl p-6 sm:p-8 border border-amber-900/40 space-y-4">
          <div className="flex items-center justify-between border-b border-amber-900/50 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#caa055]">
              Live Storefront Popup Preview
            </span>
            <span className="text-[11px] text-amber-200/60 font-mono">
              Test mode: ?popup=now
            </span>
          </div>

          <div className="py-6 px-4">
            <div className="mx-auto max-w-lg rounded-[28px] bg-gradient-to-br from-[#2d1810] via-[#22120b] to-[#1a0c07] p-6 sm:p-8 text-center text-white shadow-2xl border-2 border-[#caa055] relative overflow-hidden">
              {/* Fake X button */}
              <div className="absolute top-4 right-4 h-7 w-7 rounded-full bg-white/10 border border-[#caa055]/30 flex items-center justify-center text-[#caa055] text-xs">
                ✕
              </div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="inline-block rounded-xs bg-[#d96b52] px-3 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                  {badge}
                </span>
                <span className="inline-block rounded-full bg-[#caa055]/20 border border-[#caa055]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#f5dfa8] font-mono">
                  Offer ends in 10:00
                </span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
                {title}
              </h3>

              <p className="mt-2 text-xs text-[#f3e7dc] leading-relaxed max-w-md mx-auto">
                {subtitle}
              </p>

              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Enter Email or Phone Number"
                  disabled
                  className="w-full rounded-full bg-[#3e241b] border border-[#caa055]/40 px-4 py-2.5 text-xs text-white placeholder-[#c5b2a6]"
                />
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto rounded-full bg-[#c9a600] text-white px-6 py-2.5 text-xs font-bold shrink-0 shadow-[0_0_20px_rgba(201,166,0,0.5)]"
                >
                  {buttonText}
                </button>
              </div>

              <p className="mt-3 text-[10px] text-[#b8a295]">
                By continuing you agree to receive offers. You can unsubscribe anytime.
              </p>

              <p className="mt-1 text-[11px] text-[#d6c5bc]/70 underline">
                No thanks, maybe later
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold rounded-xl px-8 py-3 text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Welcome Offer Changes"}
          </button>
        </div>
      </form>

      {/* Customer Leads Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0b2f8a]/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Collected Customer Leads ({leads.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified phone numbers and email addresses of visitors who unlocked the first-order coupon.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={leads.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>📥</span>
            <span>Export Leads to CSV</span>
          </button>
        </div>

        {loadingLeads ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No customer leads collected yet. Leads will appear here once visitors submit their contact on the popup.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Coupon Code</th>
                  <th className="py-2.5 px-3">Discount</th>
                  <th className="py-2.5 px-3">Claimed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{l.contact}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.contact_type === "phone"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {l.contact_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#ba5d49]">{l.coupon_code}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-700">{l.discount_percent}% OFF</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(l.claimed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
