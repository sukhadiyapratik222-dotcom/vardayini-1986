"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

const POLICIES = {
  terms: {
    title: "Terms & Conditions",
    badge: "Customer Agreement",
    content: [
      {
        heading: "1. Authentic Heritage Guarantee",
        text: "All sweets and savouries from Vardayini Sweet Mart are prepared using 100% Shuddh Desi Ghee and traditional recipes dating back to 1976. Products are freshly made and inspected for premium purity before dispatch.",
      },
      {
        heading: "2. Orders & Order Acceptance",
        text: "Orders placed on our website or WhatsApp are subject to acceptance and stock availability. Same-day morning dispatch applies to orders placed before 1:00 PM across Gujarat.",
      },
      {
        heading: "3. Pricing, Coupons & Delivery",
        text: "All prices quoted are in Indian Rupees (INR) and are inclusive of applicable GST. Free delivery is automatically applied on orders above ₹799. Customers can use promotional code FESTIVE15 for 15% off orders above ₹999.",
      },
    ],
  },
  shipping: {
    title: "Shipping & Delivery",
    badge: "Delivery Information",
    content: [
      {
        heading: "1. Free Delivery Threshold",
        text: "We offer Free Delivery across Gujarat on all orders above ₹799. Orders below ₹799 incur a standard delivery charge of ₹49.",
      },
      {
        heading: "2. Same-Day Dispatch",
        text: "Orders placed before 1:00 PM are dispatched the same morning directly from our Vadodara flagship counters to guarantee optimal freshness.",
      },
      {
        heading: "3. Freshness Guarantee",
        text: "All mithai and farsan are hermetically packed in food-grade, tamper-proof boxes ensuring pure shuddh desi ghee taste and crisp texture.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    badge: "Data Protection",
    content: [
      {
        heading: "1. Information We Collect",
        text: "We collect only essential details required to deliver your fresh mithai orders: your name, contact phone number, delivery address, and order preferences.",
      },
      {
        heading: "2. No Third-Party Data Sharing",
        text: "Your personal data is never sold, leased, or distributed to any third party. It is used strictly for order fulfillment, dispatch updates, and customer support.",
      },
      {
        heading: "3. Secure Payments",
        text: "All payment transactions through UPI or Cash on Delivery are encrypted and securely verified.",
      },
    ],
  },
  cancellation: {
    title: "Cancellation Policy",
    badge: "Order Changes",
    content: [
      {
        heading: "1. Fresh Products Window",
        text: "Because our sweets and farsan are made fresh each morning with pure cow ghee and no artificial preservatives, order cancellations can be made within 1 hour of placing the order.",
      },
      {
        heading: "2. How to Cancel",
        text: "To cancel an order, please contact our dispatch desk at +91 98250 19760 or via WhatsApp with your Order ID before the package is handed over to our delivery partners.",
      },
    ],
  },
  returns: {
    title: "Returns Policy",
    badge: "Fresh Food Guidelines",
    content: [
      {
        heading: "1. Perishable Food Items",
        text: "In accordance with FSSAI regulations, perishable food items (fresh mithai, live farsan, dairy-based sweets) cannot be returned once delivered and opened.",
      },
      {
        heading: "2. Transit Damage & Issues",
        text: "If your parcel arrives damaged or with broken packaging, please photograph the package and notify us within 6 hours of delivery for an immediate free replacement or credit voucher.",
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    badge: "Customer Assurance",
    content: [
      {
        heading: "1. Eligible Refunds",
        text: "Refunds are processed promptly for cancelled orders (within policy window) or in the rare event of delivery non-fulfillment.",
      },
      {
        heading: "2. Processing Timeline",
        text: "Prepaid UPI or card refunds are credited directly back to the original source account within 3 to 5 business days.",
      },
    ],
  },
};

type PolicyKey = keyof typeof POLICIES;
const VALID_TABS = Object.keys(POLICIES) as PolicyKey[];

interface DbCmsPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  updatedAt?: string;
}

function PoliciesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as string | null;
  const initialKey = tabParam || "terms";
  const [activeKey, setActiveKey] = useState<string>(initialKey);
  const [dbPages, setDbPages] = useState<DbCmsPage[]>([]);

  useEffect(() => {
    fetch("/api/pages")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.pages)) {
          setDbPages(data.pages);
        }
      })
      .catch(() => { });
  }, []);

  // Check if current tab matches an admin-managed database CMS page
  const matchedDbPage = dbPages.find(
    (p) =>
      p.slug.toLowerCase() === activeKey.toLowerCase() ||
      (activeKey === "terms" && p.slug === "terms") ||
      (activeKey === "privacy" && p.slug === "privacy-policy") ||
      (activeKey === "shipping" && p.slug === "shipping-policy")
  );

  const fallbackPolicy = POLICIES[activeKey as PolicyKey] || POLICIES.terms;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#0b2f8a] font-semibold hover:underline"
        >
          ← Back to Vardayini Sweets
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#182230]">
          Store Policies & Guarantees
        </h1>
        <p className="text-sm text-[#5e6d82] max-w-xl mx-auto">
          Committed to 100% Shuddh Desi Ghee purity, transparent policies, and customer satisfaction since 1976.
        </p>
      </div>

      {/* Policy Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 pb-8 border-b border-[#0b2f8a]/10">
        {VALID_TABS.map((key) => {
          const isSelected = activeKey === key;
          return (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${isSelected
                ? "bg-[#0b2f8a] text-white shadow"
                : "bg-white text-[#182230] border border-[#0b2f8a]/15 hover:bg-slate-50"
                }`}
            >
              {POLICIES[key].title}
            </button>
          );
        })}

        {/* Dynamic Admin-Created Custom Pages */}
        {dbPages
          .filter(
            (p) =>
              p.slug !== "terms" &&
              p.slug !== "privacy-policy" &&
              p.slug !== "shipping-policy"
          )
          .map((p) => {
            const isSelected = activeKey === p.slug;
            return (
              <button
                key={p.id}
                onClick={() => setActiveKey(p.slug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${isSelected
                  ? "bg-[#b45309] text-white shadow"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                  }`}
              >
                {p.title}
              </button>
            );
          })}
      </div>

      {/* Policy Content Body */}
      <div className="mt-8 rounded-3xl bg-white border border-[#0b2f8a]/10 p-6 sm:p-10 shadow-sm space-y-6">
        {matchedDbPage ? (
          <div>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#dfb755]/20 text-[#b89130]">
                Official Store Policy
              </span>
              <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#0b2f8a]">
                {matchedDbPage.title}
              </h2>
            </div>
            <div
              className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: matchedDbPage.content }}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#dfb755]/20 text-[#b89130]">
                {fallbackPolicy.badge}
              </span>
              <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#0b2f8a]">
                {fallbackPolicy.title}
              </h2>
            </div>

            <div className="space-y-6 pt-4">
              {fallbackPolicy.content.map((sec, i) => (
                <div key={i} className="space-y-1.5 pb-4 border-b border-slate-100 last:border-b-0">
                  <h3 className="font-semibold text-[#182230] text-sm">{sec.heading}</h3>
                  <p className="text-xs sm:text-sm text-[#5e6d82] leading-relaxed">{sec.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#fbf3db]/60 border border-[#dfb755]/30">
          <div>
            <p className="text-xs font-bold text-[#b89130]">Need help with an existing order?</p>
            <p className="text-xs text-[#5e6d82]">Our Mandvi & Alkapuri counters are open daily 8:00 AM – 10:30 PM</p>
          </div>
          <Link
            href="/stores"
            className="rounded-full bg-[#0b2f8a] text-white px-4 py-2 text-xs font-bold hover:bg-[#071c54] transition shrink-0"
          >
            Find Our Stores →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading policy details...</div>}>
      <PoliciesContent />
    </Suspense>
  );
}
  );
}
