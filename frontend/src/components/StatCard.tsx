import type { LucideIcon } from "lucide-react";

export function StatCard({ title, value, description, icon: Icon }: { title: string; value: string | number; description?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {description && <p className="mt-4 text-xs text-slate-500">{description}</p>}
    </div>
  );
}
