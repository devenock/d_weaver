/**
 * Base API URL. Paths are always /api/v1/... so the backend route is correct.
 * - When VITE_API_URL is unset: base is "" so requests are relative (e.g. /api/v1/auth/register) and the Vite proxy forwards to the backend.
 * - When VITE_API_URL is set (e.g. http://localhost:8200 or http://localhost:8200/api): base is the origin only so URL = origin + /api/v1/...
 */
export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env === undefined || env === "") return "";
  const s = env.replace(/\/+$/, "");
  const origin = s.endsWith("/api") ? s.slice(0, -4) : s;
  return origin;
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
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = base ? `${base.replace(/\/+$/, "")}${p}` : p;
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

/**
 * Authenticated API request. Same as apiRequest but adds Authorization: Bearer <accessToken>.
 * Use for all /workspaces and /diagrams (and other protected) endpoints.
 * For FormData body (e.g. image upload), Content-Type is not set so the browser sends multipart/form-data with boundary.
 */
export async function apiRequestWithAuth<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = base ? `${base.replace(/\/+$/, "")}${p}` : p;
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      const json = text ? JSON.parse(text) : {};
      body = {
        code: (json as ApiErrorBody).code ?? "unknown",
        message: (json as ApiErrorBody).message ?? "Request failed",
        details: (json as ApiErrorBody).details,
      };
    } catch {
      body = { code: "invalid_response", message: "Invalid JSON response" };
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204 || !text) {
    return undefined as T;
  }
  let json: SuccessEnvelope<T> | ApiErrorBody;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(res.status, {
      code: "invalid_response",
      message: "Invalid JSON response",
    });
  }
  const envelope = json as SuccessEnvelope<T>;
  return envelope.data as T;
}
