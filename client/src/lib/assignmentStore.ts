export type PublishedAssignment = {
  id: string;
  title: string;
  subject: string;
  audience: string;
  difficulty: string;
  due: string | null;
  createdAt: string;
};

const KEY = "brimlearn-published-assignments";

export function publishedAssignments(): PublishedAssignment[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as PublishedAssignment[];
  } catch {
    return [];
  }
}

export function publishAssignment(assignment: Omit<PublishedAssignment, "id" | "createdAt">): PublishedAssignment {
  const item: PublishedAssignment = { ...assignment, id: `pub-${Date.now()}`, createdAt: new Date().toISOString() };
  const next = [item, ...publishedAssignments()];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("brimlearn:assignments"));
  return item;
}