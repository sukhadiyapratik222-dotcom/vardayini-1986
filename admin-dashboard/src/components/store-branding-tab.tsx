"use client";

import { useState, useEffect } from "react";
import { UiConfig, api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ImagePickerField } from "@/components/image-picker-field";
import { getPublicStoreUrl } from "@/lib/store-url";

interface StoreBrandingTabProps {
  config: UiConfig | null;
  onRefresh: () => void;
}

const CREST_COLOR_PRESETS = [
  { name: "Royal Navy Blue", bg: "#0b2f8a", border: "#dfb755", text: "#dfb755" },
  { name: "Deep Royal Maroon", bg: "#6b1124", border: "#dfb755", text: "#dfb755" },
  { name: "Imperial Emerald", bg: "#064e3b", border: "#dfb755", text: "#dfb755" },
  { name: "Heritage Midnight", bg: "#071330", border: "#f59e0b", text: "#ffffff" },
  { name: "Saffron Gold", bg: "#b45309", border: "#fef08a", text: "#ffffff" },
  { name: "Classic Noir Gold", bg: "#0f172a", border: "#dfb755", text: "#dfb755" },
];

export function StoreBrandingTab({ config, onRefresh }: StoreBrandingTabProps) {
  // Logo State
  const [logoType, setLogoType] = useState<"crest" | "image">(config?.logo?.type ?? "crest");
  const [crestLetter, setCrestLetter] = useState(config?.logo?.crestLetter ?? "વ");
  const [crestBgColor, setCrestBgColor] = useState(config?.logo?.crestBgColor ?? "#0b2f8a");
  const [crestBorderColor, setCrestBorderColor] = useState(config?.logo?.crestBorderColor ?? "#dfb755");
  const [crestTextColor, setCrestTextColor] = useState(config?.logo?.crestTextColor ?? "#dfb755");
  const [logoImageUrl, setLogoImageUrl] = useState(config?.logo?.imageUrl ?? "/images/brand-logo.png");
  const [brandName, setBrandName] = useState(config?.logo?.brandName ?? "VARDAYINI");
  const [brandSubtitle, setBrandSubtitle] = useState(
    config?.logo?.brandSubtitle ?? `Sweet Mart · ${config?.storeInfo?.established || "1976"}`
  );

  // Store Info State
  const [storeName, setStoreName] = useState(config?.storeInfo?.name ?? "Vardayini Sweet Mart");
  const [tagline, setTagline] = useState(
    config?.storeInfo?.tagline ?? "Pure Ghee Gujarati Mithai & Live Morning Farsan"
  );
  const [established, setEstablished] = useState(config?.storeInfo?.established ?? "1976");
  const [phone, setPhone] = useState(config?.storeInfo?.phone ?? "+91 98250 12345");
  const [whatsapp, setWhatsapp] = useState(config?.storeInfo?.whatsapp ?? "+91 98250 12345");
  const [email, setEmail] = useState(config?.storeInfo?.email ?? "orders@vardayini.com");
  const [address, setAddress] = useState(
    config?.storeInfo?.address ?? "Opp. Swaminarayan Temple, Station Road, Anand, Gujarat 388001"
  );
  const [city, setCity] = useState(config?.storeInfo?.city ?? "Anand, Gujarat");
  const [hours, setHours] = useState(config?.storeInfo?.hours ?? "7:00 AM – 10:30 PM (All 7 Days)");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (config?.logo) {
        setLogoType(config.logo.type ?? "crest");
        setCrestLetter(config.logo.crestLetter ?? "વ");
        setCrestBgColor(config.logo.crestBgColor ?? "#0b2f8a");
        setCrestBorderColor(config.logo.crestBorderColor ?? "#dfb755");
        setCrestTextColor(config.logo.crestTextColor ?? "#dfb755");
        setLogoImageUrl(config.logo.imageUrl ?? "/images/brand-logo.png");
        setBrandName(config.logo.brandName ?? "VARDAYINI");
        setBrandSubtitle(config.logo.brandSubtitle ?? `Sweet Mart · ${config.storeInfo?.established || "1976"}`);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [config]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await api.updateUiConfig({
        logo: {
          type: logoType,
          crestLetter,
          crestBgColor,
          crestBorderColor,
          crestTextColor,
          imageUrl: logoImageUrl,
          brandName,
          brandSubtitle,
        },
        storeInfo: {
          name: storeName,
          tagline,
          established,
          phone,
          whatsapp,
          email,
          address,
          city,
          hours,
        },
      });
      toast.success("Logo and brand details updated successfully!");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update logo. Ensure storefront server is running.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b2f8a]/10 text-[#0b2f8a] text-xs font-bold uppercase tracking-wider mb-2">
            <span>✨ Logo &amp; Identity Studio</span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2f8a]">
            Change Store Logo &amp; Brand Identity
          </h2>
          <p className="text-xs text-[#5e6d82] mt-1">
            Customize the circular crest logo, Gujarati letter, brand colors, and company details displayed in the storefront navbar.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-6 py-3 rounded-xl font-bold text-xs bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Publish Logo"}
        </button>
      </div>

      {/* 1. REAL-TIME LIVE LOGO PREVIEW */}
      <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/15 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-[#0b2f8a] flex items-center gap-2">
            <span>👁️</span> Live Navbar Logo Preview (Exact Render on {getPublicStoreUrl()})
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Updates in real time</span>
        </div>

        {/* Navbar Preview Replica Bar */}
        <div className="p-4 rounded-xl bg-[#fdfcfa] border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            {logoType === "image" && logoImageUrl ? (
              <div className="relative h-12 w-12 rounded-full overflow-hidden border border-[#dfb755]/60 shadow-md">
                <img src={logoImageUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-full p-0.5 shadow-md transition-all"
                style={{
                  background: `linear-gradient(135deg, ${crestBorderColor}, #b89130)`,
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-full text-white shadow-inner"
                  style={{ backgroundColor: crestBgColor }}
                >
                  <span
                    className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
                    style={{ color: crestTextColor }}
                  >
                    {crestLetter || "વ"}
                  </span>
                </div>
              </div>
            )}

            {/* Brand Text */}
            <div className="text-left">
              <span className="block font-[family-name:var(--font-display)] text-2xl font-bold leading-none tracking-tight text-[#0b2f8a]">
                {brandName || "VARDAYINI"}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b89130]">
                {brandSubtitle || "Sweet Mart · 1976"}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Preview in header context</span>
          </div>
        </div>
      </div>

      {/* 2. LOGO CONFIGURATION CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Logo Style & Colors */}
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#0b2f8a] flex items-center gap-2 pb-2 border-b border-slate-100">
            <span>🎨</span> Logo Type &amp; Crest Styling
          </h3>

          {/* Type Toggle: Crest Badge vs Image */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setLogoType("crest")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                logoType === "crest"
                  ? "bg-white text-[#0b2f8a] shadow-sm"
                  : "text-slate-600 hover:text-[#0b2f8a]"
              }`}
            >
              👑 Royal Crest Badge (Letter)
            </button>
            <button
              type="button"
              onClick={() => setLogoType("image")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                logoType === "image"
                  ? "bg-white text-[#0b2f8a] shadow-sm"
                  : "text-slate-600 hover:text-[#0b2f8a]"
              }`}
            >
              🖼️ Custom Image Logo
            </button>
          </div>

          {logoType === "crest" ? (
            <div className="space-y-4">
              {/* Crest Character / Letter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {'Crest Character / Initial (e.g. Gujarati "વ", "V", "શ્રી")'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={crestLetter}
                    onChange={(e) => setCrestLetter(e.target.value)}
                    maxLength={3}
                    placeholder="વ"
                    className="w-24 px-3.5 py-2 text-center text-lg font-bold rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a]"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["વ", "V", "શ્રી", "ૐ", "સ"].map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => setCrestLetter(char)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                          crestLetter === char
                            ? "bg-[#0b2f8a] text-white border-[#0b2f8a]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Quick Royal Color Schemes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CREST_COLOR_PRESETS.map((scheme) => (
                    <button
                      key={scheme.name}
                      type="button"
                      onClick={() => {
                        setCrestBgColor(scheme.bg);
                        setCrestBorderColor(scheme.border);
                        setCrestTextColor(scheme.text);
                      }}
                      className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-left flex items-center gap-2.5 transition"
                    >
                      <span
                        className="w-5 h-5 rounded-full border shadow-sm shrink-0"
                        style={{ backgroundColor: scheme.bg, borderColor: scheme.border }}
                      />
                      <span className="text-[11px] font-semibold text-slate-800 truncate">
                        {scheme.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={crestBgColor}
                      onChange={(e) => setCrestBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={crestBgColor}
                      onChange={(e) => setCrestBgColor(e.target.value)}
                      className="w-full text-[11px] font-mono p-1 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Border / Rim Gold
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={crestBorderColor}
                      onChange={(e) => setCrestBorderColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={crestBorderColor}
                      onChange={(e) => setCrestBorderColor(e.target.value)}
                      className="w-full text-[11px] font-mono p-1 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Letter Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={crestTextColor}
                      onChange={(e) => setCrestTextColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={crestTextColor}
                      onChange={(e) => setCrestTextColor(e.target.value)}
                      className="w-full text-[11px] font-mono p-1 border rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <ImagePickerField
                label="Custom Brand Logo Image"
                value={logoImageUrl}
                onChange={(url) => setLogoImageUrl(url)}
                helperText="Upload your store logo file (.png, .jpg, .webp), choose from brand presets, or paste a URL."
                presetFilter="Logo"
              />
            </div>
          )}
        </div>

        {/* Right: Brand Text Beside Logo */}
        <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#0b2f8a] flex items-center gap-2 pb-2 border-b border-slate-100">
            <span>✍️</span> Brand Name &amp; Subtitle
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Primary Brand Name (Main Text)
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="VARDAYINI"
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Subtitle Line (Year &amp; Category)
            </label>
            <input
              type="text"
              value={brandSubtitle}
              onChange={(e) => setBrandSubtitle(e.target.value)}
              placeholder="Sweet Mart · 1976"
              className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 outline-none focus:border-[#0b2f8a]"
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-[#dfb755] hover:bg-[#c99f3b] text-[#071c54] shadow-md transition"
            >
              {saving ? "Saving Changes..." : "Apply Logo & Brand Changes Live"}
            </button>
          </div>
        </div>
      </div>

      {/* 3. STORE CONTACT & GENERAL INFO */}
      <div className="p-6 rounded-2xl bg-white border border-[#0b2f8a]/10 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[#0b2f8a] flex items-center gap-2 pb-2 border-b border-slate-100">
          <span>📞</span> Store Contact &amp; Operating Hours
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              WhatsApp Ordering
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Store City / Region
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Store Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Operating Hours
            </label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-sm"
          >
            {saving ? "Saving..." : "Save Store Details"}
          </button>
        </div>
      </div>
    </div>
  );
}
