import { Terminal } from "lucide-react";

export function AttackerTerminalPanel({
  lines,
  typedLine,
}: {
  lines: string[];
  typedLine: string;
}) {
  return (
    <section className="soc-panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Terminal className="h-4 w-4 text-[var(--status-warning)]" />
          Simulated Attacker Terminal
        </h3>
        <span className="chip chip-warning">Display-Only</span>
      </header>
      <div className="min-h-[320px] bg-black px-4 py-3 font-mono text-xs leading-6 text-[var(--status-safe)]">
        <p className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)]">Simulated Demo Data</p>
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap break-all">
            {line}
          </p>
        ))}
        {typedLine ? (
          <p className="whitespace-pre-wrap break-all">
            {typedLine}
            <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[var(--status-safe)]" />
          </p>
        ) : null}
      </div>
    </section>
  );
}

