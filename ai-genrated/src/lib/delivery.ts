export interface DeliveryOption {
  type: "same_day" | "next_day" | "standard" | "pickup";
  title: string;
  badge: string;
  estimatedDelivery: string;
  feeText: string;
  details: string;
  icon: string;
}

export interface DeliveryCheckResult {
  query: string;
  pincode?: string;
  city: string;
  isDeliverable: boolean;
  message: string;
  options: DeliveryOption[];
  pickupAvailable: boolean;
}

export function checkDeliveryAvailability(input: string): DeliveryCheckResult {
  const clean = input.trim();
  const digits = clean.replace(/\D/g, "");

  // If user entered a 6-digit PIN code
  if (digits.length === 6) {
    // Kalol & Gandhinagar District (382xxx) - Same-Day Local Delivery & Store Pickup
    if (digits.startsWith("382")) {
      const vCity = digits === "382721" ? "Kalol" : "Kalol & Gandhinagar District";
      return {
        query: clean,
        pincode: digits,
        city: vCity,
        isDeliverable: true,
        message: "⚡ Same-Day Fresh Dispatch & Store Pickup Available!",
        options: [
          {
            type: "same_day",
            title: "Same-Day Fresh Delivery",
            badge: "⚡ Same-Day (Hot & Fresh)",
            estimatedDelivery: "Today by 6:30 PM",
            feeText: "FREE over ₹799 (₹49 standard)",
            details: "Orders placed before 2:00 PM are packed warm and hand-delivered directly from our Kalol flagship kitchen.",
            icon: "⚡",
          },
          {
            type: "standard",
            title: "Scheduled Delivery Slot",
            badge: "Flexible Slots",
            estimatedDelivery: "Today evening or Tomorrow morning",
            feeText: "FREE over ₹799",
            details: "Choose between 5:00–7:00 PM or 7:00–9:00 PM slots at checkout.",
            icon: "🕒",
          },
          {
            type: "pickup",
            title: "Instant Store Self-Pickup",
            badge: "FREE (Ready in 30 mins)",
            estimatedDelivery: "Pick up today anytime",
            feeText: "₹0 Free Pickup",
            details: "Available at Kalol Main Counter (6A, Navjivan Shopping Center, Kalol 382721).",
            icon: "🏬",
          },
        ],
        pickupAvailable: true,
      };
    }

    // Gujarat Express Network (36xxxx, 37xxxx, 38xxxx, 39xxxx)
    if (
      digits.startsWith("36") ||
      digits.startsWith("37") ||
      digits.startsWith("38") ||
      digits.startsWith("39")
    ) {
      return {
        query: clean,
        pincode: digits,
        city: "Gujarat Express Network",
        isDeliverable: true,
        message: "✓ Next-Day Express Delivery Available Across Gujarat",
        options: [
          {
            type: "next_day",
            title: "Gujarat Next-Day Express",
            badge: "🚚 Next-Day Express",
            estimatedDelivery: "Within 24–36 Hours",
            feeText: "FREE over ₹799 (₹70 standard)",
            details: "Dispatched direct via Blue Dart Express in insulated vacuum packaging with ice gel packs.",
            icon: "🚚",
          },
          {
            type: "standard",
            title: "Fresh-Lock Protection",
            badge: "Vacuum Sealed",
            estimatedDelivery: "Guaranteed Fresh Arrival",
            feeText: "100% Desi Ghee Guarantee",
            details: "Special oxygen absorbers protect crispness and flavor during transit.",
            icon: "📦",
          },
        ],
        pickupAvailable: false,
      };
    }

    // Rest of India (Other valid 6-digit Indian PIN codes)
    return {
      query: clean,
      pincode: digits,
      city: "Pan-India Courier Network",
      isDeliverable: true,
      message: "✓ Pan-India Delivery Available (2–3 Days)",
      options: [
        {
          type: "standard",
          title: "Pan-India Express Air Shipping",
          badge: "✈️ Express Air (2–3 Days)",
          estimatedDelivery: "Delivered in 2 to 3 Business Days",
          feeText: "FREE over ₹799 (₹99 standard)",
          details: "Shipped in food-safe vacuum-sealed tin boxes with shock-absorbing cushioning.",
          icon: "✈️",
        },
        {
          type: "standard",
          title: "Freshness & Purity Guarantee",
          badge: "FSSAI Certified",
          estimatedDelivery: "Long-lasting freshness",
          feeText: "Zero Chemical Preservatives",
          details: "Traditional recipes made with pure Desi Ghee retain peak taste for 15+ days.",
          icon: "🍯",
        },
      ],
      pickupAvailable: false,
    };
  }

  // Check if string matches city names
  const lower = clean.toLowerCase();
  if (lower.includes("kalol") || lower.includes("rupal")) {
    return checkDeliveryAvailability("382721");
  }
  if (
    lower.includes("gandhinagar") ||
    lower.includes("ahmedabad") ||
    lower.includes("surat") ||
    lower.includes("vadodara") ||
    lower.includes("baroda") ||
    lower.includes("rajkot") ||
    lower.includes("anand") ||
    lower.includes("gujarat")
  ) {
    return checkDeliveryAvailability("380001");
  }

  // Generic fallback if text search
  return {
    query: clean,
    city: clean || "Pan-India",
    isDeliverable: true,
    message: "✓ Pan-India Delivery Available (2–3 Days)",
    options: [
      {
        type: "standard",
        title: "Pan-India Express Delivery",
        badge: "📦 2–3 Days Pan-India",
        estimatedDelivery: "Delivered in 2 to 3 Business Days",
        feeText: "FREE over ₹799",
        details: "Secure vacuum packaging delivered directly to your doorstep across India.",
        icon: "📦",
      },
      {
        type: "pickup",
        title: "Store Pickup in Kalol",
        badge: "FREE Pickup",
        estimatedDelivery: "Ready in 30 mins",
        feeText: "₹0 Pickup Fee",
        details: "Free self-pickup at Mandvi, Alkapuri, and Karelibaug stores.",
        icon: "🏬",
      },
    ],
    pickupAvailable: true,
  };
}

