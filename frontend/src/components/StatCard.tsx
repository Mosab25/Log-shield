import type { LucideIcon } from "lucide-react";

export function StatCard({ title, value, description, icon: Icon }: { title: string; value: string | number; description?: string; icon: LucideIcon }) {
  return (
    <div className="soc-panel group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 sm:p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--module-accent)] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-cyber-muted">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-cyber-text">{value}</p>
        </div>
        <div className="module-empty-icon flex h-12 w-12 items-center justify-center rounded-2xl">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {description && <p className="mt-4 text-xs text-cyber-muted">{description}</p>}
    </div>
  );
}
