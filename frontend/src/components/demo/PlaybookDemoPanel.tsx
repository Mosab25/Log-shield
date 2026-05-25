import { PLAYBOOK_STEPS } from "../../data/demoScenario";

export function PlaybookDemoPanel({ stepIndex }: { stepIndex: number }) {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Web Attack Response Playbook</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <ol className="mt-3 space-y-2 text-xs">
        {PLAYBOOK_STEPS.map((step, index) => {
          const done = index < stepIndex;
          return (
            <li
              key={step}
              className={`rounded-md border px-3 py-2 ${
                done
                  ? "border-[color:color-mix(in_srgb,var(--status-safe)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--status-safe)_10%,transparent)] text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}
            >
              {index + 1}. {step}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

