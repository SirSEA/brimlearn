import {
  Check,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api, type GeneratedQuiz, type QuizQuestion } from "@/_core/api";
import { curriculumSubjects, nerdcUnits } from "@/lib/curriculum";
import {
  isAnswerCorrect,
  isChoiceQuestion,
  questionAnswerText,
} from "@/lib/quiz";
import { cn } from "@/lib/utils";

type QuizHistoryRecord = {
  date: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  score: number;
  total: number;
};

const GENERATE_COUNTS = [3, 5, 8];

export function buildLocalQuiz(topic: string, count: number) {
  const bank = [
    {
      question: `Which statement best describes ${topic}?`,
      options: [
        `It is a key idea in this topic`,
        "It is unrelated to the topic",
        "It is only used in history",
        "It cannot be practised",
      ],
      answer: 0,
      explanation: `${topic} is the focus of this practice set, so the first option identifies its role.`,
    },
    {
      question: `What is the best first step when practising ${topic}?`,
      options: [
        "Read the question carefully",
        "Skip every example",
        "Choose an answer at random",
        "Ignore the units",
      ],
      answer: 0,
      explanation:
        "Reading carefully helps you identify the information and operation the question requires.",
    },
    {
      question: `Which habit supports improvement in ${topic}?`,
      options: [
        "Explain your method",
        "Avoid checking work",
        "Copy without thinking",
        "Stop after one attempt",
      ],
      answer: 0,
      explanation:
        "Explaining a method makes reasoning visible and helps reveal misconceptions.",
    },
  ];
  return {
    title: `${topic} practice set`,
    questions: bank.slice(0, Math.min(count, bank.length)),
  };
}

export function QuizGenerator({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState("maths");
  const [grade, setGrade] = useState("JSS1");
  const [term, setTerm] = useState("First term");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard" | "advanced"
  >("medium");
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [revealed, setRevealed] = useState(false);
  const [hintsOpen, setHintsOpen] = useState<Record<number, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<QuizHistoryRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("brimlearn-quiz-history") || "[]");
    } catch {
      return [];
    }
  });

  const subjects = curriculumSubjects.filter((item) => item.status === "live");
  const topics = nerdcUnits
    .filter(
      (unit) =>
        unit.subject === subject && unit.grade === grade && unit.term === term,
    )
    .flatMap((unit) => unit.weeks);
  const selectedTopic = topic || topics[0] || "Curriculum review";

  const handleGenerate = async (count: number) => {
    setGenerating(true);
    try {
      const data = await api.generateQuiz({
        subject,
        grade,
        term,
        topic: selectedTopic,
        count,
        difficulty,
      });
      setQuiz(data);
      setAnswers({});
      setRevealed(false);
      setHintsOpen({});
      toast.success(`Practice set ready: ${data.title}`);
    } catch {
      const data = buildLocalQuiz(selectedTopic, count);
      setQuiz({ ...data, questions: data.questions as QuizQuestion[] });
      setAnswers({});
      setRevealed(false);
      setHintsOpen({});
      toast.success(`Practice set ready: ${data.title} (offline mode)`);
    } finally {
      setGenerating(false);
    }
  };

  const quizQuestions = quiz?.questions ?? [];
  const answeredCount = quizQuestions.filter(
    (_, index) =>
      answers[index] !== undefined && String(answers[index]).trim() !== "",
  ).length;
  const score = quizQuestions.reduce(
    (total, question, index) =>
      total + (isAnswerCorrect(question, answers[index]) ? 1 : 0),
    0,
  );
  const allAnswered =
    quizQuestions.length > 0 && answeredCount === quizQuestions.length;
  const average = history.length
    ? Math.round(
        history.reduce(
          (sum, item) => sum + (item.score / item.total) * 100,
          0,
        ) / history.length,
      )
    : 0;

  useEffect(() => {
    if (!quizQuestions.length || !allAnswered) return;
    const record: QuizHistoryRecord = {
      date: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      subject,
      grade,
      topic: selectedTopic,
      difficulty,
      score,
      total: quizQuestions.length,
    };
    const next = [
      ...history.filter(
        (item) => !(item.topic === record.topic && item.date === record.date),
      ),
      record,
    ].slice(-8);
    setHistory(next);
    localStorage.setItem("brimlearn-quiz-history", JSON.stringify(next));
  }, [
    allAnswered,
    quizQuestions.length,
    score,
    selectedTopic,
    subject,
    grade,
    difficulty,
  ]);

  const recommendation =
    revealed && allAnswered && score / quizQuestions.length < 0.7
      ? `Intervention suggested: revisit “${selectedTopic}” with an easy reset, a worked example, and a 3-question check-in — and show the working for each missed calculation.`
      : revealed && allAnswered
        ? "On track: move to a hard or advanced practice set after a short explanation task."
        : allAnswered
          ? "Complete the quiz, then check your answers for an automatic intervention recommendation."
          : "Complete the quiz to receive an automatic intervention recommendation.";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#1A1512]/45 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">
              <Sparkles size={14} /> Celebras AI practice studio
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">
              Generate, assign, and learn from every quiz.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#765F4F]">
              Create NERDC-aligned practice, tune the challenge, and turn the
              result into a next-best action. For maths, physics and other
              calculation subjects, the AI mixes in self-solve questions you
              work out by hand.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#A08A75] hover:bg-[#F7EFE3]"
            aria-label="Close quiz generator"
          >
            <X size={18} />
          </button>
        </div>

        {!quiz ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-semibold text-[#765F4F]">
                Subject
                <select
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    setTopic("");
                  }}
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"
                >
                  {subjects.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#765F4F]">
                Grade
                <select
                  value={grade}
                  onChange={(event) => {
                    setGrade(event.target.value);
                    setTopic("");
                  }}
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"
                >
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#765F4F]">
                Term
                <select
                  value={term}
                  onChange={(event) => {
                    setTerm(event.target.value);
                    setTopic("");
                  }}
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"
                >
                  {["First term", "Second term", "Third term"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#765F4F]">
                Topic
                <select
                  value={selectedTopic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"
                >
                  {topics.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                  <option>Curriculum review</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-[#765F4F]">
                Difficulty
                <select
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(event.target.value as typeof difficulty)
                  }
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {GENERATE_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => void handleGenerate(count)}
                  disabled={generating}
                  className="rounded-full bg-[#C65A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? "Generating…" : `Generate ${count}`}
                </button>
              ))}
              {history.length > 0 && (
                <span className="ml-auto text-[11px] text-[#A08A75]">
                  Average score across your last {history.length}: {average}%
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-[22px] border border-[#E2CDB8] bg-[#FFFDF8] p-5">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">
                  {subject} · {grade} · {difficulty}
                </div>
                <h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-[#1A1512]">
                  {quiz.title}
                </h3>
                <p className="mt-1 text-xs text-[#A08A75]">
                  {quizQuestions.length} questions · calculation items are
                  solved by hand, no options
                </p>
              </div>
              <div className="flex gap-2">
                {revealed && (
                  <button
                    onClick={() => {
                      setRevealed(false);
                      setAnswers({});
                      setHintsOpen({});
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#765F4F] transition hover:border-[#A9BF87]"
                  >
                    <RotateCcw size={15} /> Retry
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#765F4F] transition hover:border-[#A9BF87]"
                >
                  Done
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {quizQuestions.map((question, index) => {
                const value = answers[index];
                const answered =
                  value !== undefined && String(value).trim() !== "";
                const correct = revealed && isAnswerCorrect(question, value);
                const showHint = hintsOpen[index];
                return (
                  <div
                    key={index}
                    className={cn(
                      "rounded-[20px] border p-5",
                      revealed
                        ? correct
                          ? "border-[#DDE5C9] bg-[#F3F4E8]"
                          : "border-[#EAC1B4] bg-[#fff7f5]"
                        : "border-[#E2CDB8] bg-[#FFFDF8]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-base font-semibold leading-snug tracking-[-0.02em] text-[#3B241A]">
                        <span className="mr-2 text-[#A08A75]">
                          Q{index + 1}.
                        </span>
                        {question.question}
                      </p>
                      {revealed && (
                        <span
                          className={cn(
                            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                            correct
                              ? "bg-[#4B6B3C] text-white"
                              : "bg-[#B84B3D] text-white",
                          )}
                        >
                          {correct ? (
                            <Check size={13} strokeWidth={3} />
                          ) : (
                            <X size={13} strokeWidth={3} />
                          )}
                        </span>
                      )}
                    </div>

                    {isChoiceQuestion(question) ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {question.options.map((option, optionIndex) => {
                          const selected = value === optionIndex;
                          return (
                            <button
                              key={optionIndex}
                              onClick={() =>
                                !revealed &&
                                setAnswers((current) => ({
                                  ...current,
                                  [index]: optionIndex,
                                }))
                              }
                              className={cn(
                                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                                selected
                                  ? "border-[#8CAE70] bg-[#EDF0DC] font-semibold text-[#3B241A]"
                                  : "border-[#F3E9DE] bg-[#FFFDF8] text-[#765F4F] hover:border-[#A9BF87]",
                                revealed &&
                                  optionIndex === question.answer &&
                                  "border-[#A9BF87] bg-[#E9EED9] font-semibold text-[#3B241A]",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
                                  selected ||
                                    (revealed &&
                                      optionIndex === question.answer)
                                    ? "bg-[#FFC857] text-[#1A1512]"
                                    : "bg-[#F3E9DE] text-[#765F4F]",
                                )}
                              >
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              {option}
                              {revealed && optionIndex === question.answer && (
                                <Check
                                  size={14}
                                  className="ml-auto text-[#4B6B3C]"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={typeof value === "string" ? value : ""}
                            onChange={(event) =>
                              !revealed &&
                              setAnswers((current) => ({
                                ...current,
                                [index]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.preventDefault();
                            }}
                            placeholder="Type your working / answer…"
                            disabled={revealed}
                            className="w-full max-w-xs rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70] disabled:opacity-60"
                          />
                          {question.unit && (
                            <span className="text-sm font-semibold text-[#765F4F]">
                              {question.unit}
                            </span>
                          )}
                          <button
                            onClick={() =>
                              setHintsOpen((current) => ({
                                ...current,
                                [index]: !current[index],
                              }))
                            }
                            className={cn(
                              "ml-auto flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition",
                              showHint
                                ? "border-[#8CAE70] bg-[#EDF0DC] text-[#4B6B3C]"
                                : "border-[#E2CDB8] bg-[#FFFDF8] text-[#765F4F] hover:border-[#A9BF87]",
                            )}
                            title="Show a hint"
                          >
                            <Lightbulb size={13} />{" "}
                            {showHint ? "Hide hint" : "Hint"}
                          </button>
                        </div>
                        {showHint && question.hint && (
                          <p className="mt-2 rounded-xl bg-[#FFF7E6] px-3.5 py-2.5 text-xs leading-5 text-[#7A5415]">
                            <Lightbulb
                              size={12}
                              className="mr-1.5 inline text-[#B67A17]"
                            />
                            {question.hint}
                          </p>
                        )}
                        {revealed && !correct && (
                          <p className="mt-2 flex items-start gap-2 text-xs font-semibold text-[#4B6B3C]">
                            <span className="rounded-full bg-[#E9EED9] px-2 py-0.5">
                              Answer: {questionAnswerText(question)}
                              {question.unit ? ` ${question.unit}` : ""}
                            </span>
                            {typeof value === "string" && value.trim() && (
                              <span className="text-[#B84B3D]">
                                Your answer: {value}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {revealed && (
                      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#765F4F]">
                        <span className="font-semibold text-[#4B6B3C]">
                          Why:
                        </span>{" "}
                        {question.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#3B241A] px-5 py-4 text-white">
              <div className="text-xs text-[#D9C4B0]">
                {answeredCount}/{quizQuestions.length} answered
                {revealed && (
                  <span className="ml-3 font-display text-lg font-semibold text-[#FFC857]">
                    {score}
                    <span className="text-xs text-[#D9C4B0]">
                      /{quizQuestions.length}
                    </span>{" "}
                    correct
                  </span>
                )}
              </div>
              <button
                onClick={() => setRevealed(true)}
                disabled={!allAnswered}
                className="flex items-center gap-2 rounded-full bg-[#FFC857] px-5 py-2.5 text-sm font-semibold text-[#1A1512] shadow-[0_3px_0_#2A1D16] transition hover:bg-[#FFD97A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Check answers <ChevronRight size={15} />
              </button>
            </div>

            {revealed && allAnswered && (
              <div className="mt-4 rounded-[20px] border border-[#E2CDB8] bg-[#FFFDF8] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EFEFDD] text-[#4B6B3C]">
                    <Trophy size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[#3B241A]">
                      {score === quizQuestions.length
                        ? "Perfect score — brilliant working!"
                        : score >= quizQuestions.length * 0.6
                          ? "Good effort — check the explanations above."
                          : "Keep practising — the explanations above show the correct working."}
                    </div>
                    <div className="mt-0.5 text-xs leading-5 text-[#765F4F]">
                      {recommendation}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
