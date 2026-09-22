import type { Mode } from "@/components/layout/shell";

/** Maps the app shell's design "view" modes to their index route. */
export const MODE_PATH: Record<Mode, string> = {
  learner: "/learn",
  family: "/parent",
  classroom: "/tutor",
  school: "/admin",
};

export function pathForMode(mode: Mode): string {
  return MODE_PATH[mode];
}

/** Converts a user's auth role to the shell "view" mode that owns it. */
export function roleToMode(role: string | null | undefined): Mode {
  switch (role) {
    case "parent":
      return "family";
    case "tutor":
      return "classroom";
    case "admin":
      return "school";
    default:
      return "learner";
  }
}

/**
 * Which shell views a role may switch to in the "Viewing as" toolbar.
 * Students only get the learner view; parents get the family view; tutors get
 * family + class; admins get everything except the learner view.
 */
export function modesForRole(role: string | null | undefined): Mode[] {
  switch (role) {
    case "parent":
      return ["family"];
    case "tutor":
      return ["family", "classroom"];
    case "admin":
      return ["family", "classroom", "school"];
    default:
      return ["learner"];
  }
}

/** Whether the role is allowed to add/manage the curriculum library. */
export function canManageCurriculum(role: string | null | undefined): boolean {
  return role === "tutor" || role === "admin";
}

/** The landing page a signed-in user with a given role should be sent to. */
export function roleHomePath(role: string | null | undefined): string {
  return pathForMode(roleToMode(role));
}