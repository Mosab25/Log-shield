import { FormEvent, useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Clock, Plus, RefreshCw, ShieldAlert, Wifi } from "lucide-react";
import { apiClient, type SelfBlockCheckResponse } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Pagination } from "../components/Pagination";
import { Chip } from "../components/ui/Chip";
import { RowActions } from "../components/ui/RowActions";
import { BulkBar } from "../components/ui/BulkBar";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, SectionHeader, SkeletonRows } from "../components/UI";

interface IPBlock {
  id: number;
  ip_address: string;
  reason: string | null;
  blocked_until: string | null;
  is_active: boolean;
  is_permanent: boolean;
  created_by_id: number | null;
  unblocked_by_id: number | null;
  unblocked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IPBlockListResponse {
  total: number;
  skip: number;
  limit: number;
  items: IPBlock[];
}

type ActiveFilter = "all" | "active" | "inactive";

function formatDate(value: string | null): string {
  if (!value) return "Permanent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getBlockStatus(block: IPBlock): { label: string; className: string } {
  const expired = Boolean(block.blocked_until && new Date(block.blocked_until).getTime() <= Date.now());
  if (!block.is_active) return { label: "Removed", className: "border-slate-600 bg-slate-700/30 text-slate-300" };
  if (expired) return { label: "Expired", className: "border-amber-300/30 bg-amber-400/10 text-amber-100" };
  return { label: "Active", className: "border-red-300/30 bg-red-400/10 text-red-100" };
}

export function BlocksPage() {
  const [blocks, setBlocks] = useState<IPBlock[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [currentIp, setCurrentIp] = useState<string>("Detecting...");
  const [ipAddress, setIpAddress] = useState("");
  const [reason, setReason] = useState("Suspicious activity");
  const [blockMode, setBlockMode] = useState<"permanent" | "temporary">("permanent");
  const [blockedUntil, setBlockedUntil] = useState("");
  const [confirmPayload, setConfirmPayload] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const pageSize = 10;

  const activeQuery = useMemo(() => {
    if (filter === "active") return "&active_only=true";
    if (filter === "inactive") return "&active_only=false";
    return "";
  }, [filter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [list, self] = await Promise.all([
        apiClient.get<IPBlockListResponse>(`/blocks?skip=${(page - 1) * pageSize}&limit=${pageSize}${activeQuery}`),
        apiClient.checkSelfBlock().catch(() => null as SelfBlockCheckResponse | null),
      ]);
      setBlocks(Array.isArray(list.items) ? list.items : []);
      setTotal(Number(list.total ?? 0));
      if (self?.ip_address) setCurrentIp(self.ip_address);
    } catch (err: any) {
      setBlocks([]);
      setTotal(0);
      setError(err?.message || "Failed to load IP blocks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, activeQuery]);

  function submitBlock(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const trimmedIp = ipAddress.trim();
    if (!trimmedIp) {
      setError("Enter an IP address to block.");
      return;
    }
    if (blockMode === "temporary" && !blockedUntil) {
      setError("Choose when the temporary block should expire.");
      return;
    }
    setConfirmPayload({
      ip_address: trimmedIp,
      reason: reason.trim() || "Blocked by administrator",
      blocked_until: blockMode === "temporary" ? new Date(blockedUntil).toISOString() : null,
    });
  }

  async function confirmBlock() {
    if (!confirmPayload || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient.post("/blocks", confirmPayload);
      setIpAddress("");
      setReason("Suspicious activity");
      setBlockMode("permanent");
      setBlockedUntil("");
      setConfirmPayload(null);
      setMessage("IP block created.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to create IP block.");
    } finally {
      setSaving(false);
    }
  }

  async function unblock(block: IPBlock) {
    setError(null);
    setMessage(null);
    try {
      await apiClient.patch(`/blocks/${block.id}/unblock`);
      setMessage("IP block removed.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove IP block.");
    }
  }

  function statusTone(label: string) {
    if (label === "Active") return "critical" as const;
    if (label === "Pending" || label === "Expired") return "warning" as const;
    return "neutral" as const;
  }

  function rowTint(label: string) {
    if (label === "Active") return { backgroundColor: "rgba(255,59,59,0.03)" };
    if (label === "Pending") return { backgroundColor: "rgba(245,158,11,0.03)" };
    return undefined;
  }

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin controls"
        title="IP Blocks"
        description="Deny abusive source IPs across login, registration, and operational API routes."
        actions={
          <button type="button" onClick={() => void load()} className="soc-button-ghost">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,28rem)_1fr]">
        <form onSubmit={submitBlock} className="soc-panel space-y-4 p-5">
          <SectionHeader title="Create Block" description="Blocks are enforced immediately with no restart." icon={Ban} />
          <div className="rounded-2xl border border-cyan-200/15 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Wifi className="h-4 w-4 text-cyan-200" />
              Current detected IP
            </div>
            <p className="mt-2 break-all font-mono text-base font-bold text-white">{currentIp}</p>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">IP address</span>
            <input value={ipAddress} onChange={event => setIpAddress(event.target.value)} placeholder="1.2.3.4" className="soc-input mt-2 w-full" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Reason</span>
            <textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} className="soc-input mt-2 w-full resize-none" />
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/65 p-1">
            <button type="button" onClick={() => setBlockMode("permanent")} className={blockMode === "permanent" ? "soc-button-primary py-2" : "soc-button-ghost py-2"}>
              Permanent
            </button>
            <button type="button" onClick={() => setBlockMode("temporary")} className={blockMode === "temporary" ? "soc-button-primary py-2" : "soc-button-ghost py-2"}>
              Temporary
            </button>
          </div>
          {blockMode === "temporary" ? (
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">Blocked until</span>
              <input type="datetime-local" value={blockedUntil} onChange={event => setBlockedUntil(event.target.value)} className="soc-input mt-2 w-full" />
            </label>
          ) : null}
          <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            You are about to block this IP. If this is your current IP, you may lock yourself out.
          </div>
          <button type="submit" disabled={saving} className="soc-button-primary w-full">
            <Plus className="h-4 w-4" />
            {saving ? "Creating..." : "Add IP Block"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="soc-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title="Blocked IP Inventory" icon={Clock} />
              <select value={filter} onChange={event => { setFilter(event.target.value as ActiveFilter); setPage(1); }} className="soc-input">
                <option value="all">All blocks</option>
                <option value="active">Active only</option>
                <option value="inactive">Removed only</option>
              </select>
            </div>
          </div>

          {message ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              {message}
            </div>
          ) : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {loading ? <SkeletonRows rows={5} /> : null}

          {!loading ? (
            <div className="soc-panel overflow-hidden">
              <BulkBar
                active={selectedIds.length > 0}
                selectedCount={selectedIds.length}
                actions={
                  <>
                    <button type="button" className="row-action">Unblock Selected</button>
                    <button type="button" className="row-action">Export</button>
                    <button type="button" className="row-action danger">Remove Selected</button>
                    <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
                  </>
                }
              />
              {blocks.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No IP blocks found" description="Create a block to enforce source-IP denial across the API." icon={Ban} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="soc-table">
                    <thead>
                      <tr>
                        <th />
                        <th>IP address</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Blocked until</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.map(block => {
                        const status = getBlockStatus(block);
                        return (
                          <tr key={block.id} style={rowTint(status.label)}>
                            <td>
                              <input type="checkbox" checked={selectedIds.includes(block.id)} onChange={e => toggleSelect(block.id, e.target.checked)} />
                            </td>
                            <td>
                              <p className="font-mono font-bold text-white">{block.ip_address}</p>
                              <p className="mt-1 text-xs text-slate-500">Created {formatDate(block.created_at)}</p>
                            </td>
                            <td>
                              <Chip tone={statusTone(status.label)}>{status.label}</Chip>
                            </td>
                            <td className="max-w-sm">
                              <p className="line-clamp-2 text-slate-300">{block.reason || "Blocked by administrator"}</p>
                            </td>
                            <td>
                              <span className="text-sm font-semibold text-slate-200">{formatDate(block.blocked_until)}</span>
                            </td>
                            <td>
                              <RowActions
                                items={[
                                  ...(status.label === "Active" ? [{ key: "unblock", label: "Unblock", variant: "danger" as const, onClick: () => void unblock(block), disabled: !block.is_active }] : []),
                                  { key: "view", label: "View Logs", variant: "primary" },
                                  ...(status.label === "Expired" ? [{ key: "renew", label: "Renew" }] : []),
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          ) : null}
        </section>
      </section>

      <ConfirmDialog
        open={Boolean(confirmPayload)}
        title="Confirm IP block"
        description={`You are about to block this IP. If this is your current IP, you may lock yourself out.${confirmPayload?.ip_address === currentIp ? " This matches your detected IP." : ""}`}
        onCancel={() => setConfirmPayload(null)}
        onConfirm={() => void confirmBlock()}
      />
    </div>
  );
}
