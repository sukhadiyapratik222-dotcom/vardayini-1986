/**
 * GST Calculation Engine & Invoice Specifications
 * For Vardayini Sweets & Namkeen (Kalol, Gujarat - State Code 24)
 * Compliant with Central Goods and Services Tax Act, 2017
 */

export interface SellerDetails {
  legalName: string;
  tradeName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  phone: string;
  email: string;
  fssaiNumber?: string;
}

export const SELLER_DETAILS: SellerDetails = {
  legalName: "Vardayini Sweets & Namkeen Private Limited",
  tradeName: "Vardayini Sweets & Namkeen",
  addressLine1: "6A, Navjivan Shopping Center",
  addressLine2: "Navjivan Bazar",
  city: "Kalol",
  state: "Gujarat",
  stateCode: "24",
  pincode: "382721",
  gstin: "24AAACV1234F1Z5",
  phone: "+91 63531 19329",
  email: "billing@vardayinisweets.com",
  fssaiNumber: "10719024000123",
};

export const DEFAULT_SWEETS_HSN = "21069099"; // Sweets, Mithai & Savouries
export const DEFAULT_GST_RATE = 5; // 5% GST for packaged sweets & namkeen

export const STATE_CODE_MAP: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "dadra and nagar haveli and daman and diu": "26",
  "maharashtra": "27",
  "andhra pradesh": "28",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "andhra pradesh (new)": "37",
  "ladakh": "38",
};

export function resolveStateCode(stateName?: string, providedCode?: string): { state: string; stateCode: string } {
  if (providedCode && /^\d{2}$/.test(providedCode)) {
    return { state: stateName?.trim() || "Gujarat", stateCode: providedCode };
  }
  const cleanState = (stateName || "Gujarat").trim();
  const lower = cleanState.toLowerCase();
  const matchedCode = STATE_CODE_MAP[lower] || "24";
  return { state: cleanState, stateCode: matchedCode };
}

export function roundToTwo(num: number): number {
  return Number(Math.round(Number(num + "e+2")) + "e-2");
}

export interface GstLineItemInput {
  productName: string;
  variantWeight?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number; // Base selling price
  discount?: number; // Direct item discount
  taxRatePercent?: number; // e.g. 5 for 5%
}

export interface GstCalculationInput {
  items: GstLineItemInput[];
  buyerState?: string;
  buyerStateCode?: string;
  orderDiscount?: number; // Pro-rated coupon discount
  deliveryFee?: number;
  deliveryFeeTaxRatePercent?: number;
}

export interface CalculatedGstLineItem {
  productName: string;
  variantWeight: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxRatePercent: number;
  cgstRatePercent: number;
  cgstAmount: number;
  sgstRatePercent: number;
  sgstAmount: number;
  igstRatePercent: number;
  igstAmount: number;
  totalTaxAmount: number;
  netTotal: number;
}

export interface GstCalculationResult {
  isInterState: boolean;
  placeOfSupply: string;
  sellerState: string;
  sellerStateCode: string;
  buyerState: string;
  buyerStateCode: string;
  items: CalculatedGstLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  deliveryFee: number;
  deliveryFeeTax: number;
  roundOff: number;
  grandTotal: number;
  totalInWords: string;
}

/**
 * Calculates GST with full intra-state (CGST + SGST) vs inter-state (IGST) logic,
 * discount distribution, 2-decimal precision, and round-off calculation.
 */
export function calculateGst(input: GstCalculationInput): GstCalculationResult {
  const { state: buyerState, stateCode: buyerStateCode } = resolveStateCode(input.buyerState, input.buyerStateCode);
  const sellerStateCode = SELLER_DETAILS.stateCode; // "24"
  const isInterState = buyerStateCode !== sellerStateCode;
  const placeOfSupply = `${buyerState} (${buyerStateCode})`;

  const rawSubtotal = input.items.reduce((sum, item) => sum + item.unitPrice * Math.max(1, item.quantity), 0);
  const orderDiscount = Math.max(0, input.orderDiscount || 0);

  let distributedDiscountAcc = 0;
  const calculatedItems: CalculatedGstLineItem[] = input.items.map((item, index) => {
    const qty = Math.max(1, item.quantity);
    const gross = roundToTwo(item.unitPrice * qty);
    const itemDiscount = Math.max(0, item.discount || 0);

    // Distribute order-level discount proportionally based on item gross ratio
    let proratedCouponDiscount = 0;
    if (orderDiscount > 0 && rawSubtotal > 0) {
      if (index === input.items.length - 1) {
        // Last item absorbs any fractional remainder
        proratedCouponDiscount = roundToTwo(Math.max(0, orderDiscount - distributedDiscountAcc));
      } else {
        proratedCouponDiscount = roundToTwo((gross / rawSubtotal) * orderDiscount);
        distributedDiscountAcc += proratedCouponDiscount;
      }
    }

    const totalItemDiscount = Math.min(gross, roundToTwo(itemDiscount + proratedCouponDiscount));
    const taxable = Math.max(0, roundToTwo(gross - totalItemDiscount));
    const taxRate = item.taxRatePercent !== undefined ? item.taxRatePercent : DEFAULT_GST_RATE;

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igstRate = taxRate;
      igst = roundToTwo((taxable * igstRate) / 100);
    } else {
      cgstRate = roundToTwo(taxRate / 2);
      sgstRate = roundToTwo(taxRate / 2);
      cgst = roundToTwo((taxable * cgstRate) / 100);
      sgst = roundToTwo((taxable * sgstRate) / 100);
    }

    const itemTotalTax = roundToTwo(cgst + sgst + igst);
    const netTotal = roundToTwo(taxable + itemTotalTax);

    return {
      productName: item.productName,
      variantWeight: item.variantWeight || "500g",
      hsnCode: item.hsnCode || DEFAULT_SWEETS_HSN,
      quantity: qty,
      unitPrice: item.unitPrice,
      grossAmount: gross,
      discountAmount: totalItemDiscount,
      taxableAmount: taxable,
      taxRatePercent: taxRate,
      cgstRatePercent: cgstRate,
      cgstAmount: cgst,
      sgstRatePercent: sgstRate,
      sgstAmount: sgst,
      igstRatePercent: igstRate,
      igstAmount: igst,
      totalTaxAmount: itemTotalTax,
      netTotal,
    };
  });

  const totalDiscount = roundToTwo(calculatedItems.reduce((acc, it) => acc + it.discountAmount, 0));
  const totalTaxableAmount = roundToTwo(calculatedItems.reduce((acc, it) => acc + it.taxableAmount, 0));
  const totalCgst = roundToTwo(calculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0));
  const totalSgst = roundToTwo(calculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0));
  const totalIgst = roundToTwo(calculatedItems.reduce((acc, it) => acc + it.igstAmount, 0));
  const totalTax = roundToTwo(totalCgst + totalSgst + totalIgst);

  const deliveryFee = Math.max(0, input.deliveryFee || 0);
  let deliveryFeeTax = 0;
  if (input.deliveryFeeTaxRatePercent && input.deliveryFeeTaxRatePercent > 0) {
    deliveryFeeTax = roundToTwo((deliveryFee * input.deliveryFeeTaxRatePercent) / 100);
  }

  const unroundedGrandTotal = roundToTwo(totalTaxableAmount + totalTax + deliveryFee + deliveryFeeTax);
  const roundedGrandTotal = Math.round(unroundedGrandTotal);
  const roundOff = roundToTwo(roundedGrandTotal - unroundedGrandTotal);

  return {
    isInterState,
    placeOfSupply,
    sellerState: SELLER_DETAILS.state,
    sellerStateCode: SELLER_DETAILS.stateCode,
    buyerState,
    buyerStateCode,
    items: calculatedItems,
    subtotal: rawSubtotal,
    totalDiscount,
    totalTaxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    deliveryFee,
    deliveryFeeTax,
    roundOff,
    grandTotal: roundedGrandTotal,
    totalInWords: numberToIndianWords(roundedGrandTotal),
  };
}

/**
 * Converts numbers into formal Indian numbering words format (Rupees ... Only)
 * with support for Crores, Lakhs, Thousands, Hundreds, and Paise.
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
    return unit ? `${tens[ten]}-${ones[unit]}` : tens[ten];
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

    const hundredAndUnits = num;

    const parts: string[] = [];
    if (crore) parts.push(`${convertThreeDigits(crore)} Crore`);
    if (lakh) parts.push(`${convertTwoDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${convertTwoDigits(thousand)} Thousand`);
    if (hundredAndUnits) parts.push(convertThreeDigits(hundredAndUnits));

    words = parts.join(" ");
  }

  let result = `Rupees ${words}`;

  if (paisePart > 0) {
    result += ` and ${convertTwoDigits(paisePart)} Paise`;
  }

  result += " Only";
  return isNegative ? `Minus ${result}` : result;
}
