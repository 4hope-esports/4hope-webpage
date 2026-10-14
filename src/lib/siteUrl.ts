/**
 * Absolute origin used for canonical URLs, the sitemap and Open Graph tags.
 * Set NEXT_PUBLIC_SITE_URL in production; Vercel's production URL is the
 * fallback, then localhost for dev.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (process.env.APP_ENV === "production") return "https://bracket.4hope.app";
  return "http://localhost:3000";
}

/** Only the production deployment should be indexed — UAT/dev stay out of Google. */
export function isIndexableEnv(): boolean {
  return process.env.APP_ENV === "production";
}
