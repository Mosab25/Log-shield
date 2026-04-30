import { useEffect, useState } from "react";
import { ListChecks, RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";
import { RulesTable } from "../components/RulesTable";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

export function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any>("/detection/rules?limit=100");
      setRules(Array.isArray(response?.items) ? response.items : []);
    } catch (err: any) {
      setRules([]);
      setError(err?.message || "Failed to load detection rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [refreshTick]);

  async function toggle(rule: any) {
    setError(null);
    setTogglingRuleId(rule.id);
    try {
      await apiClient.patch(`/detection/rules/${rule.id}`, { is_active: !rule.is_active });
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to update rule state.");
    } finally {
      setTogglingRuleId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detection"
        title="Detection Rules"
        description="Review detection rules, severity, MITRE mapping, trigger activity, and enable or disable states."
        icon={ListChecks}
        actions={<button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="soc-button-ghost"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>}
      />

      {error ? <ErrorState message={error} onRetry={() => setRefreshTick(v => v + 1)} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading && rules.length === 0 ? (
        <EmptyState title="No detection rules found" description="Rules will appear here when configured by the backend." icon={ListChecks} />
      ) : null}

      {!loading && rules.length > 0 ? <RulesTable rules={rules} onToggle={toggle} togglingRuleId={togglingRuleId} /> : null}
    </div>
  );
}
