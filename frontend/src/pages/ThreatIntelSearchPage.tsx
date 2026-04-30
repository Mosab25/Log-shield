import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Globe, Database, AlertCircle, Download, CheckCircle, Clock } from "lucide-react";
import { apiClient } from "../api/client";
import { SeverityBadge } from "../components/SeverityBadge";

const SOURCE_COLORS: Record<string, string> = {
  local: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cached: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  nvd_api: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${color}`}>{source === "local" ? <Database className="h-3 w-3" /> : source === "cached" ? <Clock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{label}</span>;
}

export function ThreatIntelSearchPage() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sourceSummary, setSourceSummary] = useState({ local: 0, cached: 0, nvd_api: 0 });
  const [externalUnavailable, setExternalUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const p = new URLSearchParams({ q: query });
      if (severity) p.set("severity", severity);
      if (source !== "all") p.set("source", source);
      const res = await apiClient.get<any>(`/threat-intel/search?${p.toString()}`);
      setResults(res.results);
      setTotal(res.total);
      setSourceSummary(res.source_summary);
      setExternalUnavailable(res.external_source_unavailable);
      setMessage(res.message);
    } catch (err: any) {
      setMessage(err?.message ?? "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function importCVE(cveId: string) {
    try {
      await apiClient.post(`/threat-intel/import-cve/${cveId}`);
      search();
    } catch (err: any) {
      alert(err?.message ?? "Import failed.");
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[.3em] text-cyan-300">Threat Intelligence</p>
        <h1 className="mt-3 text-3xl font-bold text-white">CVE Search</h1>
        <p className="mt-2 text-slate-400">Search NVD CVE database and local threat entries.</p>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && void search()} placeholder="CVE ID or keyword (e.g., CVE-2024-12345, apache)" className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5" /></div>
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
        <select value={source} onChange={e => setSource(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2.5"><option value="all">All sources</option><option value="local">Local only</option><option value="nvd_api">NVD API only</option></select>
        <button onClick={search} disabled={loading} className="rounded-2xl bg-cyan-400 px-6 py-2.5 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{loading ? "Searching..." : "Search"}</button>
      </section>

      {message && <div className={`rounded-2xl border p-4 ${externalUnavailable ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-slate-700 bg-slate-800 text-slate-300"}`}><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /><p>{message}</p></div></div>}

      {sourceSummary.local + sourceSummary.cached + sourceSummary.nvd_api > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">Results: <span className="text-white">{total}</span></span>
          <span className="text-slate-400">Local: <span className="text-emerald-300">{sourceSummary.local}</span></span>
          <span className="text-slate-400">Cached: <span className="text-amber-300">{sourceSummary.cached}</span></span>
          <span className="text-slate-400">NVD: <span className="text-cyan-300">{sourceSummary.nvd_api}</span></span>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        {results.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Search className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-3">No results found.</p>
            <p className="text-sm">Try searching for a CVE ID or keyword.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-800">
            <tbody className="divide-y divide-slate-800">
              {results.map((r: any) => (
                <tr key={r.cve_id || r.id} className="hover:bg-slate-800/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1"><SourceBadge source={r.result_source} /><SeverityBadge severity={r.severity} /></div>
                    <p className="font-semibold">{r.cve_id || r.title}</p>
                    <p className="text-xs text-slate-500">{r.category ?? "—"} · CVSS: {r.cvss_score ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate max-w-md">{r.description || r.title}</p>
                  </td>
                  <td className="px-3 text-sm text-slate-400">{r.status === "approved" ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : r.status === "pending_review" ? <Clock className="h-4 w-4 text-amber-400" /> : <AlertCircle className="h-4 w-4 text-slate-500" />}</td>
                  <td className="px-3">
                    {r.result_source === "nvd_api" && r.id === null ? (
                      <button onClick={() => void importCVE(r.cve_id)} className="flex items-center gap-1 text-cyan-300 text-sm hover:text-cyan-200"><Download className="h-4 w-4" />Import</button>
                    ) : r.id ? (
                      <Link className="text-cyan-300 text-sm" to={`/threats/${r.id}`}>View</Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
