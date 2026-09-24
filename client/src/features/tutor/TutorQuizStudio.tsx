import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Scheme } from "@shared/scheme";
import type {
  ObjectivesAssessmentInput,
  ObjectivesAssessment,
} from "@/_core/api";
import { ApiUnavailableError, api } from "@/_core/api";
import {
  ArrowRight,
  Check,
  Lightbulb,
  Send,
  ShieldAlert,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isChoiceQuestion, questionAnswerText } from "@/lib/quiz";

const DIFFICULTY_MAP = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  advanced: "Advanced",
} as const;

function OptionLetter({ index }: { index: number }) {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#F3E9DE] text-xs font-bold text-[#765F4F]">
      {String.fromCharCode(65 + index)}
    </span>
  );
}

export function TutorQuizStudio() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemeId, setSchemeId] = useState("");
  const [week, setWeek] = useState<string>("");
  const [assessmentType, setAssessmentType] = useState<"quiz" | "assessment">(
    "quiz",
  );
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] =
    useState<ObjectivesAssessmentInput["difficulty"]>("medium");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ObjectivesAssessment | null>(null);
  const [fallback, setFallback] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    api
      .listSchemes()
      .then((items) => {
        setSchemes(items);
        if (items.length > 0) setSchemeId(items[0].id);
      })
      .catch(() => toast.error("Could not load schemes of work."));
  }, []);

  const scheme = useMemo(
    () => schemes.find((s) => s.id === schemeId) ?? null,
    [schemes, schemeId],
  );
  const weeks = useMemo(() => {
    const labels = Array.from(
      new Set((scheme?.weeks ?? []).map((w) => w.week).filter(Boolean)),
    );
    if (
      labels.length === 0 &&
      (scheme?.weeks.length ?? 0) > 0 &&
      !labels.includes("Week 1")
    )
      labels.push("All weeks");
    return labels;
  }, [scheme]);

  const generate = async () => {
    if (!scheme) return;
    setGenerating(true);
    setPublished(false);
    try {
      const assessment = await api.generateFromObjectives({
        schemeId: scheme.id,
        week: week || null,
        assessmentType,
        count,
        difficulty,
      });
      setResult(assessment);
      setTitle(assessment.title);
      setFallback(assessment.fallback ?? false);
      toast.success(
        assessment.questions.length > 0
          ? "Assessment ready — review the questions, then publish."
          : "",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiUnavailableError
          ? "Offline — start the dev server to generate assessments."
          : "Generation failed. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const publishAsAssignment = async () => {
    if (!scheme || !result) return;
    setPublishing(true);
    try {
      await api.createAssignment({
        type: assessmentType === "quiz" ? "Quiz" : "Worksheet",
        title: title.trim() || result.title,
        subject: scheme.subject,
        audience: "Whole class",
        audienceKey: "class",
        difficulty: DIFFICULTY_MAP[difficulty],
        due: assessmentType === "quiz" ? null : "Due Fri 5pm",
        questions: result.questions,
      });
      setPublished(true);
      toast.success(
        `Published “${title.trim() || result.title}” — students can now take it from their Tracker.`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiUnavailableError
          ? "Offline — start the dev server to publish."
          : "Could not publish the assignment.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPublished(false);
    setFallback(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">
            <Sparkles size={13} /> Celebras AI assessment studio
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
            Build quizzes & assessments from your scheme
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#765F4F]">
            Pick the uploaded scheme (and optionally a week), choose the
            difficulty, and Celebras writes questions locked to the topics,
            subtopics, and learning objectives — plus practical teaching
            suggestions. Review, then publish so learners can take it in-app.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-[#E2CDB8] bg-[#FFFDF8] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-[#765F4F]">
              Scheme of work
            </span>
            <select
              value={schemeId}
              onChange={(event) => {
                setSchemeId(event.target.value);
                setWeek("");
                setResult(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70]"
            >
              {schemes.length === 0 && (
                <option value="">
                  Upload a scheme PDF first (Curriculum tab)
                </option>
              )}
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject} · {s.grade} · {s.term}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-[#765F4F]">
              Week / section
            </span>
            <select
              value={week}
              onChange={(event) => {
                setWeek(event.target.value);
                setResult(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70]"
            >
              <option value="">All weeks (first 3 used)</option>
              {weeks.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-xs font-semibold text-[#765F4F]">
              Assessment type
            </span>
            <div className="mt-1.5 flex gap-1 rounded-2xl bg-[#F7EFE3] p-1">
              {(["quiz", "assessment"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setAssessmentType(item);
                    setResult(null);
                  }}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold capitalize transition",
                    assessmentType === item
                      ? "bg-[#FFFDF8] text-[#3B241A] shadow-sm"
                      : "text-[#A08A75] hover:text-[#765F4F]",
                  )}
                >
                  {item === "quiz" ? "Practice quiz" : "Assessment"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-[#765F4F]">
                Questions
              </span>
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70]"
              >
                {[4, 5, 8, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#765F4F]">
                Difficulty
              </span>
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target
                      .value as ObjectivesAssessmentInput["difficulty"],
                  )
                }
                className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
        </div>

        {scheme && (
          <div className="mt-4 rounded-xl bg-[#F7EFE3] px-3.5 py-2.5 text-xs leading-5 text-[#765F4F]">
            <span className="font-semibold text-[#765F4F]">
              Objectives that will drive the questions —{" "}
            </span>
            {(week
              ? scheme.weeks.filter(
                  (w) => w.week === week || w.week.includes(week),
                )
              : scheme.weeks.slice(0, 3)
            ).map((w) => (
              <span
                key={w.week}
                className="mr-5 inline-flex items-center gap-1.5"
              >
                <Check size={12} className="text-[#4B6B3C]" /> {w.week}:{" "}
                {w.topic}
              </span>
            ))}
            {(scheme.weeks.length === 0 || week) && (week || "All")}
          </div>
        )}

        <button
          onClick={generate}
          disabled={!scheme || generating}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3B241A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? (
            <>
              <Wand2 size={16} className="animate-spin" /> Writing your
              assessment…
            </>
          ) : (
            <>
              <Wand2 size={16} /> Generate {assessmentType} from the objectives
            </>
          )}
        </button>
      </div>

      {fallback && result && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#FFE7A8] bg-[#FFF1CD] px-4 py-3 text-sm text-[#9A6712]">
          <ShieldAlert size={16} /> The AI service was unavailable, so this was
          built from the scheme locally. Review the questions before publishing.
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="rounded-[24px] border border-[#E2CDB8] bg-[#FFFDF8] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-[#765F4F]">
                  Assignment title
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 font-display text-lg font-semibold tracking-[-0.03em] text-[#3B241A] outline-none transition focus:border-[#8CAE70]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#765F4F] transition hover:border-[#A9BF87]"
                >
                  Start over
                </button>
                <button
                  onClick={publishAsAssignment}
                  disabled={publishing || published}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    published
                      ? "bg-[#E9EED9] text-[#4B6B3C]"
                      : "bg-[#FFC857] text-[#1A1512] shadow-[0_4px_0_#2A1D16] hover:bg-[#FFC857]",
                  )}
                >
                  {published ? (
                    <>
                      <Check size={15} /> Published
                    </>
                  ) : (
                    <>
                      <Send size={15} />{" "}
                      {publishing ? "Publishing…" : "Publish as assignment"}
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#A08A75]">
              {result.questions.length} questions · {scheme?.subject} · whole
              class · students answer in-app and get instant grading
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {result.questions.map((q, index) => (
                <div
                  key={index}
                  className="rounded-[20px] border border-[#E2CDB8] bg-[#FFFDF8] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-base font-semibold leading-snug tracking-[-0.02em]">
                      <span className="mr-2 text-[#A08A75]">Q{index + 1}.</span>
                      {q.question}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {isChoiceQuestion(q) ? (
                      q.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                            optionIndex === q.answer
                              ? "border-[#A9BF87] bg-[#E9EED9] font-semibold text-[#3B241A]"
                              : "border-[#F3E9DE] bg-[#FFFDF8] text-[#765F4F]",
                          )}
                        >
                          <OptionLetter index={optionIndex} />
                          {option}
                          {optionIndex === q.answer && (
                            <Check
                              size={14}
                              className="ml-auto text-[#4B6B3C]"
                            />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 rounded-xl border border-[#A9BF87] bg-[#EDF0DC] px-3 py-2.5 text-sm font-semibold text-[#3B241A]">
                          {questionAnswerText(q)}
                          {q.unit && (
                            <span className="text-xs font-semibold text-[#765F4F]">
                              {q.unit}
                            </span>
                          )}
                          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#4B6B3C]">
                            Answer · worked by hand
                          </span>
                        </div>
                        {q.hint && (
                          <p className="mt-1.5 text-[11px] leading-5 text-[#7A5415]">
                            <Lightbulb
                              size={11}
                              className="mr-1 inline text-[#B67A17]"
                            />{" "}
                            Hint: {q.hint}
                            {q.acceptedAnswers &&
                              q.acceptedAnswers.length > 0 && (
                                <span className="text-[#765F4F]">
                                  {" "}
                                  (also accept: {q.acceptedAnswers.join(", ")})
                                </span>
                              )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#765F4F]">
                    <span className="font-semibold text-[#4B6B3C]">Why:</span>{" "}
                    {q.explanation}
                  </p>
                </div>
              ))}
            </div>

            {result.suggestions.length > 0 && (
              <aside className="h-fit rounded-[20px] border border-[#E2CDB8] bg-[#FFFDF8] p-5 lg:sticky lg:top-4">
                <div className="flex items-center gap-2 font-display text-base font-semibold tracking-[-0.02em]">
                  <Sparkles size={16} className="text-[#4B6B3C]" /> Teacher
                  suggestions
                </div>
                <p className="mt-1 text-xs leading-5 text-[#A08A75]">
                  Practical notes to teach this week's objectives.
                </p>
                <ul className="mt-4 space-y-3">
                  {result.suggestions.map((tip, index) => (
                    <li
                      key={index}
                      className="flex gap-2.5 text-sm leading-6 text-[#765F4F]"
                    >
                      <ArrowRight
                        size={14}
                        className="mt-1 shrink-0 text-[#4B6B3C]"
                      />{" "}
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
