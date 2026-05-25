import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import {
  copyExecutiveSummary,
  exportScanJson,
  exportScanTxt,
  getWebsiteScanById,
  getWebsiteScanHistory,
  latestWebsiteScan,
  type StoredWebsiteScan,
} from "../features/mySecurity/scanHistory";

export function MyReportsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const history = useMemo(() => getWebsiteScanHistory(userId), [userId]);
  const latest = useMemo(() => latestWebsiteScan(userId), [userId]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(latest?.id ?? null);
  const selected = useMemo(
    () => (selectedScanId ? getWebsiteScanById(userId, selectedScanId) : latest),
    [latest, selectedScanId, userId],
  );

  const reports = history;

  if (!reports.length) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="User Security Portal" title="My Reports" description="Review readable security reports from your previous website scans." />
        <EmptyState
          title="No reports yet"
          description="Run a website scan to create your first security report."
          icon={<FileText className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="User Security Portal" title="My Reports" description="Review readable security reports from your previous website scans." />

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        PDF export is planned. TXT and JSON export are available.
      </div>

      <div className="soc-panel p-4">
        <div className="table-wrapper">
          <table className="tbl w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-[var(--text-muted)]">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Website</th>
                <th className="px-3 py-2">Risk Score</th>
                <th className="px-3 py-2">Risk Level</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((scan) => (
                <tr key={scan.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{new Date(scan.scan_date).toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-[var(--text-primary)]">{scan.hostname}</td>
                  <td className="px-3 py-2 text-sm text-[var(--text-primary)]">{scan.risk_score}/100</td>
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{scan.risk_level}</td>
                  <td className="px-3 py-2">
                    <RowActions
                      items={[
                        { key: "view", label: "View Report", onClick: () => setSelectedScanId(scan.id), variant: "primary" },
                        { key: "txt", label: "Export TXT", onClick: () => exportScanTxt(scan) },
                        { key: "json", label: "Export JSON", onClick: () => exportScanJson(scan) },
                        { key: "copy", label: "Copy Summary", onClick: () => void copyExecutiveSummary(scan) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <ReportView scan={selected} />
      ) : null}
    </div>
  );
}

function ReportView({ scan }: { scan: StoredWebsiteScan }) {
  const result = scan.full_result;

  return (
    <div className="soc-panel p-5 space-y-4">
      <h3 className="section-title">Latest Website Security Report</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <p className="text-sm text-[var(--text-muted)]"><span className="text-[var(--text-primary)]">Target URL:</span> {scan.target_url}</p>
        <p className="text-sm text-[var(--text-muted)]"><span className="text-[var(--text-primary)]">Scan Date:</span> {new Date(scan.scan_date).toLocaleString()}</p>
        <p className="text-sm text-[var(--text-muted)]"><span className="text-[var(--text-primary)]">Risk Score:</span> {scan.risk_score}/100</p>
        <p className="text-sm text-[var(--text-muted)]"><span className="text-[var(--text-primary)]">Risk Level:</span> {scan.risk_level}</p>
      </div>

      <div>
        <p className="text-xs uppercase text-[var(--text-muted)]">Executive Summary</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{scan.summary}</p>
      </div>

      <div>
        <p className="text-xs uppercase text-[var(--text-muted)]">Top Priorities</p>
        <ul className="mt-1 list-disc ml-5 text-sm text-[var(--text-muted)]">
          {(scan.top_priorities || []).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase text-[var(--text-muted)]">Findings by Severity</p>
        <div className="mt-2 text-sm text-[var(--text-muted)]">
          Critical: {scan.critical_count} | High: {scan.high_count} | Medium: {scan.medium_count} | Low/Info: {scan.low_count}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase text-[var(--text-muted)]">OWASP Mapping</p>
        <ul className="mt-1 list-disc ml-5 text-sm text-[var(--text-muted)]">
          {result.findings.slice(0, 8).map((item) => (
            <li key={item.id}>{item.owasp_category || "General"} - {item.title}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase text-[var(--text-muted)]">Fix Roadmap</p>
        <ul className="mt-1 list-disc ml-5 text-sm text-[var(--text-muted)]">
          {(result.roadmap || []).map((item) => <li key={`${item.priority}-${item.action}`}>P{item.priority}: {item.action}</li>)}
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase text-[var(--text-muted)]">Safety Model</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{result.safety_model.note}</p>
      </div>
    </div>
  );
}
