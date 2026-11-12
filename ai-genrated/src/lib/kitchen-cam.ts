import { randomBytes } from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  trackingTokens,
  orderMedia,
  kitchenCameras,
  kitchenSettings,
  orders,
  orderItems,
  stores,
  orderStatusHistory,
} from "@/db/schema";

export interface StageMediaItem {
  id: number;
  stage: string;
  fileUrl: string;
  mediaType: "image" | "video";
  caption?: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface PickupTimelineStage {
  key: "order_received" | "preparing" | "packed" | "ready_for_pickup" | "completed";
  label: string;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  timestamp: string | null;
  media: StageMediaItem[];
}

export interface KitchenSettingsData {
  mode: "recorded" | "live" | "both";
  homepageSectionEnabled: boolean;
  workingHoursStart: string; // e.g. "07:00"
  workingHoursEnd: string; // e.g. "20:30"
  retentionDays: number;
  requireReadyPhoto: boolean;
  blurFacesNotice: boolean;
  isCurrentlyOpen?: boolean;
}

const DEFAULT_SETTINGS: KitchenSettingsData = {
  mode: "recorded",
  homepageSectionEnabled: true,
  workingHoursStart: "07:00",
  workingHoursEnd: "20:30",
  retentionDays: 15,
  requireReadyPhoto: true,
  blurFacesNotice: true,
};

/**
 * Checks if current IST time (Asia/Kolkata) falls within kitchen working hours
 */
export function isWithinKitchenWorkingHours(
  startStr: string = "07:00",
  endStr: string = "20:30"
): boolean {
  try {
    const nowIst = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const currentMinutes = nowIst.getHours() * 60 + nowIst.getMinutes();

    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);

    const startMinutes = (startH || 7) * 60 + (startM || 0);
    const endMinutes = (endH || 20) * 60 + (endM || 30);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return true;
  }
}

/**
 * Generates or retrieves a hard-to-guess private tracking token for a pickup order
 */
export async function getOrCreatePickupTrackingToken(
  orderId: number,
  orderNumber: string,
  fulfillmentType: string = "pickup"
): Promise<string> {
  // Check if token already exists for this order
  try {
    const [existing] = await db
      .select()
      .from(trackingTokens)
      .where(eq(trackingTokens.orderId, orderId))
      .limit(1);

    if (existing?.token) {
      return existing.token;
    }
  } catch (err) {
    console.warn("[KitchenCam] Error checking existing tracking token:", err);
  }

  // Generate cryptographically secure token
  const token = `vsm_pk_${randomBytes(16).toString("hex")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention

  try {
    await db.insert(trackingTokens).values({
      orderId,
      orderNumber,
      token,
      fulfillmentType: fulfillmentType === "pickup" ? "pickup" : "delivery",
      expiresAt,
    });
  } catch (insertErr) {
    // Conflict handling
    try {
      const [existingAfter] = await db
        .select()
        .from(trackingTokens)
        .where(eq(trackingTokens.orderId, orderId))
        .limit(1);
      if (existingAfter?.token) return existingAfter.token;
    } catch {}
  }

  return token;
}

/**
 * Retrieves the kitchen settings
 */
export async function getKitchenSettings(): Promise<KitchenSettingsData> {
  try {
    const [row] = await db.select().from(kitchenSettings).limit(1);
    if (!row) return { ...DEFAULT_SETTINGS, isCurrentlyOpen: isWithinKitchenWorkingHours() };

    const mode = (row.mode as any) || DEFAULT_SETTINGS.mode;
    const workingHoursStart = row.workingHoursStart || DEFAULT_SETTINGS.workingHoursStart;
    const workingHoursEnd = row.workingHoursEnd || DEFAULT_SETTINGS.workingHoursEnd;

    return {
      mode,
      homepageSectionEnabled: Boolean(row.homepageSectionEnabled),
      workingHoursStart,
      workingHoursEnd,
      retentionDays: row.retentionDays || DEFAULT_SETTINGS.retentionDays,
      requireReadyPhoto: Boolean(row.requireReadyPhoto),
      blurFacesNotice: Boolean(row.blurFacesNotice),
      isCurrentlyOpen: isWithinKitchenWorkingHours(workingHoursStart, workingHoursEnd),
    };
  } catch (err) {
    return { ...DEFAULT_SETTINGS, isCurrentlyOpen: isWithinKitchenWorkingHours() };
  }
}

/**
 * Updates kitchen settings
 */
export async function updateKitchenSettings(
  patch: Partial<KitchenSettingsData>
): Promise<KitchenSettingsData> {
  try {
    const [existing] = await db.select().from(kitchenSettings).limit(1);
    if (existing) {
      await db
        .update(kitchenSettings)
        .set({
          mode: patch.mode ?? existing.mode,
          homepageSectionEnabled:
            patch.homepageSectionEnabled !== undefined
              ? patch.homepageSectionEnabled
              : existing.homepageSectionEnabled,
          workingHoursStart: patch.workingHoursStart ?? existing.workingHoursStart,
          workingHoursEnd: patch.workingHoursEnd ?? existing.workingHoursEnd,
          retentionDays: patch.retentionDays ?? existing.retentionDays,
          requireReadyPhoto:
            patch.requireReadyPhoto !== undefined
              ? patch.requireReadyPhoto
              : existing.requireReadyPhoto,
          blurFacesNotice:
            patch.blurFacesNotice !== undefined
              ? patch.blurFacesNotice
              : existing.blurFacesNotice,
        })
        .where(eq(kitchenSettings.id, existing.id));
    } else {
      await db.insert(kitchenSettings).values({
        mode: patch.mode || "recorded",
        homepageSectionEnabled: patch.homepageSectionEnabled ?? true,
        workingHoursStart: patch.workingHoursStart || "07:00",
        workingHoursEnd: patch.workingHoursEnd || "20:30",
        retentionDays: patch.retentionDays || 15,
        requireReadyPhoto: patch.requireReadyPhoto ?? true,
        blurFacesNotice: patch.blurFacesNotice ?? true,
      });
    }
  } catch (err) {
    console.error("[KitchenCam] Failed to update kitchen settings:", err);
  }

  return getKitchenSettings();
}

/**
 * Retrieves public or active kitchen camera streams
 */
export async function getKitchenCameras(onlyPublic: boolean = true) {
  try {
    const query = onlyPublic
      ? db
          .select()
          .from(kitchenCameras)
          .where(and(eq(kitchenCameras.isActive, true), eq(kitchenCameras.isPublic, true)))
      : db.select().from(kitchenCameras).where(eq(kitchenCameras.isActive, true));

    const rows = await query;
    return rows;
  } catch {
    return [];
  }
}

/**
 * Maps order status to pickup timeline stage
 */
function mapOrderStatusToStageKey(
  status: string
): "order_received" | "preparing" | "packed" | "ready_for_pickup" | "completed" {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "pending":
      return "order_received";
    case "preparing":
    case "in_preparation":
      return "preparing";
    case "packed":
      return "packed";
    case "ready_for_pickup":
      return "ready_for_pickup";
    case "delivered":
    case "completed":
    case "picked_up":
      return "completed";
    default:
      return "order_received";
  }
}

const STAGE_ORDER: Array<PickupTimelineStage["key"]> = [
  "order_received",
  "preparing",
  "packed",
  "ready_for_pickup",
  "completed",
];

/**
 * Retrieves customer-facing tracking data using the private token
 */
export async function getCustomerTrackingDataByToken(token: string) {
  // 1. Find token row
  const [tokenRow] = await db
    .select()
    .from(trackingTokens)
    .where(eq(trackingTokens.token, token))
    .limit(1);

  if (!tokenRow) {
    return null;
  }

  // 2. Fetch order details
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, tokenRow.orderId))
    .limit(1);

  if (!order) {
    return null;
  }

  // 3. Fetch pickup store details if storeId set
  let storeDetail: any = null;
  if (order.pickupStoreId) {
    const [sRow] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, order.pickupStoreId))
      .limit(1);
    storeDetail = sRow || null;
  }

  // Default flagship store fallback if none mapped
  if (!storeDetail) {
    storeDetail = {
      name: "Mandvi Main Counter & Heritage Flagship",
      address: "Opp. Jubilee Baug, Mandvi, Raopura, Vadodara, Gujarat 390001",
      phone: "+91 98250 12345",
      hours: "7:00 AM – 8:30 PM (All 7 Days)",
    };
  }

  // 4. Fetch order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  // 5. Fetch media uploaded for this order (filter hidden)
  const mediaRows = await db
    .select()
    .from(orderMedia)
    .where(and(eq(orderMedia.orderId, order.id), eq(orderMedia.hidden, false)))
    .orderBy(orderMedia.createdAt);

  const mediaByStage: Record<string, StageMediaItem[]> = {
    order_received: [],
    preparing: [],
    packed: [],
    ready_for_pickup: [],
    completed: [],
  };

  for (const m of mediaRows) {
    const item: StageMediaItem = {
      id: m.id,
      stage: m.stage,
      fileUrl: m.fileUrl,
      mediaType: (m.mediaType as any) || "image",
      caption: m.caption,
      uploadedBy: m.uploadedBy,
      createdAt: m.createdAt
        ? new Date(m.createdAt).toISOString()
        : new Date().toISOString(),
    };
    if (mediaByStage[m.stage]) {
      mediaByStage[m.stage].push(item);
    }
  }

  // 6. Fetch status history timestamps
  const historyRows = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(orderStatusHistory.createdAt);

  const timestampByStatus: Record<string, string> = {};
  for (const h of historyRows) {
    if (h.createdAt) {
      timestampByStatus[h.status.toLowerCase()] = new Date(h.createdAt).toISOString();
    }
  }

  const currentStageKey = mapOrderStatusToStageKey(order.status);
  const currentStageIdx = STAGE_ORDER.indexOf(currentStageKey);

  // 7. Assemble 5-stage timeline
  const stagesMeta: Record<
    PickupTimelineStage["key"],
    { label: string; title: string; description: string }
  > = {
    order_received: {
      label: "Order Confirmed",
      title: "Handcrafted Ingredients Queued",
      description:
        "Your order is verified. Fresh besan, farm milk mawa, pure saffron, and 100% Shuddh Cow Desi Ghee are allocated.",
    },
    preparing: {
      label: "Live Kitchen Preparation",
      title: "In the Halwai Karahi & Workstation",
      description:
        "Our master sweet makers are handcrafting your sweets fresh this morning. Simmered and stirred to golden perfection.",
    },
    packed: {
      label: "Quality Checked & Packed",
      title: "Personal Box Sealed at Counter",
      description:
        "Freshly weighed and packed in food-grade, vacuum-sealed heritage boxes with oxygen scavengers.",
    },
    ready_for_pickup: {
      label: "Ready at Store Counter",
      title: "Waiting for You at Vardayini Counter",
      description:
        "Your order is packed and placed in our fresh pickup counter. Present your 6-digit OTP to the store attendant to collect.",
    },
    completed: {
      label: "Collected & Completed",
      title: "Handover Verified",
      description:
        "OTP verified and sweets handed over. Enjoy the authentic taste of 1976 heritage sweets!",
    },
  };

  const timeline: PickupTimelineStage[] = STAGE_ORDER.map((key, idx) => {
    let status: "completed" | "current" | "upcoming" = "upcoming";
    if (idx < currentStageIdx) status = "completed";
    else if (idx === currentStageIdx) status = "current";

    // Best timestamp match
    let ts: string | null = null;
    if (key === "order_received") ts = order.createdAt ? new Date(order.createdAt).toISOString() : null;
    else if (key === "preparing") ts = timestampByStatus["preparing"] || null;
    else if (key === "packed") ts = timestampByStatus["packed"] || null;
    else if (key === "ready_for_pickup") {
      ts = order.actualReadyAt ? new Date(order.actualReadyAt).toISOString() : timestampByStatus["ready_for_pickup"] || null;
    } else if (key === "completed") {
      ts = order.deliveredAt ? new Date(order.deliveredAt).toISOString() : timestampByStatus["delivered"] || null;
    }

    return {
      key,
      label: stagesMeta[key].label,
      title: stagesMeta[key].title,
      description: stagesMeta[key].description,
      status,
      timestamp: ts,
      media: mediaByStage[key] || [],
    };
  });

  // 8. Fetch active kitchen cameras & settings for Live Mode
  const settings = await getKitchenSettings();
  const cameras =
    settings.mode === "live" || settings.mode === "both"
      ? await getKitchenCameras(true)
      : [];

  return {
    orderNumber: order.orderNumber,
    fulfillmentType: order.fulfillmentType || "pickup",
    status: order.status,
    currentStage: currentStageKey,
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
    pickupDate: order.pickupDate || "Today",
    pickupSlot: order.pickupSlot || "Standard Store Hours (7:00 AM – 8:30 PM)",
    pickupOtp: order.pickupOtp || null,
    isReady: order.status === "ready_for_pickup" || order.status === "delivered",
    store: storeDetail,
    items: items.map((it) => ({
      name: it.productName,
      weight: it.variantWeight,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      imageUrl: it.imageUrl,
    })),
    timeline,
    settings,
    cameras,
  };
}

