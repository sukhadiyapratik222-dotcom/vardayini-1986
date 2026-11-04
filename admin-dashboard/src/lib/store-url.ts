/**
 * Storefront URL resolution.
 *
 * The dashboard is a separate deployment from the storefront. On a serverless
 * host (Vercel) there is no `localhost:9449` inside the function, so the
 * storefront must be addressed through its public deployment URL.
 *
 * Server side:  STORE_API_URL
 * Client side:  NEXT_PUBLIC_STORE_API
 */

export const DEV_STORE_URL = "http://127.0.0.1:9449";
export const PROD_DEFAULT_STORE_URL = "https://vardayini-1986.vercel.app";

export const STORE_URL_CONFIG_ERROR =
  "Storefront URL is not configured. Set STORE_API_URL (server) and " +
  "NEXT_PUBLIC_STORE_API (browser) to the deployed storefront URL, " +
  "for example https://vardayini-1986.vercel.app, then redeploy.";

function normalise(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  // If user configured URL with trailing /api or /api/, strip it to prevent duplicate /api/api/...
  if (u.endsWith("/api")) {
    u = u.slice(0, -4).replace(/\/+$/, "");
  }
  return u;
}

/**
 * Server-only base URL used by the auth routes and the /api/store proxy.
 * Automatically falls back to the live deployed Vardayini storefront
 * (https://vardayini-1986.vercel.app) in production or Vercel if not explicitly set.
 */
export function getStoreApiBase(): string {
  const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
  const configured = process.env.STORE_API_URL || process.env.NEXT_PUBLIC_STORE_API;
  if (configured && configured.trim()) {
    const norm = normalise(configured);
    const isLocal = norm.includes("localhost") || norm.includes("127.0.0.1");
    const isSelfAdmin =
      norm.includes("uiti") ||
      norm.includes("witl3rg43") ||
      norm.includes("admin-dashboard");

    // If running on Vercel or production and configured points to localhost or the dashboard itself, fall back to deployed store
    if ((isVercel || process.env.NODE_ENV === "production") && (isLocal || isSelfAdmin)) {
      return PROD_DEFAULT_STORE_URL;
    }
    if (!isSelfAdmin) {
      return norm;
    }
  }

  // On Vercel, localhost:9449 does not exist in serverless containers - always use live deployed storefront
  if (isVercel || process.env.NODE_ENV === "production") {
    return PROD_DEFAULT_STORE_URL;
  }

  // Local development workflow (port 9449)
  return DEV_STORE_URL;
}

/**
 * Public storefront origin used by client components for preview links and iframes.
 */
export function getPublicStoreUrl(): string {
  const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
  const configured = process.env.NEXT_PUBLIC_STORE_API || process.env.STORE_API_URL;
  if (configured && configured.trim()) {
    const norm = normalise(configured);
    const isLocal = norm.includes("localhost") || norm.includes("127.0.0.1");
    const isSelfAdmin =
      norm.includes("uiti") ||
      norm.includes("witl3rg43") ||
      norm.includes("admin-dashboard");

    if ((isVercel || process.env.NODE_ENV === "production") && (isLocal || isSelfAdmin)) {
      return PROD_DEFAULT_STORE_URL;
    }
    if (!isSelfAdmin) {
      return norm;
    }
  }

  if (isVercel || process.env.NODE_ENV === "production") {
    return PROD_DEFAULT_STORE_URL;
  }

  return normalise(DEV_STORE_URL);
}

/**
 * Human-readable reason used in 503 responses. Explains the Vercel case
 * instead of telling the user to run `npm run dev:store` on a server that
 * cannot run it.
 */
export function storeUnreachableMessage(storeUrl: string): string {
  if (process.env.NODE_ENV === "production") {
    return (
      `Store service unavailable: could not reach ${storeUrl}. ` +
      "Check that the storefront Vercel project is deployed and that " +
      "STORE_API_URL points to its production URL."
    );
  }

  return (
    `Store service unavailable: Storefront backend on port 9449 is offline. ` +
    "Please start it with 'npm run dev:store'."
  );
}
