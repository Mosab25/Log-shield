import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Plus, Search, X } from "lucide-react";
import { apiClient } from "../api/client";
import { Pagination } from "../components/Pagination";
import { SeverityBadge } from "../components/SeverityBadge";

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
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${color}`}><ShieldAlert className="h-3 w-3" />{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${color}`}>{label}</span>;
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
  const pageSize = 10;

  async function load() {
    const p = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize) });
    if (typeFilter) p.set("type", typeFilter);
    if (severityFilter) p.set("severity", severityFilter);
    if (statusFilter) p.set("status", statusFilter);
    if (search) p.set("search", search);
    const res = await apiClient.get<any>(`/threats?${p.toString()}`);
    setThreats(res.items); setTotal(res.total);
  }
  useEffect(() => { void load(); }, [page, typeFilter, severityFilter, statusFilter, search]);

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div><p className="text-sm uppercase tracking-[.3em] text-cyan-300">Threat Intelligence</p><h1 className="mt-3 text-3xl font-bold text-white">Knowledge Base</h1></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950 hover:bg-cyan-300"><Plus className="h-5 w-5" />New Entry</button>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threats..." className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5" /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="">All types</option><option value="vulnerability">Vulnerability</option><option value="attack_pattern">Attack Pattern</option><option value="cve">CVE</option><option value="mitre_technique">MITRE Technique</option><option value="ioc">IOC</option></select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select>
      </section>

      {showCreate && <CreateThreatModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} />}

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        {threats.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-3">No threat entries found.</p>
            <p className="text-sm">Create your first threat entry to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-800">
            <tbody className="divide-y divide-slate-800">
              {threats.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1"><TypeBadge type={t.type} /><StatusBadge status={t.status} /></div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.category ?? "—"} · {t.source} · {t.indicator_count} indicator(s)</p>
                    {t.mitre_tactic && <p className="text-xs text-cyan-400/70 mt-1">MITRE: {t.mitre_tactic}{t.mitre_technique ? ` → ${t.mitre_technique}` : ""}</p>}
                    {t.tags?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{t.tags.map((tag: any) => <span key={tag.id} className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{tag.name}</span>)}</div>}
                  </td>
                  <td className="px-3"><SeverityBadge severity={t.severity} /></td>
                  <td className="px-3 text-sm text-slate-400">{t.cve_id ?? "—"}</td>
                  <td className="px-3 text-sm text-slate-400">{t.cvss_score ?? "—"}</td>
                  <td className="px-3"><Link className="text-cyan-300 text-sm" to={`/threats/${t.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
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

  async function submit(e: any) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">New Threat Entry</h2><button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
        {error && <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" required className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
          <div className="grid grid-cols-2 gap-3">
            <select value={type} onChange={e => setType(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="vulnerability">Vulnerability</option><option value="attack_pattern">Attack Pattern</option><option value="cve">CVE</option><option value="mitre_technique">MITRE Technique</option><option value="ioc">IOC</option></select>
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description *" required rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
          <div className="grid grid-cols-2 gap-3">
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
            <input value={cveId} onChange={e => setCveId(e.target.value)} placeholder="CVE ID" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={mitreTactic} onChange={e => setMitreTactic(e.target.value)} placeholder="MITRE Tactic" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
            <input value={mitreTechnique} onChange={e => setMitreTechnique(e.target.value)} placeholder="MITRE Technique" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={cvssScore} onChange={e => setCvssScore(e.target.value)} placeholder="CVSS Score (0-10)" type="number" step="0.1" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
            <input value={tagNames} onChange={e => setTagNames(e.target.value)} placeholder="Tags (comma separated)" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
          </div>
          <textarea value={mitigation} onChange={e => setMitigation(e.target.value)} placeholder="Mitigation" rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5" />
          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-cyan-400 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{submitting ? "Creating..." : "Create Threat Entry"}</button>
        </form>
      </div>
    </div>
  );
}
