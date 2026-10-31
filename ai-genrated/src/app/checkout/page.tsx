import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { loadCartLines } from "@/lib/cart";
import { formatInr } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await loadCartLines();

  // If user is not logged in, show login page first with return path to checkout
  if (!cart.user) {
    redirect("/login?redirect=/checkout");
  }

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#6b1d1d]">Nothing to checkout</h1>
        <Link href="/shop" className="btn-primary mt-6 inline-block rounded-full px-6 py-3 text-sm">
          Shop mithai
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 sm:gap-8 px-3 sm:px-4 py-6 sm:py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Checkout</p>
        <h1 className="mt-1 sm:mt-2 font-[family-name:var(--font-display)] text-xl sm:text-4xl text-[#6b1d1d] font-bold">Where should it arrive?</h1>
        <CheckoutForm defaultName={cart.user?.name || ""} defaultPhone={cart.user?.phone || ""} />
      </section>
      <aside className="mithai-card h-fit rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#6b1d1d]">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span>
                {line.name} · {line.weight} × {line.quantity}
              </span>
              <span>{formatInr(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-[#6b1d1d]/10 pt-3 font-semibold">
          <span>Total</span>
          <span>{formatInr(cart.totals.total)}</span>
        </div>
        <p className="mt-2 text-xs text-[#2a1a12]/55">Incl. GST and delivery</p>
      </aside>
    </main>
  );
}
