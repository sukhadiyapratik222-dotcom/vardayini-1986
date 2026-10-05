"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const payload: Record<string, string> = {
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      };
      if (mode === "register") {
        payload.name = String(form.get("name") || "");
        payload.phone = String(form.get("phone") || "");
      }
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(data.user?.role === "admin" ? "/admin" : "/account");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mithai-card mt-8 space-y-4 rounded-3xl p-6">
      {mode === "register" && (
        <>
          <input name="name" required placeholder="Full name" className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" />
          <input name="phone" required placeholder="Phone" className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" />
        </>
      )}
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" />
      <input name="password" type="password" required placeholder="Password" className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3 py-2 text-sm" />
      {error ? <p className="text-sm text-[#6b1d1d]">{error}</p> : null}
      <button disabled={loading} className="btn-primary w-full rounded-full py-3 text-sm">
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
      </button>
    </form>
  );
}
