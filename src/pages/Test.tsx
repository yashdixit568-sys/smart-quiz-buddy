import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getBalancedQuestionsForConfig, getFallbackQuestionsForTopic } from "@/lib/fallbackQuestions";

const Test = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [test, setTest] = useState<TestRecord | null>(null);
  const [questions, setQuestions] = useState<TestQuestionRecord[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const autoSubmittedRef = useRef(false);
  const executeSubmissionRef = useRef<(isAutoSubmitted?: boolean) => Promise<void>>(() => Promise.resolve());

  // Auth & Session Setup
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

  // Persistent Timer Engine Setup
  const durationMinutes = useMemo(() => {
    return (
      test?.duration_minutes ||
      location.state?.testConfig?.duration_minutes ||
      30
    );
  }, [test, location.state]);

  const totalTargetSeconds = useMemo(() => durationMinutes * 60, [durationMinutes]);

  useEffect(() => {
    if (!testId || loading || generating || submitting) return;

    const timerStorageKey = `sqb_test_start_${testId}`;
    let startMs = parseInt(localStorage.getItem(timerStorageKey) || "0", 10);
    if (!startMs || isNaN(startMs)) {
      startMs = Date.now();
      localStorage.setItem(timerStorageKey, startMs.toString());
    }

    const timer = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startMs) / 1000);
      const remainingSec = Math.max(0, totalTargetSeconds - elapsedSec);
      setRemainingSeconds(remainingSec);

      if (remainingSec === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        clearInterval(timer);
        toast({
          title: "Time's Up!",
          description: "Your test duration has expired. Automatically submitting your assessment...",
          variant: "destructive",
        });
        executeSubmissionRef.current(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [testId, totalTargetSeconds, loading, generating, submitting, toast]);

  const formatTimer = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Question Generation & Synchronization
  const generateAndStoreQuestions = useCallback(
    async (testData: TestRecord, topicName: string) => {
      setGenerating(true);
      try {
        const passedConfig = location.state?.testConfig || {};
        const selectedSubjects: string[] = testData.selected_subjects || passedConfig.selected_subjects || [topicName];
        const selectedTopics: Record<string, string[]> = testData.selected_topics || passedConfig.selected_topics || {};
        const difficulty: string = testData.difficulty || passedConfig.difficulty || "Mixed";

        let mcqs: Array<{ question: string; options: string[]; correct: string; topic?: string; explanation?: string; subject?: string }> = [];
        let codings: Array<{
          question: string;
          difficulty: string;
          example_input: string;
          example_output: string;
          constraints: string;
          topic?: string;
          explanation?: string;
          subject?: string;
        }> = [];

        // 1. Attempt AI Edge Function generation
        try {
          const { data, error } = await supabase.functions.invoke("generate-questions", {
            body: {
              topicName,
              selectedSubjects,
              selectedTopics,
              difficulty,
              numMcqs: testData.num_mcqs,
              numCoding: testData.num_coding,
            },
          });

          if (!error && data && (data.mcqQuestions?.length > 0 || data.codingQuestions?.length > 0)) {
            mcqs = data.mcqQuestions || [];
            codings = data.codingQuestions || [];
          }
        } catch {
          // Fallback to local generator
        }

        // 2. Fallback if AI response was empty or offline
        if (mcqs.length === 0 && codings.length === 0) {
          const fallback = getBalancedQuestionsForConfig({
            selectedSubjects,
            selectedTopics,
            difficulty,
            numMcqs: testData.num_mcqs,
            numCoding: testData.num_coding,
          });
          mcqs = fallback.mcqQuestions;
          codings = fallback.codingQuestions;
        }

        // 3. Build standardized question objects with explanations
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
              subject: q.subject || selectedSubjects[idx % selectedSubjects.length] || topicName,
              topic: q.topic || "Core Concepts",
              explanation: q.explanation || "Review fundamental properties and core rules for this topic.",
              difficulty: "Medium",
            };
          }),
          ...codings.map((q, idx) => ({
            id: `coding-${Date.now()}-${idx}`,
            test_id: testData.id,
            question_type: "coding" as const,
            question_text: q.question,
            difficulty: q.difficulty || difficulty || "medium",
            example_input: q.example_input || "",
            example_output: q.example_output || "",
            constraints: q.constraints || "",
            code_submission: "",
            language: "python",
            is_correct: null,
            subject: q.subject || selectedSubjects[idx % selectedSubjects.length] || topicName,
            topic: q.topic || "Algorithmic Logic",
            explanation: q.explanation || "Optimize your solution using dynamic programming, hash maps, or two-pointer techniques.",
          })),
        ];

        // Store questions locally or in Supabase
        if (isGuestUser(testData.user_id)) {
          saveLocalGuestQuestions(standardized);
        } else {
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
          title: "Notice",
          description: `${msg}. Using curated offline interview set.`,
        });
        const fallback = getBalancedQuestionsForConfig({
          selectedSubjects: [topicName],
          numMcqs: testData.num_mcqs,
          numCoding: testData.num_coding,
        });
        const fallbackList: TestQuestionRecord[] = fallback.mcqQuestions.map((q, idx) => ({
          id: `fallback-mcq-${idx}`,
          test_id: testData.id,
          question_type: "mcq",
          question_text: q.question,
          options: q.options,
          correct_answer: q.correct,
          user_answer: null,
          subject: q.subject || topicName,
          topic: q.topic || "Core Concepts",
          explanation: q.explanation,
        }));
        setQuestions(fallbackList);
      } finally {
        setGenerating(false);
        setLoading(false);
      }
    },
    [location.state, toast]
  );

  const fetchTestAndQuestions = useCallback(async () => {
    if (!testId) return;
    setLoading(true);

    try {
      let currentTestData: TestRecord | null = null;
      let topicName = "Computer Science";

      // 1. Check Guest storage
      const guestTests = getLocalGuestTests();
      const matchedGuest = guestTests.find((t) => t.id === testId);

      if (matchedGuest) {
        currentTestData = matchedGuest;
        topicName = matchedGuest.topics?.name || "Computer Science";
      } else {
        // 2. Check Supabase
        const { data: testData, error: testError } = await supabase
          .from("tests")
          .select("*, topics(*)")
          .eq("id", testId)
          .single();

        if (!testError && testData) {
          currentTestData = testData as TestRecord;
          topicName = testData.topics?.name || "Computer Science";
        }
      }

      if (!currentTestData) {
        toast({
          title: "Test Not Found",
          description: "Could not find the specified mock test session.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTest(currentTestData);

      // Check existing saved questions
      let existingQuestions: TestQuestionRecord[] = [];
      if (isGuestUser(currentTestData.user_id)) {
        existingQuestions = getLocalGuestQuestions(testId);
      } else {
        const { data: qData } = await supabase
          .from("test_questions")
          .select("*")
          .eq("test_id", testId);
        if (qData) existingQuestions = qData as TestQuestionRecord[];
      }

      if (existingQuestions.length > 0) {
        setQuestions(existingQuestions);
        setLoading(false);
      } else {
        await generateAndStoreQuestions(currentTestData, topicName);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to initialize assessment.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [testId, navigate, toast, generateAndStoreQuestions]);

  useEffect(() => {
    fetchTestAndQuestions();
  }, [fetchTestAndQuestions]);

  // Option / Code Change Handlers
  const handleAnswerChange = (answer: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[currentQuestionIndex]) {
        updated[currentQuestionIndex] = {
          ...updated[currentQuestionIndex],
          user_answer: answer,
        };
      }
      return updated;
    });
  };

  const handleCodeChange = (code: string, language?: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[currentQuestionIndex]) {
        updated[currentQuestionIndex] = {
          ...updated[currentQuestionIndex],
          code_submission: code,
          language: language || updated[currentQuestionIndex].language || "python",
        };
      }
      return updated;
    });
  };

  // Execution Submission Handler
  const executeSubmission = useCallback(
    async (isAutoSubmitted = false) => {
      if (!test || !testId) return;
      setSubmitting(true);

      try {
        // Evaluate answers
        const updatedQuestions = questions.map((q) => {
          if (q.question_type === "mcq") {
            const userNorm = normalizeAnswerLetter(q.user_answer, q.options || []);
            const correctNorm = normalizeAnswerLetter(q.correct_answer, q.options || []);
            const isCorrect = userNorm !== "" && userNorm === correctNorm;
            return { ...q, user_answer: userNorm, is_correct: isCorrect };
          } else {
            const hasCode = Boolean(q.code_submission && q.code_submission.trim().length > 15);
            return { ...q, is_correct: hasCode };
          }
        });

        const now = new Date().toISOString();

        if (isGuestUser(test.user_id)) {
          saveLocalGuestQuestions(updatedQuestions);
          const updatedTest: TestRecord = {
            ...test,
            status: "completed",
            completed_at: now,
          };
          saveLocalGuestTest(updatedTest);
        } else {
          await supabase
            .from("tests")
            .update({ status: "completed", completed_at: now })
            .eq("id", testId);

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

        // Cleanup local timer timestamp
        localStorage.removeItem(`sqb_test_start_${testId}`);

        if (!isAutoSubmitted) {
          toast({
            title: "Test Submitted Successfully!",
            description: "Your answers have been evaluated. Inspect your score breakdown.",
          });
        }

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
    },
    [test, testId, questions, toast, navigate]
  );

  useEffect(() => {
    executeSubmissionRef.current = executeSubmission;
  }, [executeSubmission]);

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
      executeSubmission(false);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-8 shadow-sm flex flex-col items-center max-w-sm text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {generating ? "Synthesizing AI Questions" : "Initializing Assessment"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Curating interview-grade MCQs & coding challenges...
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-3/4"></div>
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
            We couldn't load questions for this test session. Return to dashboard and try again.
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
  const isUrgentTimer = remainingSeconds !== null && remainingSeconds < 300;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <Navbar userEmail={currentUser?.email} userId={currentUser?.id} />

      <div className="container mx-auto max-w-4xl py-6 px-4 flex-1 space-y-6">
        {/* TOP HEADER STATUS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="text-xs border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 gap-1.5 h-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Button>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                {test?.topics?.name || "Technical"} Assessment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Question {currentQuestionIndex + 1} of {questions.length} • {answeredCount} Answered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            {/* LIVE COUNTDOWN TIMER */}
            <Badge
              variant="outline"
              className={`font-mono text-xs px-3 py-1.5 flex items-center gap-1.5 transition-all ${
                isUrgentTimer
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isUrgentTimer ? "text-rose-600" : "text-blue-600"}`} />
              <span>{formatTimer(remainingSeconds)} Remaining</span>
            </Badge>

            <Button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Submit Test
                </>
              )}
            </Button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Overall Progress</span>
            <span className="font-semibold">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-slate-100 dark:bg-slate-800" />
        </div>

        {/* QUESTION METADATA STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {currentQuestion.subject && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                Subject: {currentQuestion.subject}
              </Badge>
            )}
            {currentQuestion.topic && (
              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs">
                Topic: {currentQuestion.topic}
              </Badge>
            )}
          </div>
          {currentQuestion.difficulty && (
            <Badge variant="outline" className="capitalize text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Difficulty: {currentQuestion.difficulty}
            </Badge>
          )}
        </div>

        {/* QUESTION PALETTE STRIP */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-card border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">Question Strip:</span>
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const isAnswered =
              q.question_type === "mcq"
                ? Boolean(q.user_answer)
                : Boolean(q.code_submission && q.code_submission.trim().length > 15);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all select-none ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                    : isAnswered
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* QUESTION CONTENT CARD */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-card shadow-card p-6">
          {currentQuestion.question_type === "mcq" ? (
            <MCQQuestion
              question={currentQuestion}
              onAnswerChange={handleAnswerChange}
            />
          ) : (
            <CodingQuestion
              question={currentQuestion}
              onCodeChange={handleCodeChange}
            />
          )}
        </Card>

        {/* NAVIGATION BOTTOM CONTROLS */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            className="text-xs border-slate-200 dark:border-slate-800 gap-1.5 h-10 px-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 text-xs gap-1.5 h-10 px-5"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-6 gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Finish & Review Results
            </Button>
          )}
        </div>
      </div>

      {/* CONFIRMATION SUBMIT DIALOG */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-card border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              You have <span className="font-semibold text-amber-600 dark:text-amber-400">{unansweredCount} unanswered</span> {unansweredCount === 1 ? "question" : "questions"} remaining. Are you sure you want to finalize your submission?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-slate-800">Continue Assessment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeSubmission(false)}
              className="bg-blue-600 text-white hover:bg-blue-700"
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