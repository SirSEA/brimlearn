import { useState } from "react";
import type { Assignment } from "@/_core/api";
import { ArrowRight, Check, RotateCcw, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  assignment: Assignment;
  onClose: () => void;
  onFinish: (score: number, total: number) => void;
};

/** In-app take: one question at a time, instant grading with explanations. */
export function QuizTakeOverlay({ assignment, onClose, onFinish }: Props) {
  const questions = assignment.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const answeredCount = answers.filter((value) => value !== null).length;
  const score = questions.reduce((total, question, questionIndex) => (answers[questionIndex] === question.answer ? total + 1 : total), 0);

  const select = (optionIndex: number) => {
    if (!current) return;
    setAnswers((values) => values.map((value, valueIndex) => (valueIndex === index ? optionIndex : value)));
  };

  const next = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else setFinished(true);
  };

  const finish = () => {
    onFinish(score, questions.length);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#0b241c]/75 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-3xl px-4">
        <div className="overflow-hidden rounded-[26px] bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 bg-[#123d30] px-5 py-4 text-white">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#82a79a]">
                {assignment.type} · {assignment.subject}
              </div>
              <div className="truncate font-display text-lg font-semibold tracking-[-0.03em]">{assignment.title}</div>
            </div>
            <button onClick={onClose} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20">
              <X size={14} /> Close
            </button>
          </div>

          {!finished ? (
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#8aa096]">Question {index + 1} of {questions.length}</span>
                <div className="h-2 flex-1 rounded-full bg-[#edf1e9]">
                  <div className="h-2 rounded-full bg-[#d8f36a] transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
                </div>
              </div>

              <h3 className="mt-5 font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-[#183c31]">{current?.question}</h3>

              <div className="mt-5 space-y-2.5">
                {current?.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => select(optionIndex)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition",
                      answers[index] === optionIndex
                        ? "border-[#6b9f88] bg-[#eef6ec] font-semibold text-[#25483c] ring-2 ring-[#d8f36a]/50"
                        : "border-[#e1e8df] bg-white text-[#527064] hover:border-[#99bda8] hover:bg-[#fbfcf9]"
                    )}
                  >
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold", answers[index] === optionIndex ? "bg-[#d8f36a] text-[#133d2f]" : "bg-[#edf1e9] text-[#527064]")}>
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>

              <div className="mt-7 flex items-center justify-between gap-3">
                <div className="text-xs text-[#8aa096]">{answeredCount}/{questions.length} answered</div>
                <button
                  onClick={next}
                  disabled={answers[index] === null}
                  className="flex items-center gap-2 rounded-full bg-[#173f31] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#286b51] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {index === questions.length - 1 ? "Finish quiz" : "Next question"} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <div className="flex flex-col items-center rounded-[22px] bg-[#123d30] px-6 py-8 text-center text-white">
                <Trophy size={26} className="text-[#d8f36a]" />
                <div className="mt-3 font-display text-5xl font-semibold tracking-[-0.06em] text-[#d8f36a]">
                  {score}<span className="text-2xl text-[#c4ded0]">/{questions.length}</span>
                </div>
                <div className="mt-1 text-sm text-[#c4ded0]">
                  {score === questions.length ? "Perfect score — brilliant work!" : score >= questions.length * 0.6 ? "Good effort — review the notes below." : "Keep practising — the explanations below will help."}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {questions.map((question, questionIndex) => {
                  const correct = answers[questionIndex] === question.answer;
                  return (
                    <div key={questionIndex} className={cn("rounded-2xl border p-4", correct ? "border-[#cfe6d8] bg-[#f7fbf8]" : "border-[#f0d98a] bg-[#fffdf5]")}>
                      <div className="flex items-start gap-2.5">
                        <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", correct ? "bg-[#2f7a57] text-white" : "bg-[#c9a227] text-white")}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#25483c]">{question.question}</div>
                          {!correct && (
                            <div className="mt-1 text-xs text-[#7a5d10]">
                              Your answer: {answers[questionIndex] !== null ? question.options[answers[questionIndex] as number] : "not answered"} · Correct: {question.options[question.answer]}
                            </div>
                          )}
                          <div className="mt-1.5 text-xs leading-5 text-[#648075]">{question.explanation}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button onClick={onClose} className="flex items-center gap-2 rounded-xl border border-[#e1e8df] bg-white px-4 py-2.5 text-sm font-semibold text-[#527064] transition hover:border-[#99bda8]">
                  <X size={15} /> Close
                </button>
                <button onClick={finish} className="flex items-center gap-2 rounded-xl bg-[#d8f36a] px-5 py-2.5 text-sm font-semibold text-[#133d2f] shadow-[0_4px_0_#0c3428] transition hover:bg-[#e1fa8c]">
                  <Check size={15} /> Submit score
                </button>
                <button onClick={() => { setAnswers(questions.map(() => null)); setIndex(0); setFinished(false); }} className="flex items-center gap-2 rounded-xl border border-[#e1e8df] bg-white px-4 py-2.5 text-sm font-semibold text-[#527064] transition hover:border-[#99bda8]">
                  <RotateCcw size={15} /> Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}