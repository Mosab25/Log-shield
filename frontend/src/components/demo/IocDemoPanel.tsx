import { Chip } from "../ui/Chip";

export function IocDemoPanel() {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">IOC Extraction</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)] md:grid-cols-2">
        <p>IOC: <b className="text-[var(--text-primary)]">203.0.113.77</b></p>
        <p>Type: <b className="text-[var(--text-primary)]">IPv4</b></p>
        <p>Defanged: <b className="text-[var(--text-primary)]">203[.]0[.]113[.]77</b></p>
        <p>Linked Alert: <b className="text-[var(--text-primary)]">ALT-DEMO-001</b></p>
      </div>
      <div className="mt-3">
        <Chip tone="warning">Reputation: Suspicious</Chip>
      </div>
    </section>
  );
}

