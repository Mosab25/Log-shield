import type { WebsiteAnalyzerFinding, WebsiteAnalyzerResponse } from "../../api/websiteAnalyzer";

export type RecommendationStatus = "open" | "in_progress" | "done" | "ignored";

export interface StoredWebsiteScan {
  id: string;
  user_id: number | null;
  target_url: string;
  hostname: string;
  scan_date: string;
  risk_score: number;
  risk_level: string;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  informational_count: number;
  summary: string;
  top_priorities: string[];
  full_result: WebsiteAnalyzerResponse;
  created_at: string;
}

export interface RecommendationItem {
  id: string;
  finding_id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  why_it_matters: string;
  how_to_fix: string;
  estimated_effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  related_finding: string;
  status: RecommendationStatus;
}

const HISTORY_KEY = "logshield.websiteAnalyzer.scanHistory";
const LEGACY_HISTORY_KEY = "logshield.website.history.v1";
const REC_STATUS_KEY = "logshield.website.recommendation.status.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failures
  }
}

function severityCounts(findings: WebsiteAnalyzerFinding[]) {
  return {
    critical: findings.filter((item) => item.severity === "critical").length,
    high: findings.filter((item) => item.severity === "high").length,
    medium: findings.filter((item) => item.severity === "medium").length,
    low: findings.filter((item) => item.severity === "low").length,
    informational: findings.filter((item) => item.severity === "informational").length,
  };
}

function findingCompareKey(finding: WebsiteAnalyzerFinding): string {
  const fallback = `${finding.title}|${finding.category}|${finding.owasp_category}`;
  return finding.id?.trim() ? finding.id.trim() : fallback;
}

function findingMap(scan: StoredWebsiteScan): Map<string, WebsiteAnalyzerFinding> {
  const map = new Map<string, WebsiteAnalyzerFinding>();
  for (const finding of scan.full_result.findings || []) {
    map.set(findingCompareKey(finding), finding);
  }
  return map;
}

function readHistoryWithMigration(): StoredWebsiteScan[] {
  const current = readJson<StoredWebsiteScan[]>(HISTORY_KEY, []);
  if (current.length) return current;
  const legacy = readJson<StoredWebsiteScan[]>(LEGACY_HISTORY_KEY, []);
  if (legacy.length) {
    writeJson(HISTORY_KEY, legacy);
  }
  return legacy;
}

function effortFromFinding(item: WebsiteAnalyzerFinding): "low" | "medium" | "high" {
  if (item.severity === "critical") return "high";
  if (item.severity === "high") return "medium";
  return "low";
}

function impactFromFinding(item: WebsiteAnalyzerFinding): "low" | "medium" | "high" {
  if (item.severity === "critical" || item.severity === "high") return "high";
  if (item.severity === "medium") return "medium";
  return "low";
}

function priorityFromFinding(item: WebsiteAnalyzerFinding): "critical" | "high" | "medium" | "low" {
  if (item.severity === "critical") return "critical";
  if (item.severity === "high") return "high";
  if (item.severity === "medium") return "medium";
  return "low";
}

export function saveWebsiteScanToHistory(result: WebsiteAnalyzerResponse, userId: number | null): StoredWebsiteScan {
  const all = readHistoryWithMigration();
  const counts = severityCounts(result.findings || []);
  const now = new Date().toISOString();
  const entry: StoredWebsiteScan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    target_url: result.target.input_url,
    hostname: result.target.hostname || "unknown",
    scan_date: now,
    risk_score: result.overall.risk_score,
    risk_level: result.overall.risk_level,
    findings_count: result.findings.length,
    critical_count: counts.critical,
    high_count: counts.high,
    medium_count: counts.medium,
    low_count: counts.low,
    informational_count: counts.informational,
    summary: result.overall.summary,
    top_priorities: result.overall.top_priorities ?? [],
    full_result: result,
    created_at: now,
  };
  all.unshift(entry);
  writeJson(HISTORY_KEY, all.slice(0, 100));
  return entry;
}

export function getWebsiteScanHistory(userId: number | null): StoredWebsiteScan[] {
  const all = readHistoryWithMigration();
  if (userId == null) return all;
  return all.filter((item) => item.user_id === userId);
}

export function getWebsiteScanById(userId: number | null, scanId: string): StoredWebsiteScan | null {
  const list = getWebsiteScanHistory(userId);
  return list.find((item) => item.id === scanId) ?? null;
}

export function deleteWebsiteScan(userId: number | null, scanId: string): void {
  const all = readHistoryWithMigration();
  const filtered = all.filter((item) => !(item.id === scanId && item.user_id === userId));
  writeJson(HISTORY_KEY, filtered);
}

export function latestWebsiteScan(userId: number | null): StoredWebsiteScan | null {
  const list = getWebsiteScanHistory(userId);
  return list[0] ?? null;
}

export function compareLatestTwoByHostname(userId: number | null, hostname: string) {
  const host = hostname.trim().toLowerCase();
  const byHost = getWebsiteScanHistory(userId).filter((item) => item.hostname.trim().toLowerCase() === host);
  if (byHost.length < 2) return null;
  const latest = byHost[0];
  const previous = byHost[1];

  const latestMap = findingMap(latest);
  const previousMap = findingMap(previous);
  const latestKeys = new Set(latestMap.keys());
  const previousKeys = new Set(previousMap.keys());

  const fixed = Array.from(previousMap.entries())
    .filter(([key]) => !latestKeys.has(key))
    .map(([, finding]) => finding);
  const stillOpen = Array.from(previousMap.entries())
    .filter(([key]) => latestKeys.has(key))
    .map(([, finding]) => finding);
  const added = Array.from(latestMap.entries())
    .filter(([key]) => !previousKeys.has(key))
    .map(([, finding]) => finding);

  return {
    latest,
    previous,
    risk_delta: latest.risk_score - previous.risk_score,
    critical_delta: latest.critical_count - previous.critical_count,
    high_delta: latest.high_count - previous.high_count,
    findings_delta: latest.findings_count - previous.findings_count,
    fixed,
    still_open: stillOpen,
    added,
  };
}

export function exportScanComparisonTxt(comparison: NonNullable<ReturnType<typeof compareLatestTwoByHostname>>): void {
  const lines: string[] = [
    "LOGSHIELD WEBSITE SECURITY COMPARISON",
    `Generated: ${new Date().toLocaleString()}`,
    `Hostname: ${comparison.latest.hostname}`,
    "",
    "Risk Score Comparison",
    `Previous: ${comparison.previous.risk_score}/100 (${comparison.previous.risk_level.toUpperCase()})`,
    `Current: ${comparison.latest.risk_score}/100 (${comparison.latest.risk_level.toUpperCase()})`,
    `Score Change: ${comparison.risk_delta > 0 ? `+${comparison.risk_delta}` : comparison.risk_delta}`,
    `Findings Change: ${comparison.findings_delta > 0 ? `+${comparison.findings_delta}` : comparison.findings_delta}`,
    `Critical Change: ${comparison.critical_delta > 0 ? `+${comparison.critical_delta}` : comparison.critical_delta}`,
    `High Change: ${comparison.high_delta > 0 ? `+${comparison.high_delta}` : comparison.high_delta}`,
    "",
    "Fixed Findings (Not observed in latest scan)",
    ...(comparison.fixed.length
      ? comparison.fixed.map((item) => `- ${item.title}: not observed in the latest scan.`)
      : ["- None"]),
    "",
    "Still Open Findings",
    ...(comparison.still_open.length ? comparison.still_open.map((item) => `- ${item.title}`) : ["- None"]),
    "",
    "New Findings",
    ...(comparison.added.length ? comparison.added.map((item) => `- ${item.title}`) : ["- None"]),
    "",
    "Comparison is based on findings observed by the safe Website Security Analyzer. A finding marked as fixed means it was not observed in the latest scan, not that the entire website is guaranteed secure.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `logshield-comparison-${comparison.latest.hostname}-${comparison.latest.scan_date.slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportScanComparisonJson(comparison: NonNullable<ReturnType<typeof compareLatestTwoByHostname>>): void {
  const payload = {
    previous: comparison.previous,
    latest: comparison.latest,
    deltas: {
      risk_score: comparison.risk_delta,
      findings_count: comparison.findings_delta,
      critical: comparison.critical_delta,
      high: comparison.high_delta,
    },
    fixed: comparison.fixed,
    still_open: comparison.still_open,
    new_findings: comparison.added,
    note: "A finding marked as fixed was not observed in the latest scan and does not guarantee full website security.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `logshield-comparison-${comparison.latest.hostname}-${comparison.latest.scan_date.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getRecommendationStatuses(userId: number | null): Record<string, RecommendationStatus> {
  const all = readJson<Record<string, RecommendationStatus>>(REC_STATUS_KEY, {});
  if (userId == null) return all;
  const prefix = `${userId}:`;
  const out: Record<string, RecommendationStatus> = {};
  Object.entries(all).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      out[key.slice(prefix.length)] = value;
    }
  });
  return out;
}

export function setRecommendationStatus(userId: number | null, recommendationId: string, status: RecommendationStatus): void {
  const all = readJson<Record<string, RecommendationStatus>>(REC_STATUS_KEY, {});
  const key = userId == null ? recommendationId : `${userId}:${recommendationId}`;
  all[key] = status;
  writeJson(REC_STATUS_KEY, all);
}

export function recommendationsFromScan(scan: StoredWebsiteScan | null, userId: number | null): RecommendationItem[] {
  if (!scan) return [];
  const statuses = getRecommendationStatuses(userId);
  return scan.full_result.findings.map((finding) => {
    const recommendationId = `${scan.id}:${finding.id}`;
    return {
      id: recommendationId,
      finding_id: finding.id,
      title: finding.title,
      priority: priorityFromFinding(finding),
      why_it_matters: finding.impact,
      how_to_fix: finding.recommendation,
      estimated_effort: effortFromFinding(finding),
      impact: impactFromFinding(finding),
      related_finding: finding.evidence,
      status: statuses[recommendationId] ?? "open",
    };
  });
}

export function exportScanJson(scan: StoredWebsiteScan): void {
  const blob = new Blob([JSON.stringify(scan.full_result, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `logshield-report-${scan.hostname}-${scan.scan_date.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportScanTxt(scan: StoredWebsiteScan): void {
  const lines: string[] = [
    "LOGSHIELD WEBSITE SECURITY REPORT",
    `Scan Date: ${new Date(scan.scan_date).toLocaleString()}`,
    `Target URL: ${scan.target_url}`,
    `Risk Score: ${scan.risk_score}/100 (${scan.risk_level.toUpperCase()})`,
    "",
    "Executive Summary",
    scan.summary,
    "",
    "Top Priorities",
    ...(scan.top_priorities.length ? scan.top_priorities.map((item, index) => `${index + 1}. ${item}`) : ["No urgent priorities detected."]),
    "",
    "Findings",
    ...scan.full_result.findings.map(
      (finding) =>
        `- [${finding.severity.toUpperCase()}] ${finding.title}\n  What happened: ${finding.evidence}\n  Why it matters: ${finding.impact}\n  How to fix: ${finding.recommendation}`,
    ),
    "",
    "Safety Model",
    scan.full_result.safety_model.note,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `logshield-report-${scan.hostname}-${scan.scan_date.slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyExecutiveSummary(scan: StoredWebsiteScan): Promise<void> {
  const { copyTextToClipboard } = await import("../../utils/clipboard");
  const text = `Website: ${scan.target_url}\nRisk: ${scan.risk_score}/100 (${scan.risk_level.toUpperCase()})\n\nSummary:\n${scan.summary}`;
  await copyTextToClipboard(text);
}
