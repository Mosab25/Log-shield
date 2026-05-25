import { Chip } from "../ui/Chip";

export function IncidentDemoPanel() {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Incident</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)] md:grid-cols-2">
        <p>Incident ID: <b className="text-[var(--text-primary)]">INC-DEMO-001</b></p>
        <p>Linked Alert: <b className="text-[var(--text-primary)]">ALT-DEMO-001</b></p>
        <p>Source IP: <b className="text-[var(--text-primary)]">203.0.113.77</b></p>
        <p>Linked IOC: <b className="text-[var(--text-primary)]">203.0.113.77</b></p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip tone="critical">Severity: Critical</Chip>
        <Chip tone="safe">Status: Contained</Chip>
      </div>
      <p className="mt-2 text-xs text-[var(--text-primary)]">Simulated Website Attack Contained</p>
    </section>
  );
}

