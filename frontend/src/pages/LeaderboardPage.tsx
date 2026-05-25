import { useEffect, useState } from "react";
import { Trophy, Medal, Award, Users, TrendingUp, Filter, Search, Download, Calendar } from "lucide-react";
import { API_BASE_URL, apiClient, tokenStorage, toUserErrorMessage } from "../api/client";
import { Pagination } from "../components/Pagination";
import { Chip } from "../components/ui/Chip";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_email: string;
  attempts: number;
  average_percentage: number;
  best_percentage: number;
  passed_count: number;
  last_attempt_at: string;
}

interface QuizMetadata {
  categories: string[];
  types: string[];
  difficulties: string[];
}

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [metadata, setMetadata] = useState<QuizMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    quiz_id: "",
    category: "",
    type: "",
    start_date: "",
    end_date: ""
  });

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      let url = `/awareness/leaderboard?skip=${skip}&limit=${pageSize}`;
      
      if (filters.quiz_id) url += `&quiz_id=${filters.quiz_id}`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.type) url += `&type=${filters.type}`;
      if (filters.start_date) url += `&start_date=${filters.start_date}`;
      if (filters.end_date) url += `&end_date=${filters.end_date}`;
      
      const res = await apiClient.get<any>(url);
      setLeaderboard(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total_users ?? 0));
    } catch (err: any) {
      setLeaderboard([]);
      setTotal(0);
      setError(toUserErrorMessage(err, "Leaderboard data is currently unavailable. Please try again."));
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

  async function exportCSV() {
    try {
      const params = new URLSearchParams();
      if (filters.quiz_id) params.set("quiz_id", filters.quiz_id);
      if (filters.category) params.set("category", filters.category);
      if (filters.type) params.set("type", filters.type);
      if (filters.start_date) params.set("start_date", filters.start_date);
      if (filters.end_date) params.set("end_date", filters.end_date);
      
      const url = `${API_BASE_URL}/awareness/scores/export/csv${params.toString() ? `?${params.toString()}` : ""}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokenStorage.getAccessToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      // Create download link
      const blob = await response.blob();
      const url2 = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url2;
      link.setAttribute('download', 'leaderboard.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url2);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to export data."));
    }
  }

  useEffect(() => { void loadLeaderboard(); }, [page, filters]);
  useEffect(() => { void loadMetadata(); }, []);

  function resetFilters() {
    setFilters({
      quiz_id: "",
      category: "",
      type: "",
      start_date: "",
      end_date: ""
    });
    setSearch("");
    setPage(1);
  }

  function applyFilters() {
    setPage(1);
    setShowFilters(false);
  }

  function getRankIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-500" />;
    return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
  }

  function getRankBadge(rank: number) {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    if (rank === 2) return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    if (rank === 3) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="SECURITY AWARENESS" 
        title="Training Leaderboard" 
        description="Track top performers and analyze training effectiveness across your organization." 
      />

      {/* Filters */}
      <FilterRow>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="soc-button-ghost px-3 py-1 text-xs flex items-center gap-1">
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="soc-button-ghost px-3 py-1 text-xs">
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="soc-input"
            />
            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="soc-input">
              <option value="">All Categories</option>
              {metadata?.categories?.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="soc-input">
              <option value="">All Types</option>
              {metadata?.types?.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.start_date}
              onChange={e => setFilters({...filters, start_date: e.target.value})}
              className="soc-input"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.end_date}
              onChange={e => setFilters({...filters, end_date: e.target.value})}
              className="soc-input"
              placeholder="End Date"
            />
            <div className="flex gap-2 lg:col-span-5">
              <button onClick={applyFilters} className="soc-button-primary px-4 py-2 text-sm">Apply Filters</button>
              <button onClick={resetFilters} className="soc-button-ghost px-4 py-2 text-sm">Reset</button>
            </div>
          </div>
        )}
      </FilterRow>

      {error ? <ErrorState message={error} onRetry={() => void loadLeaderboard()} /> : null}
      {loading ? <SkeletonRows rows={10} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No data found" description="No leaderboard data available for the current filters." icon={Trophy} />
            </div>
          ) : (
            <>
              {/* Top 3 Highlight */}
              {leaderboard.length >= 3 && (
                <div className="grid gap-4 md:grid-cols-3 p-6 border-b border-slate-800">
                  {leaderboard.slice(0, 3).map((entry) => (
                    <div key={entry.user_id} className={`text-center p-4 rounded-xl border ${getRankBadge(entry.rank)}`}>
                      <div className="flex justify-center mb-3">
                        {getRankIcon(entry.rank)}
                      </div>
                      <h3 className="font-bold text-white text-lg mb-1">{entry.user_email}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-center">
                          <Chip tone={entry.rank === 1 ? "warning" : entry.rank === 2 ? "neutral" : "info"}>Top {entry.rank}</Chip>
                        </div>
                        <p className="text-slate-300">Average: <span className="font-bold">{entry.average_percentage}%</span></p>
                        <p className="text-slate-300">Best: <span className="font-bold">{entry.best_percentage}%</span></p>
                        <p className="text-slate-300">Attempts: <span className="font-bold">{entry.attempts}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full Leaderboard Table */}
              <div className="table-wrapper">
                <table className="tbl w-full">
                  <thead className="bg-slate-900/50">
                    <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">User</th>
                      <th className="col-hide-mobile px-6 py-3">Attempts</th>
                      <th className="px-6 py-3">Average Score</th>
                      <th className="col-hide-mobile px-6 py-3">Best Score</th>
                      <th className="col-hide-mobile px-6 py-3">Passed</th>
                      <th className="col-hide-mobile px-6 py-3">Last Attempt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leaderboard.map((entry) => (
                      <tr key={entry.user_id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRankIcon(entry.rank)}
                            <span className="ml-2"><Chip tone={entry.rank === 1 ? "warning" : entry.rank === 2 ? "neutral" : entry.rank === 3 ? "info" : "neutral"}>Rank {entry.rank}</Chip></span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{entry.user_email}</div>
                        </td>
                        <td className="col-hide-mobile px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-300">{entry.attempts}</div>
                        </td>
                        <td className="col-hide-mobile px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-bold text-white mr-2">{entry.average_percentage}%</div>
                            <div className="w-16 overflow-hidden bg-slate-800 rounded-full h-2">
                              <div 
                                className={`h-2 w-full origin-left rounded-full ${
                                  entry.average_percentage >= 80 ? 'bg-green-500' :
                                  entry.average_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ transform: `scaleX(${entry.average_percentage / 100})` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-bold text-white mr-2">{entry.best_percentage}%</div>
                            <div className="w-16 overflow-hidden bg-slate-800 rounded-full h-2">
                              <div 
                                className="h-2 w-full origin-left rounded-full bg-green-500"
                                style={{ transform: `scaleX(${entry.best_percentage / 100})` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="col-hide-mobile px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-300">{entry.passed_count}</div>
                        </td>
                        <td className="col-hide-mobile px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-slate-300">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(entry.last_attempt_at).toLocaleDateString()}
                          </div>
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
