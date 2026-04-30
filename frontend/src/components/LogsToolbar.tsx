export function LogsToolbar({ search, setSearch, reload }: { search: string; setSearch: (v: string) => void; reload: () => void }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2" />
        <button onClick={reload} className="rounded-2xl bg-cyan-400 px-4 py-2 font-bold text-slate-950">Refresh</button>
      </div>
    </section>
  );
}
