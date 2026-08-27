import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cleanOptionText } from "@/lib/quizUtils";

interface MCQQuestionProps {
  question: {
    question_text: string;
    options: string[];
    user_answer: string | null;
  };
  onAnswerChange: (value: string) => void;
}

const MCQQuestion = ({ question, onAnswerChange }: MCQQuestionProps) => {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-900">
          {question.question_text}
        </p>
      </div>

      <RadioGroup
        value={question.user_answer || ""}
        onValueChange={onAnswerChange}
        className="space-y-3"
      >
        {(question.options || []).map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index);
          const isSelected = question.user_answer === optionLetter;
          const cleanedText = cleanOptionText(option);

          return (
            <div
              key={index}
              onClick={() => onAnswerChange(optionLetter)}
              className={`flex items-start space-x-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? "border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <RadioGroupItem
                value={optionLetter}
                id={`option-${index}`}
                className="mt-0.5 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <Label
                htmlFor={`option-${index}`}
                className="flex-1 cursor-pointer font-normal text-slate-800 text-sm sm:text-base leading-relaxed"
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold mr-2.5 transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 shadow-sm"
                  }`}
                >
                  {optionLetter}
                </span>
                {cleanedText}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default MCQQuestion;