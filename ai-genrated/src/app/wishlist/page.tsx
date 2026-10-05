import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  await ensureSeeded();
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const items = await db
    .select({
      id: wishlistItems.id,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, user.id))
    .orderBy(desc(wishlistItems.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Saved</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl text-[#6b1d1d]">Wishlist</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={`/shop/${item.slug}`} className="mithai-card overflow-hidden rounded-3xl">
            <div className="relative h-48">
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            </div>
            <p className="p-4 font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">{item.name}</p>
          </Link>
        ))}
      </div>
      {items.length === 0 ? <p className="mt-8 text-sm text-[#2a1a12]/60">Nothing saved yet. Heart a mithai from the shop.</p> : null}
    </main>
  );
}
