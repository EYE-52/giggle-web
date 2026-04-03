import { BACKEND_API_BASE_URL } from "@/config/appConfig";

type ApiError = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token: string;
  body?: unknown;
};

export class BackendApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const backendRequest = async <T>(path: string, options: RequestOptions): Promise<T> => {
  const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !json.ok) {
    throw new BackendApiError(
      response.status,
      json.error?.message || "Request failed",
      json.error?.code
    );
  }

  if (!json.data) {
    throw new BackendApiError(response.status, "Response missing data");
  }

  return json.data;
};
