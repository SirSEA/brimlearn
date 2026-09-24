// Assignments a tutor creates (worksheets / quizzes / lessons / practice) and
// the backend stores so they land on the learner's tracker. Pure module (no
// node deps) so the client and server can both import it.

export const ASSIGNMENT_TYPES = [
  "Worksheet",
  "Quiz",
  "Lesson",
  "Practice",
] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

/** Who the assignment was aimed at. Class = everyone, group = a subset,
 *  individual = one named learner (id resolved once a real roster exists). */
export type AssignmentAudience = "class" | "group" | "individual";

export const ASSIGNMENT_DIFFICULTIES = [
  "Easy",
  "Medium",
  "Hard",
  "Advanced",
] as const;
export type AssignmentDifficulty = (typeof ASSIGNMENT_DIFFICULTIES)[number];

export type AssignmentStatus = "Scheduled" | "In review";

/**
 * How a question is answered:
 *  - "choice": pick one of the four options (classic objective/MCQ).
 *  - "numeric": type a number the learner works out by hand.
 *  - "expression": type a formula/expression worked out by hand (e.g. "x²+2x+1").
 */
export const QUESTION_TYPES = ["choice", "numeric", "expression"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Single question persisted on an AI-built assignment so learners can answer
 *  it in-app and get instant grading. Defaults to a four-option choice item,
 *  so legacy documents keep working untouched. */
export type AssessmentQuestion = {
  question: string;
  /** "choice" (default) for objective items; numeric/expression for
   *  self-calculated problem-solving items (maths, physics, ...). */
  questionType?: QuestionType;
  /** Options for choice questions (keep [] for numeric/expression). */
  options: string[];
  /** Index of the correct option (0..3) for choice; the canonical answer
   *  string for numeric/expression (e.g. "12.5"). */
  answer: number | string;
  /** Accepted alternate forms of a free-text answer, e.g. ["1/2"] for 0.5. */
  acceptedAnswers?: string[];
  /** Optional clue shown to the learner before they try. */
  hint?: string | null;
  /** Optional unit shown after the answer box, e.g. "m/s²". */
  unit?: string | null;
  explanation: string;
};

export function isChoiceQuestion(question: AssessmentQuestion): boolean {
  return (question.questionType ?? "choice") === "choice";
}

export function questionAnswerText(question: AssessmentQuestion): string {
  return String(question.answer ?? "");
}

/** JSON-safe assignment document. `due` is a human label until a real
 *  classroom calendar is wired in. */
export type Assignment = {
  id: string;
  type: AssignmentType;
  title: string;
  subject: string;
  /** Display label, e.g. "Whole class", "Group (3)", "Amara Okafor". */
  audience: string;
  audienceKey: AssignmentAudience;
  /** Learner ids targeted by an individual assignment (empty for class/group). */
  learnerIds: string[];
  difficulty: AssignmentDifficulty;
  /** Human "due" label, or null for practice (no deadline). */
  due: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  status: AssignmentStatus;
  /** Questions for AI-built quizzes/assessments (empty for non-quiz work). */
  questions?: AssessmentQuestion[];
  /** Uploaded worksheet file (Worksheet assignments only). */
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

export type CreateAssignmentInput = {
  type: AssignmentType;
  title: string;
  subject: string;
  audience: string;
  audienceKey: AssignmentAudience;
  learnerIds?: string[];
  difficulty: AssignmentDifficulty;
  due?: string | null;
  questions?: AssessmentQuestion[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};
