"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  api,
  ProductItem,
  AdminSloganItem,
  AdminSloganSettings,
} from "@/lib/api";
import { toast } from "@/lib/toast";

interface WeeklySlogansTabProps {
  products: ProductItem[];
  currentUser?: {
    role?: string;
    name?: string;
  } | null;
  canManage?: boolean;
}

export function WeeklySlogansTab({
  products,
  currentUser,
  canManage = true,
}: WeeklySlogansTabProps) {
  const [loading, setLoading] = useState(true);
  const [slogans, setSlogans] = useState<AdminSloganItem[]>([]);
  const [activeSlogan, setActiveSlogan] = useState<AdminSloganItem | null>(null);
  const [missingNextWeeks, setMissingNextWeeks] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    draft: 0,
    expired: 0,
    totalViews: 0,
    totalClicks: 0,
    totalAddToCart: 0,
  });

  // Settings state
  const [settings, setSettings] = useState<AdminSloganSettings>({
    enabled: true,
    location: "between_categories_bestsellers",
    showCountdown: true,
    showPastArchive: true,
    showShareButton: true,
    showAnnouncementStrip: true,
    autoRotateEnabled: true,
    rotationMode: "sequential",
    fallbackSloganText: "Pure *Desi Ghee*. Pure *Love*. This Week's Kaju Katli.",
    fallbackSubText: "Handcrafted with hand-roasted Goan cashews and 100% pure desi ghee.",
    fallbackProductId: 1,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Sub-tabs: "calendar", "list", "templates", "analytics", "settings"
  const [activeSubTab, setActiveSubTab] = useState<
    "calendar" | "list" | "templates" | "analytics" | "settings"
  >("calendar");

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<{
    message: string;
    conflictSlogan?: any;
  } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    text: "",
    subText: "",
    textHi: "",
    subTextHi: "",
    textGu: "",
    subTextGu: "",
    productId: products[0]?.productId || products[0]?.id || 1,
    customImageUrl: "",
    themeColor: "#dfb755",
    bgStyle: "glass_aurora",
    buttonText: "Shop Sweet of the Week →",
    buttonLink: "",
    storyLine: "",
    badges: ["Pure Desi Ghee", "Handcrafted Daily"],
    startAt: "",
    endAt: "",
    status: "scheduled" as "active" | "scheduled" | "draft" | "expired",
  });
  const [newBadgeInput, setNewBadgeInput] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // AI / Smart Suggestions State
  const [suggestFestival, setSuggestFestival] = useState("all_season");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<
    {
      title: string;
      text: string;
      subText: string;
      themeColor: string;
      category: string;
    }[]
  >([]);

  // Load all slogans & settings
  const loadData = async () => {
    setLoading(true);
    try {
      const [slogansRes, settingsRes] = await Promise.all([
        api.getAdminSlogans(),
        api.getAdminSloganSettings().catch(() => ({ settings: null })),
      ]);

      if (slogansRes) {
        setSlogans(slogansRes.slogans || []);
        setActiveSlogan(slogansRes.activeSlogan || null);
        setMissingNextWeeks(!!slogansRes.missingNextWeeks);
        if (slogansRes.stats) {
          setStats(slogansRes.stats);
        }
      }

      if (settingsRes && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
    } catch (err) {
      console.error("Failed to load slogans data:", err);
      toast.error("Could not load weekly slogans data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Product lookup map
  const productMap = useMemo(() => {
    const map = new Map<number, ProductItem>();
    for (const p of products) {
      const id = p.productId || p.id;
      if (!map.has(id)) map.set(id, p);
    }
    return map;
  }, [products]);

  // Selected product in form
  const selectedProduct = useMemo(() => {
    return productMap.get(formData.productId) || products[0];
  }, [formData.productId, productMap, products]);

  // Helper to find next free week slot without overlapping existing active/scheduled slogans
  const findNextFreeWeek = (preferredOffset?: number) => {
    const now = new Date();
    const day = now.getDay();

    if (typeof preferredOffset === "number") {
      const diffToMonday = (day === 0 ? -6 : 1) - day + preferredOffset * 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMonday);
      mon.setHours(0, 0, 0, 0);

      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return { monday: mon, sunday: sun };
    }

    // Scan forward starting from current week (w = 0) up to 52 weeks
    for (let w = 0; w < 52; w++) {
      const diffToMonday = (day === 0 ? -6 : 1) - day + w * 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMonday);
      mon.setHours(0, 0, 0, 0);

      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const monMs = mon.getTime();
      const sunMs = sun.getTime();

      const occupied = slogans.some((s) => {
        if (s.status !== "active" && s.status !== "scheduled") return false;
        if (!s.startAt || !s.endAt) return false;
        const sStart = new Date(s.startAt).getTime();
        const sEnd = new Date(s.endAt).getTime();
        return !(sunMs <= sStart || monMs >= sEnd);
      });

      if (!occupied) {
        return { monday: mon, sunday: sun };
      }
    }

    // Fallback: Day after latest slogan end date
    let latestEnd = new Date();
    for (const s of slogans) {
      if (s.endAt && (s.status === "active" || s.status === "scheduled")) {
        const d = new Date(s.endAt);
        if (d > latestEnd) latestEnd = d;
      }
    }
    const nextMon = new Date(latestEnd);
    nextMon.setDate(latestEnd.getDate() + 1);
    nextMon.setHours(0, 0, 0, 0);
    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 6);
    nextSun.setHours(23, 59, 59, 999);
    return { monday: nextMon, sunday: nextSun };
  };

  // Open Create Modal
  const openCreateModal = (presetDateOffsetWeeks?: number) => {
    if (!canManage) {
      toast.error("You do not have permission to create or edit slogans");
      return;
    }

    setConflictWarning(null);
    setReplaceExisting(false);

    const { monday, sunday } = findNextFreeWeek(presetDateOffsetWeeks);

    const defaultProd = products[0];
    const initialSlug = defaultProd?.slug || "kaju-katli";

    setEditingId(null);
    setFormData({
      text: "Pure *Desi Ghee*. Pure *Love*. This Week's Special.",
      subText: "Handcrafted fresh this morning in pure Gir cow ghee.",
      textHi: "",
      subTextHi: "",
      textGu: "",
      subTextGu: "",
      productId: defaultProd?.productId || defaultProd?.id || 1,
      customImageUrl: "",
      themeColor: "#dfb755",
      bgStyle: "glass_aurora",
      buttonText: "Shop Sweet of the Week →",
      buttonLink: `/shop/${initialSlug}`,
      storyLine: "Simmered in pure desi ghee every morning in our heritage bhatti.",
      badges: ["100% Desi Ghee", "Handcrafted Daily"],
      startAt: monday.toISOString().slice(0, 16),
      endAt: sunday.toISOString().slice(0, 16),
      status: presetDateOffsetWeeks === 0 ? "active" : "scheduled",
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: AdminSloganItem) => {
    if (!canManage) {
      toast.error("You do not have permission to edit slogans");
      return;
    }
    setConflictWarning(null);
    setReplaceExisting(false);
    setEditingId(item.id);
    let badgesArray: string[] = ["100% Desi Ghee", "Handcrafted Daily"];
    if (item.badges && Array.isArray(item.badges)) {
      badgesArray = item.badges;
    } else if (item.badgesJson) {
      try {
        badgesArray = JSON.parse(item.badgesJson);
      } catch {}
    }

    setFormData({
      text: item.text,
      subText: item.subText || "",
      textHi: item.textHi || "",
      subTextHi: item.subTextHi || "",
      textGu: item.textGu || "",
      subTextGu: item.subTextGu || "",
      productId: item.productId,
      customImageUrl: item.customImageUrl || "",
      themeColor: item.themeColor || "#dfb755",
      bgStyle: item.bgStyle || "glass_aurora",
      buttonText: item.buttonText || "Shop Sweet of the Week →",
      buttonLink: item.buttonLink || "",
      storyLine: item.storyLine || "",
      badges: badgesArray,
      startAt: item.startAt ? new Date(item.startAt).toISOString().slice(0, 16) : "",
      endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
      status: item.status,
    });
    setModalOpen(true);
  };

  // Helper to shift dates to next unoccupied week
  const handleSelectNextFreeWeek = () => {
    const { monday, sunday } = findNextFreeWeek();

    setFormData((p) => ({
      ...p,
      startAt: monday.toISOString().slice(0, 16),
      endAt: sunday.toISOString().slice(0, 16),
      status: "scheduled",
    }));
    setConflictWarning(null);
    toast.info("Shifted dates to next free week slot");
  };

  // Real-time local schedule conflict detection
  const currentConflict = useMemo(() => {
    if (!formData.startAt || !formData.endAt || (formData.status !== "active" && formData.status !== "scheduled")) {
      return null;
    }
    const formStart = new Date(formData.startAt).getTime();
    const formEnd = new Date(formData.endAt).getTime();
    if (isNaN(formStart) || isNaN(formEnd) || formStart >= formEnd) return null;

    return slogans.find((s) => {
      if (editingId && s.id === editingId) return false;
      if (s.status !== "active" && s.status !== "scheduled") return false;
      if (!s.startAt || !s.endAt) return false;
      const sStart = new Date(s.startAt).getTime();
      const sEnd = new Date(s.endAt).getTime();
      return !(formEnd <= sStart || formStart >= sEnd);
    });
  }, [formData.startAt, formData.endAt, formData.status, slogans, editingId]);

  // Handle Save Slogan (Create or Update)
  const handleSaveSlogan = async (e?: React.FormEvent, forceReplace: boolean = false) => {
    if (e) e.preventDefault();
    if (!canManage) return;

    if (!formData.text.trim()) {
      toast.error("Main slogan text is required");
      return;
    }

    const shouldReplace = forceReplace || replaceExisting;

    // Client-side proactive conflict check: prevents 409 or unhandled Dev Overlay popups!
    if (currentConflict && !shouldReplace && (formData.status === "active" || formData.status === "scheduled")) {
      setConflictWarning({
        message: `Schedule conflict: overlaps with existing slogan "${currentConflict.text.replace(/\*/g, "")}" (${new Date(currentConflict.startAt).toLocaleDateString()} - ${new Date(currentConflict.endAt).toLocaleDateString()})`,
        conflictSlogan: currentConflict,
      });
      toast.error("Schedule conflict: Slogan overlaps with an existing week. Choose replace or change date.");
      return;
    }

    setSaving(true);
    setConflictWarning(null);

    const shouldReplace = forceReplace || replaceExisting;

    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        ...formData,
        badgesJson: JSON.stringify(formData.badges),
        replaceExisting: shouldReplace,
      };

      if (editingId) {
        await api.updateAdminSlogan(payload);
        toast.success(shouldReplace ? "Slogan replaced and updated successfully" : "Weekly slogan updated successfully");
      } else {
        await api.createAdminSlogan(payload);
        toast.success(shouldReplace ? "Slogan replaced and scheduled successfully" : "Weekly slogan scheduled successfully");
      }

      setModalOpen(false);
      setReplaceExisting(false);
      setConflictWarning(null);
      await loadData();
    } catch (err: any) {
      console.warn("Save slogan validation/conflict notice:", err?.message || err);

      const msg = err?.message || "";
      if (err?.status === 409 || msg.toLowerCase().includes("conflict") || msg.toLowerCase().includes("overlap")) {
        setConflictWarning({
          message: msg,
          conflictSlogan: err?.data?.conflict,
        });
        toast.error("Schedule conflict: Slogan overlaps with an existing week. Choose replace or change date.");
      } else {
        toast.error(msg || "Failed to save slogan");
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete Slogan
  const handleDelete = async (id: number) => {
    if (!canManage) return;
    if (!confirm("Are you sure you want to delete this weekly slogan?")) return;

    try {
      await api.deleteAdminSlogan(id);
      toast.success("Slogan deleted");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slogan");
    }
  };

  // Quick Action: Publish Immediately (Make Active)
  const handleMakeActiveNow = async (item: AdminSloganItem) => {
    if (!canManage) return;
    try {
      const now = new Date();
      // Set to live from now until next Sunday
      const day = now.getDay();
      const diffToSunday = day === 0 ? 0 : 7 - day;
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + diffToSunday);
      sunday.setHours(23, 59, 59, 999);

      await api.updateAdminSlogan({
        ...item,
        status: "active",
        startAt: now.toISOString(),
        endAt: sunday.toISOString(),
        replaceExisting: true,
      });
      toast.success(`Published "${item.text.replace(/\*/g, "")}" as Live Slogan!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to make active");
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!canManage) return;
    setSavingSettings(true);
    try {
      await api.updateAdminSloganSettings(settings);
      toast.success("Section settings updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Generate Suggestions
  const handleGenerateSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.getAdminSloganSuggestions({
        productId: selectedProduct?.productId || selectedProduct?.id,
        sweetName: selectedProduct?.name,
        festival: suggestFestival,
      });
      if (res && res.suggestions) {
        setSuggestions(res.suggestions);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Apply Suggestion into Form
  const applySuggestion = (sug: { text: string; subText: string; themeColor?: string }) => {
    setFormData((prev) => ({
      ...prev,
      text: sug.text,
      subText: sug.subText,
      themeColor: sug.themeColor || prev.themeColor,
    }));
    toast.success("Applied slogan template to form!");
  };

  // Add Badge tag
  const handleAddBadge = () => {
    if (!newBadgeInput.trim()) return;
    if (formData.badges.length >= 5) {
      toast.error("Maximum 5 badges allowed");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      badges: [...prev.badges, newBadgeInput.trim()],
    }));
    setNewBadgeInput("");
  };

  const handleRemoveBadge = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      badges: prev.badges.filter((_, i) => i !== idx),
    }));
  };

  // Parse highlighted preview tokens
  const previewSegments = formData.text.split(/(\*[^*]+\*)/g).map((seg) => {
    if (seg.startsWith("*") && seg.endsWith("*")) {
      return { text: seg.slice(1, -1), isHighlight: true };
    }
    return { text: seg, isHighlight: false };
  });

  return (
    <div className="space-y-6">
      {/* Read-Only Banner for Non-Managers */}
      {!canManage && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 flex items-center justify-between text-amber-900 text-sm">
          <div className="flex items-center gap-2">
            <span>🔒</span>
            <span className="font-semibold">
              Read-Only Mode: You have viewing access to Weekly Slogans. Owner or Manager role required to create or modify slogans.
            </span>
          </div>
        </div>
      )}

      {/* Warning Banner: Missing next 2 weeks schedule */}
      {missingNextWeeks && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-sm">Action Needed: Slogans Missing for Upcoming Weeks</p>
              <p className="text-xs text-rose-700">
                You have unscheduled weeks ahead. Schedule slogans now so the storefront always has fresh featured sweets.
              </p>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition"
            >
              + Schedule Next Week
            </button>
          )}
        </div>
      )}

      {/* Top Header & Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Live Slogan
          </span>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-1 truncate">
            {activeSlogan ? activeSlogan.text.replace(/\*/g, "") : "Auto-Rotate / Fallback"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Sweet: {activeSlogan?.productName || "Kaju Katli"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Upcoming Weeks
          </span>
          <p className="text-lg sm:text-xl font-bold text-[#140638] mt-1">
            {stats.scheduled} Scheduled
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {stats.draft} drafts saved
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Slogan Views
          </span>
          <p className="text-lg sm:text-xl font-bold text-[#140638] mt-1">
            {stats.totalViews.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {stats.totalClicks} Shop clicks
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Add-to-Box Conversions
          </span>
          <p className="text-lg sm:text-xl font-bold text-[#dfb755] mt-1">
            {stats.totalAddToCart} Sweets
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            From Weekly Slogan
          </p>
        </div>
      </div>

      {/* Sub Navigation Bar & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("calendar")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === "calendar"
                ? "bg-[#140638] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📅 Weekly Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("list")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === "list"
                ? "bg-[#140638] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📋 All Slogans ({slogans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("templates")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === "templates"
                ? "bg-[#140638] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ✨ Ideas &amp; AI Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("analytics")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === "analytics"
                ? "bg-[#140638] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📊 Analytics &amp; CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("settings")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === "settings"
                ? "bg-[#140638] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ⚙️ Display Settings
          </button>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#dfb755] text-[#140638] hover:bg-[#e6c46e] shadow-xs transition"
          >
            <span>+</span>
            <span>New Weekly Slogan</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 1: CALENDAR & TIMELINE
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#140638]">Weekly Schedule Timeline</h3>
              <p className="text-xs text-slate-500">
                Rotates automatically every Monday 12:00 AM IST based on server time.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => openCreateModal(0)}
                className="text-xs font-bold text-[#140638] hover:underline"
              >
                + Schedule for This Week
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slogans.map((item) => {
              const prod = productMap.get(item.productId);
              const isLive = item.status === "active";
              const isScheduled = item.status === "scheduled";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 transition-all duration-200 border relative flex flex-col justify-between ${
                    isLive
                      ? "bg-gradient-to-br from-[#140638] to-[#3b1e54] text-white border-[#dfb755] shadow-lg ring-2 ring-[#dfb755]/40"
                      : "bg-white text-slate-800 border-slate-200/90 shadow-xs hover:shadow-md"
                  }`}
                >
                  {/* Top Bar: Week Label & Status Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                          isLive
                            ? "bg-[#dfb755] text-[#140638]"
                            : isScheduled
                            ? "bg-blue-100 text-blue-800"
                            : item.status === "draft"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isLive ? "● LIVE NOW" : item.status.toUpperCase()}
                      </span>
                      <span className={`text-[11px] font-medium ${isLive ? "text-white/70" : "text-slate-500"}`}>
                        {item.weekLabel || "Weekly Slot"}
                      </span>
                    </div>

                    {/* Featured Sweet Mini Card */}
                    <div className="flex items-center gap-3 p-2 rounded-xl mb-3 bg-black/5 dark:bg-white/5">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <Image
                          src={item.customImageUrl || item.productImageUrl || prod?.imageUrl || "/images/kaju-katli.jpg"}
                          alt={item.productName || "Sweet"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isLive ? "text-white" : "text-[#140638]"}`}>
                          {item.productName || prod?.name || "Sweet of the Week"}
                        </p>
                        <p className={`text-[11px] ${isLive ? "text-[#dfb755]" : "text-slate-500"}`}>
                          ₹{item.productPrice || prod?.price || 0} &bull; {prod?.stock !== undefined && prod.stock <= 0 ? "⚠️ Out of Stock" : "In Stock"}
                        </p>
                      </div>
                    </div>

                    {/* Slogan Text */}
                    <h4 className={`text-sm font-bold line-clamp-2 mb-1.5 ${isLive ? "text-white" : "text-slate-900"}`}>
                      {item.text.replace(/\*/g, "")}
                    </h4>

                    {item.subText && (
                      <p className={`text-xs line-clamp-2 ${isLive ? "text-white/70" : "text-slate-500"}`}>
                        {item.subText}
                      </p>
                    )}
                  </div>

                  {/* Bottom Controls */}
                  <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${isLive ? "border-white/10" : "border-slate-100"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        👁 {item.viewsCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        🛍 {item.addToCartCount || 0}
                      </span>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        {!isLive && (
                          <button
                            type="button"
                            onClick={() => handleMakeActiveNow(item)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            title="Publish Live Now"
                          >
                            Make Live
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                            isLive
                              ? "bg-white/20 text-white hover:bg-white/30"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 2: ALL SLOGANS TABLE VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "list" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Main Slogan</th>
                  <th className="p-3.5">Featured Sweet</th>
                  <th className="p-3.5">Date Range</th>
                  <th className="p-3.5">Views / Clicks</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slogans.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 max-w-xs truncate">
                        {item.text.replace(/\*/g, "")}
                      </p>
                      {item.subText && (
                        <p className="text-[11px] text-slate-500 max-w-xs truncate">
                          {item.subText}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <Image
                            src={item.customImageUrl || item.productImageUrl || "/images/kaju-katli.jpg"}
                            alt={item.productName || "Sweet"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.productName || "Sweet"}</p>
                          <p className="text-[10px] text-slate-500">₹{item.productPrice || 0}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {item.weekLabel || "-"}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{item.viewsCount || 0}</span> views &bull;{" "}
                      <span className="font-bold text-[#dfb755]">{item.clicksCount || 0}</span> clicks
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-right space-x-1">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 3: IDEAS & AI GENERATOR
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "templates" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#140638] to-[#3b1e54] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-[#dfb755]/20 text-[#dfb755] text-xs font-bold uppercase tracking-wider mb-2">
                ✨ AI &amp; SMART SLOGAN GENERATOR
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">
                Generate Weekly Slogans for Any Sweet
              </h3>
              <p className="text-sm text-white/75 mt-1">
                Select one of your sweets and optionally pick a festival or season. Our engine will compose ready-to-use slogans with gold accent highlights.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    Select Sweet
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, productId: Number(e.target.value) }))
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.productId || p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    Occasion / Festival
                  </label>
                  <select
                    value={suggestFestival}
                    onChange={(e) => setSuggestFestival(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  >
                    <option value="all_season" className="text-black">All Season (Freshness &amp; Heritage)</option>
                    <option value="diwali" className="text-black">Diwali (Royal Celebrations)</option>
                    <option value="rakhi" className="text-black">Raksha Bandhan (Sibling Love)</option>
                    <option value="holi" className="text-black">Holi (Colors of Joy)</option>
                    <option value="navratri" className="text-black">Navratri (Dandiya Nights)</option>
                    <option value="uttarayan" className="text-black">Uttarayan (Kai Po Che!)</option>
                    <option value="wedding" className="text-black">Wedding Season (Imperial Gifting)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleGenerateSuggestions}
                    disabled={loadingSuggestions}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#dfb755] text-[#140638] hover:bg-[#e6c46e] transition shadow-md disabled:opacity-50"
                  >
                    {loadingSuggestions ? "Generating..." : "Generate Ideas ✨"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Suggestions Grid */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#140638]">
                Generated Ideas for &quot;{selectedProduct?.name}&quot;:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {sug.category}
                        </span>
                        <div
                          className="w-3.5 h-3.5 rounded-full border"
                          style={{ backgroundColor: sug.themeColor }}
                        />
                      </div>
                      <h5 className="font-bold text-sm text-slate-900 mb-1">
                        {sug.text.replace(/\*/g, "")}
                      </h5>
                      <p className="text-xs text-slate-600">{sug.subText}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Asterisks highlight words in gold
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            applySuggestion(sug);
                            setModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-[#140638] text-white hover:bg-[#200b54] transition"
                        >
                          Use in Slogan &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 4: ANALYTICS & CSV
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "analytics" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#140638]">Slogan Performance Leaderboard</h3>
              <p className="text-xs text-slate-500">
                Track which slogans and featured sweets drive the highest engagement and sales.
              </p>
            </div>
            <a
              href={api.getAdminSlogansExportUrl()}
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
            >
              <span>📥</span>
              <span>Export CSV Report</span>
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Slogan &amp; Sweet</th>
                  <th className="p-3.5">Views</th>
                  <th className="p-3.5">Clicks</th>
                  <th className="p-3.5">CTR</th>
                  <th className="p-3.5">Add to Bag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slogans
                  .slice()
                  .sort((a, b) => (b.addToCartCount || 0) - (a.addToCartCount || 0))
                  .map((item, index) => {
                    const ctr =
                      item.viewsCount && item.viewsCount > 0
                        ? (((item.clicksCount || 0) / item.viewsCount) * 100).toFixed(1)
                        : "0.0";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 whitespace-nowrap font-bold text-slate-400">
                          #{index + 1}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">
                            {item.text.replace(/\*/g, "")}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {item.productName || "Sweet"} &bull; {item.weekLabel}
                          </p>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono">{item.viewsCount || 0}</td>
                        <td className="p-3.5 whitespace-nowrap font-mono">{item.clicksCount || 0}</td>
                        <td className="p-3.5 whitespace-nowrap font-bold text-emerald-600">
                          {ctr}%
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-extrabold text-[#dfb755]">
                          {item.addToCartCount || 0} units
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 5: DISPLAY SETTINGS
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "settings" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs max-w-3xl space-y-6">
          <div>
            <h3 className="font-bold text-base text-[#140638]">Storefront Slogan Settings</h3>
            <p className="text-xs text-slate-500">
              Control section visibility, homepage positioning, rotation behavior, and fallback content.
            </p>
          </div>

          <div className="space-y-4">
            {/* Enable/Disable Section Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-900">Enable Weekly Slogan Section</p>
                <p className="text-xs text-slate-500">
                  When turned on, the glass banner displays on your storefront homepage.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings((p) => ({ ...p, enabled: e.target.checked }))}
                disabled={!canManage}
                className="h-5 w-5 rounded-md accent-[#dfb755]"
              />
            </div>

            {/* Placement location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Homepage Placement Location
              </label>
              <select
                value={settings.location}
                onChange={(e) => setSettings((p) => ({ ...p, location: e.target.value }))}
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
              >
                <option value="between_categories_bestsellers">
                  Between Categories and Best Sellers (Recommended)
                </option>
                <option value="below_hero">Below Hero Carousel</option>
                <option value="above_footer">Above Footer</option>
              </select>
            </div>

            {/* Feature Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showCountdown}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, showCountdown: e.target.checked }))
                  }
                  disabled={!canManage}
                  className="h-4 w-4 accent-[#dfb755]"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Show Live Countdown Timer
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPastArchive}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, showPastArchive: e.target.checked }))
                  }
                  disabled={!canManage}
                  className="h-4 w-4 accent-[#dfb755]"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Show &quot;Past Slogans&quot; Archive Link
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showShareButton}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, showShareButton: e.target.checked }))
                  }
                  disabled={!canManage}
                  className="h-4 w-4 accent-[#dfb755]"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Show WhatsApp Share Button
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRotateEnabled}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, autoRotateEnabled: e.target.checked }))
                  }
                  disabled={!canManage}
                  className="h-4 w-4 accent-[#dfb755]"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Auto-Rotate Library When Empty
                </span>
              </label>
            </div>

            {/* Fallback Slogan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fallback Slogan (Used if no slogan is scheduled for a week)
              </label>
              <input
                type="text"
                value={settings.fallbackSloganText}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, fallbackSloganText: e.target.value }))
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
              />
            </div>

            {canManage && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#140638] text-white hover:bg-[#200b54] transition shadow-xs disabled:opacity-50"
                >
                  {savingSettings ? "Saving Settings..." : "Save Settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CREATE / EDIT SLOGAN MODAL WITH LIVE PREVIEW
         ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-lg text-[#140638]">
                  {editingId ? "Edit Weekly Slogan" : "Schedule New Weekly Slogan"}
                </h3>
                <p className="text-xs text-slate-500">
                  Mark words with *asterisks* (e.g. Pure *Desi Ghee*) to highlight them in warm gold.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns on desktop (Left: Form, Right: Live Interactive Preview) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-5">
              
              {/* Left Column (7 cols): Slogan Form */}
              <form onSubmit={handleSaveSlogan} className="lg:col-span-7 space-y-4">
                {/* Main Slogan Field with Live Character Counter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Main Slogan Text <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        formData.text.length > 70 ? "text-rose-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {formData.text.length}/70 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.text}
                    onChange={(e) => setFormData((p) => ({ ...p, text: e.target.value }))}
                    placeholder="e.g. Pure *Kaju*. Pure *Elegance*. This Week's Kaju Katli."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-medium focus:border-[#dfb755] focus:outline-hidden"
                  />
                </div>

                {/* Sub-slogan / Supporting Line */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Sub-Slogan / Supporting Line (Optional)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formData.subText.length}/130 chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={formData.subText}
                    onChange={(e) => setFormData((p) => ({ ...p, subText: e.target.value }))}
                    placeholder="e.g. Handcrafted from 100% premium whole Goan cashews and finished with royal silver vark."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#dfb755] focus:outline-hidden"
                  />
                </div>

                {/* Multilingual Translations Accordion */}
                <details className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-xs">
                  <summary className="font-bold text-slate-700 cursor-pointer select-none">
                    🌐 Language Translations (Hindi &amp; Gujarati)
                  </summary>
                  <div className="space-y-3 mt-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Hindi Slogan (हिन्दी)
                      </label>
                      <input
                        type="text"
                        value={formData.textHi}
                        onChange={(e) => setFormData((p) => ({ ...p, textHi: e.target.value }))}
                        placeholder="शुद्ध *काजू*। शुद्ध *स्वाद*। इस सप्ताह की काजू कतली।"
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Gujarati Slogan (ગુજરાતી)
                      </label>
                      <input
                        type="text"
                        value={formData.textGu}
                        onChange={(e) => setFormData((p) => ({ ...p, textGu: e.target.value }))}
                        placeholder="શુદ્ધ *કાજુ*. શુદ્ધ *મિઠાશ*. આ અઠવાડિયાની કાજુ કતલી."
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                      />
                    </div>
                  </div>
                </details>

                {/* Featured Sweet Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Featured Sweet of the Week
                    </label>
                    <select
                      value={formData.productId}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        const prod = productMap.get(pid);
                        setFormData((p) => ({
                          ...p,
                          productId: pid,
                          buttonLink: prod?.slug ? `/shop/${prod.slug}` : p.buttonLink,
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.productId || p.id}>
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Theme Accent Color */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Theme Glow Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.themeColor}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, themeColor: e.target.value }))
                        }
                        className="h-9 w-12 rounded-lg cursor-pointer border border-slate-200"
                      />
                      <input
                        type="text"
                        value={formData.themeColor}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, themeColor: e.target.value }))
                        }
                        className="w-28 rounded-lg border border-slate-300 p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Start Date & End Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Start Date (Monday 12:00 AM IST)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startAt}
                      onChange={(e) => setFormData((p) => ({ ...p, startAt: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      End Date (Sunday 11:59 PM IST)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endAt}
                      onChange={(e) => setFormData((p) => ({ ...p, endAt: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                {/* Real-time schedule overlap warning */}
                {currentConflict ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-amber-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-amber-950">Schedule Overlap Detected</p>
                        <p className="text-[11.5px] text-amber-800 leading-snug mt-0.5">
                          This slot overlaps with <strong className="font-semibold text-amber-950">&quot;{currentConflict.text.replace(/\*/g, "")}&quot;</strong> ({new Date(currentConflict.startAt).toLocaleDateString()} – {new Date(currentConflict.endAt).toLocaleDateString()}).
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-200">
                      <label className="flex items-center gap-2 text-xs text-amber-950 font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={replaceExisting}
                          onChange={(e) => setReplaceExisting(e.target.checked)}
                          className="rounded text-[#140638] focus:ring-[#dfb755]"
                        />
                        <span>Replace existing slogan (moves previous to Draft)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectNextFreeWeek}
                        className="px-2.5 py-1 rounded-md bg-white border border-amber-300 text-[11px] font-bold text-amber-900 hover:bg-amber-100/50 cursor-pointer"
                      >
                        Shift to Free Week &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={(e) => setReplaceExisting(e.target.checked)}
                        className="rounded text-[#140638] focus:ring-[#dfb755]"
                      />
                      <span>Replace existing slogan if this week is already booked</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectNextFreeWeek}
                      className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                    >
                      Find Next Open Week &rarr;
                    </button>
                  </div>
                )}

                {/* Story Line & Badges */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Short Story Line (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.storyLine}
                    onChange={(e) => setFormData((p) => ({ ...p, storyLine: e.target.value }))}
                    placeholder="e.g. A heritage recipe made in small batches every sunrise."
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                {/* Badges List */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    &quot;Why We Love It&quot; Badges
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.badges.map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border"
                      >
                        <span>{b}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBadge(i)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBadgeInput}
                      onChange={(e) => setNewBadgeInput(e.target.value)}
                      placeholder="Add badge (e.g. 100% Pure Ghee)"
                      className="flex-1 rounded-lg border border-slate-300 p-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddBadge}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Schedule Status
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="scheduled"
                        checked={formData.status === "scheduled"}
                        onChange={() => setFormData((p) => ({ ...p, status: "scheduled" }))}
                      />
                      <span>Scheduled</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === "active"}
                        onChange={() => setFormData((p) => ({ ...p, status: "active" }))}
                      />
                      <span className="text-emerald-700 font-bold">Active (Live Now)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={formData.status === "draft"}
                        onChange={() => setFormData((p) => ({ ...p, status: "draft" }))}
                      />
                      <span>Draft</span>
                    </label>
                  </div>
                </div>

                {/* Conflict Alert Banner if server returned 409 */}
                {conflictWarning && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-3.5 text-xs shadow-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base text-amber-700">⚠️</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-amber-900">Schedule Conflict</p>
                        <p className="text-amber-800 text-[11.5px] mt-0.5 leading-relaxed">
                          {conflictWarning.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-amber-200/80">
                      <button
                        type="button"
                        onClick={() => handleSaveSlogan(undefined, true)}
                        className="px-3 py-1.5 rounded-lg bg-[#140638] text-[#dfb755] font-bold hover:bg-[#250d54] cursor-pointer shadow-xs text-xs"
                      >
                        ✓ Replace &amp; Publish Slogan
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectNextFreeWeek}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        Shift to Next Free Week
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, status: "draft" }));
                          setConflictWarning(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        Save as Draft
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded-xl text-xs font-bold bg-[#140638] text-white hover:bg-[#200b54] shadow-md disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Update Slogan" : "Schedule Slogan"}
                  </button>
                </div>
              </form>

              {/* Right Column (5 cols): Live Interactive Preview */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Storefront Preview
                  </span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`px-2 py-0.5 rounded-md ${
                        previewDevice === "desktop" ? "bg-white shadow-xs text-[#140638]" : "text-slate-500"
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`px-2 py-0.5 rounded-md ${
                        previewDevice === "mobile" ? "bg-white shadow-xs text-[#140638]" : "text-slate-500"
                      }`}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Rendered Preview Card */}
                <div
                  className={`w-full rounded-3xl p-5 text-white shadow-xl relative overflow-hidden transition-all duration-300 border border-white/20 ${
                    previewDevice === "mobile" ? "max-w-[340px]" : "max-w-full"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, rgba(20, 6, 56, 0.94) 0%, rgba(59, 30, 84, 0.92) 100%)`,
                    boxShadow: `0 12px 32px -8px ${formData.themeColor}30`,
                  }}
                >
                  {/* Dynamic Aurora Glow */}
                  <div
                    className="absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40 pointer-events-none"
                    style={{ backgroundColor: formData.themeColor }}
                  />

                  {/* Header Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/15 text-[#dfb755] border border-[#dfb755]/30">
                      SLOGAN OF THE WEEK
                    </span>
                  </div>

                  {/* Slogan Title */}
                  <h4 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold leading-snug mb-2">
                    {previewSegments.map((seg, idx) =>
                      seg.isHighlight ? (
                        <span key={idx} className="text-[#dfb755] font-extrabold mx-0.5">
                          {seg.text}
                        </span>
                      ) : (
                        <span key={idx}>{seg.text}</span>
                      )
                    )}
                  </h4>

                  {formData.subText && (
                    <p className="text-white/80 text-xs line-clamp-2 mb-3">
                      {formData.subText}
                    </p>
                  )}

                  {/* Sweet Photo Card */}
                  <div className="rounded-2xl bg-white/10 p-2.5 border border-white/15 flex items-center gap-3 mb-3">
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-black/20 shrink-0">
                      <Image
                        src={selectedProduct?.imageUrl || "/images/kaju-katli.jpg"}
                        alt={selectedProduct?.name || "Sweet"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-300">
                        ✨ Made Fresh This Week
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {selectedProduct?.name || "Sweet"}
                      </p>
                      <p className="text-xs font-bold text-[#dfb755]">
                        ₹{selectedProduct?.price || 0}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    className="w-full rounded-full py-2 px-4 text-xs font-bold uppercase tracking-wider bg-[#dfb755] text-[#140638] shadow-md"
                  >
                    {formData.buttonText || "Shop Sweet of the Week →"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
