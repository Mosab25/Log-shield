import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";
import { AuditLogsTable } from "../components/AuditLogsTable";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

type AuditFilters = {
  action: string;
  actorUserId: string;
  entityType: string;
  startDate: string;
  endDate: string;
};

const initialFilters: AuditFilters = {
  action: "",
  actorUserId: "",
  entityType: "",
  startDate: "",
  endDate: "",
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [applied, setApplied] = useState<AuditFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const pageSize = 20;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("skip", String((page - 1) * pageSize));
    params.set("limit", String(pageSize));
    if (applied.action.trim()) params.set("action", applied.action.trim());
    if (applied.actorUserId.trim()) {
      const actorId = Number(applied.actorUserId.trim());
      if (Number.isFinite(actorId)) params.set("actor_user_id", String(actorId));
    }
    if (applied.entityType.trim()) params.set("entity_type", applied.entityType.trim());
    if (applied.startDate) params.set("start_date", new Date(applied.startDate).toISOString());
    if (applied.endDate) {
      const endDate = new Date(applied.endDate);
      endDate.setHours(23, 59, 59, 999);
      params.set("end_date", endDate.toISOString());
    }
    return params.toString();
  }, [page, pageSize, applied]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any>(`/audit-logs?${queryString}`);
      setLogs(Array.isArray(response?.items) ? response.items : []);
      setTotal(Number(response?.total ?? 0));
    } catch (err: any) {
      setLogs([]);
      setTotal(0);
      setError(err?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [queryString, refreshTick]);

  function applyFilters() {
    setPage(1);
    setApplied(filters);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setApplied(initialFilters);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Audit Logs"
        description="Track administrative actions, actors, entities, IP addresses, and detailed event metadata."
        icon={RefreshCw}
        actions={<button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="soc-button-ghost"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>}
      />

      <section className="soc-panel p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={filters.action}
            onChange={e => setFilters(prev => ({ ...prev, action: e.target.value }))}
            placeholder="Action"
            className="soc-input"
          />
          <input
            value={filters.actorUserId}
            onChange={e => setFilters(prev => ({ ...prev, actorUserId: e.target.value }))}
            placeholder="Actor User ID"
            className="soc-input"
          />
          <input
            value={filters.entityType}
            onChange={e => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
            placeholder="Entity Type"
            className="soc-input"
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="soc-input"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="soc-input"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button onClick={applyFilters} className="soc-button-primary">Apply Filters</button>
          <button onClick={resetFilters} className="soc-button-ghost">Reset Filters</button>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={() => setRefreshTick(v => v + 1)} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading && logs.length === 0 ? (
        <EmptyState title="No audit logs found" description="No audit records match the current filters." />
      ) : null}

      {!loading && logs.length > 0 ? (
        <>
          <AuditLogsTable logs={logs} onOpenDetails={setSelected} />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="soc-panel-strong max-h-[85vh] w-full max-w-3xl overflow-y-auto p-6">
            <button onClick={() => setSelected(null)} className="soc-button-ghost float-right px-3 py-1">Close</button>
            <h2 className="text-xl font-black text-white">Audit Log #{selected.id}</h2>
            <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
