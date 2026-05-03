import { useEffect, useState } from "react";
import { Award, BookOpen, CheckCircle, RefreshCw, TrendingUp, XCircle } from "lucide-react";

import { apiClient } from "../api/client";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

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
      setError(err?.message || "Failed to load your scores.");
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
        eyebrow="Security Awareness"
        title="My Scores"
        description="Review your quiz attempts, understand weak areas, and continue building SOC investigation knowledge."
        icon={Award}
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="soc-panel p-5">
          <p className="text-xs font-black uppercase text-slate-500">Attempts</p>
          <p className="mt-2 text-3xl font-black text-white">{items.length}</p>
        </div>
        <div className="soc-panel p-5">
          <p className="text-xs font-black uppercase text-slate-500">Passed</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{passed}</p>
        </div>
        <div className="soc-panel p-5">
          <p className="text-xs font-black uppercase text-slate-500">Average</p>
          <p className="mt-2 text-3xl font-black text-cyan-200">{average}%</p>
        </div>
      </div>

      <RecommendedActions
        title="Learning recommendations"
        actions={[
          "Review explanations for incorrect answers.",
          "Retake low-scoring quiz categories.",
          "Practice related SOC Tools on sample IOCs.",
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
                    <th>Category</th>
                    <th>Score</th>
                    <th>Result</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-white">{item.quiz_title}</p>
                        <p className="text-xs text-slate-500">{item.quiz_type}</p>
                      </td>
                      <td className="text-slate-300">{item.quiz_category}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-cyan-200" />
                          <span className="font-bold text-white">{item.score}/{item.total_questions}</span>
                          <span className="text-slate-400">({item.percentage}%)</span>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${item.passed ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-red-300/30 bg-red-400/10 text-red-200"}`}>
                          {item.passed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {item.passed ? "Passed" : "Needs review"}
                        </span>
                      </td>
                      <td className="text-slate-400">{formatDate(item.submitted_at)}</td>
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
