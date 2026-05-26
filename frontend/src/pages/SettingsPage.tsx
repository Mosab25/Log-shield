import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Save, Settings, ShieldCheck, UserCircle2 } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorState, SectionHeader } from "../components/UI";
import { ProfileAvatarUploader } from "../components/settings/ProfileAvatarUploader";
import { Chip } from "../components/ui/Chip";
import { PageHeader } from "../components/ui/PageHeader";
import {
  clearInMemoryPreferences,
  loadUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from "../utils/userPreferences";

function applyPreferencesToDocument(preferences: UserPreferences) {
  document.documentElement.classList.toggle("logshield-compact-mode", preferences.compactMode);
  document.documentElement.classList.toggle("logshield-reduce-motion", preferences.reduceMotion);
}

function notifyPreferencesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("logshield:preferences-updated"));
  }
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email] = useState(user?.email ?? "");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");

  const [preferences, setPreferences] = useState<UserPreferences>(() => loadUserPreferences(user));

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const roleName = user?.role?.name ?? "viewer";
  const isAdmin = roleName === "admin";
  const isProfileUpdateSupported = roleName === "admin";

  useEffect(() => {
    if (!user) {
      setFullName("");
      setPreferences(clearInMemoryPreferences());
      return;
    }
    setFullName(user.full_name ?? "");
    setPreferences(loadUserPreferences(user));
  }, [user?.id, user?.email, user?.full_name]);

  useEffect(() => {
    applyPreferencesToDocument(preferences);
    saveUserPreferences(user, preferences);
    notifyPreferencesUpdated();
  }, [preferences, user]);

  const profileSummary = useMemo(
    () => ({
      displayName: fullName || user?.full_name || "LogShield User",
      roleLabel: user?.role?.name ? user.role.name.toUpperCase() : "VIEWER",
      statusLabel: user?.is_active ? "Active" : "Inactive",
    }),
    [fullName, user],
  );

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user || savingProfile) return;
    setProfileError(null);
    setProfileMessage(null);

    if (!isProfileUpdateSupported) {
      setProfileError("Profile update endpoint is not configured yet.");
      return;
    }

    setSavingProfile(true);
    try {
      await apiClient.patch(`/users/${user.id}`, {
        full_name: fullName,
        email: user.email,
      });
      await refreshUser();
      setProfileMessage("Settings saved successfully.");
    } catch (error) {
      setProfileError(toUserErrorMessage(error, "Could not save settings. Please try again."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePreferences() {
    if (savingPrefs) return;
    setPrefsError(null);
    setPrefsMessage(null);
    setSavingPrefs(true);
    try {
      saveUserPreferences(user, preferences);
      notifyPreferencesUpdated();
      setPrefsMessage("Settings saved successfully.");
    } catch {
      setPrefsError("Could not save settings. Please try again.");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ACCOUNT PREFERENCES"
        title="Settings"
        description="Manage your profile, preferences, and account security."
      />

      <section className="soc-panel p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">{profileSummary.displayName}</p>
            <p className="text-sm text-slate-400">{user?.email ?? "No email available"}</p>
            <div className="mt-3 flex gap-2">
              <Chip tone="info">{profileSummary.roleLabel}</Chip>
              <Chip tone={user?.is_active ? "safe" : "warning"}>{profileSummary.statusLabel}</Chip>
            </div>
          </div>
          <div className="h-14 w-14 overflow-hidden rounded-2xl border border-cyan-400/20 bg-cyan-500/10 shrink-0">
            {preferences.avatarPreview ? (
              <img src={preferences.avatarPreview} alt="Profile avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-cyan-200">
                <UserCircle2 className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={saveProfile} className="soc-panel p-5 space-y-4">
          <SectionHeader title="Profile" description="Update your personal account details." icon={UserCircle2} />
          {profileMessage ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              {profileMessage}
            </div>
          ) : null}
          {profileError ? <ErrorState message={profileError} /> : null}

          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Full Name</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="soc-input mt-2 w-full" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Email Address</span>
            <input value={email} readOnly className="soc-input mt-2 w-full opacity-80 cursor-not-allowed" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Role</span>
            <input value={profileSummary.roleLabel} readOnly className="soc-input mt-2 w-full opacity-80 cursor-not-allowed" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Department / Team</span>
            <input value={department} onChange={e => setDepartment(e.target.value)} className="soc-input mt-2 w-full" placeholder="Optional" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Job Title</span>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="soc-input mt-2 w-full" placeholder="Optional" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Bio</span>
            <textarea value={bio} onChange={e => setBio(e.target.value)} className="soc-input mt-2 w-full min-h-24" placeholder="Short note about your role..." />
          </label>

          <button type="submit" disabled={savingProfile || !isProfileUpdateSupported} className="soc-button-primary">
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
          {!isProfileUpdateSupported ? (
            <p className="text-xs text-slate-500">
              Profile editing is limited for your role. Contact your administrator for account identity changes.
            </p>
          ) : null}
        </form>

        <ProfileAvatarUploader
          currentAvatarUrl={preferences.avatarPreview}
          displayName={profileSummary.displayName}
          loading={savingPrefs}
          onAvatarChange={value => setPreferences(prev => ({ ...prev, avatarPreview: value }))}
          onRemove={() => setPreferences(prev => ({ ...prev, avatarPreview: "" }))}
        />
      </div>

      <section className="soc-panel p-5 space-y-4">
        <SectionHeader title="Security" description="View available account protection controls." icon={ShieldCheck} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Two-factor authentication</p>
            <p className="mt-2 text-sm text-slate-300">Not configured yet</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Password change</p>
            <p className="mt-2 text-sm text-slate-300">Password change endpoint is not configured yet.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Last login</p>
            <p className="mt-2 text-sm text-slate-300">{user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : "No login timestamp available."}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active sessions</p>
            <p className="mt-2 text-sm text-slate-300">Not configured yet</p>
          </div>
        </div>
        {!isAdmin ? (
          <p className="text-xs text-slate-500">
            Administrative security controls are visible only to administrators.
          </p>
        ) : null}
      </section>

      <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-2" : "xl:grid-cols-1"}`}>
        <section className="soc-panel p-5 space-y-4">
          <SectionHeader title="Account Information" description="Read-only account metadata." icon={Eye} />
          <div className="grid gap-2 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">User ID: <span className="font-semibold text-white">{user?.id ?? "-"}</span></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">Email: <span className="font-semibold text-white">{user?.email ?? "-"}</span></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">Role: <span className="font-semibold text-white">{profileSummary.roleLabel}</span></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">Created: <span className="font-semibold text-white">{user?.created_at ? new Date(user.created_at).toLocaleString() : "-"}</span></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">Updated: <span className="font-semibold text-white">{user?.updated_at ? new Date(user.updated_at).toLocaleString() : "-"}</span></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">Environment: <span className="font-semibold text-white">{import.meta.env.DEV ? "Development" : "Production"}</span></div>
          </div>
        </section>

        {isAdmin ? (
          <section className="soc-panel p-5 space-y-4">
            <SectionHeader title="Danger Zone" description="High-impact actions require backend support." icon={Settings} />
            <button type="button" className="soc-button-ghost w-full justify-center" disabled>
              Delete account (Not configured yet)
            </button>
            <button type="button" className="soc-button-ghost w-full justify-center" disabled>
              Export my data (Not configured yet)
            </button>
          </section>
        ) : null}
      </div>

      <section className="soc-panel p-5 space-y-3">
        {prefsMessage ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {prefsMessage}
          </div>
        ) : null}
        {prefsError ? <ErrorState message={prefsError} /> : null}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="soc-button-primary" onClick={() => void savePreferences()} disabled={savingPrefs}>
            <Save className="h-4 w-4" />
            {savingPrefs ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>
    </div>
  );
}
