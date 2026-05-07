import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { apiClient } from "../api/client";
import { Pagination } from "../components/Pagination";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { RiskBadge } from "../components/RiskBadge";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";
import { deriveAttackSignalFromText } from "../securitySignals";

const ATTACK_TYPE_COLORS: Record<string, string> = {
  brute_force: "bg-red-500/20 text-red-300 border-red-500/30",
  unauthorized_access: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  web_attack: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  privilege_escalation: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reconnaissance: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  anomaly: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const ATTACK_TYPE_LABELS: Record<string, string> = {
  brute_force: "Brute Force",
  unauthorized_access: "Unauthorized Access",
  web_attack: "Web Attack",
  privilege_escalation: "Privilege Escalation",
  reconnaissance: "Reconnaissance",
  anomaly: "Anomaly",
};

function AttackTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const color = ATTACK_TYPE_COLORS[type] ?? "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25";
  const label = ATTACK_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${color}`}><ShieldAlert className="h-3 w-3" />{label}</span>;
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize) });
      if (status) p.set("status", status);
      if (severity) p.set("severity", severity);
      const res = await apiClient.getUncached<any>(`/alerts?${p.toString()}`);
      setAlerts(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setAlerts([]);
      setTotal(0);
      setError(err?.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, status, severity]);

  async function updateStatus(id: number, next: string) {
    if (!next) return;
    setUpdatingId(id);
    try {
      await apiClient.patch(`/alerts/${id}/status`, { status: next, comment: "Updated from alerts page." });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Alerts" title="Alert Management" description="Prioritize, inspect, and update detection alerts with severity, risk, and status context." icon={AlertTriangle} />

      <InfoHint title="How to triage alerts">
        Alerts are detections generated from logs and rules. Start with severity and risk, then confirm the evidence before linking the alert to an incident or changing status.
      </InfoHint>

      <RecommendedActions
        title="Alert triage path"
        actions={[
          "Open critical and high-risk alerts first.",
          "Check the source IP, user, and related logs.",
          "Search any IOC or CVE mentioned in the alert.",
          "Create or link an incident when alerts are related.",
        ]}
      />

      <section className="soc-panel p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} className="soc-input">
            <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="soc-input">
            <option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
          </select>
          <button onClick={() => void load()} className="soc-button-ghost">Refresh Alerts</button>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-5"><EmptyState title="No alerts found" description="No alerts match the current filters." icon={ShieldAlert} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead><tr><th>Alert</th><th>Severity</th><th>Risk</th><th>Status</th><th>Open</th></tr></thead>
                <tbody>
                  {alerts.map(a => {
                    const fallbackAttack = deriveAttackSignalFromText(a.title, a.description, a.source_ip, a.username, a.mitre_technique);
                    const attackTypeForView = a.attack_type || fallbackAttack.attackType;
                    const attackLabelFallback = fallbackAttack.attackLabel;
                    return (
                      <tr key={a.id}>
                      <td>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <AttackTypeBadge type={attackTypeForView} />
                          {!a.attack_type && attackLabelFallback ? (
                            <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-200">
                              Auto-detected: {attackLabelFallback}
                            </span>
                          ) : null}
                        </div>
                        <p className="font-bold text-white">{a.title}</p>
                        <p className="text-xs text-cyber-muted/60">{a.source_ip ?? "N/A"} - {a.username ?? "unknown"}</p>
                        {a.mitre_tactic && <p className="mt-1 text-xs text-cyan-300/75">MITRE: {a.mitre_tactic}{a.mitre_technique ? ` -> ${a.mitre_technique}` : ""}</p>}
                      </td>
                      <td><SeverityBadge severity={a.severity} /></td>
                      <td><RiskBadge score={a.risk_score} /></td>
                      <td>
                        <StatusBadge status={a.status} />
                        <select disabled={updatingId === a.id} defaultValue="" onChange={e => void updateStatus(a.id, e.target.value)} className="soc-input mt-2 block py-1.5 text-xs">
                          <option value="">{updatingId === a.id ? "Updating..." : "Change"}</option>
                          <option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
                        </select>
                      </td>
                      <td><Link className="font-semibold text-cyan-200 hover:text-white" to={`/alerts/${a.id}`}>Open</Link></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
