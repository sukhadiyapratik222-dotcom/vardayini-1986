"use client";

import { useEffect, useState, useMemo } from "react";
import { ActivityLogItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

const ACTION_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  ADMIN_LOGIN: { bg: "bg-blue-100", text: "text-blue-800", icon: "🔑" },
  ADMIN_LOGOUT: { bg: "bg-gray-100", text: "text-gray-800", icon: "🚪" },
  ADMIN_CREATE: { bg: "bg-emerald-100", text: "text-emerald-800", icon: "➕" },
  ADMIN_UPDATE: { bg: "bg-sky-100", text: "text-sky-800", icon: "✏️" },
  ADMIN_DELETE: { bg: "bg-rose-100", text: "text-rose-800", icon: "🗑️" },
  ADMIN_PASSWORD_RESET: { bg: "bg-amber-100", text: "text-amber-800", icon: "🔒" },
  PASSWORD_CHANGE: { bg: "bg-purple-100", text: "text-purple-800", icon: "🛡️" },
  PAGE_CREATE: { bg: "bg-emerald-100", text: "text-emerald-800", icon: "📄" },
  PAGE_UPDATE: { bg: "bg-sky-100", text: "text-sky-800", icon: "📝" },
  PAGE_DELETE: { bg: "bg-rose-100", text: "text-rose-800", icon: "🗑️" },
};

export function ActivityLogsTab() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [limit, setLimit] = useState(50);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs({
        module: moduleFilter === "all" ? undefined : moduleFilter,
        action: actionFilter === "all" ? undefined : actionFilter,
        limit,
      });
      setLogs(data.logs || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, actionFilter, limit]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const name = (log.userName || "").toLowerCase();
      const email = (log.userEmail || "").toLowerCase();
      const action = (log.action || "").toLowerCase();
      const ip = (log.ipAddress || "").toLowerCase();
      const detailsStr =
        typeof log.details === "object"
          ? JSON.stringify(log.details).toLowerCase()
          : String(log.details || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        action.includes(q) ||
        ip.includes(q) ||
        detailsStr.includes(q)
      );
    });
  }, [logs, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b2f8a] via-[#103a9f] to-[#0b2f8a] p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 text-[#dfb755] text-xs font-bold tracking-wide uppercase">
                📜 Audit & Security Trail
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Administrative Activity Logs
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Tamper-evident audit log capturing every administrative mutation, who executed it, exact timestamps, and client IP addresses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold btn-gold shadow-sm transition shrink-0"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Refresh Log Feed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Command Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#0b2f8a]/10 shadow-sm text-xs">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search action, user, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
          />
          <span className="absolute left-2.5 top-2.5 text-gray-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Module Filter */}
        <div>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
          >
            <option value="all">All Modules</option>
            <option value="auth">Authentication & Logins</option>
            <option value="admin_mgmt">Admin Accounts & RBAC</option>
            <option value="pages">CMS Pages</option>
            <option value="catalog">Catalog & Products</option>
            <option value="orders">Orders Desk</option>
            <option value="customers">Customers</option>
            <option value="settings">Settings & Branding</option>
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
          >
            <option value="all">All Actions</option>
            <option value="ADMIN_LOGIN">Logins (ADMIN_LOGIN)</option>
            <option value="ADMIN_CREATE">Create Admin</option>
            <option value="ADMIN_UPDATE">Update Admin / Permissions</option>
            <option value="ADMIN_DELETE">Delete Admin</option>
            <option value="ADMIN_PASSWORD_RESET">Password Resets</option>
            <option value="PAGE_CREATE">CMS Page Created</option>
            <option value="PAGE_UPDATE">CMS Page Updated</option>
            <option value="PAGE_DELETE">CMS Page Deleted</option>
          </select>
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium whitespace-nowrap">Show:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
          >
            <option value={25}>Latest 25 entries</option>
            <option value={50}>Latest 50 entries</option>
            <option value={100}>Latest 100 entries</option>
            <option value={200}>Latest 200 entries</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-[#0b2f8a]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a]"></div>
            <span>Fetching security audit trail...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No audit logs found matching your filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-[#0b2f8a]/10 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const actionStyle = ACTION_COLORS[log.action] || {
                    bg: "bg-gray-100",
                    text: "text-gray-800",
                    icon: "⚡",
                  };
                  const isExpanded = expandedLogId === log.id;
                  const date = new Date(log.createdAt);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/30 transition cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {date.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {date.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] ${
                              log.userRole === "super_admin"
                                ? "bg-[#dfb755] text-[#0b2f8a]"
                                : "bg-[#0b2f8a]/10 text-[#0b2f8a]"
                            }`}
                          >
                            {log.userRole === "super_admin"
                              ? "👑"
                              : (log.userName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1">
                              <span>{log.userName || "System"}</span>
                              {log.userRole === "super_admin" && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {log.userEmail || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${actionStyle.bg} ${actionStyle.text}`}
                        >
                          <span>{actionStyle.icon}</span>
                          <span>{log.action}</span>
                        </span>
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {log.module}
                        </span>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {log.ipAddress || "127.0.0.1"}
                        </span>
                      </td>

                      {/* Details button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-[11px] text-[#0b2f8a] hover:underline font-semibold"
                        >
                          {isExpanded ? "Hide Details ▲" : "View Details ▼"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded Log Details Modal or Drawer */}
      {expandedLogId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-gray-100 overflow-hidden">
            {(() => {
              const activeLog = logs.find((l) => l.id === expandedLogId);
              if (!activeLog) return null;
              return (
                <div>
                  <div className="bg-gradient-to-r from-[#0b2f8a] to-[#103a9f] p-5 text-white flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <span>🔍</span> Audit Log Record #{activeLog.id}
                      </h3>
                      <p className="text-white/70 text-xs mt-0.5">
                        Recorded on {new Date(activeLog.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedLogId(null)}
                      className="text-white/80 hover:text-white text-lg font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 flex flex-col gap-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div>
                        <div className="text-[11px] text-gray-500 font-medium">Actor</div>
                        <div className="font-bold text-gray-900 mt-0.5">
                          {activeLog.userName || "Unknown"} ({activeLog.userRole || "User"})
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          {activeLog.userEmail}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 font-medium">Network IP</div>
                        <div className="font-mono font-bold text-gray-900 mt-0.5">
                          {activeLog.ipAddress || "127.0.0.1"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 font-medium">Action</div>
                        <div className="font-bold text-gray-900 mt-0.5 font-mono">
                          {activeLog.action}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 font-medium">Target Module</div>
                        <div className="font-bold text-gray-900 mt-0.5 font-mono">
                          {activeLog.module}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Payload Details / Mutation Snapshot
                      </label>
                      <pre className="bg-gray-900 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-gray-800">
                        {typeof activeLog.details === "object"
                          ? JSON.stringify(activeLog.details, null, 2)
                          : activeLog.details || "No details provided"}
                      </pre>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setExpandedLogId(null)}
                        className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
