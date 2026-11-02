import { ToastData } from "@/components/toast-popup";
import { getPublicStoreUrl } from "@/lib/store-url";

type ToastListener = (toast: ToastData | null) => void;
let listeners: ToastListener[] = [];

const defaultStoreUrl = getPublicStoreUrl();

export const toast = {
  show(data: ToastData) {
    listeners.forEach((listener) => listener(data));
  },
  success(message: string, linkUrl: string = defaultStoreUrl) {
    toast.show({
      type: "success",
      message,
      linkUrl,
    });
  },
  error(message: string, linkUrl?: string) {
    toast.show({
      type: "error",
      message,
      linkUrl,
    });
  },
  info(message: string, linkUrl: string = defaultStoreUrl) {
    toast.show({
      type: "info",
      message,
      linkUrl,
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
