"use client";

import { useEffect, useState } from "react";
import { api, SessionItem, SecurityHistoryItem } from "@/lib/api";
import { toast } from "@/lib/toast";

interface SecuritySessionsViewProps {
  currentUserId?: number;
  currentUserRole?: string;
}

export function SecuritySessionsView({
  currentUserId,
  currentUserRole,
}: SecuritySessionsViewProps) {
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorUrl, setTwoFactorUrl] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [submitting2fa, setSubmitting2fa] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // History state
  const [history, setHistory] = useState<SecurityHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch 2FA status
  const fetch2FAStatus = async () => {
    try {
      const res = await api.getTwoFactorStatus();
      setTwoFactorEnabled(res.enabled);
      setTwoFactorSecret(res.secret || "");
      setTwoFactorUrl(res.otpAuthUrl || null);
    } catch (err: unknown) {
      console.error("Failed to load 2FA status:", err);
    }
  };

  // Fetch Active Sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.getActiveSessions();
      setSessions(res.sessions || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load active sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  // Fetch Security History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getSecurityHistory();
      setHistory(res.history || []);
    } catch (err: unknown) {
      console.error("Failed to load security history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetch2FAStatus();
    fetchSessions();
    fetchHistory();
  }, []);

  // Handle Enable 2FA
  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyToken || verifyToken.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit authentication code");
      return;
    }
    setSubmitting2fa(true);
    try {
      const res = await api.updateTwoFactor({
        action: "enable",
        secret: twoFactorSecret,
        token: verifyToken.trim(),
      });
      toast.success(res.message || "Two-factor authentication enabled successfully!");
      setIsSetupModalOpen(false);
      setVerifyToken("");
      fetch2FAStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid verification code. Please try again.");
    } finally {
      setSubmitting2fa(false);
    }
  };

  // Handle Disable 2FA
  const handleDisable2FA = async () => {
    if (!confirm("Are you sure you want to disable two-factor authentication? This reduces account security.")) {
      return;
    }
    setSubmitting2fa(true);
    try {
      const res = await api.updateTwoFactor({ action: "disable" });
      toast.success(res.message || "Two-factor authentication disabled.");
      fetch2FAStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setSubmitting2fa(false);
    }
  };

  // Handle Revoke Session
  const handleRevokeSession = async (id: number) => {
    if (!confirm("Are you sure you want to terminate this active session? The user will need to log in again.")) {
      return;
    }
    setRevokingId(id);
    try {
      const res = await api.revokeSession(id);
      toast.success(res.message || "Session revoked successfully.");
      fetchSessions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 2FA Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              twoFactorEnabled ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}>
              {twoFactorEnabled ? "🔒" : "⚠️"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication (TOTP)</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  twoFactorEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {twoFactorEnabled ? "ENABLED & SECURE" : "NOT CONFIGURED"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Add an extra layer of defense to administrative accounts using Google Authenticator, Authy, or any standard RFC 6238 TOTP authenticator app.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {twoFactorEnabled ? (
              <button
                onClick={handleDisable2FA}
                disabled={submitting2fa}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition disabled:opacity-50"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0b2f8a] hover:bg-[#082266] shadow-sm transition"
              >
                Setup 2FA Authenticator
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🖥️</span>
              <span>Active Admin Sessions</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live authenticated device tokens with immediate remote session revocation.
            </p>
          </div>
          <button
            onClick={fetchSessions}
            disabled={loadingSessions}
            className="text-xs font-medium text-[#0b2f8a] hover:underline disabled:opacity-50"
          >
            {loadingSessions ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Device / User Agent</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingSessions ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading active sessions...</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No active external sessions found.</td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.userName || "Admin User"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.userEmail || `User #${s.userId}`}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px]">
                        {s.userRole || "admin"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={s.userAgent || "Browser"}>
                      {s.userAgent || "Desktop Browser"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Active"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={revokingId === s.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
                      >
                        {revokingId === s.id ? "Revoking..." : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security History / Audit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📜</span>
              <span>Login & Security Activity History</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited authentication attempts, IP addresses, and security outcomes.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="text-xs font-medium text-[#0b2f8a] hover:underline disabled:opacity-50"
          >
            {loadingHistory ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Account Email</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingHistory ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading security history...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No recent security events logged.</td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {h.email}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {h.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        h.status === "success"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {h.reason || "Authenticated"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📱</span>
                  <span>Set Up Authenticator App</span>
                </h3>
                <button
                  onClick={() => setIsSetupModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Scan the setup details or enter the secret key into your authenticator application (Google Authenticator, Microsoft Authenticator, 1Password).
              </p>
            </div>

            <form onSubmit={handleEnable2FA} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Manual Entry Secret Key:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={twoFactorSecret}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-[#0b2f8a] tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(twoFactorSecret);
                      toast.success("Secret copied to clipboard!");
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {twoFactorUrl && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono break-all">
                  <span className="font-semibold block text-[10px] text-slate-500 uppercase">OTPAuth URI:</span>
                  {twoFactorUrl}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Enter 6-Digit Code from App:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.3em] font-mono text-lg font-bold py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0b2f8a] focus:ring-2 focus:ring-[#0b2f8a]/20"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting2fa || verifyToken.length !== 6}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0b2f8a] hover:bg-[#082266] transition disabled:opacity-50"
                >
                  {submitting2fa ? "Verifying..." : "Verify & Enable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
