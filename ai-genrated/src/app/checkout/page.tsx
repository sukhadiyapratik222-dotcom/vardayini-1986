import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { loadCartLines } from "@/lib/cart";
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
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <CheckoutForm
        defaultName={cart.user?.name || ""}
        defaultPhone={cart.user?.phone || ""}
        lines={cart.lines}
        totals={cart.totals}
      />
    </main>
  );
}
