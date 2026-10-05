import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("vsm_admin_session")?.value;
  cookieStore.delete("vsm_admin_session");

  if (sessionToken) {
    try {
      const storeUrl = (process.env.STORE_API_URL || "http://localhost:9449").replace(/\/$/, "");
      await fetch(`${storeUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `vs_session=${sessionToken}`,
        },
        cache: "no-store",
      });
    } catch (err) {
      console.warn("[Dashboard Auth] Storefront logout notice:", err);
    }
  }

  return NextResponse.json({ success: true });
}
