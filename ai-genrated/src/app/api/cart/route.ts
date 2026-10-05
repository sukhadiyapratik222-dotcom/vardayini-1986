import { addToCart, loadCartLines } from "@/lib/cart";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, parsePositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const cart = await loadCartLines();
  return Response.json({
    items: cart.lines,
    totals: cart.totals,
    couponCode: cart.couponCode,
    couponLabel: cart.couponLabel,
    count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
  });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const body = await readJsonSafe<{
    productVariantId?: unknown;
    variantId?: unknown;
    quantity?: unknown;
  }>(request);

  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawVariantId = body.productVariantId ?? body.variantId;
  const variantId = parsePositiveInt(rawVariantId);
  if (!variantId) {
    return Response.json({ error: "A valid productVariantId is required" }, { status: 400 });
  }

  const quantity = body.quantity === undefined ? 1 : parsePositiveInt(body.quantity);
  if (quantity === null) {
    return Response.json({ error: "Quantity must be a positive integer" }, { status: 400 });
  }

  try {
    await addToCart(variantId, quantity);
    const cart = await loadCartLines();
    return Response.json({
      ok: true,
      items: cart.lines,
      totals: cart.totals,
      count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not add to cart" },
      { status: 400 }
    );
  }
}
