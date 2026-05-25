import { MODULES } from "../../data/demoScenario";

type Status = "Waiting" | "Running" | "Completed";

function moduleStatus(currentStageIndex: number, start: number, end: number): Status {
  if (currentStageIndex < start) return "Waiting";
  if (currentStageIndex >= end) return "Completed";
  return "Running";
}

export function ModuleStatusGrid({
  currentStageIndex,
}: {
  currentStageIndex: number;
}) {
  return (
    <section className="soc-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Module Status Grid</h3>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map(module => {
          const status = moduleStatus(currentStageIndex, module.start, module.end);
          const chipClass = status === "Completed" ? "chip-safe" : status === "Running" ? "chip-info" : "chip-neutral";
          return (
            <article key={module.name} className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--text-primary)]">{module.name}</p>
              <p className={`chip mt-2 ${chipClass}`}>{status}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

