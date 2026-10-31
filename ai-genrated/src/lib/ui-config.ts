import fs from "fs";
import path from "path";

export interface UiConfigData {
  heroPhotos?: Array<{
    id: string;
    name: string;
    image: string;
    category?: string;
    active: boolean;
    order: number;
  }>;
  heroSettings?: {
    autoScroll?: boolean;
    intervalSeconds?: number;
  };
  announcement?: {
    enabled?: boolean;
    badge?: string;
    text?: string;
    linkText?: string;
    linkUrl?: string;
  };
  storeInfo?: {
    name?: string;
    tagline?: string;
    established?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    hours?: string;
  };
  promotions?: {
    couponCode?: string;
    discountPercent?: number;
    minOrder?: number;
    freeDeliveryThreshold?: number;
    description?: string;
    isActive?: boolean;
  };
  logo?: {
    type?: "crest" | "image";
    crestLetter?: string;
    crestBgColor?: string;
    crestBorderColor?: string;
    crestTextColor?: string;
    imageUrl?: string;
    brandName?: string;
    brandSubtitle?: string;
  };
  heroContent?: Record<string, string>;
  heritageBanner?: Record<string, any>;
  specialItems?: Record<string, any>;
  [key: string]: any;
}

export function getUiConfigSafe(): UiConfigData | null {
  try {
    const candidates = [
      path.join(process.cwd(), "src", "data", "ui-config.json"),
      path.join(process.cwd(), "ai-genrated", "src", "data", "ui-config.json"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const raw = fs.readFileSync(c, "utf-8");
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn("[UI Config] Could not read ui-config.json:", err);
  }
  return null;
}

export function writeUiConfigSafe(data: Record<string, any>): boolean {
  try {
    const candidates = [
      path.join(process.cwd(), "src", "data", "ui-config.json"),
      path.join(process.cwd(), "ai-genrated", "src", "data", "ui-config.json"),
    ];
    let target = candidates[0];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        target = c;
        break;
      }
    }
    fs.writeFileSync(target, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[UI Config] Could not write ui-config.json:", err);
    return false;
  }
}

