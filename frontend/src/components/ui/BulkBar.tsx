import type { ReactNode } from "react";

export function BulkBar({
  active,
  selectedCount,
  title = "Selected",
  actions,
  className = "",
}: {
  active: boolean;
  selectedCount: number;
  title?: string;
  actions?: ReactNode;
  className?: string;
}) {
  if (!active) return null;

  return (
    <div className={`bulk-bar ${className}`.trim()}>
      <span className="text-sm font-semibold text-[var(--text-primary)]">
        {title}: {selectedCount}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}
