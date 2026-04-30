export function AuditLogsTable({ logs, onOpenDetails }: { logs: any[]; onOpenDetails: (log: any) => void }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">Actor</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Entity</th>
              <th className="px-5 py-3">IP Address</th>
              <th className="px-5 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map(log => (
              <tr key={log.id}>
                <td className="px-5 py-4 text-sm text-slate-300">{log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}</td>
                <td className="px-5 py-4 text-sm">{log.actor?.full_name ?? "System"}</td>
                <td className="px-5 py-4 text-sm">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">{log.action}</span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-300">{log.entity_type ?? "N/A"} / {log.entity_id ?? "N/A"}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{log.ip_address ?? "N/A"}</td>
                <td className="px-5 py-4 text-sm">
                  <button onClick={() => onOpenDetails(log)} className="rounded-xl border border-slate-700 px-3 py-1">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
