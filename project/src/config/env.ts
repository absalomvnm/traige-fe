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
    "https://d2h3z5kegnj368.cloudfront.net",
);

/** Patient / clinical backend (assessments, triage, catalogs) */
export const PATIENT_API_BASE_URL = trimSlash(
  (import.meta.env.VITE_PATIENT_API_BASE_URL as string | undefined) ??
    "https://d3mryws7sox23u.cloudfront.net",
);
