import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // 1. Handle CORS OPTIONS preflight requests for API routes
  if (request.nextUrl.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-admin-key, x-admin-role, x-admin-email, cookie, x-api-key, accept",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = NextResponse.next();

  // 2. Attach CORS headers to all API route responses
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-admin-key, x-admin-role, x-admin-email, cookie, x-api-key, accept"
    );
  }

  // 3. Ensure a persistent guest cart cookie (vs_cart) exists on all requests
  if (!request.cookies.get("vs_cart")) {
    response.cookies.set("vs_cart", crypto.randomUUID().replace(/-/g, ""), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
