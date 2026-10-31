"use client";

import { useState } from "react";
import { UiConfig, WelcomeOfferConfig, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface WelcomeOfferTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

export function WelcomeOfferTab({ config, onRefresh }: WelcomeOfferTabProps) {
  const currentCfg = config?.welcomeOffer || {};
  const [enabled, setEnabled] = useState(currentCfg.enabled ?? true);
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateUiConfig({
        welcomeOffer: {
          enabled,
          badge,
          title,
          subtitle,
          buttonText,
          couponCode,
          discountPercent: Number(discountPercent),
        },
      });
      toast.success("Welcome Offer banner updated successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update Welcome Offer banner.");
    } finally {
      setSaving(false);
    }
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
            Welcome Offer Banner Management
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6d82] mt-1 max-w-xl">
            Control the high-contrast Welcome Offer popup banner appearing on both the Homepage and New Launches page. Manage coupon codes and copy.
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
            <span>Banner Enabled</span>
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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-[#0b2f8a]/10 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Banner Text &amp; Discount Configuration
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
        <div className="bg-[#faf6ee] rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ba5d49]">
              Live Storefront Preview
            </span>
            <span className="text-[11px] text-slate-500">
              Interactive Card Rendering
            </span>
          </div>

          <div className="py-6 px-4">
            <div className="mx-auto max-w-xl rounded-3xl bg-[#2e1d16] p-6 sm:p-8 text-center text-white shadow-xl border border-[#d97706]/30">
              <span className="inline-block rounded-md bg-[#ba5d49] px-3 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase mb-3">
                {badge}
              </span>

              <h3 className="font-serif text-xl sm:text-2xl font-bold uppercase tracking-wide text-white">
                {title}
              </h3>

              <p className="mt-2 text-xs text-stone-300 leading-relaxed max-w-md mx-auto">
                {subtitle}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Enter Email or Phone Number"
                  disabled
                  className="w-full rounded-full bg-white/10 border border-white/20 px-4 py-2.5 text-xs text-white placeholder-stone-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto rounded-full bg-[#d97706] hover:bg-[#b45309] text-white px-6 py-2.5 text-xs font-bold shrink-0 shadow-md"
                >
                  {buttonText}
                </button>
              </div>

              <p className="mt-3 text-[10px] text-stone-400">
                Code <span className="font-mono font-bold text-[#fef3c7]">{couponCode}</span> gives {discountPercent}% off on checkout.
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
    </div>
  );
}

