import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Code2, Terminal, HelpCircle, Check } from "lucide-react";

interface CodingQuestionProps {
  question: {
    question_text: string;
    difficulty?: string;
    example_input?: string;
    example_output?: string;
    constraints?: string;
    code_submission: string;
    language?: string;
  };
  onCodeChange: (code: string, language?: string) => void;
}

const STARTER_CODE: Record<string, string> = {
  python: `# Write your Python solution below\ndef solution():\n    # TODO: Implement solution\n    pass\n`,
  javascript: `// Write your JavaScript solution below\nfunction solution() {\n    // TODO: Implement solution\n}\n`,
  typescript: `// Write your TypeScript solution below\nfunction solution(): void {\n    // TODO: Implement solution\n}\n`,
  java: `// Write your Java solution below\npublic class Solution {\n    public static void main(String[] args) {\n        // TODO: Implement solution\n    }\n}\n`,
  cpp: `// Write your C++ solution below\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // TODO: Implement solution\n    return 0;\n}\n`,
  c: `// Write your C solution below\n#include <stdio.h>\n\nint main() {\n    // TODO: Implement solution\n    return 0;\n}\n`,
  go: `// Write your Go solution below\npackage main\n\nimport "fmt"\n\nfunc main() {\n    // TODO: Implement solution\n}\n`,
  rust: `// Write your Rust solution below\nfn main() {\n    // TODO: Implement solution\n}\n`,
};

const CodingQuestion = ({ question, onCodeChange }: CodingQuestionProps) => {
  const [language, setLanguage] = useState(question.language || "python");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial code if empty
  useEffect(() => {
    if (!question.code_submission) {
      const template = STARTER_CODE[language] || STARTER_CODE.python;
      onCodeChange(template, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle language switch
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // If current code is empty or matches previous starter code, load new starter code
    const isStarterOrEmpty =
      !question.code_submission ||
      Object.values(STARTER_CODE).some((starter) => starter.trim() === question.code_submission.trim());
    
    if (isStarterOrEmpty) {
      const newTemplate = STARTER_CODE[newLang] || "";
      onCodeChange(newTemplate, newLang);
    } else {
      onCodeChange(question.code_submission, newLang);
    }
  };

  // Handle Tab key for indentation inside code editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      const spaces = "    "; // 4 spaces

      const newValue = currentValue.substring(0, start) + spaces + currentValue.substring(end);
      onCodeChange(newValue, language);

      // Re-position cursor after inserted spaces
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + spaces.length;
          textareaRef.current.selectionEnd = start + spaces.length;
        }
      }, 0);
    }
  };

  const getDifficultyBadge = (diff?: string) => {
    const d = (diff || "medium").toLowerCase();
    if (d === "easy") {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Easy</Badge>;
    }
    if (d === "hard") {
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Hard</Badge>;
    }
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Medium</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Problem Statement Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600" />
            Problem Statement
          </h3>
          {getDifficultyBadge(question.difficulty)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
            {question.question_text}
          </p>
        </div>
      </div>

      {/* Examples & Constraints */}
      {(question.example_input || question.example_output || question.constraints) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.example_input && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wider">Example Input:</h4>
              <pre className="text-xs bg-white border border-slate-200 p-2.5 rounded-lg font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                {question.example_input}
              </pre>
            </div>
          )}

          {question.example_output && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wider">Example Output:</h4>
              <pre className="text-xs bg-white border border-slate-200 p-2.5 rounded-lg font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                {question.example_output}
              </pre>
            </div>
          )}

          {question.constraints && (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-sm">
              <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Constraints:
              </h4>
              <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                {question.constraints}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Editor Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
          <Label htmlFor="code-editor" className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Code2 className="w-4 h-4 text-blue-600" />
            Code Editor
          </Label>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Press Tab to indent</span>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="c">C</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea
          id="code-editor"
          ref={textareaRef}
          placeholder="Write your solution here..."
          value={question.code_submission}
          onChange={(e) => onCodeChange(e.target.value, language)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="min-h-[380px] font-mono text-sm leading-relaxed rounded-b-xl rounded-t-none border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 selection:bg-blue-100 p-4"
        />

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <Check className="w-3.5 h-3.5" /> Auto-saved
          </span>
          <span>{question.code_submission?.length || 0} characters</span>
        </div>
      </div>
    </div>
  );
};

export default CodingQuestion;