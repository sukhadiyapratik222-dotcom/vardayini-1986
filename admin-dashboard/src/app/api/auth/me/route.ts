import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("vsm_admin_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const storeUrl = (process.env.STORE_API_URL || "http://localhost:9449").replace(/\/$/, "");
    const res = await fetch(`${storeUrl}/api/account`, {
      headers: {
        Cookie: `vs_session=${sessionToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      cookieStore.delete("vsm_admin_session");
      return NextResponse.json({ error: "Session invalid or expired" }, { status: 401 });
    }

    const data = await res.json();
    if (!data.user || data.user.role !== "admin") {
      cookieStore.delete("vsm_admin_session");
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error("[Dashboard Auth] Me check error:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
