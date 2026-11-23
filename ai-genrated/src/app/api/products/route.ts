import { ensureSeeded } from "@/db/seed";
import { listProducts } from "@/lib/products";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  await ensureSeeded();
  const { searchParams } = new URL(request.url);
  const products = await listProducts({
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || searchParams.get("q") || undefined,
    sort: searchParams.get("sort") || undefined,
    tag: searchParams.get("tag") || undefined,
    featured: searchParams.get("featured") === "true",
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    ids: searchParams.get("ids")
      ? searchParams
          .get("ids")!
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((n) => !isNaN(n) && n > 0)
      : undefined,
  });
  return NextResponse.json({ products }, { headers: CORS_HEADERS });
}
