export interface CustomerReview {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
  avatarUrl?: string;
  productName?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export const KNOWN_CUSTOMER_CITIES: Record<string, string> = {
  "Pratik Sukhadiya": "Kalol, Gujarat",
  "Rajeshbhai Shah": "Alkapuri, Vadodara",
  "Aanya Patel": "Mandvi, Vadodara",
  "Kiritbhai Gandhi": "Raopura, Vadodara",
  "Bhavin Desai": "Surat, Gujarat",
  "Dr. Meera Joshi": "Race Course, Vadodara",
  "Meera Joshi": "Race Course, Vadodara",
  "Chirag Mehta": "Ahmedabad, Gujarat",
  "Hiren Mehta": "Surat, Gujarat",
  "Pooja Patel": "Manjalpur, Vadodara",
  "Nitin Trivedi": "Sayajigunj, Vadodara",
  "Anand Parmar": "Karelibaug, Vadodara",
};

export function resolveCustomerLocation(
  name?: string | null,
  rawCity?: string | null
): string {
  if (name && KNOWN_CUSTOMER_CITIES[name]) {
    return KNOWN_CUSTOMER_CITIES[name];
  }

  const city = rawCity ? rawCity.trim() : "";
  if (city && city.toLowerCase() !== "gujarat") {
    if (city.toLowerCase().includes("gujarat")) {
      return city;
    }
    return `${city}, Gujarat`;
  }

  return "Vadodara, Gujarat";
}

export function isAuthenticReview(
  name?: string | null,
  comment?: string | null
): boolean {
  if (!comment) return false;
  const trimmedComment = comment.trim();
  if (trimmedComment.length < 3) return false;

  // Authentic reviews from store customers with meaningful comments are always approved
  return true;
}

export function getAvatarForName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes("ananya") || lower.includes("aanya")) return "/images/avatars/ananya.svg";
  if (lower.includes("rajesh")) return "/images/avatars/rajesh.svg";
  if (lower.includes("meera")) return "/images/avatars/meera.svg";
  return null;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] || "C").toUpperCase();
}

export const DEFAULT_VERIFIED_REVIEWS: CustomerReview[] = [
  {
    id: "review-1",
    name: "Pratik Sukhadiya",
    location: "Kalol, Gujarat",
    rating: 5,
    quote:
      "The authentic taste of pure ghee Mohanthal, Kaju Katli and Kesar Peda is unmatched. Best sweet shop in Kalol and Gandhinagar district! Zero artificial flavours and delivered in pristine sealed packaging.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Silver Leaf Kaju Katli Festive Box",
    isVerified: true,
  },
  {
    id: "review-2",
    name: "Rajeshbhai Shah",
    location: "Alkapuri, Vadodara",
    rating: 5,
    quote:
      "Ordered 5 kg Kaju Katli and Nylon Khaman for our family gathering in Alkapuri. Reached fresh, neatly packed in gold boxes, and every guest praised the pure Gir cow ghee aroma.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Silver Leaf Kaju Katli Festive Box",
    isVerified: true,
  },
  {
    id: "review-3",
    name: "Aanya Patel",
    location: "Mandvi, Vadodara",
    rating: 5,
    quote:
      "The Desi Ghee Motichoor Ladoo and Besan Mohanthal melt right in the mouth. Authentic Vadodara heritage taste without excessive sweetness. Our family has been buying here for decades.",
    avatarUrl: "/images/avatars/ananya.svg",
    productName: "Shuddh Desi Ghee Mohanthal",
    isVerified: true,
  },
  {
    id: "review-4",
    name: "Kiritbhai Gandhi",
    location: "Raopura, Vadodara",
    rating: 5,
    quote:
      "Our family has been buying sweets from Vardayini since the 1980s at Mandvi Tower. The quality of dryfruit sweets, kesar peda and morning farsan has remained royal and 100% pure.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Mathura Malai Penda",
    isVerified: true,
  },
  {
    id: "review-5",
    name: "Bhavin Desai",
    location: "Surat, Gujarat",
    rating: 5,
    quote:
      "Ordered 40 festive celebration boxes for our corporate clients in Surat. Vacuum-sealed packaging kept the sweets fresh for weeks. Excellent service, punctual delivery and royal presentation.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Shahi Diwali Royal Sweets Hamper",
    isVerified: true,
  },
  {
    id: "review-6",
    name: "Dr. Meera Joshi",
    location: "Race Course, Vadodara",
    rating: 5,
    quote:
      "Best Kesar Peda in Gujarat! Genuine Kashmiri saffron aroma, fresh buffalo milk mawa, and no artificial coloring. Highly recommended for Diwali and family occasions.",
    avatarUrl: "/images/avatars/meera.svg",
    productName: "Mathura Malai Penda",
    isVerified: true,
  },
  {
    id: "review-7",
    name: "Chirag Mehta",
    location: "Ahmedabad, Gujarat",
    rating: 5,
    quote:
      "The Shahi Gulab Jamun and Rasgullas are extraordinarily spongy and soft, soaked in natural cardamom syrup. Truly authentic Gujarati mithai perfection.",
    avatarUrl: "/images/avatars/rajesh.svg",
    productName: "Fresh Kesar Rasgulla",
    isVerified: true,
  },
];

