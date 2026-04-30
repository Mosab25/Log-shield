import { RefreshCw, Search } from "lucide-react";

export function LogsToolbar({ search, setSearch, reload }: { search: string; setSearch: (v: string) => void; reload: () => void }) {
  return (
    <section className="soc-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="soc-input w-full pl-10" />
        </div>
        <button onClick={reload} className="soc-button-primary">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </section>
  );
}
