export interface DashboardFilters {
  severity: string;
  source: string;
  status: string;
}

export function Filters({ filters, onChange, onApply }: { filters: DashboardFilters; onChange: (f: DashboardFilters) => void; onApply: () => void }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <select value={filters.severity} onChange={e => onChange({ ...filters, severity: e.target.value })} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2">
          <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <input value={filters.source} onChange={e => onChange({ ...filters, source: e.target.value })} placeholder="Source" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2" />
        <select value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value })} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2">
          <option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
        </select>
        <button onClick={onApply} className="rounded-2xl bg-cyan-400 px-4 py-2 font-bold text-slate-950">Apply</button>
      </div>
    </section>
  );
}
