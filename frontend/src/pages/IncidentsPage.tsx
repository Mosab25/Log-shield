import { FormEvent, useEffect, useState } from "react";
import { Briefcase, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

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

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-red-400/35 bg-red-500/12 text-red-200";
    case "high":
      return "border-orange-400/35 bg-orange-500/12 text-orange-200";
    case "medium":
      return "border-amber-400/35 bg-amber-500/12 text-amber-200";
    default:
      return "border-cyan-400/35 bg-cyan-500/12 text-cyan-200";
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "investigating":
      return "border-amber-400/35 bg-amber-500/12 text-amber-200";
    case "resolved":
      return "border-emerald-400/35 bg-emerald-500/12 text-emerald-200";
    case "closed":
      return "border-cyber-muted/25 bg-cyber-muted/10 text-cyber-muted";
    case "false_positive":
      return "border-fuchsia-400/35 bg-fuchsia-500/12 text-fuchsia-200";
    default:
      return "border-cyan-400/35 bg-cyan-500/12 text-cyan-200";
  }
}

export function IncidentsPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "analyst";
  const pageSize = 10;
  const [searchParams, setSearchParams] = useSearchParams();
  const alertIdFilter = searchParams.get("alert_id")?.trim() || "";

  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [search, setSearch] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSeverity, setCreateSeverity] = useState<IncidentSeverity>("medium");
  const [createStatus, setCreateStatus] = useState<IncidentStatus>("open");
  const [createOwnerUserId, setCreateOwnerUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize),
      });
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
      if (ownerUserId.trim()) params.set("owner_user_id", ownerUserId.trim());
      if (search.trim()) params.set("q", search.trim());
      if (alertIdFilter) params.set("alert_id", alertIdFilter);

      const response = await apiClient.get<IncidentListResponse>(`/incidents?${params.toString()}`);
      setItems(Array.isArray(response.items) ? response.items : []);
      setTotal(Number(response.total ?? 0));
    } catch (err: any) {
      setItems([]);
      setTotal(0);
      setError(err?.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, status, severity, ownerUserId, alertIdFilter]);

  function applySearch(event: FormEvent) {
    event.preventDefault();
    if (page !== 1) {
      setPage(1);
      return;
    }
    void load();
  }

  async function createIncident(event: FormEvent) {
    event.preventDefault();
    if (!canManage || creating) return;
    setCreating(true);
    setError(null);
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
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to create incident.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Incident Cases"
        title="Incidents"
        description="Group multiple alerts and evidence into one investigation case, assign ownership, and track the response lifecycle."
        icon={Briefcase}
        actions={
          <button type="button" onClick={() => void load()} className="soc-button-ghost">
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

      <section className="soc-panel p-5">
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
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No incidents found" description="Create or search incidents to start case-driven triage." icon={ShieldAlert} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Linked alerts</th>
                    <th>Updated</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-cyber-muted/60">Created by {item.created_by?.full_name ?? "Unknown"}</p>
                      </td>
                      <td>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${severityClass(item.severity)}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusClass(item.status)}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <p className="text-sm font-semibold text-cyber-text">{item.owner?.full_name ?? "Unassigned"}</p>
                        <p className="text-xs text-cyber-muted/60">{item.owner?.email ?? "-"}</p>
                      </td>
                      <td>{item.linked_alerts_count}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td>
                        <Link to={`/incidents/${item.id}`} className="font-semibold text-cyan-200 hover:text-white">
                          Open
                        </Link>
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
