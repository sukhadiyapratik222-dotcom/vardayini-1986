import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STORE_URL_CONFIG_ERROR, getStoreApiBase } from "@/lib/store-url";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function forwardRequest(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const storeApiBase = getStoreApiBase();
  if (!storeApiBase) {
    console.error("[Store Proxy] STORE_API_URL is not configured.");
    return NextResponse.json({ error: STORE_URL_CONFIG_ERROR }, { status: 503 });
  }

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

  // Forward admin API key for backend service authentication
  const adminKey = process.env.ADMIN_API_KEY || process.env.STORE_ADMIN_KEY || "vsm_admin_secret_key_2026_secured";
  if (adminKey) {
    headers.set("x-admin-key", adminKey);
    headers.set("authorization", `Bearer ${adminKey}`);
  }

  try {
    let body: ArrayBuffer | undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      try {
        const buf = await req.arrayBuffer();
        if (buf && buf.byteLength > 0) {
          body = buf;
        }
      } catch {
        // Body was either empty or already consumed
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    const responseData = await response.arrayBuffer();
    const responseHeaders = new Headers();

    const respContentType = response.headers.get("content-type");
    if (respContentType) {
      responseHeaders.set("content-type", respContentType);
    }

    if (response.status === 401 || response.status === 403) {
      try {
        const text = new TextDecoder().decode(responseData).toLowerCase();
        if (
          response.status === 401 ||
          text.includes("account deactivated") ||
          text.includes("account inactive")
        ) {
          cookieStore.delete("vsm_admin_session");
        }
      } catch {
        // ignore decoding errors
      }
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
        `Ensure the storefront deployment is running and STORE_API_URL is correct.`
      );
    } else {
      console.error(`Store proxy error forwarding to ${targetUrl}:`, error);
    }
    return NextResponse.json(
      {
        error: "Store service unavailable",
        message: isConnRefused
          ? `Storefront service at ${storeApiBase} is unreachable. ` +
            `Ensure the storefront deployment is running and STORE_API_URL is correct.`
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
