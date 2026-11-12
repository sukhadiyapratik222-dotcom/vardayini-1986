"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/money";

interface MediaItem {
  id: number;
  stage: string;
  fileUrl: string;
  mediaType: "image" | "video";
  caption?: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface TimelineStage {
  key: "order_received" | "preparing" | "packed" | "ready_for_pickup" | "completed";
  label: string;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  timestamp: string | null;
  media: MediaItem[];
}

interface CameraItem {
  id: number;
  name: string;
  streamUrl: string;
}

interface TrackingData {
  orderNumber: string;
  fulfillmentType: string;
  status: string;
  currentStage: string;
  createdAt: string;
  pickupDate: string;
  pickupSlot: string;
  pickupOtp?: string | null;
  isReady: boolean;
  store: {
    name: string;
    address: string;
    phone: string;
    hours: string;
  };
  items: Array<{
    name: string;
    weight?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
  }>;
  timeline: TimelineStage[];
  settings: {
    mode: "recorded" | "live" | "both";
    workingHoursStart: string;
    workingHoursEnd: string;
    isCurrentlyOpen?: boolean;
  };
  cameras: CameraItem[];
}

interface Props {
  initialData: TrackingData;
  token: string;
}

export function PickupCamClient({ initialData, token }: Props) {
  const [data, setData] = useState<TrackingData>(initialData);
  const [activeMediaModal, setActiveMediaModal] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [currentTimeIst, setCurrentTimeIst] = useState("");

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        setCurrentTimeIst(timeStr + " IST");
      } catch {
        setCurrentTimeIst("");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time polling every 12 seconds
  useEffect(() => {
    let previousStage = data.currentStage;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/kitchen-cam/track/${token}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.tracking) {
          const fresh = json.tracking as TrackingData;
          if (fresh.currentStage !== previousStage) {
            previousStage = fresh.currentStage;
            const stageLabel =
              fresh.timeline.find((t) => t.key === fresh.currentStage)?.label || "Preparation Update";
            setToast(`🔔 Status Update: ${stageLabel}!`);
            setTimeout(() => setToast(null), 5000);
          }
          setData(fresh);
        }
      } catch (err) {
        // network silent retry
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [token, data.currentStage]);

  function copyOtpToClipboard(otp: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  }

  const showLiveStream =
    (data.settings.mode === "live" || data.settings.mode === "both") &&
    data.cameras &&
    data.cameras.length > 0;

  return (
    <div className="min-h-screen bg-[#fffdf7] text-slate-800 font-sans pb-24 selection:bg-[#dfb755]/30">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-[#0b2f8a] text-white text-xs sm:text-sm font-bold shadow-2xl border border-white/20 flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-amber-200/60 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-[#0b2f8a] hover:text-[#dfb755] transition"
          >
            <span>←</span>
            <span>Vardayini Sweets</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-bold text-emerald-800 tracking-wide uppercase bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Live Pickup Prep Tracker
            </span>
            {currentTimeIst && (
              <span className="hidden sm:inline-block font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {currentTimeIst}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Main Hero Header Card */}
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#071c54] via-[#0b2f8a] to-[#143d99] text-white shadow-xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-[#dfb755]/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 text-[#dfb755] text-xs font-bold tracking-wider uppercase">
                <span>🎥</span>
                <span>Store Pickup Order Preparation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif">
                Watch Your Order Being Prepared
              </h1>
              <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
                Every sweet is rolled with 100% Shuddh Desi Ghee in our Vadodara kitchen. Follow live milestones, inspect your freshly packed box, and collect with OTP.
              </p>
            </div>

            {/* Order Identity Badge */}
            <div className="shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 sm:text-right">
              <span className="text-[10px] uppercase tracking-widest text-[#dfb755] font-bold block">
                Pickup Order #
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-white">
                {data.orderNumber}
              </span>
              <span className="block text-[11px] text-white/70 mt-1">
                📅 {data.pickupDate} • {data.pickupSlot}
              </span>
            </div>
          </div>

          {/* Pickup Store & Counter Details */}
          <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-base">🏪</span>
              <div>
                <span className="font-bold text-white block">{data.store.name}</span>
                <span className="text-white/70 block mt-0.5 leading-relaxed">{data.store.address}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 sm:border-l sm:border-white/15 sm:pl-4">
              <span className="text-base">🕒</span>
              <div>
                <span className="font-bold text-white block">Timings & Contact</span>
                <span className="text-white/70 block mt-0.5">Counter Hours: {data.store.hours}</span>
                <span className="text-white/70 block">Helpline: {data.store.phone}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Counter Pickup OTP Highlight Box */}
        {data.pickupOtp && (
          <section className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-white to-amber-50 border-2 border-dashed border-[#dfb755] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dfb755]/20 text-2xl">
                🔑
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#071c54]">Your Counter Pickup OTP</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    REQUIRED FOR HANDOVER
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Present this code to the store counter attendant upon arrival to collect your fresh box.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-5 py-2.5 rounded-2xl bg-white border-2 border-[#0b2f8a] shadow-xs">
                <span className="font-mono text-2xl sm:text-3xl font-black text-[#0b2f8a] tracking-widest">
                  {data.pickupOtp}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyOtpToClipboard(data.pickupOtp!)}
                className="px-3.5 py-2.5 rounded-2xl bg-[#0b2f8a] hover:bg-[#071c54] text-white text-xs font-bold transition cursor-pointer"
                title="Copy OTP"
              >
                {copiedOtp ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
          </section>
        )}

        {/* Mode 2: Optional Live Stream Camera Feed */}
        {showLiveStream && (
          <section className="rounded-3xl bg-slate-900 text-white overflow-hidden shadow-lg border border-slate-700">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live Kitchen CCTV Feed • {data.cameras[0]?.name || "Sweet Workstation"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {data.settings.isCurrentlyOpen ? "🟢 ACTIVE STREAM" : "⏸️ OUTSIDE KITCHEN HOURS"}
              </span>
            </div>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {data.cameras[0]?.streamUrl ? (
                <iframe
                  src={data.cameras[0].streamUrl}
                  title="Live Kitchen Stream"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <span className="text-4xl block">👨‍🍳</span>
                  <p className="text-sm font-bold text-white">Live Camera Resting</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Our sweet masters are rolling warm sweets at the counter. View stage photos and box snapshots below.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Vertical Glass Timeline */}
        <section className="rounded-3xl p-6 sm:p-8 bg-white/75 backdrop-blur-xl border border-white/60 shadow-lg space-y-8">
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#071c54]">
                Preparation &amp; Handover Milestones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time photos and clips uploaded directly from the kitchen workstation.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-600 block">
                Order Status: <strong className="text-[#0b2f8a] uppercase">{data.status.replace(/_/g, " ")}</strong>
              </span>
            </div>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-[#dfb755] before:to-slate-200">
            {data.timeline.map((stage) => {
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";

              return (
                <div key={stage.key} className="relative">
                  {/* Step Pin on the Line */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all shadow-md ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-[#dfb755] text-[#071c54] ring-4 ring-[#dfb755]/30 animate-pulse"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? "✓" : isCurrent ? "⚡" : "○"}
                  </div>

                  {/* Stage Card */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 border ${
                      isCurrent
                        ? "bg-gradient-to-br from-amber-50/90 to-white/90 border-[#dfb755] shadow-md ring-2 ring-[#dfb755]/20"
                        : isCompleted
                        ? "bg-slate-50/70 border-slate-200/90"
                        : "bg-white/40 border-slate-200/50 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0b2f8a]">
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dfb755] text-[#071c54]">
                            IN PROGRESS
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            COMPLETED
                          </span>
                        )}
                      </div>

                      {stage.timestamp && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(stage.timestamp).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1">
                      {stage.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {stage.description}
                    </p>

                    {/* Media Gallery for this stage */}
                    {stage.media && stage.media.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          📸 Photos &amp; Clips from Halwai Counter
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {stage.media.map((m) => (
                            <div
                              key={m.id}
                              className="group relative aspect-square rounded-xl overflow-hidden border border-slate-300 shadow-xs bg-slate-100 cursor-pointer"
                              onClick={() => setActiveMediaModal(m)}
                            >
                              {m.mediaType === "video" ? (
                                <video
                                  src={m.fileUrl}
                                  className="w-full h-full object-cover"
                                  controls={false}
                                  muted
                                />
                              ) : (
                                <img
                                  src={m.fileUrl}
                                  alt={m.caption || "Kitchen photo"}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <span>🔍</span>
                                <span>Zoom</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Order Items Drawer */}
        <section className="rounded-3xl p-6 bg-white/80 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-[#071c54]">
              Items in this Pickup Order ({data.items.length})
            </h3>
            <span className="text-xs text-slate-500">Pure Cow Desi Ghee</span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.items.map((it, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400">{idx + 1}.</span>
                  <div>
                    <p className="font-bold text-slate-900">{it.name}</p>
                    <p className="text-[10px] text-slate-500">Pack: {it.weight || "Standard"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">Qty: {it.quantity}</span>
                  <span className="block text-[11px] font-mono text-slate-600">
                    ₹{(it.unitPrice * it.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://wa.me/919825012345?text=Hello%20Vardayini%20Sweet%20Mart,%20I%20have%20a%20question%20regarding%20my%20pickup%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              <span>💬</span>
              <span>Need Help? Chat on WhatsApp</span>
            </a>

            <p className="text-[11px] text-slate-500 italic">
              FSSAI Lic. 10719024000123 • Vardayini Sweets Since 1976
            </p>
          </div>
        </section>
      </div>

      {/* Lightbox Photo Zoom Modal */}
      {activeMediaModal && (
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveMediaModal(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">
                  Kitchen Snapshot • Stage: {activeMediaModal.stage.replace(/_/g, " ").toUpperCase()}
                </h4>
                <p className="text-[10px] text-slate-400">Uploaded by {activeMediaModal.uploadedBy}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaModal(null)}
                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-hidden bg-black flex items-center justify-center">
              {activeMediaModal.mediaType === "video" ? (
                <video src={activeMediaModal.fileUrl} controls autoPlay className="max-h-[70vh] w-auto" />
              ) : (
                <img
                  src={activeMediaModal.fileUrl}
                  alt={activeMediaModal.caption || "Kitchen photo"}
                  className="max-h-[70vh] w-auto object-contain"
                />
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-700 font-medium italic">
                {activeMediaModal.caption || "Authentic preparation at Vardayini Sweet Mart."}
              </p>
              <a
                href={activeMediaModal.fileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-[#0b2f8a] text-white text-xs font-bold hover:bg-[#071c54] transition shadow-xs"
              >
                📥 Download Photo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

