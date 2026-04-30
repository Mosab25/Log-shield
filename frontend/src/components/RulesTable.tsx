import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function RulesTable({
  rules,
  onToggle,
  togglingRuleId,
}: {
  rules: any[];
  onToggle: (rule: any) => void;
  togglingRuleId?: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Rule</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3">MITRE</th>
              <th className="px-5 py-3">Triggers</th>
              <th className="px-5 py-3">Last Triggered</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rules.map(rule => (
              <tr key={rule.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold">{rule.name}</p>
                  <p className="text-sm text-slate-400">{rule.description || "No description provided."}</p>
                </td>
                <td className="px-5 py-4"><SeverityBadge severity={rule.severity} /></td>
                <td className="px-5 py-4 text-sm text-slate-300">{rule.mitre_technique || "N/A"}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{rule.trigger_count ?? 0}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : "N/A"}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{rule.updated_at ? new Date(rule.updated_at).toLocaleString() : "N/A"}</td>
                <td className="px-5 py-4"><StatusBadge status={rule.is_active ? "open" : "false_positive"} /></td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => onToggle(rule)}
                    disabled={togglingRuleId === rule.id}
                    className="rounded-2xl border border-slate-700 px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {togglingRuleId === rule.id ? "Updating..." : rule.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
