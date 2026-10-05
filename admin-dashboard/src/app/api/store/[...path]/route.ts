import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function forwardRequest(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const storeApiBase = (process.env.STORE_API_URL || "http://localhost:9449").replace(/\/$/, "");

  const subPath = path.join("/");
  const url = new URL(req.url);
  const targetUrl = `${storeApiBase}/${subPath}${url.search}`;

  const headers = new Headers();

  // Forward content-type if present
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  // Forward session server-to-server using the dashboard's HttpOnly cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("vsm_admin_session")?.value;

  // Set Cookie header forwarding vs_session
  if (sessionToken) {
    headers.set("cookie", `vs_session=${sessionToken}`);
  }

  try {
    let body: ArrayBuffer | undefined;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      body = await req.arrayBuffer();
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseData = await response.arrayBuffer();
    const responseHeaders = new Headers();

    const respContentType = response.headers.get("content-type");
    if (respContentType) {
      responseHeaders.set("content-type", respContentType);
    }

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; cause?: { code?: string; errors?: Array<{ code?: string }> } };
    const isConnRefused =
      err?.cause?.code === "ECONNREFUSED" ||
      err?.code === "ECONNREFUSED" ||
      (Array.isArray(err?.cause?.errors) && err.cause.errors.some((e) => e.code === "ECONNREFUSED"));

    if (isConnRefused) {
      console.warn(
        `[Store Proxy] Storefront service at ${targetUrl} is unreachable (ECONNREFUSED). ` +
        `Ensure the storefront app is running on port 9449.`
      );
    } else {
      console.error(`Store proxy error forwarding to ${targetUrl}:`, error);
    }
    return NextResponse.json(
      {
        error: "Store service unavailable",
        message: isConnRefused
          ? `Storefront service at ${storeApiBase} is offline. Please ensure the store service is running on port 9449.`
          : (error instanceof Error ? error.message : "Proxy fetch error"),
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return forwardRequest(req, ctx);
}
