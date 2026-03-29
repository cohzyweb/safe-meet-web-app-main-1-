// ============================================================
// apps/web/src/lib/api/client.ts
// Base fetch wrapper + error normalization
// All API calls go through this — never call fetch() directly
// ============================================================

import type { ApiError } from "@safe-meet/shared";

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

/**
 * Switch between mock and real API via .env:
 *   NEXT_PUBLIC_API_URL=http://localhost:4000   ← real backend
 *   NEXT_PUBLIC_API_URL=                        ← mock mode (empty = mock)
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const isMockMode = BASE_URL === "";

// ------------------------------------------------------------
// Auth token management (localStorage)
// ------------------------------------------------------------

const TOKEN_KEY = "safemeet_jwt";

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Redirect to /connect when auth is fully expired and unrecoverable.
 * Called by the request pipeline after token refresh also fails.
 */
function redirectToConnect(): void {
  if (typeof window === "undefined") return;
  // Avoid redirect loops if already on /connect
  if (window.location.pathname.startsWith("/connect")) return;
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/connect?returnTo=${returnTo}`;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function hasAuthToken(): boolean {
  return getAuthToken() !== null;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAuthToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const token = getAuthToken();
    if (!token) return null;

    const url = new URL(`${BASE_URL}/api/auth/refresh`, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearAuthToken();
      return null;
    }

    const data = (await response.json()) as { token?: string };
    if (!data.token) {
      clearAuthToken();
      return null;
    }

    setAuthToken(data.token);
    return data.token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// ------------------------------------------------------------
// Custom error class
// ------------------------------------------------------------

export class ApiRequestError extends Error {
  statusCode: number;
  code: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.statusCode = error.statusCode;
    this.code = error.code;
  }
}

// ------------------------------------------------------------
// Request options
// ------------------------------------------------------------

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: QueryParams;
  body?: unknown;
  _retried?: boolean;
}

// ------------------------------------------------------------
// Core fetch wrapper
// ------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, headers, _retried, ...rest } = options;

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build request
  const token = getAuthToken();
  const init: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // Execute
  let response: Response;
  try {
    response = await fetch(url.toString(), init);
  } catch {
    throw new ApiRequestError({
      code: "NETWORK_ERROR",
      message: "Network request failed. Check your connection.",
      statusCode: 0,
    });
  }

  // Parse response
  let data: unknown;
  const contentType = response.headers.get("content-type") ?? "";

  try {
    data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    throw new ApiRequestError({
      code: "PARSE_ERROR",
      message: "Failed to parse server response.",
      statusCode: response.status,
    });
  }

  // Handle HTTP errors
  if (!response.ok) {
    const err = data as Partial<ApiError>;

    if (response.status === 401 && !_retried) {
      const newToken = await refreshAuthToken();
      if (newToken) {
        return request<T>(path, { ...options, _retried: true });
      }
      // Token refresh failed — session is dead, redirect to sign-in
      redirectToConnect();
    }

    throw new ApiRequestError({
      code: err.code ?? "UNKNOWN_ERROR",
      message: err.message ?? `Request failed with status ${response.status}`,
      statusCode: response.status,
    });
  }

  return data as T;
}

// ------------------------------------------------------------
// HTTP method helpers
// ------------------------------------------------------------

export const apiClient = {
  get: <T>(path: string, params?: QueryParams) => {
    const options: RequestOptions = { method: "GET" };
    if (params !== undefined) {
      options.params = params;
    }
    return request<T>(path, options);
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
