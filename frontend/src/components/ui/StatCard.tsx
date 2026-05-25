import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`themed-card stat-card rounded-xl border p-4 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{label}</span>
        {icon ? <span className="text-[var(--brand)]">{icon}</span> : null}
      </div>
      <p className="card-value mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </article>
  );
}
