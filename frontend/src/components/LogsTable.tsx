import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function LogsTable({ logs }: { logs: any[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
      <div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-semibold">Security Events</h2></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead><tr><th className="px-5 py-3 text-left text-xs text-slate-400">Event</th><th>Severity</th><th>Source</th><th>Message</th></tr></thead>
          <tbody className="divide-y divide-slate-800">{logs.map(l => <tr key={l.id}><td className="px-5 py-4">{l.event_type}<br/><span className="text-xs text-slate-500">{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</span></td><td><SeverityBadge severity={l.severity} /></td><td className="px-5 py-4">{l.source}</td><td className="px-5 py-4 text-slate-400">{l.message}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
