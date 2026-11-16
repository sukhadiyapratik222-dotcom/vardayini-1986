import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { WishlistClient, WishlistItem } from "@/components/wishlist-client";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  await ensureSeeded();
  const user = await getAuthUser();
  let items: WishlistItem[] = [];

  if (user) {
    items = await db
      .select({
        id: wishlistItems.id,
        productId: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: products.imageUrl,
      })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, user.id))
      .orderBy(desc(wishlistItems.createdAt));
  }

  return <WishlistClient initialItems={items} isLoggedIn={Boolean(user)} />;
}
