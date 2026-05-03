export function AuditLogsTable({ logs, onOpenDetails }: { logs: any[]; onOpenDetails: (log: any) => void }) {
  return (
    <div className="soc-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP Address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-cyber-muted">{log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}</td>
                <td><p className="font-semibold text-white">{log.actor?.full_name ?? "System"}</p></td>
                <td>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">{log.action}</span>
                </td>
                <td className="text-cyber-muted">{log.entity_type ?? "N/A"} / {log.entity_id ?? "N/A"}</td>
                <td className="font-mono text-xs text-cyber-muted">{log.ip_address ?? "N/A"}</td>
                <td>
                  <button onClick={() => onOpenDetails(log)} className="soc-button-ghost px-3 py-1.5 text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
