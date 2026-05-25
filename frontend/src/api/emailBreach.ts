import { apiRequest } from "./client";

export type EmailBreachRiskLevel = "low" | "medium" | "high" | "critical";
export type EmailBreachStatus = "exposed" | "not_found" | "unknown" | "provider_error";

export interface EmailBreachDetail {
  name: string;
  domain: string;
  breach_date: string;
  data_classes: string[];
  description: string;
}

export interface EmailBreachResult {
  email: string;
  email_normalized?: string | null;
  exposed: boolean;
  status: EmailBreachStatus;
  breach_count: number;
  breaches: EmailBreachDetail[];
  risk_level: EmailBreachRiskLevel;
  recommendations: string[];
}

export interface EmailBreachFinding {
  id: string;
  title: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  category: string;
  owasp_category: string;
  evidence: string;
  impact: string;
  recommendation: string;
  priority: number;
}

export interface EmailBreachSummary {
  total_checked: number;
  exposed_count: number;
  not_found_count: number;
  unknown_count: number;
  highest_risk: EmailBreachRiskLevel;
  top_priorities: string[];
}

export interface EmailBreachSafetyModel {
  authorized_confirmed: boolean;
  passwords_collected: boolean;
  credentials_tested: boolean;
  emails_stored: boolean;
  uploaded_files_stored: boolean;
  external_provider_used: boolean;
  note: string;
}

export interface EmailBreachCheckResponse {
  mode: string;
  provider: string;
  provider_configured: boolean;
  summary: EmailBreachSummary;
  results: EmailBreachResult[];
  findings: EmailBreachFinding[];
  safety_model: EmailBreachSafetyModel;
}

export async function checkEmailBreaches(
  emails: string[],
  authorized: boolean,
): Promise<EmailBreachCheckResponse> {
  return apiRequest<EmailBreachCheckResponse>("/email-breach/check", {
    method: "POST",
    body: { emails, authorized },
    auth: false,
  });
}
