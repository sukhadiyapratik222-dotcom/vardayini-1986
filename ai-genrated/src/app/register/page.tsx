"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function RegisterContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const isCheckout = redirect === "/checkout";

  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">
        Join the mithai list
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-[#6b1d1d]">
        Create account
      </h1>

      {isCheckout && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs">
          <span className="text-xl">🛒</span>
          <div>
            <p className="font-bold text-amber-950">Your cart is waiting!</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Create an account in 30 seconds to proceed with your order and track delivery.
            </p>
          </div>
        </div>
      )}

      <AuthForm mode="register" />

      <p className="mt-4 text-sm text-[#2a1a12]/70">
        Already packing with us?{" "}
        <Link href={loginHref} className="text-[#c45c26] font-semibold hover:underline">
          Login
        </Link>
      </p>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-slate-400">Loading registration...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
