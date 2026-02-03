/**
 * Base API URL. In dev, Vite proxy forwards /api to the Go backend.
 * VITE_API_URL can override (e.g. empty string to use relative /api).
 */
export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env !== undefined && env !== "") return env;
  return "/api";
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface SuccessEnvelope<T> {
  data: T;
}

/**
 * Request the API and parse JSON. Throws ApiError on non-2xx.
 * Expects success responses as { data: T }.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const text = await res.text();
  let json: SuccessEnvelope<T> | ApiErrorBody;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, {
      code: "invalid_response",
      message: "Invalid JSON response",
    });
  }

  if (!res.ok) {
    const body = json as ApiErrorBody;
    throw new ApiError(res.status, {
      code: body.code ?? "unknown",
      message: body.message ?? "Request failed",
      details: body.details,
    });
  }

  const envelope = json as SuccessEnvelope<T>;
  return envelope.data as T;
}
