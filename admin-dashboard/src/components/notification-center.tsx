"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AdminNotification, api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface NotificationCenterProps {
  onNavigateTab?: (tabId: "orders" | "customers", filter?: string) => void;
  onUnreadChange?: (count: number) => void;
  className?: string;
  buttonClassName?: string;
}

export type SoundTone = "fahhh" | "fahhh-7x" | "faaah-synth" | "crystal" | "bell" | "pop";

// Web Audio synthesizer fallback
function playWebAudioSynthesizer(tone: string = "faaah") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (tone === "faaah" || tone === "faaah-synth" || tone === "fahhh") {
      // Signature "Faaah" rich harmonic chime:
      // Lush multi-harmonic F-major/A chord with a warm resonant low-pass filter swell
      const frequencies = [349.23, 440.0, 523.25, 659.25, 880.0]; // F4, A4, C5, E5, A5
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.22, now + 0.08); // Warm swell attack -> "Faaa..."
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25); // Resonant decay -> "...aaaah"
      master.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(3600, now + 0.18);
      filter.frequency.exponentialRampToValueAtTime(600, now + 1.25);
      filter.connect(master);

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((i - 2) * 4, now);

        const oscGain = ctx.createGain();
        const weights = [0.28, 0.22, 0.18, 0.14, 0.1];
        oscGain.gain.setValueAtTime(weights[i] || 0.1, now);

        osc.connect(oscGain);
        oscGain.connect(filter);

        // Staggered arpeggiated attack gives the silky "fa-a-a-h" wash
        osc.start(now + i * 0.02);
        osc.stop(now + 1.3);
      });
    } else if (tone === "crystal") {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.16, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } else if (tone === "bell") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignore audio restrictions
  }
}

// Signature notification player with viral #fahhh audio effect
export function playNotificationSound(tone: SoundTone = "fahhh") {
  try {
    if (tone === "fahhh" || tone === "fahhh-7x") {
      const audioUrl = tone === "fahhh-7x" ? "/sounds/fahhh-7x.mp3" : "/sounds/fahhh.mp3";
      const audio = new Audio(audioUrl);
      audio.volume = 0.85;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Fahhh audio playback blocked, falling back to synth:", err);
          playWebAudioSynthesizer("faaah");
        });
      }
      return;
    }

    playWebAudioSynthesizer(tone);
  } catch {
    playWebAudioSynthesizer(tone);
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 30) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export function NotificationCenter({
  onNavigateTab,
  onUnreadChange,
  className = "",
  buttonClassName = "",
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"all" | "orders" | "logins">("all");
  const [soundTone, setSoundTone] = useState<SoundTone>("fahhh");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTone = localStorage.getItem("admin_notification_tone") as string | null;
      if (savedTone) {
        if (savedTone === "faaah" || savedTone === "fahhh") {
          setSoundTone("fahhh");
          localStorage.setItem("admin_notification_tone", "fahhh");
        } else {
          setSoundTone(savedTone as SoundTone);
        }
      }
      const savedMute = localStorage.getItem("admin_notification_sound_enabled");
      if (savedMute !== null) setSoundEnabled(savedMute === "true");
    }
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_notification_sound_enabled", String(next));
    }
    if (next) {
      playNotificationSound(soundTone);
    }
  };

  const handleChangeTone = (tone: SoundTone) => {
    setSoundTone(tone);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_notification_tone", tone);
    }
    playNotificationSound(tone);
  };

  const prevIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications(40);
      const items = data.notifications || [];
      setNotifications(items);
      const unread = data.unreadCount || 0;
      setUnreadCount(unread);
      onUnreadChange?.(unread);

      // Check for brand new notifications (not on initial mount)
      if (!isInitialLoadRef.current) {
        const newUnread = items.filter(
          (n) => !n.isRead && !prevIdsRef.current.has(n.id)
        );

        if (newUnread.length > 0) {
          if (soundEnabled) {
            playNotificationSound(soundTone);
          }

          // Show floating toast for the newest notification
          const latest = newUnread[0];
          let clickAction: (() => void) | undefined;
          if (latest.type === "order_created" && onNavigateTab) {
            clickAction = () => {
              const meta = latest.data ? JSON.parse(latest.data) : null;
              onNavigateTab("orders", meta?.orderNumber);
            };
          } else if ((latest.type === "user_login" || latest.type === "user_registered") && onNavigateTab) {
            clickAction = () => onNavigateTab("customers");
          }

          toast.show({
            type: "info",
            message: `🔔 ${latest.title}: ${latest.message}`,
            onClick: clickAction,
          });
        }
      }

      // Update seen IDs
      prevIdsRef.current = new Set(items.map((n) => n.id));
      isInitialLoadRef.current = false;
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  }, [soundEnabled, onNavigateTab]);

  // Initial fetch and 8-second polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.markNotificationRead(undefined, true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted", "Removed successfully.");
      fetchNotifications();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete", err instanceof Error ? err.message : "Error deleting notification");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    try {
      setLoading(true);
      await api.deleteNotification(undefined, true);
      setNotifications([]);
      setUnreadCount(0);
      toast.success("Notifications cleared", "All notifications have been removed.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear", err instanceof Error ? err.message : "Error clearing notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (item: AdminNotification) => {
    if (!item.isRead) {
      handleMarkRead(item.id);
    }
    let meta: Record<string, any> = {};
    try {
      if (item.data) meta = JSON.parse(item.data);
    } catch {}

    if ((item.type === "order_created" || item.type === "order_cancelled") && onNavigateTab) {
      setIsOpen(false);
      onNavigateTab("orders", meta.orderNumber);
    } else if ((item.type === "user_login" || item.type === "user_registered") && onNavigateTab) {
      setIsOpen(false);
      onNavigateTab("customers");
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "orders") return n.type === "order_created" || n.type === "order_cancelled";
    if (activeFilter === "logins") return n.type === "user_login" || n.type === "user_registered";
    return true;
  });

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex items-center justify-center p-2 rounded-xl transition duration-200 select-none ${
          isOpen
            ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
            : unreadCount > 0
            ? "bg-amber-50 text-[#0b2f8a] border border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-sm"
            : "bg-white text-[#5e6d82] border border-slate-200 hover:text-[#0b2f8a] hover:bg-slate-50"
        } ${buttonClassName}`}
        title={`Notifications (${unreadCount} unread)`}
        aria-label="Open notifications"
      >
        <span className="text-lg leading-none">🔔</span>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md border-2 border-white animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Pulse Dot indicator when unread */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-wide">Live Alerts</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Real-time monitoring active" />
                </div>
                <p className="text-[10px] text-white/70">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All notifications read"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1.5 rounded-lg text-xs transition ${
                  soundEnabled ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                }`}
                title={soundEnabled ? "Chime sound enabled (click to mute)" : "Chime sound muted (click to unmute)"}
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#dfb755] text-[#071c54] hover:bg-[#edd077] transition"
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-[11px] text-white/60 hover:text-rose-300 hover:bg-white/10 transition"
                  title="Clear all notifications"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Sound Controls Bar (Faaah sound preset & Test Sound button) */}
          <div className="px-3.5 py-2 bg-[#061947] border-t border-white/10 flex items-center justify-between text-white text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🎵</span>
              <span className="text-white/80 font-medium">Chime Sound:</span>
              <select
                value={soundTone}
                onChange={(e) => handleChangeTone(e.target.value as SoundTone)}
                className="bg-white/15 text-white font-semibold text-[11px] rounded-lg px-2 py-0.5 outline-none border border-white/20 focus:bg-[#0b2f8a] cursor-pointer"
              >
                <option value="fahhh" className="bg-[#0b2f8a] text-white">🔥 Viral FAHHH! (#fahhh Original)</option>
                <option value="fahhh-7x" className="bg-[#0b2f8a] text-white">📢 FAHHHHH (7x Loud Alert)</option>
                <option value="faaah-synth" className="bg-[#0b2f8a] text-white">✨ Faaah Harmonic Swell Chime</option>
                <option value="crystal" className="bg-[#0b2f8a] text-white">🔔 Crystal Chime</option>
                <option value="bell" className="bg-[#0b2f8a] text-white">🛎️ Temple Bell</option>
                <option value="pop" className="bg-[#0b2f8a] text-white">🫧 Soft Pop</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => playNotificationSound(soundTone)}
              className="px-2.5 py-1 rounded-lg bg-[#dfb755] hover:bg-[#edd077] text-[#071c54] font-bold text-[10px] flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
              title="Click to test the Fahhh notification sound effect"
            >
              <span>▶ Test Sound</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                activeFilter === "all"
                  ? "bg-[#0b2f8a] text-white"
                  : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-slate-200/60"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("orders")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition ${
                activeFilter === "orders"
                  ? "bg-[#0b2f8a] text-white"
                  : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-slate-200/60"
              }`}
            >
              <span>Orders 🛍️</span>
              <span className="text-[9px] opacity-75">
                ({notifications.filter((n) => n.type === "order_created" || n.type === "order_cancelled").length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("logins")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition ${
                activeFilter === "logins"
                  ? "bg-[#0b2f8a] text-white"
                  : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-slate-200/60"
              }`}
            >
              <span>Logins 👤</span>
              <span className="text-[9px] opacity-75">
                ({notifications.filter((n) => n.type === "user_login" || n.type === "user_registered").length})
              </span>
            </button>
          </div>

          {/* Notification List Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <span className="text-3xl block mb-2 opacity-50">✨</span>
                <p className="text-xs font-semibold text-slate-700">No notifications right now</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  When customers place orders or log into the store, live alerts will pop up here instantly.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isOrder = item.type === "order_created";
                const isCancelled = item.type === "order_cancelled";
                const isRegister = item.type === "user_registered";
                const isLogin = item.type === "user_login";

                let meta: Record<string, any> = {};
                try {
                  if (item.data) meta = JSON.parse(item.data);
                } catch {}

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors duration-150 select-none group relative ${
                      !item.isRead
                        ? isCancelled
                          ? "bg-rose-50/60 hover:bg-rose-100/70 border-l-4 border-rose-500"
                          : "bg-amber-50/50 hover:bg-amber-100/60 border-l-4 border-amber-500"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base shadow-sm ${
                        isCancelled
                          ? "bg-rose-100 text-rose-800 border border-rose-300/60"
                          : isOrder
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                          : isRegister
                          ? "bg-purple-100 text-purple-800 border border-purple-300/60"
                          : "bg-blue-100 text-blue-800 border border-blue-300/60"
                      }`}
                    >
                      {isCancelled ? "🛑" : isOrder ? "🛍️" : isRegister ? "🌟" : "👤"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            !item.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                          }`}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-2">
                        {isOrder && meta.orderNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0b2f8a] hover:underline">
                            View Order #{meta.orderNumber} ↗
                          </span>
                        )}
                        {(isLogin || isRegister) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0b2f8a] hover:underline">
                            View Customer Directory ↗
                          </span>
                        )}
                        {!item.isRead && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="absolute top-2.5 right-2 text-slate-300 hover:text-rose-600 hover:bg-slate-100 p-1 rounded-md transition opacity-0 group-hover:opacity-100 text-xs"
                      title="Delete this notification"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-[#5e6d82]">
            <span>Auto-refreshes every 8s</span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateTab("orders");
                }}
                className="font-bold text-[#0b2f8a] hover:underline"
              >
                Go to Orders Desk →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
