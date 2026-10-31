"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface WelcomeOfferConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  couponCode?: string;
  discountPercent?: number;
}

interface WelcomeOfferBannerProps {
  className?: string;
  config?: WelcomeOfferConfig;
  defaultCode?: string;
}

export function WelcomeOfferBanner({
  className = "",
  config,
  defaultCode = "FIRST10",
}: WelcomeOfferBannerProps) {
  if (config?.enabled === false) return null;

  const badge = config?.badge || "WELCOME OFFER";
  const title = config?.title || "FLAT 10% OFF ON YOUR FIRST ORDER";
  const subtitle =
    config?.subtitle ||
    "Sign up now with your email or phone number to receive your exclusive discount code instantly!";
  const buttonText = config?.buttonText || "Get Code";
  const activeCouponCode = config?.couponCode || defaultCode;

  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = contact.trim();

    if (!trimmed) {
      setError("Please enter your email or phone number");
      return;
    }

    if (trimmed.length < 5) {
      setError("Please enter a valid email or 10-digit phone number");
      return;
    }

    setError("");
    setSubmitted(true);

    // Save coupon to localStorage for automatic application at checkout
    try {
      localStorage.setItem("vsm_welcome_discount_code", activeCouponCode);
      localStorage.setItem("vsm_subscriber_contact", trimmed);
    } catch {}

    // Auto copy code to clipboard
    copyCodeToClipboard();
  }

  function copyCodeToClipboard() {
    try {
      navigator.clipboard.writeText(activeCouponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
    }
  }

  return (
    <div className={`w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 ${className}`}>
      {/* Outer Card with Rich Deep Espresso Background and Golden Border */}
      <div className="relative rounded-[24px] sm:rounded-[32px] bg-[#2d1810] border-2 border-[#caa055] p-6 sm:p-9 md:p-11 text-center shadow-2xl overflow-hidden">
        {/* Subtle Ambient Golden Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-[#caa055]/15 blur-3xl" />

        {/* Top Coral / Salmon Pill Badge */}
        <div className="inline-block bg-[#d96b52] text-white text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase px-3.5 py-1 rounded-[4px] mb-3 select-none shadow-2xs">
          {badge}
        </div>

        {/* Main Display Heading */}
        <h2 className="font-[family-name:var(--font-display)] font-serif text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold tracking-tight uppercase leading-tight text-white mb-2 sm:mb-2.5">
          {title}
        </h2>

        {/* Subtitle Description */}
        <p className="text-neutral-200 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed mb-6 sm:mb-7 font-normal">
          {subtitle}
        </p>

        {/* Input & Form Area */}
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="max-w-xl mx-auto"
            >
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
                {/* Dark Translucent Pill Input - Explicit styles overriding global light input CSS */}
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="email tel"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter Email or Phone Number"
                  style={{
                    backgroundColor: "#3e241b",
                    color: "#ffffff",
                    caretColor: "#caa055",
                    WebkitTextFillColor: "#ffffff",
                  }}
                  className="welcome-offer-input flex-1 rounded-full !bg-[#3e241b] !text-white !caret-[#caa055] border !border-[#caa055]/30 focus:!border-[#caa055] px-5 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm placeholder:!text-[#d6c5bc] focus:!outline-none focus:!ring-1 focus:!ring-[#caa055] transition-all shadow-inner"
                />

                {/* Glowing Golden Action Button */}
                <button
                  type="submit"
                  className="rounded-full bg-[#c9a600] hover:bg-[#d4af37] text-white font-bold text-xs sm:text-sm px-7 sm:px-9 py-3 sm:py-3.5 tracking-wide shadow-[0_0_24px_rgba(201,166,0,0.55)] hover:shadow-[0_0_30px_rgba(201,166,0,0.75)] transition-all duration-200 active:scale-95 shrink-0 cursor-pointer"
                >
                  {buttonText}
                </button>
              </div>

              {error && (
                <p className="text-rose-400 text-xs mt-2.5 font-medium animate-in fade-in">
                  {error}
                </p>
              )}
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto space-y-3 sm:space-y-4"
            >
              <div className="bg-[#462c21]/90 border border-[#caa055]/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-lg">
                <div className="text-left">
                  <span className="text-[11px] uppercase font-bold text-[#caa055] tracking-wider block">
                    Your Exclusive Code
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-bold text-white tracking-widest">
                    {activeCouponCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyCodeToClipboard}
                  className="rounded-full bg-[#caa055] hover:bg-[#d4af37] text-[#2d1810] font-bold text-xs px-4 py-2 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  {copied ? "✓ Copied!" : "Copy Code"}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-emerald-400 font-medium">
                ✓ Code copied to clipboard! Apply it at checkout for 10% off your first mithai order.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

