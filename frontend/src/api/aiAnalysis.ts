import { apiClient } from "./client";

export type AiMode = "ai_provider" | "local_fallback";
export type AiVerdict = "benign" | "suspicious" | "attack_detected" | "insufficient_data";
export type AiAttackType =
  | "credential_attack"
  | "web_attack"
  | "privilege_escalation"
  | "reconnaissance"
  | "malware_indicator"
  | "policy_violation"
  | "unknown";
export type AiSeverity = "informational" | "low" | "medium" | "high" | "critical";

export interface AiMitreMapping {
  technique_id: string;
  technique_name: string;
  tactic: string;
  reason: string;
}

export interface AiAnalysisResult {
  mode: AiMode;
  verdict: AiVerdict;
  attack_type: AiAttackType;
  severity: AiSeverity;
  confidence: number;
  risk_score: number;
  summary: string;
  risk_reasons: string[];
  mitre_mappings: AiMitreMapping[];
  extracted_iocs: {
    ips: string[];
    domains: string[];
    urls: string[];
    hashes: string[];
  };
  recommended_actions: string[];
  analyst_notes: string;
  report_draft: {
    executive_summary: string;
    technical_summary: string;
    timeline: string[];
    iocs: string[];
    mitre: string[];
    recommendations: string[];
    conclusion: string;
  };
  safety_model: {
    executed: boolean;
    rendered_as_html: boolean;
    note: string;
  };
}

export function analyzeLogs(payload: { raw_logs: string; context?: string }): Promise<AiAnalysisResult> {
  return apiClient.post<AiAnalysisResult>("/ai-analysis/logs", payload);
}

export function summarizeIncident(payload: {
  incident_id?: number;
  incident_title?: string;
  incident_text: string;
  incident_severity?: string;
  incident_status?: string;
}): Promise<AiAnalysisResult> {
  return apiClient.post<AiAnalysisResult>("/ai-analysis/incident-summary", payload);
}

export function generateReportDraft(payload: {
  title?: string;
  source_text: string;
  context?: string;
}): Promise<AiAnalysisResult> {
  return apiClient.post<AiAnalysisResult>("/ai-analysis/report-draft", payload);
}
