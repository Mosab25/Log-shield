import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Filter, Search, Clock, Users, Award, AlertTriangle, CheckCircle, TrendingUp, BarChart3, Target, Plus, Settings, Trophy, Activity } from "lucide-react";
import { apiClient } from "../api/client";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";
import { useAuth } from "../auth/AuthContext";

interface Quiz {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  difficulty: string;
  question_count: number;
  estimated_minutes: number;
  pass_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface QuizMetadata {
  categories: string[];
  types: string[];
  difficulties: string[];
}

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

interface QuizSummary {
  total_attempts: number;
  unique_users: number;
  average_score: number;
  pass_rate: number;
  top_quiz: any;
  weakest_quiz: any;
  best_user: any;
  most_active_user: any;
  attempts_today: number;
}

export function AwarenessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = new URLSearchParams(location.search).get("view") || "overview";
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [metadata, setMetadata] = useState<QuizMetadata | null>(null);
  const [userAttempts, setUserAttempts] = useState<UserAttempt[]>([]);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    type: "",
    difficulty: "",
    is_active: true
  });
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  async function loadQuizzes() {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      let url = `/awareness/quizzes?skip=${skip}&limit=${pageSize}&is_active=${filters.is_active}`;
      
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.type) url += `&type=${filters.type}`;
      if (filters.difficulty) url += `&difficulty=${filters.difficulty}`;
      if (search) url += `&q=${search}`;
      
      const res = await apiClient.get<any>(url);
      setQuizzes(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setQuizzes([]);
      setTotal(0);
      setError(err?.message || "Failed to load quizzes.");
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

  async function loadUserAttempts() {
    try {
      const res = await apiClient.get<any>("/awareness/my-scores?limit=5");
      setUserAttempts(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      // Scores are optional
    }
  }

  async function loadSummary() {
    if (user?.role?.name !== "admin") return;
    try {
      const summaryData = await apiClient.get<QuizSummary>("/awareness/summary");
      setSummary(summaryData);
    } catch (e) {
      // Summary is optional for admin
    }
  }

  useEffect(() => { void loadQuizzes(); }, [page, filters, search]);
  useEffect(() => { void loadMetadata(); void loadUserAttempts(); void loadSummary(); }, [user]);

  const visible = useMemo(() => {
    if (!search) return quizzes;
    return quizzes.filter(quiz => 
      quiz.title.toLowerCase().includes(search.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(search.toLowerCase()) ||
      quiz.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [quizzes, search]);

  function resetFilters() {
    setFilters({
      category: "",
      type: "",
      difficulty: "",
      is_active: true
    });
    setSearch("");
    setPage(1);
  }

  function applyFilters() {
    setPage(1);
    setShowFilters(false);
  }

  function getDifficultyColor(difficulty: string) {
    const colors: Record<string, string> = {
      "beginner": "bg-green-500/20 text-green-300 border-green-500/30",
      "intermediate": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", 
      "advanced": "bg-red-500/20 text-red-300 border-red-500/30"
    };
    return colors[difficulty] || "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25";
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      "Security Fundamentals": "bg-blue-500/20 text-blue-300 border-blue-500/30",
      "Network Security": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      "Web Application Security": "bg-purple-500/20 text-purple-300 border-purple-500/30",
      "SOC Operations": "bg-orange-500/20 text-orange-300 border-orange-500/30",
      "Incident Response": "bg-red-500/20 text-red-300 border-red-500/30"
    };
    return colors[category] || "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25";
  }

  const canManage = user?.role?.name === "admin" || user?.role?.name === "analyst";
  const managementTabs = canManage ? (
    <div className="soc-panel p-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate("/awareness")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${activeView === "overview" ? "bg-cyber-cyan text-cyber-bg" : "text-cyber-muted hover:bg-cyber-elevated/20 hover:text-cyber-text"}`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => navigate("/awareness?view=catalog")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${activeView === "catalog" ? "bg-cyber-cyan text-cyber-bg" : "text-cyber-muted hover:bg-cyber-elevated/20 hover:text-cyber-text"}`}
        >
          Quiz Catalog
        </button>
        <button type="button" onClick={() => navigate("/awareness/manage")} className="rounded-lg px-4 py-2 text-sm font-bold text-cyber-muted transition hover:bg-cyber-elevated/20 hover:text-cyber-text">
          Manage Quizzes
        </button>
        {user?.role?.name === "admin" ? (
          <>
            <button type="button" onClick={() => navigate("/awareness/scores")} className="rounded-lg px-4 py-2 text-sm font-bold text-cyber-muted transition hover:bg-cyber-elevated/20 hover:text-cyber-text">
              Scores
            </button>
            <button type="button" onClick={() => navigate("/awareness/leaderboard")} className="rounded-lg px-4 py-2 text-sm font-bold text-cyber-muted transition hover:bg-cyber-elevated/20 hover:text-cyber-text">
              Leaderboard
            </button>
          </>
        ) : null}
      </div>
    </div>
  ) : null;

  // Admin View - Management Dashboard
  if (user?.role?.name === "admin" && activeView !== "catalog") {
    return (
      <div className="space-y-6">
        {managementTabs}
        <PageHeader 
          eyebrow="Security Awareness Administration" 
          title="Training Management Dashboard" 
          description="Manage cybersecurity training programs, monitor user performance, and analyze training effectiveness." 
          icon={Settings} 
        />

        <InfoHint title="Educational objective">
          This area helps admins understand training coverage, learner performance, and which security topics need reinforcement across the team.
        </InfoHint>

        {/* Admin Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="soc-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold text-cyber-text">{summary.total_attempts}</span>
              </div>
              <p className="text-cyber-muted text-sm">Total Attempts</p>
            </div>
            
            <div className="soc-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-green-400" />
                <span className="text-2xl font-bold text-cyber-text">{summary.unique_users}</span>
              </div>
              <p className="text-cyber-muted text-sm">Unique Users</p>
            </div>
            
            <div className="soc-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-yellow-400" />
                <span className="text-2xl font-bold text-cyber-text">{summary.average_score}%</span>
              </div>
              <p className="text-cyber-muted text-sm">Average Score</p>
            </div>
            
            <div className="soc-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-8 w-8 text-purple-400" />
                <span className="text-2xl font-bold text-cyber-text">{summary.pass_rate}%</span>
              </div>
              <p className="text-cyber-muted text-sm">Pass Rate</p>
            </div>
          </div>
        )}

        {/* Admin Action Buttons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => navigate('/awareness/manage')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Plus className="h-8 w-8 text-blue-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Manage Quizzes</h3>
            <p className="text-sm text-cyber-muted">Create and edit training quizzes</p>
          </button>
          
          <button onClick={() => navigate('/awareness/scores')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <BarChart3 className="h-8 w-8 text-green-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Scores Dashboard</h3>
            <p className="text-sm text-cyber-muted">View detailed user performance</p>
          </button>
          
          <button onClick={() => navigate('/awareness/leaderboard')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Trophy className="h-8 w-8 text-yellow-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Leaderboard</h3>
            <p className="text-sm text-cyber-muted">Top performers and rankings</p>
          </button>
          
          <button onClick={() => navigate('/awareness?view=catalog')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <BookOpen className="h-8 w-8 text-purple-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Available Quizzes</h3>
            <p className="text-sm text-cyber-muted">View training catalog</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="soc-panel p-6">
          <h3 className="text-lg font-bold text-cyber-text mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Recent Activity
          </h3>
          {userAttempts.length > 0 ? (
            <div className="space-y-3">
              {userAttempts.slice(0, 5).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border border-cyan-400/10 bg-cyber-elevated/60">
                  <div>
                    <p className="font-semibold text-cyber-text">{attempt.quiz_title}</p>
                    <p className="text-sm text-cyber-muted">{attempt.quiz_category} • {new Date(attempt.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-cyber-text">{attempt.score}/{attempt.total_questions}</span>
                      {attempt.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <p className="text-sm text-cyber-muted">{attempt.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No recent activity" description="No quiz attempts have been recorded recently." icon={Activity} />
          )}
        </div>
      </div>
    );
  }

  // Analyst View - Quiz Management Focus
  if (user?.role?.name === "analyst" && activeView !== "catalog") {
    return (
      <div className="space-y-6">
        {managementTabs}
        <PageHeader 
          eyebrow="Security Awareness Management" 
          title="Quiz Management Center" 
          description="Create, manage, and monitor cybersecurity training quizzes and assessments." 
          icon={Settings} 
        />

        <InfoHint title="How analysts should use this">
          Build quizzes around real SOC scenarios: phishing triage, failed logins, suspicious URLs, incident handoff, and evidence review.
        </InfoHint>

        {/* Analyst Action Buttons */}
        <div className="grid gap-4 md:grid-cols-3">
          <button onClick={() => navigate('/awareness/manage')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Plus className="h-8 w-8 text-blue-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Create Quiz</h3>
            <p className="text-sm text-cyber-muted">Design new training assessments</p>
          </button>
          
          <button onClick={() => navigate('/awareness/manage')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Settings className="h-8 w-8 text-green-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Manage Quizzes</h3>
            <p className="text-sm text-cyber-muted">Edit existing quiz content</p>
          </button>
          
          <button onClick={() => navigate('/awareness?view=catalog')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <BookOpen className="h-8 w-8 text-purple-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Available Quizzes</h3>
            <p className="text-sm text-cyber-muted">Browse training catalog</p>
          </button>
        </div>

        {/* Recent Quiz Performance */}
        {userAttempts.length > 0 && (
          <div className="soc-panel p-6">
            <h3 className="text-lg font-bold text-cyber-text mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              Your Recent Quiz Results
            </h3>
            <div className="space-y-3">
              {userAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border border-cyan-400/10 bg-cyber-elevated/60">
                  <div>
                    <p className="font-semibold text-cyber-text">{attempt.quiz_title}</p>
                    <p className="text-sm text-cyber-muted">{attempt.quiz_category} • {new Date(attempt.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-cyber-text">{attempt.score}/{attempt.total_questions}</span>
                      {attempt.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <p className="text-sm text-cyber-muted">{attempt.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Viewer/User View - Learning Focus
  return (
    <div className="space-y-6">
      {managementTabs}
      <PageHeader 
        eyebrow="Security Awareness" 
        title="Cybersecurity Training & Assessment" 
        description="Learn cybersecurity concepts, take guided quizzes, review explanations, and track improvement over time." 
        icon={BookOpen} 
      />

      <InfoHint title="How to learn from quizzes">
        After submission, review each explanation. Focus on why an answer is correct, then connect the concept to real LogShield pages like alerts, logs, URL Scanner, and incidents.
      </InfoHint>

      <RecommendedActions
        title="Learning path"
        actions={[
          "Start with beginner fundamentals.",
          "Review failed answers and explanations.",
          "Practice related tools after each quiz.",
          "Retake weak categories after studying.",
        ]}
      />

      {/* Recent Scores Summary */}
      {userAttempts.length > 0 && (
        <div className="soc-panel p-6">
          <h3 className="text-lg font-bold text-cyber-text mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" />
            Your Recent Quiz Results
          </h3>
          <div className="space-y-3">
            {userAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border border-cyan-400/10 bg-cyber-elevated/60">
                <div>
                  <p className="font-semibold text-cyber-text">{attempt.quiz_title}</p>
                  <p className="text-sm text-cyber-muted">{attempt.quiz_category} • {new Date(attempt.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-cyber-text">{attempt.score}/{attempt.total_questions}</span>
                    {attempt.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <p className="text-sm text-cyber-muted">{attempt.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="soc-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyber-muted" />
            <span className="text-sm font-semibold text-cyber-text">Filters</span>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="soc-button-ghost px-3 py-1 text-xs">
            {showFilters ? "Hide" : "Show"} Filters
          </button>
        </div>
        
        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quizzes..."
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
            <select value={filters.difficulty} onChange={e => setFilters({...filters, difficulty: e.target.value})} className="soc-input">
              <option value="">All Levels</option>
              {metadata?.difficulties?.map((diff) => (
                <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-2 lg:col-span-4">
              <button onClick={applyFilters} className="soc-button-primary px-4 py-2 text-sm">Apply Filters</button>
              <button onClick={resetFilters} className="soc-button-ghost px-4 py-2 text-sm">Reset</button>
            </div>
          </div>
        )}
      </div>

      {error ? <ErrorState message={error} onRetry={() => void loadQuizzes()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {visible.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No quizzes found" description={search ? "No quizzes match the current search." : "No quizzes are available yet."} icon={BookOpen} />
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((quiz) => (
                  <div key={quiz.id} className="border border-cyan-400/10 bg-cyber-elevated/60 hover:bg-cyber-elevated transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-cyber-text text-lg mb-2">{quiz.title}</h3>
                        <p className="text-sm text-cyber-muted mb-4 line-clamp-2">{quiz.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${getCategoryColor(quiz.category)}`}>
                        {quiz.category}
                      </span>
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${getDifficultyColor(quiz.difficulty)}`}>
                        {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                      </span>
                      <span className="rounded-full border border-cyan-400/15 px-2 py-1 text-xs font-bold text-cyber-muted">
                        {quiz.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-cyber-muted" />
                        <span className="text-cyber-muted">{quiz.estimated_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-cyber-muted" />
                        <span className="text-cyber-muted">{quiz.question_count} questions</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-cyber-muted">Passing Score</span>
                        <span className="text-cyber-text font-semibold">{quiz.pass_percentage}%</span>
                      </div>
                      <div className="w-full bg-cyber-elevated rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" 
                          style={{ width: `${quiz.pass_percentage}%` }}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate(`/awareness/quiz/${quiz.slug}`)}
                      className="w-full soc-button-primary"
                    >
                      Start Quiz
                    </button>
                  </div>
                ))}
              </div>
              
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
