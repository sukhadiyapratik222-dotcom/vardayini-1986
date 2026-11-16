"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { NotificationCenter } from "@/components/notification-center";
import { getPublicStoreUrl } from "@/lib/store-url";

import { ReportsTab, ReportType } from "@/components/reports-tab";
import { SmsWalletTab } from "@/components/sms-wallet-tab";
import { OutletsTab } from "@/components/outlets-tab";
import { AdminManagementTab } from "@/components/admin-management-tab";
import { ActivityLogsTab } from "@/components/activity-logs-tab";
import { PagesTab } from "@/components/pages-tab";
import { FestivalsTab } from "@/components/festivals-tab";
import { ReviewsTab } from "@/components/reviews-tab";
import { PickupsTab } from "@/components/pickups-tab";
import { TasteQuizTab } from "@/components/taste-quiz-tab";
import { CategoryShowcaseTab } from "@/components/category-showcase-tab";
import { BestsellersTab } from "@/components/bestsellers-tab";
import { WelcomeOfferTab } from "@/components/welcome-offer-tab";
import { TestimonialsTab } from "@/components/testimonials-tab";
import { NewLaunchTab } from "@/components/new-launch-tab";
import { WeeklySlogansTab } from "@/components/weekly-slogans-tab";
import { MobileManagementTab } from "@/components/mobile-management-tab";

export type TabId =
  | "overview"
  | "mobile-management"
  | "weekly-slogans"
  | "festivals"
  | "taste-quiz"
  | "admin-management"
  | "activity-logs"
  | "pages"
  | "outlets"
  | "pickups"
  | "hero"
  | "announcements"
  | "category-showcase"
  | "bestsellers"
  | "welcome-offer"
  | "testimonials-manager"
  | "new-launches"
  | "special-items"
  | "branding"
  | "categories"
  | "products"
  | "orders"
  | "customers"
  | "reviews"
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
  status?: string;
  mustChangePassword?: boolean;
  accessType?: string;
  permissions?: string[];
}

function AccessRestrictedCard({
  moduleName,
  currentUser,
}: {
  moduleName: string;
  currentUser: AdminUser | null;
}) {
  return (
    <div className="p-8 sm:p-12 bg-white rounded-3xl border border-rose-200/80 shadow-md text-center max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
        🔒
      </div>
      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider">
        Access Restricted
      </span>
      <h2 className="text-xl font-bold text-gray-900 mt-3">
        Module Permission Required
      </h2>
      <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
        Your administrator account (<strong>{currentUser?.email}</strong>) has been configured with <strong>Custom Access</strong> and does not have permission to access the <strong>{moduleName}</strong> module.
      </p>
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700">
        <div className="font-semibold text-slate-900 mb-1">Your Assigned Permissions:</div>
        {currentUser?.permissions && currentUser.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {currentUser.permissions.map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
              >
                ✓ {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-amber-700 font-medium">
            No specific module permissions assigned. Please ask Super Admin to assign module permissions.
          </p>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-4">
        To request access, please contact the Super Admin (pratik222@gmail.com).
      </p>
    </div>
  );
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
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [homeAccordionOpen, setHomeAccordionOpen] = useState(true);
  const [shopAccordionOpen, setShopAccordionOpen] = useState(true);
  const [productStockFilter, setProductStockFilter] = useState<"all" | "out_of_stock" | "low_stock" | "in_stock">("all");

  const handleTabChange = useCallback((tab: string) => {
    if (tab === "testimonials-manager" || tab === "category-showcase" || tab === "preview") {
      setActiveTab("overview");
      setIsMobileSidebarOpen(false);
      return;
    }
    if (tab === "out_of_stock") {
      setProductStockFilter("out_of_stock");
      setActiveTab("products");
      setShopAccordionOpen(true);
    } else {
      if (tab === "products") {
        setProductStockFilter("all");
      }
      if (["hero", "announcements", "bestsellers", "special-items", "welcome-offer", "weekly-slogans", "branding"].includes(tab)) {
        setHomeAccordionOpen(true);
      }
      if (["products", "categories"].includes(tab)) {
        setShopAccordionOpen(true);
      }
      setActiveTab(tab as TabId);
    }
    setIsMobileSidebarOpen(false);
  }, []);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@vardayini.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forced Password Change State
  const [changePasswordOld, setChangePasswordOld] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    if (!changePasswordOld || !changePasswordNew) {
      setChangePasswordError("Current and new passwords are required.");
      return;
    }
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError("New password and confirmation do not match.");
      return;
    }
    if (changePasswordNew.length < 8) {
      setChangePasswordError("Password must be at least 8 characters long.");
      return;
    }
    setChangePasswordLoading(true);
    try {
      await api.changePassword(changePasswordOld, changePasswordNew);
      toast.success("Password updated successfully! Welcome to your dashboard.");
      setCurrentUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      setChangePasswordOld("");
      setChangePasswordNew("");
      setChangePasswordConfirm("");
    } catch (err: unknown) {
      setChangePasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Verify authentication on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const { user } = await api.getCurrentUser();
        if (
          user &&
          (user.role === "admin" || user.role === "super_admin") &&
          user.status !== "inactive" &&
          user.status !== "deactivated"
        ) {
          if (isMounted) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setIsLoading(false);
            if (user?.status === "inactive" || user?.status === "deactivated") {
              setLoginError("Your account has been deactivated. Please contact an administrator.");
            }
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoading(false);
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Global listener for auth revocation (401 or 403 deactivated)
  useEffect(() => {
    const onAuthRevoked = (e: Event) => {
      const customEvt = e as CustomEvent<{ message?: string; status?: number }>;
      const msg = (customEvt.detail?.message || "").toLowerCase();
      const isDeactivated = msg.includes("deactivated") || msg.includes("inactive");

      setErrorMessage(null);
      handleLogout();
      setLoginError(
        isDeactivated
          ? "Your account has been deactivated. Please contact an administrator."
          : "Your session has expired. Please sign in again."
      );
    };

    window.addEventListener("vsm:admin:auth_revoked", onAuthRevoked);

    const onSwitchTab = (e: Event) => {
      const customEvt = e as CustomEvent<TabId>;
      if (customEvt.detail) {
        handleTabChange(customEvt.detail);
      }
    };
    window.addEventListener("vsm:switch_tab", onSwitchTab);

    return () => {
      window.removeEventListener("vsm:admin:auth_revoked", onAuthRevoked);
      window.removeEventListener("vsm:switch_tab", onSwitchTab);
    };
  }, []);

  const isModulePermitted = useCallback(
    (tab: TabId): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === "super_admin") return true;
      if (currentUser.role === "admin" && currentUser.accessType !== "custom") return true;

      const perms = currentUser.permissions || [];
      if (perms.includes("*")) return true;

      switch (tab) {
        // 1. Dashboard Overview
        case "overview":
          return (
            perms.includes("overview:view") ||
            perms.includes("overview") ||
            perms.includes("orders:manage") ||
            perms.includes("orders:view") ||
            perms.includes("reports:view")
          );

        // 2. Change Logo & Identity
        case "branding":
          return (
            perms.includes("branding:view") ||
            perms.includes("branding:manage") ||
            perms.includes("branding") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 3. Outlets & Stores
        case "outlets":
          return (
            perms.includes("outlets:view") ||
            perms.includes("outlets:manage") ||
            perms.includes("outlets") ||
            perms.includes("stores:manage") ||
            perms.includes("stores")
          );

        // 4. Change Hero Banner
        case "hero":
          return (
            perms.includes("hero:view") ||
            perms.includes("hero:manage") ||
            perms.includes("hero") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 5. Banners & Promos
        case "announcements":
          return (
            perms.includes("announcements:view") ||
            perms.includes("announcements:manage") ||
            perms.includes("announcements") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 5A. Mobile Management
        case "mobile-management":
          return (
            perms.includes("mobile:view") ||
            perms.includes("mobile:manage") ||
            perms.includes("mobile") ||
            perms.includes("settings:manage") ||
            perms.includes("settings") ||
            currentUser?.role === "admin" ||
            currentUser?.role === "super_admin"
          );

        // 5B. Weekly Slogans (Sweet of the Week)
        case "weekly-slogans":
          return (
            perms.includes("slogans:view") ||
            perms.includes("slogans:manage") ||
            perms.includes("slogans") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 6. Customer Bestsellers
        case "bestsellers":
          return (
            perms.includes("bestsellers:view") ||
            perms.includes("bestsellers:manage") ||
            perms.includes("bestsellers") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 7. Welcome Offer (10% Off)
        case "welcome-offer":
          return (
            perms.includes("welcome_offer:view") ||
            perms.includes("welcome_offer:manage") ||
            perms.includes("welcome_offer") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 8. Customer Testimonials
        case "testimonials-manager":
          return (
            perms.includes("testimonials:view") ||
            perms.includes("testimonials:manage") ||
            perms.includes("testimonials") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 9. New Launches (2026)
        case "new-launches":
          return (
            perms.includes("new_launches:view") ||
            perms.includes("new_launches:manage") ||
            perms.includes("new_launches") ||
            perms.includes("settings:manage") ||
            perms.includes("settings")
          );

        // 10. Our Special Items
        case "special-items":
          return (
            perms.includes("special_items:view") ||
            perms.includes("special_items:manage") ||
            perms.includes("special_items") ||
            perms.includes("products:manage") ||
            perms.includes("products:view") ||
            perms.includes("settings:manage")
          );

        // 11. Festival Specials
        case "festivals":
          return (
            perms.includes("festivals:view") ||
            perms.includes("festivals:manage") ||
            perms.includes("festivals") ||
            perms.includes("settings:manage") ||
            perms.includes("products:manage")
          );

        // 11.5. Taste Quiz Builder
        case "taste-quiz":
          return (
            perms.includes("products:view") ||
            perms.includes("products:manage") ||
            perms.includes("settings:manage") ||
            perms.includes("settings") ||
            currentUser.role === "admin" ||
            currentUser.role === "super_admin"
          );

        // 12. Categories
        case "categories":
        case "category-showcase":
          return (
            perms.includes("categories:view") ||
            perms.includes("categories:manage") ||
            perms.includes("categories") ||
            perms.includes("products:manage") ||
            perms.includes("products:view")
          );

        // 13. Products & Stock
        case "products":
          return (
            perms.includes("products:view") ||
            perms.includes("products:manage") ||
            perms.includes("products")
          );

        // 14. Orders Desk
        case "orders":
          return (
            perms.includes("orders:view") ||
            perms.includes("orders:manage") ||
            perms.includes("orders")
          );

        // 15. Store Pickups
        case "pickups":
          return (
            perms.includes("pickups:view") ||
            perms.includes("pickups:manage") ||
            perms.includes("pickups") ||
            perms.includes("orders:view") ||
            perms.includes("orders:manage")
          );

        // 16. Customer Reviews
        case "reviews":
          return (
            perms.includes("reviews:view") ||
            perms.includes("reviews:manage") ||
            perms.includes("reviews") ||
            perms.includes("products:manage") ||
            perms.includes("customers:manage")
          );

        // 17. Customer Directory
        case "customers":
          return (
            perms.includes("customers:view") ||
            perms.includes("customers:manage") ||
            perms.includes("customers")
          );

        // 18. CMS Pages & Policies
        case "pages":
          return (
            perms.includes("pages:view") ||
            perms.includes("pages:manage") ||
            perms.includes("pages")
          );

        // 19. Live Store Preview
        case "preview":
          return (
            perms.includes("preview:view") ||
            perms.includes("preview:manage") ||
            perms.includes("preview") ||
            perms.length > 0
          );

        // 20. Reports & Analytics
        case "report-sales":
        case "report-orders":
        case "report-product":
        case "report-inventory":
        case "report-customer":
        case "report-payment":
        case "report-revenue":
        case "report-logins":
        case "report-otp":
        case "report-emails":
        case "report-sms":
          return (
            perms.includes("reports:view") ||
            perms.includes("reports:export") ||
            perms.includes("reports")
          );

        // 21. SMS Wallet & Credits
        case "sms-wallet":
          return (
            perms.includes("sms_wallet:view") ||
            perms.includes("sms_wallet:manage") ||
            perms.includes("sms_wallet") ||
            perms.includes("sms:view") ||
            perms.includes("sms:manage") ||
            perms.includes("settings:manage")
          );

        // Super Admin Controls
        case "admin-management":
        case "activity-logs":
          return currentUser.role === "super_admin";

        default:
          return false;
      }
    },
    [currentUser]
  );

  const canManageModule = useCallback(
    (tab: TabId): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === "super_admin") return true;
      if (currentUser.role === "admin" && currentUser.accessType !== "custom") return true;

      const perms = currentUser.permissions || [];
      if (perms.includes("*")) return true;

      switch (tab) {
        case "branding":
          return perms.includes("branding:manage") || perms.includes("settings:manage");
        case "outlets":
          return perms.includes("outlets:manage") || perms.includes("stores:manage");
        case "hero":
          return perms.includes("hero:manage") || perms.includes("settings:manage");
        case "announcements":
          return perms.includes("announcements:manage") || perms.includes("settings:manage");
        case "mobile-management":
          return perms.includes("mobile:manage") || perms.includes("settings:manage") || currentUser.role === "admin" || currentUser.role === "super_admin";
        case "weekly-slogans":
          return perms.includes("slogans:manage") || perms.includes("settings:manage") || currentUser.role === "super_admin";
        case "bestsellers":
          return perms.includes("bestsellers:manage") || perms.includes("settings:manage");
        case "welcome-offer":
          return perms.includes("welcome_offer:manage") || perms.includes("settings:manage");
        case "testimonials-manager":
          return perms.includes("testimonials:manage") || perms.includes("settings:manage");
        case "new-launches":
          return perms.includes("new_launches:manage") || perms.includes("settings:manage");
        case "special-items":
          return perms.includes("special_items:manage") || perms.includes("products:manage");
        case "festivals":
          return perms.includes("festivals:manage") || perms.includes("settings:manage");
        case "taste-quiz":
          return perms.includes("products:manage") || perms.includes("settings:manage") || currentUser.role === "admin" || currentUser.role === "super_admin";
        case "categories":
        case "category-showcase":
          return perms.includes("categories:manage") || perms.includes("products:manage");
        case "products":
          return perms.includes("products:manage");
        case "orders":
          return perms.includes("orders:manage");
        case "pickups":
          return perms.includes("pickups:manage") || perms.includes("orders:manage");
        case "reviews":
          return perms.includes("reviews:manage");
        case "customers":
          return perms.includes("customers:manage");
        case "pages":
          return perms.includes("pages:manage");
        case "sms-wallet":
          return perms.includes("sms_wallet:manage") || perms.includes("sms:manage") || perms.includes("settings:manage");
        case "report-sales":
        case "report-orders":
        case "report-product":
        case "report-inventory":
        case "report-customer":
        case "report-payment":
        case "report-revenue":
        case "report-logins":
        case "report-otp":
        case "report-emails":
        case "report-sms":
          return perms.includes("reports:export");
        default:
          return true;
      }
    },
    [currentUser]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const online = await api.checkConnection();
    setIsStoreOnline(online);

    if (online) {
      try {
        const errors: string[] = [];
        let authExpired = false;
        let authExpiredMessage = "";

        const isAuthRevoked = (err: unknown): boolean => {
          if (err instanceof ApiError) {
            if (err.status === 401) return true;
            if (err.status === 403) {
              const msg = (err.message || "").toLowerCase();
              return (
                msg.includes("deactivated") ||
                msg.includes("inactive") ||
                msg.includes("session invalid")
              );
            }
          }
          return false;
        };

        const recordErr = (err: unknown, label: string) => {
          if (isAuthRevoked(err)) {
            authExpired = true;
            const errMsg = err instanceof Error ? err.message : String(err);
            if (errMsg.toLowerCase().includes("deactivated") || errMsg.toLowerCase().includes("inactive")) {
              authExpiredMessage = "Your account has been deactivated. Contact administrator.";
            } else {
              authExpiredMessage = "Your session has expired or admin privileges were revoked. Please sign in again.";
            }
            // Do NOT add to errors array to avoid displaying ugly 403 banners
            return;
          }
          // 403 = this role is read-only for that module. Hide the panel quietly
          // instead of showing a scary error banner on every poll.
          if (err instanceof ApiError && err.status === 403) return;
          errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
        };

        const canManageProducts = canManageModule("products");
        const canManageCategories = canManageModule("categories") || canManageProducts;

        const canOrders = isModulePermitted("orders");
        const canProducts = isModulePermitted("products");
        const canCustomers = isModulePermitted("customers");
        const canSettings =
          isModulePermitted("branding") ||
          isModulePermitted("hero") ||
          isModulePermitted("announcements") ||
          isModulePermitted("bestsellers") ||
          isModulePermitted("welcome-offer") ||
          isModulePermitted("testimonials-manager") ||
          isModulePermitted("new-launches") ||
          isModulePermitted("special-items") ||
          isModulePermitted("festivals") ||
          isModulePermitted("overview");
        const canReports = isModulePermitted("report-sales");

        const [cfg, ords, prods, inv, st, cats, custs] = await Promise.all([
          canSettings
            ? api.getUiConfig().catch((err) => {
                recordErr(err, "Config");
                return null;
              })
            : Promise.resolve(null),
          canOrders
            ? api.getOrders().catch((err) => {
                recordErr(err, "Orders");
                return [];
              })
            : Promise.resolve([]),
          canProducts
            ? api.getProducts().catch((err) => {
                recordErr(err, "Products");
                return [];
              })
            : Promise.resolve([]),
          canManageProducts
            ? api.getInventory().catch((err) => {
                recordErr(err, "Inventory");
                return { variants: [], lowStock: [] };
              })
            : Promise.resolve({ variants: [], lowStock: [] }),
          canReports
            ? api.getStats().catch((err) => {
                recordErr(err, "Stats");
                return null;
              })
            : Promise.resolve(null),
          canManageCategories
            ? api.getCategories().catch((err) => {
                recordErr(err, "Categories");
                return [];
              })
            : Promise.resolve([]),
          canCustomers
            ? api.getCustomers().catch((err) => {
                recordErr(err, "Customers");
                return [];
              })
            : Promise.resolve([]),
        ]);

        if (authExpired) {
          setErrorMessage(null);
          try {
            await api.logout();
          } catch {
            // ignore
          }
          setIsAuthenticated(false);
          setCurrentUser(null);
          setConfig(null);
          setOrders([]);
          setProducts([]);
          setCategories([]);
          setCustomers([]);
          setLoginError(authExpiredMessage || "Your session has expired. Please sign in again.");
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
        if (err instanceof ApiError) {
          const msg = (err.message || "").toLowerCase();
          const isDeactivated = msg.includes("deactivated") || msg.includes("inactive");
          if (err.status === 401 || (err.status === 403 && isDeactivated)) {
            setErrorMessage(null);
            try {
              await api.logout();
            } catch {
              // ignore
            }
            setIsAuthenticated(false);
            setCurrentUser(null);
            setLoginError(
              isDeactivated
                ? "Your account has been deactivated. Contact administrator."
                : "Your session has expired. Please sign in again."
            );
            setIsLoading(false);
            return;
          }
        }
        setErrorMessage(err instanceof Error ? err.message : "Error loading dashboard data");
      }
    } else {
      setErrorMessage(
        "Storefront is offline. Please check connection to " + getPublicStoreUrl()
      );
    }
    setIsLoading(false);
  }, [isModulePermitted, canManageModule]);

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
      if (res.user && (res.user.role === "admin" || res.user.role === "super_admin")) {
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

  // Page-Wise Website Sections
  const homeSections = useMemo<{ id: TabId; label: string; icon: string }[]>(() => [
    { id: "hero", label: "Hero Banner", icon: "🖼️" },
    { id: "announcements", label: "Banners & Promos", icon: "📢" },
    { id: "bestsellers", label: "Customer Bestsellers", icon: "💎" },
    { id: "special-items", label: "Our Special Items", icon: "⭐" },
    { id: "welcome-offer", label: "Welcome Offer (10%)", icon: "🎁" },
    { id: "weekly-slogans", label: "Weekly Slogans", icon: "👑" },
    { id: "branding", label: "Logo & Brand Identity", icon: "✨" },
  ], []);

  const shopSections = useMemo<{ id: TabId; label: string; icon: string; badge?: string | number }[]>(() => [
    {
      id: "products",
      label: "Products & Stock",
      icon: "🍬",
      badge: inventory.lowStock?.length ? `⚠️ ${inventory.lowStock.length}` : undefined,
    },
    {
      id: "categories",
      label: "Categories",
      icon: "📁",
      badge: categories.length || undefined,
    },
  ], [inventory.lowStock?.length, categories.length]);

  const otherPages = useMemo<{ id: TabId; label: string; icon: string; path: string; badge?: string }[]>(() => [
    { id: "festivals", label: "Festivals Page", icon: "🪔", path: "/festivals", badge: "Manage" },
    { id: "new-launches", label: "New Launches (2026)", icon: "🚀", path: "/new-launches", badge: "2026" },
    { id: "taste-quiz", label: "Taste Quiz Page", icon: "✨", path: "/find-your-mithai", badge: "Mithai Match" },
    { id: "outlets", label: "Outlets & Stores", icon: "📍", path: "/stores", badge: "Manage" },
    { id: "pages", label: "CMS Pages & Policies", icon: "📄", path: "/about" },
  ], []);

  const storeOperations = useMemo<{ id: TabId; label: string; icon: string; badge?: string | number }[]>(() => [
    {
      id: "orders",
      label: "Orders Desk",
      icon: "📦",
      badge: orders.filter((o) => o.status === "pending").length || undefined,
    },
    {
      id: "pickups",
      label: "Store Pickups",
      icon: "🏪",
      badge: "Live",
    },
    {
      id: "customers",
      label: "Customer Directory",
      icon: "👥",
      badge: customers.filter((c) => c.role !== "admin" && c.role !== "super_admin").length || undefined,
    },
    {
      id: "reviews",
      label: "Customer Reviews",
      icon: "⭐",
    },
  ], [orders, customers]);

  const marketingAndApps = useMemo<{ id: TabId; label: string; icon: string; badge?: string }[]>(() => [
    {
      id: "mobile-management",
      label: "Mobile Management",
      icon: "📱",
      badge: "App Studio",
    },
    {
      id: "sms-wallet",
      label: "SMS Wallet & Credits",
      icon: "💬",
    },
  ], []);

  const isHomeSection = useCallback((tab: TabId) => {
    return ["hero", "announcements", "bestsellers", "special-items", "welcome-offer", "weekly-slogans", "branding"].includes(tab);
  }, []);

  const isShopSection = useCallback((tab: TabId) => {
    return ["products", "categories"].includes(tab);
  }, []);

  const hasAnyHomePermitted = useMemo(() => {
    return homeSections.some((s) => isModulePermitted(s.id));
  }, [homeSections, isModulePermitted]);

  const hasAnyShopPermitted = useMemo(() => {
    return shopSections.some((s) => isModulePermitted(s.id));
  }, [shopSections, isModulePermitted]);

  // Master list of all navigable items for lookup and fallback
  const navItems = useMemo<{ id: TabId; label: string; icon: string; badge?: string | number }[]>(() => [
    {
      id: "overview",
      label: "Dashboard Overview",
      icon: "🌟",
      badge: unreadNotificationCount > 0 ? `🔔 ${unreadNotificationCount}` : undefined,
    },
    ...homeSections,
    ...shopSections,
    ...otherPages,
    ...storeOperations,
    ...marketingAndApps,
  ], [unreadNotificationCount, homeSections, shopSections, otherPages, storeOperations, marketingAndApps]);

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

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => isModulePermitted(item.id));
  }, [navItems, isModulePermitted]);

  // Auto-switch to first permitted module if activeTab is not permitted or if custom admin with products only
  useEffect(() => {
    if (!currentUser || currentUser.role === "super_admin" || currentUser.accessType !== "custom") {
      return;
    }
    const perms = currentUser.permissions || [];
    const onlyProducts =
      perms.length > 0 &&
      perms.every((p) => p.startsWith("products")) &&
      !perms.includes("orders:manage") &&
      !perms.includes("reports:view");

    if (!isModulePermitted(activeTab) || (activeTab === "overview" && onlyProducts)) {
      const firstAllowed = visibleNavItems.find(
        (n) => n.id !== "overview" && isModulePermitted(n.id)
      )?.id;
      if (firstAllowed && firstAllowed !== activeTab) {
        setActiveTab(firstAllowed);
      }
    }
  }, [currentUser, isModulePermitted, visibleNavItems, activeTab]);

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
              Kalol · Established 1986 · 100% Shuddh Desi Ghee
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

              <div className="pt-1 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Store API: <strong className="text-[#0b2f8a] font-semibold">{getPublicStoreUrl()}</strong>
                </span>
              </div>
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
            Kalol · Established 1986 · 100% Shuddh Desi Ghee
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

      {/* Mobile Top Navigation & Drawer Toggle */}
      <div className="lg:hidden bg-white border-b border-[#0b2f8a]/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b2f8a] text-white">
            <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[#dfb755]">વ</span>
          </div>
          <div>
            <span className="block font-bold text-xs text-[#0b2f8a]">Vardayini Admin Desk</span>
            <span className="block text-[10px] text-[#5e6d82] capitalize font-medium">
              {activeTab.startsWith("report-")
                ? `Report: ${reportMenuItems.find((m) => m.id === activeTab)?.label || ""}`
                : activeTab === "sms-wallet"
                ? "SMS Wallet"
                : isHomeSection(activeTab)
                ? `Home / ${homeSections.find((s) => s.id === activeTab)?.label}`
                : isShopSection(activeTab)
                ? `Shop / ${shopSections.find((s) => s.id === activeTab)?.label}`
                : navItems.find((n) => n.id === activeTab)?.label || activeTab}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b2f8a]/10 text-[#0b2f8a] text-xs font-bold transition hover:bg-[#0b2f8a]/20"
        >
          <span>{isMobileSidebarOpen ? "✕ Close" : "☰ Menu"}</span>
        </button>
      </div>

      {/* Main Body Shell */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className={`w-full lg:w-72 bg-white/95 backdrop-blur-md border-r border-[#0b2f8a]/10 p-5 flex-col justify-between shrink-0 shadow-sm ${
          isMobileSidebarOpen ? "flex" : "hidden lg:flex"
        }`}>
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
                    <span className={`w-2 h-2 rounded-full shrink-0 ${currentUser?.role === "super_admin" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                    <span className="font-bold text-[#0b2f8a] text-[11px] truncate">
                      {currentUser?.name || "Admin"}
                    </span>
                    {currentUser?.role === "super_admin" && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-xs">
                        👑 Super Admin
                      </span>
                    )}
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
            <nav className="space-y-3">
              {/* Super Admin Control Center */}
              {currentUser?.role === "super_admin" && (
                <div className="pb-2.5 mb-1 border-b border-[#0b2f8a]/10 space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#b89130] uppercase flex items-center justify-between">
                    <span>👑 Super Admin Controls</span>
                    <span className="bg-[#dfb755]/20 text-[#b89130] px-1.5 py-0.2 rounded text-[9px] font-extrabold">
                      Owner
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTabChange("admin-management")}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      activeTab === "admin-management"
                        ? "bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20"
                        : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🛡️</span>
                      <span>Administrators & RBAC</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange("activity-logs")}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      activeTab === "activity-logs"
                        ? "bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20"
                        : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">📜</span>
                      <span>Security & Activity Logs</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Dashboard Overview */}
              {isModulePermitted("overview") && (
                <button
                  type="button"
                  onClick={() => handleTabChange("overview")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === "overview"
                      ? "bg-gradient-to-r from-[#0b2f8a] to-[#071c54] text-white shadow-md shadow-[#0b2f8a]/20"
                      : "text-[#5e6d82] hover:text-[#0b2f8a] hover:bg-[#0b2f8a]/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🌟</span>
                    <span>Dashboard Overview</span>
                  </div>
                  {unreadNotificationCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeTab === "overview"
                          ? "bg-[#dfb755] text-[#071c54]"
                          : "bg-[#0b2f8a]/10 text-[#0b2f8a]"
                      }`}
                    >
                      🔔 {unreadNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* SECTION: Website Pages (Page-Wise Management) */}
              <div className="space-y-1.5 pt-1">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#b89130] uppercase flex items-center justify-between border-b border-[#0b2f8a]/10 pb-1">
                  <span>🌐 Website Pages</span>
                  <span className="text-[9px] font-semibold text-[#5e6d82] lowercase">Page-Wise</span>
                </div>

                {/* 1. Home Page Group (with sub-sections accordion) */}
                {hasAnyHomePermitted && (
                  <div className={`rounded-2xl border transition-all ${
                    isHomeSection(activeTab)
                      ? "border-amber-300 bg-amber-50/50 shadow-xs"
                      : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/50"
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isHomeSection(activeTab)) {
                          handleTabChange("hero");
                        }
                        setHomeAccordionOpen((prev) => !prev);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                        isHomeSection(activeTab)
                          ? "text-[#6b1d1d]"
                          : "text-slate-700 hover:text-[#6b1d1d]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🏠</span>
                        <div className="text-left">
                          <span className="block leading-tight">Home Page</span>
                          <span className="block text-[9px] font-normal text-slate-500">Page: /</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 font-extrabold">
                          7 sections
                        </span>
                        <span className={`text-[10px] text-slate-400 transition-transform ${homeAccordionOpen ? "rotate-0" : "-rotate-90"}`}>
                          ▼
                        </span>
                      </div>
                    </button>

                    {homeAccordionOpen && (
                      <div className="px-2 pb-2 pt-0.5 space-y-0.5 border-t border-amber-200/40 mt-1">
                        {homeSections.filter((s) => isModulePermitted(s.id)).map((sec) => {
                          const isActive = activeTab === sec.id;
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => handleTabChange(sec.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center justify-between ${
                                isActive
                                  ? "bg-[#6b1d1d] text-white font-bold shadow-xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{sec.icon}</span>
                                <span>{sec.label}</span>
                              </div>
                              {isActive && <span className="text-[9px] text-amber-300">●</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Shop & Catalog Page Group */}
                {hasAnyShopPermitted && (
                  <div className={`rounded-2xl border transition-all ${
                    isShopSection(activeTab)
                      ? "border-blue-300 bg-blue-50/50 shadow-xs"
                      : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/50"
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isShopSection(activeTab)) {
                          handleTabChange("products");
                        }
                        setShopAccordionOpen((prev) => !prev);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                        isShopSection(activeTab)
                          ? "text-[#0b2f8a]"
                          : "text-slate-700 hover:text-[#0b2f8a]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🛍️</span>
                        <div className="text-left">
                          <span className="block leading-tight">Shop Catalog</span>
                          <span className="block text-[9px] font-normal text-slate-500">Page: /shop</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inventory.lowStock?.length ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                            ⚠️ {inventory.lowStock.length} Low
                          </span>
                        ) : null}
                        <span className={`text-[10px] text-slate-400 transition-transform ${shopAccordionOpen ? "rotate-0" : "-rotate-90"}`}>
                          ▼
                        </span>
                      </div>
                    </button>

                    {shopAccordionOpen && (
                      <div className="px-2 pb-2 pt-0.5 space-y-0.5 border-t border-blue-200/40 mt-1">
                        {shopSections.filter((s) => isModulePermitted(s.id)).map((sec) => {
                          const isActive = activeTab === sec.id;
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => handleTabChange(sec.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center justify-between ${
                                isActive
                                  ? "bg-[#0b2f8a] text-white font-bold shadow-xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{sec.icon}</span>
                                <span>{sec.label}</span>
                              </div>
                              {sec.badge && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                  isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                                }`}>
                                  {sec.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Dedicated Other Pages */}
                {otherPages.filter((p) => isModulePermitted(p.id)).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
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
                      {item.badge && (
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
              </div>

              {/* SECTION: Store Operations */}
              <div className="space-y-1 pt-2 border-t border-[#0b2f8a]/10">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#5e6d82] uppercase flex items-center justify-between">
                  <span>📦 Store Operations</span>
                </div>

                {storeOperations.filter((o) => isModulePermitted(o.id)).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
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
              </div>

              {/* SECTION: Marketing & Communications */}
              <div className="space-y-1 pt-2 border-t border-[#0b2f8a]/10">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#5e6d82] uppercase">
                  <span>📱 Marketing &amp; Apps</span>
                </div>

                {marketingAndApps.filter((m) => isModulePermitted(m.id)).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
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
                      {item.badge && (
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
              </div>

              {/* Exact Reports Accordion matching user screenshot - Gated by reports:view */}
              {isModulePermitted("report-sales") && (
                <div className="pt-2 border-t border-[#0b2f8a]/10">
                  <button
                    type="button"
                    onClick={() => setReportsOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#00681c] hover:bg-[#005417] text-white shadow-sm transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">📊</span>
                      <span className="text-[13px] tracking-wide">Reports &amp; Analytics</span>
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
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
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
              )}
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
              href={getPublicStoreUrl()}
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
                <button
                  type="button"
                  onClick={() => handleTabChange("overview")}
                  className="hover:text-[#0b2f8a] cursor-pointer"
                >
                  Admin Desk
                </button>
                <span>/</span>
                {isHomeSection(activeTab) ? (
                  <>
                    <span className="text-[#b89130] font-semibold">Website Pages</span>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => handleTabChange("hero")}
                      className="text-[#6b1d1d] hover:underline cursor-pointer font-semibold"
                    >
                      Home Page (/)
                    </button>
                    <span>/</span>
                    <span className="text-[#0b2f8a] font-bold">
                      {homeSections.find((s) => s.id === activeTab)?.label}
                    </span>
                  </>
                ) : isShopSection(activeTab) ? (
                  <>
                    <span className="text-[#b89130] font-semibold">Website Pages</span>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => handleTabChange("products")}
                      className="text-[#0b2f8a] hover:underline cursor-pointer font-semibold"
                    >
                      Shop Page (/shop)
                    </button>
                    <span>/</span>
                    <span className="text-[#0b2f8a] font-bold">
                      {shopSections.find((s) => s.id === activeTab)?.label}
                    </span>
                  </>
                ) : otherPages.some((p) => p.id === activeTab) ? (
                  <>
                    <span className="text-[#b89130] font-semibold">Website Pages</span>
                    <span>/</span>
                    <span className="text-[#0b2f8a] font-bold">
                      {otherPages.find((p) => p.id === activeTab)?.label}
                    </span>
                  </>
                ) : storeOperations.some((o) => o.id === activeTab) ? (
                  <>
                    <span className="text-[#5e6d82] font-semibold">Store Operations</span>
                    <span>/</span>
                    <span className="text-[#0b2f8a] font-bold">
                      {storeOperations.find((o) => o.id === activeTab)?.label}
                    </span>
                  </>
                ) : marketingAndApps.some((m) => m.id === activeTab) ? (
                  <>
                    <span className="text-[#5e6d82] font-semibold">Marketing &amp; Apps</span>
                    <span>/</span>
                    <span className="text-[#0b2f8a] font-bold">
                      {marketingAndApps.find((m) => m.id === activeTab)?.label}
                    </span>
                  </>
                ) : activeTab.startsWith("report-") ? (
                  <>
                    <span className="text-[#00681c] font-semibold">Reports &amp; Analytics</span>
                    <span>/</span>
                    <span className="text-[#00681c] font-bold">
                      {reportMenuItems.find((m) => m.id === activeTab)?.label}
                    </span>
                  </>
                ) : (
                  <span className="text-[#0b2f8a] font-bold capitalize">
                    {activeTab === "admin-management"
                      ? "Super Admin / Administrators & RBAC"
                      : activeTab === "activity-logs"
                      ? "Super Admin / Security Audit Logs"
                      : "Dashboard Overview"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#0b2f8a] tracking-tight flex items-center gap-2.5">
                  <span>
                    {activeTab === "admin-management"
                      ? "🛡️"
                      : activeTab === "activity-logs"
                      ? "📜"
                      : activeTab === "pages"
                      ? "📄"
                      : activeTab.startsWith("report-")
                      ? "📊"
                      : activeTab === "sms-wallet"
                      ? "💬"
                      : isHomeSection(activeTab)
                      ? "🏠"
                      : isShopSection(activeTab)
                      ? "🛍️"
                      : navItems.find((n) => n.id === activeTab)?.icon}
                  </span>
                  <span>
                    {activeTab === "admin-management"
                      ? "Administrators & RBAC Management"
                      : activeTab === "activity-logs"
                      ? "Security & Activity Audit Logs"
                      : activeTab === "pages"
                      ? "Website CMS Pages & Policies"
                      : activeTab.startsWith("report-")
                      ? reportMenuItems.find((m) => m.id === activeTab)?.label
                      : activeTab === "sms-wallet"
                      ? "SMS Wallet & Credits"
                      : isHomeSection(activeTab)
                      ? `Home Page • ${homeSections.find((s) => s.id === activeTab)?.label}`
                      : isShopSection(activeTab)
                      ? `Shop Catalog • ${shopSections.find((s) => s.id === activeTab)?.label}`
                      : navItems.find((n) => n.id === activeTab)?.label}
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#0b2f8a]/5 text-[#0b2f8a] border border-[#0b2f8a]/15 shadow-sm transition disabled:opacity-50 cursor-pointer"
                title="Synchronize live data with customer storefront"
              >
                <span className={isLoading ? "animate-spin" : ""}>🔄</span>
                <span>Sync with Store</span>
              </button>

              {/* Notification Bell Icon on right side corner */}
              <NotificationCenter
                onUnreadChange={setUnreadNotificationCount}
                onNavigateTab={handleTabChange}
              />
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
                className="font-bold text-rose-900 hover:text-rose-700 ml-4 px-2 py-0.5 rounded cursor-pointer"
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
              {/* Read-Only Access Banner when admin has view-only permission */}
              {isModulePermitted(activeTab) &&
                !canManageModule(activeTab) &&
                activeTab !== "overview" &&
                activeTab !== "preview" && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">👁️</span>
                      <div>
                        <span className="font-bold">Read-Only Mode:</span> Your account has View-Only permission for this module. You can inspect all data and settings, but creating, editing, and deleting are restricted by Super Admin policy.
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950 font-extrabold text-[10px] tracking-wide uppercase shrink-0">
                      👁️ View Only
                    </span>
                  </div>
                )}

              {/* Page-Wise Management Header Bar for Home Page */}
              {isHomeSection(activeTab) && (
                <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6b1d1d] text-white font-bold text-base shadow-xs">
                        🏠
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-sm text-[#6b1d1d]">
                            Home Page Content Manager
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#6b1d1d] text-[10px] font-bold border border-amber-300/60">
                            Page: /
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5e6d82] mt-0.5">
                          Manage all 7 sections appearing on your customer-facing homepage
                        </p>
                      </div>
                    </div>

                    <a
                      href={getPublicStoreUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100/70 text-[#6b1d1d] border border-amber-300/80 text-xs font-bold transition shadow-xs shrink-0"
                    >
                      <span>Preview Live Home Page</span>
                      <span>↗</span>
                    </a>
                  </div>

                  {/* Horizontal sub-navigation pills */}
                  <div className="flex items-center gap-2 pt-3 overflow-x-auto no-scrollbar">
                    {homeSections.filter((s) => isModulePermitted(s.id)).map((sec) => {
                      const isSelected = activeTab === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => handleTabChange(sec.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                            isSelected
                              ? "bg-[#6b1d1d] text-white shadow-xs font-bold scale-[1.02]"
                              : "bg-white text-slate-700 hover:bg-amber-100/60 border border-slate-200"
                          }`}
                        >
                          <span>{sec.icon}</span>
                          <span>{sec.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shop & Catalog Page Manager Top Bar */}
              {isShopSection(activeTab) && (
                <div className="rounded-2xl border border-blue-300/80 bg-gradient-to-r from-blue-50 via-white to-blue-50/50 p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/60">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b2f8a] text-white font-bold text-base shadow-xs">
                        🛍️
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-sm text-[#0b2f8a]">
                            Shop &amp; Catalog Page Manager
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0b2f8a] text-[10px] font-bold border border-blue-300/60">
                            Page: /shop
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5e6d82] mt-0.5">
                          Manage products, inventory variants, stock warnings, and categories
                        </p>
                      </div>
                    </div>

                    <a
                      href={`${getPublicStoreUrl()}/shop`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100/70 text-[#0b2f8a] border border-blue-300/80 text-xs font-bold transition shadow-xs shrink-0"
                    >
                      <span>Preview Live Shop</span>
                      <span>↗</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2 pt-3 overflow-x-auto no-scrollbar">
                    {shopSections.filter((s) => isModulePermitted(s.id)).map((sec) => {
                      const isSelected = activeTab === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => handleTabChange(sec.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                            isSelected
                              ? "bg-[#0b2f8a] text-white shadow-xs font-bold scale-[1.02]"
                              : "bg-white text-slate-700 hover:bg-blue-100/60 border border-slate-200"
                          }`}
                        >
                          <span>{sec.icon}</span>
                          <span>{sec.label}</span>
                          {sec.badge && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                            }`}>
                              {sec.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dedicated Top Bars for Other Website Pages */}
              {activeTab === "festivals" && (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 p-3.5 flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🪔</span>
                    <div>
                      <span className="font-bold text-[#6b1d1d] block">Festivals Page Manager</span>
                      <span className="text-[11px] text-slate-500 font-mono">Route: /festivals</span>
                    </div>
                  </div>
                  <a
                    href={`${getPublicStoreUrl()}/festivals`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-[#6b1d1d] border border-amber-300 text-[11px] font-bold transition shadow-xs"
                  >
                    View Live Page ↗
                  </a>
                </div>
              )}

              {activeTab === "new-launches" && (
                <div className="rounded-2xl border border-indigo-300/60 bg-indigo-50/60 p-3.5 flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🚀</span>
                    <div>
                      <span className="font-bold text-indigo-900 block">New Launches (2026) Page Manager</span>
                      <span className="text-[11px] text-slate-500 font-mono">Route: /new-launches</span>
                    </div>
                  </div>
                  <a
                    href={`${getPublicStoreUrl()}/new-launches`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-[11px] font-bold transition shadow-xs"
                  >
                    View Live Page ↗
                  </a>
                </div>
              )}

              {activeTab === "taste-quiz" && (
                <div className="rounded-2xl border border-purple-300/60 bg-purple-50/60 p-3.5 flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">✨</span>
                    <div>
                      <span className="font-bold text-purple-900 block">Taste Quiz &amp; Mithai Match Page Manager</span>
                      <span className="text-[11px] text-slate-500 font-mono">Route: /find-your-mithai</span>
                    </div>
                  </div>
                  <a
                    href={`${getPublicStoreUrl()}/find-your-mithai`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-bold transition shadow-xs"
                  >
                    View Live Page ↗
                  </a>
                </div>
              )}

              {activeTab === "outlets" && (
                <div className="rounded-2xl border border-slate-300/60 bg-slate-50/60 p-3.5 flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📍</span>
                    <div>
                      <span className="font-bold text-slate-900 block">Stores &amp; Outlets Page Manager</span>
                      <span className="text-[11px] text-slate-500 font-mono">Route: /stores</span>
                    </div>
                  </div>
                  <a
                    href={`${getPublicStoreUrl()}/stores`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-[11px] font-bold transition shadow-xs"
                  >
                    View Live Page ↗
                  </a>
                </div>
              )}

              {activeTab === "pages" && (
                <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/60 p-3.5 flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📄</span>
                    <div>
                      <span className="font-bold text-emerald-950 block">CMS Content Pages &amp; Policies</span>
                      <span className="text-[11px] text-slate-500 font-mono">Routes: /about, /policies/*</span>
                    </div>
                  </div>
                  <a
                    href={`${getPublicStoreUrl()}/about`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-bold transition shadow-xs"
                  >
                    View Live Page ↗
                  </a>
                </div>
              )}

              {activeTab === "overview" && (
                isModulePermitted("overview") ? (
                  <OverviewTab
                    config={config}
                    orders={orders}
                    products={products}
                    inventory={inventory}
                    stats={stats}
                    isStoreOnline={isStoreOnline}
                    onRefresh={loadData}
                    onNavigateTab={handleTabChange}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Dashboard Overview" currentUser={currentUser} />
                )
              )}

              {activeTab === "outlets" && (
                isModulePermitted("outlets") ? (
                  <OutletsTab />
                ) : (
                  <AccessRestrictedCard moduleName="Outlets & Stores" currentUser={currentUser} />
                )
              )}

              {activeTab === "hero" && (
                isModulePermitted("hero") ? (
                  <HeroScrollerTab config={config} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Hero Banner Settings" currentUser={currentUser} />
                )
              )}

              {activeTab === "announcements" && (
                isModulePermitted("announcements") ? (
                  <AnnouncementsTab config={config} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Announcements & Promos" currentUser={currentUser} />
                )
              )}

              {activeTab === "category-showcase" && (
                isModulePermitted("categories") || isModulePermitted("category-showcase") ? (
                  <CategoriesTab
                    categories={categories}
                    products={products}
                    config={config}
                    initialSubTab="showcase"
                    onRefresh={loadData}
                    onSelectCategoryFilter={() => handleTabChange("products")}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Category Showcase (2x2)" currentUser={currentUser} />
                )
              )}

              {activeTab === "mobile-management" && (
                isModulePermitted("mobile-management") ? (
                  <MobileManagementTab config={config} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Mobile Management" currentUser={currentUser} />
                )
              )}

              {activeTab === "weekly-slogans" && (
                isModulePermitted("weekly-slogans") ? (
                  <WeeklySlogansTab
                    products={products}
                    currentUser={currentUser}
                    canManage={canManageModule("weekly-slogans")}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Weekly Slogans" currentUser={currentUser} />
                )
              )}

              {activeTab === "bestsellers" && (
                isModulePermitted("bestsellers") ? (
                  <BestsellersTab
                    config={config}
                    onRefresh={loadData}
                    currentUser={currentUser}
                    products={products}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Customer Bestsellers" currentUser={currentUser} />
                )
              )}

              {activeTab === "welcome-offer" && (
                isModulePermitted("welcome-offer") ? (
                  <WelcomeOfferTab config={config} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Welcome Offer (10% Off)" currentUser={currentUser} />
                )
              )}

              {activeTab === "new-launches" && (
                isModulePermitted("new-launches") ? (
                  <NewLaunchTab config={config} products={products} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="New Launches (2026)" currentUser={currentUser} />
                )
              )}

              {activeTab === "special-items" && (
                isModulePermitted("special-items") ? (
                  <SpecialItemsTab
                    config={config}
                    products={products}
                    onRefresh={loadData}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Our Special Items" currentUser={currentUser} />
                )
              )}

              {activeTab === "festivals" && (
                isModulePermitted("festivals") ? (
                  <FestivalsTab
                    config={config}
                    onRefresh={loadData}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Festival Specials" currentUser={currentUser} />
                )
              )}

              {activeTab === "branding" && (
                isModulePermitted("branding") ? (
                  <StoreBrandingTab config={config} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Store Branding & Identity" currentUser={currentUser} />
                )
              )}

              {activeTab === "categories" && (
                isModulePermitted("categories") ? (
                  <CategoriesTab
                    categories={categories}
                    products={products}
                    config={config}
                    isReadOnly={!canManageModule("categories")}
                    onRefresh={loadData}
                    onSelectCategoryFilter={() => handleTabChange("products")}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Categories" currentUser={currentUser} />
                )
              )}

              {activeTab === "products" && (
                isModulePermitted("products") ? (
                  <ProductsTab
                    products={products}
                    inventory={inventory}
                    categories={categories}
                    config={config}
                    initialStockFilter={productStockFilter}
                    isReadOnly={!canManageModule("products")}
                    onRefresh={loadData}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Products & Stock" currentUser={currentUser} />
                )
              )}

              {activeTab === "orders" && (
                isModulePermitted("orders") ? (
                  <OrdersTab orders={orders} onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Orders Desk" currentUser={currentUser} />
                )
              )}

              {activeTab === "pickups" && (
                isModulePermitted("pickups") ? (
                  <PickupsTab />
                ) : (
                  <AccessRestrictedCard moduleName="Store Pickups Management" currentUser={currentUser} />
                )
              )}

              {activeTab === "taste-quiz" && (
                isModulePermitted("taste-quiz") ? (
                  <TasteQuizTab />
                ) : (
                  <AccessRestrictedCard moduleName="Taste Quiz Builder" currentUser={currentUser} />
                )
              )}

              {activeTab === "reviews" && (
                isModulePermitted("reviews") ? (
                  <ReviewsTab onRefresh={loadData} />
                ) : (
                  <AccessRestrictedCard moduleName="Customer Reviews" currentUser={currentUser} />
                )
              )}

              {activeTab === "customers" && (
                isModulePermitted("customers") ? (
                  <CustomersTab customers={customers} onRefresh={loadData} currentUser={currentUser} />
                ) : (
                  <AccessRestrictedCard moduleName="Customer Directory" currentUser={currentUser} />
                )
              )}

              {activeTab === "preview" && <LivePreviewTab />}

              {activeTab.startsWith("report-") && (
                isModulePermitted(activeTab) ? (
                  <ReportsTab
                    reportType={activeTab.replace("report-", "") as ReportType}
                    orders={orders}
                    products={products}
                    inventory={inventory}
                    stats={stats}
                    customers={customers}
                  />
                ) : (
                  <AccessRestrictedCard moduleName="Analytics & Reports" currentUser={currentUser} />
                )
              )}

              {activeTab === "admin-management" && (
                currentUser?.role === "super_admin" ? (
                  <AdminManagementTab
                    currentUserId={currentUser?.id}
                    currentUserRole={currentUser?.role}
                    onLogout={handleLogout}
                  />
                ) : (
                  <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center shadow-sm">
                    <div className="text-3xl mb-2">🚫</div>
                    <h3 className="font-bold text-base mb-1">403 Forbidden: Access Restricted</h3>
                    <p className="text-xs text-rose-700 max-w-md mx-auto">
                      Administrator management is reserved exclusively for the system Super Admin. Your account role does not have authorization to view or alter administrator credentials.
                    </p>
                  </div>
                )
              )}

              {activeTab === "activity-logs" && (
                currentUser?.role === "super_admin" ? (
                  <ActivityLogsTab />
                ) : (
                  <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center shadow-sm">
                    <div className="text-3xl mb-2">🚫</div>
                    <h3 className="font-bold text-base mb-1">403 Forbidden: Access Restricted</h3>
                    <p className="text-xs text-rose-700 max-w-md mx-auto">
                      Security audit logs can only be inspected by the Super Admin account.
                    </p>
                  </div>
                )
              )}

              {activeTab === "pages" && (
                isModulePermitted("pages") ? (
                  <PagesTab />
                ) : (
                  <AccessRestrictedCard moduleName="CMS Pages & Policies" currentUser={currentUser} />
                )
              )}

              {activeTab === "sms-wallet" && (
                isModulePermitted("sms-wallet") ? (
                  <SmsWalletTab />
                ) : (
                  <AccessRestrictedCard moduleName="SMS Communications & Wallet" currentUser={currentUser} />
                )
              )}
            </>
          )}
        </main>
      </div>

      {/* Mandatory Forced Password Change Modal */}
      {currentUser?.mustChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0b2f8a] to-[#103a9f] p-6 text-white text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-gray-900 text-2xl shadow-md mb-3">
                🔐
              </div>
              <h3 className="text-lg font-bold">Mandatory Password Change</h3>
              <p className="text-white/80 text-xs mt-1">
                Your administrator account requires a new password before you can proceed.
              </p>
            </div>

            <form onSubmit={handleForcePasswordChange} className="p-6 flex flex-col gap-4 text-xs">
              {changePasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                  {changePasswordError}
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Current / Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  value={changePasswordOld}
                  onChange={(e) => setChangePasswordOld(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  New Secure Password *
                </label>
                <input
                  type="password"
                  required
                  value={changePasswordNew}
                  onChange={(e) => setChangePasswordNew(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={changePasswordConfirm}
                  onChange={(e) => setChangePasswordConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="w-full py-2.5 rounded-xl btn-gold font-bold shadow-sm transition disabled:opacity-50 text-xs"
                >
                  {changePasswordLoading ? "Updating Password..." : "Set New Password & Proceed"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-800 text-[11px] font-medium underline"
                >
                  Cancel and Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
