import { FormEvent, useState } from "react";
import { CheckCircle2, Settings, UserCircle } from "lucide-react";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorState, SectionHeader } from "../components/UI";
import { Chip } from "../components/ui/Chip";
import { PageHeader } from "../components/ui/PageHeader";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      await apiClient.patch(`/users/${user.id}`, { full_name: fullName, email, password: password || undefined });
      await refreshUser();
      setPassword("");
      setMessage("Settings updated.");
    } catch (err: any) {
      setError(err?.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PLATFORM CONFIGURATION"
        title="Settings"
        description="Configure platform preferences, security options, and operational behavior."
      />

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">
          <CheckCircle2 className="h-5 w-5" />
          {message}
        </div>
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,42rem)_1fr]">
        <form onSubmit={save} className="soc-panel space-y-4 p-6">
          <SectionHeader title="Profile Info" description="Update your operator identity and optionally set a new password." icon={UserCircle} />
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="safe">Enabled</Chip>
            <Chip tone="warning">Required</Chip>
            <Chip tone="info">Info</Chip>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Full name</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="soc-input mt-2 w-full" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Email</span>
            <input value={email} onChange={e => setEmail(e.target.value)} className="soc-input mt-2 w-full" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">New password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="soc-input mt-2 w-full" />
          </label>
          <button disabled={saving} className="soc-button-primary">{saving ? "Saving..." : "Save Settings"}</button>
        </form>

        <section className="soc-panel p-6">
          <SectionHeader title="Console Preferences" icon={Settings} />
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-slate-400">App Name: <b className="text-white">LogShield</b> <span className="ml-2"><Chip tone="info">Info</Chip></span></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-slate-400">Theme: <b className="text-white">Dark SOC Theme</b> <span className="ml-2"><Chip tone="safe">Recommended</Chip></span></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-slate-400">Timezone: <b className="text-white">UTC</b> <span className="ml-2"><Chip tone="neutral">Enabled</Chip></span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
