import AppShell from "@/components/layout/AppShell";
import { navForMode, type Mode } from "@/components/layout/shell";
import { Messages } from "@/features/chat/Messages";
import { AdultDashboard } from "@/features/dashboard/AdultDashboard";
import { pathForMode } from "@/lib/roles";
import { useLocation } from "wouter";

export default function Parent() {
  const [, setLocation] = useLocation();
  const navigate = (mode: Mode) => setLocation(pathForMode(mode));

  return (
    <AppShell
      mode="family"
      onNavigate={navigate}
      tabs={navForMode("family")}
      renderBody={(active) => (active === "messages" ? <Messages variant="learner" /> : <AdultDashboard mode="family" />)}
    />
  );
}