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

    const existingRows = await db.select().from(quizQuestions);
    const existingKeys = new Set(existingRows.map((r) => r.questionKey));
    const submittedKeys = new Set<string>();

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const rawKey = q.key || q.questionKey || `q_${Date.now()}_${idx}`;
      const cleanKey = String(rawKey).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 50);
      if (!cleanKey) continue;

      submittedKeys.add(cleanKey);
      const stepNumber = idx + 1;
      const title = q.title || "Taste Preference";
      const subtitle = q.subtitle || null;
      const weight = Number(q.weight) ?? 20;
      const icon = q.icon || "🍯";
      const isStrictFilter = Boolean(q.isStrictFilter);
      const isEnabled = q.isEnabled !== false;

      if (existingKeys.has(cleanKey)) {
        await db
          .update(quizQuestions)
          .set({
            title,
            subtitle,
            stepNumber,
            weight,
            icon,
            isStrictFilter,
            isEnabled,
          })
          .where(eq(quizQuestions.questionKey, cleanKey));
      } else {
        await db.insert(quizQuestions).values({
          questionKey: cleanKey,
          title,
          subtitle,
          stepNumber,
          weight,
          icon,
          isStrictFilter,
          isEnabled,
        });
        existingKeys.add(cleanKey);
      }

      // Upsert Options for this question
      if (Array.isArray(q.options) && q.options.length > 0) {
        // Clear previous options for this question key to ensure clean replacement
        await db.delete(quizOptions).where(eq(quizOptions.questionKey, cleanKey));

        for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
          const opt = q.options[optIdx];
          const rawOptKey = opt.key || opt.optionKey || `opt_${optIdx + 1}`;
          const cleanOptKey = String(rawOptKey).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 60);
          const optLabel = opt.label || "Option";
          const optDesc = opt.description || null;
          const optIcon = opt.icon || "✨";
          const sortOrder = Number(opt.sortOrder) || optIdx + 1;
          const tagMappingStr =
            typeof opt.tagMapping === "object"
              ? JSON.stringify(opt.tagMapping)
              : typeof opt.tagMapping === "string" && opt.tagMapping.trim()
              ? opt.tagMapping
              : JSON.stringify({});

          await db.insert(quizOptions).values({
            questionKey: cleanKey,
            optionKey: cleanOptKey,
            label: optLabel,
            description: optDesc,
            icon: optIcon,
            sortOrder,
            tagMapping: tagMappingStr,
            isEnabled: true,
          });
        }
      }
    }

    // Purge removed questions and their options from the database
    if (submittedKeys.size > 0) {
      for (const row of existingRows) {
        if (!submittedKeys.has(row.questionKey)) {
          await db.delete(quizOptions).where(eq(quizOptions.questionKey, row.questionKey));
          await db.delete(quizQuestions).where(eq(quizQuestions.questionKey, row.questionKey));
        }
      }
    }

    const updated = await getQuizQuestions();
    return Response.json({ success: true, questions: updated });
  } catch (err: any) {
    console.error("[Quiz API] Error saving questions:", err);
    return Response.json({ error: err.message || "Failed to update questions" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) {
      return Response.json({ error: "Missing key parameter" }, { status: 400 });
    }

    await db.delete(quizOptions).where(eq(quizOptions.questionKey, key));
    await db.delete(quizQuestions).where(eq(quizQuestions.questionKey, key));

    const updated = await getQuizQuestions();
    return Response.json({ success: true, questions: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to delete question" }, { status: 500 });
  }
}
