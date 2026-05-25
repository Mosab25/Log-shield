import { Link } from "react-router-dom";
import { AlertTriangle, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { latestWebsiteScan, recommendationsFromScan } from "../features/mySecurity/scanHistory";

export function MySecurityPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const latestScan = useMemo(() => latestWebsiteScan(userId), [userId]);
  const recommendations = useMemo(() => recommendationsFromScan(latestScan, userId), [latestScan, userId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User Security Portal"
        title="My Security Overview"
        description="Understand your website security status, recent scans, open risks, and recommended actions."
      />

      {latestScan ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Website Risk Score" value={`${latestScan.risk_score}/100`} icon={<ShieldCheck className="h-4 w-4" />} />
            <StatCard label="Last Scan" value={new Date(latestScan.scan_date).toLocaleString()} icon={<Clock3 className="h-4 w-4" />} />
            <StatCard label="Critical Findings" value={<span className="text-[var(--status-critical)]">{latestScan.critical_count}</span>} icon={<AlertTriangle className="h-4 w-4" />} />
            <StatCard label="High Findings" value={<span className="text-[var(--status-warning)]">{latestScan.high_count}</span>} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="soc-panel p-5">
              <h3 className="section-title">Last Scan Details</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                <p><span className="text-[var(--text-primary)]">Website:</span> {latestScan.target_url}</p>
                <p><span className="text-[var(--text-primary)]">Risk Level:</span> {latestScan.risk_level}</p>
                <p><span className="text-[var(--text-primary)]">Findings:</span> {latestScan.findings_count}</p>
                <p className="text-xs">Local browser scan history is enabled for this device.</p>
              </div>
            </div>
            <div className="soc-panel p-5">
              <h3 className="section-title">Recommended Actions</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                {latestScan.top_priorities.slice(0, 3).map((item, index) => (
                  <p key={item}>
                    <span className="text-[var(--brand)]">{index + 1}.</span> {item}
                  </p>
                ))}
                {!latestScan.top_priorities.length ? <p>No priorities available from the latest scan yet.</p> : null}
              </div>
            </div>
          </div>

          <div className="soc-panel p-5">
            <h3 className="section-title">Next Step</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              What happened: {latestScan.summary}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Why it matters: Open findings can increase your exposure if they stay unresolved.
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              What to do next: Review recommendations and re-scan your website after fixes to track progress.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/tools?tool=website-security-analyzer" className="soc-button-primary">Analyze My Website</Link>
              <Link to="/scan-history" className="soc-button-ghost">Scan History</Link>
              <Link to="/my-reports" className="soc-button-ghost">My Reports</Link>
            </div>
          </div>

          {recommendations.length > 0 ? (
            <div className="soc-panel p-5">
              <h3 className="section-title">Open Recommendations</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                You currently have {recommendations.filter((item) => item.status === "open" || item.status === "in_progress").length} active recommendation(s).
              </p>
              <div className="mt-4">
                <Link to="/recommendations" className="soc-button-ghost">Open Recommendations Center</Link>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="No website scan has been completed yet."
          description="Start by scanning your website to generate your first security overview."
          icon={<Sparkles className="h-5 w-5" />}
          action={<Link to="/tools?tool=website-security-analyzer" className="soc-button-primary">Analyze My Website</Link>}
        />
      )}
    </div>
  );
}
