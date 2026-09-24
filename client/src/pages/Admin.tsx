import AppShell from "@/components/layout/AppShell";
import { navForMode, type Mode } from "@/components/layout/shell";
import { AdminToday } from "@/features/admin/AdminToday";
import { AdminUsers } from "@/features/admin/AdminUsers";
import { AdminInbox } from "@/features/admin/AdminInbox";
import { AdminSchools } from "@/features/admin/AdminSchools";
import { SiteEditor } from "@/features/site/SiteEditor";
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
      renderBody={(active, go) => {
        if (active === "users") return <AdminUsers />;
        if (active === "messages") return <AdminInbox onOpenSchools={() => go("schools")} />;
        if (active === "schools") return <AdminSchools onOpenMessages={() => go("messages")} />;
        if (active === "website") return <SiteEditor />;
        return <AdminToday />;
      }}
    />
  );
}