import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`soc-empty ${className}`.trim()}>
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-accent)] bg-[var(--brand-soft)] text-[var(--brand)]">{icon}</div> : null}
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
