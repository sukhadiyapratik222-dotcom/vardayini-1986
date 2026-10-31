import { db } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { OutletsSection } from "@/components/outlets-section";
import { PincodeDeliveryChecker } from "@/components/pincode-delivery-checker";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  await ensureSeeded();
  const rows = await db.select().from(stores);

  return (
    <main className="min-h-screen bg-[#faf6ee]">
      <OutletsSection
        initialStores={rows}
        title="Our Outlets & Stores"
        subtitle="Walk in for dawn-fresh hot jalebi, pure cow ghee sweets, or collect your gift hampers across Gujarat & beyond."
      />

      {/* Online Delivery Pincode Verification */}
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <PincodeDeliveryChecker />
      </div>

      {/* Brand Craftsmanship Heritage Banner */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-xl border border-amber-900/10">
          <img
            src="/images/shop.jpg"
            alt="Vardayini sweet shop counter and kitchen"
            className="h-[380px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-8 sm:p-12 text-white">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Vadodara Craftsmanship · Since 1994
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold mt-1">
              Taste the 30-Year Heritage of Pure Shuddh Desi Ghee
            </h3>
            <p className="text-sm text-white/80 max-w-xl mt-2 leading-relaxed">
              Every day at dawn, our master halwais simmer pure Gir cow milk and hand-craft over 45 varieties of royal Gujarati sweets and crunchy farsan.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
