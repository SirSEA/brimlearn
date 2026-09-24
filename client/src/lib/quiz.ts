import type { AssessmentQuestion } from "@/_core/api";

/** True when the question is a classic pick-one objective (default). */
export function isChoiceQuestion(question: AssessmentQuestion): boolean {
  return (question.questionType ?? "choice") === "choice";
}

function numericEqual(first: string, second: string): boolean {
  const a = parseFloat(first);
  const b = parseFloat(second);
  if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) < 1e-6;
  return false;
}

function stringEqual(first: string, second: string): boolean {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, "");
  return normalize(first) === normalize(second);
}

/** Credits a free-text answer against the canonical answer + accepted forms. */
export function isAnswerCorrect(
  question: AssessmentQuestion,
  value: string | number | null | undefined,
): boolean {
  if (isChoiceQuestion(question)) return value === question.answer;

  const raw = String(value ?? "").trim();
  if (!raw) return false;
  const accepted = [
    String(question.answer ?? ""),
    ...(question.acceptedAnswers ?? []),
  ].filter(Boolean);
  return accepted.some(
    (candidate) =>
      candidate === raw ||
      numericEqual(candidate, raw) ||
      stringEqual(candidate, raw),
  );
}

export function questionAnswerText(question: AssessmentQuestion): string {
  return String(question.answer ?? "");
}

export function questionTypeLabel(question: AssessmentQuestion): string {
  return isChoiceQuestion(question)
    ? "Objective"
    : question.questionType === "expression"
      ? "Expression"
      : "Calculation";
}
