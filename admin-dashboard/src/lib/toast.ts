import { ToastData } from "@/components/toast-popup";
import { getPublicStoreUrl } from "@/lib/store-url";

type ToastListener = (toast: ToastData | null) => void;
let listeners: ToastListener[] = [];

const defaultStoreUrl = getPublicStoreUrl();

export const toast = {
  show(data: ToastData) {
    const payload: ToastData = {
      ...data,
      id: data.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    listeners.forEach((listener) => listener(payload));
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
  dismiss() {
    listeners.forEach((listener) => listener(null));
  },
  subscribe(listener: ToastListener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
