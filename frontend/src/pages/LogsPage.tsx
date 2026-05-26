import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Database, ListFilter, ShieldAlert, Calendar, Search, X, Eye, AlertTriangle, Activity } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { LogsToolbar } from "../components/LogsToolbar";
import { Pagination } from "../components/Pagination";
import { Chip } from "../components/ui/Chip";
import { RowActions } from "../components/ui/RowActions";
import { BulkBar } from "../components/ui/BulkBar";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { EvidenceExplanation, InfoHint, RecommendedActions } from "../components/Guidance";
import { AppModal } from "../components/ui/AppModal";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";
import { deriveAttackSignalFromText } from "../securitySignals";
import { debounce } from "../utils/debounce";

type LogFilters = {
  eventType: string;
  category: string;
  severity: string;
  source: string;
  ipAddress: string;
  username: string;
  endpoint: string;
  startDate: string;
  endDate: string;
};

function getInitialTab(searchParams: URLSearchParams): "raw" | "normalized" {
  if (searchParams.get("tab") === "normalized") return "normalized";
  if (searchParams.has("event_type") || searchParams.has("type") || searchParams.has("severity")) return "normalized";
  return "raw";
}

function getInitialFilters(searchParams: URLSearchParams): LogFilters {
  const legacyType = searchParams.get("type");
  return {
    eventType: searchParams.get("event_type") || (legacyType === "auth_failure" ? "failed_login" : ""),
    category: searchParams.get("category") || "",
    severity: searchParams.get("severity") || "",
    source: searchParams.get("source") || "",
    ipAddress: searchParams.get("ip_address") || searchParams.get("ip") || "",
    username: searchParams.get("username") || searchParams.get("user") || "",
    endpoint: searchParams.get("endpoint") || "",
    startDate: "",
    endDate: "",
  };
}

function buildLogsUrl(tab: "raw" | "normalized", page: number, pageSize: number, search: string, filters: LogFilters) {
  const skip = (page - 1) * pageSize;
  let url = tab === "raw" ? `/logs/raw?skip=${skip}&limit=${pageSize}` : `/logs/normalized?skip=${skip}&limit=${pageSize}`;

  if (tab !== "normalized") return url;

  const params = new URLSearchParams();
  if (filters.eventType) params.set("event_type", filters.eventType);
  if (filters.category) params.set("category", filters.category);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.source) params.set("source", filters.source);
  if (filters.ipAddress) params.set("ip_address", filters.ipAddress);
  if (filters.username) params.set("username", filters.username);
  if (filters.endpoint) params.set("endpoint", filters.endpoint);
  if (search) params.set("q", search);
  if (filters.startDate) params.set("start_date", new Date(filters.startDate).toISOString());
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    params.set("end_date", endDate.toISOString());
  }

  const serialized = params.toString();
  return serialized ? `${url}&${serialized}` : url;
}

function summarizeNormalizedLogs(items: any[]) {
  let scriptAttackCount = 0;
  let failedLogins = 0;
  let webErrors = 0;
  let suspiciousEvents = 0;
  let highCritical = 0;

  for (const item of items) {
    if (deriveAttackSignalFromText(item.message, item.raw_message, item.endpoint, item.path, item.user_agent).isAttack) {
      scriptAttackCount++;
    }
    if (item.event_type === "failed_login") failedLogins++;
    if (item.event_type === "http_404" || item.status_code >= 500) webErrors++;
    if (item.category === "attack" || item.category === "reconnaissance") suspiciousEvents++;
    if (item.severity === "high" || item.severity === "critical") highCritical++;
  }

  return {
    total: items.length,
    failedLogins,
    webErrors,
    suspiciousEvents,
    highCritical,
    scriptAttacks: scriptAttackCount,
  };
}

export function LogsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"raw" | "normalized">(() => getInitialTab(searchParams));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [actionId, setActionId] = useState<number | null>(null);
  const pageSize = 25; // Increased from 10 for better UX
  
  // Enhanced filters state with debounced search
  const [filters, setFilters] = useState<LogFilters>(() => getInitialFilters(searchParams));
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const debouncedApplySearch = useMemo(() => debounce((value: string) => {
    setSearch(value.trim());
    setPage(1);
  }, 400), []);
  const logsUrl = useMemo(() => buildLogsUrl(tab, page, pageSize, search, filters), [filters, page, pageSize, search, tab]);
  const logsQuery = useQuery({
    queryKey: ["logs", tab, page, search, filters],
    queryFn: () => apiClient.get<any>(logsUrl),
  });
  const metadataQuery = useQuery({
    queryKey: ["logs", "normalized", "metadata"],
    queryFn: () => apiClient.get<any>("/logs/normalized/metadata"),
    enabled: tab === "normalized",
  });

  const items: any[] = Array.isArray(logsQuery.data?.items) ? logsQuery.data.items : [];
  const total = Number(logsQuery.data?.total ?? 0);
  const loading = logsQuery.isLoading;
  const metadata = metadataQuery.data;
  const summary = useMemo(() => (tab === "normalized" ? summarizeNormalizedLogs(items) : null), [items, tab]);
  const error = logsQuery.error
    ? tab === "normalized" && Number((logsQuery.error as { status?: number })?.status) >= 500
      ? "Security Events service is temporarily unavailable. Please try again later."
      : toUserErrorMessage(logsQuery.error, "Unable to load logs.")
    : null;

  async function refreshLogs() {
    apiClient.invalidateCache("/logs");
    await logsQuery.refetch();
  }

  function updateSearch(value: string) {
    setSearchInput(value);
    debouncedApplySearch(value);
  }

  // Helper functions for event type mapping
  function getEventLabel(eventType?: string | null) {
    if (!eventType || typeof eventType !== "string") return "Unknown Event";
    const labels: Record<string, string> = {
      "failed_login": "Failed Login Attempt",
      "successful_login": "Successful Login",
      "admin_login_unknown_ip": "Admin Login From Unknown IP",
      "http_404": "HTTP 404 Request",
      "sql_injection_pattern": "SQL Injection Pattern",
      "suspicious_user_agent": "Suspicious User-Agent",
      "privilege_escalation": "Privilege Escalation Event",
      "high_error_rate": "High Error Rate",
      "sensitive_path_access": "Sensitive Path Access",
      "account_lockout": "Account Lockout",
      "ip_blocked": "IP Blocked",
      "normal_activity": "Normal Activity"
    };
    return labels[eventType] || eventType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      "authentication": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      "attack": "bg-red-500/20 text-red-300 border-red-500/30",
      "reconnaissance": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      "privilege": "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
      "system": "bg-slate-500/10 text-slate-300 border-slate-500/25",
      "defense": "bg-green-500/20 text-green-300 border-green-500/30",
      "web": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      "normal": "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25"
    };
    return colors[category] || "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25";
  }

  function resetFilters() {
    setFilters({
      eventType: "",
      category: "",
      severity: "",
      source: "",
      ipAddress: "",
      username: "",
      endpoint: "",
      startDate: "",
      endDate: ""
    });
    setSearch("");
    setSearchInput("");
    setPage(1);
  }

  function applyFilters() {
    setSearch(searchInput.trim());
    setPage(1);
    setShowFilters(false);
  }

  // Client-side filtering removed - let backend handle it
  const visible = useMemo(() => {
    // Only filter if we have search term and items
    if (!search || items.length === 0) return items;
    return items.filter(x => 
      JSON.stringify(x).toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  async function normalize(id: number) {
    setActionId(id);
    try {
      await apiClient.post(`/logs/normalize/${id}`);
      apiClient.invalidateCache("/logs");
      await logsQuery.refetch();
    } finally {
      setActionId(null);
    }
  }

  async function detect(id: number) {
    setActionId(id);
    try {
      await apiClient.post(`/detection/run/${id}`);
    } finally {
      setActionId(null);
    }
  }

  function exportSelectedLogs() {
    if (!selectedIds.length) return;
    const selectedItems = visible.filter(item => selectedIds.includes(item.id));
    const blob = new Blob([JSON.stringify(selectedItems, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-logs-selected-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copySelectedLogs() {
    if (!selectedIds.length) return;
    const selectedItems = visible.filter(item => selectedIds.includes(item.id));
    const text = selectedItems.map(item => item.raw_message || item.message || JSON.stringify(item)).join("\n\n");
    await navigator.clipboard.writeText(text);
  }

  function severityTone(value?: string) {
    const s = String(value || "").toLowerCase();
    if (s === "critical" || s === "error" || s === "high") return "critical" as const;
    if (s === "warning" || s === "medium") return "warning" as const;
    if (s === "info" || s === "low") return "info" as const;
    return "neutral" as const;
  }

  function rowTint(value?: string) {
    const s = String(value || "").toLowerCase();
    if (s === "critical" || s === "error" || s === "high") return { backgroundColor: "rgba(255,59,59,0.03)" };
    if (s === "warning" || s === "medium") return { backgroundColor: "rgba(245,158,11,0.03)" };
    return undefined;
  }

  function switchTab(next: "raw" | "normalized") {
    setTab(next);
    setPage(1);
    setSelectedIds([]);
    setSelectedLog(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Security Logs" title="Security Event Analysis" description="Monitor and analyze security events with enhanced Security Operations visibility and threat detection." />

      <InfoHint title="How logs support investigations">
        Logs are raw or normalized security events. They are the evidence used to generate alerts, explain incidents, and prove what happened during an investigation.
      </InfoHint>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => switchTab("raw")} className={tab === "raw" ? "soc-button-primary" : "soc-button-ghost"}>Raw Logs</button>
        <button type="button" onClick={() => switchTab("normalized")} className={tab === "normalized" ? "soc-button-primary" : "soc-button-ghost"}>Security Events</button>
      </div>

      {/* Summary Cards for Normalized Logs */}
      {tab === "normalized" && summary && !loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="soc-panel p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <span className="text-xs font-bold uppercase text-cyber-muted">Total Events</span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.total}</p>
          </div>
          <div className="soc-panel p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <span className="text-xs font-bold uppercase text-cyber-muted">Failed Logins</span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.failedLogins}</p>
          </div>
          <div className="soc-panel p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold uppercase text-cyber-muted">Web Errors</span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.webErrors}</p>
          </div>
          <div className="soc-panel p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-yellow-400" />
              <span className="text-xs font-bold uppercase text-cyber-muted">Suspicious</span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.suspiciousEvents}</p>
          </div>
          <div className="soc-panel p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-xs font-bold uppercase text-cyber-muted">High/Critical</span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.highCritical}</p>
          </div>
          <div className="soc-panel p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-300" />
              <span className="text-xs font-bold uppercase text-cyber-muted">Script Attacks</span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.scriptAttacks}</p>
          </div>
        </div>
      )}

      {/* Enhanced Filters for Normalized Logs */}
      {tab === "normalized" && (
        <FilterRow>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-cyber-muted" />
              <span className="text-sm font-semibold text-white">Advanced Filters</span>
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="soc-button-ghost px-3 py-1 text-xs">
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>
          
          {showFilters && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <input
                value={searchInput}
                onChange={e => updateSearch(e.target.value)}
                placeholder="Search logs..."
                className="soc-input"
              />
              <select value={filters.eventType} onChange={e => setFilters({...filters, eventType: e.target.value})} className="soc-input">
                <option value="">All Event Types</option>
                {metadata?.event_types?.map((type: any) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <select value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})} className="soc-input">
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input
                value={filters.ipAddress}
                onChange={e => setFilters({...filters, ipAddress: e.target.value})}
                placeholder="IP Address"
                className="soc-input"
              />
              <input
                value={filters.username}
                onChange={e => setFilters({...filters, username: e.target.value})}
                placeholder="Username"
                className="soc-input"
              />
              <div className="flex gap-2 lg:col-span-2 xl:col-span-5">
                <button type="button" onClick={applyFilters} className="soc-button-primary px-4 py-2 text-sm">Apply Filters</button>
                <button type="button" onClick={resetFilters} className="soc-button-ghost px-4 py-2 text-sm">Reset</button>
              </div>
            </div>
          )}
        </FilterRow>
      )}

      <LogsToolbar search={searchInput} setSearch={updateSearch} reload={() => void refreshLogs()} />
      {error ? <ErrorState message={error} onRetry={() => void refreshLogs()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedIds.length > 0}
            selectedCount={selectedIds.length}
            actions={
              <>
                <button type="button" className="row-action" onClick={exportSelectedLogs}>Export Selected</button>
                <button type="button" className="row-action" onClick={() => void copySelectedLogs()}>Copy Values</button>
                <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
              </>
            }
          />
          {visible.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No logs found" description={search ? "No records match the current search." : "No log records are available for this view yet."} icon={ListFilter} />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="soc-table tbl">
                <thead>
                  <tr>
                    {tab === "raw" ? (
                      <>
                        <th />
                        <th>Time</th>
                        <th>Source</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Action</th>
                      </>
                    ) : (
                      <>
                        <th />
                        <th>Time</th>
                        <th>Event Type</th>
                        <th>Category</th>
                        <th>Severity</th>
                        <th>Source</th>
                        <th>User</th>
                        <th>Source IP</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Risk</th>
                        <th>Message</th>
                        <th>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item: any) => (
                    <tr key={item.id} style={rowTint(item.severity)}>
                      {tab === "raw" ? (
                        <>
                          {(() => {
                            const signal = deriveAttackSignalFromText(item.raw_message, item.source, item.source_type);
                            return (
                              <>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={e => setSelectedIds(prev => (e.target.checked ? [...prev, item.id] : prev.filter(x => x !== item.id)))}
                            />
                          </td>
                          <td>
                            <p className="text-xs text-cyber-muted/60">{new Date(item.received_at || item.created_at).toLocaleString()}</p>
                          </td>
                          <td>
                            <p className="font-semibold text-white">{item.source}</p>
                            <p className="mt-1 text-xs text-cyber-muted/60">{item.source_type}</p>
                          </td>
                          <td className="max-w-2xl text-cyber-muted">
                            <p className="line-clamp-2 text-sm">{item.raw_message}</p>
                            {signal.isAttack ? <p className="mt-1 text-[11px] font-bold text-red-200">Attack: {signal.attackLabel}</p> : null}
                          </td>
                          <td><Chip tone="neutral">{item.ingestion_status || "unknown"}</Chip></td>
                          <td className="text-right">
                            <RowActions items={[{ key: "normalize", label: actionId === item.id ? "Normalizing..." : "Normalize", onClick: () => normalize(item.id), disabled: actionId === item.id, variant: "primary" }, { key: "copy", label: "Copy", onClick: () => void navigator.clipboard.writeText(item.raw_message || "") }]} />
                          </td>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {(() => {
                            const signal = deriveAttackSignalFromText(item.message, item.raw_message, item.endpoint, item.path, item.user_agent);
                            return (
                              <>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={e => setSelectedIds(prev => (e.target.checked ? [...prev, item.id] : prev.filter(x => x !== item.id)))}
                            />
                          </td>
                          <td>
                            <p className="text-xs text-cyber-muted/60">{new Date(item.timestamp || item.created_at).toLocaleString()}</p>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getCategoryColor(item.category || 'normal')}`}>
                                {item.event_label || getEventLabel(item.event_type)}
                              </span>
                              {signal.isAttack ? (
                                <span className="rounded-full border border-red-300/30 bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-200">
                                  Attack: {signal.attackLabel}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getCategoryColor(item.category || 'normal')}`}>
                              {item.category || 'unknown'}
                            </span>
                          </td>
                          <td><Chip tone={severityTone(item.severity)}>{item.severity || "unknown"}</Chip></td>
                          <td>
                            <p className="text-sm text-cyber-muted">{item.source}</p>
                          </td>
                          <td>
                            <p className="text-sm text-cyber-muted">{item.username || '-'}</p>
                          </td>
                          <td>
                            <p className="text-sm text-cyber-muted">{item.ip_address || '-'}</p>
                          </td>
                          <td>
                            <p className="text-sm text-cyber-muted">{item.endpoint || item.path || '-'}</p>
                          </td>
                          <td>
                            <p className="text-sm text-cyber-muted">{item.status || item.status_code || '-'}</p>
                          </td>
                          <td>
                            <p className="text-sm font-semibold text-white">{item.risk_score || '-'}</p>
                          </td>
                          <td className="max-w-2xl text-cyber-muted">
                            <p className="line-clamp-2 text-sm">{item.message}</p>
                          </td>
                          <td className="text-right">
                            <RowActions
                              items={[
                                { key: "view", label: "Investigate", variant: "primary", onClick: () => setSelectedLog(item) },
                                { key: "detect", label: actionId === item.id ? "Running..." : "Detect", onClick: () => detect(item.id), disabled: actionId === item.id },
                                { key: "copy", label: "Copy", onClick: () => void navigator.clipboard.writeText(item.message || "") },
                              ]}
                            />
                          </td>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      ) : null}
      
      {/* Log Details Drawer/Modal */}
      {selectedLog && (
        <AppModal isOpen={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} size="xl" panelClassName="soc-panel-strong p-6">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-cyber-text">Security Event Details</h2>
              <button type="button" onClick={() => setSelectedLog(null)} className="soc-button-ghost px-3 py-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase text-cyber-muted mb-2">Event Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Event Type:</span>
                      <span className="text-sm font-semibold text-white">{selectedLog.event_label || getEventLabel(selectedLog.event_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Category:</span>
                      <Chip tone="info">{selectedLog.category || "unknown"}</Chip>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Severity:</span>
                      <Chip tone={severityTone(selectedLog.severity)}>{selectedLog.severity || "unknown"}</Chip>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Risk Score:</span>
                      <span className="text-sm font-semibold text-white">{selectedLog.risk_score || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Attack Type:</span>
                      <span className="text-sm text-cyber-muted">
                        {selectedLog.attack_type || deriveAttackSignalFromText(selectedLog.message, selectedLog.raw_message, selectedLog.endpoint, selectedLog.path, selectedLog.user_agent).attackLabel || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">MITRE Technique:</span>
                      <span className="text-sm text-cyber-muted">{selectedLog.mitre_technique || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Source Context */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase text-cyber-muted mb-2">Source Context</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Source:</span>
                      <span className="text-sm text-cyber-muted">{selectedLog.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Timestamp:</span>
                      <span className="text-sm text-cyber-muted">{new Date(selectedLog.timestamp || selectedLog.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Username:</span>
                      <span className="text-sm text-cyber-muted">{selectedLog.username || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Source IP:</span>
                      <span className="text-sm text-cyber-muted">{selectedLog.ip_address || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">User Agent:</span>
                      <span className="text-sm text-cyber-muted truncate max-w-[200px]" title={selectedLog.user_agent}>
                        {selectedLog.user_agent || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-cyber-muted">Endpoint:</span>
                      <span className="text-sm text-cyber-muted">{selectedLog.endpoint || selectedLog.path || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Message */}
            <div>
              <h3 className="text-sm font-bold uppercase text-cyber-muted mb-2">Event Message</h3>
              <div className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 p-4">
                <pre className="text-sm text-cyber-text whitespace-pre-wrap font-mono">
                  {selectedLog.message}
                </pre>
              </div>
            </div>

            <div className="grid gap-4 pt-4 lg:grid-cols-2">
              <EvidenceExplanation
                title="Event meaning"
                points={[
                  `This event is classified as ${selectedLog.event_label || getEventLabel(selectedLog.event_type)}.`,
                  selectedLog.mitre_technique ? `MITRE context: ${selectedLog.mitre_technique}.` : "No MITRE technique is mapped yet for this event.",
                  selectedLog.risk_score ? `Risk score ${selectedLog.risk_score} suggests this event should be correlated with related alerts, users, and IPs.` : "No risk score is available, so review the message, source, IP, and user context manually.",
                ]}
              />
              <RecommendedActions
                title="Suggested next actions"
                actions={[
                  "Run detection on this event.",
                  "Send suspicious text to the Security Operations Toolkit for IOC extraction.",
                  "Create or add to an incident if related activity exists.",
                  "Search related IPs, URLs, or CVEs in Threat Intel or URL Scanner.",
                ]}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button type="button" onClick={() => detect(selectedLog.id)} disabled={actionId === selectedLog.id} className="soc-button-primary px-4 py-2 text-sm">
                {actionId === selectedLog.id ? "Running Detection..." : "Run Detection"}
              </button>
              <button type="button" onClick={() => setSelectedLog(null)} className="soc-button-ghost px-4 py-2 text-sm">
                Close
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
