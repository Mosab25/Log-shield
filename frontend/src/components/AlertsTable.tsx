import { Link } from "react-router-dom";
import { RiskBadge } from "./RiskBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function AlertsTable({ alerts }: { alerts: any[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
      <div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-semibold">Alerts</h2></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead><tr><th className="px-5 py-3 text-left text-xs text-slate-400">Alert</th><th className="px-5 py-3">Severity</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Details</th></tr></thead>
          <tbody className="divide-y divide-slate-800">
            {alerts.map(a => <tr key={a.id}><td className="px-5 py-4 text-white">{a.title}</td><td><SeverityBadge severity={a.severity} /></td><td><RiskBadge score={a.risk_score} /></td><td><StatusBadge status={a.status} /></td><td><Link className="text-cyan-300" to={`/alerts/${a.id}`}>Open</Link></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
