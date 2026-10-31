/**
 * Canonical site URL helpers.
 *
 * There is no site URL configured in `.env.local` yet, so fall back to the
 * production domain used in the storefront metadata. Set `NEXT_PUBLIC_SITE_URL`
 * (for example `http://localhost:9449` in development) to override it.
 */
export const DEFAULT_SITE_URL = "https://vardayini.com";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_SITE_URL;

  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(pathname = "/"): string {
  return new URL(pathname, getSiteUrl()).toString();
}
