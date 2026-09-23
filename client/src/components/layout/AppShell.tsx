import { useEffect, useState, type ReactNode } from "react";
import { CurriculumPrompt } from "@/features/curriculum/CurriculumPrompt";
import { QuizGenerator } from "@/features/quiz/QuizGenerator";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { primaryKeyFor, type Mode, type NavItem } from "./shell";

type AppShellProps = {
  mode: Mode;
  onNavigate: (mode: Mode) => void;
  tabs: NavItem[];
  renderBody: (active: string, go: (key: string) => void, openModal: (which: "curriculum" | "quiz") => void) => ReactNode;
};

export default function AppShell({ mode, onNavigate, tabs, renderBody }: AppShellProps) {
  const [active, setActive] = useState(primaryKeyFor(mode));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    setActive(primaryKeyFor(mode));
  }, [mode]);

  const go = (key: string) => setActive(key);
  const openModal = (which: "curriculum" | "quiz") => (which === "curriculum" ? setCurriculumOpen(true) : setQuizOpen(true));
  const sidebarProps = {
    mode,
    onNavigate,
    tabs,
    active,
    setActive: go,
    onCurriculumOpen: () => setCurriculumOpen(true),
    onQuizOpen: () => setQuizOpen(true),
  };

  return (
    <div className="min-h-screen bg-[#F7F0E6] text-[#1A1512]">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar {...sidebarProps} />
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button className="absolute inset-0 bg-[#1A1512]/45" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full shadow-2xl">
              <Sidebar {...sidebarProps} onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Header mode={mode} setMobileOpen={setMobileOpen} />
          <main className="mx-auto max-w-[1420px] px-5 py-7 lg:px-10 lg:py-9">{renderBody(active, go, openModal)}</main>
        </div>
      </div>
      {curriculumOpen && <CurriculumPrompt onClose={() => setCurriculumOpen(false)} />}
      {quizOpen && <QuizGenerator onClose={() => setQuizOpen(false)} />}
    </div>
  );
}