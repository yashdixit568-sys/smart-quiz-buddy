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
  Lightbulb,
  Filter,
  HelpCircle,
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

export type FilterStatus = "all" | "correct" | "incorrect" | "unattempted";

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

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
        summary: `Exceptional performance in ${topicName}! You demonstrated deep technical comprehension and solid problem-solving skills.`,
        weakAreas: weakQuestions.slice(0, 3),
        recommendations: [
          `Review advanced edge cases and scalability constraints in ${topicName}.`,
          "Attempt timed competitive coding challenges to sharpen implementation speed.",
          "Practice explaining solution trade-offs aloud as expected in top engineering interviews.",
        ],
        nextSteps: `Move on to advanced System Design or explore complementary subjects like Operating Systems and Distributed Systems.`,
      };
    } else if (accuracy >= 50) {
      return {
        summary: `Solid baseline in ${topicName}, with targeted opportunities for sharpening core concepts.`,
        weakAreas: weakQuestions.slice(0, 4),
        recommendations: [
          `Revisit missed questions below and study their detailed explanations.`,
          "Focus on time-complexity analysis and space-complexity trade-offs.",
          "Write clean modular solutions before jumping into optimizations.",
        ],
        nextSteps: `Take another 5-question targeted mock test in ${topicName} after reviewing explanations.`,
      };
    } else {
      return {
        summary: `Foundational concepts in ${topicName} require dedicated review before approaching technical screens.`,
        weakAreas: weakQuestions.slice(0, 4),
        recommendations: [
          `Review core definitions, standard algorithms, and fundamental properties of ${topicName}.`,
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
      if (!testData || questionsData.length === 0) return;
      const topicId = testData.topic_id;
      const totalNew = questionsData.length;
      const correctNew = questionsData.filter((q) => q.is_correct).length;

      if (isGuestUser(testData.user_id)) {
        const localProg = getLocalGuestProgress(testData.user_id);
        const existing = localProg.find((p) => p.topic_id === topicId);

        const testsTaken = (existing?.tests_taken || 0) + 1;
        const totalQ = (existing?.total_questions || 0) + totalNew;
        const correctQ = (existing?.correct_answers || 0) + correctNew;
        const acc = totalQ > 0 ? (correctQ / totalQ) * 100 : 0;

        saveLocalGuestProgress({
          id: existing?.id || `prog-${Date.now()}`,
          user_id: testData.user_id,
          topic_id: topicId,
          tests_taken: testsTaken,
          total_questions: totalQ,
          correct_answers: correctQ,
          accuracy: parseFloat(acc.toFixed(2)),
          last_test_date: new Date().toISOString(),
        });
      } else {
        const { data: existing } = await supabase
          .from("user_progress")
          .select("*")
          .eq("user_id", testData.user_id)
          .eq("topic_id", topicId)
          .maybeSingle();

        const testsTaken = (existing?.tests_taken || 0) + 1;
        const totalQ = (existing?.total_questions || 0) + totalNew;
        const correctQ = (existing?.correct_answers || 0) + correctNew;
        const acc = totalQ > 0 ? (correctQ / totalQ) * 100 : 0;

        if (existing) {
          await supabase
            .from("user_progress")
            .update({
              tests_taken: testsTaken,
              total_questions: totalQ,
              correct_answers: correctQ,
              accuracy: parseFloat(acc.toFixed(2)),
              last_test_date: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("user_progress").insert({
            user_id: testData.user_id,
            topic_id: topicId,
            tests_taken: testsTaken,
            total_questions: totalQ,
            correct_answers: correctQ,
            accuracy: parseFloat(acc.toFixed(2)),
            last_test_date: new Date().toISOString(),
          });
        }
      }
    },
    []
  );

  const fetchResults = useCallback(async () => {
    if (!testId) return;
    setLoading(true);

    try {
      let currentTestData: TestRecord | null = null;

      // 1. Check Guest storage
      const guestTests = getLocalGuestTests();
      const matchedGuest = guestTests.find((t) => t.id === testId);

      if (matchedGuest) {
        currentTestData = matchedGuest;
      } else {
        // 2. Check Supabase
        const { data: testData, error } = await supabase
          .from("tests")
          .select("*, topics(*)")
          .eq("id", testId)
          .single();

        if (!error && testData) {
          currentTestData = testData as TestRecord;
        }
      }

      if (!currentTestData) {
        toast({
          title: "Results Not Found",
          description: "Could not retrieve test score breakdown.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTest(currentTestData);

      // Fetch questions
      let qDataList: TestQuestionRecord[] = [];
      if (isGuestUser(currentTestData.user_id)) {
        qDataList = getLocalGuestQuestions(testId);
      } else {
        const { data: qData } = await supabase
          .from("test_questions")
          .select("*")
          .eq("test_id", testId);
        if (qData) qDataList = qData as TestQuestionRecord[];
      }

      setQuestions(qDataList);

      // Fetch recommendations and update user progress metrics
      getRecommendations(currentTestData, qDataList);
      updateProgressOnce(currentTestData, qDataList);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load test results.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [testId, navigate, toast, getRecommendations, updateProgressOnce]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Derived Performance Metrics
  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => q.is_correct).length;

  const unattemptedCount = useMemo(() => {
    return questions.filter((q) => {
      if (q.question_type === "mcq") return !q.user_answer;
      return !q.code_submission || q.code_submission.trim().length <= 15;
    }).length;
  }, [questions]);

  const incorrectCount = totalQuestions - correctCount - unattemptedCount;

  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const totalEarnedPoints = correctCount;

  // Question Filter Logic
  const filteredQuestions = useMemo(() => {
    if (filterStatus === "all") return questions;
    if (filterStatus === "correct") return questions.filter((q) => Boolean(q.is_correct));
    if (filterStatus === "incorrect") {
      return questions.filter((q) => {
        if (q.question_type === "mcq") {
          return Boolean(q.user_answer && !q.is_correct);
        }
        return Boolean(q.code_submission && q.code_submission.trim().length > 15 && !q.is_correct);
      });
    }
    if (filterStatus === "unattempted") {
      return questions.filter((q) => {
        if (q.question_type === "mcq") return !q.user_answer;
        return !q.code_submission || q.code_submission.trim().length <= 15;
      });
    }
    return questions;
  }, [questions, filterStatus]);

  const chartData = useMemo(() => {
    return [
      { name: "Correct", value: correctCount, color: "#10b981" },
      { name: "Incorrect", value: incorrectCount, color: "#f43f5e" },
      { name: "Unattempted", value: unattemptedCount, color: "#94a3b8" },
    ].filter((item) => item.value > 0);
  }, [correctCount, incorrectCount, unattemptedCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-8 shadow-sm flex flex-col items-center max-w-sm text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Calculating Performance Score</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Synthesizing detailed review & study recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <Navbar userEmail={currentUser?.email} userId={currentUser?.id} />

      <main className="container mx-auto max-w-4xl py-8 px-4 flex-1 space-y-8">
        {/* HEADER DASHBOARD BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Assessment Completed
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">• {new Date().toLocaleDateString()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {test?.topics?.name || "Mock Test"} Performance Results
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="sm"
              className="text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 gap-1.5 h-9"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Button>
            <Button
              onClick={() => navigate("/")}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-9"
            >
              <RotateCcw className="w-4 h-4" />
              Take Another Test
            </Button>
          </div>
        </div>

        {/* METRICS & CHART CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ACCURACY METRIC */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Accuracy Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {accuracy.toFixed(1)}%
              </div>
              <Progress value={accuracy} className="h-2 bg-slate-100 dark:bg-slate-800" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target Benchmark: <span className="font-semibold text-slate-800 dark:text-slate-200">80%+</span>
              </p>
            </CardContent>
          </Card>

          {/* QUESTIONS BREAKDOWN */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Correct Answers:
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{correctCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Incorrect Answers:
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{incorrectCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  Unattempted / Skipped:
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{unattemptedCount}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-semibold text-slate-900 dark:text-white">
                <span>Total Questions:</span>
                <span>{totalQuestions}</span>
              </div>
            </CardContent>
          </Card>

          {/* VISUAL PIE CHART */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-card shadow-card flex flex-col justify-center items-center p-4">
            <div className="w-full h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Accuracy Distribution</span>
          </Card>
        </div>

        {/* AI STUDY RECOMMENDATIONS SECTION */}
        <Card className="border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
          <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Personalized Study Roadmap
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                Gemini 2.0 Flash Synthesis
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs sm:text-sm">
            {loadingRecs ? (
              <div className="flex items-center gap-2 text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Analyzing performance metrics and generating advice...
              </div>
            ) : recommendations ? (
              <>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {recommendations.summary}
                </p>

                {recommendations.weakAreas && recommendations.weakAreas.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Identified Weak Areas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recommendations.weakAreas.map((area, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
                        >
                          <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {recommendations.recommendations && recommendations.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Actionable Recommendations:
                    </span>
                    <ul className="space-y-1.5 pl-2">
                      {recommendations.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recommendations.nextSteps && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                    <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                      Recommended Next Step:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">{recommendations.nextSteps}</p>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* QUESTION-BY-QUESTION REVIEW WITH FILTERS & EXPLANATIONS */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-card shadow-card">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Question-by-Question Review & Explanations
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect your answers alongside clear educational explanations for every question.
                </CardDescription>
              </div>

              {/* STATUS FILTER PILLS */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filter:
                </span>
                {[
                  { id: "all", label: `All (${questions.length})` },
                  { id: "correct", label: `Correct (${correctCount})` },
                  { id: "incorrect", label: `Incorrect (${incorrectCount})` },
                  { id: "unattempted", label: `Unattempted (${unattemptedCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterStatus(f.id as FilterStatus)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterStatus === f.id
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                No questions match the selected filter category ({filterStatus}).
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-3">
                {filteredQuestions.map((q, idx) => {
                  const isMcq = q.question_type === "mcq";
                  const isCorrect = Boolean(q.is_correct);

                  return (
                    <AccordionItem
                      key={q.id || idx}
                      value={`q-${idx}`}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden px-3 bg-card"
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
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-semibold text-xs text-slate-500 dark:text-slate-400">
                                Question {idx + 1} • {isMcq ? "MCQ" : "Coding"}
                              </span>
                              {q.subject && (
                                <Badge variant="outline" className="text-[10px] py-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                  {q.subject}
                                </Badge>
                              )}
                              {q.topic && (
                                <Badge variant="outline" className="text-[10px] py-0 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                                  {q.topic}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate block">
                              {q.question_text}
                            </span>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[11px] shrink-0 font-medium ${
                              isMcq
                                ? isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : q.user_answer
                                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                : q.code_submission?.trim()
                                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isMcq
                              ? isCorrect
                                ? "Correct (+1)"
                                : q.user_answer
                                ? "Incorrect (0)"
                                : "Unattempted"
                              : q.code_submission?.trim()
                              ? "Code Submitted"
                              : "Skipped"}
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pt-2 pb-4 space-y-4 text-xs">
                        {/* Full question text */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {q.question_text}
                        </div>

                        {/* MCQ Choice Breakdown */}
                        {isMcq && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                                  Your Choice:
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                                      isCorrect
                                        ? "bg-emerald-100 text-emerald-800"
                                        : q.user_answer
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {q.user_answer || "—"}
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                    {q.options && q.user_answer
                                      ? q.options[q.user_answer.charCodeAt(0) - 65] || q.user_answer
                                      : "Unattempted"}
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/40">
                                <span className="text-emerald-800 dark:text-emerald-300 font-semibold uppercase text-[10px] block mb-1">
                                  Correct Answer:
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-emerald-600 text-white">
                                    {normalizeAnswerLetter(q.correct_answer)}
                                  </span>
                                  <span className="text-emerald-950 dark:text-emerald-100 font-medium truncate">
                                    {q.options && q.correct_answer
                                      ? q.options[normalizeAnswerLetter(q.correct_answer).charCodeAt(0) - 65] || q.correct_answer
                                      : q.correct_answer}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Options list */}
                            {q.options && q.options.length > 0 && (
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-sm">
                                <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase block">
                                  Option Breakdown:
                                </span>
                                {q.options.map((opt, optIdx) => {
                                  const letter = String.fromCharCode(65 + optIdx);
                                  const isThisCorrect = letter === normalizeAnswerLetter(q.correct_answer);
                                  const isThisUser = letter === q.user_answer;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`flex items-center gap-2 text-xs p-1.5 rounded-lg ${
                                        isThisCorrect
                                          ? "font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/60 dark:bg-emerald-950/60"
                                          : isThisUser
                                          ? "text-rose-800 dark:text-rose-200 bg-rose-100/50 dark:bg-rose-950/50 line-through"
                                          : "text-slate-600 dark:text-slate-400"
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
                              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                Submitted Solution ({q.language || "python"}):
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {q.code_submission?.length || 0} characters
                              </Badge>
                            </div>

                            {q.code_submission ? (
                              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                <code>{q.code_submission}</code>
                              </pre>
                            ) : (
                              <p className="text-slate-400 italic">No code was submitted for this challenge.</p>
                            )}
                          </div>
                        )}

                        {/* EXPLANATION BOX */}
                        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold text-xs uppercase tracking-wider">
                            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Detailed Explanation & Rationale:</span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed pt-0.5">
                            {q.explanation || "The correct answer is derived from fundamental computer science specifications, time/space efficiency trade-offs, and core data structure principles."}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Results;