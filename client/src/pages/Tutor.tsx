import AppShell from "@/components/layout/AppShell";
import { navForMode, type Mode } from "@/components/layout/shell";
import { Messages } from "@/features/chat/Messages";
import { TutorAssignments } from "@/features/tutor/TutorAssignments";
import { TutorCalendar } from "@/features/tutor/TutorCalendar";
import { TutorResources } from "@/features/tutor/TutorResources";
import { TutorRoster } from "@/features/tutor/TutorRoster";
import { TutorVirtualTool } from "@/features/tutor/TutorVirtualTool";
import { pathForMode } from "@/lib/roles";
import { useLocation } from "wouter";

export default function Tutor() {
  const [, setLocation] = useLocation();
  const navigate = (mode: Mode) => setLocation(pathForMode(mode));

  return (
    <AppShell
      mode="classroom"
      onNavigate={navigate}
      tabs={navForMode("classroom")}
      renderBody={(active) => {
        switch (active) {
          case "calendar":
            return <TutorCalendar />;
          case "assignments":
            return <TutorAssignments />;
          case "resources":
            return <TutorResources />;
          case "virtual":
            return <TutorVirtualTool />;
          case "messages":
            return <Messages variant="tutor" />;
          default:
            return <TutorRoster />;
        }
      }}
    />
  );
}