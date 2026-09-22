// Assignments a tutor creates (worksheets / quizzes / lessons / practice) and
// the backend stores so they land on the learner's tracker. Pure module (no
// node deps) so the client and server can both import it.

export const ASSIGNMENT_TYPES = ["Worksheet", "Quiz", "Lesson", "Practice"] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

/** Who the assignment was aimed at. Class = everyone, group = a subset,
 *  individual = one named learner (id resolved once a real roster exists). */
export type AssignmentAudience = "class" | "group" | "individual";

export const ASSIGNMENT_DIFFICULTIES = ["Easy", "Medium", "Hard", "Advanced"] as const;
export type AssignmentDifficulty = (typeof ASSIGNMENT_DIFFICULTIES)[number];

export type AssignmentStatus = "Scheduled" | "In review";

/** Single multiple-choice question persisted on an AI-built assignment so
 *  learners can answer it in-app and get instant grading. */
export type AssessmentQuestion = {
  question: string;
  options: string[];
  /** Index of the correct option (0..3). */
  answer: number;
  explanation: string;
};

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
};