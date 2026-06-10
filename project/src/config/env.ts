/**
 * Central environment configuration.
 *
 * All VITE_ env vars are read here once. Import from this file instead of
 * accessing import.meta.env directly in service / API files.
 *
 * To override for local development, edit .env (never commit secrets).
 * See .env.example for the full list of supported variables.
 */

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Auth / main backend (auth service, user management) */
export const AUTH_API_BASE_URL = trimSlash(
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "https://d1wcu2a5qc2e6g.cloudfront.net",
);

/** Patient / clinical backend (assessments, triage, catalogs) */
export const PATIENT_API_BASE_URL = trimSlash(
  (import.meta.env.VITE_PATIENT_API_BASE_URL as string | undefined) ??
    "https://d3jfk6d9o8wsur.cloudfront.net",
);
