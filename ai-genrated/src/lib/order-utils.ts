export function parseAddressSnapshot(raw?: any): any {
  if (!raw) return null;
  let target = raw;
  for (let i = 0; i < 3; i++) {
    if (typeof target === "string") {
      const trimmed = target.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          target = JSON.parse(trimmed);
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return target;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return cleaned;
  return "******" + cleaned.slice(-4);
}

export function maskName(name?: string | null): string {
  if (!name) return "Valued Patron";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]?.toUpperCase() || ""}.`;
}

export function maskAddress(snapshotRaw?: string | null): {
  city: string;
  state: string;
  pincode: string;
  maskedSummary: string;
  fullAddress: string;
} {
  const result = {
    city: "Kalol",
    state: "Gujarat",
    pincode: "",
    maskedSummary: "Kalol Hub Dispatch, Gujarat",
    fullAddress: "Kalol, Gujarat",
  };

  if (!snapshotRaw) return result;

  try {
    const snap = parseAddressSnapshot(snapshotRaw);
    if (snap && typeof snap === "object") {
      result.city = snap.city || "Kalol";
      result.state = snap.state || "Gujarat";
      result.pincode = snap.pincode || "";
      const rawLine1 = (snap.line1 || snap.address || snap.street || "").trim();
      const line1 = rawLine1.replace(/,\s*/g, ", ").trim();
      const locality = snap.city || "Kalol";
      const state = snap.state || "Gujarat";
      const pin = snap.pincode ? ` - ${snap.pincode}` : "";
      
      const linePrefix = line1 ? `${line1}, ` : "";
      result.maskedSummary = `******, ${locality}, ${state}${pin}`;
      result.fullAddress = `${linePrefix}${locality}, ${state}${pin}`.trim();
    } else if (typeof snapshotRaw === "string" && !snapshotRaw.includes("{")) {
      result.maskedSummary = snapshotRaw.trim();
      result.fullAddress = snapshotRaw.trim();
    }
  } catch {
    result.maskedSummary = "Kalol Hub Dispatch, Gujarat";
    result.fullAddress = "Kalol, Gujarat";
  }

  return result;
}

