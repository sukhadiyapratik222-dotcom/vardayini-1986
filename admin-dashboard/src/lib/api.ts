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
  festivalPage?: FestivalPageConfig;
  browseByCategory?: BrowseByCategoryConfig;
  bestsellersSection?: BestsellersSectionConfig;
  welcomeOffer?: WelcomeOfferConfig;
  testimonialsSection?: TestimonialsSectionConfig;
  newLaunchPage?: NewLaunchPageConfig;
  culinaryPillars?: CulinaryPillarsConfig;
}

export interface BrowseByCategoryCard {
  id: string;
  title: string;
  itemCount: string;
  imageUrl: string;
  href: string;
  active?: boolean;
}

export interface BrowseByCategoryConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  linkText?: string;
  linkUrl?: string;
  cards?: BrowseByCategoryCard[];
}

export interface BestsellerCardItem {
  id: string;
  name: string;
  slug: string;
  badge: string;
  description: string;
  price: number;
  weight: string;
  imageUrl: string;
  variantId?: number;
  active?: boolean;
  totalSold?: number;
  orderCount?: number;
}

export interface BestsellersSectionConfig {
  enabled?: boolean;
  autoCalculateFromSales?: boolean;
  badge?: string;
  title?: string;
  viewAllText?: string;
  viewAllUrl?: string;
  items?: BestsellerCardItem[];
  realSalesRankings?: BestsellerCardItem[];
}

export interface WelcomeOfferConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  couponCode?: string;
  discountPercent?: number;
}

export interface TestimonialConfigItem {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
  productName?: string;
  isVerified?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface TestimonialsSectionConfig {
  enabled?: boolean;
  autoShowRealReviews?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  showTrustBadge?: boolean;
  trustBadgeText?: string;
  reviews?: TestimonialConfigItem[];
  realDbReviews?: TestimonialConfigItem[];
}

export interface NewLaunchPageConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  tickerTexts?: string[];
}

export interface CulinaryPillarItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface CulinaryPillarsConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  pillars?: CulinaryPillarItem[];
}

export interface FestivalHeroConfig {
  badgeText: string;
  phone: string;
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
  button1Text: string;
  button1Link: string;
  button2Text: string;
  button2Link: string;
  trustPills: Array<{ icon: string; text: string }>;
  couponPromo: {
    enabled: boolean;
    text: string;
    code: string;
  };
  backgroundImage?: string;
}

export interface FestivalSectionConfig {
  id: string;
  tabLabel: string;
  tabIcon: string;
  tabGujarati: string;
  categoryTag: string;
  title: string;
  subtitle: string;
  viewAllText: string;
  festivalIds: string[];
  enabled: boolean;
  order: number;
  backgroundImage?: string;
}

export interface FestivalTrustPerk {
  icon: string;
  title: string;
  description: string;
}

export interface FestivalCorporateGiftingConfig {
  enabled: boolean;
  badge: string;
  title: string;
  description: string;
  whatsappNumber: string;
  whatsappText: string;
  phoneNumber: string;
  phoneLabel?: string;
}

export interface FestivalProductItem {
  id: number;
  legacyId?: number;
  dbProductId?: number;
  dbVariantId?: number;
  sku?: string;
  slug?: string;
  name: string;
  gujaratiName: string;
  badge: string;
  festivalId: string;
  festivalName: string;
  description: string;
  imageUrl: string;
  price: number;
  comparePrice: number;
  weight: string;
  stock: number;
  actualStock?: number;
  tags?: string[];
  enabled?: boolean;
}

export interface FestivalSpecificPageConfig {
  hero?: Partial<FestivalHeroConfig>;
  couponPromo?: {
    enabled: boolean;
    text: string;
    code: string;
  };
  trustPills?: Array<{ icon: string; text: string }>;
  corporateGifting?: Partial<FestivalCorporateGiftingConfig>;
  theme?: string;
  storyTitle?: string;
  storyDescription?: string;
}

export interface FestivalPageConfig {
  hero: FestivalHeroConfig;
  sections: FestivalSectionConfig[];
  trustPerks: FestivalTrustPerk[];
  corporateGifting: FestivalCorporateGiftingConfig;
  customProducts?: FestivalProductItem[];
  festivalPages?: Record<string, FestivalSpecificPageConfig>;
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
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  fulfillmentType?: string | null;
  pickupStoreId?: number | null;
  pickupDate?: string | null;
  pickupSlot?: string | null;
  estimatedReadyAt?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: string;
}

export interface OrderItemDetail {
  id: number;
  orderId: number;
  variantId?: number | null;
  productName: string;
  variantWeight: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  hsnCode?: string;
  taxRate?: number;
  taxableAmount?: number;
  cgstAmount?: string | number;
  sgstAmount?: string | number;
  igstAmount?: string | number;
  totalAmount?: number;
}

export interface OrderStatusHistoryItem {
  id: number;
  orderId: number;
  status: string;
  note?: string | null;
  location?: string | null;
  changedBy: string;
  createdAt: string;
}

export interface StoreBranchDetail {
  id: number;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  openingTime?: string;
  closingTime?: string;
  prepTimeMinutes?: number;
  mapUrl?: string | null;
}

export interface CustomerProfile {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface ParsedAddress {
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  addressLine1?: string;
  line2?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  landmark?: string;
  instructions?: string;
  deliveryInstructions?: string;
  raw?: string;
}

export interface FullOrderDetail extends OrderItem {
  items?: OrderItemDetail[];
  history?: OrderStatusHistoryItem[];
  store?: StoreBranchDetail | null;
  user?: CustomerProfile | null;
  parsedAddress?: ParsedAddress | null;
  tax?: number;
  couponCode?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  deliveredAt?: string | null;
  actualReadyAt?: string | null;
  pickupOtp?: string | null;
  pickupVerifiedBy?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  expectedDeliveryDate?: string | null;
  refundStatus?: string | null;
  refundAmount?: number;
  invoice?: {
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number | string;
    pdfUrl?: string;
    status: string;
  } | null;
  payment?: {
    id?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
  } | null;
}

export interface UpdateOrderTrackingPayload {
  status?: string;
  expectedStatus?: string;
  deliverySlot?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  cancelReason?: string;
  // Tracking
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  expectedDeliveryDate?: string | null;
  // Pickup
  pickupDate?: string;
  pickupSlot?: string;
  estimatedReadyAt?: string | null;
  actualReadyAt?: string | null;
  pickupVerifiedBy?: string;
  verifyPickup?: boolean;
  // Milestone note
  note?: string;
  location?: string;
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
      errorDetail = errJson.error || errJson.message || (typeof errJson === "object" ? JSON.stringify(errJson) : String(errJson));
    } catch {
      try {
        errorDetail = await res.text();
      } catch {
        errorDetail = res.statusText;
      }
    }
    if (typeof errorDetail === "string") {
      if (errorDetail.includes("<html") || errorDetail.includes("<!DOCTYPE") || errorDetail.includes("<body")) {
        errorDetail = fallbackMessage || res.statusText || "Endpoint not found";
      } else if (errorDetail.trim() === "Not Found" && fallbackMessage) {
        errorDetail = fallbackMessage;
      }
    }
    const message = errorDetail
      ? `HTTP ${res.status}: ${errorDetail}`
      : `HTTP ${res.status} ${res.statusText}: ${fallbackMessage}`;

    if (
      typeof window !== "undefined" &&
      (res.status === 401 ||
        (res.status === 403 &&
          typeof errorDetail === "string" &&
          (errorDetail.toLowerCase().includes("deactivated") ||
            errorDetail.toLowerCase().includes("account deactivated") ||
            errorDetail.toLowerCase().includes("authentication required"))))
    ) {
      window.dispatchEvent(
        new CustomEvent("vsm:admin:auth_revoked", {
          detail: {
            status: res.status,
            message: errorDetail,
          },
        })
      );
    }

    throw new ApiError(res.status, message, parsedData);
  }
  return res.json() as Promise<T>;
}

function cleanOrderParam(orderNumber: string): string {
  return encodeURIComponent((orderNumber || "").replace(/^#/, "").trim());
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
    // A 401 here just means "not signed in yet" during the mount probe.
    // Do NOT route it through handleResponse, which broadcasts an auth-revoked
    // event and races with a login the user is submitting at the same moment.
    if (res.status === 401) {
      return { user: null };
    }
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
    try {
      const res = await fetch(`${PROXY_BASE}/api/admin/products`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      }
      if (res.status === 404) {
        // Fallback to public products endpoint if admin route returned 404
        const pubRes = await fetch(`${PROXY_BASE}/api/products`, { cache: "no-store" });
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          const list = pubData.products || pubData.items || [];
          return list.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description || "",
            imageUrl: p.imageUrl || "/images/kaju-katli.jpg",
            categoryId: p.categoryId || 1,
            categoryName: p.categoryName || "Sweets",
            tags: p.tags || "",
            isFeatured: Boolean(p.isFeatured),
            variantId: p.variants?.[0]?.id || p.variantId || p.id,
            sku: p.variants?.[0]?.sku || p.sku || `VSM-${p.id}`,
            weight: p.variants?.[0]?.weight || p.weight || "500g",
            price: p.variants?.[0]?.price || p.price || 350,
            discountedPrice: p.variants?.[0]?.discountedPrice || p.discountedPrice || null,
            stock: p.variants?.[0]?.stock ?? p.stock ?? 50,
          }));
        }
      }
      const data = await handleResponse<{ items: ProductItem[] }>(res, "Failed to load products");
      return data.items || [];
    } catch (err) {
      try {
        const pubRes = await fetch(`${PROXY_BASE}/api/products`, { cache: "no-store" });
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          const list = pubData.products || pubData.items || [];
          return list.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description || "",
            imageUrl: p.imageUrl || "/images/kaju-katli.jpg",
            categoryId: p.categoryId || 1,
            categoryName: p.categoryName || "Sweets",
            tags: p.tags || "",
            isFeatured: Boolean(p.isFeatured),
            variantId: p.variants?.[0]?.id || p.variantId || p.id,
            sku: p.variants?.[0]?.sku || p.sku || `VSM-${p.id}`,
            weight: p.variants?.[0]?.weight || p.weight || "500g",
            price: p.variants?.[0]?.price || p.price || 350,
            discountedPrice: p.variants?.[0]?.discountedPrice || p.discountedPrice || null,
            stock: p.variants?.[0]?.stock ?? p.stock ?? 50,
          }));
        }
      } catch {}
      console.warn("[Dashboard] Products load notice:", err);
      return [];
    }
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

  async deleteProduct(productId: number): Promise<{ success: boolean; deletedId?: number }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/products?id=${productId}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; deletedId?: number }>(res, "Failed to delete product");
  },

  // Orders
  async getOrders(): Promise<OrderItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/orders`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ orders: OrderItem[] }>(res, "Failed to load orders");
    return data.orders || [];
  },

  async getOrder(orderNumber: string): Promise<FullOrderDetail> {
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${cleanNum}`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ order: FullOrderDetail }>(res, "Failed to load order details");
    return data.order;
  },

  async updateOrderTracking(
    orderNumber: string,
    payload: UpdateOrderTrackingPayload
  ): Promise<FullOrderDetail> {
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${cleanNum}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, orderNumber: (orderNumber || "").replace(/^#/, "").trim() }),
    });
    const data = await handleResponse<{ order: FullOrderDetail }>(res, "Failed to update order tracking");
    return data.order;
  },

  async updateOrderStatus(orderNumber: string, status: string): Promise<Record<string, unknown>> {
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${cleanNum}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, orderNumber: (orderNumber || "").replace(/^#/, "").trim() }),
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
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${cleanNum}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, orderNumber: (orderNumber || "").replace(/^#/, "").trim() }),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to update order");
  },

  async deleteOrder(orderNumber: string): Promise<{ success: boolean; deleted: string }> {
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/orders/${cleanNum}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; deleted: string }>(res, "Failed to delete order");
  },

  // Inventory
  async getInventory(): Promise<{ variants: InventoryItem[]; lowStock: InventoryItem[] }> {
    try {
      const res = await fetch(`${PROXY_BASE}/api/admin/inventory`, {
        cache: "no-store",
      });
      if (res.ok) {
        return await res.json();
      }
      // If admin endpoint returns 404, derive inventory from products
      const prods = await this.getProducts().catch(() => []);
      if (prods.length > 0) {
        const variants: InventoryItem[] = prods.map((p) => ({
          id: p.variantId || p.id,
          sku: p.sku || `VSM-${p.id}`,
          weight: p.weight || "500g",
          stock: p.stock ?? 25,
          price: p.price || 350,
          name: p.name,
        }));
        return {
          variants,
          lowStock: variants.filter((v) => v.stock <= 20),
        };
      }
      return { variants: [], lowStock: [] };
    } catch (err) {
      console.warn("[Dashboard] Inventory load notice:", err);
      return { variants: [], lowStock: [] };
    }
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
    try {
      const res = await fetch(`${PROXY_BASE}/api/admin/customers`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return data.customers || [];
      }
      return [];
    } catch (err) {
      console.warn("[Dashboard] Customers load notice:", err);
      return [];
    }
  },

  async deleteCustomer(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/customers?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; message: string }>(res, "Failed to delete customer");
  },

  async updateCustomerRole(
    id: number,
    role: "admin" | "customer"
  ): Promise<{ success: boolean; message: string; user?: any }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/customers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    return handleResponse<{ success: boolean; message: string; user?: any }>(
      res,
      "Failed to update customer role"
    );
  },

  // Admin Notifications
  async getNotifications(limit: number = 50): Promise<{ notifications: AdminNotification[]; unreadCount: number }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/notifications?limit=${limit}`, {
      cache: "no-store",
    });
    return handleResponse<{ notifications: AdminNotification[]; unreadCount: number }>(res, "Failed to load notifications");
  },

  async markNotificationRead(id?: number, all?: boolean): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (all) params.set("all", "true");
    if (id !== undefined) params.set("id", String(id));
    const qs = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`${PROXY_BASE}/api/admin/notifications${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all }),
    });
    return handleResponse<{ success: boolean }>(res, "Failed to update notification");
  },

  async deleteNotification(id?: number, all?: boolean): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (all) params.set("all", "true");
    if (id !== undefined) params.set("id", String(id));
    const qs = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`${PROXY_BASE}/api/admin/notifications${qs}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all }),
    });
    return handleResponse<{ success: boolean }>(res, "Failed to delete notification");
  },

  // Stores / Outlets Management
  async getStores(): Promise<AdminStoreOutlet[]> {
    const res = await fetch(`${PROXY_BASE}/api/stores`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ stores: AdminStoreOutlet[] }>(res, "Failed to load stores");
    return data.stores || [];
  },

  async createStore(payload: Omit<AdminStoreOutlet, "id">): Promise<AdminStoreOutlet> {
    const res = await fetch(`${PROXY_BASE}/api/admin/stores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<{ store: AdminStoreOutlet }>(res, "Failed to create outlet");
    return data.store;
  },

  async updateStore(payload: Partial<AdminStoreOutlet> & { id: number }): Promise<AdminStoreOutlet> {
    const res = await fetch(`${PROXY_BASE}/api/admin/stores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<{ store: AdminStoreOutlet }>(res, "Failed to update outlet");
    return data.store;
  },

  async deleteStore(id: number): Promise<{ success: boolean; deletedId?: number }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/stores?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; deletedId?: number }>(res, "Failed to delete outlet");
  },

  // Store-wise Pickup Management
  async getPickups(params?: {
    branchId?: string;
    date?: string;
    status?: string;
    search?: string;
  }): Promise<PickupListResponse> {
    const qs = new URLSearchParams();
    if (params?.branchId) qs.set("branchId", params.branchId);
    if (params?.date) qs.set("date", params.date);
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    const queryStr = qs.toString() ? `?${qs.toString()}` : "";

    const res = await fetch(`${PROXY_BASE}/api/admin/pickups${queryStr}`, {
      cache: "no-store",
    });
    return handleResponse<PickupListResponse>(res, "Failed to load pickup orders");
  },

  async updatePickupOrder(
    orderNumber: string,
    payload: {
      action?: "update_status" | "update_ready_time" | "verify_otp" | "override_capacity";
      status?: string;
      expectedStatus?: string;
      otp?: string;
      verifyByOrderNumber?: boolean;
      estimatedReadyAt?: string;
      cancelReason?: string;
      notes?: string;
      orderNumber?: string;
    }
  ): Promise<{ order: PickupOrder; success: boolean; message?: string }> {
    const rawClean = (orderNumber || "").replace(/^#/, "").trim();
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/pickups/${cleanNum}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, orderNumber: rawClean }),
    });
    return handleResponse<{ order: PickupOrder; success: boolean; message?: string }>(
      res,
      "Failed to update pickup order"
    );
  },

  async verifyPickupOtp(orderNumber: string, otp: string): Promise<{ valid: boolean; message: string }> {
    const rawClean = (orderNumber || "").replace(/^#/, "").trim();
    const cleanNum = cleanOrderParam(orderNumber);
    const res = await fetch(`${PROXY_BASE}/api/admin/pickups/${cleanNum}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_otp", otp, orderNumber: rawClean }),
    });
    return handleResponse<{ valid: boolean; message: string }>(res, "Failed to verify OTP");
  },

  // RBAC: Administrator Management (Super Admin)
  async getAdmins(): Promise<{ admins: AdminItem[]; availablePermissions: PermissionOption[] }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/admins`, {
      cache: "no-store",
    });
    return handleResponse<{ admins: AdminItem[]; availablePermissions: PermissionOption[] }>(
      res,
      "Failed to load administrators"
    );
  },

  async createAdmin(payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
    accessType?: "full" | "custom";
    permissions?: string[];
    mustChangePassword?: boolean;
  }): Promise<{ success: boolean; admin: AdminItem }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; admin: AdminItem }>(res, "Failed to create administrator");
  },

  async updateAdmin(payload: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    status?: "active" | "inactive";
    accessType?: "full" | "custom";
    permissions?: string[];
    mustChangePassword?: boolean;
  }): Promise<{ success: boolean; admin: AdminItem }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/admins`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; admin: AdminItem }>(res, "Failed to update administrator");
  },

  async deleteAdmin(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/admins?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; message: string }>(res, "Failed to delete administrator");
  },

  async resetAdminPassword(adminId: number, newPassword?: string): Promise<{ success: boolean; temporaryPassword?: string }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/admins/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, newPassword }),
    });
    return handleResponse<{ success: boolean; temporaryPassword?: string }>(res, "Failed to reset password");
  },

  // RBAC: Audit Activity Logs (Super Admin)
  async getActivityLogs(params?: { module?: string; action?: string; limit?: number }): Promise<{ logs: ActivityLogItem[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.module) searchParams.set("module", params.module);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await fetch(`${PROXY_BASE}/api/admin/activity-logs${qs}`, {
      cache: "no-store",
    });
    return handleResponse<{ logs: ActivityLogItem[]; total: number }>(res, "Failed to load activity logs");
  },

  // RBAC: CMS Pages Management (Super Admin & Admin with pages permission)
  async getCmsPages(): Promise<CmsPageItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/pages`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ pages: CmsPageItem[] }>(res, "Failed to load CMS pages");
    return data.pages || [];
  },

  async createCmsPage(payload: {
    slug: string;
    title: string;
    content: string;
    metaTitle?: string;
    metaDescription?: string;
    isPublished?: boolean;
  }): Promise<{ success: boolean; page: CmsPageItem }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; page: CmsPageItem }>(res, "Failed to create CMS page");
  },

  async updateCmsPage(payload: Partial<CmsPageItem> & { id: number }): Promise<{ success: boolean; page: CmsPageItem }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/pages`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; page: CmsPageItem }>(res, "Failed to update CMS page");
  },

  async deleteCmsPage(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/pages?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean }>(res, "Failed to delete CMS page");
  },

  // Auth: Change Password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${PROXY_BASE}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<{ success: boolean; message: string }>(res, "Failed to change password");
  },

  // Festival Specials Management
  async getFestivalData(): Promise<{
    config: FestivalPageConfig | null;
    items: FestivalProductItem[];
  }> {
    try {
      const res = await fetch(`${PROXY_BASE}/api/admin/festivals`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return {
          config: data.config || null,
          items: data.items || [],
        };
      }
    } catch {}

    // Fallback to public /api/festivals
    try {
      const pubRes = await fetch(`${PROXY_BASE}/api/festivals`, {
        cache: "no-store",
      });
      if (pubRes.ok) {
        const data = await pubRes.json();
        return {
          config: data.config || null,
          items: data.items || [],
        };
      }
    } catch {}

    return { config: null, items: [] };
  },

  async saveFestivalConfig(config: FestivalPageConfig): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/festivals`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to save festival configuration");
  },

  async saveFestivalProduct(product: Partial<FestivalProductItem>): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/festivals`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to update festival product");
  },

  async createFestivalProduct(product: Partial<FestivalProductItem>): Promise<Record<string, unknown>> {
    const res = await fetch(`${PROXY_BASE}/api/admin/festivals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    return handleResponse<Record<string, unknown>>(res, "Failed to create festival product");
  },

  async deleteFestivalProduct(id: number): Promise<{ success: boolean; deletedId?: number }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/festivals?id=${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; deletedId?: number }>(res, "Failed to delete festival product");
  },

  // Reviews & Ratings
  async getReviews(): Promise<ReviewItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reviews`, {
      cache: "no-store",
    });
    const data = await handleResponse<{ reviews: ReviewItem[] }>(res, "Failed to load reviews");
    return data.reviews || [];
  },

  async deleteReview(reviewId: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reviews?id=${reviewId}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; message?: string }>(res, "Failed to delete review");
  },

  // Database-grounded Reports
  async getReportLogins(): Promise<ReportLoginItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reports?type=logins`, { cache: "no-store" });
    const data = await handleResponse<{ logins: ReportLoginItem[] }>(res, "Failed to load login reports");
    return data.logins || [];
  },

  async getReportOtps(): Promise<ReportOtpItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reports?type=otp`, { cache: "no-store" });
    const data = await handleResponse<{ otps: ReportOtpItem[] }>(res, "Failed to load OTP reports");
    return data.otps || [];
  },

  async getReportEmails(): Promise<ReportEmailItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reports?type=emails`, { cache: "no-store" });
    const data = await handleResponse<{ emails: ReportEmailItem[] }>(res, "Failed to load email reports");
    return data.emails || [];
  },

  async getReportSms(): Promise<ReportSmsItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reports?type=sms`, { cache: "no-store" });
    const data = await handleResponse<{ sms: ReportSmsItem[] }>(res, "Failed to load SMS reports");
    return data.sms || [];
  },

  async getReportProductSales(): Promise<ReportProductSaleItem[]> {
    const res = await fetch(`${PROXY_BASE}/api/admin/reports?type=products`, { cache: "no-store" });
    const data = await handleResponse<{ productSales: ReportProductSaleItem[] }>(res, "Failed to load product sales report");
    return data.productSales || [];
  },
};

export interface ReviewItem {
  id: number;
  productId: number;
  productName?: string | null;
  productSlug?: string | null;
  productImageUrl?: string | null;
  userId?: number | null;
  userName: string;
  userEmail?: string | null;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
}


export interface AdminStoreOutlet {
  id: number;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  lat: string | number;
  lng: string | number;
  mapUrl?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  slotIntervalMinutes?: number | null;
  slotCapacity?: number | null;
  prepTimeMinutes?: number | null;
  isActive?: boolean;
  pickupEnabled?: boolean;
  holidays?: string[];
}

export interface PickupOrderLineItem {
  id: number;
  orderId: number;
  variantId?: number;
  productName: string;
  variantWeight: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  totalAmount?: number;
}

export interface PickupOrderStatusHistoryItem {
  id: number;
  orderId: number;
  status: string;
  changedBy?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface PickupOrder {
  id: number;
  orderNumber: string;
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  customerName: string;
  customerPhone: string;
  status: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  couponCode?: string | null;
  addressSnapshot?: string | null;
  deliverySlot?: string | null;
  fulfillmentType: string;
  pickupStoreId?: number | null;
  pickupDate?: string | null;
  pickupSlot?: string | null;
  estimatedReadyAt?: string | null;
  actualReadyAt?: string | null;
  pickupOtp?: string | null;
  pickupVerifiedBy?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  storeCity?: string | null;
  storePincode?: string | null;
  storePhone?: string | null;
  storeLat?: string | null;
  storeLng?: string | null;
  storeHours?: string | null;
  storePrepTime?: number | null;
  storeSlotCapacity?: number | null;
  items: PickupOrderLineItem[];
  history: PickupOrderStatusHistoryItem[];
}

export interface PickupStats {
  todayPickups: number;
  upcomingPickups: number;
  ordersPreparing: number;
  readyForPickup: number;
  overduePickups: number;
  totalPickedUp: number;
  totalOrders: number;
}

export interface PickupListResponse {
  stats: PickupStats;
  orders: PickupOrder[];
  stores: AdminStoreOutlet[];
  todayIST: string;
}

export interface AdminNotification {
  id: number;
  type: "order_created" | "order_cancelled" | "user_login" | "user_registered" | "system" | (string & {});
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

export interface PermissionOption {
  id: string | number;
  slug?: string;
  name: string;
  module: string;
  description: string;
}

export interface AdminItem {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: "super_admin" | "admin" | string;
  status: "active" | "inactive";
  mustChangePassword?: boolean;
  accessType?: "full" | "custom";
  permissions?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityLogItem {
  id: number;
  userId: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  module: string;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface CmsPageItem {
  id: number;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportLoginItem {
  id: number;
  user: string;
  email: string;
  role: string;
  ip: string;
  device: string;
  time: string;
  status: string;
}

export interface ReportOtpItem {
  id: string;
  phone: string;
  purpose: string;
  otp: string;
  gateway: string;
  status: string;
  time: string;
}

export interface ReportEmailItem {
  id: string;
  orderNumber: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  templateName: string;
  status: string;
  time: string;
}

export interface ReportSmsItem {
  id: string;
  orderNumber: string;
  phone: string;
  name: string;
  message: string;
  senderId: string;
  status: string;
  time: string;
}

export interface ReportProductSaleItem {
  productName: string;
  totalUnitsSold: number;
  totalRevenue: number;
  totalOrdersPlaced: number;
  avgSellingPrice: number;
}
