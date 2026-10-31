"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { api, FullOrderDetail, UiConfig } from "@/lib/api";
import {
  DEFAULT_SELLER,
  formatDateTime,
  formatInr,
  numberToIndianWords,
} from "@/lib/invoice-utils";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default function OrderInvoicePage({ params }: PageProps) {
  const { orderNumber } = use(params);

  const [order, setOrder] = useState<FullOrderDetail | null>(null);
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [orderData, configData] = await Promise.all([
          api.getOrder(orderNumber).catch((err) => {
            console.warn("Failed to load order for invoice:", err);
            return null;
          }),
          api.getUiConfig().catch(() => null),
        ]);

        if (!orderData) {
          setError(`Order #${orderNumber} could not be found or loaded.`);
          return;
        }

        setOrder(orderData);
        if (configData) setConfig(configData);
      } catch (err: any) {
        setError(err.message || "Failed to load tax invoice.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0b2f8a] border-t-transparent mb-4" />
        <h2 className="text-base font-bold text-[#0b2f8a]">Preparing Official GST Tax Invoice...</h2>
        <p className="text-xs text-slate-500 mt-1">Retrieving order details and calculating tax components</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 text-center shadow-lg">
          <span className="text-4xl block mb-3">⚠️</span>
          <h2 className="text-lg font-bold text-rose-700 mb-2">Invoice Not Available</h2>
          <p className="text-xs text-slate-600 mb-6">{error || "Could not retrieve order details."}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="w-full py-2.5 px-4 bg-[#0b2f8a] hover:bg-[#09256e] text-white rounded-xl text-xs font-bold transition"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  // Seller details from config or defaults
  const seller = {
    ...DEFAULT_SELLER,
    tradeName: config?.storeInfo?.name || DEFAULT_SELLER.tradeName,
    tagline: config?.storeInfo?.tagline || DEFAULT_SELLER.tagline,
    address: config?.storeInfo?.address || DEFAULT_SELLER.address,
    phone: config?.storeInfo?.phone || DEFAULT_SELLER.phone,
    email: config?.storeInfo?.email || DEFAULT_SELLER.email,
    logoUrl: config?.logo?.imageUrl || DEFAULT_SELLER.logoUrl,
  };

  // Buyer details from order
  const buyerName =
    order.customerName ||
    order.user?.name ||
    order.userName ||
    order.guestName ||
    order.parsedAddress?.name ||
    order.parsedAddress?.fullName ||
    "Valued Customer";

  const buyerPhone =
    order.customerPhone ||
    order.user?.phone ||
    order.userPhone ||
    order.guestPhone ||
    order.parsedAddress?.phone ||
    "-";

  const buyerAddress = order.parsedAddress
    ? [
        order.parsedAddress.line1,
        order.parsedAddress.line2,
        order.parsedAddress.landmark,
        order.parsedAddress.city,
        order.parsedAddress.state || "Gujarat",
        order.parsedAddress.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    : order.addressSnapshot || "Vadodara, Gujarat";

  const buyerState = order.parsedAddress?.state || "Gujarat";
  const buyerStateCode = order.parsedAddress?.stateCode || "24";
  const isInterState = buyerStateCode !== "24";

  // Items with tax calculation
  const items = order.items && order.items.length > 0 ? order.items : [];
  const taxableSubtotal = items.reduce((sum, item) => {
    const itemTotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
    // 5% GST inclusive: taxable = total / 1.05
    return sum + itemTotal / 1.05;
  }, 0);

  const totalGst = items.reduce((sum, item) => {
    const itemTotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
    return sum + (itemTotal - itemTotal / 1.05);
  }, 0);

  const cgstAmount = isInterState ? 0 : totalGst / 2;
  const sgstAmount = isInterState ? 0 : totalGst / 2;
  const igstAmount = isInterState ? totalGst : 0;

  const grandTotal = Number(order.total || 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const discount = Number(order.discount || 0);

  const invoiceNumber =
    order.invoice?.invoiceNumber ||
    `INV-2026-${String(order.id).padStart(5, "0")}`;

  const invoiceDate = order.invoice?.invoiceDate || order.createdAt;

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-3 sm:px-6 print:bg-white print:p-0">
      {/* Top Controls Bar - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-4 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧾</span>
          <div>
            <h1 className="text-sm font-bold text-[#0b2f8a]">Tax Invoice • {invoiceNumber}</h1>
            <p className="text-[11px] text-slate-500">Order #{order.orderNumber} • {order.fulfillmentType === "pickup" ? "Store Pickup" : "Home Delivery"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0b2f8a] hover:bg-[#09256e] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <span>🖨️</span>
            <span>Print / Save PDF</span>
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet (A4 Layout) */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-0 print:m-0 text-slate-800 font-sans text-xs">
        {/* Header Section: Logo & Company Information */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-[#0b2f8a] gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/50 p-1">
              <Image
                src={seller.logoUrl}
                alt={seller.tradeName}
                width={80}
                height={80}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#0b2f8a] font-serif">
                {seller.tradeName}
              </h2>
              <p className="text-[11px] font-bold text-amber-800 tracking-wide uppercase">
                {seller.tagline}
              </p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-sm leading-relaxed">
                {seller.address}
              </p>
              <p className="text-[11px] text-slate-600">
                <strong>Tel:</strong> {seller.phone} • <strong>Email:</strong> {seller.email}
              </p>
            </div>
          </div>

          <div className="sm:text-right flex flex-col items-start sm:items-end">
            <span className="inline-block px-3 py-1 bg-[#0b2f8a] text-white font-black text-sm tracking-wider rounded-lg uppercase">
              Tax Invoice
            </span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
              Original For Recipient
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Sec. 31 of CGST Act, 2017
            </span>

            <div className="mt-2 text-[11px] space-y-0.5">
              <p>
                <strong className="text-slate-900">GSTIN:</strong>{" "}
                <span className="font-mono font-bold text-[#0b2f8a]">{seller.gstin}</span>
              </p>
              <p>
                <strong className="text-slate-900">FSSAI Lic. No:</strong>{" "}
                <span className="font-mono font-bold text-emerald-800">{seller.fssaiNumber}</span>
              </p>
              <p>
                <strong className="text-slate-900">State / Code:</strong> {seller.state} (24)
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Metadata Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-200 bg-slate-50/70 -mx-8 sm:-mx-10 px-8 sm:px-10">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Number</span>
            <span className="font-mono font-black text-sm text-[#0b2f8a]">{invoiceNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Date</span>
            <span className="font-semibold text-slate-800">{formatDateTime(invoiceDate)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Order Number</span>
            <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Place of Supply</span>
            <span className="font-bold text-slate-800">
              {buyerState} ({buyerStateCode})
            </span>
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200">
          <div>
            <h3 className="text-xs font-black uppercase text-[#0b2f8a] tracking-wider mb-2 flex items-center gap-1.5">
              <span>👤</span>
              <span>Billed To &amp; Recipient Details</span>
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
              <p className="text-sm font-bold text-slate-900">{buyerName}</p>
              <p className="text-xs font-mono text-slate-700">📱 +91 {buyerPhone}</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                📍 {buyerAddress}
              </p>
              <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">State: <strong>{buyerState} ({buyerStateCode})</strong></span>
                <span className="text-slate-500">GSTIN: <strong>Unregistered (Consumer)</strong></span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase text-[#0b2f8a] tracking-wider mb-2 flex items-center gap-1.5">
              <span>🚚</span>
              <span>Fulfillment &amp; Dispatch Details</span>
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Fulfillment Mode:</span>
                <span className="font-bold text-slate-900 uppercase">
                  {order.fulfillmentType === "pickup" ? "🏪 Store Pickup" : "🚚 Home Delivery"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery / Pickup Slot:</span>
                <span className="font-semibold text-slate-800">
                  {order.pickupSlot ? `${order.pickupDate || ""} • ${order.pickupSlot}` : (order.deliverySlot || "Standard Dispatch")}
                </span>
              </div>
              {order.courierName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Courier Partner:</span>
                  <span className="font-semibold text-slate-800">{order.courierName}</span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tracking (AWB):</span>
                  <span className="font-mono font-bold text-[#0b2f8a]">{order.trackingNumber}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Reverse Charge: <strong>No</strong></span>
                <span className="text-slate-500">Dispatch Hub: <strong>Vadodara Central</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* GST Itemized Product Table */}
        <div className="py-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0b2f8a] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3 rounded-l-xl">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 font-mono">HSN Code</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-right">Taxable Val</th>
                {!isInterState ? (
                  <>
                    <th className="py-2.5 px-3 text-right">CGST (2.5%)</th>
                    <th className="py-2.5 px-3 text-right">SGST (2.5%)</th>
                  </>
                ) : (
                  <th className="py-2.5 px-3 text-right">IGST (5%)</th>
                )}
                <th className="py-2.5 px-3 text-right rounded-r-xl">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {items.map((it, idx) => {
                const itemTotal = Number(it.unitPrice || 0) * Number(it.quantity || 1);
                const taxable = itemTotal / 1.05;
                const gst = itemTotal - taxable;
                const halfGst = gst / 2;

                return (
                  <tr key={it.id || idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{it.productName}</p>
                      <p className="text-[10px] text-slate-500">Pack: {it.variantWeight}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      {it.hsnCode || "21069099"}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{it.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ₹{Number(it.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      ₹{taxable.toFixed(2)}
                    </td>
                    {!isInterState ? (
                      <>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          ₹{halfGst.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          ₹{halfGst.toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ₹{gst.toFixed(2)}
                      </td>
                    )}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{itemTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary & Totals Calculation Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 pb-6 border-t-2 border-slate-200">
          {/* Left Column: Bank Details, Terms, and Amount in Words */}
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
              <span className="text-[10px] uppercase font-black text-amber-900 block mb-1">
                Amount Chargeable in Words:
              </span>
              <p className="font-serif italic font-bold text-slate-900 text-sm">
                {numberToIndianWords(grandTotal)}
              </p>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Payment Mode &amp; Settlement:
              </p>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono font-bold uppercase text-slate-800 text-[11px] border border-slate-300">
                  {order.paymentMethod || "UPI / Counter"}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[11px] border ${
                    order.paymentStatus === "paid" || order.paymentStatus === "completed"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  Status: {order.paymentStatus?.toUpperCase() || "PENDING"}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 space-y-1 pt-2 border-t border-slate-200">
              <p className="font-bold text-slate-700">Terms &amp; Conditions:</p>
              <p>1. Fresh handmade sweets &amp; namkeen are perishable food articles; not returnable.</p>
              <p>2. Keep refrigerated below 8°C. Best consumed within 5 days of delivery date.</p>
              <p>3. Disputes subject to Vadodara jurisdiction only.</p>
            </div>
          </div>

          {/* Right Column: Financial Breakup */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value (Goods):</span>
              <span className="font-mono font-medium">₹{taxableSubtotal.toFixed(2)}</span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Central GST (CGST @ 2.5%):</span>
                  <span className="font-mono font-medium">₹{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>State GST (SGST @ 2.5%):</span>
                  <span className="font-mono font-medium">₹{sgstAmount.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>Integrated GST (IGST @ 5%):</span>
                <span className="font-mono font-medium">₹{igstAmount.toFixed(2)}</span>
              </div>
            )}

            {deliveryFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery &amp; Logistics:</span>
                <span className="font-mono font-medium">₹{deliveryFee.toFixed(2)}</span>
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Festive Discount / Coupon:</span>
                <span className="font-mono">-₹{discount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2.5 mt-2 border-t-2 border-[#0b2f8a] flex justify-between items-center text-slate-900 font-bold">
              <span className="text-sm font-black uppercase text-[#0b2f8a]">Grand Total:</span>
              <span className="font-mono text-xl font-black text-[#0b2f8a]">
                {formatInr(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Signature & Seal Section */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-[11px]">
          <div className="text-center sm:text-left text-slate-500">
            <p className="font-bold text-slate-700">Thank you for celebrating with Vardayini Sweet Mart!</p>
            <p>Certified FSSAI 10719024000123 • Made with 100% Pure Desi Ghee</p>
            <p className="text-[10px] text-slate-400 mt-1">This is a system generated tax invoice under Indian Information Technology Act, 2000.</p>
          </div>

          <div className="text-center sm:text-right shrink-0">
            <p className="font-bold text-slate-800 uppercase text-[10px] mb-8">
              For VARDAYINI SWEETS &amp; NAMKEEN PVT. LTD.
            </p>
            <div className="border-t border-slate-400 pt-1 inline-block min-w-[180px]">
              <span className="font-semibold text-slate-700 block">Authorized Signatory</span>
              <span className="text-[10px] text-slate-400 block font-serif italic">Accounts &amp; Billing Dept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

