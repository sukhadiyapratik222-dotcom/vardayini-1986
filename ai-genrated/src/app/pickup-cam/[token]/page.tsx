import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomerTrackingDataByToken } from "@/lib/kitchen-cam";
import { PickupCamClient } from "@/components/pickup-cam-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PickupCamPage({ params }: Props) {
  const { token } = await params;

  if (!token) notFound();

  const data = await getCustomerTrackingDataByToken(token);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#fffdf7] flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200 shadow-xl space-y-4">
          <span className="text-5xl block">🔍</span>
          <h1 className="text-xl font-bold text-[#071c54] font-serif">
            Pickup Cam Link Not Found or Expired
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The private live preparation link for this order is either expired (valid for 30 days) or invalid.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/orders"
              className="w-full py-2.5 rounded-full bg-[#0b2f8a] text-white text-xs font-bold hover:bg-[#071c54] transition shadow-xs"
            >
              View My Orders
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 rounded-full bg-amber-50 text-[#0b2f8a] border border-amber-200 text-xs font-bold hover:bg-amber-100 transition"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PickupCamClient initialData={data} token={token} />;
}
