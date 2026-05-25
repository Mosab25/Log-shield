import { Filter, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export function FilterRow({
  children,
  actions,
  className = "",
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  if (isMobile) {
    return (
      <>
        <div className={`soc-panel flex items-center justify-between gap-2 p-3 ${className}`.trim()}>
          <button type="button" className="filter-toggle-btn row-action primary" onClick={() => setOpen(true)}>
            <Filter className="h-4 w-4" />
            Filters
          </button>
          {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
        </div>
        {open ? (
          <div className="fixed inset-0 z-[200]">
            <button type="button" className="absolute inset-0 bg-black/55" aria-label="Close filters" onClick={() => setOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-2xl border-t border-[var(--border-accent)] bg-[var(--bg-elevated)] p-4 shadow-2xl shadow-black/50">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Filters</p>
                <button type="button" className="row-action" onClick={() => setOpen(false)} aria-label="Close filters">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">{children}</div>
              {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className={`soc-panel filter-row-desktop flex flex-wrap items-center gap-3 p-4 ${className}`.trim()}>
      <div className="flex flex-1 flex-wrap items-center gap-3">{children}</div>
      {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
