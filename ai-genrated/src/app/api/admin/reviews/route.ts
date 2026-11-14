import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, reviews, users } from "@/db/schema";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { parsePositiveInt } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const authorized = await isAuthorizedAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403, headers: CORS_HEADERS });
  }

  try {
    const rows = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        productSlug: products.slug,
        productImageUrl: products.imageUrl,
        userId: reviews.userId,
        userName: reviews.userName,
        userEmail: users.email,
        rating: reviews.rating,
        comment: reviews.comment,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .orderBy(desc(reviews.createdAt));

    return NextResponse.json({ reviews: rows }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[Admin Reviews GET Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch reviews" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const authorized = await isAuthorizedAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const deleteAll = url.searchParams.get("all") === "true";
    const reviewId = parsePositiveInt(url.searchParams.get("id"));

    if (deleteAll) {
      await db.delete(reviews);

      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const mongo = await getMongoDb();
        if (mongo) {
          await mongo.collection("reviews").deleteMany({});
        }
      } catch {}

      return NextResponse.json({ success: true, message: "All reviews removed successfully" }, { headers: CORS_HEADERS });
    }

    if (!reviewId) {
      return NextResponse.json({ error: "A valid review id is required or all=true" }, { status: 400, headers: CORS_HEADERS });
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));

    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("reviews").deleteOne({
          $or: [{ id: reviewId }, { reviewId: reviewId }, { id: String(reviewId) }, { reviewId: String(reviewId) }]
        });
      }
    } catch {}

    return NextResponse.json({ success: true, message: "Review deleted successfully" }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[Admin Reviews DELETE Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete review" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
