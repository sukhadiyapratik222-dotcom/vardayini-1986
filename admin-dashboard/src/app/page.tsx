"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UiConfig,
  OrderItem,
  ProductItem,
  InventoryItem,
  CategoryItem,
  DashboardStats,
  CustomerItem,
  api,
  ApiError,
} from "@/lib/api";
import { OverviewTab } from "@/components/overview-tab";
import { HeroScrollerTab } from "@/components/hero-scroller-tab";
import { AnnouncementsTab } from "@/components/announcements-tab";
import { SpecialItemsTab } from "@/components/special-items-tab";
import { StoreBrandingTab } from "@/components/store-branding-tab";
import { ProductsTab } from "@/components/products-tab";
import { CategoriesTab } from "@/components/categories-tab";
import { OrdersTab } from "@/components/orders-tab";
import { CustomersTab } from "@/components/customers-tab";
import { LivePreviewTab } from "@/components/live-preview-tab";
import { ToastPopup, ToastData } from "@/components/toast-popup";
import { toast } from "@/lib/toast";

import { ReportsTab, ReportType } from "@/components/reports-tab";
import { SmsWalletTab } from "@/components/sms-wallet-tab";

export type TabId =
  | "overview"
  | "hero"
  | "announcements"
  | "special-items"
  | "branding"
  | "categories"
  | "products"
  | "orders"
  | "customers"
  | "preview"
  | "report-sales"
  | "report-orders"
  | "report-product"
  | "report-inventory"
  | "report-customer"
  | "report-payment"
  | "report-revenue"
  | "report-logins"
  | "report-otp"
  | "report-emails"
  | "report-sms"
  | "sms-wallet";

interface AdminUser {
  id?: number;
  email?: string;
  name?: string;
  role?: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [inventory, setInventory] = useState<{
    variants: InventoryItem[];
    lowStock: InventoryItem[];
  }>({ variants: [], lowStock: [] });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isStoreOnline, setIsStoreOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportsOpen, setReportsOpen] = useState(true);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@vardayini.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Verify authentication on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const { user } = await api.getCurrentUser();
        if (user && user.role === "admin") {
          if (isMounted) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const online = await api.checkConnection();
    setIsStoreOnline(online);

    if (online) {
      try {
        const errors: string[] = [];
        let authExpired = false;

        const recordErr = (err: unknown, label: string) => {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            authExpired = true;
          }
          errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
        };

        const [cfg, ords, prods, inv, st, cats, custs] = await Promise.all([
          api.getUiConfig().catch((err) => {
            recordErr(err, "Config");
            return null;
          }),
          api.getOrders().catch((err) => {
            recordErr(err, "Orders");
            return [];
          }),
          api.getProducts().catch((err) => {
            recordErr(err, "Products");
            return [];
          }),
          api.getInventory().catch((err) => {
            recordErr(err, "Inventory");
            return { variants: [], lowStock: [] };
          }),
          api.getStats().catch((err) => {
            recordErr(err, "Stats");
            return null;
          }),
          api.getCategories().catch((err) => {
            recordErr(err, "Categories");
            return [];
          }),
          api.getCustomers().catch((err) => {
            recordErr(err, "Customers");
            return [];
          }),
        ]);

        if (authExpired) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        if (cfg) setConfig(cfg);
        setOrders(ords);
        setProducts(prods);
        setInventory(inv);
        if (st) setStats(st);
        setCategories(cats);
        setCustomers(custs);
        if (errors.length > 0) {
          setErrorMessage(errors.join(" • "));
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Error loading dashboard data");
        }
      }
    } else {
      setErrorMessage("Storefront is offline. Please check connection to " + (process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449"));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, loadData]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      if (res.user && res.user.role === "admin") {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        setLoginPassword("");
      } else {
        setLoginError("Administrator privileges are required to access this portal.");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setLoginError(err.message || "Invalid credentials or unauthorized.");
      } else if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setConfig(null);
      setOrders([]);
      setProducts([]);
      setCategories([]);
      setCustomers([]);
    }
  };

  // Subscribe to all floating popup messages
  useEffect(() => {
    return toast.subscribe((t) => {
      setActiveToast(t);
    });
  }, []);

  const navItems: { id: TabId; label: string; icon: string; badge?: string | number }[] = [
    { id: "overview", label: "Dashboard Overview", icon: "🌟" },
    { id: "branding", label: "Change Logo & Identity", icon: "✨" },
    {
      id: "hero",
      label: "Change Hero Banner",
      icon: "🖼️",
    },
    { id: "announcements", label: "Banners & Promos", icon: "📢" },
    {
      id: "special-items",
      label: "Our Special Items",
      icon: "⭐",
      badge: config?.specialItems?.productIds?.length
        ? `${config.specialItems.productIds.length} items`
        : undefined,
    },
    {
      id: "categories",
      label: "Categories",
      icon: "📁",
      badge: categories.length || undefined,
    },
    {
      id: "products",
      label: "Products & Stock",
      icon: "🍬",
      badge: inventory.lowStock?.length ? `⚠️ ${inventory.lowStock.length}` : undefined,
    },
    {
      id: "orders",
      label: "Orders Desk",
      icon: "📦",
      badge: orders.filter((o) => o.status === "pending").length || undefined,
    },
    {
      id: "customers",
      label: "Customer Directory",
      icon: "👥",
      badge: customers.filter((c) => c.role !== "admin").length || undefined,
    },
    { id: "preview", label: "Live Store Preview", icon: "👁️" },
  ];

  const reportMenuItems: { id: TabId; label: string }[] = [
    { id: "report-sales", label: "Sales Report" },
    { id: "report-orders", label: "Orders Report" },
    { id: "report-product", label: "Product Report" },
    { id: "report-inventory", label: "Inventory Report" },
    { id: "report-customer", label: "Customer Report" },
    { id: "report-payment", label: "Payment Report" },
    { id: "report-revenue", label: "Revenue Report" },
    { id: "report-logins", label: "Login Report" },
    { id: "report-otp", label: "OTP Logs" },
    { id: "report-emails", label: "Email Report" },
    { id: "report-sms", label: "SMS Reports" },
  ];

  // Auth Gate: Checking initial session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfa]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#dfb755] to-[#b89130] p-0.5 shadow-md">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b2f8a] text-white shadow-inner">
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[#dfb755]">
                વ
              </span>
            </div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a]"></div>
          <p className="text-xs text-[#5e6d82] font-semibold tracking-wide">
            Verifying Karigar Admin Session...
          </p>
        </div>
      </div>
    );
  }

  // Auth Gate: Not authenticated or session expired (401/403)
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfcfa]">
        {/* Top Announcement Bar */}
        <header className="bg-[#0b2f8a] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs">
            <p className="hidden sm:block text-white/80">
              Vadodara · Established 1976 · 100% Shuddh Desi Ghee
            </p>
            <p className="mx-auto sm:mx-0 text-center font-medium tracking-wide text-[#dfb755]">
              ✨ Vardayini Sweet Mart · Dedicated Karigar Control Desk
            </p>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#0b2f8a]/10 shadow-xl p-8 sm:p-10 space-y-6">
            {/* Brand Logo & Heading */}
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#dfb755] to-[#b89130] p-0.5 shadow-md">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b2f8a] text-white shadow-inner">
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#dfb755]">
                    વ
                  </span>
                </div>
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[#0b2f8a]">
                  VARDAYINI
                </h1>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#b89130]">
                  Sweet Mart · 1976
                </p>
                <h2 className="text-sm font-semibold text-[#182230] mt-2">
                  Karigar Admin Desk — Sign In
                </h2>
                <p className="text-xs text-[#5e6d82] mt-1">
                  Enter your administrator credentials to manage products, inventory, orders, and configuration.
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2 shadow-sm">
                  <span className="text-sm shrink-0">⚠️</span>
                  <div className="flex-1 leading-relaxed">{loginError}</div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#182230]">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@vardayini.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0b2f8a] focus:ring-2 focus:ring-[#0b2f8a]/10 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#182230]">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0b2f8a] focus:ring-2 focus:ring-[#0b2f8a]/10 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0b2f8a] to-[#071c54] hover:from-[#092570] hover:to-[#051540] shadow-md shadow-[#0b2f8a]/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <span className="animate-spin text-base">⏳</span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>🔐</span>
                    <span>Sign In to Admin Desk</span>
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-[#5e6d82] space-y-1">
              <p className="flex items-center justify-center gap-1 font-medium">
                <span>🛡️</span>
                <span>Protected Admin Session · HttpOnly Cookie</span>
              </p>
              <p className="text-[10px] text-slate-400">
                Unauthorized access is strictly monitored and logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfcfa] relative">
      {/* Global Floating Popup Notification */}
      <ToastPopup toast={activeToast} onClose={() => setActiveToast(null)} />

      {/* Top Brand Announcement Banner matching Storefront */}
      <header className="bg-[#0b2f8a] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          <p className="hidden sm:block text-white/80">
            Vadodara · Established 1976 · 100% Shuddh Desi Ghee
          </p>
          <p className="mx-auto sm:mx-0 text-center font-medium tracking-wide text-[#dfb755]">
            ✨ Vardayini Sweet Mart · Dedicated Karigar Control Desk (Port 3001)
          </p>
          <div className="hidden sm:flex items-center gap-4 text-white/85">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isStoreOnline ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              Storefront: {isStoreOnline ? "Online (9449)" : "Connecting..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 bg-white/95 backdrop-blur-md border-r border-[#0b2f8a]/10 p-5 flex flex-col justify-between shrink-0 shadow-sm">
          <div className="space-y-6">
            {/* Vardayini Authentic Brand Crest */}
            <div className="pb-5 border-b border-[#0b2f8a]/10">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#dfb755] to-[#b89130] p-0.5 shadow-sm">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b2f8a] text-white shadow-inner">
                    <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[#dfb755]">
                      વ
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="block font-[family-name:var(--font-display)] text-xl font-bold leading-none tracking-tight text-[#0b2f8a]">
                    VARDAYINI
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b89130]">
                    Sweet Mart · 1976
                  </span>
                  <span className="block text-[9px] font-medium text-[#5e6d82] mt-0.5 uppercase tracking-wider">
                    Karigar Admin Desk
                  </span>
                </div>
              </div>

              {/* Server indicator */}
              <div className="mt-4 px-3 py-2 rounded-xl bg-[#0b2f8a]/5 border border-[#0b2f8a]/10 text-[11px] flex items-center justify-between text-[#182230]">
                <span className="text-[#5e6d82] font-medium">Controls Server:</span>
                <span className="font-mono text-[#0b2f8a] font-bold">Port 3001</span>
              </div>

              {/* Authenticated Admin Badge & Sign Out */}
              <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-bold text-[#0b2f8a] text-[11px] truncate">
                      {currentUser?.name || "Admin"}
                    </span>
                  </div>
                  <span className="block text-[10px] text-[#5e6d82] truncate">
                    {currentUser?.email || "admin@vardayini.com"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition shrink-0"
                  title="Sign out of Admin Desk"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20"
                        : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? "bg-[#dfb755] text-[#071c54]"
                            : "bg-[#0b2f8a]/10 text-[#0b2f8a]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Exact Reports Accordion matching user screenshot */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setReportsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#00681c] hover:bg-[#005417] text-white shadow-sm transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">📊</span>
                    <span className="text-[13px] tracking-wide">Reports</span>
                  </div>
                  <span
                    className={`text-[10px] transition-transform duration-200 ${
                      reportsOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {reportsOpen && (
                  <div className="mt-1 bg-[#f8fafd] rounded-2xl p-1.5 border border-slate-200/60 space-y-0.5 shadow-inner">
                    {reportMenuItems.map((item) => {
                      const isSelected = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                            isSelected
                              ? "bg-white text-[#00681c] font-bold shadow-sm border border-slate-200/80"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                        >
                          <span>{item.label}</span>
                          {isSelected && <span className="text-[10px] text-[#00681c]">●</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SMS Wallet & Credits item matching user screenshot */}
              <button
                type="button"
                onClick={() => setActiveTab("sms-wallet")}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition mt-1.5 ${
                  activeTab === "sms-wallet"
                    ? "bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20"
                    : "text-slate-700 hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base text-[#0b2f8a]">💬</span>
                  <span className="text-[12px]">SMS Wallet & Credits</span>
                </div>
                <span className="text-sm font-bold opacity-60">›</span>
              </button>
            </nav>
          </div>

          {/* Footer info & Storefront Link */}
          <div className="pt-6 border-t border-[#0b2f8a]/10 mt-6 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#5e6d82] px-1">
              <span>Customer Store:</span>
              <span
                className={`font-semibold ${
                  isStoreOnline ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isStoreOnline ? "● Connected (9449)" : "● Offline"}
              </span>
            </div>

            <a
              href={process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold btn-gold shadow-sm transition"
            >
              <span>Visit Customer Store ↗</span>
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl flex flex-col gap-6">
          {/* Top Command Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0b2f8a]/10">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#5e6d82]">
                <span className="hover:text-[#0b2f8a] cursor-pointer">Vardayini Admin Desk</span>
                <span>/</span>
                <span className="text-[#0b2f8a] font-semibold capitalize">
                  {activeTab.startsWith("report-")
                    ? "Reports"
                    : activeTab === "sms-wallet"
                    ? "Communications"
                    : navItems.find((n) => n.id === activeTab)?.label}
                </span>
                {activeTab.startsWith("report-") && (
                  <>
                    <span>/</span>
                    <span className="text-[#00681c] font-bold">
                      {reportMenuItems.find((m) => m.id === activeTab)?.label}
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a] tracking-tight flex items-center gap-2.5 mt-1">
                <span>
                  {activeTab.startsWith("report-")
                    ? "📊"
                    : activeTab === "sms-wallet"
                    ? "💬"
                    : navItems.find((n) => n.id === activeTab)?.icon}
                </span>
                <span>
                  {activeTab.startsWith("report-")
                    ? reportMenuItems.find((m) => m.id === activeTab)?.label
                    : activeTab === "sms-wallet"
                    ? "SMS Wallet & Credits"
                    : navItems.find((n) => n.id === activeTab)?.label}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#0b2f8a]/5 text-[#0b2f8a] border border-[#0b2f8a]/15 shadow-sm transition disabled:opacity-50"
                title="Synchronize live data with customer storefront"
              >
                <span className={isLoading ? "animate-spin" : ""}>🔄</span>
                <span>Sync with Store</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="font-bold text-rose-900 hover:text-rose-700 ml-4 px-2 py-0.5 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLoading && !config ? (
            <div className="flex items-center justify-center min-h-[450px]">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0b2f8a]"></div>
                <p className="text-xs text-[#5e6d82] font-medium">
                  Connecting to Storefront Server...
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  config={config}
                  orders={orders}
                  products={products}
                  inventory={inventory}
                  stats={stats}
                  isStoreOnline={isStoreOnline}
                  onRefresh={loadData}
                  onNavigateTab={(tab) => setActiveTab(tab as TabId)}
                />
              )}

              {activeTab === "hero" && (
                <HeroScrollerTab config={config} onRefresh={loadData} />
              )}

              {activeTab === "announcements" && (
                <AnnouncementsTab config={config} onRefresh={loadData} />
              )}

              {activeTab === "special-items" && (
                <SpecialItemsTab
                  config={config}
                  products={products}
                  onRefresh={loadData}
                />
              )}

              {activeTab === "branding" && (
                <StoreBrandingTab config={config} onRefresh={loadData} />
              )}

              {activeTab === "categories" && (
                <CategoriesTab
                  categories={categories}
                  products={products}
                  onRefresh={loadData}
                  onSelectCategoryFilter={() => setActiveTab("products")}
                />
              )}

              {activeTab === "products" && (
                <ProductsTab
                  products={products}
                  inventory={inventory}
                  categories={categories}
                  config={config}
                  onRefresh={loadData}
                />
              )}

              {activeTab === "orders" && (
                <OrdersTab orders={orders} onRefresh={loadData} />
              )}

              {activeTab === "customers" && (
                <CustomersTab customers={customers} onRefresh={loadData} />
              )}

              {activeTab === "preview" && <LivePreviewTab />}

              {activeTab.startsWith("report-") && (
                <ReportsTab
                  reportType={activeTab.replace("report-", "") as ReportType}
                  orders={orders}
                  products={products}
                  inventory={inventory}
                  stats={stats}
                />
              )}

              {activeTab === "sms-wallet" && <SmsWalletTab />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
