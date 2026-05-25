import { STAGES } from "../../data/demoScenario";

export function DemoTimeline({
  currentStageIndex,
}: {
  currentStageIndex: number;
}) {
  return (
    <section className="soc-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Timeline (21 Stages)</h3>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {STAGES.map((stage, index) => {
          const done = index < currentStageIndex;
          const active = index === currentStageIndex;
          return (
            <div
              key={stage}
              className={`rounded-md border px-2.5 py-2 text-xs transition ${
                active
                  ? "border-[var(--border-accent)] bg-[var(--brand-soft)] text-[var(--text-primary)]"
                  : done
                    ? "border-[color:color-mix(in_srgb,var(--status-safe)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--status-safe)_10%,transparent)] text-[var(--text-muted)]"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-faint)]"
              }`}
            >
              <span className="mr-1 font-semibold">{index}.</span>
              {stage}
            </div>
          );
        })}
      </div>
    </section>
  );
}

