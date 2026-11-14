"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  memberSince: string;
}

export function AccountProfileManager({
  initialProfile,
}: {
  initialProfile: ProfileData;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(
    initialProfile.name.startsWith("Patron ") ? "" : initialProfile.name
  );
  const [email, setEmail] = useState(
    initialProfile.email.endsWith("@patron.vardayini.com") ? "" : initialProfile.email
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isPlaceholderName = !profile.name || profile.name.startsWith("Patron ");
  const isPlaceholderEmail = !profile.email || profile.email.endsWith("@patron.vardayini.com");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
        return;
      }

      setProfile((prev) => ({
        ...prev,
        name: cleanName,
        email: cleanEmail || prev.email,
      }));
      setSuccessMsg("✓ Customer profile updated successfully!");
      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Network error while updating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const userInitial = (profile.name || "V")[0]?.toUpperCase() || "V";

  return (
    <div className="space-y-4">
      {/* Incomplete profile alert notice */}
      {isPlaceholderName && !isEditing && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Incomplete Profile Information
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your account is currently set as <strong className="font-bold">{profile.name}</strong>. Add your full name and email so invoices and orders show your genuine name.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="shrink-0 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 text-xs transition shadow-xs cursor-pointer"
          >
            Update Name Now ✍️
          </button>
        </div>
      )}

      {/* Global Toast */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="text-emerald-700 hover:underline font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Profile Card Header */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Royal Crest Avatar */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dfb755] to-[#b89130] p-0.5 shadow-lg">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#0b2f8a] text-white font-[family-name:var(--font-display)] text-3xl font-black text-[#dfb755]">
              {userInitial}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#dfb755]/20 text-[#dfb755] border border-[#dfb755]/40">
                {profile.role === "super_admin"
                  ? "👑 Super Admin"
                  : profile.role === "admin"
                  ? "Store Admin"
                  : "Royal Customer Member"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Verified Account
              </span>
            </div>

            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>{profile.name}</span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setName(profile.name.startsWith("Patron ") ? "" : profile.name);
                    setEmail(profile.email.endsWith("@patron.vardayini.com") ? "" : profile.email);
                    setIsEditing(true);
                  }}
                  className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-medium text-white transition flex items-center gap-1 cursor-pointer"
                  title="Edit customer profile"
                >
                  <span>✏️</span>
                  <span>Edit</span>
                </button>
              )}
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-white/80 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                ✉️ {isPlaceholderEmail ? "No email provided" : profile.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">📞 +91 {profile.phone}</span>
              <span>•</span>
              <span className="text-white/60">Member since {profile.memberSince}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Inline Edit Form */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          className="mt-6 rounded-2xl bg-white/10 backdrop-blur-md p-5 border border-white/20 text-white space-y-4 shadow-inner"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <h3 className="text-sm font-bold text-[#dfb755] flex items-center gap-1.5">
              <span>👤</span> Edit Customer Information
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError("");
              }}
              className="text-xs text-white/70 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-300/50 bg-rose-900/60 p-2.5 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-white/90 mb-1">
                Full Name <span className="text-amber-300">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pratik Patel"
                required
                autoFocus
                className="w-full rounded-xl border border-white/30 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40 focus:border-[#dfb755] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/90 mb-1">
                Email Address <span className="text-xs font-normal text-white/60">(Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. pratik@example.com"
                className="w-full rounded-xl border border-white/30 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40 focus:border-[#dfb755] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/60 mb-1">
              Verified Mobile Number (Permanent)
            </label>
            <input
              type="text"
              disabled
              value={`+91 ${profile.phone}`}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/50 cursor-not-allowed font-mono"
            />
            <p className="text-[11px] text-white/50 mt-1">
              Mobile number is verified via OTP and serves as your primary customer ID.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#dfb755] hover:bg-[#c99f3b] text-[#0b2f8a] font-bold px-5 py-2 text-xs transition shadow-sm cursor-pointer"
            >
              {loading ? "Saving Changes..." : "Save Profile Details ✓"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError("");
              }}
              className="text-xs text-white/70 hover:text-white underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
