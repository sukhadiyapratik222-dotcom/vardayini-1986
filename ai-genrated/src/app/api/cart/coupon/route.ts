import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { setCouponCode } from "@/lib/auth";
import { loadCartLines } from "@/lib/cart";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe } from "@/lib/validation";

export async function POST(request: Request) {
  await ensureSeeded();
  const body = await readJsonSafe<{ code?: string }>(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    await setCouponCode(null);
    const cart = await loadCartLines();
    return Response.json({ items: cart.lines, totals: cart.totals, couponCode: null });
  }

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);

  if (!coupon || !coupon.active) {
    return Response.json({ error: "Invalid coupon code." }, { status: 400 });
  }

  const cart = await loadCartLines();
  if (cart.totals.subtotal < coupon.minOrder) {
    return Response.json(
      { error: `Add items worth ₹${coupon.minOrder} to use this coupon.` },
      { status: 400 }
    );
  }

  await setCouponCode(code);
  const next = await loadCartLines();
  return Response.json({
    items: next.lines,
    totals: next.totals,
    couponCode: next.couponCode,
    couponLabel: next.couponLabel,
  });
}
