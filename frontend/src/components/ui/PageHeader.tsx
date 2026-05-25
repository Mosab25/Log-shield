import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`soc-page-header page-header ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? <div className="soc-eyebrow">{eyebrow}</div> : null}
        <h1 className="page-title mt-2 text-2xl font-black text-[var(--text-primary)]">{title}</h1>
        {description ? <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p> : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header-actions shrink-0">{actions}</div> : null}
    </header>
  );
}
