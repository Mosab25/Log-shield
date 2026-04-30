export interface DashboardFilters {
  severity: string;
  source: string;
  status: string;
}

export function Filters({ filters, onChange, onApply }: { filters: DashboardFilters; onChange: (f: DashboardFilters) => void; onApply: () => void }) {
  return (
    <section className="soc-panel p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <select value={filters.severity} onChange={e => onChange({ ...filters, severity: e.target.value })} className="soc-input">
          <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <input value={filters.source} onChange={e => onChange({ ...filters, source: e.target.value })} placeholder="Source" className="soc-input" />
        <select value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value })} className="soc-input">
          <option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
        </select>
        <button onClick={onApply} className="soc-button-primary">Apply Filters</button>
      </div>
    </section>
  );
}
