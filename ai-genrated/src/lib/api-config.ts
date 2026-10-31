/**
 * Vardayini Sweet Mart — Frontend API Client Configuration
 * Allows Next.js (local & Vercel) to communicate seamlessly with either:
 * 1. An external Python FastAPI backend (e.g. exposed via ngrok via NEXT_PUBLIC_API_URL)
 * 2. The local Next.js API routes (default fallback)
 */

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url) return "";
  // Strip trailing slash
  return url.replace(/\/+$/, "");
}

export function isExternalApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());
}

/**
 * Builds the destination API URL.
 * If NEXT_PUBLIC_API_URL is configured (e.g. https://xxx.ngrok-free.app), prefixes the path.
 * Otherwise returns the relative local path (e.g. /api/products).
 */
export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

/**
 * Returns fetch headers with Content-Type and automatic ngrok bypass headers
 */
export function getApiHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  // Automatically bypass ngrok free warning interstitial screen
  if (isExternalApiConfigured()) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  return headers;
}
