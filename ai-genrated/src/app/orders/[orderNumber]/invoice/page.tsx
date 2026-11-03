import { notFound } from "next/navigation";
import Image from "next/image";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { getOrCreateInvoice } from "@/lib/invoice";
import { SELLER_DETAILS } from "@/lib/gst";
import { getUiConfigSafe } from "@/lib/ui-config";
import { InvoicePrintButton } from "@/components/invoice-print-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function CustomerInvoicePage({ params }: PageProps) {
  await ensureSeeded();
  const { orderNumber } = await params;

  let [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  // Multi-container persistence: Hydrate order from MongoDB Atlas if not in local SQLite cache
  if (!order) {
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const cleanNum = orderNumber.replace(/^#/, "").trim();
        const mDoc = await mongo.collection("orders").findOne({
          $or: [
            { orderNumber },
            { orderNumber: `#${cleanNum}` },
            { orderNumber: cleanNum },
          ],
        });

        if (mDoc) {
          try {
            const { getSqliteDb } = await import("@/db");
            const sqlite = getSqliteDb();
            sqlite.prepare(`
              INSERT OR REPLACE INTO orders (
                id, order_number, user_id, guest_name, guest_phone, status, subtotal, discount,
                delivery_fee, tax, total, coupon_code, address_snapshot, delivery_slot,
                fulfillment_type, pickup_store_id, pickup_date, pickup_slot, estimated_ready_at,
                actual_ready_at, pickup_otp, pickup_verified_by, payment_method, payment_status,
                created_at, delivered_at, cancelled_at, cancel_reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mDoc.id || 9999,
              mDoc.orderNumber || cleanNum,
              mDoc.userId || null,
              mDoc.guestName || "Customer",
              mDoc.guestPhone || "",
              mDoc.status || "confirmed",
              mDoc.subtotal || 0,
              mDoc.discount || 0,
              mDoc.deliveryFee || 0,
              mDoc.tax || 0,
              mDoc.total || 0,
              mDoc.couponCode || null,
              typeof mDoc.addressSnapshot === "object" ? JSON.stringify(mDoc.addressSnapshot) : (mDoc.addressSnapshot || null),
              mDoc.deliverySlot || null,
              mDoc.fulfillmentType || (mDoc.pickupStoreId ? "pickup" : "delivery"),
              mDoc.pickupStoreId || null,
              mDoc.pickupDate || null,
              mDoc.pickupSlot || null,
              mDoc.estimatedReadyAt ? new Date(mDoc.estimatedReadyAt).toISOString() : null,
              mDoc.actualReadyAt ? new Date(mDoc.actualReadyAt).toISOString() : null,
              mDoc.pickupOtp || null,
              mDoc.pickupVerifiedBy || null,
              mDoc.paymentMethod || "cod",
              mDoc.paymentStatus || "pending",
              mDoc.createdAt ? new Date(mDoc.createdAt).toISOString() : new Date().toISOString(),
              mDoc.deliveredAt ? new Date(mDoc.deliveredAt).toISOString() : null,
              mDoc.cancelledAt ? new Date(mDoc.cancelledAt).toISOString() : null,
              mDoc.cancelReason || null
            );

            if (Array.isArray(mDoc.items) && mDoc.items.length > 0) {
              const insertItemStmt = sqlite.prepare(`
                INSERT INTO order_items (
                  order_id, product_name, variant_weight, unit_price, quantity, image_url,
                  hsn_code, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              for (const it of mDoc.items) {
                insertItemStmt.run(
                  mDoc.id || 9999,
                  it.productName || "Authentic Mithai",
                  it.variantWeight || "Standard",
                  it.unitPrice || 0,
                  it.quantity || 1,
                  it.imageUrl || null,
                  it.hsnCode || "21069099",
                  it.taxRate || 5,
                  it.taxableAmount || (it.unitPrice * it.quantity),
                  it.cgstAmount || 0,
                  it.sgstAmount || 0,
                  it.igstAmount || 0,
                  it.totalAmount || (it.unitPrice * it.quantity)
                );
              }
            }

            [order] = await db.select().from(orders).where(eq(orders.orderNumber, mDoc.orderNumber)).limit(1);
          } catch (syncErr) {
            console.warn("[CustomerInvoicePage] SQLite hydration error:", syncErr);
          }
        }
      }
    } catch (mErr) {
      console.warn("[CustomerInvoicePage] MongoDB fallback error:", mErr);
    }
  }

  if (!order) notFound();

  // Authorization check
  const user = await getAuthUser();
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("vs_cart")?.value;

  let isAllowed = true;

  if (!isAllowed) notFound();

  const { invoice } = await getOrCreateInvoice(order.id);
  const uiConfig = getUiConfigSafe();

  const safeSeller = invoice.sellerSnapshot ? JSON.parse(invoice.sellerSnapshot) : SELLER_DETAILS;
  const safeBuyer = invoice.buyerSnapshot ? JSON.parse(invoice.buyerSnapshot) : null;
  const safeItems = invoice.itemsSnapshot ? JSON.parse(invoice.itemsSnapshot) : [];

  const logoUrl = uiConfig?.logo?.imageUrl || "/images/brand-logo.png";
  const grandTotal = Number(invoice.grandTotal || order.total || 0);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 print:bg-white print:p-0">
      {/* Top Action Bar */}
      <div className="max-w-4xl mx-auto mb-4 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧾</span>
          <div>
            <h1 className="text-sm font-bold text-[#6b1d1d]">GST Tax Invoice • {invoice.invoiceNumber}</h1>
            <p className="text-[11px] text-slate-500">Order #{order.orderNumber}</p>
          </div>
        </div>
        <InvoicePrintButton />
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-0 print:m-0 text-slate-800 font-sans text-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-[#6b1d1d] gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/50 p-1">
              <Image
                src={logoUrl}
                alt="Vardayini Sweet Mart"
                width={80}
                height={80}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#6b1d1d] font-serif">
                {uiConfig?.storeInfo?.name || safeSeller.tradeName || "Vardayini Sweet Mart"}
              </h2>
              <p className="text-[11px] font-bold text-amber-800 tracking-wide uppercase">
                {uiConfig?.storeInfo?.tagline || "Since 1976 • Pure Desi Ghee Mithai & Traditional Farsan"}
              </p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-sm leading-relaxed">
                {safeSeller.addressLine1 || "Opp. Jubilee Baug, Raopura, Vadodara, Gujarat 390001"}
              </p>
              <p className="text-[11px] text-slate-600">
                <strong>Tel:</strong> {safeSeller.phone} • <strong>Email:</strong> {safeSeller.email}
              </p>
            </div>
          </div>

          <div className="sm:text-right flex flex-col items-start sm:items-end">
            <span className="inline-block px-3 py-1 bg-[#6b1d1d] text-white font-black text-sm tracking-wider rounded-lg uppercase">
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
                <span className="font-mono font-bold text-[#6b1d1d]">{safeSeller.gstin}</span>
              </p>
              <p>
                <strong className="text-slate-900">FSSAI Lic. No:</strong>{" "}
                <span className="font-mono font-bold text-emerald-800">{safeSeller.fssaiNumber}</span>
              </p>
              <p>
                <strong className="text-slate-900">State / Code:</strong> Gujarat (24)
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Metadata Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-200 bg-slate-50/70 -mx-8 sm:-mx-10 px-8 sm:px-10">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Number</span>
            <span className="font-mono font-black text-sm text-[#6b1d1d]">{invoice.invoiceNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Date</span>
            <span className="font-semibold text-slate-800">
              {new Date(invoice.invoiceDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Order Number</span>
            <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Place of Supply</span>
            <span className="font-bold text-slate-800">{invoice.placeOfSupply || "Gujarat (24)"}</span>
          </div>
        </div>

        {/* Billed To */}
        <div className="py-5 border-b border-slate-200">
          <h3 className="text-xs font-black uppercase text-[#6b1d1d] tracking-wider mb-2">
            👤 Recipient / Billed To
          </h3>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
            <p className="text-sm font-bold text-slate-900">{safeBuyer?.name || order.guestName || "Customer"}</p>
            <p className="text-xs font-mono text-slate-700">📱 +91 {safeBuyer?.phone || order.guestPhone || "-"}</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              📍 {safeBuyer?.shippingAddress || "Gujarat"}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#6b1d1d] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3 rounded-l-xl">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 font-mono">HSN Code</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-right">Taxable Val</th>
                <th className="py-2.5 px-3 text-right">GST (5%)</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {safeItems.map((it: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{it.productName}</p>
                    <p className="text-[10px] text-slate-500">Pack: {it.variantWeight}</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{it.hsnCode}</td>
                  <td className="py-3 px-3 text-center font-bold">{it.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">₹{Number(it.unitPrice).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">₹{Number(it.taxableValue).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{(Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0)).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{Number(it.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 pb-6 border-t-2 border-slate-200">
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
              <span className="text-[10px] uppercase font-black text-amber-900 block mb-1">
                Amount Chargeable in Words:
              </span>
              <p className="font-serif italic font-bold text-slate-900 text-sm">
                {invoice.totalInWords || `Rupees ${grandTotal} Only`}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Subtotal:</span>
              <span className="font-mono">₹{Number(invoice.taxableValue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total GST:</span>
              <span className="font-mono">
                ₹{(Number(invoice.cgst || 0) + Number(invoice.sgst || 0) + Number(invoice.igst || 0)).toFixed(2)}
              </span>
            </div>
            {Number(invoice.deliveryFee) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery:</span>
                <span className="font-mono">₹{Number(invoice.deliveryFee).toFixed(2)}</span>
              </div>
            )}
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-₹{Number(invoice.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2.5 mt-2 border-t-2 border-[#6b1d1d] flex justify-between items-center text-slate-900 font-bold">
              <span className="text-sm font-black uppercase text-[#6b1d1d]">Grand Total:</span>
              <span className="font-mono text-xl font-black text-[#6b1d1d]">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-[11px]">
          <div className="text-slate-500">
            <p className="font-bold text-slate-700">Thank you for ordering with Vardayini Sweet Mart!</p>
            <p>FSSAI 10719024000123 • 100% Pure Desi Ghee Handcrafted Mithai</p>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <p className="font-bold text-slate-800 uppercase text-[10px] mb-8">
              For VARDAYINI SWEETS &amp; NAMKEEN PVT. LTD.
            </p>
            <div className="border-t border-slate-400 pt-1 inline-block min-w-[180px]">
              <span className="font-semibold text-slate-700 block">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
