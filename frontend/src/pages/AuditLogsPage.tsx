import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Download, Filter, RefreshCw, Search,
  Shield, ShieldAlert, ShieldCheck, User, XCircle, Info, Clock,
  Ban, FileText, Eye, Copy, CheckCircle,
} from "lucide-react";
import { apiClient } from "../api/client";
import { Pagination } from "../components/Pagination";
import { AppModal } from "../components/ui/AppModal";
import { EmptyState, ErrorState, SectionHeader, SkeletonBlock, SkeletonRows } from "../components/UI";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { StatCard } from "../components/ui/StatCard";

// --- Types ---

interface AuditActor { id: number; full_name: string; email: string; role_name: string | null }
interface AuditLog {
  id: number; actor_user_id: number | null; actor: AuditActor | null;
  action: string; entity_type: string | null; entity_id: string | null;
  ip_address: string | null; user_agent: string | null;
  details: Record<string, unknown>; created_at: string;
}
interface AuditSummary {
  total_events_today: number; sensitive_events_today: number;
  failed_logins_today: number; admin_actions_today: number;
  most_active_user: { id: number; email: string; name: string } | null;
  most_common_action: { action: string; count: number } | null;
  events_by_category: { category: string; count: number }[];
  events_timeline: { hour: string; count: number }[];
  insights: string[];
}

type AuditFilters = {
  q: string; action: string; actorUserId: string; entityType: string;
  startDate: string; endDate: string; ip_address: string;
  category: string; severity: string;
};

const initialFilters: AuditFilters = {
  q: "", action: "", actorUserId: "", entityType: "",
  startDate: "", endDate: "", ip_address: "",
  category: "", severity: "",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "auth", label: "Auth" },
  { value: "admin", label: "Admin" },
  { value: "security", label: "Security" },
  { value: "report", label: "Report" },
  { value: "incident", label: "Incident" },
  { value: "url_scan", label: "URL Scan" },
  { value: "system", label: "System" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const QUICK_RANGES = [
  { label: "Today", days: 0 },
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

// --- Helpers ---

const SENSITIVE_KEYS = new Set([
  "password", "token", "secret", "api_key", "otp", "recovery_key",
  "smtp", "resend", "authorization", "cookie", "smtp_password",
  "smtp_username", "virustotal_api_key", "nvd_api_key", "jwt_secret_key",
  "jwt_refresh_secret_key", "resend_api_key",
]);

function inferCategory(action: string): string {
  const a = action.toLowerCase();
  if (/login|logout|register|2fa|otp|session/.test(a)) return "auth";
  if (/user_created|user_updated|user_deactivated|user_deleted|role_changed|rule_disabled|rule_enabled|user_activated/.test(a)) return "admin";
  if (/ip_block|root_admin|failed_login|blocked|threat|alert|admin_2fa_failed/.test(a)) return "security";
  if (/report/.test(a)) return "report";
  if (/incident/.test(a)) return "incident";
  if (/url_scan/.test(a)) return "url_scan";
  return "system";
}

function inferSeverity(action: string): string {
  const a = action.toLowerCase();
  if (/root_admin_modification_blocked|root_admin_self_ip_block_denied|admin_2fa_failed|user_deleted|role_changed|detection_rule_disabled/.test(a)) return "critical";
  if (/failed|deactivated|report_exported|ip_block_removed|user_updated/.test(a)) return "warning";
  return "info";
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "••••••••";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function getCategoryColor(cat: string) {
  switch (cat) {
    case "auth": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    case "admin": return "bg-cyan-500/10 text-cyan-300 border-cyan-500/25";
    case "security": return "bg-red-500/20 text-red-300 border-red-500/30";
    case "report": return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    case "incident": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "url_scan": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    default: return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }
}

function getActionColor(action: string) {
  const a = action.toLowerCase();
  if (/failed|blocked|denied|deleted|deactivated/.test(a)) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (/created|success|enabled|activated|verified/.test(a)) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (/updated|changed|modified|exported/.test(a)) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (/login|logout|session|register/.test(a)) return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  if (/scan|threat|alert|incident/.test(a)) return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  return "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

function getEntityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "user": return `/users`;
    case "incident": return `/incidents/${entityId}`;
    case "alert": return `/alerts/${entityId}`;
    case "ip_block": return `/blocks`;
    case "threat_entry": return `/threats/${entityId}`;
    default: return null;
  }
}

// --- Component ---

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [applied, setApplied] = useState<AuditFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const pageSize = 50;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("skip", String((page - 1) * pageSize));
    params.set("limit", String(pageSize));
    if (applied.q.trim()) params.set("q", applied.q.trim());
    if (applied.action.trim()) params.set("action", applied.action.trim());
    if (applied.actorUserId.trim()) {
      const id = Number(applied.actorUserId.trim());
      if (Number.isFinite(id)) params.set("actor_user_id", String(id));
    }
    if (applied.entityType.trim()) params.set("entity_type", applied.entityType.trim());
    if (applied.ip_address.trim()) params.set("ip_address", applied.ip_address.trim());
    if (applied.category) params.set("category", applied.category);
    if (applied.severity) params.set("severity", applied.severity);
    if (applied.startDate) params.set("start_date", new Date(applied.startDate).toISOString());
    if (applied.endDate) {
      const d = new Date(applied.endDate);
      d.setHours(23, 59, 59, 999);
      params.set("end_date", d.toISOString());
    }
    return params.toString();
  }, [page, pageSize, applied]);

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      const result = await apiClient.get<AuditSummary>("/audit-logs/summary");
      setSummary(result);
    } catch { /* non-critical */ }
    finally { setSummaryLoading(false); }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ total: number; items: AuditLog[] }>(`/audit-logs?${queryString}`);
      setLogs(Array.isArray(response?.items) ? response.items : []);
      setTotal(Number(response?.total ?? 0));
    } catch (err: any) {
      setLogs([]);
      setTotal(0);
      setError(err?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [queryString, refreshTick]);
  useEffect(() => { void loadSummary(); }, [refreshTick]);

  function applyFilters() { setPage(1); setApplied(filters); }
  function resetFilters() { setFilters(initialFilters); setApplied(initialFilters); setPage(1); }

  function setQuickRange(days: number) {
    const end = new Date();
    const start = new Date();
    if (days === 0) { start.setHours(0, 0, 0, 0); }
    else { start.setDate(start.getDate() - days); }
    const newFilters = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    setFilters(newFilters);
    setApplied(newFilters);
    setPage(1);
  }

  function copyToClipboard(text: string, id: number) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? logs.map(l => l.id) : []);
  }

  const allSelected = logs.length > 0 && logs.every(l => selectedIds.includes(l.id));

  function exportCSV() {
    if (logs.length === 0) return;
    const headers = ["ID", "Timestamp", "Action", "Category", "Severity", "Actor", "Actor Email", "IP Address", "Entity Type", "Entity ID"];
    const rows = logs.map(log => {
      const cat = inferCategory(log.action);
      const sev = inferSeverity(log.action);
      const safe = (v: string | null | undefined) => {
        const val = v || "";
        if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) return `'${val}`;
        return val;
      };
      return [log.id, log.created_at, safe(log.action), cat, sev, safe(log.actor?.full_name), safe(log.actor?.email), safe(log.ip_address), safe(log.entity_type), safe(log.entity_id)];
    });
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasActiveFilters = applied.q || applied.action || applied.actorUserId || applied.entityType || applied.startDate || applied.endDate || applied.ip_address || applied.category || applied.severity;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AUDIT TRAIL"
        title="Audit Logs"
        description="Review administrative actions, authentication events, and platform activity history."
        actions={
          <div className="flex items-center gap-3">
            <button onClick={exportCSV} disabled={logs.length === 0} className="soc-button-ghost flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="soc-button-ghost flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Events Today" value={summary?.total_events_today ?? 0} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Sensitive Events" value={summary?.sensitive_events_today ?? 0} icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="Failed Logins" value={summary?.failed_logins_today ?? 0} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Admin Actions" value={summary?.admin_actions_today ?? 0} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="Most Active User" value={summary?.most_active_user?.name ?? "N/A"} icon={<User className="h-4 w-4" />} />
        <StatCard label="Top Action" value={summary?.most_common_action?.action ?? "N/A"} icon={<CheckCircle className="h-4 w-4" />} />
      </div>

      {/* Category Distribution + Timeline */}
      {summary && (summary.events_by_category.length > 0 || summary.events_timeline.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {summary.events_by_category.length > 0 && (
            <div className="soc-panel p-5">
              <h3 className="text-lg font-bold text-white mb-4">Events by Category</h3>
              <div className="space-y-3">
                {summary.events_by_category.map(cat => {
                  const maxCount = Math.max(...summary.events_by_category.map(c => c.count), 1);
                  const pct = Math.round((cat.count / maxCount) * 100);
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300 capitalize">{cat.category}</span>
                        <span className="text-sm font-bold text-white">{cat.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className={`h-2 w-full origin-left rounded-full ${getCategoryColor(cat.category).split(" ")[0]}`} style={{ transform: `scaleX(${pct / 100})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {summary.events_timeline.length > 0 && (
            <div className="soc-panel p-5">
              <h3 className="text-lg font-bold text-white mb-4">Events Timeline (Today)</h3>
              <div className="space-y-2">
                {summary.events_timeline.map(pt => {
                  const maxCount = Math.max(...summary.events_timeline.map(p => p.count), 1);
                  const pct = Math.round((pt.count / maxCount) * 100);
                  const hourLabel = new Date(pt.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={pt.hour} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-12 shrink-0">{hourLabel}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-3 w-full origin-left rounded-full bg-cyan-400/40" style={{ transform: `scaleX(${pct / 100})` }} />
                      </div>
                      <span className="text-xs font-bold text-white w-8 text-right">{pt.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {summary && summary.insights.length > 0 && (
        <div className="soc-panel p-5">
          <SectionHeader title="Security Insights" />
          <div className="space-y-2">
            {summary.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5">
                <Info className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-200">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterRow className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
              Active
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_RANGES.map(r => (
            <button key={r.label} onClick={() => setQuickRange(r.days)} className="soc-button-ghost px-3 py-1.5 text-xs font-semibold">
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={filters.q} onChange={e => setFilters(prev => ({ ...prev, q: e.target.value }))} placeholder="Search actions, entities, IPs..." className="soc-input pl-9" />
          </div>
          <select value={filters.category} onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))} className="soc-input">
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.severity} onChange={e => setFilters(prev => ({ ...prev, severity: e.target.value }))} className="soc-input">
            {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input value={filters.action} onChange={e => setFilters(prev => ({ ...prev, action: e.target.value }))} placeholder="Action" className="soc-input" />
          <input value={filters.actorUserId} onChange={e => setFilters(prev => ({ ...prev, actorUserId: e.target.value }))} placeholder="Actor User ID" className="soc-input" />
          <input value={filters.entityType} onChange={e => setFilters(prev => ({ ...prev, entityType: e.target.value }))} placeholder="Entity Type" className="soc-input" />
          <input value={filters.ip_address} onChange={e => setFilters(prev => ({ ...prev, ip_address: e.target.value }))} placeholder="IP Address" className="soc-input" />
          <input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="soc-input" />
          <input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="soc-input" />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button onClick={applyFilters} className="soc-button-primary">Apply Filters</button>
          <button onClick={resetFilters} className="soc-button-ghost">Reset Filters</button>
        </div>
      </FilterRow>

      {error ? <ErrorState message={error} onRetry={() => setRefreshTick(v => v + 1)} /> : null}
      {loading ? <SkeletonRows rows={8} /> : null}
      {!loading && logs.length === 0 ? (
        <EmptyState title="No audit logs found" description="No audit records match the current filters." icon={Activity} />
      ) : null}

      {/* Audit Table */}
      {!loading && logs.length > 0 ? (
        <>
          <div className="soc-panel overflow-hidden">
            <BulkBar
              active={selectedIds.length > 0}
              selectedCount={selectedIds.length}
              title="Selected events"
              actions={
                <>
                  <button type="button" className="row-action" onClick={exportCSV}>Export Selected</button>
                  <button type="button" className="row-action">Copy Selected</button>
                  <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
                </>
              }
            />
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={allSelected} onChange={e => toggleSelectAll(e.target.checked)} /></th>
                    <th>Time</th>
                    <th>Severity</th>
                    <th>Category</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>IP Address</th>
                    <th>Entity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const cat = inferCategory(log.action);
                    const sev = inferSeverity(log.action);
                    const isSensitive = sev === "critical";
                    return (
                      <tr key={log.id} className={isSensitive ? "bg-[rgba(255,59,59,0.03)]" : sev === "warning" ? "bg-[rgba(245,158,11,0.03)]" : ""}>
                        <td><input type="checkbox" checked={selectedIds.includes(log.id)} onChange={e => toggleSelect(log.id, e.target.checked)} /></td>
                        <td className="whitespace-nowrap text-slate-400 text-sm">{formatDateTime(log.created_at)}</td>
                        <td><Chip tone={sev === "critical" ? "critical" : sev === "warning" ? "warning" : "info"}>{sev}</Chip></td>
                        <td>
                          <Chip tone={cat === "security" ? "critical" : cat === "admin" || cat === "incident" ? "warning" : "info"}>{cat}</Chip>
                        </td>
                        <td>
                          <Chip tone={sev === "critical" ? "critical" : sev === "warning" ? "warning" : "info"}>{log.action.replace(/_/g, " ")}</Chip>
                        </td>
                        <td>
                          <div>
                            <p className="font-semibold text-white text-sm">{log.actor?.full_name ?? "System"}</p>
                            {log.actor?.email && <p className="text-xs text-slate-400">{log.actor.email}</p>}
                          </div>
                        </td>
                        <td className="font-mono text-xs text-slate-300">{log.ip_address ?? "N/A"}</td>
                        <td className="text-sm text-slate-300">
                          {log.entity_type ? (
                            <>
                              <span className="text-slate-400">{log.entity_type}</span>
                              {log.entity_id && <span className="text-slate-500"> / {log.entity_id}</span>}
                            </>
                          ) : "N/A"}
                        </td>
                        <td>
                          <RowActions
                            items={[
                              { key: "view", label: <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />View Details</span>, onClick: () => setSelected(log), variant: "primary" },
                              { key: "copy", label: copiedId === log.id ? "Copied" : <span className="inline-flex items-center gap-1"><Copy className="h-3 w-3" />Copy Event</span>, onClick: () => copyToClipboard(JSON.stringify(sanitizeDetails(log.details)), log.id) },
                              { key: "filter", label: "Filter Similar", onClick: () => { setFilters(prev => ({ ...prev, action: log.action })); setApplied(prev => ({ ...prev, action: log.action })); setPage(1); } },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      ) : null}

      {/* Event Details Drawer */}
      {selected ? (
        <AppModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} size="lg" closeOnOverlayClick panelClassName="soc-panel-strong p-6">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">Audit Event #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="soc-button-ghost px-3 py-1">Close</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Action" value={selected.action.replace(/_/g, " ")} />
              <DetailField label="Category" value={inferCategory(selected.action)} capitalize />
              <DetailField label="Severity">
                <Chip tone={inferSeverity(selected.action) === "critical" ? "critical" : inferSeverity(selected.action) === "warning" ? "warning" : "info"}>
                  {inferSeverity(selected.action)}
                </Chip>
              </DetailField>
              <DetailField label="Timestamp" value={formatDateTime(selected.created_at)} />
              <DetailField label="Actor" value={selected.actor?.full_name ?? "System"} />
              <DetailField label="Actor Email" value={selected.actor?.email ?? "N/A"} />
              <DetailField label="Role" value={selected.actor?.role_name ?? "N/A"} capitalize />
              <DetailField label="IP Address" value={selected.ip_address ?? "N/A"} mono />
              <DetailField label="Entity Type" value={selected.entity_type ?? "N/A"} />
              <DetailField label="Entity ID" value={selected.entity_id ?? "N/A"} />
              <DetailField label="User Agent" value={selected.user_agent ?? "N/A"} />
            </div>

            {getEntityLink(selected.entity_type, selected.entity_id) && (
              <div className="mt-4 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5">
                <span className="text-sm text-slate-300">Related: </span>
                <a href={getEntityLink(selected.entity_type, selected.entity_id)!} className="text-sm text-cyan-400 hover:text-cyan-300 underline">
                  View {selected.entity_type} #{selected.entity_id}
                </a>
              </div>
            )}

            {selected.details && Object.keys(selected.details).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-white mb-3">Metadata</h3>
                <div className="rounded-xl bg-slate-950 p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(sanitizeDetails(selected.details)).map(([key, value]) => (
                        <tr key={key} className="border-b border-slate-800 last:border-0">
                          <td className="py-2 pr-4 text-slate-400 font-mono whitespace-nowrap">{key}</td>
                          <td className="py-2 text-slate-200 break-all">{typeof value === "object" ? JSON.stringify(value) : String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}

function DetailField({ label, value, capitalize, mono, children }: { label: string; value?: string; capitalize?: boolean; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {children ?? (
        <p className={`text-sm text-white ${capitalize ? "capitalize" : ""} ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}
