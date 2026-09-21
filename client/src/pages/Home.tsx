import AppShell from "@/components/layout/AppShell";
import { navForMode, type Mode } from "@/components/layout/shell";
import { ClassroomLive } from "@/features/classroom/ClassroomLive";
import { Messages } from "@/features/chat/Messages";
import { GradeBook } from "@/features/gradebook/GradeBook";
import { LearnerDashboard } from "@/features/learner/LearnerDashboard";
import { ResourceLibrary } from "@/features/library/ResourceLibrary";
import { Tracker } from "@/features/tracker/Tracker";
import { pathForMode } from "@/lib/roles";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const navigate = (mode: Mode) => setLocation(pathForMode(mode));

  return (
    <AppShell
      mode="learner"
      onNavigate={navigate}
      tabs={navForMode("learner")}
      renderBody={(active, go, openModal) => {
        switch (active) {
          case "grades":
            return <GradeBook />;
          case "tracker":
            return <Tracker />;
          case "classroom":
            return <ClassroomLive />;
          case "library":
            return <ResourceLibrary />;
          case "messages":
            return <Messages variant="learner" />;
          default:
            return <LearnerDashboard setLocation={setLocation} onViewGrades={() => go("grades")} onViewFullMap={() => openModal("curriculum")} />;
        }
      }}
    />
  );
}