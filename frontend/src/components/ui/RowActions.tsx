import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

type RowActionVariant = "default" | "danger" | "primary" | "success";

export interface RowActionItem {
  key: string;
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: RowActionVariant;
  title?: string;
}

const variantClass: Record<RowActionVariant, string> = {
  default: "",
  danger: "danger",
  primary: "primary",
  success: "success",
};

export function RowActions({
  items,
  className = "",
}: {
  items: RowActionItem[];
  className?: string;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const primaryItems = isMobile ? items.slice(0, 1) : items;
  const overflowItems = isMobile ? items.slice(1) : [];

  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {primaryItems.map(item => {
        const missingHandler = typeof item.onClick !== "function";
        const disabled = Boolean(item.disabled || missingHandler);
        const title = item.title ?? (missingHandler ? "Action unavailable" : undefined);
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            disabled={disabled}
            title={title}
            className={`row-action ${variantClass[item.variant ?? "default"]}`.trim()}
          >
            {item.label}
          </button>
        );
      })}
      {overflowItems.length > 0 ? (
        <>
          <button type="button" className="row-action" aria-label="More actions" onClick={() => setOpen(value => !value)}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {open ? (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[9rem] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-xl shadow-black/40">
              {overflowItems.map(item => {
                const missingHandler = typeof item.onClick !== "function";
                const disabled = Boolean(item.disabled || missingHandler);
                const title = item.title ?? (missingHandler ? "Action unavailable" : undefined);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (disabled) return;
                      item.onClick?.();
                      setOpen(false);
                    }}
                    disabled={disabled}
                    title={title}
                    className={`row-action mb-1 w-full justify-start last:mb-0 ${variantClass[item.variant ?? "default"]}`.trim()}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
