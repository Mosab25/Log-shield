import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiClient, tokenStorage, type Login2FARequiredResponse, type LoginSuccessResponse } from "../api/client";

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

export interface LoginResult {
  requires2FA: boolean;
  challengeId?: string;
  message?: string;
  deliveryTarget?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (challengeId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function requiresTwoFactor(response: LoginSuccessResponse | Login2FARequiredResponse): response is Login2FARequiredResponse {
  return "requires_2fa" in response && response.requires_2fa;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function completeSession(response: LoginSuccessResponse) {
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }

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
    const response = await apiClient.login({ email, password });
    if (requiresTwoFactor(response)) {
      return {
        requires2FA: true,
        challengeId: response.challenge_id,
        message: response.message,
        deliveryTarget: response.delivery_target ?? null,
      };
    }
    completeSession(response);
    return { requires2FA: false };
  }

  async function verify2FA(challengeId: string, code: string) {
    const response = await apiClient.verify2FA({ challenge_id: challengeId, code });
    completeSession(response);
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
    verify2FA,
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
