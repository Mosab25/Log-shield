import { useEffect, useState } from "react";
import { AlertCircle, Clock3, Download, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { generateReportDraft, type AiAnalysisResult } from "../api/aiAnalysis";
import { API_BASE_URL, apiClient, tokenStorage, toUserErrorMessage } from "../api/client";
import { AiInsightCard } from "../components/ai/AiInsightCard";
import { AiReportDraft } from "../components/ai/AiReportDraft";
import { ReportFilters, type ReportFiltersValue } from "../components/ReportFilters";
import { Chip } from "../components/ui/Chip";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { RiskBadge } from "../components/RiskBadge";
import { EmptyState, ErrorState, SectionHeader, SkeletonBlock } from "../components/UI";

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
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

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
        throw new Error(body || `Report export failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logshield-report.${type}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to export report. Please try again."));
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

  async function generateAiDraft() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const sourceText = JSON.stringify(
        {
          summary,
          top_risky_ips: ips.slice(0, 10),
          targeted_users: users.slice(0, 10),
          alerts_by_severity: severity,
          open_vs_resolved: openVsResolved,
          mttr,
        },
        null,
        2,
      );
      const response = await generateReportDraft({
        title: `Reports ${applied.reportType}`,
        source_text: sourceText,
        context: "Reports page metrics",
      });
      setAiResult(response);
    } catch (err: any) {
      setAiError(toUserErrorMessage(err, "Failed to generate AI report draft."));
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="INVESTIGATION OUTPUT"
        title="Reports"
        description="Generate, review, and export investigation-ready security reports."
        actions={
          <>
          <button type="button" onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={() => void download("csv")} disabled={downloadType !== null} className="soc-button-ghost disabled:opacity-50">
            <Download className="mr-2 inline h-4 w-4" />
            {downloadType === "csv" ? "Downloading CSV..." : "CSV"}
          </button>
          <button type="button" onClick={() => void download("pdf")} disabled={downloadType !== null} className="soc-button-primary disabled:opacity-50">
            {downloadType === "pdf" ? "Downloading PDF..." : "PDF"}
          </button>
          </>
        }
      />

      <ReportFilters filters={filters} onChange={setFilters} onApply={() => setApplied(filters)} />

      <section className="soc-panel p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-200">AI Investigation Report Draft</p>
          <button type="button" onClick={() => void generateAiDraft()} disabled={aiBusy} className="soc-button-primary">
            {aiBusy ? "Generating..." : "Generate AI Report Draft"}
          </button>
        </div>
        {aiError ? <ErrorState message={aiError} /> : null}
      </section>
      {aiResult ? <AiInsightCard result={aiResult} title="AI Report Analysis" /> : null}
      {aiResult ? <AiReportDraft result={aiResult} /> : null}

      {error ? <ErrorState message={error} onRetry={() => setRefreshTick(v => v + 1)} /> : null}

      {loading ? <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-36" />)}</section> : null}

      {!loading && !hasAnyData ? (
        <EmptyState title="No report data yet" description="Ingest logs or seed demo data to populate report metrics and breakdowns." />
      ) : null}

      {!loading && hasAnyData ? (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Reports" value={metric("Normalized Logs")} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Generated This Week" value={metric("Total Alerts")} icon={<AlertCircle className="h-4 w-4" />} />
            <StatCard label="Open Incidents with Reports" value={metric("Critical Alerts")} icon={<ShieldAlert className="h-4 w-4" />} />
            <StatCard label="Exported Reports" value={mttr?.mean_time_to_resolve_hours ?? 0} icon={<Clock3 className="h-4 w-4" />} />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="soc-panel p-5">
              <SectionHeader title="Alerts by Severity" icon={ShieldAlert} />
              {severity.length === 0 ? (
                <EmptyState title="No severity data" description="Severity distribution will appear here." />
              ) : (
                severity.map(item => (
                  <div key={item.severity} className="mt-3 flex items-center justify-between gap-3">
                    <Chip tone={String(item.severity).toLowerCase() === "critical" || String(item.severity).toLowerCase() === "high" ? "critical" : String(item.severity).toLowerCase() === "medium" ? "warning" : "info"}>{item.severity}</Chip>
                    <b>{item.count}</b>
                  </div>
                ))
              )}
            </div>

            <div className="soc-panel p-5">
              <SectionHeader title="Top Risky IPs" icon={AlertCircle} />
              {ips.length === 0 ? (
                <EmptyState title="No risky IPs yet" description="High-risk IPs will appear here." />
              ) : (
                ips.map(item => (
                  <div key={item.ip_address} className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm">{item.ip_address}</span>
                    <RiskBadge score={item.max_risk_score} />
                  </div>
                ))
              )}
            </div>

            <div className="soc-panel p-5">
              <SectionHeader title="Most Targeted Users" icon={Clock3} />
              {users.length === 0 ? (
                <EmptyState title="No targeted users yet" description="User targeting patterns will appear here." />
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

          <section className="soc-panel p-5">
            <SectionHeader title="Open vs Resolved Alerts" icon={AlertCircle} />
            {openVsResolved ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">Open: <b className="text-white">{openVsResolved.open ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">Investigating: <b className="text-white">{openVsResolved.investigating ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">Escalated: <b className="text-white">{openVsResolved.escalated ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">Resolved: <b className="text-white">{openVsResolved.resolved ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">False Positive: <b className="text-white">{openVsResolved.false_positive ?? 0}</b></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">Total: <b className="text-white">{openVsResolved.total ?? 0}</b></div>
              </div>
            ) : (
              <EmptyState title="No resolution data yet" description="Alert status totals will appear here." />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
