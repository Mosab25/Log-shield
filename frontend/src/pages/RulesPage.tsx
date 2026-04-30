import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";
import { RulesTable } from "../components/RulesTable";

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
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[.3em] text-cyan-300">Detection</p>
          <h1 className="mt-3 text-3xl font-bold">Detection Rules</h1>
          <p className="mt-3 text-sm text-slate-400">Review detection rules, severity, MITRE mapping, and enable/disable states.</p>
        </div>
        <button onClick={() => setRefreshTick(v => v + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </section>

      {error ? <div className="rounded-2xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
      {loading ? <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">Loading detection rules...</div> : null}

      {!loading && rules.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">
          No data available yet. Ingest logs or run demo seed data.
        </div>
      ) : null}

      {!loading && rules.length > 0 ? <RulesTable rules={rules} onToggle={toggle} togglingRuleId={togglingRuleId} /> : null}
    </div>
  );
}
