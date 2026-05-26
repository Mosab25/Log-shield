import { scoreToRiskLevel } from "../utils/riskModel";

function level(score: number) {
  const mapped = scoreToRiskLevel(score);
  if (mapped === "critical") return "Critical";
  if (mapped === "high") return "High";
  if (mapped === "medium") return "Medium";
  return "Low";
}

function cls(score: number) {
  const mapped = scoreToRiskLevel(score);
  if (mapped === "low") return "border-cyber-green/25 bg-cyber-green/10 text-cyber-green";
  if (mapped === "medium") return "border-cyber-amber/25 bg-cyber-amber/10 text-cyber-amber";
  if (mapped === "high") return "border-cyber-amber/25 bg-cyber-amber/10 text-cyber-amber";
  return "border-cyber-red/30 bg-cyber-red/10 text-cyber-red";
}

export function RiskBadge({ score }: { score: number }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold shadow-sm ${cls(score)}`}>{score} / 100 - {level(score)}</span>;
}
