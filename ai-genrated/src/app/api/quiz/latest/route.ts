import { NextRequest } from "next/server";
import { getLatestUserQuizResult } from "@/lib/taste-quiz";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    const result = await getLatestUserQuizResult(
      userId ? Number(userId) : null,
      sessionId || null
    );

    return Response.json({ success: true, result });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load result" }, { status: 500 });
  }
}

