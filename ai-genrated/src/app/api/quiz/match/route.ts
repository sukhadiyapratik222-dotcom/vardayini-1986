import { NextRequest } from "next/server";
import { calculateQuizMatch, saveUserQuizResult } from "@/lib/taste-quiz";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers, userId, sessionId } = body;

    if (!answers || typeof answers !== "object") {
      return Response.json(
        { error: "Quiz answers object is required" },
        { status: 400 }
      );
    }

    const matchResult = await calculateQuizMatch(answers);

    // Save user quiz result for returning visitors
    if (userId || sessionId) {
      await saveUserQuizResult({
        userId: userId ? Number(userId) : null,
        sessionId: sessionId || null,
        personalitySlug: matchResult.personality.slug,
        personalityName: matchResult.personality.name,
        answers,
        matchedProducts: matchResult.matches,
      });
    }

    return Response.json({
      success: true,
      result: matchResult,
    });
  } catch (err: any) {
    console.error("[Quiz Match API] Error:", err);
    return Response.json(
      { error: err.message || "Failed to calculate taste match" },
      { status: 500 }
    );
  }
}

