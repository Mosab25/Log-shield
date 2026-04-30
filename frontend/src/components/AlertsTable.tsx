import { Link } from "react-router-dom";
import { RiskBadge } from "./RiskBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function AlertsTable({ alerts }: { alerts: any[] }) {
  return (
    <div className="soc-panel overflow-hidden">
      <div className="border-b border-slate-800/80 px-5 py-4"><h2 className="text-lg font-bold text-white">Alerts</h2></div>
      <div className="overflow-x-auto">
        <table className="soc-table">
          <thead><tr><th>Alert</th><th>Severity</th><th>Risk</th><th>Status</th><th>Details</th></tr></thead>
          <tbody>
            {alerts.map(a => <tr key={a.id}><td><p className="font-semibold text-white">{a.title}</p><p className="mt-1 text-xs text-slate-500">#{a.id}</p></td><td><SeverityBadge severity={a.severity} /></td><td><RiskBadge score={a.risk_score} /></td><td><StatusBadge status={a.status} /></td><td><Link className="font-semibold text-cyan-200 hover:text-white" to={`/alerts/${a.id}`}>Open</Link></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
