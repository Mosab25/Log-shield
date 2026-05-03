export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (() => {
  if (typeof window === "undefined") return "http://localhost:8000/api";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "http://localhost:8000/api";
  }
  return `${origin}/api`;
})();

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
const DEFAULT_CACHE_TTL = 30000; // 30 seconds

// Different TTLs for different endpoint types
const CACHE_TTL = {
  dashboard: 15000, // 15s - fast changing data
  alerts: 15000, // 15s - fast changing data
  logs: 30000, // 30s - medium changing data
  security_center: 60000, // 1min - slower changing data
  audit_logs: 30000, // 30s - medium changing data
  users: 60000, // 1min - slower changing data
  awareness_scores: 120000, // 2min - rarely changing
  default: 30000 // 30s default
} as const;

function getCacheKey(url: string, params?: Record<string, any>): string {
  const paramString = params ? JSON.stringify(params) : "";
  return `${url}:${paramString}`;
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

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
  const result = parseBody(response) as Promise<T>;

  if (method === "GET" && cacheEnabled && !body) {
    setCache(path, result);
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
