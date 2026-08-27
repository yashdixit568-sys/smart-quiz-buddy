import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Home,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Code2,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import Navbar from "@/components/Navbar";
import {
  isGuestUser,
  getLocalGuestTests,
  getLocalGuestQuestions,
  getLocalGuestProgress,
  saveLocalGuestProgress,
  TestRecord,
  TestQuestionRecord,
  getStoredGuestUser,
  normalizeAnswerLetter,
} from "@/lib/quizUtils";

interface RecommendationData {
  summary: string;
  weakAreas: string[];
  recommendations: string[];
  nextSteps: string;
}

const Results = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestRecord | null>(null);
  const [questions, setQuestions] = useState<TestQuestionRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Initialize active user
  useEffect(() => {
    const guest = getStoredGuestUser();
    if (guest) {
      setCurrentUser(guest);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setCurrentUser({ id: session.user.id, email: session.user.email });
        }
      });
    }
  }, []);

  const computeLocalRecommendations = (
    topicName: string,
    accuracy: number,
    weakQuestions: string[]
  ): RecommendationData => {
    if (accuracy >= 80) {
      return {
        summary: `Exceptional mastery in ${topicName}! You demonstrated deep foundational comprehension and strong problem-solving skills.`,
        weakAreas: weakQuestions.slice(0, 3),
        recommendations: [
          `Review edge-cases and high-concurrency constraints in ${topicName}.`,
          "Attempt timed competitive programming challenges to push implementation speed.",
          "Practice articulating trade-offs aloud as expected in senior technical interviews.",
        ],
        nextSteps: `Move on to advanced System Design or explore complementary subjects like Operating Systems and Distributed Systems.`,
      };
    } else if (accuracy >= 50) {
      return {
        summary: `Solid baseline in ${topicName}, with key opportunities for sharpening core concepts and edge case handling.`,
        weakAreas: weakQuestions.slice(0, 4),
        recommendations: [
          `Revisit missed question topics and practice similar variations.`,
          "Focus on time-complexity analysis and space-complexity trade-offs.",
          "Write clean modular solutions before jumping into optimizations.",
        ],
        nextSteps: `Take another 5-question targeted mock test in ${topicName} after reviewing the explanations below.`,
      };
    } else {
      return {
        summary: `Foundational concepts in ${topicName} require dedicated review before approaching technical screens.`,
        weakAreas: weakQuestions.slice(0, 4),
        recommendations: [
          `Review the core definitions, standard algorithms, and fundamental properties of ${topicName}.`,
          "Start with easy-difficulty questions to build pattern-recognition confidence.",
          "Write down notes on why incorrect options are false.",
        ],
        nextSteps: `Study standard interview cheat-sheets and re-attempt this assessment once revised.`,
      };
    }
  };

  const getRecommendations = useCallback(
    async (testData: TestRecord, questionsData: TestQuestionRecord[]) => {
      setLoadingRecs(true);
      const topicName = testData.topics?.name || "Computer Science";
      const total = questionsData.length;
      const correct = questionsData.filter((q) => q.is_correct).length;
      const accuracy = total > 0 ? (correct / total) * 100 : 0;
      const weak = questionsData
        .filter((q) => !q.is_correct)
        .map((q) => q.question_text.slice(0, 80));

      try {
        const { data, error } = await supabase.functions.invoke("get-recommendations", {
          body: {
            testResults: questionsData,
            topicName,
          },
        });

        if (!error && data && data.summary) {
          setRecommendations({
            summary: data.summary,
            weakAreas: data.weakAreas || weak,
            recommendations: data.recommendations || [],
            nextSteps: data.nextSteps || "Continue practicing similar technical questions.",
          });
          return;
        }
      } catch {
        // Fall back to local advice
      }

      setRecommendations(computeLocalRecommendations(topicName, accuracy, weak));
      setLoadingRecs(false);
    },
    []
  );

  const updateProgressOnce = useCallback(
    async (testData: TestRecord, questionsData: TestQuestionRecord[]) => {
      const progressKey = `sqb_progress_updated_${testData.id}`;
      if (sessionStorage.getItem(progressKey)) {
        return; // Already calculated
      }

      const totalQuestions = questionsData.length;
      const correctAnswers = questionsData.filter((q) => q.is_correct).length;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      try {
        if (isGuestUser(testData.user_id)) {
          const existing = getLocalGuestProgress(testData.user_id).find(
            (p) => p.topic_id === testData.topic_id
          );

          if (existing) {
            const newTotal = existing.total_questions + totalQuestions;
            const newCorrect = existing.correct_answers + correctAnswers;
            saveLocalGuestProgress({
              ...existing,
              tests_taken: existing.tests_taken + 1,
              total_questions: newTotal,
              correct_answers: newCorrect,
              accuracy: (newCorrect / newTotal) * 100,
              last_test_date: new Date().toISOString(),
            });
          } else {
            saveLocalGuestProgress({
              id: `prog-${Date.now()}`,
              user_id: testData.user_id,
              topic_id: testData.topic_id,
              tests_taken: 1,
              total_questions: totalQuestions,
              correct_answers: correctAnswers,
              accuracy,
              last_test_date: new Date().toISOString(),
              topics: {
                name: testData.topics?.name || "General CS",
              },
            });
          }
        } else {
          // Supabase user
          const { data: existingProgress } = await supabase
            .from("user_progress")
            .select("*")
            .eq("user_id", testData.user_id)
            .eq("topic_id", testData.topic_id)
            .single();

          if (existingProgress) {
            const newTotal = existingProgress.total_questions + totalQuestions;
            const newCorrect = existingProgress.correct_answers + correctAnswers;
            const newAccuracy = (newCorrect / newTotal) * 100;

            await supabase
              .from("user_progress")
              .update({
                tests_taken: existingProgress.tests_taken + 1,
                total_questions: newTotal,
                correct_answers: newCorrect,
                accuracy: newAccuracy,
                last_test_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingProgress.id);
          } else {
            await supabase.from("user_progress").insert({
              user_id: testData.user_id,
              topic_id: testData.topic_id,
              tests_taken: 1,
              total_questions: totalQuestions,
              correct_answers: correctAnswers,
              accuracy,
              last_test_date: new Date().toISOString(),
            });
          }
        }

        sessionStorage.setItem(progressKey, "true");
      } catch (err) {
        console.error("Progress save note:", err);
      }
    },
    []
  );

  const fetchResults = useCallback(async () => {
    if (!testId) return;
    setLoading(true);

    try {
      let currentTestData: TestRecord | null = null;
      let questionsList: TestQuestionRecord[] = [];

      // 1. Check Guest Storage
      const guestTests = getLocalGuestTests();
      const matched = guestTests.find((t) => t.id === testId);

      if (matched) {
        currentTestData = matched;
        questionsList = getLocalGuestQuestions(testId);
      } else {
        // 2. Fetch from Supabase
        const { data: testData, error: testError } = await supabase
          .from("tests")
          .select(`
            *,
            topics:topic_id (name, id)
          `)
          .eq("id", testId)
          .single();

        if (testError || !testData) {
          throw new Error("Test details not found");
        }

        interface RawSupabaseTest {
          id: string;
          user_id: string;
          topic_id: string;
          num_mcqs: number;
          num_coding: number;
          status: string;
          created_at: string;
          completed_at?: string;
          topics?: { name: string; id: string } | null;
        }

        const raw = testData as unknown as RawSupabaseTest;

        currentTestData = {
          id: raw.id,
          user_id: raw.user_id,
          topic_id: raw.topic_id,
          num_mcqs: raw.num_mcqs,
          num_coding: raw.num_coding,
          status: raw.status === "completed" ? "completed" : "in_progress",
          created_at: raw.created_at,
          completed_at: raw.completed_at,
          topics: {
            id: raw.topics?.id,
            name: raw.topics?.name || "Computer Science",
          },
        };

        const { data: questionsData } = await supabase
          .from("test_questions")
          .select("*")
          .eq("test_id", testId);

        interface RawQuestionItem {
          id: string;
          test_id: string;
          question_type: string;
          question_text: string;
          options?: string[] | null;
          correct_answer?: string | null;
          user_answer?: string | null;
          is_correct?: boolean | null;
          code_submission?: string | null;
          language?: string | null;
        }

        const qList = (questionsData || []) as unknown as RawQuestionItem[];

        questionsList = qList.map((q) => ({
          id: q.id,
          test_id: q.test_id,
          question_type: q.question_type === "coding" ? "coding" : "mcq",
          question_text: q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer || null,
          user_answer: q.user_answer || null,
          is_correct: q.is_correct ?? null,
          code_submission: q.code_submission || "",
          language: q.language || "python",
        }));
      }

      setTest(currentTestData);
      setQuestions(questionsList);

      // Save user progress (guarded to avoid double increments)
      await updateProgressOnce(currentTestData, questionsList);

      // Fetch or compute study recommendations
      await getRecommendations(currentTestData, questionsList);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load results";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [testId, toast, updateProgressOnce, getRecommendations]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Statistics calculation
  const totalQuestions = questions.length;
  const mcqQuestions = questions.filter((q) => q.question_type === "mcq");
  const codingQuestions = questions.filter((q) => q.question_type === "coding");

  const correctMcqs = mcqQuestions.filter((q) => q.is_correct).length;
  const submittedCoding = codingQuestions.filter(
    (q) => Boolean(q.code_submission && q.code_submission.trim().length > 15)
  ).length;

  // Overall points (MCQ correct + Coding submitted)
  const totalEarnedPoints = correctMcqs + submittedCoding;
  const accuracy = totalQuestions > 0 ? (totalEarnedPoints / totalQuestions) * 100 : 0;

  // Chart data for recharts
  const chartData = useMemo(() => {
    const incorrect = totalQuestions - totalEarnedPoints;
    return [
      { name: "Correct / Submitted", value: totalEarnedPoints, color: "#10b981" },
      { name: "Incorrect / Skipped", value: Math.max(0, incorrect), color: "#f43f5e" },
    ];
  }, [totalEarnedPoints, totalQuestions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-8 shadow-sm flex flex-col items-center max-w-sm text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Calculating Performance Score</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Synthesizing detailed review and study recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <Navbar userEmail={currentUser?.email} userId={currentUser?.id} />

      <main className="container mx-auto max-w-4xl py-8 px-4 flex-1 space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 mb-1">
            Assessment Completed
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {test?.topics?.name || "Computer Science"} Assessment Results
          </h1>
          <p className="text-sm text-slate-500">
            Completed on{" "}
            {new Date(test?.completed_at || test?.created_at || Date.now()).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Score Overview Card */}
        <Card className="border border-slate-200/80 bg-white shadow-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Score Number & Badge */}
            <div className="p-6 text-center flex flex-col items-center justify-center space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overall Score
              </span>
              <div className="text-5xl font-extrabold tracking-tight text-slate-900">
                {accuracy.toFixed(0)}
                <span className="text-2xl text-slate-400 font-normal">%</span>
              </div>
              <Badge
                className={`text-xs px-2.5 py-0.5 font-medium ${
                  accuracy >= 80
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : accuracy >= 50
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {accuracy >= 80 ? "Interview Ready" : accuracy >= 50 ? "Proficient" : "Needs Review"}
              </Badge>
            </div>

            {/* Visual Recharts Ring */}
            <div className="p-6 flex flex-col items-center justify-center">
              <div className="w-36 h-36 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs font-bold text-slate-800">
                    {totalEarnedPoints}/{totalQuestions}
                  </span>
                  <span className="text-[10px] text-slate-400">Solved</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="p-6 flex flex-col justify-center space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  MCQ Accuracy:
                </span>
                <span className="font-semibold text-slate-900">
                  {correctMcqs}/{mcqQuestions.length} ({mcqQuestions.length > 0 ? Math.round((correctMcqs / mcqQuestions.length) * 100) : 0}%)
                </span>
              </div>

              {codingQuestions.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Code2 className="w-4 h-4 text-blue-600" />
                    Coding Completed:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {submittedCoding}/{codingQuestions.length} Submitted
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-xs text-slate-500">Total Questions Evaluated:</span>
                <span className="text-xs font-mono font-medium text-slate-800">{totalQuestions}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* AI Recommendations Card */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Personalized Assessment Review & Study Plan
              </CardTitle>
              {loadingRecs && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {recommendations?.summary && (
              <CardDescription className="text-slate-700 text-sm pt-1 leading-relaxed">
                {recommendations.summary}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {recommendations?.weakAreas && recommendations.weakAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Key Areas For Improvement
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.weakAreas.map((area, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-rose-100 bg-rose-50/50 text-xs text-rose-900 flex items-start gap-2"
                    >
                      <span className="font-bold shrink-0">•</span>
                      <span className="line-clamp-2">{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendations?.recommendations && recommendations.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Actionable Study Steps
                </h4>
                <ul className="space-y-2">
                  {recommendations.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm"
                    >
                      <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations?.nextSteps && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                  Next Milestone
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{recommendations.nextSteps}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Question Review Accordion */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Question-by-Question Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Click any question to inspect your answers and correct explanations
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs text-slate-600 bg-white border-slate-200">
                {questions.length} Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {questions.map((q, idx) => {
                const isMcq = q.question_type === "mcq";
                const isCorrect = Boolean(q.is_correct);

                return (
                  <AccordionItem
                    key={q.id || idx}
                    value={`q-${idx}`}
                    className="border border-slate-200 rounded-xl overflow-hidden px-3 bg-white"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left w-full pr-2">
                        {isMcq ? (
                          isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          )
                        ) : (
                          <Code2 className="w-5 h-5 text-blue-600 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs text-slate-500 block">
                            Question {idx + 1} • {isMcq ? "MCQ" : "Coding"}
                          </span>
                          <span className="text-sm font-medium text-slate-900 truncate block">
                            {q.question_text}
                          </span>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[11px] shrink-0 font-medium ${
                            isMcq
                              ? isCorrect
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                              : q.code_submission?.trim()
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          {isMcq
                            ? isCorrect
                              ? "Correct (+1)"
                              : "Incorrect (0)"
                            : q.code_submission?.trim()
                            ? "Code Submitted"
                            : "Skipped"}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-2 pb-4 space-y-4 text-xs">
                      {/* Full question text */}
                      <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {q.question_text}
                      </div>

                      {/* MCQ details */}
                      {isMcq && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-3 rounded-lg border border-slate-200 bg-white">
                              <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-1">
                                Your Choice:
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                                    isCorrect
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {q.user_answer || "—"}
                                </span>
                                <span className="text-slate-800 font-medium truncate">
                                  {q.options && q.user_answer
                                    ? q.options[q.user_answer.charCodeAt(0) - 65] || q.user_answer
                                    : "Not Answered"}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                              <span className="text-emerald-800 font-semibold uppercase text-[10px] block mb-1">
                                Correct Answer:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-emerald-600 text-white">
                                  {normalizeAnswerLetter(q.correct_answer)}
                                </span>
                                <span className="text-emerald-950 font-medium truncate">
                                  {q.options && q.correct_answer
                                    ? q.options[normalizeAnswerLetter(q.correct_answer).charCodeAt(0) - 65] || q.correct_answer
                                    : q.correct_answer}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Options list */}
                          {q.options && q.options.length > 0 && (
                            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5 shadow-sm">
                              <span className="text-slate-500 font-semibold text-[10px] uppercase block">
                                All Options:
                              </span>
                              {q.options.map((opt, optIdx) => {
                                const letter = String.fromCharCode(65 + optIdx);
                                const isThisCorrect = letter === normalizeAnswerLetter(q.correct_answer);
                                const isThisUser = letter === q.user_answer;

                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                                      isThisCorrect
                                        ? "font-semibold text-emerald-800 bg-emerald-100/60"
                                        : isThisUser
                                        ? "text-rose-800 bg-rose-100/50 line-through"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    <span className="w-4 text-center font-mono font-bold">{letter}.</span>
                                    <span>{opt}</span>
                                    {isThisCorrect && (
                                      <Badge className="ml-auto bg-emerald-600 text-white text-[9px] py-0">
                                        Correct
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coding challenge details */}
                      {!isMcq && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 text-xs">
                              Your Solution ({q.language || "code"}):
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {q.code_submission?.length || 0} characters
                            </Badge>
                          </div>

                          {q.code_submission ? (
                            <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              <code>{q.code_submission}</code>
                            </pre>
                          ) : (
                            <p className="text-slate-400 italic">No code was submitted for this challenge.</p>
                          )}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full sm:w-auto h-11 border-slate-200 text-slate-700 hover:bg-slate-100 gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Take Another Assessment
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;