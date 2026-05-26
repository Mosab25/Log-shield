import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { Pagination } from "../components/Pagination";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { Chip } from "../components/ui/Chip";
import { RowActions } from "../components/ui/RowActions";
import { BulkBar } from "../components/ui/BulkBar";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";
import { deriveAttackSignalFromText } from "../securitySignals";

const ATTACK_TYPE_COLORS: Record<string, string> = {
  brute_force: "bg-red-500/20 text-red-300 border-red-500/30",
  unauthorized_access: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  web_attack: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
  privilege_escalation: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reconnaissance: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
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

function AlertsSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton height={48} borderRadius={8} style={{ marginBottom: 16 }} />
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton
          key={index}
          height={44}
          borderRadius={6}
          style={{ marginBottom: 4, opacity: 1 - index * 0.08 }}
        />
      ))}
    </div>
  );
}

export function AlertsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const pageSize = 10;

  const alertsQuery = useQuery({
    queryKey: ["alerts", { page, status, severity }],
    queryFn: async () => {
      const p = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize) });
      if (status) p.set("status", status);
      if (severity) p.set("severity", severity);
      return apiClient.get<any>(`/alerts?${p.toString()}`);
    },
  });

  const alerts: any[] = Array.isArray(alertsQuery.data?.items) ? alertsQuery.data.items : [];
  const total = Number(alertsQuery.data?.total ?? 0);
  const loading = alertsQuery.isLoading;
  const error = alertsQuery.error ? toUserErrorMessage(alertsQuery.error, "Unable to load alerts.") : null;

  if (loading && alerts.length === 0) {
    return <AlertsSkeleton />;
  }

  async function refreshAlerts() {
    apiClient.invalidateCache("/alerts");
    await alertsQuery.refetch();
  }

  async function updateStatus(id: number, next: string) {
    if (!next) return;
    setUpdatingId(id);
    try {
      await apiClient.patch(`/alerts/${id}/status`, { status: next, comment: "Updated from alerts page." });
      apiClient.invalidateCache("/alerts");
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setUpdatingId(null);
    }
  }

  async function acknowledgeAlert(id: number) {
    setActionMessage(null);
    setActionError(null);
    setAcknowledgingId(id);
    try {
      const response = await apiClient.patch<any>(`/alerts/${id}/acknowledge`);
      const updatedAlert = response?.alert;
      if (updatedAlert) {
        queryClient.setQueryData(["alerts", { page, status, severity }], (prev: any) => {
          if (!prev || !Array.isArray(prev.items)) return prev;
          return {
            ...prev,
            items: prev.items.map((item: any) => (item.id === id ? { ...item, ...updatedAlert } : item)),
          };
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setActionMessage("Alert acknowledged successfully.");
    } catch (err) {
      setActionError(toUserErrorMessage(err, "Could not acknowledge alert. Please try again."));
    } finally {
      setAcknowledgingId(null);
    }
  }

  function severityTone(severity?: string) {
    const value = String(severity || "").toLowerCase();
    if (value === "critical" || value === "high") return "critical" as const;
    if (value === "medium") return "warning" as const;
    return "info" as const;
  }

  function statusTone(statusValue?: string) {
    const value = String(statusValue || "").toLowerCase();
    if (value === "open") return "warning" as const;
    if (value === "in_progress" || value === "investigating") return "info" as const;
    if (value === "resolved") return "safe" as const;
    return "neutral" as const;
  }

  function rowTint(severityValue?: string) {
    const value = String(severityValue || "").toLowerCase();
    if (value === "critical") return { backgroundColor: "rgba(255,59,59,0.03)" };
    if (value === "high") return { backgroundColor: "rgba(245,158,11,0.03)" };
    return undefined;
  }

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? alerts.map(a => a.id) : []);
  }

  return (
    <div className="space-y-6 alerts-page">
      <PageHeader eyebrow="Alerts" title="Alert Management" description="Prioritize, inspect, and update detection alerts with severity, risk, and status context." />

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

      <FilterRow>
          <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} className="soc-input">
            <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="soc-input">
            <option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
          </select>
          <button onClick={() => void refreshAlerts()} className="soc-button-ghost">Refresh Alerts</button>
      </FilterRow>

      {error ? <ErrorState message={error} onRetry={() => void refreshAlerts()} /> : null}
      {actionMessage ? <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{actionMessage}</div> : null}
      {actionError ? <ErrorState message={actionError} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedIds.length > 0}
            selectedCount={selectedIds.length}
            title="Selected"
            actions={
              <>
                <button type="button" className="row-action">Acknowledge All</button>
                <button type="button" className="row-action">Assign To</button>
                <button type="button" className="row-action">Export</button>
                <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
              </>
            }
          />
          {alerts.length === 0 ? (
            <div className="p-5"><EmptyState title="No alerts found" description="No alerts match the current filters." icon={ShieldAlert} /></div>
          ) : (
            <div className="table-wrapper">
              <table className="soc-table tbl">
                <thead><tr><th><input type="checkbox" checked={alerts.length > 0 && selectedIds.length === alerts.length} onChange={e => toggleSelectAll(e.target.checked)} /></th><th>Time</th><th>Alert Name</th><th className="col-hide-mobile">Source</th><th>Severity</th><th>Risk Score</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {alerts.map(a => {
                    const fallbackAttack = deriveAttackSignalFromText(a.title, a.description, a.source_ip, a.username, a.mitre_technique);
                    const attackTypeForView = a.attack_type || fallbackAttack.attackType;
                    const attackLabelFallback = fallbackAttack.attackLabel;
                    return (
                      <tr key={a.id} style={rowTint(a.severity)}>
                      <td>
                        <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={e => toggleSelect(a.id, e.target.checked)} />
                      </td>
                      <td className="text-xs text-cyber-muted/60">{a.created_at ? new Date(a.created_at).toLocaleString() : "-"}</td>
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
                        <p className="text-xs text-cyber-muted/60">{a.username ?? "unknown"}</p>
                        {a.mitre_tactic && <p className="mt-1 text-xs text-cyan-300/75">MITRE: {a.mitre_tactic}{a.mitre_technique ? ` -> ${a.mitre_technique}` : ""}</p>}
                      </td>
                      <td className="col-hide-mobile text-sm text-cyber-muted">{a.source_ip ?? "N/A"}</td>
                      <td><Chip tone={severityTone(a.severity)}>{a.severity}</Chip></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cyber-muted">{a.risk_score ?? 0}</span>
                          <div className="col-hide-mobile h-1 w-20 rounded bg-white/10">
                            <div className="h-1 rounded bg-cyan-300" style={{ width: `${Math.min(100, Number(a.risk_score ?? 0))}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <Chip tone={statusTone(a.status)}>{String(a.status || "").replace("_", " ")}</Chip>
                        <select disabled={updatingId === a.id || acknowledgingId === a.id} defaultValue="" onChange={e => void updateStatus(a.id, e.target.value)} className="soc-input mt-2 block py-1.5 text-xs">
                          <option value="">{updatingId === a.id ? "Updating..." : "Change"}</option>
                          <option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
                        </select>
                      </td>
                      <td>
                        <RowActions
                          items={[
                            { key: "view", label: "View Details", variant: "primary", onClick: () => { window.location.href = `/alerts/${a.id}`; } },
                            ...(String(a.status).toLowerCase() === "open"
                              ? [{
                                  key: "ack",
                                  label: acknowledgingId === a.id ? "Acknowledging..." : "Acknowledge",
                                  onClick: () => void acknowledgeAlert(a.id),
                                  disabled: acknowledgingId === a.id,
                                }]
                              : []),
                            ...(String(a.status).toLowerCase() === "resolved" || String(a.status).toLowerCase() === "closed" ? [{ key: "reopen", label: "Reopen" }] : []),
                          ]}
                        />
                      </td>
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
