"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CameraItem {
  id: number;
  name: string;
  streamUrl: string;
}

interface ClipItem {
  id: number;
  stage: string;
  fileUrl: string;
  caption?: string;
  createdAt: string;
}

interface PublicStreamData {
  enabled: boolean;
  isWithinHours: boolean;
  mode: "recorded" | "live" | "both";
  workingHours: {
    start: string;
    end: string;
  };
  cameras: CameraItem[];
  recentClips: ClipItem[];
}

export function KitchenCamHomepageSection() {
  const [data, setData] = useState<PublicStreamData | null>(null);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [currentTimeIst, setCurrentTimeIst] = useState("");

  useEffect(() => {
    fetch("/api/kitchen-cam/public-stream")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && json.success) {
          setData(json);
        }
      })
      .catch(() => {});
  }, []);

  // Update IST clock
  useEffect(() => {
    const update = () => {
      try {
        const timeStr = new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        setCurrentTimeIst(timeStr + " IST");
      } catch {}
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate clips every 4 seconds if in recorded mode
  useEffect(() => {
    if (!data?.recentClips || data.recentClips.length <= 1) return;
    const interval = setInterval(() => {
      setActiveClipIndex((prev) => (prev + 1) % data.recentClips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [data?.recentClips]);

  if (!data || data.enabled === false) return null;

  const showLivePlayer =
    (data.mode === "live" || data.mode === "both") &&
    data.cameras &&
    data.cameras.length > 0 &&
    data.isWithinHours;

  const currentClip = data.recentClips && data.recentClips[activeClipIndex];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Column: Live Kitchen Card */}
        <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#071c54] via-[#0b2f8a] to-[#071c54] text-white shadow-xl border border-white/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#dfb755]/10 blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="relative z-10 flex items-center justify-between gap-4 pb-4 border-b border-white/15">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/40">
                {data.isWithinHours ? "Live Kitchen Cam" : "Kitchen Resting"}
              </span>
            </div>

            {currentTimeIst && (
              <span className="font-mono text-xs text-white/70 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                🕒 {currentTimeIst}
              </span>
            )}
          </div>

          {/* Stream / Gallery Container */}
          <div className="relative z-10 my-6 rounded-2xl overflow-hidden aspect-video bg-black/60 border border-white/20 shadow-inner flex items-center justify-center">
            {showLivePlayer ? (
              <iframe
                src={data.cameras[0].streamUrl}
                title="Live Kitchen Stream"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : data.isWithinHours && currentClip ? (
              <div className="relative w-full h-full">
                <img
                  src={currentClip.fileUrl}
                  alt={currentClip.caption || "Kitchen prep"}
                  className="w-full h-full object-cover animate-in fade-in duration-500"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-xs text-white flex justify-between items-end">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#dfb755] block">
                      Stage: {currentClip.stage.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <p className="font-medium text-white/90">{currentClip.caption || "Rolling fresh sweets this morning"}</p>
                  </div>
                  <span className="font-mono text-[10px] text-white/60">
                    Clip {activeClipIndex + 1} of {data.recentClips.length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <span className="text-4xl block">✨</span>
                <p className="font-bold text-base text-white">Our Kitchen Opens at {data.workingHours.start} AM</p>
                <p className="text-xs text-white/70 max-w-sm">
                  Our halwais prepare pure cow ghee sweets fresh every morning from 7:00 AM to 8:30 PM.
                </p>
              </div>
            )}
          </div>

          {/* Card Footer Callout */}
          <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-white text-sm">Ordering Store Pickup?</p>
              <p className="text-white/75 text-[11px]">
                Watch your sweets hand-rolled, packed, and collect with your private OTP code.
              </p>
            </div>
            <Link
              href="/shop"
              className="shrink-0 px-4 py-2 rounded-full bg-[#dfb755] hover:bg-[#c89d38] text-[#071c54] font-bold text-xs shadow-md transition"
            >
              Order Store Pickup →
            </Link>
          </div>
        </div>

        {/* Right Column: Hygiene & Heritage Promise Glass Card */}
        <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-white/80 backdrop-blur-xl border border-[#dfb755]/30 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase tracking-wider">
              <span>🛡️</span>
              <span>Vardayini Hygiene Standard</span>
            </div>

            <h3 className="text-2xl font-bold text-[#071c54] font-serif tracking-tight">
              Pure Shuddh Cow Ghee &amp; Transparent Kitchens
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Since 1976, we have maintained open transparent counters in Vadodara. Our Live Kitchen Cam brings the warmth of our karahi and purity of our ingredients straight to your screen.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b2f8a]/10 text-[#0b2f8a] text-xs font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">100% Shuddh Cow Desi Ghee</h4>
                  <p className="text-[11px] text-slate-500">Zero vanaspati, zero artificial palm oils, zero preservatives.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b2f8a]/10 text-[#0b2f8a] text-xs font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">FSSAI Certified Laboratory Grade Cleanliness</h4>
                  <p className="text-[11px] text-slate-500">License 10719024000123. Caps, gloves, and daily hot water sanitization.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b2f8a]/10 text-[#0b2f8a] text-xs font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Fresh Counter Box Verification</h4>
                  <p className="text-[11px] text-slate-500">We snap and attach a photo of your actual weighed box before you arrive.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>Vadodara Flagship Kitchen</span>
            <span className="font-bold text-[#0b2f8a]">Est. 1976</span>
          </div>
        </div>
      </div>
    </section>
  );
}
