import { useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw, ShieldAlert, Target, Users, BellRing } from "lucide-react";
import { apiClient } from "../api/client";
import { AlertsTable } from "../components/AlertsTable";
import { Filters, type DashboardFilters } from "../components/Filters";
import { LogsTable } from "../components/LogsTable";
import { RiskDistributionChart } from "../components/RiskDistributionChart";
import { StatCard } from "../components/StatCard";
import { TimelineChart } from "../components/TimelineChart";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock } from "../components/UI";

const initialFilters: DashboardFilters = { severity: "", source: "", status: "" };

function query(filters: DashboardFilters) {
  const p = new URLSearchParams();
  if (filters.severity) p.set("severity", filters.severity);
  if (filters.source) p.set("source", filters.source);
  if (filters.status) p.set("status", filters.status);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [summary, setSummary] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [risk, setRisk] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    const q = query(applied);
    const topUsersUrl = `/dashboard/top-attacked-users${q ? `${q}&limit=5` : "?limit=5"}`;
    const recentEventsUrl = `/dashboard/recent-events${q ? `${q}&limit=10` : "?limit=10"}`;
    const settled = await Promise.allSettled([
      apiClient.get<any>(`/dashboard/summary${q}`),
      apiClient.get<any>(`/dashboard/alerts-timeline${q}`),
      apiClient.get<any>(`/dashboard/risk-distribution${q}`),
      apiClient.get<any>(topUsersUrl),
      apiClient.get<any>(recentEventsUrl),
      apiClient.get<any>("/alerts?limit=8"),
    ]);

    const [s, t, r, u, e, a] = settled;

    setSummary(s.status === "fulfilled" ? s.value : null);
    setTimeline(t.status === "fulfilled" && Array.isArray(t.value?.items) ? t.value.items : []);
    setRisk(r.status === "fulfilled" && Array.isArray(r.value?.items) ? r.value.items : []);
    setTopUsers(u.status === "fulfilled" && Array.isArray(u.value?.items) ? u.value.items : []);
    setEvents(e.status === "fulfilled" && Array.isArray(e.value?.items) ? e.value.items : []);
    setAlerts(a.status === "fulfilled" && Array.isArray(a.value?.items) ? a.value.items : []);

    const failures = settled.filter(item => item.status === "rejected").length;
    if (failures === settled.length) {
      setError("Failed to load dashboard data. Please try again.");
    } else if (failures > 0) {
      setError("Some dashboard sections could not be loaded. Showing available data.");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, [applied, refreshTick]);

  const hasAnyData =
    Boolean(summary) ||
    timeline.length > 0 ||
    risk.length > 0 ||
    topUsers.length > 0 ||
    events.length > 0 ||
    alerts.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SOC Tier 1"
        title="Dashboard"
        description="Monitor log volume, alert pressure, risk distribution, and recent security events from one command surface."
        icon={ShieldAlert}
        actions={
          <button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="soc-button-ghost">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <Filters filters={filters} onChange={setFilters} onApply={() => setApplied(filters)} />

      {error ? <ErrorState message={error} onRetry={() => setRefreshTick(v => v + 1)} /> : null}

      {loading ? (
        <div className="space-y-6">
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} className="h-36" />)}
          </section>
          <section className="grid gap-6 xl:grid-cols-2">
            <SkeletonBlock className="h-80" />
            <SkeletonBlock className="h-80" />
          </section>
        </div>
      ) : null}

      {!loading && !hasAnyData ? (
        <EmptyState title="No dashboard data yet" description="Ingest logs or seed demo data to populate metrics, timelines, and alert activity." />
      ) : null}

      {!loading && hasAnyData ? (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Total Logs" value={summary?.total_logs ?? 0} icon={Database} />
            <StatCard title="Total Alerts" value={summary?.total_alerts ?? 0} icon={AlertTriangle} />
            <StatCard title="Open Alerts" value={summary?.open_alerts ?? 0} icon={BellRing} />
            <StatCard title="Critical Alerts" value={summary?.critical_alerts ?? 0} icon={ShieldAlert} />
            <StatCard title="High Risk IPs" value={summary?.high_risk_ips ?? 0} icon={Target} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            {timeline.length > 0 ? (
              <TimelineChart data={timeline} />
            ) : (
              <div className="soc-panel h-80 p-5"><EmptyState title="No timeline data" description="Alert activity over time will appear here." /></div>
            )}
            {risk.length > 0 ? (
              <RiskDistributionChart data={risk} />
            ) : (
              <div className="soc-panel h-80 p-5"><EmptyState title="No risk distribution" description="Risk buckets will appear when scored events are available." /></div>
            )}
          </section>

          <section className="soc-panel p-5">
            <SectionHeader title="Top Attacked Users" icon={Users} />
            {topUsers.length === 0 ? (
              <EmptyState title="No targeted users yet" description="User targeting trends will appear after relevant alerts are created." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {topUsers.map((user: any) => (
                  <div key={user.username} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 px-4 py-3 text-sm">
                    <span className="font-bold text-slate-100">{user.username}</span>
                    <span className="text-slate-400">Alerts: {user.alert_count ?? 0}</span>
                    <span className="text-slate-400">Logs: {user.log_count ?? 0}</span>
                    <span className="text-slate-400">Max Risk: {user.max_risk_score ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {events.length > 0 ? <LogsTable logs={events} /> : <EmptyState title="No recent security events" description="Recent parsed security events will appear here." />}
          {alerts.length > 0 ? <AlertsTable alerts={alerts} /> : <EmptyState title="No recent alerts" description="New alerts will appear here as rules detect risky activity." />}
        </>
      ) : null}
    </div>
  );
}
