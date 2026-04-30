import { useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw, ShieldAlert, Target, Users, BellRing } from "lucide-react";
import { apiClient } from "../api/client";
import { AlertsTable } from "../components/AlertsTable";
import { Filters, type DashboardFilters } from "../components/Filters";
import { LogsTable } from "../components/LogsTable";
import { RiskDistributionChart } from "../components/RiskDistributionChart";
import { StatCard } from "../components/StatCard";
import { TimelineChart } from "../components/TimelineChart";

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
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[.3em] text-cyan-300">SOC Tier 1</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-3 text-sm text-slate-400">Monitor log volume, alerts, risk distribution, and recent security events.</p>
        </div>
        <button
          onClick={() => setRefreshTick(v => v + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </section>

      <Filters filters={filters} onChange={setFilters} onApply={() => setApplied(filters)} />

      {error ? <div className="rounded-2xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}

      {loading ? <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">Loading dashboard data...</div> : null}

      {!loading && !hasAnyData ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">
          No data available yet. Ingest logs or run demo seed data.
        </div>
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
              <div className="h-80 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">No timeline data available yet.</div>
            )}
            {risk.length > 0 ? (
              <RiskDistributionChart data={risk} />
            ) : (
              <div className="h-80 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">No risk distribution data available yet.</div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Top Attacked Users</h2>
            </div>
            {topUsers.length === 0 ? (
              <p className="text-sm text-slate-400">No data available yet. Ingest logs or run demo seed data.</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((user: any) => (
                  <div key={user.username} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
                    <span className="font-medium text-slate-100">{user.username}</span>
                    <span className="text-slate-400">Alerts: {user.alert_count ?? 0}</span>
                    <span className="text-slate-400">Logs: {user.log_count ?? 0}</span>
                    <span className="text-slate-400">Max Risk: {user.max_risk_score ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {events.length > 0 ? <LogsTable logs={events} /> : <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">No recent security events available yet.</div>}
          {alerts.length > 0 ? <AlertsTable alerts={alerts} /> : <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">No recent alerts available yet.</div>}
        </>
      ) : null}
    </div>
  );
}
