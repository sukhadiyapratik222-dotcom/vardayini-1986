export const FREE_DELIVERY_MIN = 799;
export const DELIVERY_FEE = 49;
export const TAX_RATE = 0.05;

export function unitPrice(price: number, discountedPrice: number | null) {
  return discountedPrice && discountedPrice > 0 && discountedPrice < price
    ? discountedPrice
    : price;
}

export function formatInr(amount: number | null | undefined) {
  const safe = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function calcTotals(subtotal: number, discount: number, freeDelivery = false) {
  const safeSubtotal = typeof subtotal === "number" && !isNaN(subtotal) ? subtotal : 0;
  const safeDiscountVal = typeof discount === "number" && !isNaN(discount) ? discount : 0;
  const safeDiscount = Math.min(Math.max(safeDiscountVal, 0), safeSubtotal);
  const taxable = Math.max(safeSubtotal - safeDiscount, 0);
  const tax = Math.round(taxable * TAX_RATE);
  const deliveryFee = freeDelivery || taxable >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  const total = taxable + tax + deliveryFee;
  return { subtotal: safeSubtotal, discount: safeDiscount, tax, deliveryFee, total };
}

export function calculateDiscount(originalPrice: number | null | undefined, sellingPrice: number | null | undefined): number {
  const orig = typeof originalPrice === "number" && !isNaN(originalPrice) ? originalPrice : 0;
  const sell = typeof sellingPrice === "number" && !isNaN(sellingPrice) ? sellingPrice : 0;
  if (orig > sell && orig > 0 && sell >= 0) {
    return Math.round(((orig - sell) / orig) * 100);
  }
  return 0;
}
