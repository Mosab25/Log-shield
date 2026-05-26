import type { AuthUser } from "../auth/AuthContext";

export type NotificationPreferences = {
  criticalAlerts: boolean;
  highRiskAlerts: boolean;
  incidentUpdates: boolean;
  reportUpdates: boolean;
  recommendations: boolean;
  systemUpdates: boolean;
};

export type UserPreferences = {
  compactMode: boolean;
  reduceMotion: boolean;
  notifications: NotificationPreferences;
  avatarPreview: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  criticalAlerts: true,
  highRiskAlerts: true,
  incidentUpdates: true,
  reportUpdates: false,
  recommendations: true,
  systemUpdates: false,
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  compactMode: false,
  reduceMotion: false,
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  avatarPreview: "",
};

const LEGACY_GLOBAL_KEY = "logshield.user.preferences";

export function getUserPreferenceKey(user: Pick<AuthUser, "id" | "email"> | null): string | null {
  if (!user) return null;
  if (typeof user.id === "number") return `logshield.user.preferences.${user.id}`;
  if (typeof user.email === "string" && user.email.trim()) {
    return `logshield.user.preferences.${user.email.trim().toLowerCase()}`;
  }
  return null;
}

export function loadUserPreferences(user: Pick<AuthUser, "id" | "email"> | null): UserPreferences {
  const scopedKey = getUserPreferenceKey(user);
  if (!scopedKey) return { ...DEFAULT_USER_PREFERENCES };

  try {
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      compactMode: Boolean(parsed.compactMode),
      reduceMotion: Boolean(parsed.reduceMotion),
      notifications: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(parsed.notifications ?? {}),
      },
      avatarPreview: typeof parsed.avatarPreview === "string" ? parsed.avatarPreview : "",
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(user: Pick<AuthUser, "id" | "email"> | null, preferences: UserPreferences): void {
  const scopedKey = getUserPreferenceKey(user);
  if (!scopedKey) return;
  localStorage.setItem(scopedKey, JSON.stringify(preferences));
}

export function clearInMemoryPreferences(): UserPreferences {
  return { ...DEFAULT_USER_PREFERENCES };
}

export function hasLegacyGlobalPreferences(): boolean {
  try {
    return Boolean(localStorage.getItem(LEGACY_GLOBAL_KEY));
  } catch {
    return false;
  }
}
