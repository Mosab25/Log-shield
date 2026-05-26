export type RiskLevel = "low" | "medium" | "high" | "critical";

// Keep this aligned with backend/app/services/risk_scoring_service.py
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 24) return "low";
  if (score <= 49) return "medium";
  if (score <= 74) return "high";
  return "critical";
}

export function isHighRiskScore(score: number): boolean {
  return score >= 50;
}

export function representativeScoreForLevel(level: RiskLevel): number {
  if (level === "critical") return 85;
  if (level === "high") return 62;
  if (level === "medium") return 37;
  return 15;
}
