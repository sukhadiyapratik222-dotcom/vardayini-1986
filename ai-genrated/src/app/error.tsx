"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600 shadow-sm">
        ⚠️
      </div>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold text-[#6b1d1d]">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-[#2a1a12]/70">
        We apologize for the inconvenience. Our support team is looking into it for our valued customers.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary rounded-full px-6 py-3 text-sm font-bold shadow-sm"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-[#2a1a12]/20 bg-white px-6 py-3 text-sm font-bold text-[#2a1a12] shadow-sm hover:bg-slate-50 transition"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
