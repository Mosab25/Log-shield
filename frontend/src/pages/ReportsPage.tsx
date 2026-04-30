import { useEffect, useState } from "react";
import { AlertCircle, Clock3, Download, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { API_BASE_URL, apiClient, tokenStorage } from "../api/client";
import { ReportCard } from "../components/ReportCard";
import { ReportFilters, type ReportFiltersValue } from "../components/ReportFilters";
import { RiskBadge } from "../components/RiskBadge";
import { SeverityBadge } from "../components/SeverityBadge";

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFiltersValue>({ reportType: "weekly" });
  const [applied, setApplied] = useState<ReportFiltersValue>({ reportType: "weekly" });
  const [summary, setSummary] = useState<any>(null);
  const [ips, setIps] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [severity, setSeverity] = useState<any[]>([]);
  const [openVsResolved, setOpenVsResolved] = useState<any>(null);
  const [mttr, setMttr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<"csv" | "pdf" | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);

    const settled = await Promise.allSettled([
      apiClient.get<any>(`/reports/${applied.reportType}`),
      apiClient.get<any>("/reports/top-risky-ips"),
      apiClient.get<any>("/reports/most-targeted-users"),
      apiClient.get<any>("/reports/alerts-by-severity"),
      apiClient.get<any>("/reports/open-vs-resolved"),
      apiClient.get<any>("/reports/mttr"),
    ]);

    const [s, i, u, se, ov, m] = settled;

    setSummary(s.status === "fulfilled" ? s.value : null);
    setIps(i.status === "fulfilled" && Array.isArray(i.value?.items) ? i.value.items : []);
    setUsers(u.status === "fulfilled" && Array.isArray(u.value?.items) ? u.value.items : []);
    setSeverity(se.status === "fulfilled" && Array.isArray(se.value?.items) ? se.value.items : []);
    setOpenVsResolved(ov.status === "fulfilled" ? ov.value : null);
    setMttr(m.status === "fulfilled" ? m.value : null);

    const failures = settled.filter(item => item.status === "rejected").length;
    if (failures === settled.length) {
      setError("Failed to load report data. Please try again.");
    } else if (failures > 0) {
      setError("Some report sections could not be loaded. Showing available data.");
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [applied, refreshTick]);

  async function download(type: "csv" | "pdf") {
    try {
      setDownloadType(type);
      const response = await fetch(`${API_BASE_URL}/reports/export/${type}`, {
        headers: { Authorization: `Bearer ${tokenStorage.getAccessToken() ?? ""}` },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logshield-report.${type}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Failed to download report.");
    } finally {
      setDownloadType(null);
    }
  }

  const metric = (name: string) => summary?.metrics?.find((m: any) => m.label === name)?.value ?? 0;
  const hasAnyData =
    Boolean(summary) ||
    ips.length > 0 ||
    users.length > 0 ||
    severity.length > 0 ||
    Boolean(openVsResolved) ||
    Boolean(mttr);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[.3em] text-cyan-300">Reports</p>
          <h1 className="mt-3 text-3xl font-bold">Security Reports</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => void download("csv")} disabled={downloadType !== null} className="rounded-2xl border border-slate-700 px-4 py-2 disabled:opacity-50">
            <Download className="mr-2 inline h-4 w-4" />
            {downloadType === "csv" ? "Downloading CSV..." : "CSV"}
          </button>
          <button onClick={() => void download("pdf")} disabled={downloadType !== null} className="rounded-2xl bg-cyan-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">
            {downloadType === "pdf" ? "Downloading PDF..." : "PDF"}
          </button>
        </div>
      </section>

      <ReportFilters filters={filters} onChange={setFilters} onApply={() => setApplied(filters)} />

      {error ? <div className="rounded-2xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}

      {loading ? <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">Loading report data...</div> : null}

      {!loading && !hasAnyData ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">
          No data available yet. Ingest logs or run demo seed data.
        </div>
      ) : null}

      {!loading && hasAnyData ? (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard title="Normalized Logs" value={metric("Normalized Logs")} icon={FileText} />
            <ReportCard title="Total Alerts" value={metric("Total Alerts")} icon={AlertCircle} />
            <ReportCard title="Critical Alerts" value={metric("Critical Alerts")} icon={ShieldAlert} />
            <ReportCard title="MTTR Hours" value={mttr?.mean_time_to_resolve_hours ?? 0} icon={Clock3} />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Alerts by Severity</h2>
              {severity.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No data available yet. Ingest logs or run demo seed data.</p>
              ) : (
                severity.map(item => (
                  <div key={item.severity} className="mt-3 flex items-center justify-between gap-3">
                    <SeverityBadge severity={item.severity} />
                    <b>{item.count}</b>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Top Risky IPs</h2>
              {ips.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No data available yet. Ingest logs or run demo seed data.</p>
              ) : (
                ips.map(item => (
                  <div key={item.ip_address} className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm">{item.ip_address}</span>
                    <RiskBadge score={item.max_risk_score} />
                  </div>
                ))
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Most Targeted Users</h2>
              {users.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No data available yet. Ingest logs or run demo seed data.</p>
              ) : (
                users.map(item => (
                  <div key={item.username} className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm">{item.username}</span>
                    <RiskBadge score={item.max_risk_score} />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Open vs Resolved Alerts</h2>
            {openVsResolved ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">Open: <b>{openVsResolved.open ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">Investigating: <b>{openVsResolved.investigating ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">Escalated: <b>{openVsResolved.escalated ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">Resolved: <b>{openVsResolved.resolved ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">False Positive: <b>{openVsResolved.false_positive ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">Total: <b>{openVsResolved.total ?? 0}</b></div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No data available yet. Ingest logs or run demo seed data.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
