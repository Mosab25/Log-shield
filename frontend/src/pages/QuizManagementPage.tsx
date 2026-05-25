import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Eye, Users, Clock, AlertTriangle, CheckCircle, X } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { Pagination } from "../components/Pagination";
import { AppModal } from "../components/ui/AppModal";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

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
  questions?: QuizQuestion[];
}

interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  difficulty: string | null;
  topic: string | null;
}

interface QuizMetadata {
  categories: string[];
  types: string[];
  difficulties: string[];
}

const DEFAULT_CATEGORIES = [
  "Security Fundamentals",
  "Network Security",
  "Web Application Security",
  "SOC Operations",
  "Incident Response",
  "Phishing Awareness",
];

const DEFAULT_TYPES = ["awareness", "assessment", "phishing", "incident_response"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

const EMPTY_QUESTION_FORM = {
  question_text: "",
  options: ["", "", "", ""],
  correct_option_index: 0,
  explanation: "",
  difficulty: "beginner",
  topic: "",
};

export function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [metadata, setMetadata] = useState<QuizMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestion[]>([]);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Form state for create/edit
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    category: "",
    type: "",
    difficulty: "beginner",
    estimated_minutes: 30,
    pass_percentage: 70,
    is_active: false
  });

  const categoryOptions = useMemo(
    () => metadata?.categories?.length ? metadata.categories : DEFAULT_CATEGORIES,
    [metadata]
  );
  const typeOptions = useMemo(
    () => metadata?.types?.length ? metadata.types : DEFAULT_TYPES,
    [metadata]
  );

  async function loadQuizzes() {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      const res = await apiClient.get<any>(`/awareness/quizzes?skip=${skip}&limit=${pageSize}`);
      setQuizzes(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setQuizzes([]);
      setTotal(0);
      setError(toUserErrorMessage(err, "Quiz catalog is currently unavailable. Please try again."));
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

  async function loadQuizQuestions(quizId: number) {
    try {
      const res = await apiClient.get<Quiz>(`/awareness/quizzes/${quizId}`);
      setSelectedQuestions(res.questions || []);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Quiz questions are currently unavailable. Please try again."));
    }
  }

  useEffect(() => { void loadQuizzes(); void loadMetadata(); }, [page]);

  async function handleCreateQuiz() {
    try {
      const created = await apiClient.post<Quiz>("/awareness/quizzes", formData);
      setShowCreateModal(false);
      resetForm();
      await loadQuizzes();
      setSelectedQuiz(created);
      setSelectedQuestions([]);
      setQuestionForm(EMPTY_QUESTION_FORM);
      setShowQuestionsModal(true);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to create quiz right now. Please try again."));
    }
  }

  async function handleAddQuestion() {
    if (!selectedQuiz || savingQuestion) return;
    const payload = {
      ...questionForm,
      question_text: questionForm.question_text.trim(),
      options: questionForm.options.map(option => option.trim()),
      explanation: questionForm.explanation.trim() || null,
      topic: questionForm.topic.trim() || null,
      difficulty: questionForm.difficulty || null,
    };

    if (payload.question_text.length < 10) {
      setError("Question text must be at least 10 characters.");
      return;
    }
    if (payload.options.some(option => option.length === 0)) {
      setError("Please fill all four answer options.");
      return;
    }

    setSavingQuestion(true);
    setError(null);
    try {
      await apiClient.post(`/awareness/quizzes/${selectedQuiz.id}/questions`, payload);
      setQuestionForm(EMPTY_QUESTION_FORM);
      await loadQuizQuestions(selectedQuiz.id);
      await loadQuizzes();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to add question right now. Please try again."));
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleUpdateQuiz() {
    if (!selectedQuiz) return;
    
    try {
      await apiClient.patch(`/awareness/quizzes/${selectedQuiz.id}`, formData);
      setShowEditModal(false);
      setSelectedQuiz(null);
      resetForm();
      await loadQuizzes();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to update quiz right now. Please try again."));
    }
  }

  async function handleDeleteQuiz(quizId: number) {
    if (!confirm("Are you sure you want to deactivate this quiz?")) return;
    
    try {
      await apiClient.delete(`/awareness/quizzes/${quizId}`);
      await loadQuizzes();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to deactivate quiz right now. Please try again."));
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    
    try {
      await apiClient.delete(`/awareness/questions/${questionId}`);
      if (selectedQuiz) {
        await loadQuizQuestions(selectedQuiz.id);
      }
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to delete question right now. Please try again."));
    }
  }

  function resetForm() {
    setFormData({
      slug: "",
      title: "",
      description: "",
      category: "",
      type: "",
      difficulty: "beginner",
      estimated_minutes: 30,
      pass_percentage: 70,
      is_active: false
    });
  }

  function openEditModal(quiz: Quiz) {
    setSelectedQuiz(quiz);
    setFormData({
      slug: quiz.slug,
      title: quiz.title,
      description: quiz.description || "",
      category: quiz.category,
      type: quiz.type,
      difficulty: quiz.difficulty,
      estimated_minutes: quiz.estimated_minutes,
      pass_percentage: quiz.pass_percentage,
      is_active: quiz.is_active
    });
    setShowEditModal(true);
  }

  function openQuestionsModal(quiz: Quiz) {
    setSelectedQuiz(quiz);
    setQuestionForm(EMPTY_QUESTION_FORM);
    loadQuizQuestions(quiz.id);
    setShowQuestionsModal(true);
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

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="SECURITY AWARENESS" 
        title="Quiz Management" 
        description="Make quiz management clean for instructors and security training owners." 
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button onClick={() => setShowCreateModal(true)} className="soc-button-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Quiz
          </button>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={() => void loadQuizzes()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading && (
        <div className="soc-panel overflow-hidden">
          {quizzes.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No quizzes found" description="Create your first quiz to get started." icon={Users} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <BulkBar
                  active={selectedIds.length > 0}
                  selectedCount={selectedIds.length}
                  actions={
                    <>
                      <button type="button" className="row-action success">Publish Selected</button>
                      <button type="button" className="row-action">Archive Selected</button>
                      <button type="button" className="row-action danger">Delete</button>
                      <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
                    </>
                  }
                />
                <table className="soc-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Title</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Questions</th>
                      <th>Duration</th>
                      <th>Pass %</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizzes.map((quiz) => (
                      <tr key={quiz.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(quiz.id)}
                            onChange={event => setSelectedIds(prev => event.target.checked ? [...prev, quiz.id] : prev.filter(id => id !== quiz.id))}
                          />
                        </td>
                        <td>
                          <div>
                            <p className="font-semibold text-white">{quiz.title}</p>
                            <p className="text-xs text-cyber-muted/60">{quiz.slug}</p>
                          </div>
                        </td>
                        <td>
                          <Chip tone="safe">{quiz.category}</Chip>
                        </td>
                        <td>
                          <Chip tone="info">{quiz.type}</Chip>
                        </td>
                        <td>
                          <Chip tone={quiz.difficulty === "advanced" ? "critical" : quiz.difficulty === "intermediate" ? "warning" : "safe"}>{quiz.difficulty}</Chip>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-white">{quiz.question_count}</span>
                            {quiz.question_count < 30 && (
                              <div title="Quiz has fewer than 30 questions">
                                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-cyber-muted">{quiz.estimated_minutes} min</td>
                        <td className="text-cyber-muted">{quiz.pass_percentage}%</td>
                        <td>
                          <Chip tone={quiz.is_active ? "safe" : "neutral"}>{quiz.is_active ? "Published" : "Draft"}</Chip>
                        </td>
                        <td className="text-right">
                          <RowActions
                            items={[
                              { key: "edit", label: "Edit", variant: "primary", onClick: () => openEditModal(quiz) },
                              ...(quiz.is_active ? [{ key: "disable", label: "Disable", onClick: () => handleDeleteQuiz(quiz.id) }] : [{ key: "publish", label: "Publish", variant: "success" as const }]),
                              { key: "view", label: "View Results", onClick: () => openQuestionsModal(quiz) },
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
      )}

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <AppModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="md" panelClassName="soc-panel-strong p-6">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-cyber-text">Create New Quiz</h2>
              <button onClick={() => setShowCreateModal(false)} className="soc-button-ghost px-3 py-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Slug</label>
                  <input
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    className="soc-input"
                    placeholder="quiz-slug"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Title</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="soc-input"
                    placeholder="Quiz Title"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cyber-muted mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="soc-input"
                  rows={3}
                  placeholder="Quiz description"
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="soc-input">
                    <option value="">Select category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="soc-input">
                    <option value="">Select type</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Difficulty</label>
                  <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="soc-input">
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.estimated_minutes}
                    onChange={e => setFormData({...formData, estimated_minutes: parseInt(e.target.value)})}
                    className="soc-input"
                    min="10"
                    max="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Pass Percentage</label>
                  <input
                    type="number"
                    value={formData.pass_percentage}
                    onChange={e => setFormData({...formData, pass_percentage: parseInt(e.target.value)})}
                    className="soc-input"
                    min="50"
                    max="100"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-cyber-muted">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-cyber-muted/15 bg-cyber-surface text-cyber-cyan"
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-cyber-muted/10">
              <button onClick={handleCreateQuiz} className="soc-button-primary">Create Quiz</button>
              <button onClick={() => setShowCreateModal(false)} className="soc-button-ghost">Cancel</button>
            </div>
          </div>
        </AppModal>
      )}

      {/* Edit Quiz Modal */}
      {showEditModal && (
        <AppModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} size="md" panelClassName="soc-panel-strong p-6">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-cyber-text">Edit Quiz</h2>
              <button onClick={() => setShowEditModal(false)} className="soc-button-ghost px-3 py-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Slug</label>
                  <input
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    className="soc-input"
                    placeholder="quiz-slug"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Title</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="soc-input"
                    placeholder="Quiz Title"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cyber-muted mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="soc-input"
                  rows={3}
                  placeholder="Quiz description"
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="soc-input">
                    <option value="">Select category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="soc-input">
                    <option value="">Select type</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Difficulty</label>
                  <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="soc-input">
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.estimated_minutes}
                    onChange={e => setFormData({...formData, estimated_minutes: parseInt(e.target.value)})}
                    className="soc-input"
                    min="10"
                    max="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-muted mb-1">Pass Percentage</label>
                  <input
                    type="number"
                    value={formData.pass_percentage}
                    onChange={e => setFormData({...formData, pass_percentage: parseInt(e.target.value)})}
                    className="soc-input"
                    min="50"
                    max="100"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-cyber-muted">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-cyan-400/15 bg-cyber-surface text-cyber-cyan"
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-cyan-400/10">
              <button onClick={handleUpdateQuiz} className="soc-button-primary">Update Quiz</button>
              <button onClick={() => setShowEditModal(false)} className="soc-button-ghost">Cancel</button>
            </div>
          </div>
        </AppModal>
      )}

      {/* Questions Modal */}
      {showQuestionsModal && selectedQuiz && (
        <AppModal isOpen={showQuestionsModal && Boolean(selectedQuiz)} onClose={() => setShowQuestionsModal(false)} size="xl" panelClassName="soc-panel-strong p-6">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Questions for {selectedQuiz.title}</h2>
              <button onClick={() => setShowQuestionsModal(false)} className="soc-button-ghost px-3 py-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">Add Question</h3>
                    <p className="text-sm text-slate-400">Create a four-option multiple choice question for this quiz.</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                    {selectedQuestions.length} questions
                  </span>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-300">Question text</span>
                    <textarea
                      value={questionForm.question_text}
                      onChange={event => setQuestionForm({ ...questionForm, question_text: event.target.value })}
                      className="soc-input min-h-24"
                      placeholder="What is the safest response to a suspected phishing email?"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    {questionForm.options.map((option, index) => (
                      <label key={index} className="block rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                        <span className="mb-2 flex items-center justify-between gap-2 text-sm font-medium text-slate-300">
                          Option {index + 1}
                          <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                            <input
                              type="radio"
                              name="correct-option"
                              checked={questionForm.correct_option_index === index}
                              onChange={() => setQuestionForm({ ...questionForm, correct_option_index: index })}
                            />
                            Correct
                          </span>
                        </span>
                        <input
                          value={option}
                          onChange={event => {
                            const nextOptions = [...questionForm.options];
                            nextOptions[index] = event.target.value;
                            setQuestionForm({ ...questionForm, options: nextOptions });
                          }}
                          className="soc-input"
                          placeholder={`Answer option ${index + 1}`}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-300">Difficulty</span>
                      <select
                        value={questionForm.difficulty}
                        onChange={event => setQuestionForm({ ...questionForm, difficulty: event.target.value })}
                        className="soc-input"
                      >
                        {DIFFICULTIES.map((difficulty) => (
                          <option key={difficulty} value={difficulty}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-1 block text-sm font-medium text-slate-300">Topic</span>
                      <input
                        value={questionForm.topic}
                        onChange={event => setQuestionForm({ ...questionForm, topic: event.target.value })}
                        className="soc-input"
                        placeholder="Phishing, password safety, incident reporting..."
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-300">Explanation</span>
                    <textarea
                      value={questionForm.explanation}
                      onChange={event => setQuestionForm({ ...questionForm, explanation: event.target.value })}
                      className="soc-input min-h-20"
                      placeholder="Explain why the selected answer is correct."
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => void handleAddQuestion()} disabled={savingQuestion} className="soc-button-primary">
                      <Plus className="h-4 w-4" />
                      {savingQuestion ? "Adding..." : "Add Question"}
                    </button>
                    <button type="button" onClick={() => setQuestionForm(EMPTY_QUESTION_FORM)} disabled={savingQuestion} className="soc-button-ghost">
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {selectedQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">No questions yet for this quiz.</p>
                </div>
              ) : (
                selectedQuestions.map((question, index) => (
                  <div key={question.id} className="border border-slate-800 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-cyan-400">Q{index + 1}</span>
                          {question.difficulty && (
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getDifficultyColor(question.difficulty)}`}>
                              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-white mb-3">{question.question_text}</p>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                optIndex === question.correct_option_index
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-slate-600'
                              }`}>
                                {optIndex === question.correct_option_index && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <span className={`text-sm ${
                                optIndex === question.correct_option_index ? 'text-green-400' : 'text-slate-400'
                              }`}>
                                {option}
                              </span>
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-slate-950/50 rounded border border-slate-800">
                            <p className="text-sm text-slate-300">
                              <span className="font-semibold text-slate-400">Explanation:</span> {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="soc-button-ghost p-2 ml-4"
                        title="Delete Question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-cyan-400/10">
              <button onClick={() => setShowQuestionsModal(false)} className="soc-button-ghost">Close</button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
