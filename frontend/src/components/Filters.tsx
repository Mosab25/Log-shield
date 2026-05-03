import { useState } from "react";
import { debounce } from "../utils/debounce";

export interface DashboardFilters {
  severity: string;
  source: string;
  status: string;
}

export function Filters({ filters, onChange, onApply }: { filters: DashboardFilters; onChange: (f: DashboardFilters) => void; onApply: () => void }) {
  const [localFilters, setLocalFilters] = useState(filters);
  
  // Debounced filter change to avoid API calls on every keystroke
  const debouncedOnChange = debounce((newFilters: DashboardFilters) => {
    setLocalFilters(newFilters);
  }, 300);
  
  const handleChange = (field: keyof DashboardFilters, value: string) => {
    const newFilters = { ...localFilters, [field]: value };
    debouncedOnChange(newFilters);
  };

  return (
    <section className="soc-panel p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <select value={localFilters.severity} onChange={e => handleChange('severity', e.target.value)} className="soc-input">
          <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <input value={localFilters.source} onChange={e => handleChange('source', e.target.value)} placeholder="Source" className="soc-input" />
        <select value={localFilters.status} onChange={e => handleChange('status', e.target.value)} className="soc-input">
          <option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option>
        </select>
        <button onClick={() => { onChange(localFilters); onApply(); }} className="soc-button-primary">Apply Filters</button>
      </div>
    </section>
  );
}
