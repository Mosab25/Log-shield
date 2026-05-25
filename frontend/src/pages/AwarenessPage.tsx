import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Filter, Search, Clock, Users, Award, AlertTriangle, CheckCircle, TrendingUp, BarChart3, Target, Plus, Settings, Trophy, Activity } from "lucide-react";
import { apiClient } from "../api/client";
import { Chip } from "../components/ui/Chip";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { TabTransition } from "../components/PageTransition";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";
import { useAuth } from "../auth/AuthContext";
import { useAuthGate } from "../auth/useAuthGate";

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

const PUBLIC_QUIZZES: Quiz[] = [
  {
    id: 1001,
    slug: "security-fundamentals-preview",
    title: "Security Fundamentals Preview",
    description: "A guided introduction to core SOC concepts, alerts, severity, and safe investigation behavior.",
    category: "Security Fundamentals",
    type: "awareness",
    difficulty: "beginner",
    question_count: 8,
    estimated_minutes: 10,
    pass_percentage: 70,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 1002,
    slug: "phishing-url-triage-preview",
    title: "Phishing and URL Triage Preview",
    description: "Learn how analysts review suspicious links, defang indicators, and connect URL findings to incidents.",
    category: "Web Application Security",
    type: "scenario",
    difficulty: "intermediate",
    question_count: 10,
    estimated_minutes: 15,
    pass_percentage: 75,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 1003,
    slug: "incident-response-preview",
    title: "Incident Response Workflow Preview",
    description: "Practice the order of evidence review, containment, reporting, and recovery monitoring.",
    category: "Incident Response",
    type: "workflow",
    difficulty: "advanced",
    question_count: 12,
    estimated_minutes: 20,
    pass_percentage: 80,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 1004,
    slug: "password-security-preview",
    title: "Password Security Preview",
    description: "Review password hygiene, MFA habits, password manager basics, and account recovery safety.",
    category: "Identity Protection",
    type: "awareness",
    difficulty: "beginner",
    question_count: 8,
    estimated_minutes: 10,
    pass_percentage: 70,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 1005,
    slug: "social-engineering-preview",
    title: "Social Engineering Preview",
    description: "Learn how attackers manipulate trust, urgency, and routine workflows to bypass defenses.",
    category: "Human Risk",
    type: "scenario",
    difficulty: "intermediate",
    question_count: 10,
    estimated_minutes: 15,
    pass_percentage: 75,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 1006,
    slug: "safe-browsing-preview",
    title: "Safe Browsing Preview",
    description: "Practice spotting suspicious domains, redirects, downloads, and unsafe browser prompts.",
    category: "Safe Browsing",
    type: "awareness",
    difficulty: "beginner",
    question_count: 8,
    estimated_minutes: 10,
    pass_percentage: 70,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 1007,
    slug: "incident-reporting-preview",
    title: "Incident Reporting Basics Preview",
    description: "Understand when and how to report suspicious activity with useful context for analysts.",
    category: "Incident Response",
    type: "workflow",
    difficulty: "beginner",
    question_count: 6,
    estimated_minutes: 8,
    pass_percentage: 70,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
];

const PUBLIC_METADATA: QuizMetadata = {
  categories: Array.from(new Set(PUBLIC_QUIZZES.map(quiz => quiz.category))),
  types: Array.from(new Set(PUBLIC_QUIZZES.map(quiz => quiz.type))),
  difficulties: Array.from(new Set(PUBLIC_QUIZZES.map(quiz => quiz.difficulty))),
};

function filterPublicQuizzes(quizzes: Quiz[], filters: { category: string; type: string; difficulty: string; is_active: boolean }, search: string) {
  const q = search.trim().toLowerCase();
  return quizzes.filter(quiz => {
    if (filters.category && quiz.category !== filters.category) return false;
    if (filters.type && quiz.type !== filters.type) return false;
    if (filters.difficulty && quiz.difficulty !== filters.difficulty) return false;
    if (!q) return true;
    return [quiz.title, quiz.description ?? "", quiz.category, quiz.type, quiz.difficulty]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

export function AwarenessPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { requireAuth, loginRequiredModal } = useAuthGate();
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
    if (authLoading) return;
    setLoading(true);
    setError(null);
    if (!isAuthenticated) {
      const filtered = filterPublicQuizzes(PUBLIC_QUIZZES, filters, search);
      const skip = (page - 1) * pageSize;
      setQuizzes(filtered.slice(skip, skip + pageSize));
      setTotal(filtered.length);
      setLoading(false);
      return;
    }

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
      const filtered = filterPublicQuizzes(PUBLIC_QUIZZES, filters, search);
      const skip = (page - 1) * pageSize;
      setQuizzes(filtered.slice(skip, skip + pageSize));
      setTotal(filtered.length);
      setMetadata(PUBLIC_METADATA);
      setError("Training content is currently unavailable. Showing local fallback lessons.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMetadata() {
    if (!isAuthenticated) {
      setMetadata(PUBLIC_METADATA);
      return;
    }

    try {
      const meta = await apiClient.get<QuizMetadata>("/awareness/quizzes/metadata");
      setMetadata(meta);
    } catch (e) {
      setMetadata(PUBLIC_METADATA);
    }
  }

  async function loadUserAttempts() {
    if (!isAuthenticated) {
      setUserAttempts([]);
      return;
    }

    try {
      const res = await apiClient.get<any>("/awareness/my-scores?limit=5");
      setUserAttempts(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      // Scores are optional
    }
  }

  async function loadSummary() {
    if (!isAuthenticated || user?.role?.name !== "admin") return;
    try {
      const summaryData = await apiClient.get<QuizSummary>("/awareness/summary");
      setSummary(summaryData);
    } catch (e) {
      // Summary is optional for admin
    }
  }

  useEffect(() => { void loadQuizzes(); }, [page, filters, search, isAuthenticated, authLoading]);
  useEffect(() => {
    if (authLoading) return;
    void loadMetadata();
    void loadUserAttempts();
    void loadSummary();
  }, [user, isAuthenticated, authLoading]);

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
    return category
      ? "bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/25"
      : "bg-cyber-elevated/40 text-cyber-muted border-cyber-muted/25";
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
        <TabTransition activeKey={`admin-${activeView}`} className="space-y-6">
        <PageHeader 
          eyebrow="SECURITY AWARENESS" 
          title="Awareness Hub" 
          description="Train users, measure knowledge, and reduce human-factor security risk." 
        />

        <InfoHint title="Educational objective">
          This area helps admins understand training coverage, learner performance, and which security topics need reinforcement across the team.
        </InfoHint>

        {/* Admin Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Attempts" value={summary.total_attempts} icon={<Activity className="h-4 w-4" />} />
            <StatCard label="Unique Users" value={summary.unique_users} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Average Score" value={`${summary.average_score}%`} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard label="Pass Rate" value={`${summary.pass_rate}%`} icon={<Target className="h-4 w-4" />} />
          </div>
        )}

        {/* Admin Action Buttons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => navigate('/awareness/manage')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Plus className="h-8 w-8 text-cyan-400 mb-3" />
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
            <BookOpen className="h-8 w-8 text-cyber-cyan mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Available Quizzes</h3>
            <p className="text-sm text-cyber-muted">View training catalog</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="soc-panel p-6">
          <h3 className="text-lg font-bold text-cyber-text mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
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
        </TabTransition>
      </div>
    );
  }

  // Analyst View - Quiz Management Focus
  if (user?.role?.name === "analyst" && activeView !== "catalog") {
    return (
      <div className="space-y-6">
        {managementTabs}
        <TabTransition activeKey={`analyst-${activeView}`} className="space-y-6">
      <PageHeader 
        eyebrow="SECURITY AWARENESS" 
        title="Awareness Hub" 
        description="Train users, measure knowledge, and reduce human-factor security risk." 
      />

        <InfoHint title="How analysts should use this">
          Build quizzes around real SOC scenarios: phishing triage, failed logins, suspicious URLs, incident handoff, and evidence review.
        </InfoHint>

        {/* Analyst Action Buttons */}
        <div className="grid gap-4 md:grid-cols-3">
          <button onClick={() => navigate('/awareness/manage')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Plus className="h-8 w-8 text-cyan-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Create Quiz</h3>
            <p className="text-sm text-cyber-muted">Design new training assessments</p>
          </button>
          
          <button onClick={() => navigate('/awareness/manage')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <Settings className="h-8 w-8 text-green-400 mb-3" />
            <h3 className="font-bold text-cyber-text mb-1">Manage Quizzes</h3>
            <p className="text-sm text-cyber-muted">Edit existing quiz content</p>
          </button>
          
          <button onClick={() => navigate('/awareness?view=catalog')} className="soc-panel p-6 text-left hover:bg-cyber-elevated transition-colors">
            <BookOpen className="h-8 w-8 text-cyber-cyan mb-3" />
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
        </TabTransition>
      </div>
    );
  }

  // Viewer/User View - Learning Focus
  return (
    <div className="space-y-6">
      {managementTabs}
      <TabTransition activeKey={`viewer-${activeView}`} className="space-y-6">
      <PageHeader 
        eyebrow="SECURITY AWARENESS" 
        title="Awareness Hub" 
        description="Train users, measure knowledge, and reduce human-factor security risk." 
      />

      <InfoHint title="How to learn from quizzes">
        After submission, review each explanation. Focus on why an answer is correct, then connect the concept to real LogShield pages like alerts, logs, URL Scanner, and incidents.
      </InfoHint>
      {!isAuthenticated ? (
        <InfoHint title="Public read-only mode">
          You can browse the awareness catalog and learning paths. Starting quizzes, submitting answers, and saving scores require a LogShield account.
        </InfoHint>
      ) : null}

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
      <FilterRow>
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
      </FilterRow>

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
                      <Chip tone="safe">{quiz.category}</Chip>
                      <Chip tone={quiz.difficulty === "advanced" ? "critical" : quiz.difficulty === "intermediate" ? "warning" : "safe"}>{quiz.difficulty}</Chip>
                      <Chip tone="info">{quiz.type}</Chip>
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
                      <div className="w-full overflow-hidden bg-cyber-elevated rounded-full h-2">
                        <div 
                          className="w-full origin-left bg-gradient-to-r from-cyber-cyan to-cyan-300 h-2 rounded-full" 
                          style={{ transform: `scaleX(${quiz.pass_percentage / 100})` }}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => requireAuth(() => navigate(`/awareness/quiz/${quiz.slug}`))}
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
      {loginRequiredModal}
      </TabTransition>
    </div>
  );
}
