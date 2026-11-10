import { CartClient } from "@/components/cart-client";
import { loadCartLines } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  let cart;
  try {
    cart = await loadCartLines();
  } catch (err) {
    console.error("[CartPage] loadCartLines error:", err);
    cart = {
      lines: [],
      totals: { subtotal: 0, discount: 0, tax: 0, deliveryFee: 0, total: 0 },
      couponCode: null,
      couponLabel: null,
      user: null,
    };
  }

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Your box</p>
      <h1 className="mt-1 sm:mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-5xl text-[#6b1d1d] font-bold">Cart</h1>
      <CartClient initial={cart} />
    </main>
  );
}
