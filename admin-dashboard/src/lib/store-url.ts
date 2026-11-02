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
  return url.trim().replace(/\/+$/, "");
}

/**
 * Server-only base URL used by the auth routes and the /api/store proxy.
 * Automatically falls back to the live deployed Vardayini storefront
 * (https://vardayini-1986.vercel.app) in production if not explicitly set.
 */
export function getStoreApiBase(): string {
  const configured = process.env.STORE_API_URL || process.env.NEXT_PUBLIC_STORE_API;
  if (configured && configured.trim()) {
    const norm = normalise(configured);
    // If running in production on Vercel and configured points to localhost, fall back to deployed store
    if (process.env.NODE_ENV === "production" && (norm.includes("localhost") || norm.includes("127.0.0.1"))) {
      return PROD_DEFAULT_STORE_URL;
    }
    return norm;
  }

  // Development keeps the local workflow (port 9449)
  if (process.env.NODE_ENV !== "production") return DEV_STORE_URL;

  // Production default: live deployed storefront
  return PROD_DEFAULT_STORE_URL;
}

/**
 * Public storefront origin used by client components for preview links and iframes.
 */
export function getPublicStoreUrl(): string {
  const configured = process.env.NEXT_PUBLIC_STORE_API || process.env.STORE_API_URL;
  if (configured && configured.trim()) {
    const norm = normalise(configured);
    if (process.env.NODE_ENV === "production" && (norm.includes("localhost") || norm.includes("127.0.0.1"))) {
      return PROD_DEFAULT_STORE_URL;
    }
    return norm;
  }

  if (process.env.NODE_ENV !== "production") return normalise(DEV_STORE_URL);

  return PROD_DEFAULT_STORE_URL;
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
