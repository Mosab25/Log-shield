import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertTriangle, Database, RefreshCw, ShieldAlert, Target, Users, BellRing } from "lucide-react";
import { apiClient } from "../api/client";
import { AlertsTable } from "../components/AlertsTable";
import { Filters, type DashboardFilters } from "../components/Filters";
import { LogsTable } from "../components/LogsTable";
import { RiskDistributionChart } from "../components/RiskDistributionChart";
import { StatCard } from "../components/StatCard";
import { TimelineChart } from "../components/TimelineChart";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock } from "../components/UI";
import { deriveAttackSignalFromText } from "../securitySignals";

const initialFilters: DashboardFilters = { severity: "", source: "", status: "" };
const FILE_ANALYSIS_STORAGE_KEY = "logshield.fileAnalyzer.findings";

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

export function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [summary, setSummary] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [risk, setRisk] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [scriptAttackSignals, setScriptAttackSignals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    const q = query(applied);
    const topUsersUrl = `/dashboard/top-attacked-users${q ? `${q}&limit=5` : "?limit=5"}`;
    const recentEventsUrl = `/dashboard/recent-events${q ? `${q}&limit=10` : "?limit=10"}`;
    
    // Progressive loading: Load critical data first
    try {
      // Phase 1: Load summary (most important)
      const summaryResult = await apiClient.get<any>(`/dashboard/summary${q}`);
      setSummary(summaryResult);
      setLoading(false); // Show UI immediately after summary loads
      
      // Phase 2: Load charts in parallel (less critical)
      setChartsLoading(true);
      const chartsPromise = Promise.allSettled([
        apiClient.get<any>(`/dashboard/alerts-timeline${q}`),
        apiClient.get<any>(`/dashboard/risk-distribution${q}`),
      ]);
      
      // Phase 3: Load secondary data
      setSecondaryLoading(true);
      const secondaryPromise = Promise.allSettled([
        apiClient.get<any>(topUsersUrl),
        apiClient.get<any>(recentEventsUrl),
        apiClient.get<any>("/alerts?limit=8"),
      ]);
      
      // Wait for charts
      const [t, r] = await chartsPromise;
      setTimeline(t.status === "fulfilled" && Array.isArray(t.value?.items) ? t.value.items : []);
      setRisk(r.status === "fulfilled" && Array.isArray(r.value?.items) ? r.value.items : []);
      setChartsLoading(false);
      
      // Wait for secondary data
      const [u, e, a] = await secondaryPromise;
      const topUsersItems = u.status === "fulfilled" && Array.isArray(u.value?.items) ? u.value.items : [];
      const eventItems = e.status === "fulfilled" && Array.isArray(e.value?.items) ? e.value.items : [];
      const alertItems = a.status === "fulfilled" && Array.isArray(a.value?.items) ? a.value.items : [];

      setTopUsers(topUsersItems);
      setEvents(eventItems);
      setAlerts(alertItems);

      const signalFromEvents = eventItems.filter((item: any) =>
        deriveAttackSignalFromText(item?.message, item?.raw_message, item?.event_type, item?.source, item?.user_agent).isAttack,
      ).length;
      const signalFromAlerts = alertItems.filter((item: any) =>
        deriveAttackSignalFromText(item?.title, item?.description, item?.source_ip, item?.username).isAttack,
      ).length;
      setScriptAttackSignals(signalFromEvents + signalFromAlerts + countLocalScriptSignals());
      setSecondaryLoading(false);
      
      // Check for any failures
      const settledResults = [t, r, u, e, a];
      const failures = settledResults.filter(item => item.status === "rejected").length;
      
      if (failures > 0) {
        const failedEndpoints = [];
        if (t.status === "rejected") failedEndpoints.push("timeline");
        if (r.status === "rejected") failedEndpoints.push("risk-distribution");
        if (u.status === "rejected") failedEndpoints.push("top-users");
        if (e.status === "rejected") failedEndpoints.push("recent-events");
        if (a.status === "rejected") failedEndpoints.push("alerts");
        
        console.error("Dashboard failed endpoints:", failedEndpoints);
        setError(`Some dashboard sections could not be loaded. Failed: ${failedEndpoints.join(", ")}. Showing available data.`);
      }
      
    } catch (error) {
      console.error("Critical dashboard error:", error);
      setError("Failed to load dashboard summary. Please try again.");
      setLoading(false);
      setChartsLoading(false);
      setSecondaryLoading(false);
    }
  }

  const debouncedLoadDashboard = useCallback(() => {
    void loadDashboard();
  }, [applied, refreshTick]);

  const hasAnyData = useMemo(() => {
    return Boolean(summary) ||
           timeline.length > 0 ||
           risk.length > 0 ||
           topUsers.length > 0 ||
           events.length > 0 ||
           alerts.length > 0;
  }, [summary, timeline, risk, topUsers, events, alerts]);

  useEffect(() => {
    debouncedLoadDashboard();
  }, [debouncedLoadDashboard]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SOC Tier 1"
        title="Dashboard"
        description="Monitor alerts, risk, incidents, failed activity, and suspicious behavior from one guided SOC command surface."
        icon={ShieldAlert}
        actions={
          <button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="soc-button-ghost">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <InfoHint title="What you are looking at">
        The dashboard is the fastest way to understand the current security posture. Use it to spot alert pressure, critical risk, recent evidence, and where to continue investigation.
      </InfoHint>

      <RecommendedActions
        actions={[
          "Review critical and high-risk alerts first.",
          "Open active incidents and confirm ownership.",
          "Check recent blocked IPs for repeated activity.",
          "Review failed login activity and targeted users.",
        ]}
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
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
            <StatCard title="Total Logs" value={summary?.total_logs ?? 0} icon={Database} />
            <StatCard title="Total Alerts" value={summary?.total_alerts ?? 0} icon={AlertTriangle} />
            <StatCard title="Open Alerts" value={summary?.open_alerts ?? 0} icon={BellRing} />
            <StatCard title="Critical Alerts" value={summary?.critical_alerts ?? 0} icon={ShieldAlert} />
            <StatCard title="High Risk IPs" value={summary?.high_risk_ips ?? 0} icon={Target} />
            <StatCard title="Script Attack Signals" value={scriptAttackSignals} icon={ShieldAlert} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            {chartsLoading ? (
              <>
                <SkeletonBlock className="h-80" />
                <SkeletonBlock className="h-80" />
              </>
            ) : (
              <>
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
              </>
            )}
          </section>

          <section className="soc-panel p-5">
            <SectionHeader title="Top Attacked Users" icon={Users} />
            {secondaryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-12" />)}
              </div>
            ) : (
              <>
                {topUsers.length === 0 ? (
                  <EmptyState title="No targeted users yet" description="User targeting trends will appear after relevant alerts are created." />
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {topUsers.map((user: any) => (
                      <div key={user.username} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 px-4 py-3 text-sm">
                        <span className="font-bold text-cyber-text">{user.username}</span>
                        <span className="text-cyber-muted">Alerts: {user.alert_count ?? 0}</span>
                        <span className="text-cyber-muted">Logs: {user.log_count ?? 0}</span>
                        <span className="text-cyber-muted">Max Risk: {user.max_risk_score ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {secondaryLoading ? (
            <div className="space-y-6">
              <SkeletonBlock className="h-40" />
              <SkeletonBlock className="h-40" />
            </div>
          ) : (
            <>
              {events.length > 0 ? <LogsTable logs={events} /> : <EmptyState title="No recent security events" description="Recent parsed security events will appear here." />}
              {alerts.length > 0 ? <AlertsTable alerts={alerts} /> : <EmptyState title="No recent alerts" description="New alerts will appear here as rules detect risky activity." />}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
