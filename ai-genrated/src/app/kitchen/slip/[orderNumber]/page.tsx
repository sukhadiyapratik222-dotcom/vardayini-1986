import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, stores } from "@/db/schema";
import { getOrCreatePickupTrackingToken } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orderNumber: string }>;
}

export default async function KitchenSlipPage({ params }: Props) {
  const { orderNumber } = await params;
  const cleanNum = orderNumber.replace(/^#/, "").trim();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, cleanNum))
    .limit(1);

  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  let store: any = null;
  if (order.pickupStoreId) {
    const [sRow] = await db.select().from(stores).where(eq(stores.id, order.pickupStoreId)).limit(1);
    store = sRow || null;
  }

  const token = await getOrCreatePickupTrackingToken(order.id, order.orderNumber, "pickup");
  const trackingUrl = `https://vardayinisweets.com/pickup-cam/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    trackingUrl
  )}`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center justify-start print:bg-white print:p-0">
      <div className="max-w-md w-full mb-4 flex justify-between items-center print:hidden">
        <a
          href="/kitchen"
          className="text-xs font-bold text-[#0b2f8a] hover:underline"
        >
          ← Back to Kitchen Queue
        </a>
        <button
          type="button"
          // @ts-ignore
          onClick="window.print()"
          className="px-4 py-2 bg-[#0b2f8a] text-white text-xs font-bold rounded-xl shadow-xs"
        >
          🖨️ Print Slip
        </button>
      </div>

      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-400 font-mono text-xs text-slate-900 shadow-md print:shadow-none print:border-black print:rounded-none">
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
          <h2 className="font-sans font-black text-lg tracking-tight uppercase">
            VARDAYINI SWEET MART
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
            KITCHEN PREPARATION &amp; COUNTER SLIP
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Est. 1986 · Kalol, Gujarat</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-3 border-b border-dashed border-slate-400">
          <div>
            <span className="text-[9px] uppercase text-slate-500 block">ORDER NUMBER</span>
            <strong className="text-sm font-sans font-black">#{order.orderNumber}</strong>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase text-slate-500 block">PICKUP OTP</span>
            <strong className="text-base font-sans font-black text-[#0b2f8a]">
              {order.pickupOtp || "N/A"}
            </strong>
          </div>
        </div>

        <div className="py-3 border-b border-dashed border-slate-400 space-y-1">
          <p>
            <strong>Customer:</strong> {order.guestName || "Customer"}
          </p>
          <p>
            <strong>Phone:</strong> {order.guestPhone || "-"}
          </p>
          <p>
            <strong>Pickup Branch:</strong> {store?.name || "Main Counter"}
          </p>
          <p>
            <strong>Slot:</strong> {order.pickupDate || "Today"} ({order.pickupSlot || "Regular"})
          </p>
        </div>

        {/* Itemized Kitchen Prep List */}
        <div className="py-4 border-b-2 border-slate-900">
          <span className="text-[10px] uppercase font-black block mb-2 tracking-wider">
            ITEMS TO WEIGH &amp; PACK:
          </span>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] uppercase">
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Pack</th>
                <th className="py-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it, idx) => (
                <tr key={idx} className="font-bold">
                  <td className="py-1.5 font-sans">{it.productName}</td>
                  <td className="py-1.5 text-right font-sans text-[11px]">{it.variantWeight}</td>
                  <td className="py-1.5 text-right font-mono text-sm">x{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* QR Code linking to Live Customer Cam */}
        <div className="pt-4 flex flex-col items-center text-center space-y-2">
          <img src={qrUrl} alt="QR Code" width={110} height={110} className="border border-slate-300 p-1" />
          <p className="text-[9px] uppercase font-bold text-slate-500">
            Scan to view Live Customer Preparation Timeline
          </p>
          <p className="text-[8px] text-slate-400 break-all">{trackingUrl}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-dashed border-slate-400 text-center text-[9px] text-slate-500">
          <p>Packed by: __________________ Checked by: __________________</p>
        </div>
      </div>
    </div>
  );
}

