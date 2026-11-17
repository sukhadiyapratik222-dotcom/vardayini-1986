"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getPublicStoreUrl } from "@/lib/store-url";

export interface ToastData {
  id?: string;
  type: "success" | "error" | "info";
  message: string;
  linkUrl?: string;
  onClick?: () => void;
}

interface ToastPopupProps {
  toast: ToastData | null;
  onClose: () => void;
}

export function ToastPopup({ toast, onClose }: ToastPopupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer safely
  const clearDismissTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Dismiss with smooth fade-out
  const handleDismiss = useCallback(() => {
    clearDismissTimer();
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 200);
  }, [clearDismissTimer, onClose]);

  // Handle action (Arrow button) click
  const handleAction = useCallback(() => {
    if (toast?.onClick) {
      toast.onClick();
    } else if (toast?.linkUrl) {
      if (toast.linkUrl.startsWith("#")) {
        const el = document.querySelector(toast.linkUrl);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        const targetUrl = toast.linkUrl.startsWith("http")
          ? toast.linkUrl
          : `${getPublicStoreUrl()}${toast.linkUrl.startsWith("/") ? "" : "/"}${toast.linkUrl}`;
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    handleDismiss();
  }, [toast, handleDismiss]);

  // Auto-dismiss after 5 seconds, pauses on mouse hover
  useEffect(() => {
    if (!toast) return;

    // Reset exit animation whenever toast data changes
    setIsExiting(false);

    if (isHovered) {
      clearDismissTimer();
      return;
    }

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearDismissTimer();
  }, [toast?.id, toast?.message, isHovered, handleDismiss, clearDismissTimer]);

  // Accessibility: Close on Escape key
  useEffect(() => {
    if (!toast) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toast, handleDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[9999] max-w-md pointer-events-auto transition-all duration-200 ease-out ${
        isExiting
          ? "opacity-0 translate-y-3 scale-95 pointer-events-none"
          : "opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-4 duration-300"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl backdrop-blur-xl border select-none ${
          isSuccess
            ? "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/25"
            : isError
            ? "bg-rose-950/95 text-white border-rose-500/40 shadow-rose-950/25"
            : "bg-[#0b2f8a]/95 text-white border-white/20 shadow-blue-950/25"
        }`}
      >
        {/* Status Icon */}
        <span className="text-base shrink-0 select-none" aria-hidden="true">
          {isSuccess ? "✅" : isError ? "⚠️" : "ℹ️"}
        </span>

        {/* Message */}
        <p className="text-xs font-semibold leading-snug tracking-wide text-white pr-1">
          {toast.message}
        </p>

        {/* Action / Arrow Button: Real accessible button with min 44px tap target on mobile */}
        <button
          type="button"
          onClick={handleAction}
          aria-label="View reviews"
          title="View reviews"
          className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0 ml-auto focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <span className="text-sm font-bold" aria-hidden="true">↗</span>
        </button>

        {/* Dismiss / Close Button: Real accessible button with min 44px tap target on mobile */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close notification"
          title="Close notification"
          className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:bg-white/20 transition text-xs font-bold shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
}
