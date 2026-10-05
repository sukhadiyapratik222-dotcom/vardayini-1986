"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

export function LivePreviewTab() {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [key, setKey] = useState(0);
  const storeUrl = process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449";

  const handleReload = () => {
    setKey((prev) => prev + 1);
    toast.info("Storefront live preview refreshed");
  };

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile":
        return "max-w-[390px]";
      case "tablet":
        return "max-w-[768px]";
      default:
        return "w-full";
    }
  };

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a] flex items-center gap-2">
            <span>👁️ Live Customer Storefront Preview</span>
          </h2>
          <p className="text-xs text-[#5e6d82] mt-1">
            Real-time interactive view of your customer website running on{" "}
            <span className="text-[#0b2f8a] font-mono font-bold">{storeUrl}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Device Toggles */}
          <div className="flex items-center p-1 rounded-xl bg-[#0b2f8a]/5 border border-[#0b2f8a]/15">
            <button
              onClick={() => setDevice("desktop")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                device === "desktop"
                  ? "bg-[#0b2f8a] text-white shadow-sm"
                  : "text-[#5e6d82] hover:text-[#0b2f8a]"
              }`}
            >
              🖥️ Desktop
            </button>
            <button
              onClick={() => setDevice("tablet")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                device === "tablet"
                  ? "bg-[#0b2f8a] text-white shadow-sm"
                  : "text-[#5e6d82] hover:text-[#0b2f8a]"
              }`}
            >
              📱 Tablet
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                device === "mobile"
                  ? "bg-[#0b2f8a] text-white shadow-sm"
                  : "text-[#5e6d82] hover:text-[#0b2f8a]"
              }`}
            >
              📲 Mobile
            </button>
          </div>

          <button
            onClick={handleReload}
            className="p-2.5 rounded-xl bg-white hover:bg-[#0b2f8a]/5 text-[#0b2f8a] border border-[#0b2f8a]/15 shadow-sm transition"
            title="Reload Preview"
          >
            🔄
          </button>

          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold btn-primary shadow-sm flex items-center gap-1.5"
          >
            <span>Open in Tab ↗</span>
          </a>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center p-4 rounded-3xl bg-[#0b2f8a]/5 border border-[#0b2f8a]/10 min-h-[750px]">
        <div
          className={`transition-all duration-300 w-full ${getDeviceWidth()} h-[750px] rounded-2xl overflow-hidden border-4 border-slate-200 shadow-2xl bg-white`}
        >
          <iframe
            key={key}
            src={storeUrl}
            className="w-full h-full border-0"
            title="Customer Storefront Live Preview"
          />
        </div>
      </div>
    </div>
  );
}
