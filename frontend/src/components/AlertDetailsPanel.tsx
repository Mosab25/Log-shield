import { ShieldAlert } from "lucide-react";
import { RiskBadge } from "./RiskBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

const ATTACK_TYPE_COLORS: Record<string, string> = {
  brute_force: "bg-red-500/20 text-red-300 border-red-500/30",
  unauthorized_access: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  web_attack: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  privilege_escalation: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reconnaissance: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  anomaly: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const ATTACK_TYPE_LABELS: Record<string, string> = {
  brute_force: "Brute Force Attack",
  unauthorized_access: "Unauthorized Access",
  web_attack: "Web Application Attack",
  privilege_escalation: "Privilege Escalation",
  reconnaissance: "Reconnaissance / Scanning",
  anomaly: "Anomalous Behavior",
};

const ATTACK_TYPE_DESCRIPTIONS: Record<string, string> = {
  brute_force: "Multiple failed authentication attempts detected from a single source, suggesting a brute force password attack.",
  unauthorized_access: "Access to resources or accounts from unusual sources or locations, indicating potential unauthorized entry.",
  web_attack: "Malicious web requests detected, including injection attempts, path traversal, or other web-based attack vectors.",
  privilege_escalation: "A user account's permissions were elevated beyond their authorized level, potentially indicating insider threat or compromise.",
  reconnaissance: "Systematic probing of the network or application to discover vulnerabilities, open ports, or sensitive paths.",
  anomaly: "Unusual patterns detected that deviate from normal system behavior, warranting further investigation.",
};

export function AlertDetailsPanel({ alert, risk }: { alert: any; risk: any | null }) {
  const attackType = alert.attack_type;
  const attackColor = attackType ? (ATTACK_TYPE_COLORS[attackType] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30") : "";
  const attackLabel = attackType ? (ATTACK_TYPE_LABELS[attackType] ?? attackType.replace(/_/g, " ")) : null;
  const attackDesc = attackType ? (ATTACK_TYPE_DESCRIPTIONS[attackType] ?? null) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap gap-3"><SeverityBadge severity={alert.severity} /><RiskBadge score={alert.risk_score} /><StatusBadge status={alert.status} /></div>
        <h1 className="mt-5 text-3xl font-bold">{alert.title}</h1>
        <p className="mt-3 text-slate-400">{alert.description ?? "No description."}</p>
        {attackLabel && (
          <div className={`mt-4 rounded-2xl border p-4 ${attackColor}`}>
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /><span className="font-bold">{attackLabel}</span></div>
            {attackDesc && <p className="mt-2 text-sm opacity-80">{attackDesc}</p>}
            {alert.mitre_tactic && <p className="mt-2 text-xs opacity-60">MITRE ATT&CK: {alert.mitre_tactic}{alert.mitre_technique ? ` → ${alert.mitre_technique}` : ""}</p>}
          </div>
        )}
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">Source IP</p><p>{alert.source_ip ?? "—"}</p></div>
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">Username</p><p>{alert.username ?? "—"}</p></div>
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">MITRE</p><p>{alert.mitre_technique ?? "—"}</p></div>
          <div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">Assigned</p><p>{alert.assigned_analyst?.full_name ?? "Unassigned"}</p></div>
        </div>
      </section>
      {risk && <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-lg font-semibold">Risk Analysis</h2><p className="mt-3 text-sm text-slate-400">{risk.explanation}</p></section>}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-lg font-semibold">Related Logs</h2><div className="mt-4 space-y-3">{alert.related_logs.map((l:any)=><div key={l.id} className="rounded-2xl bg-slate-950 p-4"><p className="font-semibold">{l.event_type}</p><p className="text-sm text-slate-400">{l.message}</p></div>)}</div></section>
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-lg font-semibold">Status History</h2><div className="mt-4 space-y-3">{alert.status_history.map((h:any)=><div key={h.id} className="rounded-2xl bg-slate-950 p-4"><StatusBadge status={h.new_status}/><p className="mt-2 text-sm text-slate-400">{h.comment ?? ""}</p></div>)}</div></section>
    </div>
  );
}
