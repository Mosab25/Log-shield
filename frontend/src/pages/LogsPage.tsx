import { useEffect, useMemo, useState } from "react";
import { Database, ListFilter } from "lucide-react";
import { apiClient } from "../api/client";
import { LogsToolbar } from "../components/LogsToolbar";
import { Pagination } from "../components/Pagination";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

export function LogsPage() {
  const [tab, setTab] = useState<"raw" | "normalized">("raw");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      const res = await apiClient.get<any>(tab === "raw" ? `/logs/raw?skip=${skip}&limit=${pageSize}` : `/logs/normalized?skip=${skip}&limit=${pageSize}`);
      setItems(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setItems([]);
      setTotal(0);
      setError(err?.message || "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [tab, page]);

  const visible = useMemo(() => items.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase())), [items, search]);

  async function normalize(id: number) {
    setActionId(id);
    try {
      await apiClient.post(`/logs/normalize/${id}`);
      await load();
    } finally {
      setActionId(null);
    }
  }

  async function detect(id: number) {
    setActionId(id);
    try {
      await apiClient.post(`/detection/run/${id}`);
    } finally {
      setActionId(null);
    }
  }

  function switchTab(next: "raw" | "normalized") {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Logs" title="Raw & Normalized Logs" description="Inspect raw ingestion records and normalized events with dense, readable SOC table views." icon={Database} />

      <div className="flex flex-wrap gap-3">
        <button onClick={() => switchTab("raw")} className={tab === "raw" ? "soc-button-primary" : "soc-button-ghost"}>Raw Logs</button>
        <button onClick={() => switchTab("normalized")} className={tab === "normalized" ? "soc-button-primary" : "soc-button-ghost"}>Normalized Logs</button>
      </div>

      <LogsToolbar search={search} setSearch={setSearch} reload={() => void load()} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {visible.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No logs found" description={search ? "No records match the current search." : "No log records are available for this view yet."} icon={ListFilter} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead><tr><th>{tab === "raw" ? "Source" : "Event"}</th><th>State</th><th>Message</th><th>Action</th></tr></thead>
                <tbody>
                  {visible.map((item: any) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-white">{tab === "raw" ? item.source : item.event_type}</p>
                        <p className="mt-1 text-xs text-slate-500">{tab === "raw" ? item.received_at : item.timestamp}</p>
                      </td>
                      <td>{tab === "raw" ? <StatusBadge status={item.ingestion_status} /> : <SeverityBadge severity={item.severity} />}</td>
                      <td className="max-w-3xl text-slate-400"><p className="line-clamp-3">{tab === "raw" ? item.raw_message : item.message}</p></td>
                      <td className="text-right">
                        <button onClick={() => tab === "raw" ? void normalize(item.id) : void detect(item.id)} disabled={actionId === item.id} className="soc-button-ghost whitespace-nowrap px-3 py-1.5 text-xs">
                          {actionId === item.id ? "Running..." : tab === "raw" ? "Normalize" : "Run Detection"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
