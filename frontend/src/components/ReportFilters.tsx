export interface ReportFiltersValue {
  reportType: "daily" | "weekly";
}

export function ReportFilters({
  filters,
  onChange,
  onApply,
}: {
  filters: ReportFiltersValue;
  onChange: (f: ReportFiltersValue) => void;
  onApply: () => void;
}) {
  return (
    <section className="soc-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select value={filters.reportType} onChange={e => onChange({ reportType: e.target.value as "daily" | "weekly" })} className="soc-input min-w-48">
          <option value="daily">Daily Summary</option>
          <option value="weekly">Weekly Report</option>
        </select>
        <button onClick={onApply} className="soc-button-primary">Apply Report</button>
      </div>
    </section>
  );
}
