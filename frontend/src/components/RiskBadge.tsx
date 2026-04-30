function level(score: number) {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 85) return "High";
  return "Critical";
}
function cls(score: number) {
  if (score <= 30) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (score <= 60) return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  if (score <= 85) return "border-orange-400/30 bg-orange-400/10 text-orange-300";
  return "border-red-400/30 bg-red-400/10 text-red-300";
}

export function RiskBadge({ score }: { score: number }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cls(score)}`}>{score} / 100 · {level(score)}</span>;
}
