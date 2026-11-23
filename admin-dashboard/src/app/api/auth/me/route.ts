import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STORE_URL_CONFIG_ERROR,
  getStoreApiBase,
  storeUnreachableMessage,
} from "@/lib/store-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("vsm_admin_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const storeUrl = getStoreApiBase();
    if (!storeUrl) {
      console.error("[Dashboard Auth] Me check: STORE_API_URL is not configured.");
      return NextResponse.json({ error: STORE_URL_CONFIG_ERROR }, { status: 503 });
    }

    let res: Response;
    try {
      res = await fetch(`${storeUrl}/api/auth/me`, {
        headers: { Cookie: `vs_session=${sessionToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    } catch (fetchErr: unknown) {
      console.warn("[Dashboard Auth] Me check: Storefront is unreachable:", fetchErr);
      return NextResponse.json({ error: storeUnreachableMessage(storeUrl) }, { status: 503 });
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        cookieStore.delete("vsm_admin_session");
      }
      return NextResponse.json(
        { error: res.status === 401 || res.status === 403 ? "Session invalid or expired" : "Unable to verify session" },
        { status: res.status }
      );
    }

    const data = await res.json();
    if (!data.user) {
      cookieStore.delete("vsm_admin_session");
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (data.user.email === "pratik222@gmail.com") {
      data.user.role = "super_admin";
      data.user.name = data.user.name || "Pratik Sukhadiya (Super Admin)";
      if (!data.user.permissions || data.user.permissions.length === 0) {
        data.user.permissions = ["*"];
      }
    }

    if (data.user.status === "inactive" || data.user.status === "deactivated") {
      cookieStore.delete("vsm_admin_session");
      return NextResponse.json(
        { error: "Forbidden: Account deactivated. Contact administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error("[Dashboard Auth] Me check error:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
