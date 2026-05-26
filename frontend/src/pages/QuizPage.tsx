import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Clock, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Award, X } from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { SeverityBadge } from "../components/SeverityBadge";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
  explanation: string | null;
  difficulty: string | null;
  topic: string | null;
}

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
  questions: QuizQuestion[];
}

interface QuizAnswer {
  question_id: number;
  selected_option_index: number;
}

interface QuizResult {
  attempt_id: number;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
  answers: Array<{
    question_id: number;
    question_text: string;
    selected_option: string;
    correct_option: string;
    is_correct: boolean;
    explanation: string | null;
  }>;
}

export function QuizPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [questionGroupPage, setQuestionGroupPage] = useState(0);

  const QUESTIONS_PER_GROUP = 5;

  async function loadQuiz() {
    if (!slug) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Quiz>(`/awareness/quizzes/by-slug/${slug}`);
      setQuiz(res);
      
      // Set timer based on estimated minutes
      setTimeLeft(res.estimated_minutes * 60);
      setTimerActive(true);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Quiz content is currently unavailable. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadQuiz(); }, [slug]);

  // Auto-switch question group when current question changes
  useEffect(() => {
    if (!quiz) return;
    
    const currentGroup = Math.floor(currentQuestion / QUESTIONS_PER_GROUP);
    if (currentGroup !== questionGroupPage) {
      setQuestionGroupPage(currentGroup);
    }
  }, [currentQuestion, quiz, questionGroupPage]);

  useEffect(() => {
    if (!timerActive || timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          setTimerActive(false);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  function selectOption(optionIndex: number) {
    if (!quiz) return;
    
    const question = quiz.questions[currentQuestion];
    const existingAnswerIndex = answers.findIndex(a => a.question_id === question.id);
    
    if (existingAnswerIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = { question_id: question.id, selected_option_index: optionIndex };
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, { question_id: question.id, selected_option_index: optionIndex }]);
    }
  }

  function getCurrentAnswer() {
    if (!quiz) return null;
    const question = quiz.questions[currentQuestion];
    return answers.find(a => a.question_id === question.id);
  }

  function goToQuestion(index: number) {
    if (index >= 0 && index < (quiz?.questions.length || 0)) {
      setCurrentQuestion(index);
    }
  }

  function goToQuestionGroup(groupIndex: number) {
    if (!quiz) return;

    const totalGroups = Math.max(1, Math.ceil(quiz.questions.length / QUESTIONS_PER_GROUP));
    const clampedGroup = Math.min(Math.max(groupIndex, 0), totalGroups - 1);
    setQuestionGroupPage(clampedGroup);
    setCurrentQuestion(clampedGroup * QUESTIONS_PER_GROUP);
  }

  function goToNext() {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }

  function goToPrevious() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  function hasUnansweredQuestions() {
    if (!quiz) return false;
    return quiz.questions.some(q => !answers.find(a => a.question_id === q.id));
  }

  async function handleSubmit() {
    if (!quiz) return;
    
    if (hasUnansweredQuestions()) {
      if (!confirm("You have unanswered questions. Are you sure you want to submit?")) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<QuizResult>(`/awareness/quizzes/${quiz.id}/submit`, {
        answers: answers
      });
      setResult(res);
      setShowResult(true);
      setTimerActive(false);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Unable to submit quiz right now. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getDifficultyColor(difficulty: string) {
    const colors: Record<string, string> = {
      "beginner": "bg-green-500/20 text-green-300 border-green-500/30",
      "intermediate": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", 
      "advanced": "bg-red-500/20 text-red-300 border-red-500/30"
    };
    return colors[difficulty] || "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }

  function getCategoryColor(category: string) {
    return category
      ? "bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/25"
      : "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Loading..." title="Loading Quiz" description="" icon={BookOpen} />
        <SkeletonRows rows={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Error" title="Quiz Error" description="" icon={BookOpen} />
        <ErrorState message={error} onRetry={() => void loadQuiz()} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Not Found" title="Quiz Not Found" description="" icon={BookOpen} />
        <EmptyState title="Quiz not found" description="The quiz you're looking for doesn't exist." icon={BookOpen} />
      </div>
    );
  }

  if (showResult && result) {
    return (
      <div className="space-y-6">
        <PageHeader 
          eyebrow="Quiz Results" 
          title={quiz.title} 
          description={`You completed the quiz with a score of ${result.score}/${result.total_questions}`} 
          icon={result.passed ? Award : AlertTriangle} 
        />

        <div className="soc-panel p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              result.passed ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {result.passed ? (
                <CheckCircle className="h-10 w-10 text-green-400" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-red-400" />
              )}
            </div>
            <h2 className={`text-3xl font-bold mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {result.passed ? 'Passed!' : 'Failed'}
            </h2>
            <p className="text-xl text-white mb-4">
              Score: {result.score}/{result.total_questions} ({result.percentage}%)
            </p>
            <p className="text-slate-400">
              Passing score: {quiz.pass_percentage}%
            </p>
          </div>

          <InfoHint title="Learning review">
            Review the explanation for every question, especially incorrect answers. The goal is not only passing the quiz; it is understanding how the same concept appears in alerts, logs, URLs, CVEs, and incidents.
          </InfoHint>

          <div className="mt-6">
            <RecommendedActions
              title="What to study next"
              actions={[
                result.passed ? "Retake later to keep the concept fresh." : "Retake this quiz after reviewing explanations.",
                "Practice related indicators in the Security Operations Toolkit.",
                "Open real alerts or logs that match this topic.",
                "Use notes to summarize what you learned.",
              ]}
            />
          </div>

          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-bold text-cyber-text">Answer Review</h3>
            {result.answers.map((answer, index) => (
              <div key={answer.question_id} className="border border-cyber-border-cyan rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    answer.is_correct ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-red/20 text-cyber-red'
                  }`}>
                    {answer.is_correct ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <p className="text-cyber-text font-medium mb-1 sm:mb-2 text-sm sm:text-base">Q{index + 1}: {answer.question_text}</p>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-cyber-muted text-sm">Your answer:</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          answer.is_correct ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-red/20 text-cyber-red'
                        }`}>
                          {answer.selected_option}
                        </span>
                      </div>
                      {!answer.is_correct && (
                        <div className="flex items-center gap-2">
                          <span className="text-cyber-muted text-sm">Correct answer:</span>
                          <span className="text-sm px-2 py-1 rounded bg-cyber-green/20 text-cyber-green">
                            {answer.correct_option}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {answer.explanation && (
                  <div className="ml-8 sm:ml-11 p-2 sm:p-3 bg-cyber-elevated/50 rounded border border-cyber-border-cyan">
                    <p className="text-sm text-cyber-muted">
                      <span className="font-semibold text-cyber-text">Explanation:</span> {answer.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button onClick={() => navigate('/awareness')} className="soc-button-primary w-full sm:w-auto">
              Back to Quizzes
            </button>
            <button onClick={() => window.location.reload()} className="soc-button-ghost w-full sm:w-auto">
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const currentAnswer = getCurrentAnswer();

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader 
        eyebrow={quiz.category} 
        title={quiz.title} 
        description={quiz.description || ""} 
        icon={BookOpen} 
      />

      <div className="soc-panel p-4 sm:p-6">
        {/* Quiz Header */}
        <div className="flex flex-col items-start justify-between gap-4 mb-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className={`rounded-full border px-2 py-1 text-xs font-bold ${getCategoryColor(quiz.category)}`}>
              {quiz.category}
            </span>
            <span className={`rounded-full border px-2 py-1 text-sm font-bold ${getDifficultyColor(quiz.difficulty)}`}>
              {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
            </span>
            <span className="rounded-full border border-cyber-border-cyan px-2 py-1 text-sm font-bold text-cyber-muted hidden xs:inline">
              {quiz.type}
            </span>
          </div>
          {timeLeft !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyber-muted" />
              <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-cyber-red' : 'text-cyber-text'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex flex-col items-start justify-between text-sm mb-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-cyber-muted">Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <span className="text-cyber-muted">Answered: {answers.length}/{quiz.questions.length}</span>
          </div>
          <div className="w-full overflow-hidden bg-cyber-elevated rounded-full h-2">
            <div 
              className="w-full origin-left bg-gradient-to-r from-cyber-cyan to-cyan-300 h-2 rounded-full transition-transform duration-300" 
              style={{ transform: `scaleX(${(currentQuestion + 1) / quiz.questions.length})` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-cyber-text mb-4">
            {question.question_text}
          </h3>
          
          <div className="space-y-2 sm:space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => selectOption(index)}
                className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all ${
                  currentAnswer?.selected_option_index === index
                    ? 'border-cyber-cyan bg-cyber-cyan/10'
                    : 'border-cyber-border-cyan hover:border-cyber-cyan/60 hover:bg-cyber-elevated/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer?.selected_option_index === index
                      ? 'border-cyber-cyan bg-cyber-cyan'
                      : 'border-cyber-border-cyan'
                  }`}>
                    {currentAnswer?.selected_option_index === index && (
                      <div className="w-2 h-2 rounded-full bg-cyber-text" />
                    )}
                  </div>
                  <span className="text-cyber-text text-sm sm:text-base">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="soc-panel p-4">
          {/* Question Group Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToQuestionGroup(questionGroupPage - 1)}
                disabled={questionGroupPage === 0}
                className="soc-button-ghost disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-sm flex items-center gap-1"
                aria-label="Show previous questions"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <div className="flex gap-1">
                {(() => {
                  const totalGroups = Math.ceil(quiz.questions.length / QUESTIONS_PER_GROUP);
                  const groupStart = questionGroupPage * QUESTIONS_PER_GROUP;
                  const groupEnd = Math.min(groupStart + QUESTIONS_PER_GROUP, quiz.questions.length);
                  const visibleQuestions = [];
                  
                  for (let i = groupStart; i < groupEnd; i++) {
                    visibleQuestions.push(i);
                  }
                  
                  return visibleQuestions.map((index) => (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs font-bold transition-all ${
                        index === currentQuestion
                          ? 'bg-cyber-cyan text-cyber-text ring-2 ring-cyber-cyan/50'
                          : answers.find(a => a.question_id === quiz.questions[index].id)
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30'
                          : 'bg-cyber-elevated text-cyber-muted border border-cyber-border-cyan hover:bg-cyber-elevated/50'
                      }`}
                      aria-label={`Go to question ${index + 1}`}
                    >
                      <span className="text-xs sm:text-sm">{index + 1}</span>
                    </button>
                  ));
                })()}
              </div>
              
              <button
                onClick={() => goToQuestionGroup(questionGroupPage + 1)}
                disabled={questionGroupPage >= Math.ceil(quiz.questions.length / QUESTIONS_PER_GROUP) - 1}
                className="soc-button-ghost disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-sm flex items-center gap-1"
                aria-label="Show next questions"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-slate-400">
              {(() => {
                const groupStart = questionGroupPage * QUESTIONS_PER_GROUP + 1;
                const groupEnd = Math.min(groupStart + QUESTIONS_PER_GROUP - 1, quiz.questions.length);
                const totalGroups = Math.ceil(quiz.questions.length / QUESTIONS_PER_GROUP);
                return `Questions ${groupStart}-${groupEnd} of ${quiz.questions.length} (Page ${questionGroupPage + 1} of ${totalGroups})`;
              })()}
            </div>
          </div>

          {/* Question Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={goToPrevious}
              disabled={currentQuestion === 0}
              className="soc-button-ghost disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Previous question"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous Question</span>
            </button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="soc-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Submit quiz"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={goToNext}
                className="soc-button-primary flex items-center gap-2"
                aria-label="Next question"
              >
                <span className="hidden sm:inline">Next Question</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
