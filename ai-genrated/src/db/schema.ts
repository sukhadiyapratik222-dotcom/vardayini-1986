import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  tags: text("tags").notNull().default(""),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  weight: varchar("weight", { length: 40 }).notNull(),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  price: integer("price").notNull(),
  discountedPrice: integer("discounted_price"),
  stock: integer("stock").notNull().default(0),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 80 }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  description: text("description").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  value: integer("value").notNull(),
  minOrder: integer("min_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
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
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  guestName: varchar("guest_name", { length: 120 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  sessionId: varchar("session_id", { length: 120 }),
  guestTokenHash: text("guest_token_hash"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  couponCode: varchar("coupon_code", { length: 40 }),
  addressSnapshot: text("address_snapshot").notNull(),
  deliverySlot: varchar("delivery_slot", { length: 80 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("pending"),
  courierName: varchar("courier_name", { length: 80 }),
  trackingNumber: varchar("tracking_number", { length: 80 }),
  trackingUrl: text("tracking_url"),
  expectedDeliveryDate: timestamp("expected_delivery_date", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  returnReason: text("return_reason"),
  returnStatus: varchar("return_status", { length: 40 }).notNull().default("none"),
  refundStatus: varchar("refund_status", { length: 40 }).notNull().default("none"),
  refundAmount: integer("refund_amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  variantId: integer("variant_id").references(() => productVariants.id),
  productName: varchar("product_name", { length: 160 }).notNull(),
  variantWeight: varchar("variant_weight", { length: 40 }).notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  imageUrl: text("image_url").notNull(),
  hsnCode: varchar("hsn_code", { length: 20 }).notNull().default("21069099"),
  taxRate: integer("tax_rate").notNull().default(5),
  taxableAmount: integer("taxable_amount").notNull().default(0),
  cgstAmount: numeric("cgst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sgstAmount: numeric("sgst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  igstAmount: numeric("igst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: integer("total_amount").notNull().default(0),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  paymentMethod: varchar("payment_method", { length: 40 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 40 }).notNull().default("pending"),
  transactionId: varchar("transaction_id", { length: 120 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  gatewayResponse: text("gateway_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 60 }).notNull().unique(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull().defaultNow(),
  placeOfSupply: varchar("place_of_supply", { length: 80 }).notNull(),
  isInterState: boolean("is_inter_state").notNull().default(false),
  sellerSnapshot: text("seller_snapshot").notNull(),
  buyerSnapshot: text("buyer_snapshot").notNull(),
  itemsSnapshot: text("items_snapshot").notNull(),
  taxableValue: numeric("taxable_value", { precision: 12, scale: 2 }).notNull(),
  cgst: numeric("cgst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  sgst: numeric("sgst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  igst: numeric("igst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  roundOff: numeric("round_off", { precision: 6, scale: 2 }).notNull().default("0.00"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  totalInWords: text("total_in_words").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("issued"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  status: varchar("status", { length: 40 }).notNull(),
  note: text("note"),
  location: varchar("location", { length: 120 }),
  changedBy: varchar("changed_by", { length: 40 }).notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceSequences = pgTable("invoice_sequences", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wishlist_user_product").on(table.userId, table.productId)],
);

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  pincode: varchar("pincode", { length: 12 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  hours: varchar("hours", { length: 80 }).notNull(),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
});
