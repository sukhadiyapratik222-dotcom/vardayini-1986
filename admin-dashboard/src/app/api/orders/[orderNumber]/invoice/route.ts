import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await context.params;
  const url = new URL(req.url);
  const targetUrl = new URL(`/orders/${orderNumber}/invoice`, url.origin);
  return NextResponse.redirect(targetUrl);
}

