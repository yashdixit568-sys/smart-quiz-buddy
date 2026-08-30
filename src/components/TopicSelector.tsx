import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Layers,
  Cpu,
  Code,
  Network,
  CheckSquare,
  Square,
  Clock,
  Gauge,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { isGuestUser, saveLocalGuestTest, TestRecord } from "@/lib/quizUtils";
import { SUBJECT_TOPICS, SubjectTopicMap } from "@/lib/fallbackQuestions";

interface TopicSelectorProps {
  userId: string;
}

export type QuizType = "mixed" | "mcq" | "coding";
export type DifficultyLevel = "Easy" | "Medium" | "Hard" | "Mixed";

const TIMER_PRESETS = [10, 20, 30, 45, 60, 90];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Core CS":
      return <Layers className="w-4 h-4 text-blue-600" />;
    case "Systems":
      return <Cpu className="w-4 h-4 text-purple-600" />;
    case "Programming":
      return <Code className="w-4 h-4 text-emerald-600" />;
    case "Design":
      return <Network className="w-4 h-4 text-amber-600" />;
    default:
      return <BookOpen className="w-4 h-4 text-blue-600" />;
  }
};

const TopicSelector = ({ userId }: TopicSelectorProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // 1. Quiz Type State
  const [quizType, setQuizType] = useState<QuizType>("mixed");

  // 2. Multi-Subject Selection State
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "Data Structures",
    "Algorithms",
  ]);

  // 3. Sub-Topics Selection State: Record<SubjectName, SubTopicName[]>
  const [selectedTopics, setSelectedTopics] = useState<Record<string, string[]>>({});

  // 4. Difficulty State
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Mixed");

  // 5. Question Counts State
  const [numMcqs, setNumMcqs] = useState<number>(5);
  const [numCoding, setNumCoding] = useState<number>(1);

  // 6. Timer Configuration State
  const [timerMode, setTimerMode] = useState<"preset" | "custom">("preset");
  const [presetDuration, setPresetDuration] = useState<number>(30);
  const [customDurationInput, setCustomDurationInput] = useState<string>("15");

  // General UI State
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Synchronize question counts when Quiz Type changes
  useEffect(() => {
    if (quizType === "mcq") {
      if (numMcqs === 0) setNumMcqs(5);
      setNumCoding(0);
    } else if (quizType === "coding") {
      setNumMcqs(0);
      if (numCoding === 0) setNumCoding(2);
    } else if (quizType === "mixed") {
      if (numMcqs === 0) setNumMcqs(5);
      if (numCoding === 0) setNumCoding(1);
    }
  }, [quizType, numMcqs, numCoding]);

  // Subject Selection Toggles
  const toggleSubject = (subjectName: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectName)) {
        const next = prev.filter((s) => s !== subjectName);
        // Clean up topic selection for deselected subject
        const nextTopics = { ...selectedTopics };
        delete nextTopics[subjectName];
        setSelectedTopics(nextTopics);
        return next;
      } else {
        return [...prev, subjectName];
      }
    });
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjects(SUBJECT_TOPICS.map((s) => s.subjectName));
  };

  const handleClearSubjects = () => {
    setSelectedSubjects([]);
    setSelectedTopics({});
  };

  // Sub-Topic Selection Toggles
  const toggleSubTopic = (subjectName: string, subTopicName: string) => {
    setSelectedTopics((prev) => {
      const currentList = prev[subjectName] || [];
      const updatedList = currentList.includes(subTopicName)
        ? currentList.filter((t) => t !== subTopicName)
        : [...currentList, subTopicName];

      return {
        ...prev,
        [subjectName]: updatedList,
      };
    });
  };

  const handleSelectAllTopicsForSubject = (subjectName: string, allSubTopics: string[]) => {
    setSelectedTopics((prev) => ({
      ...prev,
      [subjectName]: [...allSubTopics],
    }));
  };

  const handleClearTopicsForSubject = (subjectName: string) => {
    setSelectedTopics((prev) => {
      const next = { ...prev };
      delete next[subjectName];
      return next;
    });
  };

  // Get active final duration in minutes
  const getFinalDurationMinutes = (): number | null => {
    if (timerMode === "preset") {
      return presetDuration;
    }
    const parsed = parseInt(customDurationInput.trim(), 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 300) {
      return null;
    }
    return parsed;
  };

  // Start Assessment Handler with strict validation
  const handleStartTest = async () => {
    // Validation 1: Subject Selection
    if (selectedSubjects.length === 0) {
      toast({
        title: "Subject Required",
        description: "Please select at least one subject area to continue",
        variant: "destructive",
      });
      return;
    }

    // Validation 2: Question Count
    if (numMcqs === 0 && numCoding === 0) {
      toast({
        title: "Question Count Invalid",
        description: "Please specify at least 1 MCQ or 1 Coding question",
        variant: "destructive",
      });
      return;
    }

    // Validation 3: Timer Validation
    const durationMinutes = getFinalDurationMinutes();
    if (durationMinutes === null) {
      toast({
        title: "Invalid Test Duration",
        description: "Custom duration must be a valid number of minutes between 1 and 300",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const primarySubject = selectedSubjects[0];
      const primaryTopicObj = SUBJECT_TOPICS.find((s) => s.subjectName === primarySubject) || SUBJECT_TOPICS[0];

      const testConfig = {
        selected_subjects: selectedSubjects,
        selected_topics: selectedTopics,
        difficulty,
        duration_minutes: durationMinutes,
        quiz_type: quizType,
      };

      // GUEST / DEMO MODE
      if (isGuestUser(userId)) {
        const guestTestId = `test-${Date.now()}`;
        const newTest: TestRecord = {
          id: guestTestId,
          user_id: userId,
          topic_id: primaryTopicObj.subjectId,
          num_mcqs: numMcqs,
          num_coding: numCoding,
          status: "in_progress",
          created_at: new Date().toISOString(),
          topics: {
            id: primaryTopicObj.subjectId,
            name: selectedSubjects.length === 1 ? selectedSubjects[0] : `${selectedSubjects.length} Core Subjects`,
          },
          ...testConfig,
        };
        saveLocalGuestTest(newTest);
        navigate(`/test/${guestTestId}`, { state: { testConfig } });
        return;
      }

      // LOGGED-IN SUPABASE USER
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          user_id: userId,
          topic_id: primaryTopicObj.subjectId,
          num_mcqs: numMcqs,
          num_coding: numCoding,
          status: "in_progress",
        })
        .select()
        .single();

      if (testError || !testData) {
        // Fallback to local guest test if insert fails
        const fallbackTestId = `test-${Date.now()}`;
        const newTest: TestRecord = {
          id: fallbackTestId,
          user_id: userId,
          topic_id: primaryTopicObj.subjectId,
          num_mcqs: numMcqs,
          num_coding: numCoding,
          status: "in_progress",
          created_at: new Date().toISOString(),
          topics: {
            id: primaryTopicObj.subjectId,
            name: selectedSubjects.length === 1 ? selectedSubjects[0] : `${selectedSubjects.length} Core Subjects`,
          },
          ...testConfig,
        };
        saveLocalGuestTest(newTest);
        navigate(`/test/${fallbackTestId}`, { state: { testConfig } });
        return;
      }

      navigate(`/test/${testData.id}`, { state: { testConfig } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create assessment session";
      toast({
        title: "Execution Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(SUBJECT_TOPICS.map((s) => s.category)))];
  const filteredSubjects =
    activeCategory === "All" ? SUBJECT_TOPICS : SUBJECT_TOPICS.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* HEADER WIZARD BAR */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mock Test Customization Engine</h2>
        </div>
        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
          7-Step Guided Setup
        </Badge>
      </div>

      {/* STEP 1: QUIZ TYPE SELECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Step 1: Choose Assessment Format
          </Label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "mixed", label: "Mixed (MCQ + Coding)", desc: "Comprehensive theoretical & implementation test", icon: <Sparkles className="w-4 h-4 text-blue-600" /> },
            { id: "mcq", label: "MCQ Only", desc: "Fast-paced conceptual & core knowledge check", icon: <BookOpen className="w-4 h-4 text-purple-600" /> },
            { id: "coding", label: "Coding Only", desc: "Hands-on algorithmic problem solving", icon: <Code className="w-4 h-4 text-emerald-600" /> },
          ].map((type) => {
            const isSelected = quizType === type.id;
            return (
              <Card
                key={type.id}
                onClick={() => setQuizType(type.id as QuizType)}
                className={`cursor-pointer transition-all border p-4 select-none ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-600"
                    : "border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {type.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{type.label}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{type.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* STEP 2: MULTI-SUBJECT SELECTION */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Step 2: Select Subjects ({selectedSubjects.length} Selected)
            </Label>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select one, multiple, or all subjects. Questions will be balanced across selections.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllSubjects}
              className="text-xs h-7 gap-1 border-slate-200 dark:border-slate-800"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSubjects}
              className="text-xs h-7 gap-1 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            >
              <Square className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                activeCategory === category
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {filteredSubjects.map((subject) => {
            const isSelected = selectedSubjects.includes(subject.subjectName);
            return (
              <Card
                key={subject.subjectId}
                onClick={() => toggleSubject(subject.subjectName)}
                className={`cursor-pointer transition-all border relative select-none p-3.5 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-600"
                    : "border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      {getCategoryIcon(subject.category)}
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSubject(subject.subjectName)}
                      className="mt-1 data-[state=checked]:bg-blue-600 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{subject.subjectName}</h4>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {subject.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-0.5">{subject.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* STEP 3: GRANULAR SUB-TOPIC SELECTION PER SUBJECT */}
      {selectedSubjects.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Step 3: Choose Sub-Topics (Optional)
            </Label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select specific topics inside your chosen subjects. Leaving a subject's topics unchecked defaults to <strong>all topics of that subject</strong>.
            </p>
          </div>

          <Accordion type="multiple" defaultValue={selectedSubjects} className="w-full space-y-2">
            {selectedSubjects.map((subjectName) => {
              const subjObj = SUBJECT_TOPICS.find((s) => s.subjectName === subjectName);
              if (!subjObj) return null;

              const activeSubTopics = selectedTopics[subjectName] || [];
              const isAllSelected = activeSubTopics.length === subjObj.topics.length && subjObj.topics.length > 0;

              return (
                <AccordionItem
                  key={subjObj.subjectId}
                  value={subjectName}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{subjectName}</span>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          {activeSubTopics.length === 0
                            ? "All Sub-Topics Active"
                            : `${activeSubTopics.length} / ${subjObj.topics.length} Selected`}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Available Core Topics:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllTopicsForSubject(subjectName, subjObj.topics)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium"
                        >
                          Select All Topics
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => handleClearTopicsForSubject(subjectName)}
                          className="text-slate-500 dark:text-slate-400 hover:underline text-[11px]"
                        >
                          Reset to All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {subjObj.topics.map((topicName) => {
                        const isChecked = activeSubTopics.includes(topicName);
                        return (
                          <div
                            key={topicName}
                            onClick={() => toggleSubTopic(subjectName, topicName)}
                            className={`flex items-center space-x-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                              isChecked
                                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-medium"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleSubTopic(subjectName, topicName)}
                              className="data-[state=checked]:bg-blue-600 border-slate-300 dark:border-slate-700"
                            />
                            <span className="text-xs">{topicName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* STEP 4: DIFFICULTY SELECTION FOR CODING & MCQs */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-blue-600" />
            Step 4: Select Target Difficulty
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Controls the complexity of coding challenges and technical MCQs.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: "Easy", label: "Easy", desc: "Foundational & direct concepts", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { id: "Medium", label: "Medium", desc: "Interview-standard problems", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
            { id: "Hard", label: "Hard", desc: "Advanced edge cases & optimizations", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
            { id: "Mixed", label: "Mixed", desc: "Balanced blend across all levels", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
          ].map((level) => {
            const isSelected = difficulty === level.id;
            return (
              <Card
                key={level.id}
                onClick={() => setDifficulty(level.id as DifficultyLevel)}
                className={`cursor-pointer transition-all border p-3 select-none text-center ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-600"
                    : "border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{level.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-left line-clamp-1">{level.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* STEP 5: QUESTION COUNT CONFIGURATION */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Step 5: Number of Questions
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(quizType === "mixed" || quizType === "mcq") && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mcqs" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Multiple Choice Questions (MCQs)
                </Label>
                <Badge variant="outline" className="font-mono text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {numMcqs} Questions
                </Badge>
              </div>
              <Input
                id="mcqs"
                type="number"
                min="0"
                max="20"
                value={numMcqs}
                onChange={(e) => setNumMcqs(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Conceptual knowledge check across selected subjects</p>
            </div>
          )}

          {(quizType === "mixed" || quizType === "coding") && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="coding" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Coding Challenges
                </Label>
                <Badge variant="outline" className="font-mono text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {numCoding} Questions
                </Badge>
              </div>
              <Input
                id="coding"
                type="number"
                min="0"
                max="5"
                value={numCoding}
                onChange={(e) => setNumCoding(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Practical implementation & problem-solving challenges</p>
            </div>
          )}
        </div>
      </div>

      {/* STEP 6: TIMER CONFIGURATION */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            Step 6: Set Test Duration
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A live countdown timer will run during the test and automatically submit when time reaches 00:00.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TIMER_PRESETS.map((mins) => {
              const isSelected = timerMode === "preset" && presetDuration === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setTimerMode("preset");
                    setPresetDuration(mins);
                  }}
                  className={`text-xs px-3.5 py-2 rounded-lg font-medium transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {mins} Minutes
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setTimerMode("custom")}
              className={`text-xs px-3.5 py-2 rounded-lg font-medium transition-all ${
                timerMode === "custom"
                  ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              Custom Duration
            </button>
          </div>

          {timerMode === "custom" && (
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-2 max-w-xs">
              <Label htmlFor="custom-mins" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Enter Minutes (1 to 300):
              </Label>
              <Input
                id="custom-mins"
                type="number"
                min="1"
                max="300"
                value={customDurationInput}
                onChange={(e) => setCustomDurationInput(e.target.value)}
                placeholder="e.g. 15"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Will auto-submit test after {customDurationInput || "0"} minutes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* STEP 7: START ASSESSMENT ACTION */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          onClick={handleStartTest}
          disabled={loading || selectedSubjects.length === 0}
          className="w-full h-13 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all text-base gap-2 rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initialising Assessment Environment...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Start Mock Test ({selectedSubjects.length} Subjects • {numMcqs} MCQs + {numCoding} Coding • {getFinalDurationMinutes() || 30} Mins)
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TopicSelector;