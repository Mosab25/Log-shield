import type { LucideIcon } from "lucide-react";

export function StatCard({ title, value, description, icon: Icon }: { title: string; value: string | number; description?: string; icon: LucideIcon }) {
  return (
    <div className="soc-panel group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/20 hover:shadow-cyan-950/20 sm:p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {description && <p className="mt-4 text-xs text-slate-500">{description}</p>}
    </div>
  );
}
