/**
 * Vardayini Sweet Mart - GST Tax Invoice Engine & Utilities
 * Compliant with GST Act, 2017 & FSSAI Standards
 */

export interface InvoiceSeller {
  legalName: string;
  tradeName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  fssaiNumber: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export const DEFAULT_SELLER: InvoiceSeller = {
  legalName: "Vardayini Sweets & Namkeen Private Limited",
  tradeName: "Vardayini Sweet Mart",
  tagline: "Since 1976 • Pure Desi Ghee Mithai & Traditional Farsan",
  address: "Opp. Jubilee Baug, Raopura, Vadodara, Gujarat 390001",
  city: "Vadodara",
  state: "Gujarat",
  stateCode: "24",
  pincode: "390001",
  gstin: "24AAACV1234F1Z5",
  fssaiNumber: "10719024000123",
  phone: "+91 98250 12345",
  email: "billing@vardayinisweetmart.com",
  logoUrl: "/images/brand-logo.png",
};

/**
 * Converts numbers into formal Indian numbering words format (Rupees ... Only)
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Rupees Zero Only";

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const paisePart = Math.round((absAmount - integerPart) * 100);

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return unit ? `${tens[ten]} ${ones[unit]}` : tens[ten];
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    const parts: string[] = [];
    if (hundred) parts.push(`${ones[hundred]} Hundred`);
    if (remainder) parts.push(convertTwoDigits(remainder));
    return parts.join(" ");
  }

  let words = "";

  if (integerPart === 0) {
    words = "Zero";
  } else {
    let num = integerPart;

    const crore = Math.floor(num / 10000000);
    num %= 10000000;

    const lakh = Math.floor(num / 100000);
    num %= 100000;

    const thousand = Math.floor(num / 1000);
    num %= 1000;

    const parts: string[] = [];

    if (crore > 0) {
      parts.push(`${convertThreeDigits(crore)} Crore`);
    }
    if (lakh > 0) {
      parts.push(`${convertTwoDigits(lakh)} Lakh`);
    }
    if (thousand > 0) {
      parts.push(`${convertThreeDigits(thousand)} Thousand`);
    }
    if (num > 0) {
      parts.push(convertThreeDigits(num));
    }

    words = parts.filter(Boolean).join(" ");
  }

  let result = `Rupees ${words}`;
  if (paisePart > 0) {
    result += ` and ${convertTwoDigits(paisePart)} Paise`;
  }
  result += " Only";

  return isNegative ? `Minus ${result}` : result;
}

export function formatInr(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

