import { AlertTriangle, Ban, Clock, Network, RotateCcw, ShieldX } from "lucide-react";
import type { BlockedAccessDetails } from "../api/client";

function formatBlockedUntil(value: string | null, isPermanent: boolean): string {
  if (isPermanent || !value) return "Permanent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function BlockedAccessPage({
  details,
  retrying,
  error,
  onRetry,
}: {
  details: BlockedAccessDetails;
  retrying: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(239,68,68,0.18),transparent_28rem),radial-gradient(circle_at_80%_12%,rgba(34,211,238,0.16),transparent_30rem),linear-gradient(135deg,#020617,#07111f_45%,#020617)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.05)_1px,transparent_1px)] bg-[size:46px_46px] opacity-70" />

      <section className="soc-panel-strong relative w-full max-w-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-red-300/30 bg-red-400/10 text-red-200 shadow-[0_0_45px_rgba(248,113,113,0.18)]">
            <ShieldX className="h-9 w-9" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="soc-eyebrow text-red-200">
              <Ban className="h-4 w-4" />
              Security control active
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Access Blocked</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Your IP address has been blocked by LogShield security controls. You cannot login, register, or use protected workspace actions until access is restored.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Network className="h-4 w-4 text-cyan-200" />
              IP address
            </div>
            <p className="mt-2 break-all font-mono text-lg font-bold text-white">{details.ip_address}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Clock className="h-4 w-4 text-cyan-200" />
              Block duration
            </div>
            <p className="mt-2 text-lg font-bold text-white">{formatBlockedUntil(details.blocked_until, details.is_permanent)}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <AlertTriangle className="h-4 w-4 text-red-200" />
              Reason
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-200">{details.reason || "Blocked by administrator"}</p>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">{error}</div> : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
          <p className="max-w-xl text-sm leading-6 text-slate-400">If you believe this is a mistake, contact the system administrator.</p>
          <button type="button" onClick={onRetry} disabled={retrying} className="soc-button-primary">
            <RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Checking..." : "Retry access"}
          </button>
        </div>
      </section>
    </main>
  );
}
