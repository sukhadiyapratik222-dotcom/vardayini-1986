"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

export interface EmailOtpAuthProps {
  onSuccess?: (data: { token: string; email: string; user: any }) => void;
  redirectUrl?: string;
  initialEmail?: string;
  compact?: boolean;
}

export function EmailOtpAuth({
  onSuccess,
  redirectUrl = "/",
  initialEmail = "",
  compact = false,
}: EmailOtpAuthProps) {
  const [step, setStep] = useState<"email" | "otp">(initialEmail ? "otp" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cooldown, setCooldown] = useState(initialEmail ? 60 : 0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Request new OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setDevCode(null);

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send verification code.");
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
        return;
      }

      setStep("otp");
      setCooldown(data.cooldownSeconds || 60);
      setSuccessMessage(data.message || "Verification code sent to your email!");

      if (data.devOtp) {
        setDevCode(data.devOtp);
      }

      // Auto-focus first input box
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch {
      setErrorMessage("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Change single digit
  const handleBoxChange = (index: number, val: string) => {
    const numeric = val.replace(/\D/g, "");
    const singleDigit = numeric.slice(-1);

    const nextOtp = [...otp];
    nextOtp[index] = singleDigit;
    setOtp(nextOtp);

    // Auto-advance
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when 6th digit entered
    if (singleDigit && index === 5 && nextOtp.every((d) => d !== "")) {
      executeVerify(nextOtp.join(""));
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedText) return;

    const nextOtp = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedText.length; i++) {
      nextOtp[i] = pastedText[i];
    }
    setOtp(nextOtp);

    const nextIndex = Math.min(pastedText.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedText.length === 6) {
      executeVerify(pastedText);
    }
  };

  // Submit and verify OTP
  const executeVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Verification failed.");
        return;
      }

      setSuccessMessage("Email verified successfully! Signing you in...");

      if (onSuccess) {
        onSuccess(data);
      } else {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
      }
    } catch {
      setErrorMessage("Verification request failed. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`w-full mx-auto bg-white rounded-3xl shadow-2xl border border-[#ebd9b8]/80 overflow-hidden ${
        compact ? "max-w-sm p-6" : "max-w-md p-8 sm:p-10"
      }`}
    >
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#283618]/10 text-[#283618] text-[11px] font-bold uppercase tracking-wider mb-3">
          <span>🔒</span>
          <span>Secure Email Auth</span>
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#283618]">
          {step === "email" ? "Verify With Email" : "Enter Verification Code"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
          {step === "email"
            ? "Enter your email address to receive a secure 6-digit one-time password."
            : `We sent a 6-digit code to ${email}`}
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-start gap-2.5 animate-fadeIn">
          <span className="font-bold shrink-0">⚠️</span>
          <span className="flex-1 leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-start gap-2.5 animate-fadeIn">
          <span className="font-bold shrink-0">✓</span>
          <span className="flex-1 leading-relaxed">{successMessage}</span>
        </div>
      )}

      {/* Developer Simulation Notice */}
      {devCode && (
        <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <span>🛠️ <strong>Dev Mode OTP:</strong> {devCode}</span>
          <button
            type="button"
            onClick={() => {
              const digits = devCode.split("");
              setOtp(digits);
              executeVerify(devCode);
            }}
            className="text-[11px] underline font-bold hover:text-amber-700"
          >
            Auto-fill
          </button>
        </div>
      )}

      {/* Step 1: Email Form */}
      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@domain.com"
              required
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/20 text-slate-900 text-sm font-medium outline-none transition shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#283618] hover:bg-[#384c22] text-[#fefae0] font-bold text-sm tracking-wide shadow-lg hover:shadow-xl disabled:opacity-50 transition active:scale-[0.98] cursor-pointer"
          >
            {loading ? "Sending 6-Digit Code..." : "Send Verification Code →"}
          </button>
        </form>
      ) : (
        /* Step 2: 6 OTP Input Boxes */
        <div className="space-y-6">
          <div className="flex justify-between gap-1.5 sm:gap-2.5" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleBoxChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                aria-label={`Digit ${index + 1}`}
                className="w-11 sm:w-13 h-14 sm:h-16 text-center text-xl sm:text-2xl font-extrabold rounded-2xl border-2 border-slate-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/20 text-[#283618] bg-slate-50/50 outline-none transition shadow-sm"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => executeVerify()}
            disabled={loading || otp.some((d) => d === "")}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#283618] hover:bg-[#384c22] text-[#fefae0] font-bold text-sm tracking-wide shadow-lg hover:shadow-xl disabled:opacity-50 transition active:scale-[0.98] cursor-pointer"
          >
            {loading ? "Verifying..." : "Verify & Continue →"}
          </button>

          {/* Resend & Back Controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp(["", "", "", "", "", ""]);
                setErrorMessage("");
              }}
              className="hover:text-slate-900 underline font-medium cursor-pointer"
            >
              ← Edit Email
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={() => handleSendOtp()}
              className="font-bold text-[#283618] disabled:text-slate-400 hover:underline cursor-pointer"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
            </button>
          </div>
        </div>
      )}

      {/* Security Footer Notice */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-slate-400">
          By continuing, you agree to Vardayini Sweet Mart&apos;s{" "}
          <Link href="/terms" className="underline hover:text-slate-600">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
