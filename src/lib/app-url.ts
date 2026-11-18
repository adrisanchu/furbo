/**
 * Public URL of the app. On Vercel it is derived from its system env vars so
 * production and every preview work without setting BETTER_AUTH_URL by hand.
 * An explicit BETTER_AUTH_URL (local dev, custom domain) always wins.
 */
function https(host: string | undefined) {
  return host ? `https://${host}` : undefined;
}

export const appOrigins: string[] = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_URL,
]
  .map(https)
  .filter((o): o is string => Boolean(o));

export const appUrl: string | undefined =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_ENV === "production"
    ? https(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : https(process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL));

export function absoluteUrl(path: string): string {
  return `${appUrl ?? "http://localhost:3000"}${path}`;
}
