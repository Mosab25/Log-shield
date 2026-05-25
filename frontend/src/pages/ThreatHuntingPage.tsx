import { useMemo, useState } from "react";
import { AlertTriangle, Play, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { apiClient } from "../api/client";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { ErrorState, SectionHeader, SkeletonRows } from "../components/UI";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { StatCard } from "../components/ui/StatCard";

type HuntRisk = "low" | "medium" | "high" | "critical";
type TimeRange = "1h" | "24h" | "7d";

interface HuntTemplate {
  id: string;
  title: string;
  description: string;
  dataSource: string;
  mappedEvents: string[];
  riskLevel: HuntRisk;
}

interface NormalizedLogItem {
  id: number;
  event_type?: string;
  message?: string;
  severity?: string;
  risk_score?: number;
  timestamp?: string;
  event_time?: string;
  created_at?: string;
  source?: string;
  source_type?: string;
  ip_address?: string | null;
  src_ip?: string | null;
  username?: string | null;
  user_agent?: string | null;
  path?: string | null;
  endpoint?: string | null;
  status_code?: number | null;
}

interface AlertItem {
  id: number;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  risk_score?: number;
  created_at?: string;
  source_ip?: string | null;
  username?: string | null;
}

interface Finding {
  key: string;
  type: "log" | "alert";
  id: number;
  timestamp: string;
  sourceIp: string | null;
  eventType: string;
  severity: string;
  message: string;
  riskScore: number | null;
  username: string | null;
}

interface HuntRunSummary {
  ranAt: string;
  findings: number;
  highRiskFindings: number;
}

const HUNT_TEMPLATES: HuntTemplate[] = [
  {
    id: "failed_logins_same_ip",
    title: "Failed Logins From Same IP",
    description: "Find repeated authentication failures from a single source in a short period.",
    dataSource: "Normalized Logs",
    mappedEvents: ["failed_login", "account_lockout"],
    riskLevel: "high",
  },
  {
    id: "admin_login_unknown_ip",
    title: "Admin Login From Unknown IP",
    description: "Identify privileged logins from unusual or low-trust source IP addresses.",
    dataSource: "Normalized Logs + Alerts",
    mappedEvents: ["admin_login_unknown_ip", "successful_login"],
    riskLevel: "critical",
  },
  {
    id: "suspicious_user_agent",
    title: "Suspicious User-Agent Activity",
    description: "Detect automated scanners and suspicious clients by user-agent pattern.",
    dataSource: "Normalized Logs",
    mappedEvents: ["suspicious_user_agent", "reconnaissance"],
    riskLevel: "medium",
  },
  {
    id: "sql_injection_patterns",
    title: "SQL Injection Patterns",
    description: "Search for SQLi payload markers in request paths and messages.",
    dataSource: "Normalized Logs",
    mappedEvents: ["sql_injection_pattern", "web_attack"],
    riskLevel: "critical",
  },
  {
    id: "xss_payload_attempts",
    title: "XSS / Script Payload Attempts",
    description: "Find script payload fragments and encoded XSS attempts.",
    dataSource: "Normalized Logs",
    mappedEvents: ["xss", "script_payload"],
    riskLevel: "high",
  },
  {
    id: "multiple_http_404_scanning",
    title: "Multiple HTTP 404 Scanning",
    description: "Spot path enumeration and brute-force browsing behavior.",
    dataSource: "Normalized Logs",
    mappedEvents: ["http_404", "reconnaissance"],
    riskLevel: "medium",
  },
  {
    id: "sensitive_path_access",
    title: "Sensitive Path Access",
    description: "Track access to high-risk paths such as admin or config endpoints.",
    dataSource: "Normalized Logs",
    mappedEvents: ["sensitive_path_access", "web_attack"],
    riskLevel: "high",
  },
  {
    id: "privilege_escalation_events",
    title: "Privilege Escalation Events",
    description: "Correlate permission elevation traces in normalized events and alerts.",
    dataSource: "Normalized Logs + Alerts",
    mappedEvents: ["privilege_escalation", "role_change"],
    riskLevel: "critical",
  },
  {
    id: "high_risk_logs_24h",
    title: "High-Risk Logs Last 24 Hours",
    description: "Gather high and critical security events for fast triage.",
    dataSource: "Normalized Logs",
    mappedEvents: ["high_risk", "critical_activity"],
    riskLevel: "high",
  },
  {
    id: "new_source_ip_with_alerts",
    title: "New Source IP With Alerts",
    description: "Find alerting source IPs with low historical presence in recent logs.",
    dataSource: "Normalized Logs + Alerts",
    mappedEvents: ["anomaly", "new_source_ip"],
    riskLevel: "high",
  },
];

const HUNT_STATS_KEY = "logshield.hunting.run.history";

function getTimestamp(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeText(...values: Array<string | undefined | null>): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function extractIp(log: NormalizedLogItem): string | null {
  return (log.ip_address ?? log.src_ip ?? null) || null;
}

function logToFinding(log: NormalizedLogItem, eventType: string): Finding {
  return {
    key: `log-${log.id}-${eventType}`,
    type: "log",
    id: log.id,
    timestamp: log.timestamp || log.event_time || log.created_at || new Date().toISOString(),
    sourceIp: extractIp(log),
    eventType,
    severity: log.severity || "medium",
    message: log.message || "No message",
    riskScore: typeof log.risk_score === "number" ? log.risk_score : null,
    username: log.username ?? null,
  };
}

function alertToFinding(alert: AlertItem, eventType: string): Finding {
  return {
    key: `alert-${alert.id}-${eventType}`,
    type: "alert",
    id: alert.id,
    timestamp: alert.created_at || new Date().toISOString(),
    sourceIp: alert.source_ip ?? null,
    eventType,
    severity: alert.severity || "medium",
    message: alert.title || alert.description || "Alert finding",
    riskScore: typeof alert.risk_score === "number" ? alert.risk_score : null,
    username: alert.username ?? null,
  };
}

function sortFindings(items: Finding[]): Finding[] {
  return [...items].sort((a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp));
}

function rangeStart(range: TimeRange): number {
  const now = Date.now();
  if (range === "1h") return now - 60 * 60 * 1000;
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  return now - 24 * 60 * 60 * 1000;
}

function runHunt(templateId: string, range: TimeRange, logs: NormalizedLogItem[], alerts: AlertItem[]): Finding[] {
  const since = rangeStart(range);
  const logsInRange = logs.filter(log => getTimestamp(log.timestamp || log.event_time || log.created_at) >= since);
  const alertsInRange = alerts.filter(alert => getTimestamp(alert.created_at) >= since);

  const suspiciousUa = /(sqlmap|nmap|nikto|masscan|python-requests|curl\/|zgrab)/i;
  const sqli = /(union\s+select|or\s+1=1|information_schema|drop\s+table|insert\s+into|sleep\()/i;
  const xss = /(<script|javascript:|onerror=|onload=|%3cscript|%3csvg)/i;
  const sensitivePath = /(\/admin|\/wp-admin|\/phpmyadmin|\/\.env|\/etc\/passwd|\/config|\/login\.php|\/debug)/i;

  switch (templateId) {
    case "failed_logins_same_ip": {
      const failed = logsInRange.filter(log => {
        const text = normalizeText(log.event_type, log.message);
        return text.includes("failed_login") || text.includes("failed login");
      });
      const grouped = new Map<string, NormalizedLogItem[]>();
      failed.forEach(log => {
        const ip = extractIp(log);
        if (!ip) return;
        const group = grouped.get(ip) ?? [];
        group.push(log);
        grouped.set(ip, group);
      });
      const findings: Finding[] = [];
      grouped.forEach(group => {
        if (group.length < 3) return;
        const latest = group.sort((a, b) => getTimestamp(b.timestamp || b.event_time || b.created_at) - getTimestamp(a.timestamp || a.event_time || a.created_at))[0];
        findings.push(logToFinding({ ...latest, message: `${group.length} failed logins from ${extractIp(latest)}` }, "failed_login_cluster"));
      });
      return sortFindings(findings);
    }
    case "admin_login_unknown_ip":
      return sortFindings([
        ...logsInRange
          .filter(log => {
            const text = normalizeText(log.event_type, log.message);
            return text.includes("admin_login_unknown_ip") || (text.includes("admin login") && text.includes("unknown ip"));
          })
          .map(log => logToFinding(log, "admin_login_unknown_ip")),
        ...alertsInRange
          .filter(alert => normalizeText(alert.title, alert.description).includes("admin"))
          .map(alert => alertToFinding(alert, "admin_alert_context")),
      ]);
    case "suspicious_user_agent":
      return sortFindings(
        logsInRange
          .filter(log => suspiciousUa.test(normalizeText(log.user_agent, log.message, log.event_type)))
          .map(log => logToFinding(log, "suspicious_user_agent")),
      );
    case "sql_injection_patterns":
      return sortFindings(
        logsInRange
          .filter(log => sqli.test(normalizeText(log.message, log.path, log.endpoint, log.event_type)))
          .map(log => logToFinding(log, "sql_injection_pattern")),
      );
    case "xss_payload_attempts":
      return sortFindings(
        logsInRange
          .filter(log => xss.test(normalizeText(log.message, log.path, log.endpoint)))
          .map(log => logToFinding(log, "xss_payload_attempt")),
      );
    case "multiple_http_404_scanning": {
      const notFound = logsInRange.filter(log => log.status_code === 404 || normalizeText(log.event_type).includes("http_404"));
      const grouped = new Map<string, NormalizedLogItem[]>();
      notFound.forEach(log => {
        const ip = extractIp(log);
        if (!ip) return;
        const group = grouped.get(ip) ?? [];
        group.push(log);
        grouped.set(ip, group);
      });
      const findings: Finding[] = [];
      grouped.forEach(group => {
        if (group.length < 8) return;
        const latest = group.sort((a, b) => getTimestamp(b.timestamp || b.event_time || b.created_at) - getTimestamp(a.timestamp || a.event_time || a.created_at))[0];
        findings.push(logToFinding({ ...latest, message: `${group.length} HTTP 404 probes from ${extractIp(latest)}` }, "http_404_scanning"));
      });
      return sortFindings(findings);
    }
    case "sensitive_path_access":
      return sortFindings(
        logsInRange
          .filter(log => sensitivePath.test(normalizeText(log.path, log.endpoint, log.message)))
          .map(log => logToFinding(log, "sensitive_path_access")),
      );
    case "privilege_escalation_events":
      return sortFindings([
        ...logsInRange
          .filter(log => {
            const text = normalizeText(log.event_type, log.message);
            return text.includes("privilege_escalation") || text.includes("role_change") || text.includes("sudo");
          })
          .map(log => logToFinding(log, "privilege_escalation")),
        ...alertsInRange
          .filter(alert => normalizeText(alert.title, alert.description).includes("privilege"))
          .map(alert => alertToFinding(alert, "privilege_alert_context")),
      ]);
    case "high_risk_logs_24h":
      return sortFindings(
        logsInRange
          .filter(log => (typeof log.risk_score === "number" && log.risk_score >= 70) || ["high", "critical"].includes((log.severity || "").toLowerCase()))
          .map(log => logToFinding(log, "high_risk_event")),
      );
    case "new_source_ip_with_alerts": {
      const ipCount = new Map<string, number>();
      logs.forEach(log => {
        const ip = extractIp(log);
        if (!ip) return;
        ipCount.set(ip, (ipCount.get(ip) || 0) + 1);
      });
      const findings = alertsInRange
        .filter(alert => alert.source_ip && (ipCount.get(alert.source_ip) || 0) <= 2)
        .map(alert => alertToFinding(alert, "new_source_ip_with_alert"));
      return sortFindings(findings);
    }
    default:
      return [];
  }
}

function loadRunHistory(): HuntRunSummary[] {
  try {
    const raw = localStorage.getItem(HUNT_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HuntRunSummary[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveRunHistory(items: HuntRunSummary[]) {
  localStorage.setItem(HUNT_STATS_KEY, JSON.stringify(items.slice(0, 40)));
}

function riskTextClass(level: HuntRisk): string {
  if (level === "critical") return "text-red-200";
  if (level === "high") return "text-red-200";
  if (level === "medium") return "text-amber-200";
  return "text-cyan-200";
}

export function ThreatHuntingPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(HUNT_TEMPLATES[0].id);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const selectedTemplate = HUNT_TEMPLATES.find(template => template.id === selectedTemplateId) ?? HUNT_TEMPLATES[0];

  const runStats = useMemo(() => {
    const now = Date.now();
    const history = loadRunHistory();
    const today = history.filter(item => now - getTimestamp(item.ranAt) <= 24 * 60 * 60 * 1000);
    return {
      huntsAvailable: HUNT_TEMPLATES.length,
      huntsRunToday: today.length,
      findingsToday: today.reduce((sum, item) => sum + item.findings, 0),
      highRiskToday: today.reduce((sum, item) => sum + item.highRiskFindings, 0),
    };
  }, [lastRunAt]);

  async function runSelectedHunt() {
    setLoading(true);
    setError(null);
    setWarning(null);
    setFindings([]);
    try {
      const needsLogs = selectedTemplate.dataSource.toLowerCase().includes("logs");
      const needsAlerts = selectedTemplate.dataSource.toLowerCase().includes("alerts");

      const logTask = needsLogs
        ? apiClient.get<{ items: NormalizedLogItem[] }>("/logs/normalized?skip=0&limit=100")
        : Promise.resolve({ items: [] as NormalizedLogItem[] });
      const alertTask = needsAlerts
        ? apiClient.get<{ items: AlertItem[] }>("/alerts?skip=0&limit=100")
        : Promise.resolve({ items: [] as AlertItem[] });

      const [logsResult, alertsResult] = await Promise.allSettled([logTask, alertTask]);

      const logs =
        logsResult.status === "fulfilled" && Array.isArray(logsResult.value?.items)
          ? logsResult.value.items
          : [];
      const alerts =
        alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value?.items)
          ? alertsResult.value.items
          : [];

      const failedSources: string[] = [];
      if (needsLogs && logsResult.status === "rejected") failedSources.push("logs");
      if (needsAlerts && alertsResult.status === "rejected") failedSources.push("alerts");

      if (needsLogs && logs.length === 0 && failedSources.includes("logs")) {
        throw new Error("Unable to load log data for this hunt right now. Please retry in a moment.");
      }

      if (failedSources.length > 0) {
        setWarning(`Partial data loaded. Source unavailable: ${failedSources.join(", ")}. Results shown from available telemetry.`);
      }

      const nextFindings = runHunt(selectedTemplate.id, timeRange, logs, alerts);
      setFindings(nextFindings);

      const highRiskFindings = nextFindings.filter(item => {
        if (typeof item.riskScore === "number" && item.riskScore >= 70) return true;
        return ["high", "critical"].includes(item.severity.toLowerCase());
      }).length;
      const history = loadRunHistory();
      history.unshift({
        ranAt: new Date().toISOString(),
        findings: nextFindings.length,
        highRiskFindings,
      });
      saveRunHistory(history);
      setLastRunAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || "Failed to run hunt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PROACTIVE HUNTING"
        title="Threat Hunting"
        description="Search suspicious patterns, investigate anomalies, and pivot across security data."
        actions={
          <button type="button" onClick={() => void runSelectedHunt()} className="soc-button-ghost">
            <RefreshCw className="h-4 w-4" />
            Run Selected Hunt
          </button>
        }
      />

      <InfoHint title="What is this page?">
        Threat hunting is defensive search, not active scanning. These templates query existing telemetry to uncover hidden suspicious patterns and investigation pivots.
      </InfoHint>

      <RecommendedActions
        title="Recommended next steps"
        actions={[
          "Run high-risk hunts first when new alerts appear.",
          "Open related logs and alerts from findings for context.",
          "Send suspicious messages to SOC Tools for IOC extraction.",
          "Create or update incidents when findings form one case.",
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hunts Available" value={runStats.huntsAvailable} />
        <StatCard label="Hunts Run Today" value={<span className="text-[var(--brand)]">{runStats.huntsRunToday}</span>} />
        <StatCard label="Findings Today" value={<span className="text-[var(--status-warning)]">{runStats.findingsToday}</span>} />
        <StatCard label="High-Risk Findings" value={<span className="text-[var(--status-critical)]">{runStats.highRiskToday}</span>} />
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="soc-panel p-4">
          <SectionHeader title="Hunt Templates" description="Choose one guided hunt and run it on existing telemetry." icon={Search} />
          <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-2">
            {HUNT_TEMPLATES.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedTemplate.id === template.id
                    ? "border-cyan-200/35 bg-cyan-300/10"
                    : "border-slate-800 bg-slate-950/65 hover:border-cyan-200/20 hover:bg-slate-900/85"
                }`}
              >
                <p className="text-sm font-bold text-white">{template.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{template.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300">{template.dataSource}</span>
                  <span className={`rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-bold uppercase ${riskTextClass(template.riskLevel)}`}>
                    {template.riskLevel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="soc-panel p-5">
          <SectionHeader title={selectedTemplate.title} description={selectedTemplate.description} icon={ShieldAlert} />
          <FilterRow className="p-0 border-0 bg-transparent shadow-none">
          <div className="grid w-full gap-3 md:grid-cols-[11rem_1fr_auto]">
            <select value={timeRange} onChange={event => setTimeRange(event.target.value as TimeRange)} className="soc-input">
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 px-3 py-2 text-xs text-slate-400">
              Mapped event types: {selectedTemplate.mappedEvents.join(", ")}
            </div>
            <button type="button" onClick={() => void runSelectedHunt()} disabled={loading} className="soc-button-primary">
              <Play className="h-4 w-4" />
              {loading ? "Running..." : "Run Hunt"}
            </button>
          </div>
          </FilterRow>

          {error ? <div className="mt-4"><ErrorState message={error} onRetry={() => void runSelectedHunt()} /></div> : null}
          {warning ? (
            <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {warning}
            </div>
          ) : null}
          {loading ? <div className="mt-4"><SkeletonRows rows={4} /></div> : null}

          {!loading ? (
            <div className="mt-4">
              {findings.length === 0 ? (
                <EmptyState
                  title="No findings for this run"
                  description="Try another hunt template or expand the time range."
                  icon={<AlertTriangle className="h-5 w-5" />}
                />
              ) : (
                <div className="overflow-x-auto">
                  <BulkBar
                    active={selectedKeys.length > 0}
                    selectedCount={selectedKeys.length}
                    actions={
                      <>
                        <button type="button" className="row-action">Export Selected</button>
                        <button type="button" className="row-action">Create Alerts</button>
                        <button type="button" className="row-action" onClick={() => setSelectedKeys([])}>Clear</button>
                      </>
                    }
                  />
                  <table className="soc-table">
                    <thead>
                      <tr>
                        <th />
                        <th>Type</th>
                        <th>Timestamp</th>
                        <th>Source IP</th>
                        <th>User</th>
                        <th>Event</th>
                        <th>Severity</th>
                        <th>Risk</th>
                        <th>Message</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map(item => {
                        const sev = String(item.severity || "").toLowerCase();
                        const rowStyle = sev === "critical" || sev === "high"
                          ? { backgroundColor: "rgba(255,59,59,0.03)" }
                          : sev === "medium"
                            ? { backgroundColor: "rgba(245,158,11,0.03)" }
                            : undefined;
                        return (
                        <tr key={item.key} style={rowStyle}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(item.key)}
                              onChange={event => setSelectedKeys(prev => event.target.checked ? [...prev, item.key] : prev.filter(key => key !== item.key))}
                            />
                          </td>
                          <td>
                            <Chip tone={item.type === "alert" ? "warning" : "info"}>{item.type}</Chip>
                          </td>
                          <td className="text-sm text-slate-300">{new Date(item.timestamp).toLocaleString()}</td>
                          <td className="font-mono text-sm text-slate-300">{item.sourceIp || "-"}</td>
                          <td className="text-sm text-slate-300">{item.username || "-"}</td>
                          <td className="text-sm text-slate-300">{item.eventType}</td>
                          <td>
                            <Chip tone={sev === "critical" || sev === "high" ? "critical" : sev === "medium" ? "warning" : "info"}>{item.severity}</Chip>
                          </td>
                          <td className="text-sm font-semibold text-white">{item.riskScore ?? "-"}</td>
                          <td className="max-w-[22rem]">
                            <p className="line-clamp-2 text-sm text-slate-400">{item.message}</p>
                          </td>
                          <td>
                            <RowActions
                              items={[
                                { key: "investigate", label: item.type === "alert" ? <Link to={`/alerts/${item.id}`}>Investigate</Link> : <Link to="/logs">Investigate</Link>, variant: "primary" as const },
                                { key: "copy", label: "Copy", onClick: () => void navigator.clipboard.writeText(item.message) },
                                { key: "incident", label: "Create Alert", variant: "success" as const },
                              ]}
                            />
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
