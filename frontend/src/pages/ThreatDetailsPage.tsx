import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiClient } from "../api/client";
import { SeverityBadge } from "../components/SeverityBadge";

const TYPE_COLORS: Record<string, string> = {
  vulnerability: "bg-red-500/20 text-red-300 border-red-500/30",
  attack_pattern: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  cve: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  mitre_technique: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  ioc: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  vulnerability: "Vulnerability", attack_pattern: "Attack Pattern", cve: "CVE", mitre_technique: "MITRE Technique", ioc: "IOC",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  pending_review: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  archived: "bg-slate-700/20 text-slate-400 border-slate-700/30",
};

const INDICATOR_ICONS: Record<string, string> = {
  ip: "🌐", domain: "🔗", url: "📍", hash: "#️⃣", email: "📧", user_agent: "🖥️", file_path: "📁", registry_key: "🔑", other: "❓",
};

export function ThreatDetailsPage() {
  const { id } = useParams();
  const [threat, setThreat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<any>(`/threats/${id}`);
        setThreat(res);
      } catch { setThreat(null); }
      setLoading(false);
    }
    void load();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!threat) return <div className="p-10 text-center text-red-400">Threat entry not found.</div>;

  const typeColor = TYPE_COLORS[threat.type] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const typeLabel = TYPE_LABELS[threat.type] ?? threat.type;
  const statusColor = STATUS_COLORS[threat.status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const statusLabel = threat.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <Link to="/threats" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"><ArrowLeft className="h-4 w-4" />Back to Threats</Link>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <span className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-sm font-semibold ${typeColor}`}><ShieldAlert className="h-4 w-4" />{typeLabel}</span>
          <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
          <SeverityBadge severity={threat.severity} />
        </div>
        <h1 className="text-3xl font-bold">{threat.title}</h1>
        <p className="mt-3 text-slate-400">{threat.description}</p>

        {threat.mitre_tactic && (
          <div className={`mt-4 rounded-2xl border p-4 ${typeColor}`}>
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /><span className="font-bold">{typeLabel}</span></div>
            <p className="mt-2 text-sm opacity-80">MITRE ATT&CK: {threat.mitre_tactic}{threat.mitre_technique ? ` → ${threat.mitre_technique}` : ""}</p>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">CVE ID</p><p>{threat.cve_id ?? "—"}</p></div>
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">CVSS Score</p><p>{threat.cvss_score ?? "—"}</p></div>
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">Source</p><p>{threat.source}</p></div>
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">Submitted By</p><p>{threat.submitted_by?.full_name ?? "—"}</p></div>
        </div>

        {threat.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {threat.tags.map((tag: any) => <span key={tag.id} className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300">{tag.name}</span>)}
          </div>
        )}
      </section>

      {threat.mitigation && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-emerald-300">Mitigation</h2>
          <p className="mt-3 text-sm text-slate-400 whitespace-pre-wrap">{threat.mitigation}</p>
        </section>
      )}

      {threat.detection_logic && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-cyan-300">Detection Logic</h2>
          <p className="mt-3 text-sm text-slate-400 whitespace-pre-wrap">{threat.detection_logic}</p>
        </section>
      )}

      {threat.indicators?.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Indicators ({threat.indicators.length})</h2>
          <div className="mt-4 space-y-2">
            {threat.indicators.map((ind: any) => (
              <div key={ind.id} className="flex items-center gap-3 rounded-2xl bg-slate-950 p-3">
                <span className="text-lg">{INDICATOR_ICONS[ind.indicator_type] ?? "❓"}</span>
                <div><p className="font-mono text-sm">{ind.indicator_value}</p><p className="text-xs text-slate-500">{ind.indicator_type}{ind.description ? ` — ${ind.description}` : ""}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {threat.references?.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">References</h2>
          <div className="mt-4 space-y-2">
            {threat.references.map((ref: any) => (
              <a key={ref.id} href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-950 p-3 hover:bg-slate-800 transition">
                <ExternalLink className="h-4 w-4 text-cyan-300 shrink-0" />
                <div><p className="text-sm font-semibold">{ref.title || ref.url}</p><p className="text-xs text-slate-500">{ref.source_name ?? "External"}</p></div>
              </a>
            ))}
          </div>
        </section>
      )}

      {threat.reviews?.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Review History</h2>
          <div className="mt-4 space-y-2">
            {threat.reviews.map((rv: any) => (
              <div key={rv.id} className="flex items-start gap-3 rounded-2xl bg-slate-950 p-3">
                {rv.decision === "approved" ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" /> : rv.decision === "rejected" ? <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" /> : <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />}
                <div><p className="text-sm font-semibold capitalize">{rv.decision.replace(/_/g, " ")}</p><p className="text-xs text-slate-500">by {rv.reviewer?.full_name ?? "Unknown"} · {rv.comment ?? "No comment"}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {threat.linked_alerts?.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Linked Alerts</h2>
          <div className="mt-4 space-y-2">
            {threat.linked_alerts.map((la: any) => (
              <Link key={`${la.alert_id}-${la.threat_entry_id}`} to={`/alerts/${la.alert_id}`} className="flex items-center justify-between rounded-2xl bg-slate-950 p-3 hover:bg-slate-800 transition">
                <div><p className="text-sm font-semibold">Alert #{la.alert_id}</p><p className="text-xs text-slate-500">{la.reason ?? "No reason provided"}</p></div>
                {la.confidence != null && <span className="rounded-lg bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">{la.confidence}% confidence</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
