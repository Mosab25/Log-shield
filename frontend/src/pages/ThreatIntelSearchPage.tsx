import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Globe, Database, AlertCircle, Download, CheckCircle, Clock, ShieldAlert } from "lucide-react";
import { ApiError, apiClient, getAuthHeaders, tokenStorage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { SeverityBadge } from "../components/SeverityBadge";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

const SOURCE_COLORS: Record<string, string> = {
  local: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cached: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  nvd_api: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${color}`}>{source === "local" ? <Database className="h-3 w-3" /> : source === "cached" ? <Clock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{label}</span>;
}

export function ThreatIntelSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sourceSummary, setSourceSummary] = useState({ local: 0, cached: 0, nvd_api: 0 });
  const [externalUnavailable, setExternalUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const canSearch = query.trim().length > 0 && !loading;
  const hasSummary = useMemo(() => sourceSummary.local + sourceSummary.cached + sourceSummary.nvd_api > 0, [sourceSummary]);

  async function handleAuthExpired() {
    setResults([]);
    setTotal(0);
    tokenStorage.clearTokens();
    await refreshUser();
    setMessage("Session expired. Please sign in again.");
    navigate("/login", { replace: true, state: { from: location } });
  }

  async function search() {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!getAuthHeaders().Authorization) {
      await handleAuthExpired();
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const p = new URLSearchParams({ q: trimmed });
      p.set("include_external", "true");
      if (severity) p.set("severity", severity);
      if (source !== "all") p.set("source", source);
      const res = await apiClient.get<any>(`/threat-intel/search?${p.toString()}`);
      const nextResults = Array.isArray(res.results) ? res.results : [];
      setResults(nextResults);
      setTotal(res.total ?? 0);
      setSourceSummary(res.source_summary ?? { local: 0, cached: 0, nvd_api: 0 });
      setExternalUnavailable(Boolean(res.external_source_unavailable));
      setLastQuery(trimmed);
      if (res.message) {
        setMessage(res.message);
      } else if (nextResults.length === 0) {
        setMessage(null);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        await handleAuthExpired();
        return;
      }
      setResults([]);
      setTotal(0);
      setMessage(`Search error: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function importCVE(cveId: string) {
    if (!getAuthHeaders().Authorization) {
      await handleAuthExpired();
      return;
    }
    try {
      await apiClient.post(`/threat-intel/import-cve/${cveId}`);
      await search();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        await handleAuthExpired();
        return;
      }
      alert(err?.message ?? "Import failed.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Threat Intelligence"
        title="CVE Search"
        description="Search local threat entries and the NVD CVE database while preserving authenticated API access and external-source behavior."
        icon={ShieldAlert}
      />

      <section className="soc-panel p-5">
        <div className="grid gap-3 xl:grid-cols-[1fr_12rem_12rem_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void search()}
              placeholder="CVE ID or keyword, e.g. CVE-2024-12345 or apache"
              className="soc-input w-full pl-10"
              aria-label="Search CVEs and threat intelligence"
            />
          </div>
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="soc-input" aria-label="Filter severity">
            <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
          <select value={source} onChange={e => setSource(e.target.value)} className="soc-input" aria-label="Filter source">
            <option value="all">All sources</option><option value="local">Local only</option><option value="nvd_api">NVD API only</option>
          </select>
          <button onClick={search} disabled={!canSearch} className="soc-button-primary">
            <Search className="h-4 w-4" />
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </section>

      {message ? <ErrorState message={message} onRetry={lastQuery ? () => void search() : undefined} /> : null}

      {hasSummary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">Results <span className="ml-2 font-black text-white">{total}</span></div>
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">Local <span className="ml-2 font-black text-emerald-300">{sourceSummary.local}</span></div>
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">Cached <span className="ml-2 font-black text-amber-300">{sourceSummary.cached}</span></div>
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">NVD <span className="ml-2 font-black text-cyan-300">{sourceSummary.nvd_api}</span></div>
        </div>
      ) : null}

      {loading ? <SkeletonRows rows={4} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {results.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={lastQuery ? (lastQuery.toUpperCase().startsWith("CVE-") ? `No CVE found for "${lastQuery}"` : "No results found") : "Search threat intelligence"}
                description={lastQuery ? "Try a different CVE ID, keyword, severity, or source filter." : "Enter a CVE ID or keyword to query local entries and external intelligence."}
                icon={Search}
              />
              {externalUnavailable ? <p className="mt-3 text-center text-xs text-amber-300">NVD API unavailable - showing local results only.</p> : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead><tr><th>Threat</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {results.map((r: any) => (
                    <tr key={r.cve_id || r.id}>
                      <td>
                        <div className="mb-2 flex flex-wrap items-center gap-2"><SourceBadge source={r.result_source} /><SeverityBadge severity={r.severity} /></div>
                        <p className="font-bold text-white">{r.cve_id || r.title}</p>
                        <p className="text-xs text-slate-500">{r.category ?? "N/A"} - CVSS: {r.cvss_score ?? "N/A"}</p>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{r.description || r.title}</p>
                      </td>
                      <td>{r.status === "approved" ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : r.status === "pending_review" ? <Clock className="h-5 w-5 text-amber-400" /> : <AlertCircle className="h-5 w-5 text-slate-500" />}</td>
                      <td>
                        {r.result_source === "nvd_api" && r.id === null ? (
                          <button onClick={() => void importCVE(r.cve_id)} className="soc-button-ghost px-3 py-1.5 text-xs"><Download className="h-4 w-4" />Import</button>
                        ) : r.id ? (
                          <Link className="font-semibold text-cyan-200 hover:text-white" to={`/threats/${r.id}`}>View</Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
