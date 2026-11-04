"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!toast || isHovered) return;

    // Auto-dismiss after 6 seconds (pauses when user hovers to click)
    const timer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => clearTimeout(timer);
  }, [toast, onClose, isHovered]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";
  const targetUrl = toast.linkUrl || getPublicStoreUrl();

  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick();
    } else if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`Click to view live on ${targetUrl}`}
        className={`group cursor-pointer flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none ${
          isSuccess
            ? "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/25 hover:border-emerald-400"
            : isError
            ? "bg-rose-950/95 text-white border-rose-500/40 shadow-rose-950/25 hover:border-rose-400"
            : "bg-[#0b2f8a]/95 text-white border-white/20 shadow-blue-950/25 hover:border-white/40"
        }`}
      >
        {/* Status Icon */}
        <span className="text-base shrink-0">
          {isSuccess ? "✅" : isError ? "⚠️" : "ℹ️"}
        </span>

        {/* Action Performed Message */}
        <p className="text-xs font-semibold leading-snug tracking-wide text-white pr-1">
          {toast.message}
        </p>

        {/* Click indicator arrow */}
        <span
          className="text-xs text-white/50 group-hover:text-white transition shrink-0 ml-auto mr-1"
          title={`Click to open ${targetUrl}`}
        >
          ↗
        </span>

        {/* Manual Dismiss button (stops propagation so clicking X only closes) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-xs font-bold shrink-0"
          aria-label="Close notification"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
