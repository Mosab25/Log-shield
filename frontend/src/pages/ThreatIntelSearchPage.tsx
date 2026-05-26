import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Globe, Database, AlertCircle, CheckCircle, Clock, ShieldAlert, ExternalLink, X } from "lucide-react";
import { ApiError, apiClient, tokenStorage, toUserErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAuthGate } from "../auth/useAuthGate";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { SeverityBadge } from "../components/SeverityBadge";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

const SOURCE_COLORS: Record<string, string> = {
  local: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cached: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  nvd_api: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = source === "cached"
    ? "Reference"
    : source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${color}`}>{source === "local" ? <Database className="h-3 w-3" /> : source === "cached" ? <Clock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{label}</span>;
}

function statusMeta(result: any): { label: string; className: string; icon: JSX.Element } {
  if (result?.result_source !== "local") {
    return {
      label: "Reference",
      className: "border-slate-600/50 bg-slate-700/20 text-slate-200",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  }
  if (result?.status === "approved") {
    return {
      label: "Approved",
      className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    };
  }
  if (result?.status === "pending_review") {
    return {
      label: "Pending",
      className: "border-amber-500/35 bg-amber-500/10 text-amber-300",
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    };
  }
  return {
    label: "Info",
    className: "border-slate-600/50 bg-slate-700/20 text-slate-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  };
}

export function ThreatIntelSearchPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const { requireAuth, loginRequiredModal, isAuthenticated } = useAuthGate();
  const [activeResult, setActiveResult] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sourceSummary, setSourceSummary] = useState({ local: 0, cached: 0, nvd_api: 0 });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem("logshield.threat_research.search_history");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string").slice(0, 8) : [];
    } catch {
      return [];
    }
  });
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

  function search() {
    requireAuth(() => void runSearch());
  }

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
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
      setSearchHistory(prev => {
        const next = [trimmed, ...prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
        try {
          window.localStorage.setItem("logshield.threat_research.search_history", JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
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
      setMessage(toUserErrorMessage(err, "Unable to load search results."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          eyebrow="Threat Research Hub"
          title="Vulnerability Explorer"
          description="Search CVEs, CVSS severity, published dates, affected products, and local threat context for guided vulnerability triage."
          icon={ShieldAlert}
        />
      ) : (
        <div>
          <p className="text-xs font-black uppercase text-cyan-200">Vulnerability Explorer</p>
          <h2 className="text-xl font-black text-white">NVD and Local CVE Intelligence</h2>
        </div>
      )}

      <InfoHint title="How to use CVE results">
        A CVE is useful only when it connects to your environment. Check the affected product, CVSS severity, exploitability, publication date, and whether the technology exists in your assets.
      </InfoHint>
      {!isAuthenticated ? (
        <InfoHint title="Public read-only mode">
          You can review the CVE workflow and filters. Live NVD/local CVE searches and imports require a LogShield account.
        </InfoHint>
      ) : null}

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
        {searchHistory.length ? (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Recent Searches</p>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    requireAuth(() => void runSearch());
                  }}
                  className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {message ? <ErrorState message={message} onRetry={lastQuery ? () => void search() : undefined} /> : null}

      {hasSummary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">Results <span className="ml-2 font-black text-white">{total}</span></div>
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">Local <span className="ml-2 font-black text-emerald-300">{sourceSummary.local}</span></div>
          <div className="soc-panel px-4 py-3 text-sm text-slate-400">NVD <span className="ml-2 font-black text-cyan-300">{sourceSummary.nvd_api}</span></div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <RecommendedActions
          title="How to use this result"
          actions={[
            "Confirm whether the affected product exists in your environment.",
            "Review CVSS severity and exploitability before prioritizing.",
            "Prioritize patching for exposed or business-critical assets.",
            "Link relevant CVEs to incidents or reports for context.",
          ]}
        />
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
                      <td>
                        {(() => {
                          const meta = statusMeta(r);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                              {meta.icon}
                              {meta.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        {r.id ? (
                          <Link className="font-semibold text-cyan-200 hover:text-white" to={`/threats/${r.id}`}>View</Link>
                        ) : (
                          <button onClick={() => setActiveResult(r)} className="soc-button-ghost px-3 py-1.5 text-xs">
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
      {activeResult ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={() => setActiveResult(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-cyber-bg p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Threat Details</p>
                <h3 className="mt-1 text-lg font-black text-white">{activeResult.cve_id || activeResult.title || "Result details"}</h3>
              </div>
              <button className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white" onClick={() => setActiveResult(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p><span className="text-slate-500">Severity:</span> {activeResult.severity || "unknown"}</p>
              <p><span className="text-slate-500">Source:</span> {String(activeResult.result_source || "external").replace(/_/g, " ")}</p>
              <p><span className="text-slate-500">Category:</span> {activeResult.category || "N/A"}</p>
              <p><span className="text-slate-500">CVSS:</span> {activeResult.cvss_score ?? "N/A"}</p>
              <p className="leading-6 text-slate-300">{activeResult.description || activeResult.title || "No additional description available."}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {activeResult.cve_id ? (
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(activeResult.cve_id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="soc-button-ghost px-3 py-1.5 text-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on NVD
                </a>
              ) : null}
              <button className="soc-button-primary px-3 py-1.5 text-xs" onClick={() => setActiveResult(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {loginRequiredModal}
    </div>
  );
}
