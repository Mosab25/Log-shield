import { useEffect, useState } from "react";
import { Award, BookOpen, CheckCircle, RefreshCw, TrendingUp, XCircle } from "lucide-react";

import { apiClient, toUserErrorMessage } from "../api/client";
import { Chip } from "../components/ui/Chip";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { StatCard } from "../components/ui/StatCard";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

interface UserAttempt {
  id: number;
  quiz_id: number;
  quiz_title: string;
  quiz_category: string;
  quiz_type: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
}

interface ScoresResponse {
  items: UserAttempt[];
  total: number;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function MyScoresPage() {
  const [items, setItems] = useState<UserAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ScoresResponse>("/awareness/my-scores?limit=50");
      setItems(Array.isArray(response.items) ? response.items : []);
    } catch (err: any) {
      setItems([]);
      setError(toUserErrorMessage(err, "Training scores are currently unavailable. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const average = items.length
    ? Math.round(items.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / items.length)
    : 0;
  const passed = items.filter(item => item.passed).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SECURITY AWARENESS"
        title="My Scores"
        description="Review your quiz attempts, understand weak areas, and continue building Security Operations investigation knowledge."
        actions={
          <button type="button" onClick={() => void load()} className="soc-button-ghost">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <InfoHint title="How to use this page">
        Scores show what you already understand and where to focus next. Review failed questions inside each quiz result, then retake related modules after studying the explanations.
      </InfoHint>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Completed Quizzes" value={items.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Passed" value={<span className="text-[var(--status-safe)]">{passed}</span>} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Needs Review" value={<span className="text-[var(--status-critical)]">{Math.max(0, items.length - passed)}</span>} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Average Score" value={<span className="text-[var(--brand)]">{average}%</span>} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <RecommendedActions
        title="Learning recommendations"
        actions={[
          "Review explanations for incorrect answers.",
          "Retake low-scoring quiz categories.",
          "Practice related Security Operations Toolkit tasks on sample IOCs.",
          "Connect quiz topics to real alerts and incidents.",
        ]}
      />

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={5} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No scores yet" description="Complete a quiz to start tracking your learning progress." icon={BookOpen} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-white">{item.quiz_title}</p>
                        <p className="text-xs text-slate-500">{item.quiz_type}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-cyan-200" />
                          <span className="font-bold text-white">{item.score}/{item.total_questions}</span>
                          <Chip tone={item.percentage >= 80 ? "safe" : item.percentage >= 60 ? "warning" : "critical"}>{item.percentage}%</Chip>
                        </div>
                      </td>
                      <td>
                        <Chip tone={item.passed ? "safe" : "critical"}>{item.passed ? "Passed" : "Needs Review"}</Chip>
                      </td>
                      <td className="text-slate-400">{formatDate(item.submitted_at)}</td>
                      <td>
                        <RowActions
                          items={[
                            { key: "review", label: "Review", variant: "primary" },
                            ...(item.passed ? [] : [{ key: "retake", label: "Retake" }]),
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
