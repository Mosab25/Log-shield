import { useState } from "react";
import { Activity, History, Server, ShieldAlert, Download, FileText } from "lucide-react";
import { API_BASE_URL, getAuthHeaders } from "../api/client";
import { RiskBadge } from "./RiskBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, SectionHeader } from "./UI";
import { useAuth } from "../auth/AuthContext";

const ATTACK_TYPE_COLORS: Record<string, string> = {
  brute_force: "bg-cyber-red/20 text-cyber-red border-cyber-red/30",
  unauthorized_access: "bg-cyber-amber/20 text-cyber-amber border-cyber-amber/30",
  web_attack: "bg-cyber-violet/20 text-cyber-violet border-cyber-violet/30",
  privilege_escalation: "bg-cyber-amber/20 text-cyber-amber border-cyber-amber/30",
  reconnaissance: "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30",
  anomaly: "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30",
};

const ATTACK_TYPE_LABELS: Record<string, string> = {
  brute_force: "Brute Force Attack",
  unauthorized_access: "Unauthorized Access",
  web_attack: "Web Application Attack",
  privilege_escalation: "Privilege Escalation",
  reconnaissance: "Reconnaissance / Scanning",
  anomaly: "Anomalous Behavior",
};

const ATTACK_TYPE_DESCRIPTIONS: Record<string, string> = {
  brute_force: "Multiple failed authentication attempts detected from a single source, suggesting a brute force password attack.",
  unauthorized_access: "Access to resources or accounts from unusual sources or locations, indicating potential unauthorized entry.",
  web_attack: "Malicious web requests detected, including injection attempts, path traversal, or other web-based attack vectors.",
  privilege_escalation: "A user account's permissions were elevated beyond their authorized level, potentially indicating insider threat or compromise.",
  reconnaissance: "Systematic probing of the network or application to discover vulnerabilities, open ports, or sensitive paths.",
  anomaly: "Unusual patterns detected that deviate from normal system behavior, warranting further investigation.",
};

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 p-4">
      <p className="text-xs font-bold uppercase text-cyber-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-cyber-text">{value}</p>
    </div>
  );
}

export function AlertDetailsPanel({ alert, risk }: { alert: any; risk: any | null }) {
  const { role } = useAuth();
  const canGenerateReport = role === "admin" || role === "analyst";
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  const attackType = alert.attack_type;
  const attackColor = attackType ? (ATTACK_TYPE_COLORS[attackType] ?? "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25") : "";
  const attackLabel = attackType ? (ATTACK_TYPE_LABELS[attackType] ?? attackType.replace(/_/g, " ")) : null;
  const attackDesc = attackType ? (ATTACK_TYPE_DESCRIPTIONS[attackType] ?? null) : null;
  const relatedLogs = Array.isArray(alert.related_logs) ? alert.related_logs : [];
  const statusHistory = Array.isArray(alert.status_history) ? alert.status_history : [];

  async function generatePdfReport() {
    if (!alert.id) return;
    
    setGeneratingPdf(true);
    setPdfError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alert.id}/report/pdf`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to generate reports');
        }
        throw new Error('Failed to generate report');
      }
      
      // Get filename from Content-Disposition header or use fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `logshield-alert-${alert.id}-incident-report.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || blob.type;
      if (!contentType.includes("application/pdf")) {
        const errorText = await blob.text();
        throw new Error(errorText || "The server did not return a valid PDF file.");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      setPdfError(err.message || 'Unable to generate report. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="soc-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge severity={alert.severity} />
          <RiskBadge score={alert.risk_score} />
          <StatusBadge status={alert.status} />
          {alert.contained ? (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">Contained</span>
          ) : null}
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-cyber-text">{alert.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-cyber-muted">{alert.description ?? "No description."}</p>
        {attackLabel && (
          <div className={`mt-5 rounded-2xl border p-4 ${attackColor}`}>
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /><span className="font-black">{attackLabel}</span></div>
            {attackDesc && <p className="mt-2 text-sm opacity-85">{attackDesc}</p>}
            {alert.mitre_tactic && <p className="mt-2 text-xs opacity-70">MITRE ATT&CK: {alert.mitre_tactic}{alert.mitre_technique ? ` -> ${alert.mitre_technique}` : ""}</p>}
          </div>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailTile label="Source IP" value={alert.source_ip ?? "N/A"} />
          <DetailTile label="Username" value={alert.username ?? "N/A"} />
          <DetailTile label="MITRE" value={alert.mitre_technique ?? "N/A"} />
          <DetailTile label="Assigned" value={alert.assigned_analyst?.full_name ?? "Unassigned"} />
        </div>
        
        {/* PDF Generation Button */}
        {canGenerateReport && (
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={generatePdfReport}
              disabled={generatingPdf}
              className="soc-button-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              {generatingPdf ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyber-cyan border-t-transparent" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate Incident Report PDF
                </>
              )}
            </button>
            {pdfError && (
              <div className="rounded-lg border border-cyber-red/30 bg-cyber-red/10 px-3 py-2">
                <p className="text-sm text-cyber-red">{pdfError}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {risk ? (
        <section className="soc-panel p-5">
          <SectionHeader title="Risk Analysis" icon={Activity} />
          <p className="text-sm leading-6 text-cyber-muted">{risk.explanation}</p>
        </section>
      ) : null}

      <section className="soc-panel p-5">
        <SectionHeader title="Related Logs" icon={Server} />
        {relatedLogs.length === 0 ? <EmptyState title="No related logs" description="No log evidence is linked to this alert yet." /> : null}
        <div className="space-y-3">
          {relatedLogs.map((l: any) => (
            <div key={l.id} className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 p-4">
              <p className="font-semibold text-cyber-text">{l.event_type}</p>
              <p className="mt-1 text-sm leading-6 text-cyber-muted">{l.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="soc-panel p-5">
        <SectionHeader title="Status History" icon={History} />
        {statusHistory.length === 0 ? <EmptyState title="No status history" description="Status changes will appear here as analysts work the alert." /> : null}
        <div className="space-y-3">
          {statusHistory.map((h: any) => (
            <div key={h.id} className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 p-4">
              <StatusBadge status={h.new_status} />
              <p className="mt-2 text-sm text-cyber-muted">{h.comment ?? ""}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
