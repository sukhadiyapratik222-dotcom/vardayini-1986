import {
  boolean,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("customer"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  accessType: varchar("access_type", { length: 20 }).notNull().default("full"),
  storeId: int("store_id"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorMethod: varchar("two_factor_method", { length: 20 }).notNull().default("totp"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("category_id")
    .notNull()
    .references(() => categories.id),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  tags: text("tags").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  weight: varchar("weight", { length: 40 }).notNull(),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  price: int("price").notNull(),
  discountedPrice: int("discounted_price"),
  stock: int("stock").notNull().default(0),
  packName: varchar("pack_name", { length: 80 }).default("Standard Pack"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 80 }),
  variantId: int("variant_id")
    .notNull()
    .references(() => productVariants.id),
  quantity: int("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  description: text("description").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  value: int("value").notNull(),
  minOrder: int("min_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  label: varchar("label", { length: 40 }).notNull().default("Home"),
  line1: varchar("line1", { length: 200 }).notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  state: varchar("state", { length: 80 }).notNull(),
  stateCode: varchar("state_code", { length: 10 }).notNull().default("24"),
  pincode: varchar("pincode", { length: 12 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  gstin: varchar("gstin", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  addressType: varchar("address_type", { length: 20 }).notNull().default("home"),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  userId: int("user_id").references(() => users.id),
  guestName: varchar("guest_name", { length: 120 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  sessionId: varchar("session_id", { length: 120 }),
  guestTokenHash: text("guest_token_hash"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  subtotal: int("subtotal").notNull(),
  discount: int("discount").notNull().default(0),
  deliveryFee: int("delivery_fee").notNull().default(0),
  tax: int("tax").notNull().default(0),
  total: int("total").notNull(),
  couponCode: varchar("coupon_code", { length: 40 }),
  addressSnapshot: text("address_snapshot").notNull(),
  deliverySlot: varchar("delivery_slot", { length: 80 }).notNull(),
  fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull().default("delivery"),
  pickupStoreId: int("pickup_store_id"),
  pickupDate: varchar("pickup_date", { length: 30 }),
  pickupSlot: varchar("pickup_slot", { length: 80 }),
  estimatedReadyAt: timestamp("estimated_ready_at"),
  actualReadyAt: timestamp("actual_ready_at"),
  pickupOtp: varchar("pickup_otp", { length: 10 }),
  pickupVerifiedBy: varchar("pickup_verified_by", { length: 120 }),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("pending"),
  courierName: varchar("courier_name", { length: 80 }),
  trackingNumber: varchar("tracking_number", { length: 80 }),
  trackingUrl: text("tracking_url"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  returnReason: text("return_reason"),
  returnStatus: varchar("return_status", { length: 40 }).notNull().default("none"),
  refundStatus: varchar("refund_status", { length: 40 }).notNull().default("none"),
  refundAmount: int("refund_amount").notNull().default(0),
  distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
  assignedStoreId: int("assigned_store_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  variantId: int("variant_id").references(() => productVariants.id),
  productName: varchar("product_name", { length: 160 }).notNull(),
  variantWeight: varchar("variant_weight", { length: 40 }).notNull(),
  unitPrice: int("unit_price").notNull(),
  quantity: int("quantity").notNull(),
  imageUrl: text("image_url").notNull(),
  hsnCode: varchar("hsn_code", { length: 20 }).notNull().default("21069099"),
  taxRate: int("tax_rate").notNull().default(5),
  taxableAmount: int("taxable_amount").notNull().default(0),
  cgstAmount: decimal("cgst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sgstAmount: decimal("sgst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  igstAmount: decimal("igst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: int("total_amount").notNull().default(0),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  paymentMethod: varchar("payment_method", { length: 40 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 40 }).notNull().default("pending"),
  transactionId: varchar("transaction_id", { length: 120 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  gatewayResponse: text("gateway_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 60 }).notNull().unique(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  placeOfSupply: varchar("place_of_supply", { length: 80 }).notNull(),
  isInterState: boolean("is_inter_state").notNull().default(false),
  sellerSnapshot: text("seller_snapshot").notNull(),
  buyerSnapshot: text("buyer_snapshot").notNull(),
  itemsSnapshot: text("items_snapshot").notNull(),
  taxableValue: decimal("taxable_value", { precision: 12, scale: 2 }).notNull(),
  cgst: decimal("cgst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  sgst: decimal("sgst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  igst: decimal("igst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  deliveryFee: decimal("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  roundOff: decimal("round_off", { precision: 6, scale: 2 }).notNull().default("0.00"),
  grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
  totalInWords: text("total_in_words").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("issued"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  status: varchar("status", { length: 40 }).notNull(),
  note: text("note"),
  location: varchar("location", { length: 120 }),
  changedBy: varchar("changed_by", { length: 40 }).notNull().default("system"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceSequences = mysqlTable("invoice_sequences", {
  year: int("year").primaryKey(),
  lastNumber: int("last_number").notNull().default(0),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  userId: int("user_id")
    .references(() => users.id),
  userName: varchar("user_name", { length: 160 }).notNull().default("Customer"),
  rating: int("rating").notNull(),
  comment: text("comment").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wishlistItems = mysqlTable(
  "wishlist_items",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    productId: int("product_id")
      .notNull()
      .references(() => products.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wishlist_user_product").on(table.userId, table.productId)],
);

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  pincode: varchar("pincode", { length: 12 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  hours: varchar("hours", { length: 80 }).notNull(),
  openingTime: varchar("opening_time", { length: 20 }).notNull().default("08:00"),
  closingTime: varchar("closing_time", { length: 20 }).notNull().default("22:30"),
  slotIntervalMinutes: int("slot_interval_minutes").notNull().default(60),
  slotCapacity: int("slot_capacity").notNull().default(10),
  prepTimeMinutes: int("prep_time_minutes").notNull().default(45),
  pickupRadiusKm: decimal("pickup_radius_km", { precision: 5, scale: 2 }).notNull().default("10.00"),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
  weeklyOff: varchar("weekly_off", { length: 30 }).default(""),
  deliveryCharge: int("delivery_charge").notNull().default(49),
  minOrderAmount: int("min_order_amount").notNull().default(0),
  freeDeliveryThreshold: int("free_delivery_threshold").notNull().default(799),
  isActive: boolean("is_active").notNull().default(true),
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  holidays: text("holidays"),
  lat: decimal("lat", { precision: 10, scale: 6 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 6 }).notNull(),
  mapUrl: text("map_url"),
});

export const adminNotifications = mysqlTable("admin_notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  data: text("data"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  module: varchar("module", { length: 80 }).notNull(),
  action: varchar("action", { length: 40 }).notNull().default("manage"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    roleId: int("role_id").notNull(),
    permissionId: int("permission_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("role_perm_idx").on(table.roleId, table.permissionId)],
);

export const adminPermissions = mysqlTable(
  "admin_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    permissionSlug: varchar("permission_slug", { length: 120 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_perm_user_slug_idx").on(table.userId, table.permissionSlug)],
);

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  userName: varchar("user_name", { length: 120 }),
  userEmail: varchar("user_email", { length: 160 }),
  userRole: varchar("user_role", { length: 40 }),
  action: varchar("action", { length: 80 }).notNull(),
  module: varchar("module", { length: 80 }).notNull(),
  recordId: int("record_id"),
  previousValue: text("previous_value"),
  updatedValue: text("updated_value"),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 60 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requester_id").notNull(),
  requesterName: varchar("requester_name", { length: 120 }).notNull(),
  requestType: varchar("request_type", { length: 80 }).notNull(),
  module: varchar("module", { length: 80 }).notNull(),
  recordId: int("record_id"),
  description: text("description").notNull(),
  payload: text("payload"),
  status: varchar("status", { length: 40 }).notNull().default("pending"),
  reviewerId: int("reviewer_id"),
  reviewerName: varchar("reviewer_name", { length: 120 }),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 60 }),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loginHistory = mysqlTable("login_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  email: varchar("email", { length: 160 }).notNull(),
  ipAddress: varchar("ip_address", { length: 60 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 40 }).notNull().default("success"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cmsPages = mysqlTable("cms_pages", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  content: text("content").notNull(),
  metaTitle: varchar("meta_title", { length: 200 }),
  metaDescription: text("meta_description"),
  isPublished: boolean("is_published").notNull().default(true),
  authorId: int("author_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const otpLogs = mysqlTable("otp_logs", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 30 }).notNull(),
  otpCode: varchar("otp_code", { length: 10 }).notNull(),
  purpose: varchar("purpose", { length: 120 }).notNull(),
  gateway: varchar("gateway", { length: 80 }).notNull().default("Fast2SMS DLT"),
  status: varchar("status", { length: 40 }).notNull().default("Verified"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }),
  recipientName: varchar("recipient_name", { length: 160 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 160 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  templateName: varchar("template_name", { length: 80 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("Delivered"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const smsLogs = mysqlTable("sms_logs", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }),
  recipientPhone: varchar("recipient_phone", { length: 30 }).notNull(),
  recipientName: varchar("recipient_name", { length: 160 }).notNull(),
  message: text("message").notNull(),
  senderId: varchar("sender_id", { length: 20 }).notNull().default("VRDYNI"),
  status: varchar("status", { length: 40 }).notNull().default("Delivered"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const serviceablePincodes = mysqlTable(
  "serviceable_pincodes",
  {
    id: int("id").autoincrement().primaryKey(),
    pincode: varchar("pincode", { length: 12 }).notNull(),
    storeId: int("store_id").references(() => stores.id),
    city: varchar("city", { length: 80 }).notNull().default("Vadodara"),
    state: varchar("state", { length: 80 }).notNull().default("Gujarat"),
    deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
    deliveryCharge: int("delivery_charge").notNull().default(49),
    minimumOrder: int("minimum_order").notNull().default(0),
    estimatedDeliveryTime: varchar("estimated_delivery_time", { length: 100 }).notNull().default("Today by 6:30 PM"),
    isExpress: boolean("is_express").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_serv_pincode").on(table.pincode), index("idx_serv_store_id").on(table.storeId)]
);

export const unserviceablePincodeLogs = mysqlTable("unserviceable_pincode_logs", {
  id: int("id").autoincrement().primaryKey(),
  pincode: varchar("pincode", { length: 12 }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  source: varchar("source", { length: 40 }).default("checkout"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trackingTokens = mysqlTable("tracking_tokens", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  orderNumber: varchar("order_number", { length: 40 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull().default("pickup"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderMedia = mysqlTable("order_media", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  orderNumber: varchar("order_number", { length: 40 }).notNull(),
  stage: varchar("stage", { length: 40 }).notNull(), // order_received | preparing | packed | ready_for_pickup | completed
  fileUrl: text("file_url").notNull(),
  mediaType: varchar("media_type", { length: 20 }).notNull().default("image"), // image | video
  sizeBytes: int("size_bytes").notNull().default(0),
  caption: text("caption"),
  uploadedBy: varchar("uploaded_by", { length: 80 }).notNull().default("Kitchen Staff"),
  hidden: boolean("hidden").notNull().default(false),
  deleteAfter: timestamp("delete_after"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kitchenCameras = mysqlTable("kitchen_cameras", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  streamUrl: text("stream_url").notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  storeId: int("store_id").references(() => stores.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kitchenSettings = mysqlTable("kitchen_settings", {
  id: int("id").autoincrement().primaryKey(),
  mode: varchar("mode", { length: 20 }).notNull().default("recorded"), // recorded | live | both
  homepageSectionEnabled: boolean("homepage_section_enabled").notNull().default(true),
  workingHoursStart: varchar("working_hours_start", { length: 10 }).notNull().default("07:00"),
  workingHoursEnd: varchar("working_hours_end", { length: 10 }).notNull().default("20:30"),
  retentionDays: int("retention_days").notNull().default(15),
  requireReadyPhoto: boolean("require_ready_photo").notNull().default(true),
  blurFacesNotice: boolean("blur_faces_notice").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
