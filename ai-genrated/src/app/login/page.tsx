"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const isCheckout = redirect === "/checkout";

  const registerHref = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : "/register";
  const forgotHref = redirect
    ? `/forgot-password?redirect=${encodeURIComponent(redirect)}`
    : "/forgot-password";

  return (
    <main className="mx-auto max-w-md px-3 sm:px-4 py-8 sm:py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">
        Welcome back
      </p>
      <h1 className="mt-1 sm:mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-5xl text-[#6b1d1d] font-bold">
        Login
      </h1>

      {isCheckout && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs">
          <span className="text-xl">🛒</span>
          <div>
            <p className="font-bold text-amber-950">Your cart is saved!</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Please sign in to proceed with your delivery details and complete your order.
            </p>
          </div>
        </div>
      )}

      <AuthForm mode="login" />

      <div className="mt-4 flex flex-col gap-2 text-sm text-[#2a1a12]/70">
        <p>
          New here?{" "}
          <Link href={registerHref} className="text-[#c45c26] font-semibold hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          <Link href={forgotHref} className="text-[#c45c26] hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-slate-400">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
