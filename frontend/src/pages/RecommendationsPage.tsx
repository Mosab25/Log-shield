import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import {
  latestWebsiteScan,
  recommendationsFromScan,
  setRecommendationStatus,
  type RecommendationItem,
} from "../features/mySecurity/scanHistory";

function tone(priority: RecommendationItem["priority"]) {
  if (priority === "critical") return "critical" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "info" as const;
  return "neutral" as const;
}

function statusTone(status: RecommendationItem["status"]) {
  if (status === "done") return "safe" as const;
  if (status === "in_progress") return "warning" as const;
  if (status === "ignored") return "neutral" as const;
  return "info" as const;
}

export function RecommendationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [refreshTick, setRefreshTick] = useState(0);
  const latestScan = useMemo(() => latestWebsiteScan(userId), [userId, refreshTick]);
  const recommendations = useMemo(() => recommendationsFromScan(latestScan, userId), [latestScan, userId, refreshTick]);

  function updateStatus(item: RecommendationItem, status: RecommendationItem["status"]) {
    setRecommendationStatus(userId, item.id, status);
    setRefreshTick((value) => value + 1);
  }

  function exportRecommendations() {
    const lines = recommendations.map(
      (item) =>
        `[${item.priority.toUpperCase()}] ${item.title}\nStatus: ${item.status}\nWhy it matters: ${item.why_it_matters}\nHow to fix: ${item.how_to_fix}\nEffort: ${item.estimated_effort} | Impact: ${item.impact}\n`,
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-recommendations-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!latestScan) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="User Security Portal"
          title="Recommendations"
          description="Turn scan findings into clear user actions with practical fix guidance."
        />
        <EmptyState
          title="No recommendations yet"
          description="Run your first website scan to generate actionable recommendations."
          icon={<ClipboardList className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User Security Portal"
        title="Recommendations"
        description="Turn scan findings into clear user actions with practical fix guidance."
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportRecommendations} className="soc-button-ghost">Export Recommendations</button>
      </div>

      <div className="space-y-3">
        {recommendations.map((item) => (
          <div key={item.id} className="soc-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{item.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Chip tone={tone(item.priority)}>{item.priority}</Chip>
                  <Chip tone={statusTone(item.status)}>{item.status.replace("_", " ")}</Chip>
                </div>
              </div>
              <RowActions
                items={[
                  { key: "done", label: "Mark Done", onClick: () => updateStatus(item, "done"), variant: "success" },
                  { key: "progress", label: "In Progress", onClick: () => updateStatus(item, "in_progress"), variant: "primary" },
                  { key: "ignore", label: "Ignore", onClick: () => updateStatus(item, "ignored"), variant: "danger" },
                  { key: "open", label: "Reopen", onClick: () => updateStatus(item, "open") },
                  {
                    key: "copy",
                    label: "Copy Fix Steps",
                    onClick: () => void navigator.clipboard.writeText(`${item.title}\nHow to fix: ${item.how_to_fix}`),
                  },
                ]}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Why it matters</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{item.why_it_matters}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">How to fix</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{item.how_to_fix}</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-[var(--text-muted)]">
              Estimated effort: <span className="text-[var(--text-primary)]">{item.estimated_effort}</span> | Impact:{" "}
              <span className="text-[var(--text-primary)]">{item.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
