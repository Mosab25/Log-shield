const classes: Record<string, string> = {
  info: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  low: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  high: "border-red-400/25 bg-red-400/10 text-red-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-400"
};

export function SeverityBadge({ severity }: { severity: string }) {
  const value = severity?.toLowerCase?.() || "info";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold capitalize shadow-sm ${classes[value] ?? classes.info}`}>{value}</span>;
}
