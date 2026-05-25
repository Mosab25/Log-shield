import type { ReactNode } from "react";

type ChipTone = "critical" | "warning" | "safe" | "info" | "neutral" | "violet";

const toneClass: Record<ChipTone, string> = {
  critical: "chip-critical",
  warning: "chip-warning",
  safe: "chip-safe",
  info: "chip-info",
  neutral: "chip-neutral",
  violet: "chip-violet",
};

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return <span className={`chip ${toneClass[tone]} ${className}`.trim()}>{children}</span>;
}
