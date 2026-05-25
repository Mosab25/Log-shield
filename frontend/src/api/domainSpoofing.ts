import { apiRequest } from "./client";

export type DomainSpoofingRisk = "informational" | "low" | "medium" | "high" | "critical";

export interface DomainSpoofingTarget {
  domain: string;
  brand: string;
  tld: string;
}

export interface DomainSpoofingSummary {
  variants_generated: number;
  registered_or_resolving: number;
  mx_enabled: number;
  highest_risk: DomainSpoofingRisk;
  top_priorities: string[];
}

export interface DomainSpoofingVariant {
  domain: string;
  technique: string;
  dns_resolves: boolean;
  a_records: string[];
  aaaa_records: string[];
  cname_records: string[];
  mx_records: string[];
  txt_records: string[];
  ns_records: string[];
  has_mx: boolean;
  has_spf_like_txt: boolean;
  risk_level: DomainSpoofingRisk;
  reason: string;
  recommendation: string;
}

export interface DomainSpoofingFinding {
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

export interface DomainSpoofingSafetyModel {
  authorized_confirmed: boolean;
  passive_dns_only: boolean;
  phishing_content_generated: boolean;
  domains_registered: boolean;
  high_volume_scan: boolean;
  note: string;
}

export interface DomainSpoofingResponse {
  mode: string;
  target: DomainSpoofingTarget;
  summary: DomainSpoofingSummary;
  variants: DomainSpoofingVariant[];
  findings: DomainSpoofingFinding[];
  safety_model: DomainSpoofingSafetyModel;
}

export async function checkDomainSpoofing(
  domain: string,
  authorized: boolean,
  maxVariants: number,
): Promise<DomainSpoofingResponse> {
  return apiRequest<DomainSpoofingResponse>("/domain-spoofing/check", {
    method: "POST",
    body: { domain, authorized, max_variants: maxVariants },
    auth: false,
  });
}
