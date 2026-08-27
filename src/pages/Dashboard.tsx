import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Award, Play, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import TopicSelector from "@/components/TopicSelector";
import ProgressOverview, { ProgressData } from "@/components/ProgressOverview";
import { getStoredGuestUser, isGuestUser, getLocalGuestTests, TestRecord } from "@/lib/quizUtils";

interface ActiveUser {
  id: string;
  email?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<ActiveUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTests, setRecentTests] = useState<TestRecord[]>([]);
  const [overallStats, setOverallStats] = useState({
    testsCount: 0,
    avgAccuracy: 0,
    totalQuestions: 0,
  });

  const loadRecentTests = useCallback(async (currentUserId: string) => {
    try {
      if (isGuestUser(currentUserId)) {
        const tests = getLocalGuestTests(currentUserId);
        setRecentTests(tests.slice(0, 5));
        return;
      }

      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          topics:topic_id (name)
        `)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        const local = getLocalGuestTests(currentUserId);
        setRecentTests(local.slice(0, 5));
      } else {
        interface RawTestData {
          id: string;
          user_id: string;
          topic_id: string;
          num_mcqs: number;
          num_coding: number;
          status: string;
          created_at: string;
          completed_at?: string;
          topics?: { name: string } | null;
        }

        const rawList = (data || []) as unknown as RawTestData[];

        const mapped: TestRecord[] = rawList.map((t) => ({
          id: t.id,
          user_id: t.user_id,
          topic_id: t.topic_id,
          num_mcqs: t.num_mcqs,
          num_coding: t.num_coding,
          status: t.status === "completed" ? "completed" : "in_progress",
          created_at: t.created_at,
          completed_at: t.completed_at,
          topics: {
            name: t.topics?.name || "General CS",
          },
        }));
        setRecentTests(mapped);
      }
    } catch {
      const local = getLocalGuestTests(currentUserId);
      setRecentTests(local.slice(0, 5));
    }
  }, []);

  useEffect(() => {
    // Check Guest session first
    const guest = getStoredGuestUser();
    if (guest) {
      setUser({ id: guest.id, email: guest.email });
      loadRecentTests(guest.id);
      setLoading(false);
      return;
    }

    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser({ id: session.user.id, email: session.user.email });
        loadRecentTests(session.user.id);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session && !getStoredGuestUser()) {
        navigate("/auth");
      } else if (session) {
        setUser({ id: session.user.id, email: session.user.email });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loadRecentTests]);

  const handleProgressLoaded = (data: ProgressData[]) => {
    if (!data || data.length === 0) return;
    const totalTests = data.reduce((sum, item) => sum + item.tests_taken, 0);
    const totalQ = data.reduce((sum, item) => sum + item.total_questions, 0);
    const totalC = data.reduce((sum, item) => sum + item.correct_answers, 0);
    const avg = totalQ > 0 ? (totalC / totalQ) * 100 : 0;

    setOverallStats({
      testsCount: totalTests,
      avgAccuracy: Math.round(avg),
      totalQuestions: totalQ,
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-blue-600"></div>
          <p className="text-xs text-slate-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar userEmail={user.email} userId={user.id} />

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 flex-1 space-y-8 max-w-6xl">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Mock Test Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select technical domains, run AI assessments, and master software engineering interviews.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 py-1.5 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 inline-block"></span>
              Question Engine Online
            </Badge>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-slate-200/80 bg-white shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Tests Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {overallStats.testsCount || recentTests.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {overallStats.testsCount > 0 ? "Completed mock sessions" : "Take your first test below"}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 bg-white shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Average Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {overallStats.avgAccuracy}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {overallStats.avgAccuracy >= 75 ? "Excellent retention rate" : "Target: 80%+ for interviews"}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 bg-white shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Questions Solved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {overallStats.totalQuestions}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total MCQs & coding challenges</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Analytics */}
        <ProgressOverview userId={user.id} onProgressLoaded={handleProgressLoaded} />

        {/* Recent Tests Table (if any) */}
        {recentTests.length > 0 && (
          <Card className="border border-slate-200/80 bg-white shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Recent Assessments</CardTitle>
                  <CardDescription>Review questions, answers, and improvement advice</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-white border-slate-200">History</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {recentTests.map((t) => {
                  const isCompleted = t.status === "completed";
                  const dateStr = new Date(t.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {t.topics?.name || "Mock Assessment"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-normal ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isCompleted ? "Completed" : "In Progress"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </span>
                          <span>•</span>
                          <span>{t.num_mcqs} MCQs + {t.num_coding} Coding</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        className={`gap-1.5 text-xs h-8 ${
                          !isCompleted ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-200"
                        }`}
                        onClick={() => navigate(isCompleted ? `/results/${t.id}` : `/test/${t.id}`)}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Review Results
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Continue Test
                          </>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Selector - Create New Test */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Create New Assessment</CardTitle>
            <CardDescription>
              Select your target subject and configure question volume to test your skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopicSelector userId={user.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;