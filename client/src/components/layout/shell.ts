import {
  BookOpenCheck,
  Brain,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  Library,
  ListChecks,
  Globe,
  MessagesSquare,
  Presentation,
  Target,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export type Mode = "learner" | "family" | "classroom" | "school";

export const MODES: Mode[] = ["learner", "family", "classroom", "school"];

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  modal?: "quiz" | "curriculum";
};

export const modeMeta: Record<Mode, { label: string; short: string; icon: typeof Brain }> = {
  learner: { label: "Learner view", short: "Learn", icon: Brain },
  family: { label: "Family view", short: "Family", icon: Users },
  classroom: { label: "Classroom view", short: "Class", icon: GraduationCap },
  school: { label: "School ops view", short: "School", icon: Building2 },
};

/** Contextual sidebar tabs per view. Items flagged `modal` open a global
 *  full-screen tool (quiz studio / curriculum library) instead of a tab. */
export const navForMode = (mode: Mode): NavItem[] => {
  switch (mode) {
    case "learner":
      return [
        { key: "today", label: "Today", icon: LayoutDashboard },
        { key: "grades", label: "Grade book", icon: BookOpenCheck },
        { key: "tracker", label: "Tracker", icon: ClipboardCheck },
        { key: "classroom", label: "Classroom", icon: Video },
        { key: "library", label: "Resource library", icon: Library },
        { key: "curriculum", label: "Curriculum", icon: Layers3, modal: "curriculum" },
        { key: "messages", label: "Messages", icon: MessagesSquare },
        { key: "practice", label: "Practice", icon: Target, modal: "quiz" },
      ];
    case "classroom":
      return [
        { key: "roster", label: "Student roster", icon: Users },
        { key: "calendar", label: "Class calendar", icon: CalendarDays },
        { key: "assignments", label: "Assignments", icon: ClipboardList },
        { key: "resources", label: "Resources", icon: Library },
        { key: "virtual", label: "Virtual tool", icon: Presentation },
        { key: "messages", label: "Messages", icon: MessagesSquare },
        { key: "quizstudio", label: "Quiz studio", icon: ListChecks },
        { key: "practice", label: "Practice", icon: Target, modal: "quiz" },
        { key: "curriculum", label: "Curriculum", icon: Layers3, modal: "curriculum" },
      ];
    case "family":
      return [
        { key: "today", label: "Today", icon: LayoutDashboard },
        { key: "messages", label: "Messages", icon: MessagesSquare },
        { key: "curriculum", label: "Curriculum", icon: Layers3, modal: "curriculum" },
      ];
    case "school":
      return [
        { key: "today", label: "Today", icon: LayoutDashboard },
        { key: "messages", label: "Messages", icon: MessagesSquare },
        { key: "curriculum", label: "Curriculum", icon: Layers3, modal: "curriculum" },
        { key: "website", label: "Website", icon: Globe, },
      ];
  }
};

/** The default tab selected when a view first opens. */
export const primaryKeyFor = (mode: Mode): string => {
  switch (mode) {
    case "classroom":
      return "roster";
    default:
      return "today";
  }
};