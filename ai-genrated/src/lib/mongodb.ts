import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  __mongoClient?: MongoClient;
  __mongoDb?: Db;
  __mongoConnectPromise?: Promise<Db | null>;
};

export const DEFAULT_ATLAS_URI =
  "mongodb+srv://Vercel-Admin-vvardayini-sweets:ySIyMNTXmSNgSO8g@vvardayini-sweets.zd9rfo6.mongodb.net/vardayini-sweets?retryWrites=true&w=majority";

export function resolveMongoUri(): string {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
    return process.env.MONGODB_URI.trim();
  }
  // On Vercel or production environments, automatically connect to the Atlas cluster
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return DEFAULT_ATLAS_URI;
  }
  return "mongodb://127.0.0.1:27017/vardayini_sweets";
}

let mongoOfflineUntil = 0;
const MONGO_COOLDOWN_MS = 30000;

export function getMongoClient(): MongoClient {
  if (!globalForMongo.__mongoClient) {
    const uri = resolveMongoUri();
    const isLocal = /(?:^|[/:])localhost|127\.0\.0\.1|\[?::1\]?/.test(uri);
    globalForMongo.__mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: isLocal ? 800 : 10000,
      connectTimeoutMS: isLocal ? 1000 : 10000,
    });
  }
  return globalForMongo.__mongoClient;
}

export async function getMongoDb(): Promise<Db | null> {
  if (globalForMongo.__mongoDb) return globalForMongo.__mongoDb;
  if (Date.now() < mongoOfflineUntil) return null;

  if (!globalForMongo.__mongoConnectPromise) {
    globalForMongo.__mongoConnectPromise = (async () => {
      try {
        const client = getMongoClient();
        await client.connect();
        const uri = resolveMongoUri();
        const rawDbName = uri.split("/").pop()?.split("?")[0]?.trim();
        const uriDbName = rawDbName && rawDbName.length > 0 ? rawDbName : undefined;
        const dbName =
          process.env.MONGODB_DB?.trim() || uriDbName || "vardayini-sweets";
        const db = client.db(dbName);
        globalForMongo.__mongoDb = db;
        console.log(`[MongoDB] Connected to database: ${dbName}`);
        return db;
      } catch (err: unknown) {
        mongoOfflineUntil = Date.now() + MONGO_COOLDOWN_MS;
        globalForMongo.__mongoConnectPromise = undefined;
        console.warn(
          "[MongoDB] Server offline, cooling down for 30s:",
          (err as Error).message
        );
        return null;
      }
    })();
  }
  return globalForMongo.__mongoConnectPromise;
}

// ============================================================================
// USERS & CUSTOMERS CRUD
// ============================================================================

export async function syncUserToMongo(user: {
  id?: number | null;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role?: string;
  status?: string;
  accessType?: string;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const usersCol = db.collection("users");
    const email = user.email.toLowerCase().trim();
    await usersCol.updateOne(
      { email },
      {
        $set: {
          id: user.id || undefined,
          name: user.name,
          email,
          phone: user.phone,
          passwordHash: user.passwordHash,
          role: user.role || "customer",
          status: user.status || "active",
          accessType: user.accessType || "full",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] user sync notice:", err);
  }
}

export async function getUserFromMongo(email: string) {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    const usersCol = db.collection("users");
    const userDoc = await usersCol.findOne({ email: email.toLowerCase().trim() });
    if (!userDoc) return null;
    return {
      id: userDoc.id || 1,
      name: userDoc.name,
      email: userDoc.email,
      phone: userDoc.phone,
      password_hash: userDoc.passwordHash,
      role: userDoc.role,
      status: userDoc.status || "active",
      access_type: userDoc.accessType || "full",
    };
  } catch {
    return null;
  }
}

export async function deleteUserFromMongo(id: number) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("users").deleteOne({ id });
    await db.collection("cart_items").deleteMany({ userId: id });
    await db.collection("wishlist_items").deleteMany({ userId: id });
    await db.collection("addresses").deleteMany({ userId: id });
  } catch (err) {
    console.warn("[MongoDB] user delete notice:", err);
  }
}

// ============================================================================
// ORDERS & ORDER ITEMS CRUD
// ============================================================================

export interface MongoOrderItemInput {
  productName: string;
  variantWeight?: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export async function syncOrderToMongo(
  order: {
    orderNumber: string;
    userId?: number | null;
    guestName?: string | null;
    guestPhone?: string | null;
    status?: string;
    subtotal?: number;
    discount?: number;
    deliveryFee?: number;
    tax?: number;
    total?: number;
    couponCode?: string | null;
    addressSnapshot?: string | null | Record<string, unknown>;
    deliverySlot?: string | null;
    paymentMethod?: string;
    paymentStatus?: string;
    fulfillmentType?: string | null;
    pickupStoreId?: number | null;
    pickupDate?: string | null;
    pickupSlot?: string | null;
    estimatedReadyAt?: Date | string | null;
    pickupOtp?: string | null;
    [key: string]: any;
  },
  items?: MongoOrderItemInput[]
) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const ordersCol = db.collection("orders");
    await ordersCol.updateOne(
      { orderNumber: order.orderNumber },
      {
        $set: {
          ...order,
          items: items || [],
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] order sync notice:", err);
  }
}

export async function updateOrderDetailsInMongo(
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
) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("orders").updateOne(
      { orderNumber },
      { $set: { ...fields, updatedAt: new Date() } }
    );
  } catch (err) {
    console.warn("[MongoDB] order update notice:", err);
  }
}

export async function deleteOrderFromMongo(orderNumber: string) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("orders").deleteOne({ orderNumber });
  } catch (err) {
    console.warn("[MongoDB] order delete notice:", err);
  }
}

// ============================================================================
// PRODUCTS & VARIANTS CRUD
// ============================================================================

export async function syncProductToMongo(product: {
  id?: number | null;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  tags?: string | null;
  isFeatured?: boolean;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("products").updateOne(
      { slug: product.slug },
      {
        $set: {
          ...product,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] product sync notice:", err);
  }
}

export async function deleteProductFromMongo(productId: number) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("products").deleteOne({ id: productId });
    await db.collection("product_variants").deleteMany({ productId });
  } catch (err) {
    console.warn("[MongoDB] product delete notice:", err);
  }
}

export async function syncProductVariantToMongo(variant: {
  id?: number | null;
  productId: number;
  weight: string;
  sku: string;
  price: number;
  discountedPrice?: number | null;
  stock: number;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("product_variants").updateOne(
      { sku: variant.sku },
      {
        $set: {
          ...variant,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] variant sync notice:", err);
  }
}

export async function updateVariantStockInMongo(
  variantId: number,
  fields: { stock?: number; price?: number; discountedPrice?: number | null; weight?: string }
) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("product_variants").updateOne(
      { id: variantId },
      { $set: { ...fields, updatedAt: new Date() } }
    );
  } catch (err) {
    console.warn("[MongoDB] stock update notice:", err);
  }
}

// ============================================================================
// CATEGORIES CRUD
// ============================================================================

export async function syncCategoryToMongo(category: {
  id?: number | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder?: number;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("categories").updateOne(
      { slug: category.slug },
      {
        $set: {
          ...category,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] category sync notice:", err);
  }
}

export async function deleteCategoryFromMongo(categoryId: number) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("categories").deleteOne({ id: categoryId });
  } catch (err) {
    console.warn("[MongoDB] category delete notice:", err);
  }
}

// ============================================================================
// STORES & OUTLETS CRUD
// ============================================================================

export async function syncStoreToMongo(store: {
  id?: number | null;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  lat: string | number;
  lng: string | number;
  mapUrl?: string | null;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("stores").updateOne(
      { name: store.name, city: store.city },
      {
        $set: {
          ...store,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] store sync notice:", err);
  }
}

export async function deleteStoreFromMongo(storeId: number) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection("stores").deleteOne({ id: storeId });
  } catch (err) {
    console.warn("[MongoDB] store delete notice:", err);
  }
}

// ============================================================================
// NOTIFICATIONS CRUD
// ============================================================================

export async function syncNotificationToMongo(notification: {
  id?: number | string | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead?: boolean;
  createdAt?: Date | string;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("admin_notifications");
    if (notification.id !== undefined && notification.id !== null) {
      const numId = Number(notification.id);
      const strId = String(notification.id);
      const idVal = isNaN(numId) ? strId : numId;
      await col.updateOne(
        { $or: [{ id: numId }, { _id: strId as any }, { id: strId }] } as any,
        {
          $set: {
            _id: strId,
            id: idVal,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data ?? null,
            isRead: Boolean(notification.isRead),
            createdAt: notification.createdAt ? new Date(notification.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } else {
      await col.insertOne({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ?? null,
        isRead: Boolean(notification.isRead),
        createdAt: notification.createdAt ? new Date(notification.createdAt) : new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.warn("[MongoDB] notification sync notice:", err);
  }
}

export async function getNotificationsFromMongo(limit: number = 50) {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    return await db
      .collection("admin_notifications")
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn("[MongoDB] get notifications notice:", err);
    return null;
  }
}

export async function markNotificationReadInMongo(id?: number | string | null, all: boolean = false) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("admin_notifications");
    if (all) {
      await col.updateMany({}, { $set: { isRead: true, updatedAt: new Date() } });
    } else if (id !== undefined && id !== null) {
      const numId = Number(id);
      const strId = String(id);
      await col.updateOne(
        { $or: [{ id: numId }, { _id: strId as any }, { id: strId }] } as any,
        { $set: { isRead: true, updatedAt: new Date() } }
      );
    }
  } catch (err) {
    console.warn("[MongoDB] mark read notice:", err);
  }
}

export async function deleteNotificationFromMongo(id?: number | string | null, all: boolean = false) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("admin_notifications");
    if (all) {
      await col.deleteMany({});
    } else if (id !== undefined && id !== null) {
      const numId = Number(id);
      const strId = String(id);
      await col.deleteOne({ $or: [{ id: numId }, { _id: strId as any }, { id: strId }] } as any);
    }
  } catch (err) {
    console.warn("[MongoDB] delete notification notice:", err);
  }
}

// ============================================================================
// OTP & SMS LOGS CRUD (SERVERLESS PERSISTENCE & MULTI-CONTAINER SHARING)
// ============================================================================

export async function syncOtpToMongo(data: {
  phone: string;
  otpCode: string;
  purpose: string;
  gateway: string;
  status?: string;
  expiresAt: Date;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    const col = db.collection("otp_logs");
    // Supersede older pending OTPs for the same phone and purpose
    await col.updateMany(
      { phone: data.phone, purpose: data.purpose, status: "Pending" },
      { $set: { status: "Superseded", updatedAt: new Date() } }
    );
    const res = await col.insertOne({
      phone: data.phone,
      otp_code: data.otpCode,
      purpose: data.purpose,
      gateway: data.gateway,
      status: data.status || "Pending",
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.insertedId;
  } catch (err) {
    console.warn("[MongoDB] syncOtpToMongo notice:", err);
    return null;
  }
}

export async function findActiveOtpInMongo(phone: string, purpose: string) {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    const col = db.collection("otp_logs");
    return await col.findOne(
      { phone, purpose, status: "Pending" },
      { sort: { createdAt: -1, _id: -1 } }
    );
  } catch (err) {
    console.warn("[MongoDB] findActiveOtpInMongo notice:", err);
    return null;
  }
}

export async function updateOtpStatusInMongo(filter: any, status: string) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("otp_logs");
    await col.updateMany(filter, { $set: { status, updatedAt: new Date() } });
  } catch (err) {
    console.warn("[MongoDB] updateOtpStatusInMongo notice:", err);
  }
}

// ============================================================================
// CART ITEMS CRUD (SERVERLESS PERSISTENCE ACROSS VERCEL INSTANCES)
// ============================================================================

export async function getMongoCartItems(identity: {
  userId?: number | null;
  sessionId?: string | null;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return [];
    const col = db.collection("cart_items");
    const orConditions: any[] = [];
    if (identity.userId && identity.userId > 0) {
      orConditions.push({ userId: identity.userId });
    }
    if (identity.sessionId) {
      orConditions.push({ sessionId: identity.sessionId });
    }
    if (orConditions.length === 0) return [];

    return await col.find({ $or: orConditions }).toArray();
  } catch (err) {
    console.warn("[MongoDB] getMongoCartItems notice:", err);
    return [];
  }
}

export async function upsertMongoCartItem(data: {
  userId?: number | null;
  sessionId?: string | null;
  variantId: number;
  quantity: number;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("cart_items");
    const orConditions: any[] = [];
    if (data.userId && data.userId > 0) {
      orConditions.push({ userId: data.userId });
    }
    if (data.sessionId) {
      orConditions.push({ sessionId: data.sessionId });
    }
    if (orConditions.length === 0) return;

    const existing = await col.findOne({
      $or: orConditions,
      variantId: data.variantId,
    });

    if (existing) {
      await col.updateOne(
        { _id: existing._id },
        {
          $inc: { quantity: data.quantity },
          $set: {
            userId: data.userId ?? existing.userId,
            sessionId: data.sessionId ?? existing.sessionId,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await col.insertOne({
        userId: data.userId ?? null,
        sessionId: data.sessionId ?? null,
        variantId: data.variantId,
        quantity: data.quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.warn("[MongoDB] upsertMongoCartItem notice:", err);
  }
}

export async function updateMongoCartItemQuantity(data: {
  userId?: number | null;
  sessionId?: string | null;
  variantId: number;
  quantity: number;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("cart_items");
    const orConditions: any[] = [];
    if (data.userId && data.userId > 0) {
      orConditions.push({ userId: data.userId });
    }
    if (data.sessionId) {
      orConditions.push({ sessionId: data.sessionId });
    }
    if (orConditions.length === 0) return;

    if (data.quantity <= 0) {
      await col.deleteMany({
        $or: orConditions,
        variantId: data.variantId,
      });
    } else {
      await col.updateMany(
        {
          $or: orConditions,
          variantId: data.variantId,
        },
        {
          $set: { quantity: data.quantity, updatedAt: new Date() },
        }
      );
    }
  } catch (err) {
    console.warn("[MongoDB] updateMongoCartItemQuantity notice:", err);
  }
}

export async function removeMongoCartItem(data: {
  userId?: number | null;
  sessionId?: string | null;
  variantId: number;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("cart_items");
    const orConditions: any[] = [];
    if (data.userId && data.userId > 0) {
      orConditions.push({ userId: data.userId });
    }
    if (data.sessionId) {
      orConditions.push({ sessionId: data.sessionId });
    }
    if (orConditions.length === 0) return;

    await col.deleteMany({
      $or: orConditions,
      variantId: data.variantId,
    });
  } catch (err) {
    console.warn("[MongoDB] removeMongoCartItem notice:", err);
  }
}

export async function clearMongoCartItems(identity: {
  userId?: number | null;
  sessionId?: string | null;
}) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("cart_items");
    const orConditions: any[] = [];
    if (identity.userId && identity.userId > 0) {
      orConditions.push({ userId: identity.userId });
    }
    if (identity.sessionId) {
      orConditions.push({ sessionId: identity.sessionId });
    }
    if (orConditions.length === 0) return;

    await col.deleteMany({ $or: orConditions });
  } catch (err) {
    console.warn("[MongoDB] clearMongoCartItems notice:", err);
  }
}

export async function mergeMongoGuestCart(userId: number, sessionId: string) {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection("cart_items");
    const guestItems = await col.find({ sessionId }).toArray();

    for (const item of guestItems) {
      const userItem = await col.findOne({ userId, variantId: item.variantId });
      if (userItem) {
        await col.updateOne(
          { _id: userItem._id },
          {
            $inc: { quantity: item.quantity },
            $set: { updatedAt: new Date() },
          }
        );
        await col.deleteOne({ _id: item._id });
      } else {
        await col.updateOne(
          { _id: item._id },
          {
            $set: { userId, sessionId: null, updatedAt: new Date() },
          }
        );
      }
    }
  } catch (err) {
    console.warn("[MongoDB] mergeMongoGuestCart notice:", err);
  }
}

// ============================================================================
// CONNECTION TEST UTILITY
// ============================================================================

export async function testMongoConnection() {
  try {
    const db = await getMongoDb();
    if (!db) {
      return { success: false, error: "Could not connect to MongoDB server." };
    }
    const collections = await db.listCollections().toArray();
    const counts: Record<string, number> = {};
    for (const c of collections) {
      try {
        counts[c.name] = await db.collection(c.name).countDocuments();
      } catch {
        counts[c.name] = 0;
      }
    }
    const uri = resolveMongoUri();
    const hostMatch = uri.match(/@([^/?]+)/);
    const cluster = hostMatch ? hostMatch[1] : "localhost";
    return {
      success: true,
      message: "MongoDB connected successfully",
      database: db.databaseName,
      cluster,
      source: process.env.MONGODB_URI ? "custom_environment_variable" : "production_default_atlas",
      collections: counts,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
