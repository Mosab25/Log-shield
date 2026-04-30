const classes: Record<string, string> = {
  open: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  investigating: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  false_positive: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  escalated: "border-red-400/30 bg-red-400/10 text-red-300",
  received: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  normalized: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-red-400/30 bg-red-400/10 text-red-300",
  parsed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  partial: "border-amber-400/30 bg-amber-400/10 text-amber-300"
};

export function StatusBadge({ status }: { status: string }) {
  const value = status || "unknown";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${classes[value] ?? classes.open}`}>{value.replace("_", " ")}</span>;
}
