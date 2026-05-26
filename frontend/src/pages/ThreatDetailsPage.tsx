import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { SeverityBadge } from "../components/SeverityBadge";
import { EmptyState, ErrorState, SectionHeader, SkeletonBlock } from "../components/UI";

const TYPE_COLORS: Record<string, string> = {
  vulnerability: "bg-red-500/20 text-red-300 border-red-500/30",
  attack_pattern: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
  cve: "bg-slate-500/10 text-slate-300 border-slate-500/25",
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

function DetailTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 break-words text-sm font-semibold text-white">{value}</p></div>;
}

export function ThreatDetailsPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const canViewOperationalLinks = role === "admin" || role === "analyst";
  const [threat, setThreat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<any>(`/threats/${id}`);
        setThreat(res);
      } catch (err: any) {
        setThreat(null);
        setError(toUserErrorMessage(err, "Threat entry not found."));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (loading) return <div className="space-y-4"><SkeletonBlock className="h-44" /><SkeletonBlock className="h-60" /></div>;
  if (!threat) return <ErrorState message={error ?? "Threat entry not found."} />;

  const typeColor = TYPE_COLORS[threat.type] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const typeLabel = TYPE_LABELS[threat.type] ?? threat.type;
  const isExternalReference = String(threat.source ?? "").toLowerCase() !== "local";
  const statusColor = isExternalReference
    ? "bg-slate-500/20 text-slate-300 border-slate-500/30"
    : (STATUS_COLORS[threat.status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30");
  const statusLabel = isExternalReference
    ? "Reference"
    : threat.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const sourceLabel = String(threat.source ?? "N/A").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <Link to="/research-hub" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Research Hub</Link>

      <section className="soc-panel p-6">
        <div className="flex flex-wrap gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold ${typeColor}`}><ShieldAlert className="h-4 w-4" />{typeLabel}</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${statusColor}`}>{statusLabel}</span>
          <SeverityBadge severity={threat.severity} />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-white">{threat.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">{threat.description}</p>

        {threat.mitre_tactic ? (
          <div className={`mt-5 rounded-2xl border p-4 ${typeColor}`}>
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /><span className="font-black">{typeLabel}</span></div>
            <p className="mt-2 text-sm opacity-85">MITRE ATT&CK: {threat.mitre_tactic}{threat.mitre_technique ? ` -> ${threat.mitre_technique}` : ""}</p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailTile label="CVE ID" value={threat.cve_id ?? "N/A"} />
          <DetailTile label="CVSS Score" value={String(threat.cvss_score ?? "N/A")} />
          <DetailTile label="Source" value={sourceLabel} />
          <DetailTile label="Submitted By" value={threat.submitted_by?.full_name ?? "N/A"} />
        </div>

        {threat.tags?.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {threat.tags.map((tag: any) => <span key={tag.id} className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{tag.name}</span>)}
          </div>
        ) : null}
      </section>

      {threat.mitigation ? <TextPanel title="Mitigation" value={threat.mitigation} tone="text-emerald-300" /> : null}
      {threat.detection_logic ? <TextPanel title="Detection Logic" value={threat.detection_logic} tone="text-cyan-300" /> : null}

      {threat.indicators?.length > 0 ? (
        <section className="soc-panel p-5">
          <SectionHeader title={`Indicators (${threat.indicators.length})`} icon={FileText} />
          <div className="space-y-2">
            {threat.indicators.map((ind: any) => (
              <div key={ind.id} className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
                <p className="font-mono text-sm text-white">{ind.indicator_value}</p>
                <p className="text-xs text-slate-500">{ind.indicator_type}{ind.description ? ` - ${ind.description}` : ""}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {threat.references?.length > 0 ? (
        <section className="soc-panel p-5">
          <SectionHeader title="References" icon={ExternalLink} />
          <div className="space-y-2">
            {threat.references.map((ref: any) => (
              <a key={ref.id} href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
                <ExternalLink className="h-4 w-4 shrink-0 text-cyan-300" />
                <div><p className="text-sm font-semibold text-white">{ref.title || ref.url}</p><p className="text-xs text-slate-500">{ref.source_name ?? "External"}</p></div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {threat.reviews?.length > 0 ? (
        <section className="soc-panel p-5">
          <SectionHeader title="Review History" icon={Clock} />
          <div className="space-y-2">
            {threat.reviews.map((rv: any) => (
              <div key={rv.id} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
                {rv.decision === "approved" ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : rv.decision === "rejected" ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" /> : <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
                <div><p className="text-sm font-semibold capitalize text-white">{rv.decision.replace(/_/g, " ")}</p><p className="text-xs text-slate-500">by {rv.reviewer?.full_name ?? "Unknown"} - {rv.comment ?? "No comment"}</p></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canViewOperationalLinks && threat.linked_alerts?.length > 0 ? (
        <section className="soc-panel p-5">
          <SectionHeader title="Linked Alerts" icon={ShieldAlert} />
          <div className="space-y-2">
            {threat.linked_alerts.map((la: any) => (
              <Link key={`${la.alert_id}-${la.threat_entry_id}`} to={`/alerts/${la.alert_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
                <div><p className="text-sm font-semibold text-white">Alert #{la.alert_id}</p><p className="text-xs text-slate-500">{la.reason ?? "No reason provided"}</p></div>
                {la.confidence != null ? <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300">{la.confidence}% confidence</span> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : canViewOperationalLinks ? (
        <EmptyState title="No linked alerts" description="Alerts associated with this threat entry will appear here." icon={ShieldAlert} />
      ) : null}
    </div>
  );
}

function TextPanel({ title, value, tone }: { title: string; value: string; tone: string }) {
  return (
    <section className="soc-panel p-5">
      <h2 className={`text-lg font-bold ${tone}`}>{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{value}</p>
    </section>
  );
}
