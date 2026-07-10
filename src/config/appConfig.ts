const normalizeBaseUrl = (value: string | undefined, fallback: string): string => {
  let raw = (value || fallback).trim();
  // Remove trailing slashes and redundant /api suffix
  raw = raw.replace(/\/+$/, "");
  raw = raw.replace(/\/api$/, "");
  return raw;
};

const configuredBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;

if (!configuredBackendUrl && process.env.NODE_ENV === "production") {
  throw new Error("NEXT_PUBLIC_BACKEND_URL is required in production");
}

export const BACKEND_URL = normalizeBaseUrl(configuredBackendUrl, "http://localhost:3001");

// High-Scale API Root: Using the host directly to allow full /api/... relative paths.
export const BACKEND_API_BASE_URL = BACKEND_URL;

export const AUTH_EXCHANGE_ENDPOINT = `${BACKEND_URL}/api/auth/exchange`;
