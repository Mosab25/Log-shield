import { Activity } from "lucide-react";

export function LiveLogsPanel({
  lines,
  riskScore,
  stageLabel,
}: {
  lines: string[];
  riskScore: number;
  stageLabel: string;
}) {
  return (
    <section className="soc-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Activity className="h-4 w-4 text-[var(--brand)]" />
          LogShield Live Detection Feed
        </h3>
        <div className="flex items-center gap-2">
          <span className="chip chip-info">{stageLabel}</span>
          <span className="chip chip-critical">Risk {riskScore}</span>
        </div>
      </header>
      <div className="min-h-[320px] bg-[var(--bg-secondary)] px-4 py-3 font-mono text-xs leading-6 text-[var(--text-muted)]">
        <p className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)]">Simulated Demo Data</p>
        {lines.length === 0 ? <p className="text-[var(--text-faint)]">Waiting for simulated events...</p> : null}
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap break-all">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

