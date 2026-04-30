const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (() => {
  if (typeof window === "undefined") return "http://localhost:8000/api";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "http://localhost:8000/api";
  }
  return `${origin}/api`;
})();

const ACCESS_TOKEN_KEY = "logshield_access_token";
const REFRESH_TOKEN_KEY = "logshield_refresh_token";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  return response.text();
}

function messageFrom(body: unknown): string {
  if (typeof body === "string") return body;
  if (typeof body === "object" && body !== null && "detail" in body)
    return JSON.stringify((body as { detail: unknown }).detail).replace(
      /^"|"$/g,
      "",
    );
  return "API request failed.";
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    tokenStorage.clearTokens();
    return null;
  }
  const data = (await response.json()) as { access_token: string };
  tokenStorage.setTokens(data.access_token);
  return data.access_token;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    retry?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokenStorage.getAccessToken())
    headers.Authorization = `Bearer ${tokenStorage.getAccessToken()}`;
  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (newToken)
      return apiRequest<T>(path, { method, body, auth, retry: false });
  }
  if (!response.ok) {
    const parsed = await parseBody(response);
    throw new ApiError(messageFrom(parsed), response.status, parsed);
  }
  if (response.status === 204) return undefined as T;
  return parseBody(response) as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: "POST", body, auth }),
  register: <T>(body: unknown) =>
    apiRequest<T>("/auth/register", { method: "POST", body, auth: false }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
