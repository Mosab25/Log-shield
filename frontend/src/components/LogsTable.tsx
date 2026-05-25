import { memo } from "react";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { deriveAttackSignalFromText } from "../securitySignals";

export const LogsTable = memo(function LogsTable({ logs }: { logs: any[] }) {
  return (
    <div className="soc-panel overflow-hidden">
      <div className="border-b border-cyan-400/10 px-5 py-4"><h2 className="text-lg font-bold text-cyber-text">Security Events</h2></div>
      <div className="table-wrapper">
        <table className="soc-table tbl">
          <thead><tr><th>Event</th><th>Severity</th><th>Source</th><th>Message</th></tr></thead>
          <tbody>{logs.map(l => {
            const signal = deriveAttackSignalFromText(l.message, l.raw_message, l.event_type, l.user_agent);
            return (
              <tr key={l.id}>
                <td>
                  <p className="font-semibold text-white">{l.event_type}</p>
                  <span className="text-xs text-cyber-muted/60">{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</span>
                  {signal.isAttack ? (
                    <p className="mt-1 text-[11px] font-bold text-red-200">Attack: {signal.attackLabel}</p>
                  ) : null}
                </td>
                <td><SeverityBadge severity={l.severity} /></td>
                <td className="font-mono text-xs text-cyber-muted">{l.source}</td>
                <td className="max-w-xl text-cyber-muted"><p className="line-clamp-2">{l.message}</p></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
});
