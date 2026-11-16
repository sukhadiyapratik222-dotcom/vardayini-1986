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

    const seenIds = new Set<number>(rows.map((r) => r.id));
    const seenComments = new Set<string>(
      rows.map((r) => `${(r.userName || "").toLowerCase().trim()}_${(r.comment || "").toLowerCase().trim()}`)
    );

    // Hydrate any reviews persisted in MongoDB Atlas into the admin list
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const mReviews = await mongo
          .collection("reviews")
          .find()
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray();

        // Load products for resolving product name and thumbnail if missing
        const allProds = await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            imageUrl: products.imageUrl,
          })
          .from(products);
        const prodMap = new Map(allProds.map((p) => [p.id, p]));

        for (const mr of mReviews) {
          const revId = mr.reviewId ? Number(mr.reviewId) : mr.id ? Number(mr.id) : null;
          const author = mr.userName || mr.name || "Customer";
          const comm = mr.comment || "";
          const commentKey = `${author.toLowerCase().trim()}_${comm.toLowerCase().trim()}`;

          if (revId && seenIds.has(revId)) continue;
          if (seenComments.has(commentKey)) continue;

          if (revId) seenIds.add(revId);
          seenComments.add(commentKey);

          const matchedProd = prodMap.get(mr.productId) || allProds[0];

          // Also lazily sync into SQLite so local queries stay fast & durable
          try {
            const [insertRes] = await db.insert(reviews).values({
              productId: mr.productId || matchedProd?.id || 1,
              userId: mr.userId || null,
              userName: author,
              rating: mr.rating || 5,
              comment: comm,
              isVerified: mr.isVerified ?? true,
              createdAt: mr.createdAt ? new Date(mr.createdAt) : new Date(),
            });
            const assignedId = (insertRes as any)?.insertId || revId || Date.now();
            seenIds.add(assignedId);

            rows.push({
              id: assignedId,
              productId: mr.productId || matchedProd?.id || 1,
              productName: mr.productName || matchedProd?.name || "Royal Gujarati Mithai",
              productSlug: mr.productSlug || matchedProd?.slug || "kaju-katli",
              productImageUrl: matchedProd?.imageUrl || "/images/kaju-katli.jpg",
              userId: mr.userId || null,
              userName: author,
              userEmail: mr.userEmail || null,
              rating: mr.rating || 5,
              comment: comm,
              isVerified: mr.isVerified ?? true,
              createdAt: mr.createdAt ? new Date(mr.createdAt) : new Date(),
            });
            continue;
          } catch {}

          rows.push({
            id: revId || Date.now(),
            productId: mr.productId || matchedProd?.id || 1,
            productName: mr.productName || matchedProd?.name || "Royal Gujarati Mithai",
            productSlug: mr.productSlug || matchedProd?.slug || "kaju-katli",
            productImageUrl: matchedProd?.imageUrl || "/images/kaju-katli.jpg",
            userId: mr.userId || null,
            userName: author,
            userEmail: mr.userEmail || null,
            rating: mr.rating || 5,
            comment: comm,
            isVerified: mr.isVerified ?? true,
            createdAt: mr.createdAt ? new Date(mr.createdAt) : new Date(),
          });
        }
      }
    } catch (mErr) {
      console.warn("[Admin Reviews GET MongoDB notice]", mErr);
    }

    // Sort newest reviews first
    rows.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id) - Number(a.id);
    });

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
