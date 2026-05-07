import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function RulesTable({
  rules,
  onToggle,
  togglingRuleId,
}: {
  rules: any[];
  onToggle?: (rule: any) => void;
  togglingRuleId?: number | null;
}) {
  const canToggle = Boolean(onToggle);
  return (
    <div className="soc-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Severity</th>
              <th>MITRE</th>
              <th>Triggers</th>
              <th>Last Triggered</th>
              <th>Updated</th>
              <th>Status</th>
              {canToggle ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id}>
                <td>
                  <p className="font-semibold text-white">{rule.name}</p>
                  <p className="mt-1 max-w-xl text-sm text-cyber-muted">{rule.description || "No description provided."}</p>
                </td>
                <td><SeverityBadge severity={rule.severity} /></td>
                <td className="text-cyber-muted">{rule.mitre_technique || "N/A"}</td>
                <td className="font-semibold text-white">{rule.trigger_count ?? 0}</td>
                <td className="whitespace-nowrap text-cyber-muted">{rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : "N/A"}</td>
                <td className="whitespace-nowrap text-cyber-muted">{rule.updated_at ? new Date(rule.updated_at).toLocaleString() : "N/A"}</td>
                <td><StatusBadge status={rule.is_active ? "open" : "false_positive"} /></td>
                {canToggle ? (
                  <td>
                    <button
                      onClick={() => onToggle?.(rule)}
                      disabled={togglingRuleId === rule.id}
                      className={rule.is_active ? "soc-button-ghost px-3 py-1.5 text-xs" : "soc-button-primary px-3 py-1.5 text-xs"}
                    >
                      {togglingRuleId === rule.id ? "Updating..." : rule.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
