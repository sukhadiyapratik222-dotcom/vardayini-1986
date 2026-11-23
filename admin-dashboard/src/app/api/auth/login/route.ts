import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STORE_URL_CONFIG_ERROR,
  getStoreApiBase,
  storeUnreachableMessage,
} from "@/lib/store-url";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const storeUrl = getStoreApiBase();
    if (!storeUrl) {
      console.error("[Dashboard Auth] STORE_API_URL is not configured.");
      return NextResponse.json({ error: STORE_URL_CONFIG_ERROR }, { status: 503 });
    }

    let res: Response;
    try {
      res = await fetch(`${storeUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch (fetchErr: unknown) {
      const err = fetchErr as { code?: string; cause?: { code?: string; errors?: Array<{ code?: string }> } };
      const isConnRefused =
        err?.cause?.code === "ECONNREFUSED" ||
        err?.code === "ECONNREFUSED" ||
        (Array.isArray(err?.cause?.errors) && err.cause.errors.some((e) => e.code === "ECONNREFUSED")) ||
        (fetchErr instanceof Error && fetchErr.message.toLowerCase().includes("fetch failed"));

      console.warn(`[Dashboard Auth] Storefront service at ${storeUrl} is unreachable:`, fetchErr);

      return NextResponse.json(
        {
          error: isConnRefused
            ? storeUnreachableMessage(storeUrl)
            : "Store service is unreachable during authentication.",
        },
        { status: 503 }
      );
    }

    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      const errorMsg =
        data?.error ||
        data?.message ||
        (res.status === 401 ? "Invalid email or password" : `Authentication failed (${res.status})`);
      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    if (!data?.user) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (data.user.role !== "admin" && data.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (data.user.status === "inactive" || data.user.status === "deactivated") {
      return NextResponse.json({ error: "Forbidden: Account deactivated. Contact administrator." }, { status: 403 });
    }

    // Extract vs_session cookie from storefront response headers
    let sessionToken = "";
    if (typeof res.headers.getSetCookie === "function") {
      for (const cookieStr of res.headers.getSetCookie()) {
        const match = cookieStr.match(/vs_session=([^;]+)/);
        if (match) {
          sessionToken = match[1];
          break;
        }
      }
    }

    if (!sessionToken) {
      const setCookieHeader = res.headers.get("set-cookie");
      if (setCookieHeader) {
        const match = setCookieHeader.match(/vs_session=([^;]+)/);
        if (match) {
          sessionToken = match[1];
        }
      }
    }

    if (!sessionToken && data?.token) {
      sessionToken = data.token;
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Storefront did not issue an authenticated session." },
        { status: 502 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("vsm_admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error("[Dashboard Auth] Login error:", error);
    const message = error instanceof Error ? error.message : "Internal server error during authentication";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
