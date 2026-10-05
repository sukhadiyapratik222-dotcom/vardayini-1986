import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { readJsonSafe, parsePositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!productId) return Response.json({ reviews: [] });
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      name: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
  return Response.json({ reviews: rows });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Please log in to review." }, { status: 401 });

  const body = await readJsonSafe<{ productId?: unknown; rating?: unknown; comment?: unknown }>(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const productId = parsePositiveInt(body.productId);
  const rating =
    typeof body.rating === "number" &&
    Number.isInteger(body.rating) &&
    body.rating >= 1 &&
    body.rating <= 5
      ? body.rating
      : null;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!productId || rating === null || comment.length < 4) {
    return Response.json({ error: "Please add a rating (1-5) and a short review." }, { status: 400 });
  }

  // Reject second review by same user for same product
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.userId, user.id)))
    .limit(1);

  if (existing) {
    return Response.json({ error: "You have already reviewed this product." }, { status: 409 });
  }

  const [created] = await db
    .insert(reviews)
    .values({ productId, userId: user.id, rating, comment })
    .returning();
  return Response.json({ review: created });
}
