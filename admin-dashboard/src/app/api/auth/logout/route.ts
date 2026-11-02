import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStoreApiBase } from "@/lib/store-url";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("vsm_admin_session")?.value;
  cookieStore.delete("vsm_admin_session");

  if (sessionToken) {
    try {
      const storeUrl = getStoreApiBase();
      if (!storeUrl) {
        // Local cookie is already cleared; nothing to revoke remotely.
        return NextResponse.json({ success: true });
      }
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
