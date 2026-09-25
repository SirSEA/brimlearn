import { useState } from "react";
import type { Assignment } from "@/_core/api";
import {
  ArrowRight,
  Check,
  Lightbulb,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isAnswerCorrect,
  isChoiceQuestion,
  questionAnswerText,
} from "@/lib/quiz";

type Props = {
  assignment: Assignment;
  onClose: () => void;
  onFinish: (score: number, total: number) => void;
};

/** In-app take: one question at a time, instant grading with explanations.
 *  Objective items are picked from options; maths/physics calculation items
 *  are typed in and matched against the correct value (with accepted forms). */
export function QuizTakeOverlay({ assignment, onClose, onFinish }: Props) {
  const questions = assignment.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | string | null>>(() =>
    questions.map(() => null),
  );
  const [revealed, setRevealed] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const answeredCount = answers.filter(
    (value) => value !== null && String(value).trim() !== "",
  ).length;
  const currentAnswered =
    answers[index] !== null && String(answers[index]).trim() !== "";
  const score = questions.reduce(
    (total, question, questionIndex) =>
      total + (isAnswerCorrect(question, answers[questionIndex]) ? 1 : 0),
    0,
  );

  const select = (optionIndex: number) => {
    if (!current || revealed) return;
    setAnswers((values) =>
      values.map((value, valueIndex) =>
        valueIndex === index ? optionIndex : value,
      ),
    );
  };

  const enter = (text: string) => {
    if (!current || revealed) return;
    setAnswers((values) =>
      values.map((value, valueIndex) => (valueIndex === index ? text : value)),
    );
  };

  const next = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else setFinished(true);
  };

  const finish = () => {
    onFinish(score, questions.length);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#1A1512]/75 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-3xl px-4">
        <div className="overflow-hidden rounded-[26px] bg-[#FFFDF8] shadow-2xl">
          <div className="flex items-center justify-between gap-3 bg-[#3B241A] px-5 py-4 text-white">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A08A75]">
                {assignment.type} · {assignment.subject}
              </div>
              <div className="truncate font-display text-lg font-semibold tracking-[-0.03em]">
                {assignment.title}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            >
              <X size={14} /> Close
            </button>
          </div>

          {!finished ? (
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#A08A75]">
                  Question {index + 1} of {questions.length}
                </span>
                <div className="h-2 flex-1 rounded-full bg-[#F3E9DE]">
                  <div
                    className="h-2 rounded-full bg-[#FFC857] transition-all"
                    style={{
                      width: `${((index + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <h3 className="mt-5 font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-[#1A1512]">
                {current?.question}
              </h3>

              {current && isChoiceQuestion(current) ? (
                <div className="mt-5 space-y-2.5">
                  {current.options.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      onClick={() => select(optionIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition",
                        answers[index] === optionIndex
                          ? "border-[#8CAE70] bg-[#EDF0DC] font-semibold text-[#3B241A] ring-2 ring-[#FFC857]/50"
                          : "border-[#E2CDB8] bg-[#FFFDF8] text-[#765F4F] hover:border-[#A9BF87] hover:bg-[#FFFDF8]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold",
                          answers[index] === optionIndex
                            ? "bg-[#FFC857] text-[#1A1512]"
                            : "bg-[#F3E9DE] text-[#765F4F]",
                        )}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <div className="flex items-center gap-2">
                    <input
                      value={
                        answers[index] === null ? "" : String(answers[index])
                      }
                      onChange={(event) => enter(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (
                            answers[index] !== null &&
                            String(answers[index]).trim() !== ""
                          )
                            next();
                        }
                      }}
                      placeholder="Work it out, then type your answer…"
                      className="w-full max-w-xs rounded-2xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70]"
                    />
                    {current?.unit && (
                      <span className="text-sm font-semibold text-[#765F4F]">
                        {current.unit}
                      </span>
                    )}
                    <button
                      onClick={() => setHintsOpen((open) => !open)}
                      className={cn(
                        "ml-auto flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-xs font-semibold transition",
                        hintsOpen
                          ? "border-[#8CAE70] bg-[#EDF0DC] text-[#4B6B3C]"
                          : "border-[#E2CDB8] bg-[#FFFDF8] text-[#765F4F] hover:border-[#A9BF87]",
                      )}
                    >
                      <Lightbulb size={13} /> {hintsOpen ? "Hide hint" : "Hint"}
                    </button>
                  </div>
                  {hintsOpen && current?.hint && (
                    <p className="mt-3 rounded-2xl bg-[#FFF7E6] px-4 py-3 text-xs leading-5 text-[#7A5415]">
                      <Lightbulb
                        size={12}
                        className="mr-1.5 inline text-[#B67A17]"
                      />
                      {current.hint}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#A08A75]">
                  {answeredCount}/{questions.length} answered
                </div>
                <button
                  onClick={next}
                  disabled={!currentAnswered}
                  className="flex items-center gap-2 rounded-full bg-[#C65A2E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-3"
                >
                  {index === questions.length - 1
                    ? "Finish quiz"
                    : "Next question"}{" "}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <div className="flex flex-col items-center rounded-[22px] bg-[#3B241A] px-6 py-8 text-center text-white">
                <Trophy size={26} className="text-[#FFC857]" />
                <div className="mt-3 font-display text-5xl font-semibold tracking-[-0.06em] text-[#FFC857]">
                  {score}
                  <span className="text-2xl text-[#D9C4B0]">
                    /{questions.length}
                  </span>
                </div>
                <div className="mt-1 text-sm text-[#D9C4B0]">
                  {score === questions.length
                    ? "Perfect score — brilliant work!"
                    : score >= questions.length * 0.6
                      ? "Good effort — review the notes below."
                      : "Keep practising — the explanations below will help."}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {questions.map((question, questionIndex) => {
                  const correct = isAnswerCorrect(
                    question,
                    answers[questionIndex],
                  );
                  const answered =
                    answers[questionIndex] !== null &&
                    String(answers[questionIndex]).trim() !== "";
                  return (
                    <div
                      key={questionIndex}
                      className={cn(
                        "rounded-2xl border p-4",
                        correct
                          ? "border-[#DDE5C9] bg-[#F3F4E8]"
                          : "border-[#EAC1B4] bg-[#fff7f5]",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                            correct
                              ? "bg-[#4B6B3C] text-white"
                              : "bg-[#B84B3D] text-white",
                          )}
                        >
                          {correct ? (
                            <Check size={12} strokeWidth={3} />
                          ) : (
                            <X size={12} strokeWidth={3} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[#3B241A]">
                            {question.question}
                          </div>
                          {!correct && (
                            <>
                              {isChoiceQuestion(question) ? (
                                <>
                                  <div className="mt-1 truncate text-xs text-[#B84B3D]">
                                    Your answer:{" "}
                                    {answered
                                      ? (question.options[
                                          Number(answers[questionIndex])
                                        ] ?? "not answered")
                                      : "not answered"}
                                  </div>
                                  <div className="mt-1 text-xs font-semibold text-[#4B6B3C]">
                                    Correct answer:{" "}
                                    {question.options[Number(question.answer)]}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {answered && (
                                    <div className="mt-1 truncate text-xs text-[#B84B3D]">
                                      Your answer:{" "}
                                      {String(answers[questionIndex])}
                                    </div>
                                  )}
                                  <div className="mt-1 text-xs font-semibold text-[#4B6B3C]">
                                    Correct answer:{" "}
                                    {questionAnswerText(question)}
                                    {question.unit ? ` ${question.unit}` : ""}
                                    {question.acceptedAnswers &&
                                      question.acceptedAnswers.length > 0 && (
                                        <span className="font-normal">
                                          {" "}
                                          (also accept:{" "}
                                          {question.acceptedAnswers.join(", ")})
                                        </span>
                                      )}
                                  </div>
                                </>
                              )}
                            </>
                          )}
                          {question.hint && (
                            <div className="mt-1.5 text-xs text-[#7A5415]">
                              <Lightbulb size={11} className="mr-1 inline" />{" "}
                              Hint: {question.hint}
                            </div>
                          )}
                          <div className="mt-1.5 text-xs leading-5 text-[#765F4F]">
                            {question.explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#765F4F] transition hover:border-[#A9BF87]"
                >
                  <X size={15} /> Close
                </button>
                <button
                  onClick={finish}
                  className="flex items-center gap-2 rounded-xl bg-[#FFC857] px-5 py-2.5 text-sm font-semibold text-[#1A1512] shadow-[0_4px_0_#2A1D16] transition hover:bg-[#FFC857]"
                >
                  <Check size={15} /> Submit score
                </button>
                <button
                  onClick={() => {
                    setAnswers(questions.map(() => null));
                    setIndex(0);
                    setFinished(false);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#765F4F] transition hover:border-[#A9BF87]"
                >
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
