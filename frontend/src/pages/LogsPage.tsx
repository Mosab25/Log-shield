import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { LogsToolbar } from "../components/LogsToolbar";
import { Pagination } from "../components/Pagination";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";

export function LogsPage() {
  const [tab, setTab] = useState<"raw" | "normalized">("raw");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 10;

  async function load() {
    const skip = (page - 1) * pageSize;
    const res = await apiClient.get<any>(tab === "raw" ? `/logs/raw?skip=${skip}&limit=${pageSize}` : `/logs/normalized?skip=${skip}&limit=${pageSize}`);
    setItems(res.items); setTotal(res.total);
  }
  useEffect(() => { void load(); }, [tab, page]);

  const visible = useMemo(() => items.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase())), [items, search]);

  async function normalize(id: number) { await apiClient.post(`/logs/normalize/${id}`); await load(); }
  async function detect(id: number) { await apiClient.post(`/detection/run/${id}`); }

  return (
    <div className="space-y-6">
      <section><p className="text-sm uppercase tracking-[.3em] text-cyan-300">Logs</p><h1 className="mt-3 text-3xl font-bold text-white">Raw & Normalized Logs</h1></section>
      <div className="flex gap-3"><button onClick={() => setTab("raw")} className={`rounded-2xl px-5 py-2 ${tab==="raw"?"bg-cyan-400 text-slate-950":"bg-slate-900"}`}>Raw Logs</button><button onClick={() => setTab("normalized")} className={`rounded-2xl px-5 py-2 ${tab==="normalized"?"bg-cyan-400 text-slate-950":"bg-slate-900"}`}>Normalized Logs</button></div>
      <LogsToolbar search={search} setSearch={setSearch} reload={() => void load()} />
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full divide-y divide-slate-800">
          <tbody className="divide-y divide-slate-800">
            {visible.map((item: any) => <tr key={item.id}>
              <td className="px-5 py-4"><p className="font-semibold text-white">{tab === "raw" ? item.source : item.event_type}</p><p className="text-xs text-slate-500">{tab === "raw" ? item.received_at : item.timestamp}</p></td>
              <td className="px-5 py-4">{tab === "raw" ? <StatusBadge status={item.ingestion_status} /> : <SeverityBadge severity={item.severity} />}</td>
              <td className="px-5 py-4 text-slate-400">{tab === "raw" ? item.raw_message : item.message}</td>
              <td className="px-5 py-4 text-right"><button onClick={() => tab === "raw" ? void normalize(item.id) : void detect(item.id)} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm">{tab === "raw" ? "Normalize" : "Run Detection"}</button></td>
            </tr>)}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
