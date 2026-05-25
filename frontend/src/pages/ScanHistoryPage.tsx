import { useMemo, useState } from "react";
import { Activity, History } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { StatCard } from "../components/ui/StatCard";
import {
  compareLatestTwoByHostname,
  deleteWebsiteScan,
  exportScanComparisonJson,
  exportScanComparisonTxt,
  exportScanJson,
  exportScanTxt,
  getWebsiteScanHistory,
  type StoredWebsiteScan,
} from "../features/mySecurity/scanHistory";

export function ScanHistoryPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedScan, setSelectedScan] = useState<StoredWebsiteScan | null>(null);
  const history = useMemo(() => getWebsiteScanHistory(userId), [userId, refreshTick]);
  const latest = history[0] ?? null;
  const comparison = useMemo(() => (latest ? compareLatestTwoByHostname(userId, latest.hostname) : null), [latest, userId, refreshTick]);

  const averageRisk = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.risk_score, 0) / history.length)
    : 0;

  function handleDelete(item: StoredWebsiteScan) {
    if (!window.confirm("Delete this local scan history item?")) return;
    deleteWebsiteScan(userId, item.id);
    setRefreshTick((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User Security Portal"
        title="Scan History"
        description="Review previous website scans, export reports, and track improvement over time."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Scans" value={history.length} icon={<History className="h-4 w-4" />} />
        <StatCard label="Average Risk Score" value={history.length ? `${averageRisk}/100` : "N/A"} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Latest Website" value={latest?.hostname || "No scans"} />
      </div>

      {!history.length ? (
        <EmptyState
          title="No scan history yet"
          description="Run a website scan to start your local browser scan history."
          icon={<History className="h-5 w-5" />}
        />
      ) : (
        <>
          <div className="soc-panel p-4">
            <div className="mb-3 text-xs text-[var(--text-muted)]">Local browser scan history</div>
            <div className="table-wrapper">
              <table className="tbl w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-[var(--text-muted)]">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Website</th>
                    <th className="px-3 py-2">Risk Score</th>
                    <th className="px-3 py-2">Risk Level</th>
                    <th className="px-3 py-2">Findings</th>
                    <th className="px-3 py-2">Critical/High</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{new Date(item.scan_date).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm text-[var(--text-primary)]">{item.hostname}</td>
                      <td className="px-3 py-2 text-sm text-[var(--text-primary)]">{item.risk_score}/100</td>
                      <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{item.risk_level}</td>
                      <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{item.findings_count}</td>
                      <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{item.critical_count}/{item.high_count}</td>
                      <td className="px-3 py-2">
                        <RowActions
                          items={[
                            { key: "view", label: "View Report", onClick: () => setSelectedScan(item) },
                            { key: "txt", label: "Export TXT", onClick: () => exportScanTxt(item) },
                            { key: "json", label: "Export JSON", onClick: () => exportScanJson(item) },
                            { key: "delete", label: "Delete", onClick: () => handleDelete(item), variant: "danger" },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="soc-panel p-5">
            <h3 className="section-title">Scan Comparison</h3>
            {comparison ? (
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                <p>Risk Score: {comparison.previous.risk_score} -&gt; {comparison.latest.risk_score}</p>
                <p>
                  {comparison.risk_delta < 0
                    ? `Improved by ${Math.abs(comparison.risk_delta)} point(s).`
                    : comparison.risk_delta > 0
                      ? `Risk increased by ${comparison.risk_delta} point(s).`
                      : "Risk score did not change."}
                </p>
                <p>Critical findings change: {comparison.critical_delta}</p>
                <p>High findings change: {comparison.high_delta}</p>
                <p>Total findings change: {comparison.findings_delta}</p>

                <div>
                  <p className="text-[var(--text-primary)]">Fixed findings (not observed in latest scan):</p>
                  {comparison.fixed.length ? (
                    <ul className="ml-4 mt-1 list-disc">
                      {comparison.fixed.slice(0, 5).map((item) => <li key={item.id}>{item.title}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1">No fixed findings detected in this pair.</p>
                  )}
                </div>

                <div>
                  <p className="text-[var(--text-primary)]">Still open findings:</p>
                  {comparison.still_open.length ? (
                    <ul className="ml-4 mt-1 list-disc">
                      {comparison.still_open.slice(0, 5).map((item) => <li key={item.id}>{item.title}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1">No still-open findings detected in this pair.</p>
                  )}
                </div>

                <div>
                  <p className="text-[var(--text-primary)]">New findings:</p>
                  {comparison.added.length ? (
                    <ul className="ml-4 mt-1 list-disc">
                      {comparison.added.slice(0, 5).map((item) => <li key={item.id}>{item.title}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1">No new findings detected in this pair.</p>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="soc-button-ghost" onClick={() => exportScanComparisonTxt(comparison)}>
                    Export Comparison TXT
                  </button>
                  <button type="button" className="soc-button-ghost" onClick={() => exportScanComparisonJson(comparison)}>
                    Export Comparison JSON
                  </button>
                </div>

                <p className="text-xs">
                  Comparison is based on findings observed by the safe Website Security Analyzer. A finding marked as fixed means it was not observed in the latest scan, not that the entire website is guaranteed secure.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">Run another scan later to compare progress.</p>
            )}
          </div>

          {selectedScan ? (
            <div className="soc-panel p-5">
              <h3 className="section-title">Selected Report</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Website: {selectedScan.target_url} | Risk: {selectedScan.risk_score}/100 ({selectedScan.risk_level})
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">What happened: {selectedScan.summary}</p>
              <div className="mt-3">
                <p className="text-xs uppercase text-[var(--text-muted)]">Top priorities</p>
                <ul className="ml-5 mt-1 list-disc text-sm text-[var(--text-muted)]">
                  {(selectedScan.top_priorities || []).slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
