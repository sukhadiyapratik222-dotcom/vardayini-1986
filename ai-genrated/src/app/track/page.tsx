import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderTrackerClient } from "@/components/order-tracker-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Track Order | Vardayini Sweet Mart",
  description:
    "Track the live status, kitchen crafting, and dispatch progress of your authentic Gujarati sweet & farsan order with your Order ID.",
};

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5] py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Breadcrumbs items={[{ label: "Track Order" }]} />

        <Suspense
          fallback={
            <div className="rounded-3xl border border-[#0b2f8a]/10 bg-white p-12 text-center shadow-sm">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#0b2f8a] border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-[#0b2f8a]">Loading order tracker...</p>
            </div>
          }
        >
          <OrderTrackerClient />
        </Suspense>
      </div>
    </main>
  );
}
