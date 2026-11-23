import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { returnRequests, orders } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.trim().toLowerCase();
  const searchParam = searchParams.get("search")?.trim().toLowerCase();

  // Fetch all return requests ordered by latest first
  const allRequests = await db
    .select()
    .from(returnRequests)
    .orderBy(desc(returnRequests.requestedAt));

  // Compute status counts across all requests
  const counts: Record<string, number> = {
    total: allRequests.length,
    requested: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    replaced: 0,
    refunded: 0,
  };

  for (const req of allRequests) {
    const s = req.status.toLowerCase();
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  }

  const pendingCount = (counts.requested || 0) + (counts.under_review || 0);

  // Apply filters
  let filtered = allRequests;
  if (statusParam && statusParam !== "all") {
    filtered = filtered.filter((r) => r.status.toLowerCase() === statusParam);
  }

  if (searchParam) {
    filtered = filtered.filter((r) =>
      r.orderNumber.toLowerCase().includes(searchParam) ||
      r.customerName.toLowerCase().includes(searchParam) ||
      r.customerPhone.toLowerCase().includes(searchParam) ||
      r.reason.toLowerCase().includes(searchParam) ||
      r.reasonLabel.toLowerCase().includes(searchParam) ||
      r.description.toLowerCase().includes(searchParam)
    );
  }

  // Enrich with order details (total, deliveredAt, status)
  const orderIds = Array.from(new Set(filtered.map((r) => r.orderId)));
  const ordersMap: Record<number, any> = {};

  if (orderIds.length > 0) {
    const matchedOrders = await db
      .select()
      .from(orders)
      .where(sql`${orders.id} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`);

    for (const o of matchedOrders) {
      ordersMap[o.id] = o;
    }
  }

  const enrichedItems = filtered.map((req) => {
    const order = ordersMap[req.orderId] || null;
    return {
      ...req,
      orderTotal: order?.total ?? 0,
      deliveredAt: order?.deliveredAt ?? null,
      orderStatus: order?.status ?? "unknown",
      paymentMethod: order?.paymentMethod ?? "unknown",
    };
  });

  return NextResponse.json({
    items: enrichedItems,
    total: enrichedItems.length,
    pendingCount,
    counts,
  });
}
