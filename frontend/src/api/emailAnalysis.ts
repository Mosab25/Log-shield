import { apiRequest } from "./client";

export interface EmailHeaderAnalysisResponse {
  summary: {
    from: string;
    reply_to: string;
    return_path: string;
    subject: string;
    date: string;
    message_id: string;
    received_hops: number;
  };
  authentication: {
    spf: "pass" | "review" | "not found";
    dkim: "pass" | "review" | "not found";
    dmarc: "pass" | "review" | "not found";
  };
  suspicious_signals: string[];
  next_steps: string[];
  verdict: "safe" | "suspicious" | "malicious";
  severity: "low" | "medium" | "high";
  risk_score: number;
  safety_model: {
    rendered_as_html: boolean;
    external_requests: boolean;
    note: string;
  };
}

export async function analyzeEmailHeaders(rawHeaders: string): Promise<EmailHeaderAnalysisResponse> {
  return apiRequest<EmailHeaderAnalysisResponse>("/email-analysis/headers", {
    method: "POST",
    body: { raw_headers: rawHeaders },
    auth: true,
  });
}

