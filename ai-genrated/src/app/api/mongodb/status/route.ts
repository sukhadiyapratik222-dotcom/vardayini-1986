import { NextResponse } from "next/server";
import { testMongoConnection, getMongoDb, resolveMongoUri } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await testMongoConnection();

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        configured: Boolean(process.env.MONGODB_URI),
        target: resolveMongoUri().replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@"),
        help: "Add MONGODB_URI in Vercel Project Settings -> Environment Variables and redeploy.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function POST() {
  try {
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "MongoDB connection could not be established." },
        { status: 503 }
      );
    }

    // Ping the cluster
    const pingRes = await db.command({ ping: 1 });
    const connInfo = await testMongoConnection();

    return NextResponse.json({
      ok: true,
      ping: pingRes,
      status: connInfo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Ping error",
      },
      { status: 500 }
    );
  }
}

