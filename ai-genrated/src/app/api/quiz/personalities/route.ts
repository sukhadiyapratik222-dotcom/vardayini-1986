import { NextRequest } from "next/server";
import { getQuizPersonalities } from "@/lib/taste-quiz";
import { db } from "@/db";
import { quizPersonalities } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getQuizPersonalities();
    return Response.json({ success: true, personalities: list });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load personalities" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, tagline, description, badge, recommendedSweet, heroImageUrl } = body;

    if (!slug || !name) {
      return Response.json({ error: "Slug and name are required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(quizPersonalities)
      .where(eq(quizPersonalities.slug, slug))
      .limit(1);

    if (existing) {
      await db
        .update(quizPersonalities)
        .set({
          name,
          tagline: tagline || existing.tagline,
          description: description || existing.description,
          badge: badge || existing.badge,
          recommendedSweet: recommendedSweet || existing.recommendedSweet,
          heroImageUrl: heroImageUrl || existing.heroImageUrl,
        })
        .where(eq(quizPersonalities.slug, slug));
    } else {
      await db.insert(quizPersonalities).values({
        slug,
        name,
        tagline: tagline || "",
        description: description || "",
        badge: badge || "Pure Heritage",
        recommendedSweet: recommendedSweet || "Vardayini Signature",
        heroImageUrl: heroImageUrl || "/images/kaju-katli.jpg",
      });
    }

    const updated = await getQuizPersonalities();
    return Response.json({ success: true, personalities: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to save personality" }, { status: 500 });
  }
}

