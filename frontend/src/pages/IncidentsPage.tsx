import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient, toUserErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Chip } from "../components/ui/Chip";
import { RowActions } from "../components/ui/RowActions";
import { BulkBar } from "../components/ui/BulkBar";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { Pagination } from "../components/Pagination";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

type IncidentSeverity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "open" | "investigating" | "resolved" | "closed" | "false_positive";

interface UserMini {
  id: number;
  full_name: string;
  email: string;
  role_name: string | null;
}

interface IncidentListItem {
  id: number;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner: UserMini | null;
  created_by: UserMini | null;
  linked_alerts_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

interface IncidentListResponse {
  total: number;
  skip: number;
  limit: number;
  items: IncidentListItem[];
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function IncidentsSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton height={48} borderRadius={8} style={{ marginBottom: 16 }} />
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton
          key={index}
          height={44}
          borderRadius={6}
          style={{ marginBottom: 4, opacity: 1 - index * 0.08 }}
        />
      ))}
    </div>
  );
}

export function IncidentsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const canManage = role === "admin" || role === "analyst";
  const pageSize = 10;
  const [searchParams, setSearchParams] = useSearchParams();
  const alertIdFilter = searchParams.get("alert_id")?.trim() || "";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSeverity, setCreateSeverity] = useState<IncidentSeverity>("medium");
  const [createStatus, setCreateStatus] = useState<IncidentStatus>("open");
  const [createOwnerUserId, setCreateOwnerUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const incidentsQuery = useQuery({
    queryKey: ["incidents", { page, status, severity, ownerUserId, alertIdFilter, appliedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize),
      });
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
      if (ownerUserId.trim()) params.set("owner_user_id", ownerUserId.trim());
      if (appliedSearch) params.set("q", appliedSearch);
      if (alertIdFilter) params.set("alert_id", alertIdFilter);

      return apiClient.get<IncidentListResponse>(`/incidents?${params.toString()}`);
    },
  });

  const items = Array.isArray(incidentsQuery.data?.items) ? incidentsQuery.data.items : [];
  const total = Number(incidentsQuery.data?.total ?? 0);
  const loading = incidentsQuery.isLoading;
  const queryError = incidentsQuery.error ? toUserErrorMessage(incidentsQuery.error, "Unable to load incidents.") : null;
  const error = mutationError || queryError;

  if (loading && items.length === 0) {
    return <IncidentsSkeleton />;
  }

  async function refreshIncidents() {
    apiClient.invalidateCache("/incidents");
    await incidentsQuery.refetch();
  }

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  }

  async function createIncident(event: FormEvent) {
    event.preventDefault();
    if (!canManage || creating) return;
    setCreating(true);
    setMutationError(null);
    setMessage(null);
    try {
      await apiClient.post("/incidents", {
        title: createTitle,
        description: createDescription || null,
        severity: createSeverity,
        status: createStatus,
        owner_user_id: createOwnerUserId.trim() ? Number(createOwnerUserId.trim()) : null,
      });
      setCreateTitle("");
      setCreateDescription("");
      setCreateSeverity("medium");
      setCreateStatus("open");
      setCreateOwnerUserId("");
      setMessage("Incident created successfully.");
      setPage(1);
      apiClient.invalidateCache("/incidents");
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
    } catch (err: any) {
      setMutationError(toUserErrorMessage(err, "Failed to create incident."));
    } finally {
      setCreating(false);
    }
  }

  function severityTone(severity: string) {
    if (severity === "critical" || severity === "high") return "critical" as const;
    if (severity === "medium") return "warning" as const;
    return "info" as const;
  }

  function statusTone(statusValue: string) {
    if (statusValue === "open") return "warning" as const;
    if (statusValue === "investigating") return "info" as const;
    if (statusValue === "resolved") return "safe" as const;
    return "neutral" as const;
  }

  function rowTint(severityValue: string) {
    if (severityValue === "critical" || severityValue === "high") return { backgroundColor: "rgba(255,59,59,0.03)" };
    if (severityValue === "medium") return { backgroundColor: "rgba(245,158,11,0.03)" };
    return undefined;
  }

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Incident Cases"
        title="Incidents"
        description="Group multiple alerts and evidence into one investigation case, assign ownership, and track the response lifecycle."
        actions={
          <button type="button" onClick={() => void refreshIncidents()} className="soc-button-ghost">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <InfoHint title="How incident cases work">
        Incidents group related alerts, notes, evidence, and timeline events into one investigation. Follow the lifecycle from Open to Investigating, document containment in notes/evidence, then move to Resolved or Closed.
      </InfoHint>

      <RecommendedActions
        title="Incident workflow"
        actions={[
          "Create a case when multiple alerts share the same user, IP, host, or attack pattern.",
          "Assign an owner before deep investigation starts.",
          "Link every important alert and preserve evidence.",
          "Use notes and timeline events to document decisions.",
        ]}
      />

      {alertIdFilter ? (
        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          Filtered by linked alert ID <span className="font-black">#{alertIdFilter}</span>.
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("alert_id");
              setSearchParams(next);
            }}
            className="ml-3 font-semibold text-cyan-200 hover:text-white"
          >
            Clear
          </button>
        </div>
      ) : null}

      {canManage ? (
        <section className="soc-panel p-5">
          <form onSubmit={createIncident} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={createTitle}
              onChange={event => setCreateTitle(event.target.value)}
              placeholder="Incident title"
              className="soc-input xl:col-span-2"
              required
            />
            <select value={createSeverity} onChange={event => setCreateSeverity(event.target.value as IncidentSeverity)} className="soc-input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={createStatus} onChange={event => setCreateStatus(event.target.value as IncidentStatus)} className="soc-input">
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="false_positive">False Positive</option>
            </select>
            <input
              value={createOwnerUserId}
              onChange={event => setCreateOwnerUserId(event.target.value)}
              placeholder="Owner user ID (optional)"
              className="soc-input"
            />
            <button type="submit" disabled={creating} className="soc-button-primary">
              <Plus className="h-4 w-4" />
              {creating ? "Creating..." : "Create"}
            </button>
            <textarea
              value={createDescription}
              onChange={event => setCreateDescription(event.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="soc-input resize-none md:col-span-2 xl:col-span-6"
            />
          </form>
        </section>
      ) : null}

      <FilterRow>
        <form onSubmit={applySearch} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="soc-input">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="false_positive">False Positive</option>
          </select>
          <select value={severity} onChange={event => { setSeverity(event.target.value); setPage(1); }} className="soc-input">
            <option value="">All severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            value={ownerUserId}
            onChange={event => { setOwnerUserId(event.target.value); setPage(1); }}
            placeholder="Owner user ID"
            className="soc-input"
          />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search title/description"
            className="soc-input xl:col-span-2"
          />
          <button type="submit" className="soc-button-ghost">
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
      </FilterRow>

      {message ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void refreshIncidents()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedIds.length > 0}
            selectedCount={selectedIds.length}
            actions={
              <>
                <button type="button" className="row-action">Assign To</button>
                <button type="button" className="row-action danger">Close Selected</button>
                <button type="button" className="row-action">Export</button>
                <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
              </>
            }
          />
          {items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No incidents found" description="Create or search incidents to start case-driven triage." icon={ShieldAlert} />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="soc-table tbl">
                <thead>
                  <tr>
                    <th />
                    <th>Incident</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th className="col-hide-mobile">Owner</th>
                    <th>Linked alerts</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={rowTint(item.severity)}>
                      <td>
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => toggleSelect(item.id, e.target.checked)} />
                      </td>
                      <td>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-cyber-muted/60">Created by {item.created_by?.full_name ?? "Unknown"}</p>
                      </td>
                      <td>
                        <Chip tone={severityTone(item.severity)}>{item.severity}</Chip>
                      </td>
                      <td>
                        <Chip tone={statusTone(item.status)}>{item.status.replace("_", " ")}</Chip>
                      </td>
                      <td className="col-hide-mobile">
                        <p className="text-sm font-semibold text-cyber-text">{item.owner?.full_name ?? "Unassigned"}</p>
                        <p className="text-xs text-cyber-muted/60">{item.owner?.email ?? "-"}</p>
                      </td>
                      <td>{item.linked_alerts_count}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td>
                        <RowActions
                          items={[
                            { key: "view", label: <Link to={`/incidents/${item.id}`}>View</Link>, variant: "primary" },
                            ...(item.status === "open"
                              ? [{ key: "assign", label: "Assign" }, { key: "close", label: "Close", variant: "danger" as const }]
                              : item.status === "investigating"
                                ? [{ key: "update", label: "Update" }, { key: "close", label: "Close", variant: "danger" as const }]
                                : [{ key: "reopen", label: "Reopen" }]),
                          ]}
                        />
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
