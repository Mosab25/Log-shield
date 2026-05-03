import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <section className="soc-page-header">
      <div className="min-w-0">
        <div className="soc-eyebrow">
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {eyebrow}
        </div>
        <h1 className="mt-3 truncate text-3xl font-black tracking-tight text-cyber-text sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-cyber-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 text-cyan-300" /> : null}
          <h2 className="text-lg font-bold text-cyber-text">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm text-cyber-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="soc-empty">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyber-surface text-cyan-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-cyber-text">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cyber-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-[0_0_35px_rgba(245,158,11,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="soc-button-ghost px-3 py-1.5 text-xs">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`soc-skeleton ${className}`} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="soc-panel overflow-hidden">
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-[1.4fr_.7fr_.7fr_.5fr]">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
