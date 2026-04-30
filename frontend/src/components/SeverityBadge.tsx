const classes: Record<string, string> = {
  info: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  critical: "border-red-400/30 bg-red-400/10 text-red-300"
};

export function SeverityBadge({ severity }: { severity: string }) {
  const value = severity?.toLowerCase?.() || "info";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${classes[value] ?? classes.info}`}>{value}</span>;
}
