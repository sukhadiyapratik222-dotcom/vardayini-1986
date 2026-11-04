export const FREE_DELIVERY_MIN = 799;
export const DELIVERY_FEE = 49;
export const TAX_RATE = 0.05;

export function unitPrice(price: number, discountedPrice: number | null) {
  return discountedPrice && discountedPrice > 0 && discountedPrice < price
    ? discountedPrice
    : price;
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calcTotals(subtotal: number, discount: number, freeDelivery = false) {
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const taxable = Math.max(subtotal - safeDiscount, 0);
  const tax = Math.round(taxable * TAX_RATE);
  const deliveryFee = freeDelivery || taxable >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  const total = taxable + tax + deliveryFee;
  return { subtotal, discount: safeDiscount, tax, deliveryFee, total };
}

export function calculateDiscount(originalPrice: number, sellingPrice: number): number {
  if (originalPrice > sellingPrice && originalPrice > 0 && sellingPrice >= 0) {
    return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
  }
  return 0;
}
