import { NextResponse } from "next/server";
import { getStoreApiBase, getPublicStoreUrl } from "@/lib/store-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment self-check for the dashboard's connection to the storefront.
 *
 * Open /api/diag on the deployed dashboard to confirm that STORE_API_URL is
 * present and that the storefront answers. Never exposes secret values.
 */
export async function GET() {
  const storeApiUrl = getStoreApiBase();
  const publicStoreUrl = getPublicStoreUrl();

  const report: Record<string, unknown> = {
    runtime: {
      vercel: process.env.VERCEL ?? null,
      region: process.env.VERCEL_REGION ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
    config: {
      STORE_API_URL: storeApiUrl
        ? { set: true, value: storeApiUrl }
        : { set: false, hint: "Set STORE_API_URL to the storefront production URL" },
      NEXT_PUBLIC_STORE_API: publicStoreUrl
        ? { set: true, value: publicStoreUrl }
        : { set: false, hint: "Set NEXT_PUBLIC_STORE_API and redeploy (build-time value)" },
      ADMIN_API_KEY: Boolean(process.env.ADMIN_API_KEY || process.env.STORE_ADMIN_KEY),
    },
  };

  if (!storeApiUrl) {
    return NextResponse.json(
      { ...report, storefront: { reachable: false, error: "STORE_API_URL is not configured" } },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const started = Date.now();
    const res = await fetch(`${storeApiUrl}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    report.storefront = {
      reachable: res.ok,
      status: res.status,
      ms: Date.now() - started,
      url: `${storeApiUrl}/api/health`,
    };
  } catch (error) {
    report.storefront = {
      reachable: false,
      url: `${storeApiUrl}/api/health`,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(report, {
    status: report.storefront && (report.storefront as { reachable: boolean }).reachable ? 200 : 502,
    headers: { "cache-control": "no-store" },
  });
}
