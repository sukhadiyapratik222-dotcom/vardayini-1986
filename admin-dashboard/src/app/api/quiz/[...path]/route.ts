import { NextRequest } from "next/server";
import {
  GET as storeGet,
  POST as storePost,
  PUT as storePut,
  DELETE as storeDelete,
  PATCH as storePatch,
  HEAD as storeHead,
} from "@/app/api/store/[...path]/route";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Direct /api/quiz/* proxy route on the admin dashboard.
 * Ensures any direct call to /api/quiz/questions, /api/quiz/settings, /api/quiz/tags, etc.
 * without the /api/store prefix transparently proxies to the storefront without HTTP 404.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const wrappedParams = Promise.resolve({ path: ["api", "quiz", ...path] });
  return storeGet(req, { params: wrappedParams });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const wrappedParams = Promise.resolve({ path: ["api", "quiz", ...path] });
  return storePost(req, { params: wrappedParams });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const wrappedParams = Promise.resolve({ path: ["api", "quiz", ...path] });
  return storePut(req, { params: wrappedParams });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const wrappedParams = Promise.resolve({ path: ["api", "quiz", ...path] });
  return storeDelete(req, { params: wrappedParams });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const wrappedParams = Promise.resolve({ path: ["api", "quiz", ...path] });
  return storePatch(req, { params: wrappedParams });
}

export async function HEAD(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const wrappedParams = Promise.resolve({ path: ["api", "quiz", ...path] });
  return storeHead(req, { params: wrappedParams });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, cookie, accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}
