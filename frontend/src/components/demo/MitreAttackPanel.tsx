import { Chip } from "../ui/Chip";
import { MITRE_CARDS } from "../../data/demoScenario";

export function MitreAttackPanel() {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">MITRE ATT&CK Mapping</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {MITRE_CARDS.map(card => (
          <article key={card.technique_id} className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="violet">{card.technique_id}</Chip>
              <Chip tone="info">Tactic: {card.tactic}</Chip>
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--text-primary)]">{card.technique_name}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{card.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

