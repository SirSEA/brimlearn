import AppShell from "@/components/layout/AppShell";
import { roleToMode, pathForMode } from "@/lib/roles";
import type { Mode } from "@/components/layout/shell";
import { UserRound, Settings2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { ProfileTab } from "@/features/account/ProfileTab";
import { SettingsTab } from "@/features/account/SettingsTab";

const ACCOUNT_TABS = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "settings", label: "Settings", icon: Settings2 },
];

/**
 * Shared Profile + Settings page for every user type (student, parent,
 * tutor, admin). It renders inside the user's own app shell so the sidebar
 * and header are preserved, and the two account tabs are the sidebar nav.
 */
export function AccountPage({
  initialTab,
}: {
  initialTab: "profile" | "settings";
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) return null;
  const mode: Mode = roleToMode(user.role);
  const navigate = (next: Mode) => setLocation(pathForMode(next));

  return (
    <AppShell
      mode={mode}
      onNavigate={navigate}
      tabs={ACCOUNT_TABS}
      initialActive={initialTab}
      renderBody={(active) => {
        if (active === "settings") return <SettingsTab />;
        return <ProfileTab />;
      }}
    />
  );
}

export function BackToDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user) return null;
  return (
    <button
      onClick={() => setLocation(pathForMode(roleToMode(user.role)))}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B6B3C] transition hover:text-[#2E4523]"
    >
      <ArrowLeft size={13} /> Back to dashboard
    </button>
  );
}
