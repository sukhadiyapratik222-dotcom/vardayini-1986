import { NextRequest } from "next/server";
import { getQuizQuestions, DEFAULT_QUESTIONS } from "@/lib/taste-quiz";
import { db } from "@/db";
import { quizQuestions, quizOptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const questions = await getQuizQuestions();
    return Response.json({ success: true, questions });
  } catch (err: any) {
    console.error("[Quiz API] Error loading questions:", err);
    return Response.json({ success: true, questions: DEFAULT_QUESTIONS });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions)) {
      return Response.json({ error: "Questions array is required" }, { status: 400 });
    }

    for (const q of questions) {
      if (q.key) {
        await db
          .update(quizQuestions)
          .set({
            title: q.title,
            subtitle: q.subtitle || null,
            weight: q.weight ?? 20,
            icon: q.icon || "🍯",
            isStrictFilter: Boolean(q.isStrictFilter),
            isEnabled: q.isEnabled !== undefined ? Boolean(q.isEnabled) : true,
          })
          .where(eq(quizQuestions.questionKey, q.key));
      }
    }

    const updated = await getQuizQuestions();
    return Response.json({ success: true, questions: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to update questions" }, { status: 500 });
  }
}

