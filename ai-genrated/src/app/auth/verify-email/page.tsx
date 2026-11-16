import { Metadata } from "next";
import { EmailOtpAuth } from "@/components/email-otp-auth";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Email Verification · Vardayini Sweet Mart",
  description: "Secure one-time password email verification for Vardayini Sweet Mart.",
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#faf6ee] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Traditional Sweets Glow Accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#dfb755]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#283618]/10 blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10">
        <Link href="/" className="inline-block hover:opacity-90 transition">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🪔</span>
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[#283618]">
              Vardayini Sweet Mart
            </span>
          </div>
          <p className="text-xs text-amber-900/70 tracking-widest uppercase mt-1 font-semibold">
            Kalol · Since 1976
          </p>
        </Link>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <EmailOtpAuth redirectUrl="/" />
      </div>
    </div>
  );
}
