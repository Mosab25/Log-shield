import { Chip } from "../ui/Chip";

export function DefenseDemoPanel({ blocked }: { blocked: boolean }) {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Defense / IP Blocking</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      {!blocked ? (
        <div className="mt-3">
          <Chip tone="warning">Recommended Action: Block Source IP</Chip>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Chip tone="safe">Source IP 203.0.113.77 blocked successfully</Chip>
          <p className="inline-block rounded-md border border-[color:color-mix(in_srgb,var(--status-safe)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--status-safe)_12%,transparent)] px-2 py-1 text-xs font-bold text-[var(--status-safe)] animate-pulse">
            THREAT BLOCKED
          </p>
        </div>
      )}
    </section>
  );
}

