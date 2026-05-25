export function AssetRiskDemoPanel() {
  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Asset Risk Escalation</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <p className="mt-3 text-xs text-[var(--text-muted)]">Asset: <b className="text-[var(--text-primary)]">Public Web Application</b></p>
      <div className="mt-3 space-y-2 text-xs text-[var(--text-muted)]">
        <p>35 → Normal</p>
        <p>52 → Recon Detected</p>
        <p>72 → Credential Abuse</p>
        <p className="text-[var(--status-critical)]">94 → Critical Web Attack</p>
      </div>
    </section>
  );
}

