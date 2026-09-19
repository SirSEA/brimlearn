import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/_core/api";
import { roleHomePath } from "@/lib/roles";

function AuthSplash() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbf6]">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[15px] bg-[#d8f36a] font-display text-xl font-bold text-[#133d2f] shadow-[0_6px_0_#0c3428]">
          n°
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8aa096]">brimlearn</div>
      </div>
    </div>
  );
}

type AuthGateProps = {
  /** When true the route is only reachable by users whose role is `admin`. */
  requireAdmin?: boolean;
  children: ReactNode;
};

/**
 * Route guard. In full-stack mode (backend online) it redirects unsigned
 * visitors to the right sign-in screen and blocks non-admins from /admin.
 * In offline demo mode (Netlify static hosting, no backend) it renders the
 * children directly so the self-contained demo keeps working.
 */
export function AuthGate({ requireAdmin = false, children }: AuthGateProps) {
  const { user, role, loading } = useAuth();

  if (loading) return <AuthSplash />;

  if (!api.isOnline()) return <>{children}</>;

  if (!user) {
    return <Redirect to={requireAdmin ? "/admin/login" : "/login"} />;
  }

  if (requireAdmin && role !== "admin") {
    return <Redirect to={roleHomePath(role)} />;
  }

  return <>{children}</>;
}