import type { Mode } from "@/components/layout/shell";

/** Maps the app shell's design "view" modes to their index route. */
export const MODE_PATH: Record<Mode, string> = {
  learner: "/",
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

/** The landing page a signed-in user with a given role should be sent to. */
export function roleHomePath(role: string | null | undefined): string {
  return pathForMode(roleToMode(role));
}