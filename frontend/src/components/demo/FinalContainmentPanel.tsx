export function FinalContainmentPanel({
  onReplay,
  onExportReport,
}: {
  onReplay: () => void;
  onExportReport: () => void;
}) {
  return (
    <section className="soc-panel border-[color:color-mix(in_srgb,var(--status-safe)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--status-safe)_8%,transparent)] p-6 text-center">
      <p className="mx-auto inline-block rounded-full border border-[color:color-mix(in_srgb,var(--status-safe)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--status-safe)_15%,transparent)] px-4 py-1 text-sm font-black text-[var(--status-safe)] animate-pulse">
        THREAT CONTAINED
      </p>
      <div className="mt-4 grid gap-2 text-xs md:grid-cols-5">
        <p className="chip chip-safe">Attack Detected ✓</p>
        <p className="chip chip-safe">IOC Extracted ✓</p>
        <p className="chip chip-safe">IP Blocked ✓</p>
        <p className="chip chip-safe">Incident Contained ✓</p>
        <p className="chip chip-safe">Report Ready ✓</p>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" className="row-action primary" onClick={onReplay}>Replay Demo</button>
        <button type="button" className="row-action success" onClick={onExportReport}>Export Report</button>
      </div>
    </section>
  );
}

