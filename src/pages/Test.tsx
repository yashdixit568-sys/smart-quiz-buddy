import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, Clock, ArrowLeft, AlertTriangle } from "lucide-react";
import MCQQuestion from "@/components/MCQQuestion";
import CodingQuestion from "@/components/CodingQuestion";
import Navbar from "@/components/Navbar";
import {
  isGuestUser,
  getLocalGuestTests,
  getLocalGuestQuestions,
  saveLocalGuestQuestions,
  saveLocalGuestTest,
  cleanOptionText,
  normalizeAnswerLetter,
  TestRecord,
  TestQuestionRecord,
  getStoredGuestUser,
} from "@/lib/quizUtils";
import { getFallbackQuestionsForTopic } from "@/lib/fallbackQuestions";

const Test = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [test, setTest] = useState<TestRecord | null>(null);
  const [questions, setQuestions] = useState<TestQuestionRecord[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Auth & Test initialization
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

  const generateAndStoreQuestions = useCallback(
    async (testData: TestRecord, topicName: string) => {
      setGenerating(true);
      try {
        let mcqs: Array<{ question: string; options: string[]; correct: string }> = [];
        let codings: Array<{
          question: string;
          difficulty: string;
          example_input: string;
          example_output: string;
          constraints: string;
        }> = [];

        // Attempt edge function generation
        try {
          const { data, error } = await supabase.functions.invoke("generate-questions", {
            body: {
              topicName,
              numMcqs: testData.num_mcqs,
              numCoding: testData.num_coding,
            },
          });

          if (!error && data && (data.mcqQuestions?.length > 0 || data.codingQuestions?.length > 0)) {
            mcqs = data.mcqQuestions || [];
            codings = data.codingQuestions || [];
          }
        } catch {
          // Edge function error or network down
        }

        // Fallback if AI response was empty or failed
        if (mcqs.length === 0 && codings.length === 0) {
          const fallback = getFallbackQuestionsForTopic(
            topicName,
            testData.num_mcqs,
            testData.num_coding
          );
          mcqs = fallback.mcqQuestions;
          codings = fallback.codingQuestions;
        }

        // Build standardized question objects
        const standardized: TestQuestionRecord[] = [
          ...mcqs.map((q, idx) => {
            const rawOptions = Array.isArray(q.options) ? q.options : [];
            const sanitizedOptions = rawOptions.map((opt) => cleanOptionText(opt));
            const normalizedCorrect = normalizeAnswerLetter(q.correct, sanitizedOptions);

            return {
              id: `mcq-${Date.now()}-${idx}`,
              test_id: testData.id,
              question_type: "mcq" as const,
              question_text: q.question,
              options: sanitizedOptions,
              correct_answer: normalizedCorrect || "A",
              user_answer: null,
              is_correct: null,
            };
          }),
          ...codings.map((q, idx) => ({
            id: `coding-${Date.now()}-${idx}`,
            test_id: testData.id,
            question_type: "coding" as const,
            question_text: q.question,
            difficulty: q.difficulty || "medium",
            example_input: q.example_input || "",
            example_output: q.example_output || "",
            constraints: q.constraints || "",
            code_submission: "",
            language: "python",
            is_correct: null,
          })),
        ];

        // Store questions:
        if (isGuestUser(testData.user_id)) {
          saveLocalGuestQuestions(standardized);
        } else {
          // Insert into Supabase
          for (const q of standardized) {
            await supabase.from("test_questions").insert({
              test_id: testData.id,
              question_type: q.question_type,
              question_text: q.question_text,
              options: q.options || null,
              correct_answer: q.correct_answer || null,
              language: q.language || null,
            });
          }
        }

        setQuestions(standardized);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load questions";
        toast({
          title: "Question Load Notice",
          description: `${msg}. Using offline question set.`,
        });
        const fallback = getFallbackQuestionsForTopic(
          topicName,
          testData.num_mcqs,
          testData.num_coding
        );
        const fallbackList: TestQuestionRecord[] = fallback.mcqQuestions.map((q, idx) => ({
          id: `fallback-mcq-${idx}`,
          test_id: testData.id,
          question_type: "mcq",
          question_text: q.question,
          options: q.options,
          correct_answer: q.correct,
          user_answer: null,
        }));
        setQuestions(fallbackList);
      } finally {
        setGenerating(false);
        setLoading(false);
      }
    },
    [toast]
  );

  const fetchTestAndQuestions = useCallback(async () => {
    if (!testId) return;
    setLoading(true);

    try {
      let currentTestData: TestRecord | null = null;
      let topicName = "Computer Science";

      // 1. Check if Guest test
      const guestTests = getLocalGuestTests();
      const matchedGuest = guestTests.find((t) => t.id === testId);

      if (matchedGuest) {
        currentTestData = matchedGuest;
        topicName = matchedGuest.topics?.name || "Computer Science";
      } else {
        // 2. Check Supabase
        const { data: testData, error: testError } = await supabase
          .from("tests")
          .select(`
            *,
            topics:topic_id (name)
          `)
          .eq("id", testId)
          .single();

        if (testError || !testData) {
          throw new Error("Test not found");
        }

        interface SupabaseSingleTest {
          id: string;
          user_id: string;
          topic_id: string;
          num_mcqs: number;
          num_coding: number;
          status: string;
          created_at: string;
          topics?: { name: string } | null;
        }

        const raw = testData as unknown as SupabaseSingleTest;

        currentTestData = {
          id: raw.id,
          user_id: raw.user_id,
          topic_id: raw.topic_id,
          num_mcqs: raw.num_mcqs,
          num_coding: raw.num_coding,
          status: raw.status === "completed" ? "completed" : "in_progress",
          created_at: raw.created_at,
          topics: {
            name: raw.topics?.name || "Computer Science",
          },
        };
        topicName = raw.topics?.name || "Computer Science";
      }

      setTest(currentTestData);

      // Check if test is already completed
      if (currentTestData.status === "completed") {
        navigate(`/results/${testId}`, { replace: true });
        return;
      }

      // 3. Check for existing questions for this testId
      if (isGuestUser(currentTestData.user_id)) {
        const localQuestions = getLocalGuestQuestions(testId);
        if (localQuestions.length > 0) {
          setQuestions(localQuestions);
          setLoading(false);
          return;
        }
      } else {
        const { data: existingQ } = await supabase
          .from("test_questions")
          .select("*")
          .eq("test_id", testId);

        if (existingQ && existingQ.length > 0) {
          interface SupabaseQuestionRow {
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

          const existingRows = existingQ as unknown as SupabaseQuestionRow[];

          const mapped: TestQuestionRecord[] = existingRows.map((q) => ({
            id: q.id,
            test_id: q.test_id,
            question_type: q.question_type === "coding" ? "coding" : "mcq",
            question_text: q.question_text,
            options: q.options || [],
            correct_answer: q.correct_answer || null,
            user_answer: q.user_answer || null,
            is_correct: q.is_correct || null,
            code_submission: q.code_submission || "",
            language: q.language || "python",
          }));
          setQuestions(mapped);
          setLoading(false);
          return;
        }
      }

      // 4. Generate new questions if none exist
      await generateAndStoreQuestions(currentTestData, topicName);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load test";
      toast({
        title: "Test Not Found",
        description: msg,
        variant: "destructive",
      });
      navigate("/");
    }
  }, [testId, navigate, toast, generateAndStoreQuestions]);

  useEffect(() => {
    fetchTestAndQuestions();
  }, [fetchTestAndQuestions]);

  // Answer handler for MCQ and Coding
  const handleAnswerChange = (value: string, language?: string) => {
    const updated = [...questions];
    const current = updated[currentQuestionIndex];
    if (!current) return;

    if (current.question_type === "mcq") {
      current.user_answer = value;
    } else {
      current.code_submission = value;
      if (language) current.language = language;
    }

    setQuestions(updated);

    // Save state to guest storage if guest
    if (test && isGuestUser(test.user_id)) {
      saveLocalGuestQuestions(updated);
    }
  };

  // Submit test
  const executeSubmission = async () => {
    if (!test || !testId) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      // Process score and correctness
      const updatedQuestions = questions.map((q) => {
        if (q.question_type === "mcq") {
          const isMatch =
            normalizeAnswerLetter(q.user_answer) === normalizeAnswerLetter(q.correct_answer);
          return {
            ...q,
            is_correct: isMatch,
          };
        } else {
          // Coding challenge: mark as submitted if code was written
          const hasCode = (q.code_submission || "").trim().length > 20;
          return {
            ...q,
            is_correct: hasCode, // Count as solved if meaningful code submitted
          };
        }
      });

      if (isGuestUser(test.user_id)) {
        // Save to guest storage
        saveLocalGuestQuestions(updatedQuestions);
        const updatedTest: TestRecord = {
          ...test,
          status: "completed",
          completed_at: now,
        };
        saveLocalGuestTest(updatedTest);
      } else {
        // Update test status in Supabase
        await supabase
          .from("tests")
          .update({
            status: "completed",
            completed_at: now,
          })
          .eq("id", testId);

        // Update each question
        for (const q of updatedQuestions) {
          await supabase
            .from("test_questions")
            .update({
              user_answer: q.user_answer || null,
              code_submission: q.code_submission || null,
              language: q.language || null,
              is_correct: q.is_correct,
            })
            .eq("test_id", testId)
            .eq("question_text", q.question_text);
        }
      }

      toast({
        title: "Test Submitted!",
        description: "Your responses have been evaluated. Review your score breakdown.",
      });

      navigate(`/results/${testId}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error submitting test";
      toast({
        title: "Submission Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      if (q.question_type === "mcq") return Boolean(q.user_answer);
      return Boolean(q.code_submission && q.code_submission.trim().length > 15);
    }).length;
  }, [questions]);

  const unansweredCount = questions.length - answeredCount;

  const handleSubmitClick = () => {
    if (unansweredCount > 0) {
      setShowSubmitDialog(true);
    } else {
      executeSubmission();
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-8 shadow-sm flex flex-col items-center max-w-sm text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Generating AI Mock Test</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Synthesizing unique questions & scenarios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md border-slate-200 dark:border-slate-800 bg-card p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Questions Available</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            We couldn't load questions for this test session. Please return to the dashboard and try again.
          </p>
          <Button onClick={() => navigate("/")} className="bg-blue-600 text-white w-full">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <Navbar userEmail={currentUser?.email} userId={currentUser?.id} />

      <div className="container mx-auto max-w-4xl py-6 px-4 flex-1 space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-slate-500 hover:text-slate-800 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Exit
            </Button>
            <div className="h-4 w-px bg-slate-200"></div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                {test?.topics?.name || "Mock Test"}
              </h2>
              <span className="text-xs text-slate-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Answered Counter */}
            <Badge variant="outline" className="text-xs font-normal border-slate-200 bg-slate-50">
              {answeredCount}/{questions.length} Answered
            </Badge>
          </div>
        </div>

        {/* Question Palette / Navigation Strip */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:inline mr-2">
              Questions:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {questions.map((q, idx) => {
                const isCurrent = currentQuestionIndex === idx;
                const isAnswered =
                  q.question_type === "mcq"
                    ? Boolean(q.user_answer)
                    : Boolean(q.code_submission && q.code_submission.trim().length > 15);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30"
                        : isAnswered
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <Progress value={progressPercent} className="h-1.5 mt-3 bg-slate-100" />
        </div>

        {/* Active Question Card */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Question #{currentQuestionIndex + 1}</span>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-normal ${
                    currentQuestion.question_type === "mcq"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  }`}
                >
                  {currentQuestion.question_type === "mcq" ? "Multiple Choice" : "Coding Challenge"}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {currentQuestion.question_type === "mcq" ? (
              <MCQQuestion
                question={{
                  question_text: currentQuestion.question_text,
                  options: currentQuestion.options || [],
                  user_answer: currentQuestion.user_answer || null,
                }}
                onAnswerChange={handleAnswerChange}
              />
            ) : (
              <CodingQuestion
                question={{
                  question_text: currentQuestion.question_text,
                  difficulty: currentQuestion.difficulty,
                  example_input: currentQuestion.example_input,
                  example_output: currentQuestion.example_output,
                  constraints: currentQuestion.constraints,
                  code_submission: currentQuestion.code_submission || "",
                  language: currentQuestion.language || "python",
                }}
                onCodeChange={handleAnswerChange}
              />
            )}

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmitClick}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Submit Assessment
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Submit Mock Test?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm">
              You have answered <span className="font-semibold text-slate-800">{answeredCount}</span> of{" "}
              <span className="font-semibold text-slate-800">{questions.length}</span> questions.{" "}
              {unansweredCount > 0 && (
                <span className="text-amber-600 block mt-1">
                  Warning: You still have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Review Answers</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSubmission}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Test;