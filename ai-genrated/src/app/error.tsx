"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("[Global Error Boundary Caught Exception]:", error);
  }, [error]);

  const copyErrorDetails = () => {
    const details = `Error: ${error.message}\nDigest: ${error.digest || "N/A"}\nStack: ${error.stack || "N/A"}`;
    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600 shadow-sm animate-bounce">
        ⚠️
      </div>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#6b1d1d]">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-[#2a1a12]/70 leading-relaxed max-w-md">
        We apologize for the inconvenience. Our support team is looking into it for our valued customers.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => reset()}
          className="btn-primary rounded-full px-6 py-2.5 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
        >
          Reload Page
        </button>
        <Link
          href="/"
          className="rounded-full border border-[#2a1a12]/20 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#2a1a12] shadow-sm hover:bg-slate-50 transition"
        >
          Return Home
        </Link>
      </div>

      {/* Diagnostics / Collapsible Error Details */}
      <div className="mt-8 w-full text-left">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto cursor-pointer"
        >
          <span>{showDetails ? "Hide" : "Show"} Technical Diagnostics</span>
          <span>{showDetails ? "▲" : "▼"}</span>
        </button>

        {showDetails && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800 shadow-inner space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[11px] text-amber-400 font-bold">Diagnostic Info</span>
              <button
                type="button"
                onClick={copyErrorDetails}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-white transition cursor-pointer"
              >
                {copied ? "✓ Copied" : "Copy Details"}
              </button>
            </div>
            <p className="text-rose-400 break-words">{error.message || "An unexpected error occurred"}</p>
            {error.digest && (
              <p className="text-slate-400 text-[10px]">Digest: {error.digest}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
