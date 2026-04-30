import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiClient, tokenStorage } from "../api/client";

export type UserRole = "admin" | "analyst" | "viewer";

interface Role {
  id: number;
  name: UserRole;
  description: string | null;
  created_at: string;
}

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  role: Role;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      setUser(await apiClient.get<AuthUser>("/auth/me"));
    } catch {
      tokenStorage.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  async function login(email: string, password: string) {
    const response = await apiClient.post<LoginResponse>("/auth/login", { email, password }, false);
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }

  async function logout() {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await apiClient.post("/auth/logout", { refresh_token: refreshToken }, false);
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
    }
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    role: user?.role.name ?? null,
    isAuthenticated: Boolean(user && tokenStorage.getAccessToken()),
    isLoading,
    login,
    logout,
    refreshUser
  }), [user, isLoading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
