const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(:\d+)?$/i;

export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

/**
 * Production builds must point at a deployed HTTPS API. This guard prevents
 * a local emulator URL from silently shipping in a store artifact.
 */
if (APP_ENV === "production") {
  const parsed = new URL(API_BASE_URL);
  if (parsed.protocol !== "https:" || LOCAL_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error(
      "Production mobile builds require EXPO_PUBLIC_API_BASE_URL to be a deployed HTTPS API URL."
    );
  }
}
