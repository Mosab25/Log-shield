import { useMemo, useState } from "react";
import { Chip } from "./ui/Chip";
import { RowActions } from "./ui/RowActions";
import { BulkBar } from "./ui/BulkBar";

export function RulesTable({
  rules,
  onToggle,
  onSetActive,
  onEdit,
  togglingRuleId,
}: {
  rules: any[];
  onToggle?: (rule: any) => void;
  onSetActive?: (rule: any, isActive: boolean) => void;
  onEdit?: (rule: any) => void;
  togglingRuleId?: number | null;
}) {
  const canToggle = Boolean(onToggle);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allIds = useMemo(() => rules.map(rule => rule.id), [rules]);
  const selectedRules = useMemo(() => rules.filter(rule => selectedIds.includes(rule.id)), [rules, selectedIds]);

  function toneForSeverity(severity: string) {
    const value = String(severity || "").toLowerCase();
    if (value === "critical" || value === "high") return "critical" as const;
    if (value === "medium") return "warning" as const;
    return "info" as const;
  }

  function toneForStatus(active: boolean) {
    return active ? ("safe" as const) : ("neutral" as const);
  }

  function rowTint(rule: any) {
    const value = String(rule.severity || "").toLowerCase();
    if (value === "critical" || value === "high") return { backgroundColor: "rgba(255,59,59,0.03)" };
    if (value === "medium") return { backgroundColor: "rgba(245,158,11,0.03)" };
    return undefined;
  }

  return (
    <div className="soc-panel overflow-hidden">
      <BulkBar
        active={selectedIds.length > 0}
        selectedCount={selectedIds.length}
        actions={
          <>
            <button
              type="button"
              className="row-action success"
              onClick={() => selectedRules.forEach(rule => onSetActive?.(rule, true))}
              disabled={!onSetActive}
              title={!onSetActive ? "Rule update endpoint is not configured for your role." : undefined}
            >
              Enable All
            </button>
            <button
              type="button"
              className="row-action"
              onClick={() => selectedRules.forEach(rule => onSetActive?.(rule, false))}
              disabled={!onSetActive}
              title={!onSetActive ? "Rule update endpoint is not configured for your role." : undefined}
            >
              Disable All
            </button>
            <button type="button" className="row-action danger" disabled title="Rule deletion endpoint is not configured yet.">Delete</button>
            <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
          </>
        }
      />
      <div className="table-wrapper">
        <table className="soc-table tbl">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allIds.length > 0 && selectedIds.length === allIds.length}
                  onChange={event => setSelectedIds(event.target.checked ? allIds : [])}
                />
              </th>
              <th>Rule</th>
              <th>Severity</th>
              <th>MITRE</th>
              <th>Triggers</th>
              <th>Last Triggered</th>
              <th className="col-hide-mobile">Updated</th>
              <th>Status</th>
              {canToggle ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} style={rowTint(rule)}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(rule.id)}
                    onChange={event => setSelectedIds(prev => (event.target.checked ? [...prev, rule.id] : prev.filter(id => id !== rule.id)))}
                  />
                </td>
                <td>
                  <p className="font-semibold text-white">{rule.name}</p>
                  <p className="col-hide-mobile mt-1 max-w-xl text-sm text-cyber-muted">{rule.description || "No description provided."}</p>
                </td>
                <td><Chip tone={toneForSeverity(rule.severity)}>{rule.severity}</Chip></td>
                <td className="text-cyber-muted">{rule.mitre_technique || "N/A"}</td>
                <td className="font-semibold text-white">{rule.trigger_count ?? 0}</td>
                <td className="whitespace-nowrap text-cyber-muted">{rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : "N/A"}</td>
                <td className="col-hide-mobile whitespace-nowrap text-cyber-muted">{rule.updated_at ? new Date(rule.updated_at).toLocaleString() : "N/A"}</td>
                <td><Chip tone={toneForStatus(rule.is_active)}>{rule.is_active ? "Enabled" : "Disabled"}</Chip></td>
                {canToggle ? (
                  <td>
                    <RowActions
                      items={[
                        { key: "edit", label: "Edit", variant: "primary", onClick: () => onEdit?.(rule), disabled: !onEdit, title: !onEdit ? "Rule editing endpoint is not configured for your role." : undefined },
                        rule.is_active
                          ? { key: "disable", label: togglingRuleId === rule.id ? "Updating..." : "Disable", onClick: () => onToggle?.(rule), disabled: togglingRuleId === rule.id }
                          : { key: "enable", label: togglingRuleId === rule.id ? "Updating..." : "Enable", variant: "success", onClick: () => onToggle?.(rule), disabled: togglingRuleId === rule.id },
                        { key: "delete", label: "Delete", variant: "danger", disabled: true, title: "Rule deletion endpoint is not configured yet." },
                      ]}
                    />
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
