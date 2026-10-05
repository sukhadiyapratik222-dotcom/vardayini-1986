import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const storeUrl = (process.env.STORE_API_URL || "http://localhost:9449").replace(/\/$/, "");
    const res = await fetch(`${storeUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Authentication failed" }, { status: res.status });
    }

    if (!data.user || data.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Extract vs_session cookie from storefront response headers
    const setCookieHeader = res.headers.get("set-cookie");
    let sessionToken = "";
    if (setCookieHeader) {
      const match = setCookieHeader.match(/vs_session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

    if (!sessionToken) {
      return NextResponse.json({ error: "Failed to establish admin session" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal server error during authentication" }, { status: 500 });
  }
}
