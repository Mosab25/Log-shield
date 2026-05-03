function level(score: number) {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 85) return "High";
  return "Critical";
}

function cls(score: number) {
  if (score <= 30) return "border-cyber-green/25 bg-cyber-green/10 text-cyber-green";
  if (score <= 60) return "border-cyber-amber/25 bg-cyber-amber/10 text-cyber-amber";
  if (score <= 85) return "border-cyber-amber/25 bg-cyber-amber/10 text-cyber-amber";
  return "border-cyber-red/30 bg-cyber-red/10 text-cyber-red";
}

export function RiskBadge({ score }: { score: number }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold shadow-sm ${cls(score)}`}>{score} / 100 - {level(score)}</span>;
}
