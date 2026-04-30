import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function LogsTable({ logs }: { logs: any[] }) {
  return (
    <div className="soc-panel overflow-hidden">
      <div className="border-b border-slate-800/80 px-5 py-4"><h2 className="text-lg font-bold text-white">Security Events</h2></div>
      <div className="overflow-x-auto">
        <table className="soc-table">
          <thead><tr><th>Event</th><th>Severity</th><th>Source</th><th>Message</th></tr></thead>
          <tbody>{logs.map(l => <tr key={l.id}><td><p className="font-semibold text-white">{l.event_type}</p><span className="text-xs text-slate-500">{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</span></td><td><SeverityBadge severity={l.severity} /></td><td className="font-mono text-xs text-slate-300">{l.source}</td><td className="max-w-xl text-slate-400"><p className="line-clamp-2">{l.message}</p></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
