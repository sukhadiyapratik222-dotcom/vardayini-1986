import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perishable Sweets Exchange & Return Policy | Vardayini Sweet Mart",
  description:
    "Review our 24-hour exchange and refund policy for perishable sweets and savouries handcrafted fresh in Kalol, Gujarat.",
};

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 pb-20">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-[#dfb755]/20 bg-[#071c54] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs text-[#dfb755] font-semibold tracking-wider uppercase">
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <span>Policies</span>
            <span>/</span>
            <span className="text-white">Exchange &amp; Return Policy</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/50 px-3.5 py-1 text-xs font-bold text-[#dfb755]">
            <span>⏱️ 24-Hour Perishable SLA</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-display)]">
            Fresh Sweets Exchange &amp; Return Policy
          </h1>

          <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
            Our traditional Gujarati mithai and farsan are prepared fresh daily using 100% pure desi cow ghee.
            Because our sweets are perishable culinary products without synthetic preservatives, we enforce strict
            FSSAI food quality and hygiene standards.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-10">
        {/* Core Policy Highlight Card */}
        <div className="rounded-3xl border border-[#dfb755]/30 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#071c54] text-[#dfb755] flex items-center justify-center text-2xl font-black shrink-0 shadow-sm">
              🛡️
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-[#071c54]">
                The 24-Hour Perishable Guarantee
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Customers must file any exchange or return claim <strong>within 24 hours of delivery</strong>.
                Every request requires a valid <strong>Order Number</strong> and <strong>clear photographic proof</strong> of
                the parcel, product, and defective condition.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#dfb755]/20 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold text-base">✓</span>
              <span><strong>Within 24 Hours:</strong> Strictly observed SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold text-base">✓</span>
              <span><strong>Photo Required:</strong> Tamper seal / item condition</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold text-base">✓</span>
              <span><strong>5-7 Working Days:</strong> Direct bank / UPI refund</span>
            </div>
          </div>
        </div>

        {/* Eligible Claims */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#071c54] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Eligible Exchange &amp; Return Scenarios</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-0.5">
              Approved for Replacement or Full Refund
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📦</span>
                <h4 className="font-bold text-slate-900 text-sm">1. Wrong Item Delivered</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If the item in your delivered box does not match your ordered receipt (e.g. received Mohanthal instead of Kesar Kaju Katli).
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💥</span>
                <h4 className="font-bold text-slate-900 text-sm">2. Damaged Packaging / Broken Seal</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If the delivery box is crushed, perforated, soiled in transit, or the tamper-evident ghee hygiene seal was broken prior to opening.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚠️</span>
                <h4 className="font-bold text-slate-900 text-sm">3. Spoiled Product / Quality Defect</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If the product demonstrates an uncharacteristic odor, discoloration, texture defect, or spoilage detected immediately upon delivery.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🔍</span>
                <h4 className="font-bold text-slate-900 text-sm">4. Missing Item(s) in Parcel</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an item invoiced in your parcel packing slip is omitted from your delivered package.
              </p>
            </div>
          </div>
        </div>

        {/* Ineligible Scenarios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#071c54] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Ineligible Situations (Non-Refundable)</span>
            </h3>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-0.5">
              Strict Food Safety Rules
            </span>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50/40 p-6 space-y-3">
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold shrink-0">✕</span>
                <span><strong>Change of mind:</strong> Sweets cannot be returned simply because a customer changed their mind after delivery.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold shrink-0">✕</span>
                <span><strong>Opened or consumed items:</strong> Packages that have been opened, eaten, or handled beyond standard initial inspection are not eligible.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold shrink-0">✕</span>
                <span><strong>Incorrect address or unavailability:</strong> Delays, spoilage, or failed delivery resulting from incorrect address or unreachability of the recipient are not covered.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold shrink-0">✕</span>
                <span><strong>Claims past 24 hours:</strong> Any notice received after 24 hours of marked delivery cannot be accepted due to perishable shelf life.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Claim Procedure */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-[#071c54]">
            How to File a Return or Exchange Claim
          </h3>

          <ol className="space-y-4 text-xs sm:text-sm text-slate-700 list-decimal list-inside">
            <li className="pl-2 leading-relaxed">
              <strong>Check Delivery Timestamp:</strong> Ensure your order was delivered within the last 24 hours.
            </li>
            <li className="pl-2 leading-relaxed">
              <strong>Take Clear Photos:</strong> Capture the parcel shipping label, the box condition, and the affected sweet/farsan item.
            </li>
            <li className="pl-2 leading-relaxed">
              <strong>Open Order Tracker:</strong> Visit our <Link href="/track" className="text-[#071c54] font-bold underline hover:text-[#dfb755]">Track Order</Link> page and locate your order.
            </li>
            <li className="pl-2 leading-relaxed">
              <strong>Submit Request:</strong> Select the reason dropdown, explain what occurred, and upload your photo (Max 5MB).
            </li>
            <li className="pl-2 leading-relaxed">
              <strong>Quality Review &amp; Resolution:</strong> Our Kalol counter team reviews your request within 12–24 hours.
              Once approved, refunds are credited back to your original source account within <strong>5–7 working days</strong>, or a fresh replacement is expedited.
            </li>
          </ol>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800">Have an order delivered today?</p>
              <p className="text-[11px] text-slate-500">Track and submit your request in seconds.</p>
            </div>
            <Link
              href="/track"
              className="rounded-xl bg-[#071c54] hover:bg-[#05143b] text-[#dfb755] px-6 py-2.5 text-xs font-bold transition shadow-sm"
            >
              Go to Track &amp; Claim →
            </Link>
          </div>
        </div>

        {/* Need Help Footer */}
        <div className="rounded-2xl border border-[#dfb755]/40 bg-[#dfb755]/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-bold text-[#071c54]">Questions regarding an active return claim?</p>
            <p className="text-slate-600 mt-0.5">
              Contact our Kalol Flagship Counter Support Desk at <strong>+91 63521 19329</strong> (8:00 AM – 8:30 PM).
            </p>
          </div>
          <a
            href="https://wa.me/916352119329?text=Namaste%2C%20I%20have%20a%20question%20about%20the%20Sweets%20Exchange%20%26%20Return%20Policy."
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs transition shrink-0"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
