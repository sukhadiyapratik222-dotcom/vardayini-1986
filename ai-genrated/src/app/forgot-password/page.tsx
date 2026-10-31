"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate sending email
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      // For local testing, we auto-redirect to reset-password with email
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);
    }, 1000);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Account Recovery</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#6b1d1d]">Forgot Password</h1>
      
      {sent ? (
        <div className="mt-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <p className="text-sm font-medium mb-2">Reset link sent!</p>
          <p className="text-xs">If an account exists for {email}, you will receive a reset link shortly.</p>
          <p className="text-[10px] mt-4 opacity-70">(Redirecting to reset page for local testing...)</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mithai-card mt-8 space-y-4 rounded-3xl p-6">
          <p className="text-xs text-[#2a1a12]/70 mb-4">
            Enter your email address and we will send you a link to reset your password.
          </p>
          <input 
            type="email" 
            required 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" 
          />
          <button disabled={loading} className="btn-primary w-full rounded-full py-3 text-sm">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
      
      <p className="mt-6 text-sm text-[#2a1a12]/70 text-center">
        <Link href="/login" className="text-[#c45c26] hover:underline">Back to Login</Link>
      </p>
    </main>
  );
}
