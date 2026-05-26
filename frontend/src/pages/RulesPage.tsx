import { useEffect, useState } from "react";
import { ListChecks, RefreshCw } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { RulesTable } from "../components/RulesTable";
import { PageHeader } from "../components/ui/PageHeader";
import { AppModal } from "../components/ui/AppModal";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

export function RulesPage() {
  const { role } = useAuth();
  const canToggleRules = role === "admin";
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    severity: "medium",
    risk_weight: 10,
    is_active: true,
    mitre_tactic: "",
    mitre_technique: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any>("/detection/rules?limit=100");
      setRules(Array.isArray(response?.items) ? response.items : []);
    } catch (err: any) {
      setRules([]);
      setError(toUserErrorMessage(err, "Failed to load detection rules."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [refreshTick]);

  async function setRuleActive(rule: any, isActive: boolean) {
    setError(null);
    setTogglingRuleId(rule.id);
    try {
      await apiClient.patch(`/detection/rules/${rule.id}`, { is_active: isActive });
      await load();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to update rule state."));
    } finally {
      setTogglingRuleId(null);
    }
  }

  async function toggle(rule: any) {
    await setRuleActive(rule, !rule.is_active);
  }

  function openEdit(rule: any) {
    setEditingRule(rule);
    setEditForm({
      description: rule.description || "",
      severity: rule.severity || "medium",
      risk_weight: Number(rule.risk_weight ?? 10),
      is_active: Boolean(rule.is_active),
      mitre_tactic: rule.mitre_tactic || "",
      mitre_technique: rule.mitre_technique || "",
    });
  }

  async function saveEdit() {
    if (!editingRule) return;
    setSavingEdit(true);
    setError(null);
    try {
      await apiClient.patch(`/detection/rules/${editingRule.id}`, {
        description: editForm.description || null,
        severity: editForm.severity,
        risk_weight: editForm.risk_weight,
        is_active: editForm.is_active,
        mitre_tactic: editForm.mitre_tactic || null,
        mitre_technique: editForm.mitre_technique || null,
      });
      setEditingRule(null);
      await load();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to update detection rule."));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detection"
        title="Detection Rules"
        description="Review detection rules, severity, MITRE mapping, trigger activity, and enable or disable states."
        actions={<button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="soc-button-ghost"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>}
      />

      {error ? <ErrorState message={error} onRetry={() => setRefreshTick(v => v + 1)} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading && rules.length === 0 ? (
        <EmptyState title="No detection rules found" description="Rules will appear here when configured by the backend." icon={ListChecks} />
      ) : null}

      {!loading && rules.length > 0 ? (
        <RulesTable
          rules={rules}
          onToggle={canToggleRules ? toggle : undefined}
          onSetActive={canToggleRules ? setRuleActive : undefined}
          onEdit={canToggleRules ? openEdit : undefined}
          togglingRuleId={togglingRuleId}
        />
      ) : null}

      {editingRule ? (
        <AppModal isOpen={Boolean(editingRule)} onClose={() => setEditingRule(null)} size="lg" panelClassName="soc-panel-strong p-6">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edit Detection Rule</p>
              <h2 className="mt-1 text-xl font-black text-white">{editingRule.name}</h2>
              <p className="mt-1 text-sm text-slate-400">Rule name, category, and matching pattern are read-only here. Editable fields use the existing rule update endpoint.</p>
            </div>

            <label className="block text-sm text-slate-300">
              Description
              <textarea
                value={editForm.description}
                onChange={event => setEditForm(prev => ({ ...prev, description: event.target.value }))}
                className="soc-input mt-2 min-h-24 w-full"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm text-slate-300">
                Severity
                <select value={editForm.severity} onChange={event => setEditForm(prev => ({ ...prev, severity: event.target.value }))} className="soc-input mt-2 w-full">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Risk Weight
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editForm.risk_weight}
                  onChange={event => setEditForm(prev => ({ ...prev, risk_weight: Number(event.target.value) }))}
                  className="soc-input mt-2 w-full"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Status
                <select value={editForm.is_active ? "enabled" : "disabled"} onChange={event => setEditForm(prev => ({ ...prev, is_active: event.target.value === "enabled" }))} className="soc-input mt-2 w-full">
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                MITRE Tactic
                <input value={editForm.mitre_tactic} onChange={event => setEditForm(prev => ({ ...prev, mitre_tactic: event.target.value }))} className="soc-input mt-2 w-full" />
              </label>
              <label className="block text-sm text-slate-300">
                MITRE Technique
                <input value={editForm.mitre_technique} onChange={event => setEditForm(prev => ({ ...prev, mitre_technique: event.target.value }))} className="soc-input mt-2 w-full" />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setEditingRule(null)} className="soc-button-ghost">Cancel</button>
              <button type="button" onClick={() => void saveEdit()} disabled={savingEdit} className="soc-button-primary disabled:opacity-60">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
