"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") || "";
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center">
        <p className="text-sm font-medium mb-2">Password Reset Successfully!</p>
        <p className="text-xs">You can now login with your new password.</p>
        <p className="text-[10px] mt-4 opacity-70">(Redirecting to login...)</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mithai-card mt-8 space-y-4 rounded-3xl p-6">
      <p className="text-xs text-[#2a1a12]/70 mb-4">
        Resetting password for: <strong className="text-[#2a1a12]">{emailParam || "Unknown"}</strong>
      </p>
      
      <div>
        <input 
          type="password" 
          required 
          placeholder="New Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" 
        />
      </div>
      <div>
        <input 
          type="password" 
          required 
          placeholder="Confirm New Password" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" 
        />
      </div>
      
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      
      <button disabled={loading || !emailParam} className="btn-primary w-full rounded-full py-3 text-sm mt-2">
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Secure Area</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#6b1d1d]">Reset Password</h1>
      
      <Suspense fallback={<div className="mt-8 text-center text-sm">Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
      
      <p className="mt-6 text-sm text-[#2a1a12]/70 text-center">
        <Link href="/login" className="text-[#c45c26] hover:underline">Cancel and back to Login</Link>
      </p>
    </main>
  );
}
