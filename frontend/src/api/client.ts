const LOCAL_API_ORIGIN = "http://127.0.0.1:8000";
const PRODUCTION_API_ORIGIN = "https://log-shield-hjpg.onrender.com";
const NETWORK_UNAVAILABLE_MESSAGE = "Service unavailable. Please check backend connection.";

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function defaultApiOrigin(): string {
  if (typeof window === "undefined") return LOCAL_API_ORIGIN;
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return LOCAL_API_ORIGIN;
  }
  return PRODUCTION_API_ORIGIN;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || defaultApiOrigin());

const ACCESS_TOKEN_KEY = "logshield_access_token";
const REFRESH_TOKEN_KEY = "logshield_refresh_token";
const AUTH_USER_KEY = "logshield_auth_user";
const LEGACY_ACCESS_TOKEN_KEYS = ["access_token", "token", "authToken", "logshield_token"];
const LEGACY_REFRESH_TOKEN_KEYS = ["refresh_token", "logshield_refresh"];

// Simple cache for GET requests
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

// Different TTLs for different endpoint types
const CACHE_TTL = {
  dashboard: 30 * 1000,
  alerts: 5 * 60 * 1000,
  logs: 5 * 60 * 1000,
  incidents: 5 * 60 * 1000,
  security_center: 10 * 60 * 1000,
  audit_logs: 5 * 60 * 1000,
  users: 10 * 60 * 1000,
  awareness_scores: 10 * 60 * 1000,
  default: DEFAULT_CACHE_TTL,
} as const;

function getCacheTtl(path: string): number {
  if (path.includes("/dashboard")) return CACHE_TTL.dashboard;
  if (path.includes("/alerts")) return CACHE_TTL.alerts;
  if (path.includes("/logs")) return CACHE_TTL.logs;
  if (path.includes("/incidents")) return CACHE_TTL.incidents;
  if (path.includes("/security-center")) return CACHE_TTL.security_center;
  if (path.includes("/audit")) return CACHE_TTL.audit_logs;
  if (path.includes("/users")) return CACHE_TTL.users;
  if (path.includes("/awareness") || path.includes("/scores")) return CACHE_TTL.awareness_scores;
  return CACHE_TTL.default;
}

function getCacheKey(url: string, params?: Record<string, any>): string {
  const paramString = params ? JSON.stringify(params) : "";
  return `GET:${url}:${paramString}`;
}

function getFromCache<T>(url: string, params?: Record<string, any>): T | null {
  const key = getCacheKey(url, params);
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(url: string, data: T, ttl: number = DEFAULT_CACHE_TTL, params?: Record<string, any>): void {
  const key = getCacheKey(url, params);
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

function invalidateCache(pattern: string): void {
  for (const [key] of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  role: {
    id: number;
    name: "admin" | "analyst" | "viewer";
    description: string | null;
    created_at: string;
  };
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginSuccessResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface Login2FARequiredResponse {
  requires_2fa: true;
  message: string;
  challenge_id: string;
  delivery_target?: string | null;
}

export interface Verify2FARequest {
  challenge_id: string;
  code: string;
}

export interface BlockedAccessDetails {
  detail: string;
  code?: "IP_BLOCKED";
  ip_address: string;
  reason: string | null;
  blocked_until: string | null;
  is_permanent: boolean;
}

export interface SelfBlockCheckResponse {
  blocked: boolean;
  ip_address: string;
  reason: string | null;
  blocked_until: string | null;
  is_permanent: boolean;
}

type BlockedAccessListener = (details: BlockedAccessDetails | null) => void;
let blockedAccessDetails: BlockedAccessDetails | null = null;
const blockedAccessListeners = new Set<BlockedAccessListener>();

export const blockedAccessStore = {
  getSnapshot(): BlockedAccessDetails | null {
    return blockedAccessDetails;
  },
  set(details: BlockedAccessDetails): void {
    blockedAccessDetails = details;
    blockedAccessListeners.forEach(listener => listener(blockedAccessDetails));
  },
  clear(): void {
    blockedAccessDetails = null;
    blockedAccessListeners.forEach(listener => listener(null));
  },
  subscribe(listener: BlockedAccessListener): () => void {
    blockedAccessListeners.add(listener);
    return () => blockedAccessListeners.delete(listener);
  },
};

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

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|fetch failed/i.test(error.message);
}

export function toUserErrorMessage(error: unknown, fallback = "Unable to complete action. Please try again."): string {
  if (isNetworkFailure(error)) return NETWORK_UNAVAILABLE_MESSAGE;
  if (error instanceof ApiError) {
    if (error.status === 0) return NETWORK_UNAVAILABLE_MESSAGE;
    if (typeof error.message === "string" && error.message.trim()) return error.message;
  }
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) return token;
    for (const key of LEGACY_ACCESS_TOKEN_KEYS) {
      const legacyToken = localStorage.getItem(key);
      if (legacyToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, legacyToken);
        return legacyToken;
      }
    }
    return null;
  },
  getRefreshToken(): string | null {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token) return token;
    for (const key of LEGACY_REFRESH_TOKEN_KEYS) {
      const legacyToken = localStorage.getItem(key);
      if (legacyToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, legacyToken);
        return legacyToken;
      }
    }
    return null;
  },
  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  getUser<T>(): T | null {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as T;
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },
  setUser(user: unknown): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    for (const key of [...LEGACY_ACCESS_TOKEN_KEYS, ...LEGACY_REFRESH_TOKEN_KEYS]) {
      localStorage.removeItem(key);
    }
  },
};

export function getAuthHeaders(): Record<string, string> {
  const token = tokenStorage.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map(item => {
          if (typeof item !== "object" || item === null) return String(item);
          const record = item as { loc?: unknown; msg?: unknown };
          const field = Array.isArray(record.loc) ? record.loc.filter(part => part !== "body").join(".") : "";
          const message = typeof record.msg === "string" ? record.msg : "Invalid value.";
          return field ? `${field}: ${message}` : message;
        })
        .join(" ");
    }
    return JSON.stringify(detail).replace(/^"|"$/g, "");
  }
  return "API request failed.";
}

function isBlockedAccessResponse(body: unknown): body is BlockedAccessDetails {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { code?: unknown }).code === "IP_BLOCKED" &&
    typeof (body as { ip_address?: unknown }).ip_address === "string"
  );
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  let response: Response;
  try {
    response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return null;
  }
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
    cache?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, auth = true, retry = true, cache: cacheEnabled = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) Object.assign(headers, getAuthHeaders());

  const startTime = Date.now();
  const isDev = import.meta.env.DEV;

  // Check cache for GET requests
  if (method === "GET" && cacheEnabled && !body) {
    const cacheKey = getCacheKey(path);
    const entry = cache.get(cacheKey);
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(cacheKey);
      } else {
        if (isDev) {
          console.log(`[API] GET ${path} — cache hit — ${Date.now() - entry.timestamp}ms old`);
        }
        return entry.data as T;
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(toUserErrorMessage(error, NETWORK_UNAVAILABLE_MESSAGE), 0, { cause: error });
  }

  if (response.status === 401 && auth && retry) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      const retryHeaders: Record<string, string> = { ...headers, Authorization: `Bearer ${refreshedToken}` };
      let retryResponse: Response;
      try {
        retryResponse = await fetch(buildUrl(path), {
          method,
          headers: retryHeaders,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (error) {
        throw new ApiError(toUserErrorMessage(error, NETWORK_UNAVAILABLE_MESSAGE), 0, { cause: error });
      }

      if (!retryResponse.ok) {
        const retryParsed = await parseBody(retryResponse);
        if ((retryResponse.status === 403 || retryResponse.status === 429) && isBlockedAccessResponse(retryParsed)) {
          blockedAccessStore.set({
            detail: retryParsed.detail || "Your IP address is blocked.",
            code: "IP_BLOCKED",
            ip_address: retryParsed.ip_address,
            reason: retryParsed.reason ?? "Blocked by administrator",
            blocked_until: retryParsed.blocked_until ?? null,
            is_permanent: Boolean(retryParsed.is_permanent),
          });
        }
        throw new ApiError(messageFrom(retryParsed), retryResponse.status, retryParsed);
      }

      if (retryResponse.status === 204) return undefined as T;
      const retryResult = (await parseBody(retryResponse)) as T;
      if (method === "GET" && cacheEnabled && !body) {
        setCache(path, retryResult, getCacheTtl(path));
      }
      return retryResult;
    }
  }

  const duration = Date.now() - startTime;

  if (isDev) {
    console.log(`[API] ${method} ${path} — ${duration}ms — ${response.ok ? 'success' : 'error'} — ${response.status}`);

    if (method === "GET") {
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeKB = Math.round(parseInt(contentLength) / 1024);
        console.log(`[API] GET ${path} — payload: ${sizeKB}KB — ${response.ok ? 'cache miss' : 'cache set'}`);
      }
    }
  }

  if (!response.ok) {
    const parsed = await parseBody(response);
    if ((response.status === 403 || response.status === 429) && isBlockedAccessResponse(parsed)) {
      blockedAccessStore.set({
        detail: parsed.detail || "Your IP address is blocked.",
        code: "IP_BLOCKED",
        ip_address: parsed.ip_address,
        reason: parsed.reason ?? "Blocked by administrator",
        blocked_until: parsed.blocked_until ?? null,
        is_permanent: Boolean(parsed.is_permanent),
      });
    }
    throw new ApiError(messageFrom(parsed), response.status, parsed);
  }

  if (response.status === 204) return undefined as T;
  const result = (await parseBody(response)) as T;

  if (method === "GET" && cacheEnabled && !body) {
    setCache(path, result, getCacheTtl(path));
  }

  return result;
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  getPublic: <T>(path: string) => apiRequest<T>(path, { auth: false }),
  getUncached: <T>(path: string) => apiRequest<T>(path, { cache: false }),
  login: (body: { email: string; password: string }) =>
    apiRequest<LoginSuccessResponse | Login2FARequiredResponse>("/auth/login", { method: "POST", body, auth: false }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: "POST", body, auth }),
  register: <T>(body: unknown) =>
    apiRequest<T>("/auth/register", { method: "POST", body, auth: false }),
  verify2FA: (body: Verify2FARequest) =>
    apiRequest<LoginSuccessResponse>("/auth/verify-2fa", { method: "POST", body, auth: false }),
  checkSelfBlock: () =>
    apiRequest<SelfBlockCheckResponse>("/blocks/check-self", { auth: false }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),
  invalidateCache: (pattern: string) => {
    invalidateCache(pattern);
  },
};
