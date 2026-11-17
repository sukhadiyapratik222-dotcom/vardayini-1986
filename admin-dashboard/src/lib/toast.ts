import { toast as sonnerToast } from "sonner";
import { ToastData } from "@/components/toast-popup";
import { getPublicStoreUrl } from "@/lib/store-url";

type ToastListener = (toast: ToastData | null) => void;
let listeners: ToastListener[] = [];

const defaultStoreUrl = getPublicStoreUrl();

function executeAction(linkUrl?: string, onClick?: () => void) {
  if (onClick) {
    onClick();
    return;
  }
  if (linkUrl) {
    if (linkUrl.startsWith("#")) {
      const el = document.querySelector(linkUrl);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      const targetUrl = linkUrl.startsWith("http")
        ? linkUrl
        : `${defaultStoreUrl}${linkUrl.startsWith("/") ? "" : "/"}${linkUrl}`;
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export const toast = {
  show(data: ToastData) {
    const payload: ToastData = {
      ...data,
      id: data.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    // Forward to internal subscribers for backwards compatibility
    listeners.forEach((listener) => listener(payload));

    // Also trigger Sonner toast
    const actionConfig = (data.onClick || data.linkUrl) ? {
      label: "↗ View",
      onClick: () => executeAction(data.linkUrl, data.onClick),
    } : undefined;

    if (data.type === "success") {
      sonnerToast.success(data.message, {
        id: payload.id,
        duration: 5000,
        action: actionConfig,
      });
    } else if (data.type === "error") {
      sonnerToast.error(data.message, {
        id: payload.id,
        duration: 5000,
        action: actionConfig,
      });
    } else {
      sonnerToast.info(data.message, {
        id: payload.id,
        duration: 5000,
        action: actionConfig,
      });
    }
  },

  success(message: string, linkUrl?: string, onClick?: () => void) {
    toast.show({
      type: "success",
      message,
      linkUrl: linkUrl || defaultStoreUrl,
      onClick,
    });
  },

  error(message: string, linkUrl?: string, onClick?: () => void) {
    toast.show({
      type: "error",
      message,
      linkUrl,
      onClick,
    });
  },

  info(message: string, linkUrl?: string, onClick?: () => void) {
    toast.show({
      type: "info",
      message,
      linkUrl: linkUrl || defaultStoreUrl,
      onClick,
    });
  },

  dismiss(id?: string) {
    sonnerToast.dismiss(id);
    listeners.forEach((listener) => listener(null));
  },

  subscribe(listener: ToastListener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
