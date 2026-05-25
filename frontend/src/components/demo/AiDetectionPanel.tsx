import { Chip } from "../ui/Chip";

export function AiDetectionPanel() {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Detection</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip tone="critical">verdict: attack_detected</Chip>
        <Chip tone="warning">attack_type: web_attack</Chip>
        <Chip tone="critical">severity: critical</Chip>
        <Chip tone="info">confidence: 93%</Chip>
        <Chip tone="critical">risk_score: 94</Chip>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--text-muted)]">
        <li>Multiple sensitive endpoints were requested</li>
        <li>Repeated login failures against admin account</li>
        <li>Suspicious validation failures detected</li>
        <li>Same source IP across all events</li>
        <li>Restricted API paths accessed</li>
      </ul>
      <p className="mt-3 text-xs font-semibold text-[var(--text-primary)]">Recommended actions</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[var(--text-muted)]">
        <li>Review related logs</li>
        <li>Extract IOC</li>
        <li>Check threat intelligence</li>
        <li>Block source IP</li>
        <li>Open incident</li>
        <li>Generate investigation report</li>
      </ul>
    </section>
  );
}

