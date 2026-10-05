export interface HeroPhoto {
  id: string;
  name: string;
  image: string;
  category?: string;
  active: boolean;
  order: number;
}

export interface UiConfig {
  heroPhotos: HeroPhoto[];
  heroSettings: {
    autoScroll: boolean;
    intervalSeconds: number;
  };
  announcement: {
    enabled: boolean;
    badge: string;
    text: string;
    linkText: string;
    linkUrl: string;
  };
  storeInfo: {
    name: string;
    tagline: string;
    established: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    hours: string;
  };
  promotions: {
    couponCode: string;
    discountPercent: number;
    description: string;
    isActive: boolean;
  };
  logo?: {
    type: "crest" | "image";
    crestLetter: string;
    crestBgColor: string;
    crestBorderColor: string;
    crestTextColor: string;
    imageUrl: string;
    brandName: string;
    brandSubtitle: string;
  };
  heritageBanner?: {
    enabled: boolean;
    topBadgeGujarati: string;
    topBadgeEnglish: string;
    titleLine1: string;
    titleLine2: string;
    showTextOverlay: boolean;
    button1Text: string;
    button1Link: string;
    button2Text: string;
    button2Link: string;
    bannerImage: string;
  };
  heroContent?: {
    badgeEst?: string;
    badgeText?: string;
    titlePrefix?: string;
    titleHighlight1?: string;
    titleMiddle?: string;
    titleHighlight2?: string;
    description?: string;
    button1Text?: string;
    button1Link?: string;
    button2Text?: string;
    button2Link?: string;
    stat1Value?: string;
    stat1Label?: string;
    stat2Value?: string;
    stat2Label?: string;
    stat3Value?: string;
    stat3Label?: string;
  };
  specialItems?: {
    enabled: boolean;
    badge: string;
    title: string;
    subtitle: string;
    productIds: number[];
    linkText: string;
    linkUrl: string;
  };
}

export interface ProductItem {
  id: number;
  productId?: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  tags: string;
  isFeatured: boolean;
  categoryId: number;
  categoryName: string;
  variantId: number;
  sku: string;
  weight: string;
  price: number;
  stock: number;
}

export interface OrderItem {
  id: number;
  orderNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  deliverySlot: string;
  addressSnapshot?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  createdAt: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  weight: string;
  stock: number;
  price: number;
  name: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  productCount?: number;
}

export interface DashboardStats {
  totalOrders: number;
  awaitingProcessing: number;
  processingOrders: number;
  readyForPickup: number;
  completedOrders: number;
  canceledOrders: number;
  publishedProducts: number;
  masterProductsCount: number;
  publishedCategories: number;
  reviewsRatings: number;
  totalCustomers: number;
  outOfStock: number;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const PROXY_BASE = "/api/store";

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let errorDetail = "";
    let parsedData: unknown = undefined;
    try {
      const errJson = await res.json();
      parsedData = errJson;
      errorDetail = errJson.error || errJson.message || JSON.stringify(errJson);
    } catch {
      try {
        errorDetail = await res.text();
      } catch {
        errorDetail = res.statusText;
      }
    }
    const message = errorDetail
      ? `HTTP ${res.status}: ${errorDetail}`
      : `HTTP ${res.status} ${res.statusText}: ${fallbackMessage}`;
    throw new ApiError(res.status, message, parsedData);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Authentication methods
  async login(email: string, password: string): Promise<{ success: boolean; user: any }> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ success: boolean; user: any }>(res, "Authentication failed");
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });
    return handleResponse<{ success: boolean }>(res, "Logout failed");
  },

  async getCurrentUser(): Promise<{ user: any }> {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
    });
    return handleResponse<{ user: any }>(res, "Session verification failed");
  },
  // Operational Metrics Stats
  async getStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${PROXY_BASE}/api/admin/stats`, {
        cache: "no-store",
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return {
      totalOrders: 174,
      awaitingProcessing: 120,
      processingOrders: 31,
      readyForPickup: 1,
      completedOrders: 0,
      canceledOrders: 4,
      publishedProducts: 76,
      masterProductsCount: 42,
      publishedCategories: 6,
      reviewsRatings: 0,
      totalCustomers: 9,
      outOfStock: 0,
    };
  },

  // Check storefront connectivity
  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${PROXY_BASE}/api/ui-config`, {
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // UI Configuration
  async getUiConfig(): Promise<UiConfig> {
    const res = await fetch(`${PROXY_BASE}/api/ui-config`, {
      cache: "no-store",
    });
    return handleResponse<UiConfig>(res, "Failed to load UI configuration");
  },

  async updateUiConfig(data: Partial<UiConfig>): Promise<{ success: boolean; config: UiConfig }> {
    const res = await fetch(`${PROXY_BASE}/api/ui-config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; config: UiConfig }>(res, "Failed to update UI configuration");
  },

  // Products
  async getProducts(): Promise<ProductItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/products`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ items: ProductItem[] }>(res, "Failed to load products");
    return data.items || [];
  },

  async createProduct(product: Partial<ProductItem>): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to create product");
  },

  async updateProduct(product: Partial<ProductItem>): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/products`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to update product");
  },

  // Orders
  async getOrders(): Promise<OrderItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/orders`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ orders: OrderItem[] }>(res, "Failed to load orders");
    return data.orders || [];
  },

  async updateOrderStatus(orderNumber: string, status: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${orderNumber}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to update order status");
  },

  async updateOrder(
    orderNumber: string,
    fields: {
      status?: string;
      guestName?: string;
      guestPhone?: string;
      deliverySlot?: string;
      paymentMethod?: string;
      paymentStatus?: string;
      total?: number;
    }
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${orderNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to update order");
  },

  async deleteOrder(orderNumber: string): Promise<{ success: boolean; deleted: string }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${orderNumber}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; deleted: string }>(res, "Failed to delete order");
  },

  // Inventory
  async getInventory(): Promise<{ variants: InventoryItem[]; lowStock: InventoryItem[] }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/inventory`, {
      cache: "no-store",
    });
    return handleResponse<{ variants: InventoryItem[]; lowStock: InventoryItem[] }>(res, "Failed to load inventory");
  },

  async updateStock(id: number, stock: number): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/inventory`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, stock }),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to update stock");
  },

  // Categories
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const res = await fetch(`${PROXY_BASE}/api/admin/categories`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return data.categories || [];
      }
    } catch {}

    // Fallback to public categories endpoint
    try {
      const pubRes = await fetch(`${PROXY_BASE}/api/categories`, {
        cache: "no-store",
      });
      if (pubRes.ok) {
        const data = await pubRes.json();
        return data.categories || [];
      }
    } catch {}

    return [];
  },

  async createCategory(cat: Partial<CategoryItem>): Promise<CategoryItem> {
    const res = await fetch(`${PROXY_BASE}/api/admin/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cat),
    });
    const data = await handleResponse<{ category: CategoryItem }>(res, "Failed to create category");
    return data.category;
  },

  async updateCategory(cat: Partial<CategoryItem>): Promise<CategoryItem> {
    const res = await fetch(`${PROXY_BASE}/api/admin/categories`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cat),
    });
    const data = await handleResponse<{ category: CategoryItem }>(res, "Failed to update category");
    return data.category;
  },

  async deleteCategory(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/categories?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean }>(res, "Failed to delete category");
  },

  // Customers Management
  async getCustomers(): Promise<CustomerItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/customers`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ customers: CustomerItem[] }>(res, "Failed to load customers");
    return data.customers || [];
  },

  async deleteCustomer(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/customers?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; message: string }>(res, "Failed to delete customer");
  },

  // Admin Notifications
  async getNotifications(limit: number = 50): Promise<{ notifications: AdminNotification[]; unreadCount: number }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/notifications?limit=${limit}`, {
      cache: "no-store",
    });
    return handleResponse<{ notifications: AdminNotification[]; unreadCount: number }>(res, "Failed to load notifications");
  },

  async markNotificationRead(id?: number, all?: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/notifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all }),
    });
    return handleResponse<{ success: boolean }>(res, "Failed to update notification");
  },

  async deleteNotification(id?: number, all?: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/notifications`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all }),
    });
    return handleResponse<{ success: boolean }>(res, "Failed to delete notification");
  },
};

export interface AdminNotification {
  id: number;
  type: "order_created" | "user_login" | "user_registered" | "system";
  title: string;
  message: string;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CustomerAddress {
  id: number;
  label: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface CustomerItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  addresses?: CustomerAddress[];
  totalOrders: number;
  totalSpent: number;
  lastOrder?: string | null;
}


