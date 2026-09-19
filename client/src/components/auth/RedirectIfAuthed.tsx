import { Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { roleHomePath } from "@/lib/roles";

/** Sends an already-signed-in visitor back to their role home so auth pages never show twice. */
export function RedirectIfAuthed() {
  const { user, role, loading } = useAuth();

  if (loading || !user) return null;

  return <Redirect to={role !== "user" ? roleHomePath(role) : "/"} />;
}