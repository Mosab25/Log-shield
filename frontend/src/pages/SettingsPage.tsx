import { FormEvent, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function save(e: FormEvent) { e.preventDefault(); if (!user) return; await apiClient.patch(`/users/${user.id}`, { full_name: fullName, email, password: password || undefined }); await refreshUser(); setPassword(""); setMessage("Settings updated."); }
  return (
    <div className="space-y-6">
      <section><p className="text-sm uppercase tracking-[.3em] text-cyan-300">Admin</p><h1 className="mt-3 text-3xl font-bold">Settings</h1></section>
      {message && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">{message}</div>}
      <form onSubmit={save} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 max-w-2xl"><h2 className="text-xl font-semibold">Profile Info</h2><input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-2xl bg-slate-950 px-4 py-2" /><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-2xl bg-slate-950 px-4 py-2" /><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" className="w-full rounded-2xl bg-slate-950 px-4 py-2" /><button className="rounded-2xl bg-cyan-400 px-5 py-2 font-bold text-slate-950">Save</button></form>
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold">Basic App Settings</h2><p className="mt-2 text-slate-400">App Name: LogShield · Theme: Dark SOC Theme · Timezone: UTC</p></section>
    </div>
  );
}
