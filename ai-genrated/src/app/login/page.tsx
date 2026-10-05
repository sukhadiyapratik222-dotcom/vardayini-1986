import { AuthForm } from "@/components/auth-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Welcome back</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl text-[#6b1d1d]">Login</h1>
      <AuthForm mode="login" />
      <p className="mt-4 text-sm text-[#2a1a12]/70">
        New here? <Link href="/register" className="text-[#c45c26]">Create an account</Link>
      </p>
    </main>
  );
}
