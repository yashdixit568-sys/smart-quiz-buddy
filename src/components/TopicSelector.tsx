import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, CheckCircle2, Sparkles, Layers, Cpu, Code, Network } from "lucide-react";
import { isGuestUser, saveLocalGuestTest, TestRecord } from "@/lib/quizUtils";

export interface Topic {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface TopicSelectorProps {
  userId: string;
}

const DEFAULT_TOPICS: Topic[] = [
  { id: "ds-1", name: "Data Structures", category: "Core CS", description: "Arrays, Linked Lists, Trees, Graphs, Hash Tables" },
  { id: "algo-2", name: "Algorithms", category: "Core CS", description: "Sorting, Searching, Dynamic Programming, Greedy" },
  { id: "oop-3", name: "Object-Oriented Programming", category: "Programming", description: "Classes, Inheritance, Polymorphism, Encapsulation" },
  { id: "db-4", name: "Database Management", category: "Systems", description: "SQL, Normalization, Transactions, Indexing" },
  { id: "os-5", name: "Operating Systems", category: "Systems", description: "Processes, Threads, Memory Management, Scheduling" },
  { id: "cn-6", name: "Computer Networks", category: "Systems", description: "TCP/IP, HTTP, DNS, Network Security" },
  { id: "web-7", name: "Web Development", category: "Programming", description: "HTML, CSS, JavaScript, React, APIs" },
  { id: "sd-8", name: "System Design", category: "Design", description: "Scalability, Load Balancing, Caching, Microservices" },
];

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
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [numMcqs, setNumMcqs] = useState<number>(5);
  const [numCoding, setNumCoding] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const fetchTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("category", { ascending: true });

      if (error || !data || data.length === 0) {
        setTopics(DEFAULT_TOPICS);
        setSelectedTopic(DEFAULT_TOPICS[0].id);
      } else {
        setTopics(data);
        if (data.length > 0) setSelectedTopic(data[0].id);
      }
    } catch {
      setTopics(DEFAULT_TOPICS);
      setSelectedTopic(DEFAULT_TOPICS[0].id);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleStartTest = async () => {
    if (!selectedTopic) {
      toast({
        title: "Select a topic",
        description: "Please choose a topic to continue",
        variant: "destructive",
      });
      return;
    }

    if (numMcqs === 0 && numCoding === 0) {
      toast({
        title: "Add questions",
        description: "Please select at least 1 MCQ or 1 Coding question",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const currentTopicObj = topics.find((t) => t.id === selectedTopic) || DEFAULT_TOPICS[0];

      // GUEST / DEMO MODE
      if (isGuestUser(userId)) {
        const guestTestId = `test-${Date.now()}`;
        const newTest: TestRecord = {
          id: guestTestId,
          user_id: userId,
          topic_id: selectedTopic,
          num_mcqs: numMcqs,
          num_coding: numCoding,
          status: "in_progress",
          created_at: new Date().toISOString(),
          topics: {
            id: currentTopicObj.id,
            name: currentTopicObj.name,
          },
        };
        saveLocalGuestTest(newTest);
        navigate(`/test/${guestTestId}`);
        return;
      }

      // SUPABASE LOGGED-IN USER
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          user_id: userId,
          topic_id: selectedTopic,
          num_mcqs: numMcqs,
          num_coding: numCoding,
          status: "in_progress",
        })
        .select()
        .single();

      if (testError) {
        // Fallback to local guest test if supabase insert fails (e.g., RLS issue)
        const fallbackTestId = `test-${Date.now()}`;
        const newTest: TestRecord = {
          id: fallbackTestId,
          user_id: userId,
          topic_id: selectedTopic,
          num_mcqs: numMcqs,
          num_coding: numCoding,
          status: "in_progress",
          created_at: new Date().toISOString(),
          topics: {
            id: currentTopicObj.id,
            name: currentTopicObj.name,
          },
        };
        saveLocalGuestTest(newTest);
        navigate(`/test/${fallbackTestId}`);
        return;
      }

      navigate(`/test/${testData.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create test";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(topics.map((t) => t.category)))];
  const filteredTopics =
    activeCategory === "All" ? topics : topics.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Category Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            1. Select Subject Area
          </Label>
          <span className="text-xs text-slate-500">{filteredTopics.length} topics available</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeCategory === category
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {filteredTopics.map((topic) => {
            const isSelected = selectedTopic === topic.id;
            return (
              <Card
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`cursor-pointer transition-all duration-150 border relative select-none ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                      {getCategoryIcon(topic.category)}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{topic.name}</h4>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 font-normal bg-white border-slate-200 text-slate-600">
                      {topic.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 pt-1">{topic.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Test Customization */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <Label className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
          2. Customize Test Format
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mcqs" className="text-sm font-medium text-slate-800">
                Multiple Choice Questions
              </Label>
              <Badge variant="outline" className="font-mono text-xs font-semibold bg-white text-slate-800">
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
              className="bg-white border-slate-200"
            />
            <p className="text-xs text-slate-500">Conceptual and theoretical knowledge check</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="coding" className="text-sm font-medium text-slate-800">
                Coding Challenges
              </Label>
              <Badge variant="outline" className="font-mono text-xs font-semibold bg-white text-slate-800">
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
              className="bg-white border-slate-200"
            />
            <p className="text-xs text-slate-500">Practical algorithmic and problem solving test</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={handleStartTest}
        disabled={loading || !selectedTopic}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all text-base gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Initializing Mock Test...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Start Assessment ({numMcqs} MCQs + {numCoding} Coding)
          </>
        )}
      </Button>
    </div>
  );
};

export default TopicSelector;