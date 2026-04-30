import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Plus, Search, X } from "lucide-react";
import { apiClient } from "../api/client";
import { Pagination } from "../components/Pagination";
import { SeverityBadge } from "../components/SeverityBadge";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

const TYPE_COLORS: Record<string, string> = {
  vulnerability: "bg-red-500/20 text-red-300 border-red-500/30",
  attack_pattern: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  cve: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  mitre_technique: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  ioc: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  vulnerability: "Vulnerability",
  attack_pattern: "Attack Pattern",
  cve: "CVE",
  mitre_technique: "MITRE Technique",
  ioc: "IOC",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  pending_review: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  archived: "bg-slate-700/20 text-slate-400 border-slate-700/30",
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = TYPE_LABELS[type] ?? type.replace(/_/g, " ");
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${color}`}><ShieldAlert className="h-3 w-3" />{label}</span>;
}

function EntryStatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${color}`}>{label}</span>;
}

export function ThreatsPage() {
  const [threats, setThreats] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize) });
      if (typeFilter) p.set("type", typeFilter);
      if (severityFilter) p.set("severity", severityFilter);
      if (statusFilter) p.set("status", statusFilter);
      if (search) p.set("search", search);
      const res = await apiClient.get<any>(`/threats?${p.toString()}`);
      setThreats(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setThreats([]);
      setTotal(0);
      setError(err?.message || "Failed to load threat intelligence entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, typeFilter, severityFilter, statusFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Threat Intelligence"
        title="Knowledge Base"
        description="Curate vulnerabilities, indicators, MITRE mapping, CVEs, and approved threat references."
        icon={ShieldAlert}
        actions={<button onClick={() => setShowCreate(true)} className="soc-button-primary"><Plus className="h-5 w-5" />New Entry</button>}
      />

      <section className="soc-panel p-5">
        <div className="grid gap-3 xl:grid-cols-[1fr_12rem_12rem_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search threats..." className="soc-input w-full pl-10" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="soc-input"><option value="">All types</option><option value="vulnerability">Vulnerability</option><option value="attack_pattern">Attack Pattern</option><option value="cve">CVE</option><option value="mitre_technique">MITRE Technique</option><option value="ioc">IOC</option></select>
          <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }} className="soc-input"><option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="soc-input"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select>
        </div>
      </section>

      {showCreate ? <CreateThreatModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {threats.length === 0 ? (
            <div className="p-5"><EmptyState title="No threat entries found" description="Create your first threat entry or adjust the current filters." icon={ShieldAlert} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead><tr><th>Threat</th><th>Severity</th><th>CVE</th><th>CVSS</th><th>Open</th></tr></thead>
                <tbody>
                  {threats.map((t: any) => (
                    <tr key={t.id}>
                      <td>
                        <div className="mb-2 flex flex-wrap items-center gap-2"><TypeBadge type={t.type} /><EntryStatusBadge status={t.status} /></div>
                        <p className="font-bold text-white">{t.title}</p>
                        <p className="text-xs text-slate-500">{t.category ?? "N/A"} - {t.source} - {t.indicator_count} indicator(s)</p>
                        {t.mitre_tactic && <p className="mt-1 text-xs text-cyan-300/75">MITRE: {t.mitre_tactic}{t.mitre_technique ? ` -> ${t.mitre_technique}` : ""}</p>}
                        {t.tags?.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{t.tags.map((tag: any) => <span key={tag.id} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{tag.name}</span>)}</div> : null}
                      </td>
                      <td><SeverityBadge severity={t.severity} /></td>
                      <td className="text-sm text-slate-400">{t.cve_id ?? "N/A"}</td>
                      <td className="text-sm text-slate-400">{t.cvss_score ?? "N/A"}</td>
                      <td><Link className="font-semibold text-cyan-200 hover:text-white" to={`/threats/${t.id}`}>Open</Link></td>
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

function CreateThreatModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("attack_pattern");
  const [severity, setSeverity] = useState("high");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mitreTactic, setMitreTactic] = useState("");
  const [mitreTechnique, setMitreTechnique] = useState("");
  const [cveId, setCveId] = useState("");
  const [cvssScore, setCvssScore] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [tagNames, setTagNames] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("/threats", {
        title, type, severity, description,
        category: category || null,
        mitre_tactic: mitreTactic || null,
        mitre_technique: mitreTechnique || null,
        cve_id: cveId || null,
        cvss_score: cvssScore ? parseFloat(cvssScore) : null,
        mitigation: mitigation || null,
        tag_names: tagNames ? tagNames.split(",").map(t => t.trim()).filter(Boolean) : [],
        indicators: [],
        references: [],
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create threat entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="soc-panel-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-white">New Threat Entry</h2><button onClick={onClose} className="soc-button-ghost h-9 w-9 px-0"><X className="h-5 w-5" /></button></div>
        {error ? <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        <form onSubmit={submit} className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" required className="soc-input w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={type} onChange={e => setType(e.target.value)} className="soc-input"><option value="vulnerability">Vulnerability</option><option value="attack_pattern">Attack Pattern</option><option value="cve">CVE</option><option value="mitre_technique">MITRE Technique</option><option value="ioc">IOC</option></select>
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="soc-input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description *" required rows={3} className="soc-input w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" className="soc-input" />
            <input value={cveId} onChange={e => setCveId(e.target.value)} placeholder="CVE ID" className="soc-input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={mitreTactic} onChange={e => setMitreTactic(e.target.value)} placeholder="MITRE Tactic" className="soc-input" />
            <input value={mitreTechnique} onChange={e => setMitreTechnique(e.target.value)} placeholder="MITRE Technique" className="soc-input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={cvssScore} onChange={e => setCvssScore(e.target.value)} placeholder="CVSS Score (0-10)" type="number" step="0.1" className="soc-input" />
            <input value={tagNames} onChange={e => setTagNames(e.target.value)} placeholder="Tags (comma separated)" className="soc-input" />
          </div>
          <textarea value={mitigation} onChange={e => setMitigation(e.target.value)} placeholder="Mitigation" rows={2} className="soc-input w-full" />
          <button type="submit" disabled={submitting} className="soc-button-primary w-full py-3">{submitting ? "Creating..." : "Create Threat Entry"}</button>
        </form>
      </div>
    </div>
  );
}
