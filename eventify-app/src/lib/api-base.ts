/**
 * Backend origin for browser fetches. Set NEXT_PUBLIC_API_URL in production.
 */
export function getApiBase(): string {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "http://localhost:5000";
  return raw.replace(/\/$/, "");
}
