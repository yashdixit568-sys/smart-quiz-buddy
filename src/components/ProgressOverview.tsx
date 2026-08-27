import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, CheckCircle } from "lucide-react";
import { isGuestUser, getLocalGuestProgress } from "@/lib/quizUtils";

export interface ProgressData {
  topic_name: string;
  tests_taken: number;
  accuracy: number;
  total_questions: number;
  correct_answers: number;
}

interface ProgressOverviewProps {
  userId: string;
  onProgressLoaded?: (data: ProgressData[]) => void;
}

const ProgressOverview = ({ userId, onProgressLoaded }: ProgressOverviewProps) => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      if (isGuestUser(userId)) {
        const local = getLocalGuestProgress(userId);
        const formatted: ProgressData[] = local.map((item) => ({
          topic_name: item.topics?.name || "General CS",
          tests_taken: item.tests_taken,
          accuracy: item.accuracy,
          total_questions: item.total_questions,
          correct_answers: item.correct_answers,
        }));
        setProgressData(formatted);
        if (onProgressLoaded) onProgressLoaded(formatted);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_progress")
        .select(`
          *,
          topics:topic_id (name)
        `)
        .eq("user_id", userId)
        .order("tests_taken", { ascending: false });

      if (error) throw error;

      interface SupabaseProgressItem {
        topics?: { name: string } | null;
        tests_taken: number;
        accuracy: number;
        total_questions: number;
        correct_answers: number;
      }

      const rawItems = (data || []) as unknown as SupabaseProgressItem[];

      const formatted: ProgressData[] = rawItems.map((item) => ({
        topic_name: item.topics?.name || "General CS",
        tests_taken: item.tests_taken,
        accuracy: item.accuracy,
        total_questions: item.total_questions,
        correct_answers: item.correct_answers,
      }));

      setProgressData(formatted);
      if (onProgressLoaded) onProgressLoaded(formatted);
    } catch {
      // If table query fails, check local guest progress
      const local = getLocalGuestProgress(userId);
      const formatted: ProgressData[] = local.map((item) => ({
        topic_name: item.topics?.name || "General CS",
        tests_taken: item.tests_taken,
        accuracy: item.accuracy,
        total_questions: item.total_questions,
        correct_answers: item.correct_answers,
      }));
      setProgressData(formatted);
      if (onProgressLoaded) onProgressLoaded(formatted);
    } finally {
      setLoading(false);
    }
  }, [userId, onProgressLoaded]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <Card className="border-slate-200/80 shadow-card">
        <CardContent className="py-8 text-center text-slate-500 text-sm">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  if (progressData.length === 0) {
    return (
      <Card className="border-slate-200/80 shadow-card bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base font-semibold text-slate-900">Your Learning Analytics</CardTitle>
          </div>
          <CardDescription>Topic-by-topic retention and accuracy tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">No Tests Completed Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select a topic below and take your first mock test to unlock accuracy curves and personalized study recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-card bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Performance By Subject</CardTitle>
              <CardDescription>Accuracy and mastery breakdown across tested domains</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 text-xs">
            {progressData.length} Subjects Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {progressData.map((progress, index) => {
          const accuracy = Math.round(progress.accuracy);
          const isHigh = accuracy >= 80;
          const isMedium = accuracy >= 50 && accuracy < 80;

          return (
            <div key={index} className="space-y-2 p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">{progress.topic_name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium ${
                      isHigh
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isMedium
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {accuracy}% Mastery
                  </Badge>
                </div>
                <span className="text-xs text-slate-500">
                  {progress.tests_taken} {progress.tests_taken === 1 ? "Test" : "Tests"} Taken
                </span>
              </div>

              <Progress value={progress.accuracy} className="h-2 bg-slate-200" />

              <div className="flex justify-between items-center text-xs text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  {progress.correct_answers} of {progress.total_questions} questions correct
                </span>
                <span className="font-mono font-medium text-slate-700">
                  {progress.accuracy.toFixed(1)}% Accuracy
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ProgressOverview;