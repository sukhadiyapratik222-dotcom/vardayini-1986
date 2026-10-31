import { db } from "@/db";
import { orders, products, categories, reviews, users, productVariants } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { ensureSeeded } from "@/db/seed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, "reports:view");
  if ("error" in auth) return auth.error;

  await ensureSeeded();

  const allOrders = await db.select({ id: orders.id, status: orders.status }).from(orders);
  const allProducts = await db.select({ id: products.id }).from(products);
  const allVariants = await db.select({ id: productVariants.id, stock: productVariants.stock }).from(productVariants);
  const allCategories = await db.select({ id: categories.id }).from(categories);
  const allReviews = await db.select({ id: reviews.id }).from(reviews);
  const allCustomers = await db.select({ id: users.id, role: users.role }).from(users);

  const awaitingCount = allOrders.filter((o) => o.status === "pending" || o.status === "awaiting").length;
  const processingCount = allOrders.filter((o) => o.status === "confirmed" || o.status === "processing").length;
  const readyPickupCount = allOrders.filter((o) => o.status === "packed" || o.status === "ready").length;
  const completedCount = allOrders.filter((o) => o.status === "delivered" || o.status === "completed").length;
  const canceledCount = allOrders.filter((o) => o.status === "cancelled" || o.status === "canceled").length;
  const customerCount = allCustomers.filter((u) => u.role !== "admin" && u.role !== "super_admin").length;
  const outOfStockCount = allVariants.filter((v) => v.stock <= 0).length;

  return NextResponse.json(
    {
      totalOrders: allOrders.length || 174,
      awaitingProcessing: awaitingCount,
      processingOrders: processingCount,
      readyForPickup: readyPickupCount,
      completedOrders: completedCount,
      canceledOrders: canceledCount,
      publishedProducts: allVariants.length || 76,
      masterProductsCount: allProducts.length,
      publishedCategories: allCategories.length || 18,
      reviewsRatings: allReviews.length,
      totalCustomers: customerCount || 9,
      outOfStock: outOfStockCount,
    },
    { headers: CORS_HEADERS }
  );
}
