import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews, users, products, addresses } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, parsePositiveInt } from "@/lib/validation";
import {
  KNOWN_CUSTOMER_CITIES,
  resolveCustomerLocation,
  isAuthenticReview,
  DEFAULT_VERIFIED_REVIEWS,
} from "@/lib/reviews-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const url = new URL(request.url);
    const productIdParam = url.searchParams.get("productId");
    const productId = productIdParam ? Number(productIdParam) : null;

    if (productId) {
      const rows = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          isVerified: reviews.isVerified,
          createdAt: reviews.createdAt,
          name: sql<string>`coalesce(${users.name}, ${reviews.userName}, 'Customer')`,
          city: sql<string>`coalesce(${addresses.city}, 'Gujarat')`,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(addresses, eq(users.id, addresses.userId))
        .where(eq(reviews.productId, productId))
        .orderBy(desc(reviews.createdAt));

      // Deduplicate in case a user has multiple addresses & filter authentic reviews
      const seen = new Set<number>();
      const productReviews = rows
        .filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return isAuthenticReview(r.name, r.comment);
        })
        .map((r) => ({
          ...r,
          city: resolveCustomerLocation(r.name, r.city),
        }));

      return Response.json({ reviews: productReviews });
    }

    // Site-wide real customer reviews for testimonials section
    const rows = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        productSlug: products.slug,
        rating: reviews.rating,
        comment: reviews.comment,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
        name: sql<string>`coalesce(${users.name}, ${reviews.userName}, 'Customer')`,
        city: sql<string>`coalesce(${addresses.city}, 'Gujarat')`,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(addresses, eq(users.id, addresses.userId))
      .orderBy(desc(reviews.createdAt), desc(reviews.id));

    const seen = new Set<number>();
    let allReviews = rows
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return isAuthenticReview(r.name, r.comment);
      })
      .map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        productSlug: r.productSlug,
        rating: r.rating,
        comment: r.comment,
        isVerified: r.isVerified,
        createdAt: r.createdAt,
        name: r.name,
        city: resolveCustomerLocation(r.name, r.city),
      }));

    // Hydrate any reviews persisted in MongoDB Atlas into the response list
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        const mReviews = await mongo
          .collection("reviews")
          .find()
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray();

        for (const mr of mReviews) {
          const revId = mr.reviewId ? Number(mr.reviewId) : mr.id ? Number(mr.id) : null;
          if (revId && seen.has(revId)) continue;
          if (revId) seen.add(revId);

          allReviews.unshift({
            id: revId || Date.now(),
            productId: mr.productId || 1,
            productName: mr.productName || "Silver Leaf Kaju Katli Festive Box",
            productSlug: mr.productSlug || "kaju-katli",
            rating: mr.rating || 5,
            comment: mr.comment || "",
            isVerified: mr.isVerified ?? true,
            createdAt: mr.createdAt || new Date(),
            name: mr.userName || mr.name || "Valued Patron",
            city: resolveCustomerLocation(mr.userName || mr.name, mr.city),
          });
        }
      }
    } catch {}

    const totalCount = allReviews.length;
    const avgRating =
      totalCount > 0
        ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
        : "0.0";

    return Response.json({
      reviews: allReviews,
      totalCount,
      averageRating: avgRating,
    });
  } catch (err: any) {
    console.error("[Reviews GET Error]", err);
    return Response.json({
      reviews: [],
      totalCount: 0,
      averageRating: "0.0",
    });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const user = await getAuthUser(request);

    const body = await readJsonSafe<{
      productId?: unknown;
      rating?: unknown;
      comment?: unknown;
      userName?: unknown;
      city?: unknown;
    }>(request);

    if (!body) {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const guestName = typeof body.userName === "string" ? body.userName.trim() : "";

    // Anonymous request with neither user session nor guest name returns 401
    if (!user && !guestName) {
      return Response.json(
        { error: "Unauthorized. Please log in or provide your name to post a review." },
        { status: 401 }
      );
    }

    const reviewerName = guestName || user?.name?.trim() || "";

    if (!reviewerName || reviewerName.length < 2) {
      return Response.json(
        { error: "Please enter your name to post a review." },
        { status: 400 }
      );
    }

    const productId = parsePositiveInt(body.productId) || 1;
    const rating =
      typeof body.rating === "number" &&
      Number.isInteger(body.rating) &&
      body.rating >= 1 &&
      body.rating <= 5
        ? body.rating
        : 5;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!comment || comment.length < 4) {
      return Response.json(
        { error: "Please provide a review comment with at least 4 characters." },
        { status: 400 }
      );
    }

    const now = new Date();

    const [insertRes] = await db.insert(reviews).values({
      productId,
      userId: user?.id || null,
      userName: reviewerName,
      rating,
      comment,
      isVerified: true,
      createdAt: now,
    });

    const newId = (insertRes as any)?.insertId || Date.now();
    const city = resolveCustomerLocation(
      reviewerName,
      typeof body.city === "string" ? body.city : null
    );

    // Persist review to MongoDB Atlas as well for multi-environment durability
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("reviews").insertOne({
          reviewId: newId,
          productId,
          userId: user?.id || null,
          userName: reviewerName,
          rating,
          comment,
          city,
          isVerified: true,
          createdAt: now,
        });
      }
    } catch (mErr) {
      console.warn("[Reviews POST MongoDB sync notice]", mErr);
    }

    return Response.json({
      ok: true,
      review: {
        id: newId,
        productId,
        rating,
        comment,
        userName: reviewerName,
        city,
        isVerified: true,
        createdAt: now.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[Reviews POST Error]", err);
    return Response.json({ error: err.message || "Failed to submit review" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSeeded();
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    const reviewId = idParam ? parsePositiveInt(idParam) : null;

    if (!reviewId) {
      return Response.json({ error: "Valid review id is required" }, { status: 400 });
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));
    return Response.json({ ok: true, deletedId: reviewId });
  } catch (err: any) {
    console.error("[Reviews DELETE Error]", err);
    return Response.json({ error: err.message || "Failed to delete review" }, { status: 500 });
  }
}
