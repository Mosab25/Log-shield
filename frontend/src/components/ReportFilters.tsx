export interface ReportFiltersValue { reportType: "daily" | "weekly"; }
export function ReportFilters({ filters, onChange, onApply }: { filters: ReportFiltersValue; onChange: (f: ReportFiltersValue) => void; onApply: () => void }) {
  return <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 flex gap-3"><select value={filters.reportType} onChange={e=>onChange({reportType:e.target.value as "daily"|"weekly"})} className="rounded-2xl bg-slate-950 px-4 py-2"><option value="daily">Daily Summary</option><option value="weekly">Weekly Report</option></select><button onClick={onApply} className="rounded-2xl bg-cyan-400 px-4 py-2 font-bold text-slate-950">Apply</button></section>;
}
