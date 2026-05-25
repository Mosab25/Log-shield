import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Users, Award, TrendingUp, Calendar, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { Pagination } from "../components/Pagination";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

interface QuizScore {
  id: number;
  quiz_id: number;
  quiz_title: string;
  quiz_category: string;
  quiz_type: string;
  user_id: number;
  user_email: string;
  user_full_name: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
}

interface QuizMetadata {
  categories: string[];
  types: string[];
  difficulties: string[];
}

export function QuizScoresPage() {
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [metadata, setMetadata] = useState<QuizMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    quiz_id: "",
    category: "",
    type: "",
    passed: ""
  });
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  async function loadScores() {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      let url = `/awareness/scores?skip=${skip}&limit=${pageSize}`;
      
      if (filters.quiz_id) url += `&quiz_id=${filters.quiz_id}`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.type) url += `&type=${filters.type}`;
      if (filters.passed) url += `&passed=${filters.passed}`;
      
      const res = await apiClient.get<any>(url);
      const normalized = Array.isArray(res.items) ? res.items.map((item: any) => ({
        ...item,
        id: item.id ?? item.attempt_id,
        quiz_category: item.quiz_category ?? item.category,
        quiz_type: item.quiz_type ?? item.type,
        user_full_name: item.user_full_name ?? item.user_email ?? "Unknown user",
      })) : [];
      setScores(normalized);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setScores([]);
      setTotal(0);
      setError(toUserErrorMessage(err, "Student scores are currently unavailable. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function loadMetadata() {
    try {
      const meta = await apiClient.get<QuizMetadata>("/awareness/quizzes/metadata");
      setMetadata(meta);
    } catch (e) {
      // Metadata is optional
    }
  }

  useEffect(() => { void loadScores(); void loadMetadata(); }, [page, filters]);

  const visible = useMemo(() => {
    if (!search) return scores;
    return scores.filter(score => 
      score.user_email.toLowerCase().includes(search.toLowerCase()) ||
      score.user_full_name.toLowerCase().includes(search.toLowerCase()) ||
      score.quiz_title.toLowerCase().includes(search.toLowerCase()) ||
      score.quiz_category.toLowerCase().includes(search.toLowerCase())
    );
  }, [scores, search]);

  function resetFilters() {
    setFilters({
      quiz_id: "",
      category: "",
      type: "",
      passed: ""
    });
    setSearch("");
    setPage(1);
  }

  function applyFilters() {
    setPage(1);
    setShowFilters(false);
  }

  function exportToCSV() {
    if (visible.length === 0) return;
    
    const headers = ["User", "Email", "Quiz", "Category", "Type", "Score", "Total", "Percentage", "Result", "Date"];
    const csvData = visible.map(score => [
      score.user_full_name,
      score.user_email,
      score.quiz_title,
      score.quiz_category,
      score.quiz_type,
      score.score,
      score.total_questions,
      `${score.percentage}%`,
      score.passed ? "Passed" : "Failed",
      new Date(score.submitted_at).toLocaleDateString()
    ]);
    
    const csv = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-scores-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function getCategoryColor(category: string) {
    return category
      ? "bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/25"
      : "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (visible.length === 0) return { totalAttempts: 0, passRate: 0, avgScore: 0, topPerformer: null };
    
    const passedCount = visible.filter(s => s.passed).length;
    const passRate = (passedCount / visible.length) * 100;
    const avgScore = visible.reduce((sum, s) => sum + s.percentage, 0) / visible.length;
    
    const topPerformer = visible.reduce((top, current) => 
      !top || current.percentage > top.percentage ? current : top, null as QuizScore | null
    );
    
    return {
      totalAttempts: visible.length,
      passRate: Math.round(passRate * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
      topPerformer
    };
  }, [visible]);

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="SECURITY AWARENESS" 
        title="Student Scores" 
        description="Make student score review professional and easy to act on." 
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="soc-panel p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Attempts</p>
              <p className="text-2xl font-bold text-white">{summaryStats.totalAttempts}</p>
            </div>
          </div>
        </div>
        
        <div className="soc-panel p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Pass Rate</p>
              <p className="text-2xl font-bold text-white">{summaryStats.passRate}%</p>
            </div>
          </div>
        </div>
        
        <div className="soc-panel p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Award className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Average Score</p>
              <p className="text-2xl font-bold text-white">{summaryStats.avgScore}%</p>
            </div>
          </div>
        </div>
        
        <div className="soc-panel p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Top Performer</p>
              <p className="text-lg font-bold text-white truncate">
                {summaryStats.topPerformer?.user_full_name || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterRow>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportToCSV} className="soc-button-ghost flex items-center gap-2 px-3 py-1 text-xs">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="soc-button-ghost px-3 py-1 text-xs">
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users or quizzes..."
              className="soc-input"
            />
            <select value={filters.quiz_id} onChange={e => setFilters({...filters, quiz_id: e.target.value})} className="soc-input">
              <option value="">All Quizzes</option>
            </select>
            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="soc-input">
              <option value="">All Categories</option>
              {metadata?.categories?.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="soc-input">
              <option value="">All Types</option>
              {metadata?.types?.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select value={filters.passed} onChange={e => setFilters({...filters, passed: e.target.value})} className="soc-input">
              <option value="">All Results</option>
              <option value="true">Passed</option>
              <option value="false">Failed</option>
            </select>
            <div className="flex gap-2 lg:col-span-4">
              <button onClick={applyFilters} className="soc-button-primary px-4 py-2 text-sm">Apply Filters</button>
              <button onClick={resetFilters} className="soc-button-ghost px-4 py-2 text-sm">Reset</button>
            </div>
          </div>
        )}
      </FilterRow>

      {error ? <ErrorState message={error} onRetry={() => void loadScores()} /> : null}
      {loading ? <SkeletonRows rows={10} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedIds.length > 0}
            selectedCount={selectedIds.length}
            actions={
              <>
                <button type="button" className="row-action">Export Selected</button>
                <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
              </>
            }
          />
          {visible.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No scores found" description={search ? "No scores match the current search." : "No quiz attempts have been recorded yet."} icon={Award} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="soc-table">
                  <thead>
                    <tr>
                      <th />
                      <th>User</th>
                      <th>Quiz</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Last Attempt</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((score) => (
                      <tr key={score.id} style={score.percentage < 60 ? { backgroundColor: "rgba(255,59,59,0.03)" } : score.percentage < 80 ? { backgroundColor: "rgba(245,158,11,0.03)" } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(score.id)}
                            onChange={event => setSelectedIds(prev => event.target.checked ? [...prev, score.id] : prev.filter(id => id !== score.id))}
                          />
                        </td>
                        <td>
                          <div>
                            <p className="font-semibold text-white">{score.user_full_name}</p>
                            <p className="text-xs text-slate-500">{score.user_email}</p>
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="font-semibold text-white">{score.quiz_title}</p>
                            <p className="text-xs text-slate-500">{score.quiz_category}</p>
                          </div>
                        </td>
                        <td>
                          <div className="text-center">
                            <p className="font-bold text-white">{score.score}/{score.total_questions}</p>
                            <Chip tone={score.percentage >= 80 ? "safe" : score.percentage >= 60 ? "warning" : "critical"}>{score.percentage}%</Chip>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-center">
                            <Chip tone={score.passed ? "safe" : "critical"}>{score.passed ? "Passed" : "Needs Review"}</Chip>
                          </div>
                        </td>
                        <td className="text-slate-300">1</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">
                              {new Date(score.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <RowActions
                            items={[
                              { key: "view", label: "View Details", variant: "primary" },
                              { key: "export", label: "Export Student" },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
