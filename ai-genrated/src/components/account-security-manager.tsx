"use client";

import { useState } from "react";

export function AccountSecurityManager({
  hasPassword = true,
}: {
  hasPassword?: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (hasPassword && !currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update password.");
        return;
      }

      setSuccess("✓ Password updated successfully! Your account is now secured.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsExpanded(false);
    } catch {
      setError("Network error while changing password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#2a1a12]/10 bg-white/95 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d] flex items-center gap-2">
            <span>🔒</span>
            <span>Account Security & Password</span>
          </h3>
          <p className="text-xs text-[#2a1a12]/70 mt-0.5">
            {hasPassword
              ? "Update your password regularly to keep your sweet mart orders and reward points safe."
              : "Set a password so you can log into your account using both OTP and password."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(!isExpanded);
            setError("");
            setSuccess("");
          }}
          className="shrink-0 rounded-full bg-[#0b2f8a] hover:bg-[#082266] text-white font-bold px-4 py-2 text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <span>🔑</span>
          <span>{isExpanded ? "Close Form" : hasPassword ? "Change Password" : "Set Password"}</span>
        </button>
      </div>

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-[#2a1a12]/10 space-y-4 max-w-lg">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {hasPassword && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2a1a12]/70 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2a1a12]/20 bg-white text-xs text-[#2a1a12] outline-none focus:border-[#c45c26]"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2a1a12]/70 mb-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2a1a12]/20 bg-white text-xs text-[#2a1a12] outline-none focus:border-[#c45c26]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2a1a12]/70 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2a1a12]/20 bg-white text-xs text-[#2a1a12] outline-none focus:border-[#c45c26]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#c45c26] hover:bg-[#a64a1b] text-white font-bold px-5 py-2 text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? "Updating Password..." : "Save Password ✓"}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-[#2a1a12]/60 hover:text-[#2a1a12] underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
