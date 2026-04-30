import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { apiClient } from "../api/client";
import { Pagination } from "../components/Pagination";
import { RiskBadge } from "../components/RiskBadge";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";

const ATTACK_TYPE_COLORS: Record<string, string> = {
  brute_force: "bg-red-500/20 text-red-300 border-red-500/30",
  unauthorized_access: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  web_attack: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  privilege_escalation: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reconnaissance: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  anomaly: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const ATTACK_TYPE_LABELS: Record<string, string> = {
  brute_force: "Brute Force",
  unauthorized_access: "Unauthorized Access",
  web_attack: "Web Attack",
  privilege_escalation: "Privilege Escalation",
  reconnaissance: "Reconnaissance",
  anomaly: "Anomaly",
};

function AttackTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const color = ATTACK_TYPE_COLORS[type] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const label = ATTACK_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${color}`}><ShieldAlert className="h-3 w-3" />{label}</span>;
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const pageSize = 10;

  async function load() {
    const p = new URLSearchParams({ skip: String((page-1)*pageSize), limit: String(pageSize) });
    if (status) p.set("status", status); if (severity) p.set("severity", severity);
    const res = await apiClient.get<any>(`/alerts?${p.toString()}`);
    setAlerts(res.items); setTotal(res.total);
  }
  useEffect(() => { void load(); }, [page, status, severity]);

  async function updateStatus(id: number, next: string) {
    if (!next) return;
    await apiClient.patch(`/alerts/${id}/status`, { status: next, comment: "Updated from alerts page." });
    await load();
  }

  return (
    <div className="space-y-6">
      <section><p className="text-sm uppercase tracking-[.3em] text-cyan-300">Alerts</p><h1 className="mt-3 text-3xl font-bold text-white">Alert Management</h1></section>
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 flex gap-3">
        <select value={severity} onChange={e=>setSeverity(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2"><option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-2xl bg-slate-950 px-4 py-2"><option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option></select>
      </section>
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full divide-y divide-slate-800"><tbody className="divide-y divide-slate-800">
          {alerts.map(a => <tr key={a.id}><td className="px-5 py-4"><div className="flex items-center gap-2 mb-1"><AttackTypeBadge type={a.attack_type} /></div><p className="font-semibold">{a.title}</p><p className="text-xs text-slate-500">{a.source_ip ?? "—"} · {a.username ?? "unknown"}</p>{a.mitre_tactic && <p className="text-xs text-cyan-400/70 mt-1">MITRE: {a.mitre_tactic}{a.mitre_technique ? ` → ${a.mitre_technique}` : ""}</p>}</td><td className="px-3"><SeverityBadge severity={a.severity} /></td><td className="px-3"><RiskBadge score={a.risk_score} /></td><td className="px-3"><StatusBadge status={a.status} /><select defaultValue="" onChange={e=>void updateStatus(a.id, e.target.value)} className="mt-2 block rounded-xl bg-slate-950 px-2 py-1 text-xs"><option value="">Change</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="false_positive">False Positive</option><option value="escalated">Escalated</option></select></td><td className="px-3"><Link className="text-cyan-300" to={`/alerts/${a.id}`}>Open</Link></td></tr>)}
        </tbody></table>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
