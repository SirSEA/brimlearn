import AppShell from "@/components/layout/AppShell";
import { navForMode, type Mode } from "@/components/layout/shell";
import { Messages } from "@/features/chat/Messages";
import { AdultDashboard } from "@/features/dashboard/AdultDashboard";
import { pathForMode } from "@/lib/roles";
import { useLocation } from "wouter";

export default function Admin() {
  const [, setLocation] = useLocation();
  const navigate = (mode: Mode) => setLocation(pathForMode(mode));

  return (
    <AppShell
      mode="school"
      onNavigate={navigate}
      tabs={navForMode("school")}
      renderBody={(active) => (active === "messages" ? <Messages variant="tutor" /> : <AdultDashboard mode="school" />)}
    />
  );
}