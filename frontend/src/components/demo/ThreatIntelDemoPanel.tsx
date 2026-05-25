import { Chip } from "../ui/Chip";

export function ThreatIntelDemoPanel() {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Threat Intelligence</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip tone="info">Mode: Local Demo Intelligence</Chip>
        <Chip tone="warning">Reputation: Suspicious</Chip>
        <Chip tone="warning">Confidence: Medium</Chip>
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Reason: Same source IP appears across endpoint probing, login failures, and restricted access attempts
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--text-muted)]">
        <li>Search IOC in Logs</li>
        <li>Link IOC to Incident</li>
        <li>Review related Alerts</li>
        <li>Apply temporary block</li>
      </ul>
    </section>
  );
}

