const normalizeBaseUrl = (value: string | undefined, fallback: string): string => {
  const raw = (value || fallback).trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

export const BACKEND_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL,
  "http://localhost:3001"
);

// Source of truth for API calls. Use the host directly to allow full relative paths.
export const BACKEND_API_BASE_URL = BACKEND_URL;

export const AUTH_EXCHANGE_ENDPOINT = `${BACKEND_URL}/api/auth/exchange`;
