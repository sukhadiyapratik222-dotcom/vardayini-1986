"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export interface WelcomeOfferPopupConfig {
  enabled?: boolean;
  delaySeconds?: number;
  cooldownDays?: number;
  badge?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  couponCode?: string;
  discountPercent?: number;
  exitIntent?: boolean;
  imageUrl?: string;
}

interface WelcomeOfferPopupProps {
  config?: WelcomeOfferPopupConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION DEFAULTS (Customizable via admin or props)
// ─────────────────────────────────────────────────────────────────────────────
export const POPUP_DELAY_SECONDS = 300; // 5 minutes active time
export const COOLDOWN_DAYS = 7; // Do not show again for 7 days if closed
const SESSION_TIMER_KEY = "vsm_welcome_popup_active_secs";
const SESSION_SHOWN_KEY = "vsm_welcome_popup_shown_session";
const LOCAL_DISMISSED_KEY = "vsm_welcome_dismissed_until";
const LOCAL_CLAIMED_KEY = "vsm_welcome_claimed";
const LOCAL_CODE_KEY = "vsm_welcome_discount_code";

export function WelcomeOfferPopup({ config }: WelcomeOfferPopupProps) {
  const pathname = usePathname();

  const isEnabled = config?.enabled !== false;
  const targetDelay = config?.delaySeconds ?? POPUP_DELAY_SECONDS;
  const cooldownDays = config?.cooldownDays ?? COOLDOWN_DAYS;
  const badgeText = config?.badge || "WELCOME OFFER";
  const titleText = config?.title || "FLAT 10% OFF ON YOUR FIRST ORDER";
  const subtitleText =
    config?.subtitle ||
    "Sign up now with your email or phone number to receive your exclusive discount code instantly!";
  const buttonLabel = config?.buttonText || "Get Code";
  const defaultCoupon = config?.couponCode || "FIRST10";
  const discountVal = config?.discountPercent ?? 10;
  const exitIntentEnabled = config?.exitIntent === true;

  const [isOpen, setIsOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [alreadyClaimedMsg, setAlreadyClaimedMsg] = useState(false);
  const [copied, setCopied] = useState(false);

  // Urgency Countdown Timer (starts at 10 minutes when popup opens)
  const [secondsRemaining, setSecondsRemaining] = useState(600);

  // References for focus trap & scroll restore
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // SUPPRESSION CHECKS
  // ───────────────────────────────────────────────────────────────────────────
  const shouldSuppress = useCallback(() => {
    if (typeof window === "undefined") return true;

    // 1. Blacklisted pages (Checkout & Cart)
    if (pathname.startsWith("/checkout") || pathname.startsWith("/cart")) {
      return true;
    }

    // 2. Already claimed the offer
    try {
      if (localStorage.getItem(LOCAL_CLAIMED_KEY) === "true") {
        return true;
      }
    } catch {}

    // 3. 7-Day dismissal cooldown
    try {
      const dismissedUntil = localStorage.getItem(LOCAL_DISMISSED_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return true;
      }
    } catch {}

    // 4. Already shown in this session
    try {
      if (sessionStorage.getItem(SESSION_SHOWN_KEY) === "true") {
        return true;
      }
    } catch {}

    return false;
  }, [pathname]);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTIVE TIME TRACKING (Page Visibility API + Session Storage)
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEnabled) return;

    // Check for developer test override (?popup=now or ?welcome_popup=1 or #welcome-offer)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isTestTrigger =
        urlParams.get("popup") === "now" ||
        urlParams.get("welcome_popup") === "1" ||
        window.location.hash === "#welcome-offer";

      if (isTestTrigger) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        setIsOpen(true);
        return;
      }
    }

    if (shouldSuppress()) return;

    let activeSecs = 0;
    try {
      const stored = sessionStorage.getItem(SESSION_TIMER_KEY);
      if (stored) activeSecs = parseInt(stored, 10) || 0;
    } catch {}

    const interval = setInterval(() => {
      // Pause timer when tab is hidden or page is backgrounded
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      // Check suppression dynamically (e.g. if navigated to checkout)
      if (shouldSuppress()) {
        return;
      }

      activeSecs += 1;
      try {
        sessionStorage.setItem(SESSION_TIMER_KEY, activeSecs.toString());
      } catch {}

      if (activeSecs >= targetDelay) {
        clearInterval(interval);
        try {
          sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
        } catch {}
        previousActiveElement.current = document.activeElement as HTMLElement;
        setIsOpen(true);
      }
    }, 1000);

    // Optional Exit Intent on Desktop
    const handleMouseLeave = (e: MouseEvent) => {
      if (!exitIntentEnabled) return;
      if (e.clientY <= 10 && !shouldSuppress()) {
        try {
          sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
        } catch {}
        previousActiveElement.current = document.activeElement as HTMLElement;
        setIsOpen(true);
      }
    };

    if (exitIntentEnabled) {
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      clearInterval(interval);
      if (exitIntentEnabled) {
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [isEnabled, targetDelay, exitIntentEnabled, shouldSuppress]);

  // ───────────────────────────────────────────────────────────────────────────
  // URGENCY COUNTDOWN TIMER (10:00)
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY & SCROLL LOCK
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Lock page scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first interactive element
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    // ESC key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
      // Focus Trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen]);

  // ───────────────────────────────────────────────────────────────────────────
  // CLOSE & DISMISS (7-day cooldown)
  // ───────────────────────────────────────────────────────────────────────────
  const handleClose = () => {
    setIsOpen(false);
    try {
      // 7-day dismissal cooldown
      const expiry = Date.now() + cooldownDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(LOCAL_DISMISSED_KEY, expiry.toString());
      sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
    } catch {}

    // Return focus to page
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FORM SUBMISSION & COUPON CLAIM
  // ───────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = contact.trim();

    if (!trimmed) {
      setError("Please enter your email or phone number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/welcome-offer/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: trimmed,
          marketingConsent,
          sourceUrl: pathname,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to unlock coupon. Please check your input.");
        return;
      }

      const coupon = data.couponCode || defaultCoupon;
      setClaimedCode(coupon);
      setAlreadyClaimedMsg(data.alreadyClaimed === true);

      // Save coupon and mark as claimed forever
      try {
        localStorage.setItem(LOCAL_CODE_KEY, coupon);
        localStorage.setItem(LOCAL_CLAIMED_KEY, "true");
        localStorage.setItem("vsm_subscriber_contact", trimmed);
      } catch {}

      // Auto-copy
      copyCode(coupon);
    } catch {
      setError("Something went wrong. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (codeToCopy: string) => {
    try {
      navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-offer-heading"
      >
        {/* Dark Overlay with Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[540px] rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-[#2d1810] via-[#22120b] to-[#1a0c07] border-2 border-[#caa055] p-6 sm:p-9 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden z-10"
        >
          {/* Subtle Glass Shimmer Reflection */}
          <div
            className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 transform animate-[shimmer_6s_infinite]"
            style={{
              animation: "shimmer 5s infinite linear",
            }}
          />

          {/* Golden Ambient Blur Glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-80 rounded-full bg-[#caa055]/20 blur-3xl" />

          {/* Close (X) Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close welcome offer popup"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-[#caa055] hover:text-white flex items-center justify-center transition active:scale-90 cursor-pointer z-20 border border-[#caa055]/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Top Pill Row: Coral WELCOME OFFER + Urgency Countdown */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3 select-none">
            <span className="inline-block bg-[#d96b52] text-white text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] uppercase px-3 py-0.5 rounded-[4px] shadow-sm">
              {badgeText}
            </span>

            <span className="inline-flex items-center gap-1 bg-[#caa055]/20 text-[#f5dfa8] border border-[#caa055]/40 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Offer ends in {formatCountdown(secondsRemaining)}
            </span>
          </div>

          {/* Main Display Heading */}
          <h2
            id="welcome-offer-heading"
            className="font-[family-name:var(--font-display)] font-serif text-xl sm:text-2xl md:text-[28px] font-bold tracking-tight uppercase leading-tight text-white mb-2"
          >
            {titleText}
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#f3e7dc] text-xs sm:text-sm max-w-md mx-auto leading-relaxed mb-6 font-normal">
            {subtitleText}
          </p>

          {/* Form & Claim States */}
          <AnimatePresence mode="wait">
            {!claimedCode ? (
              <motion.form
                key="offer-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-3.5 max-w-md mx-auto"
              >
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
                  {/* Translucent Dark Pill Input */}
                  <input
                    ref={inputRef}
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
                    className="flex-1 rounded-full !bg-[#3e241b] !text-white !caret-[#caa055] border !border-[#caa055]/40 focus:!border-[#caa055] px-5 py-3 text-xs sm:text-sm placeholder:!text-[#c5b2a6] focus:!outline-none focus:!ring-2 focus:!ring-[#caa055]/30 transition-all shadow-inner"
                  />

                  {/* Glowing Mustard Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-[#c9a600] hover:bg-[#d4af37] text-white font-bold text-xs sm:text-sm px-6 py-3 tracking-wide shadow-[0_0_24px_rgba(201,166,0,0.55)] hover:shadow-[0_0_30px_rgba(201,166,0,0.75)] transition-all duration-200 active:scale-95 shrink-0 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Unlocking...</span>
                      </>
                    ) : (
                      <span>{buttonLabel}</span>
                    )}
                  </button>
                </div>

                {/* Inline Error Message */}
                {error && (
                  <p className="text-rose-400 text-xs font-semibold animate-in fade-in">
                    ✕ {error}
                  </p>
                )}

                {/* Consent Line */}
                <p className="text-[10px] sm:text-[11px] text-[#b8a295] leading-snug">
                  By continuing you agree to receive offers. You can unsubscribe anytime.
                </p>

                {/* "No thanks, maybe later" text link */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-xs text-[#d6c5bc]/70 hover:text-white underline underline-offset-4 transition cursor-pointer"
                  >
                    No thanks, maybe later
                  </button>
                </div>
              </motion.form>
            ) : (
              /* Success / Coupon Claimed State */
              <motion.div
                key="claimed-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 max-w-md mx-auto"
              >
                {/* Sparkle burst headline */}
                <div className="text-center">
                  <span className="text-2xl">✨ 🎉 ✨</span>
                  <p className="text-sm font-bold text-amber-300 mt-1">
                    {alreadyClaimedMsg
                      ? "Welcome back! Here is your 10% OFF code:"
                      : "Woohoo! Your exclusive discount code is ready:"}
                  </p>
                </div>

                {/* Voucher Box */}
                <div className="bg-[#462c21]/95 border-2 border-[#caa055] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xl">
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-[#caa055] tracking-widest block">
                      FLAT {discountVal}% DISCOUNT
                    </span>
                    <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest">
                      {claimedCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyCode(claimedCode)}
                    className="rounded-full bg-[#caa055] hover:bg-[#d4af37] text-[#2d1810] font-extrabold text-xs px-4 py-2.5 transition active:scale-95 shadow-md cursor-pointer"
                  >
                    {copied ? "✓ Copied!" : "Copy Code"}
                  </button>
                </div>

                {/* Action Buttons: Apply & Shop Now */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <Link
                    href="/shop"
                    onClick={handleClose}
                    className="w-full rounded-full bg-[#c9a600] hover:bg-[#d4af37] text-white font-bold text-xs sm:text-sm py-3 text-center shadow-[0_0_24px_rgba(201,166,0,0.55)] transition active:scale-95"
                  >
                    Apply &amp; Shop Sweets Now →
                  </Link>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full sm:w-auto px-5 py-3 text-xs text-[#d6c5bc] hover:text-white transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
