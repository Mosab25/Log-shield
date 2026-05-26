/**
 * Website Security Analyzer API client.
 */
import { apiRequest } from "./client";

export interface WebsiteAnalyzerTarget {
  input_url: string;
  final_url: string;
  hostname: string;
  scheme: string;
}

export interface WebsiteAnalyzerOverall {
  risk_score: number;
  risk_level: string;
  summary: string;
  risk_explanation?: string;
  top_priorities: string[];
}

export interface WebsiteAnalyzerFinding {
  id: string;
  title: string;
  severity: string;
  confidence?: "high" | "medium" | "low" | string;
  original_severity?: string | null;
  adjustment_reason?: string | null;
  analyst_note?: string | null;
  category: string;
  owasp_category: string;
  evidence: string;
  impact: string;
  recommendation: string;
  priority: number;
}

export interface RoadmapItem {
  priority: number;
  action: string;
  effort: string;
  impact: string;
  findings: string[];
}

export interface WebsiteAnalyzerSafetyModel {
  authorized_confirmed: boolean;
  non_invasive: boolean;
  exploits_used: boolean;
  forms_submitted: boolean;
  bruteforce_used: boolean;
  html_rendered?: boolean;
  javascript_executed?: boolean;
  links_followed?: boolean;
  raw_html_stored?: boolean;
  max_paths_checked: number;
  note: string;
}

export interface HeaderCheck {
  header: string;
  present: boolean;
  value: string;
  severity: string;
  owasp: string;
  impact: string;
  recommendation: string;
}

export interface CookieCheck {
  name: string;
  value: string;
  secure: boolean;
  httponly: boolean;
  samesite: string;
  is_session_cookie: boolean;
  has_domain_attr?: boolean;
  path?: string;
}

export interface ExposedPathCheck {
  path: string;
  status_code: number | null;
  content_type: string;
  content_length: string;
  response_size?: number;
  final_url?: string;
  accessible: boolean;
  classification?: "confirmed_exposed" | "protected" | "spa_fallback" | "generic_html" | "not_found" | "inconclusive";
  confirmed?: boolean;
  confirmed_exposed?: boolean;
  risk_impact?: string;
  reason?: string;
  evidence?: string;
  matched_evidence?: string[];
  response_body_snippet?: string;
  finding_created?: boolean;
}

export interface TechCheck {
  type: string;
  value: string;
  risk: string;
  recommendation: string;
}

export interface RobotsCheck {
  url?: string;
  status_code?: number | null;
  fetched?: boolean;
  error?: string | null;
  disallow_count?: number;
  sensitive_disallow_paths?: Array<{ path: string; keyword: string }>;
}

export interface SitemapCheck {
  url?: string;
  status_code?: number | null;
  fetched?: boolean;
  error?: string | null;
  url_count?: number;
  sensitive_url_count?: number;
  sensitive_url_samples?: Array<{ url: string; keyword: string }>;
  http_url_count?: number;
  http_url_samples?: string[];
}

export interface TlsVersionCheck {
  status: "supported" | "not_supported" | "inconclusive";
  reason: string;
}

export interface TlsVersionsCheck {
  checked?: boolean;
  hostname?: string;
  port?: number;
  tls_1_0?: TlsVersionCheck;
  tls_1_1?: TlsVersionCheck;
  recommendation?: string;
}

export interface CspIssue {
  id: string;
  severity: string;
  confidence?: "high" | "medium" | "low" | string;
  original_severity?: string | null;
  adjustment_reason?: string | null;
  analyst_note?: string | null;
  title: string;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface CspAnalysisCheck {
  present?: boolean;
  raw?: string;
  directives?: Record<string, string[]>;
  issues?: CspIssue[];
  risk_level?: string;
}

export interface CookiePrefixReviewCheck {
  sensitive_cookies?: Array<{
    name: string;
    prefix: string;
    secure: boolean;
    httponly: boolean;
    samesite: string;
    host_prefix_constraints_ok: boolean;
  }>;
  issues?: Array<{
    id: string;
    cookie_name: string;
    severity: string;
    title: string;
    evidence: string;
    impact: string;
    recommendation: string;
  }>;
}

export interface CorrelatedRiskScenario {
  id: string;
  title: string;
  severity: string;
  evidence: string[];
  why_it_matters: string;
  recommended_actions: string[];
  related_finding_ids: string[];
}

export interface HiddenDefacementIndicator {
  tag?: string;
  matched_hidden_patterns?: string[];
  matched_keywords?: string[];
  external_link_count?: number;
  snippet?: string;
}

export interface HiddenDefacementCheck {
  hidden_elements_checked: number;
  suspicious_hidden_elements: HiddenDefacementIndicator[];
  spam_keywords_found: string[];
  suspicious_links_found: Array<{ domain: string; anchor_context?: string }>;
  risk_level: "informational" | "low" | "medium" | "high" | "critical" | string;
  findings: WebsiteAnalyzerFinding[];
  summary_note?: string;
}

export interface WebsiteAnalyzerResponse {
  mode: string;
  target: WebsiteAnalyzerTarget;
  overall: WebsiteAnalyzerOverall;
  context?: {
    known_provider_domain: boolean;
    provider_family?: string | null;
    note?: string;
    adjusted_findings?: number;
  };
  context_tuning_summary?: {
    enabled: boolean;
    adjusted_findings_count: number;
    downgraded_findings_count: number;
    upgraded_findings_count: number;
    notes: string[];
  };
  severity_summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  owasp_summary?: Array<{
    category: string;
    count: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational?: number;
  }>;
  checks: {
    https: Record<string, unknown>;
    tls_versions?: TlsVersionsCheck;
    headers: HeaderCheck[];
    csp_analysis?: CspAnalysisCheck;
    cookies: CookieCheck[];
    cookie_prefix_review?: CookiePrefixReviewCheck;
    robots?: RobotsCheck;
    sitemap?: SitemapCheck;
    exposed_paths: ExposedPathCheck[];
    sensitive_path_checks?: ExposedPathCheck[];
    technology: TechCheck[];
    forms: Record<string, unknown>[];
    hidden_defacement?: HiddenDefacementCheck;
    correlated_risks?: CorrelatedRiskScenario[];
  };
  findings: WebsiteAnalyzerFinding[];
  roadmap?: RoadmapItem[];
  recommended_actions: string[];
  safety_model: WebsiteAnalyzerSafetyModel;
}

export async function scanWebsite(
  url: string,
  authorized: boolean,
): Promise<WebsiteAnalyzerResponse> {
  return apiRequest<WebsiteAnalyzerResponse>("/website-analyzer/scan", {
    method: "POST",
    body: { url, authorized },
    auth: false,
  });
}
