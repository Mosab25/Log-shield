import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Ban,
  Bell,
  Code,
  ExternalLink,
  FileText,
  Globe,
  LogIn,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  type LucideProps,
} from "lucide-react";

import { apiClient } from "../api/client";
import { BRAND } from "../config/branding";
import { type DashboardFilters } from "../components/Filters";
import { ChartCard } from "../components/charts/ChartCard";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { Skeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/ui/StatCard";
import { deriveAttackSignalFromText } from "../securitySignals";

const initialFilters: DashboardFilters = { severity: "", source: "", status: "" };
const FILE_ANALYSIS_STORAGE_KEY = "logshield.fileAnalyzer.findings";
const TimelineChart = lazy(() => import("../components/charts/TimelineChart").then(module => ({ default: module.TimelineChart })));
const RiskDistributionChart = lazy(() => import("../components/charts/RiskDistributionChart").then(module => ({ default: module.RiskDistributionChart })));

type IconComponent = ComponentType<LucideProps>;
type Tone = "brand" | "warning" | "critical" | "safe" | "neutral";

const toneText: Record<Tone, string> = {
  brand: "text-[var(--brand)]",
  warning: "text-[var(--status-warning)]",
  critical: "text-[var(--status-critical)]",
  safe: "text-[var(--status-safe)]",
  neutral: "text-[var(--text-muted)]",
};

const toneBg: Record<Tone, string> = {
  brand: "bg-[var(--brand-soft)]",
  warning: "bg-[color:color-mix(in_srgb,var(--status-warning)_14%,transparent)]",
  critical: "bg-[color:color-mix(in_srgb,var(--status-critical)_14%,transparent)]",
  safe: "bg-[color:color-mix(in_srgb,var(--status-safe)_12%,transparent)]",
  neutral: "bg-[color:color-mix(in_srgb,var(--text-muted)_10%,transparent)]",
};

const toneBorder: Record<Tone, string> = {
  brand: "border-[var(--border-accent)]",
  warning: "border-[color:color-mix(in_srgb,var(--status-warning)_35%,transparent)]",
  critical: "border-[color:color-mix(in_srgb,var(--status-critical)_35%,transparent)]",
  safe: "border-[color:color-mix(in_srgb,var(--status-safe)_30%,transparent)]",
  neutral: "border-[var(--border)]",
};

function countLocalScriptSignals(): number {
  try {
    const raw = localStorage.getItem(FILE_ANALYSIS_STORAGE_KEY);
    const findings = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(findings)) return 0;
    return findings.filter((finding: any) =>
      deriveAttackSignalFromText(
        finding?.attack_name,
        finding?.classification,
        finding?.event_type,
        finding?.risk_reasons?.join?.(" "),
      ).isAttack,
    ).length;
  } catch {
    return 0;
  }
}

function query(filters: DashboardFilters) {
  const p = new URLSearchParams();
  if (filters.severity) p.set("severity", filters.severity);
  if (filters.source) p.set("source", filters.source);
  if (filters.status) p.set("status", filters.status);
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function fetchDashboardCharts(filters: DashboardFilters) {
  const q = query(filters);
  const [timelineResult, riskResult] = await Promise.allSettled([
    apiClient.get<any>(`/dashboard/alerts-timeline${q}`),
    apiClient.get<any>(`/dashboard/risk-distribution${q}`),
  ]);

  const failedEndpoints: string[] = [];
  if (timelineResult.status === "rejected") failedEndpoints.push("timeline");
  if (riskResult.status === "rejected") failedEndpoints.push("risk-distribution");

  return {
    timeline: timelineResult.status === "fulfilled" && Array.isArray(timelineResult.value?.items) ? timelineResult.value.items : [],
    risk: riskResult.status === "fulfilled" && Array.isArray(riskResult.value?.items) ? riskResult.value.items : [],
    failedEndpoints,
  };
}

async function fetchDashboardSecondary(filters: DashboardFilters) {
  const q = query(filters);
  const topUsersUrl = `/dashboard/top-attacked-users${q ? `${q}&limit=5` : "?limit=5"}`;
  const recentEventsUrl = `/dashboard/recent-events${q ? `${q}&limit=10` : "?limit=10"}`;
  const [topUsersResult, eventsResult, alertsResult] = await Promise.allSettled([
    apiClient.get<any>(topUsersUrl),
    apiClient.get<any>(recentEventsUrl),
    apiClient.get<any>("/alerts?limit=8"),
  ]);

  const topUsers = topUsersResult.status === "fulfilled" && Array.isArray(topUsersResult.value?.items) ? topUsersResult.value.items : [];
  const events = eventsResult.status === "fulfilled" && Array.isArray(eventsResult.value?.items) ? eventsResult.value.items : [];
  const alerts = alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value?.items) ? alertsResult.value.items : [];
  const failedEndpoints: string[] = [];

  if (topUsersResult.status === "rejected") failedEndpoints.push("top-users");
  if (eventsResult.status === "rejected") failedEndpoints.push("recent-events");
  if (alertsResult.status === "rejected") failedEndpoints.push("alerts");

  const signalFromEvents = events.filter((item: any) =>
    deriveAttackSignalFromText(item?.message, item?.raw_message, item?.event_type, item?.source, item?.user_agent).isAttack,
  ).length;
  const signalFromAlerts = alerts.filter((item: any) =>
    deriveAttackSignalFromText(item?.title, item?.description, item?.source_ip, item?.username).isAttack,
  ).length;

  return {
    topUsers,
    events,
    alerts,
    scriptAttackSignals: signalFromEvents + signalFromAlerts + countLocalScriptSignals(),
    failedEndpoints,
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function riskTone(score: number): Tone {
  if (score > 70) return "critical";
  if (score > 40) return "warning";
  return "safe";
}

function severityTone(severity: string | null | undefined): Tone {
  const normalized = String(severity ?? "").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "critical";
  if (normalized === "medium") return "warning";
  if (normalized === "low") return "brand";
  return "neutral";
}

function statusTone(status: string | null | undefined): Tone {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "resolved" || normalized === "closed") return "safe";
  if (normalized === "open") return "warning";
  if (normalized === "investigating" || normalized === "in_progress") return "brand";
  return "neutral";
}

function initials(value: string | null | undefined) {
  const safe = String(value || "User").trim();
  return safe
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "U";
}

function labelize(value: string | null | undefined) {
  if (!value) return "-";
  return String(value).replace(/_/g, " ");
}

function SectionHeader({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      {to ? (
        <Link to={to} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--brand)]">
          View All
          <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

function EmptySection({ icon: Icon, title, subtitle }: { icon: IconComponent; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/40 px-4 py-8 text-center">
      <Icon className="h-7 w-7 text-[var(--text-faint)]" />
      <p className="mt-3 text-[13px] font-semibold text-[var(--text-muted)]">{title}</p>
      <p className="mt-1 max-w-sm text-[11px] leading-5 text-[var(--text-faint)]">{subtitle}</p>
    </div>
  );
}

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`soc-skeleton ${className}`} />;
}

function severityChipTone(severity: string | null | undefined) {
  const normalized = String(severity ?? "").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "critical" as const;
  if (normalized === "medium") return "warning" as const;
  if (normalized === "low") return "info" as const;
  return "neutral" as const;
}

function statusChipTone(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "resolved" || normalized === "closed") return "safe" as const;
  if (normalized === "open") return "warning" as const;
  if (normalized === "investigating" || normalized === "in_progress") return "info" as const;
  return "neutral" as const;
}

function RiskBar({ score }: { score: number }) {
  const tone = riskTone(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className={`h-full origin-left rounded-full ${toneBg[tone]}`} style={{ transform: `scaleX(${Math.max(0, Math.min(100, score)) / 100})` }} />
      </div>
      <span className={`text-[11px] font-semibold ${toneText[tone]}`}>{score}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subLabel,
  icon: Icon,
  tone,
  alert,
}: {
  label: string;
  value: number;
  subLabel: string;
  icon: IconComponent;
  tone: Tone;
  alert?: boolean;
}) {
  return (
    <StatCard
      label={label}
      value={<span className={alert ? toneText.critical : "text-[var(--text-primary)]"}>{value.toLocaleString()}</span>}
      hint={subLabel}
      icon={<Icon className={`h-4 w-4 ${toneText[tone]}`} />}
      className={alert ? "border-[color:color-mix(in_srgb,var(--status-critical)_35%,transparent)]" : ""}
    />
  );
}

function RecommendedChip({
  to,
  icon: Icon,
  label,
  activeCritical = false,
}: {
  to: string;
  icon: IconComponent;
  label: string;
  activeCritical?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-md border bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] ${
        activeCritical ? "border-[color:color-mix(in_srgb,var(--status-critical)_35%,transparent)]" : "border-[var(--border)]"
      }`}
    >
      {activeCritical ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-critical)]" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="min-w-[120px] rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] outline-none transition focus:border-[var(--border-accent)]"
      >
        {children}
      </select>
    </label>
  );
}

function TopUsersSection({ users, loading }: { users: any[]; loading: boolean }) {
  return (
    <section>
      <SectionHeader title="Top Attacked Users" subtitle="Users with highest alert and log activity" to="/logs?tab=normalized" />
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonBox key={index} className="h-32 min-w-[180px] rounded-lg" />)
          ) : users.length === 0 ? (
            <div className="w-full">
              <EmptySection icon={Users} title="No attacked users yet" subtitle="User targeting trends will appear after alerts and logs are correlated." />
            </div>
          ) : (
            users.map((user: any, index: number) => {
              const maxRisk = Number(user.max_risk_score ?? 0);
              const tone = riskTone(maxRisk);
              return (
                <article key={user.username ?? user.email ?? index} className="min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-[14px] py-3 sm:min-w-[180px]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-bold text-[var(--brand)]">
                      {initials(user.username ?? user.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{user.username ?? "Unknown user"}</p>
                      <p className="truncate text-[11px] text-[var(--text-faint)]">{user.email ?? user.role ?? "Observed account"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                    <span className="text-[var(--text-muted)]">Alerts <b className="text-[var(--status-warning)]">{user.alert_count ?? 0}</b></span>
                    <span className="text-[var(--text-muted)]">Logs <b className="text-[var(--brand)]">{user.log_count ?? 0}</b></span>
                    <span className="text-[var(--text-muted)]">Risk <b className={toneText[tone]}>{maxRisk}</b></span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, row) => (
        <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(5rem, 1fr))` }}>
          {Array.from({ length: columns }).map((__, col) => <SkeletonBox key={col} className="h-4 rounded" />)}
        </div>
      ))}
    </div>
  );
}

function RecentEventsTable({ events, loading }: { events: any[]; loading: boolean }) {
  const rows = events.slice(0, 8);
  return (
    <section>
      <SectionHeader title="Recent Security Events" to="/logs?tab=normalized" />
      <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)]">
        {loading ? (
          <TableSkeleton columns={6} />
        ) : rows.length === 0 ? (
          <div className="p-4"><EmptySection icon={Search} title="No security events yet" subtitle="Recent parsed security events will appear here as telemetry is ingested." /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="tbl min-w-[760px] w-full text-left">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  <tr>
                    <th className="sticky left-0 bg-[var(--bg-elevated)] px-4 py-3">Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Source IP</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="col-hide-mobile hidden px-4 py-3 md:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[var(--text-primary)]">
                  {rows.map((item: any) => (
                    <tr key={item.id ?? `${item.timestamp}-${item.message}`} className="border-t border-[var(--border)] transition hover:bg-[color:color-mix(in_srgb,var(--brand)_3%,transparent)]">
                      <td className="sticky left-0 bg-[var(--bg-surface)] px-4 py-3 text-[var(--text-muted)]">{formatDate(item.timestamp ?? item.created_at ?? item.received_at)}</td>
                      <td className="px-4 py-3 font-semibold">{labelize(item.event_label ?? item.event_type ?? item.category)}</td>
                      <td className="px-4 py-3 font-mono text-[var(--text-muted)]">{item.ip_address ?? item.source_ip ?? item.src_ip ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.username ?? item.user ?? "-"}</td>
                      <td className="px-4 py-3"><Chip tone={severityChipTone(item.severity)}>{labelize(item.severity)}</Chip></td>
                      <td className="col-hide-mobile hidden max-w-[26rem] px-4 py-3 text-[var(--text-muted)] md:table-cell">
                        <p className="line-clamp-1">{item.message ?? item.raw_message ?? "-"}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3">
              <Link to="/logs?tab=normalized" className="text-[11px] font-semibold text-[var(--brand)] hover:text-[var(--text-primary)]">View More</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function RecentAlertsTable({ alerts, loading }: { alerts: any[]; loading: boolean }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const rows = alerts.slice(0, 8);
  return (
    <section>
      <SectionHeader title="Recent Alerts" to="/alerts" />
      <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)]">
        {loading ? (
          <TableSkeleton columns={7} />
        ) : rows.length === 0 ? (
          <div className="p-4"><EmptySection icon={Bell} title="No recent alerts yet" subtitle="New alerts will appear here as rules detect risky activity." /></div>
        ) : (
          <>
            <BulkBar
              active={selectedIds.length > 0}
              selectedCount={selectedIds.length}
              actions={
                <>
                  <button type="button" className="row-action" disabled title="This action is not configured yet.">Acknowledge Selected</button>
                  <button type="button" className="row-action" disabled title="This action is not configured yet.">Export Selected</button>
                  <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
                </>
              }
            />
            <div className="table-wrapper">
              <table className="tbl min-w-[900px] w-full text-left">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  <tr>
                    <th className="px-4 py-3" />
                    <th className="sticky left-0 bg-[var(--bg-elevated)] px-4 py-3">Time</th>
                    <th className="px-4 py-3">Alert Name</th>
                    <th className="col-hide-mobile px-4 py-3">Source</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Risk Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="hidden px-4 py-3 md:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[var(--text-primary)]">
                  {rows.map((alert: any) => {
                    const score = Number(alert.risk_score ?? 0);
                    const sev = String(alert.severity || "").toLowerCase();
                    const status = String(alert.status || "").toLowerCase();
                    const rowStyle = sev === "critical"
                      ? { backgroundColor: "rgba(255,59,59,0.03)" }
                      : sev === "high"
                        ? { backgroundColor: "rgba(245,158,11,0.03)" }
                        : undefined;
                    return (
                      <tr key={alert.id ?? alert.title} className="border-t border-[var(--border)] transition hover:bg-[color:color-mix(in_srgb,var(--brand)_3%,transparent)]" style={rowStyle}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(alert.id)}
                            onChange={event => setSelectedIds(prev => event.target.checked ? [...prev, alert.id] : prev.filter(id => id !== alert.id))}
                          />
                        </td>
                        <td className="sticky left-0 bg-[var(--bg-surface)] px-4 py-3 text-[var(--text-muted)]">{formatDate(alert.created_at ?? alert.updated_at ?? alert.timestamp)}</td>
                        <td className="px-4 py-3 font-semibold">{alert.title ?? "Untitled alert"}</td>
                        <td className="col-hide-mobile px-4 py-3 text-[var(--text-muted)]">{alert.source_ip ?? alert.source ?? alert.username ?? "-"}</td>
                        <td className="px-4 py-3"><Chip tone={severityChipTone(alert.severity)}>{labelize(alert.severity)}</Chip></td>
                        <td className="px-4 py-3"><RiskBar score={score} /></td>
                        <td className="px-4 py-3"><Chip tone={statusChipTone(alert.status)}>{labelize(alert.status)}</Chip></td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <RowActions
                            items={[
                              { key: "investigate", label: "Investigate", variant: "primary" as const, onClick: () => { window.location.href = `/alerts/${alert.id}`; } },
                              ...(status === "open"
                                ? [{ key: "ack", label: "Acknowledge", disabled: true, title: "This action is not configured yet." }]
                                : []),
                              ...(status === "investigating" || status === "in_progress"
                                ? [{ key: "resolve", label: "Resolve", variant: "success" as const, disabled: true, title: "This action is not configured yet." }]
                                : []),
                              ...(status === "resolved" ? [{ key: "view", label: "View" }] : []),
                            ].slice(0, 3)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3">
              <Link to="/alerts" className="text-[11px] font-semibold text-[var(--brand)] hover:text-[var(--text-primary)]">View More</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 20 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} height={80} borderRadius={10} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Skeleton height={200} borderRadius={10} />
        <Skeleton height={200} borderRadius={10} />
      </div>
      <Skeleton height={300} borderRadius={10} />
    </div>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", applied],
    queryFn: () => apiClient.get<any>(`/dashboard/summary${query(applied)}`),
  });
  const chartsQuery = useQuery({
    queryKey: ["dashboard", "charts", applied],
    queryFn: () => fetchDashboardCharts(applied),
  });
  const secondaryQuery = useQuery({
    queryKey: ["dashboard", "secondary", applied],
    queryFn: () => fetchDashboardSecondary(applied),
  });

  const summary = summaryQuery.data ?? null;
  const timeline = chartsQuery.data?.timeline ?? [];
  const risk = chartsQuery.data?.risk ?? [];
  const topUsers = secondaryQuery.data?.topUsers ?? [];
  const events = secondaryQuery.data?.events ?? [];
  const alerts = secondaryQuery.data?.alerts ?? [];
  const scriptAttackSignals = secondaryQuery.data?.scriptAttackSignals ?? countLocalScriptSignals();
  const criticalAlerts = Number(summary?.critical_alerts ?? 0);
  const totalEvents = Number(summary?.total_logs ?? events.length);
  const failedEndpoints = [...(chartsQuery.data?.failedEndpoints ?? []), ...(secondaryQuery.data?.failedEndpoints ?? [])];
  const error = summaryQuery.error instanceof Error
    ? "Failed to load dashboard summary. Please try again."
    : failedEndpoints.length > 0
      ? `Some dashboard sections could not be loaded. Failed: ${failedEndpoints.join(", ")}. Showing available data.`
      : null;

  const metrics = useMemo(() => [
    { label: "Total Logs", value: Number(summary?.total_logs ?? 0), subLabel: "Events indexed", icon: FileText, tone: "brand" as Tone },
    { label: "Total Alerts", value: Number(summary?.total_alerts ?? 0), subLabel: "Signals detected", icon: Bell, tone: "warning" as Tone },
    { label: "Open Alerts", value: Number(summary?.open_alerts ?? 0), subLabel: "Need triage", icon: AlertCircle, tone: "warning" as Tone },
    { label: "Critical Alerts", value: criticalAlerts, subLabel: "Immediate review", icon: ShieldAlert, tone: "critical" as Tone, alert: criticalAlerts > 0 },
    { label: "High Risk IPs", value: Number(summary?.high_risk_ips ?? 0), subLabel: "Risk above threshold", icon: Globe, tone: "critical" as Tone },
    { label: "Script Attack Signals", value: scriptAttackSignals, subLabel: "Detected patterns", icon: Code, tone: "warning" as Tone },
  ], [criticalAlerts, scriptAttackSignals, summary]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.time("dashboard-load");
    return () => {
      console.timeEnd("dashboard-load");
    };
  }, []);

  async function refreshDashboard() {
    apiClient.invalidateCache("/dashboard");
    apiClient.invalidateCache("/alerts");
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  function updateFilter(field: keyof DashboardFilters, value: string) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    setApplied(next);
  }

  return (
    <div className="space-y-5 px-0 py-0 text-[var(--text-primary)] dashboard-page">
      <PageHeader
        eyebrow={BRAND.overviewEyebrow}
        title="Dashboard"
        description="Monitor alerts, risk trends, incidents, and defensive activity."
        actions={
          <button
            type="button"
            onClick={() => void refreshDashboard()}
            disabled={summaryQuery.isFetching || chartsQuery.isFetching || secondaryQuery.isFetching}
            className="soc-button-ghost"
          >
            <RefreshCw className={`h-4 w-4 ${summaryQuery.isFetching || chartsQuery.isFetching || secondaryQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <section className="dashboard-recommended flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 lg:flex-row lg:items-center">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Recommended</span>
        <div className="flex flex-wrap gap-2">
          <RecommendedChip to="/alerts?severity=critical" icon={ShieldAlert} label="Review Critical Alerts" activeCritical={criticalAlerts > 0} />
          <RecommendedChip to="/incidents?status=open" icon={AlertCircle} label="Check Open Incidents" />
          <RecommendedChip to="/blocks" icon={Ban} label="Review Blocked IPs" />
          <RecommendedChip to="/logs?tab=normalized&event_type=failed_login" icon={LogIn} label="Failed Login Attempts" />
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Link to="/logs" className="row-action primary justify-center">Logs</Link>
        <Link to="/alerts" className="row-action primary justify-center">Alerts</Link>
        <Link to="/incidents" className="row-action primary justify-center">Incidents</Link>
        <Link to="/tools" className="row-action primary justify-center">{BRAND.toolkitName}</Link>
        <Link to="/url-scanner" className="row-action primary justify-center">URL Scanner</Link>
        <Link to="/demo" className="row-action success justify-center">Start Guided Demo</Link>
      </section>

      <FilterRow className="bg-[var(--bg-secondary)]/40">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterSelect label="Severity" value={filters.severity} onChange={value => updateFilter("severity", value)}>
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </FilterSelect>
          <FilterSelect label="Source" value={filters.source} onChange={value => updateFilter("source", value)}>
            <option value="">All</option>
            <option value="firewall">Firewall</option>
            <option value="ids">IDS</option>
            <option value="auth">Auth</option>
            <option value="web">Web</option>
          </FilterSelect>
          <FilterSelect label="Status" value={filters.status} onChange={value => updateFilter("status", value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="investigating">In Progress</option>
          </FilterSelect>
        </div>
        <p className="text-[11px] text-[var(--text-faint)]">Showing {totalEvents.toLocaleString()} events</p>
      </FilterRow>

      {error ? (
        <div className="rounded-[10px] border border-[color:color-mix(in_srgb,var(--status-warning)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--status-warning)_10%,transparent)] px-4 py-3 text-xs text-[var(--status-warning)]">
          {error}
        </div>
      ) : null}

      <section className="stats-grid grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {summaryQuery.isLoading
          ? Array.from({ length: 6 }).map((_, index) => <SkeletonBox key={index} className="h-[126px] rounded-[10px]" />)
          : metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="charts-row grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartCard title="Alerts timeline" subtitle="Alert volume over time" className="chart-card">
          {chartsQuery.isLoading ? (
            <SkeletonBox className="h-[180px] rounded-lg" />
          ) : (
            <Suspense fallback={<SkeletonBox className="h-[180px] rounded-lg" />}>
              <TimelineChart data={timeline} />
            </Suspense>
          )}
        </ChartCard>
        <ChartCard title="Risk distribution" subtitle="Current risk buckets" className="chart-card">
          {chartsQuery.isLoading ? (
            <SkeletonBox className="h-[180px] rounded-lg" />
          ) : (
            <Suspense fallback={<SkeletonBox className="h-[180px] rounded-lg" />}>
              <RiskDistributionChart data={risk} />
            </Suspense>
          )}
        </ChartCard>
      </section>

      <TopUsersSection users={topUsers} loading={secondaryQuery.isLoading} />
      <RecentEventsTable events={events} loading={secondaryQuery.isLoading} />
      <RecentAlertsTable alerts={alerts} loading={secondaryQuery.isLoading} />
    </div>
  );
}
