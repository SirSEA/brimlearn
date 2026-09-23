import { ArrowUpRight, LifeBuoy, LogOut, Settings2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrimMark } from "./BrimMark";
import { modesForRole } from "@/lib/roles";
import { Mode, modeMeta, type NavItem } from "./shell";

export function Sidebar({ mode, onNavigate, tabs, active, setActive, onClose, onCurriculumOpen, onQuizOpen }: { mode: Mode; onNavigate: (mode: Mode) => void; tabs: NavItem[]; active: string; setActive: (item: string) => void; onClose?: () => void; onCurriculumOpen?: () => void; onQuizOpen?: () => void }) {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const allowedModes = modesForRole(user?.role ?? null);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out. See you soon.");
    } catch {
      toast("Signed out locally.");
    }
    setLocation("/login");
  };

  const selectTab = (item: NavItem) => {
    if (item.modal === "quiz") {
      onQuizOpen?.();
    } else if (item.modal === "curriculum") {
      onCurriculumOpen?.();
    } else {
      setActive(item.key);
    }
    onClose?.();
  };

  return (
    <aside className="flex h-full w-[248px] flex-col bg-[#3B241A] px-5 py-6 text-white">
      <div className="flex items-center justify-between">
        <BrimMark />
        {onClose && <button className="rounded-lg p-2 text-[#CCD2B5] hover:bg-white/10" onClick={onClose}><X size={18} /></button>}
      </div>

      <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
        <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Viewing as</div>
        <div className="grid grid-cols-2 gap-1">
          {allowedModes.map((item) => {
            const Icon = modeMeta[item].icon;
            const selected = item === mode;
            return (
              <button
                key={item}
                onClick={() => { onNavigate(item); onClose?.(); }}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${selected ? "bg-[#FFC857] font-semibold text-[#1A1512]" : "text-[#D9C4B0] hover:bg-white/10"}`}
              >
                <Icon size={14} />
                <span>{modeMeta[item].short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Workspace</div>
        {tabs.map((item) => {
          const selected = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => selectTab(item)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${selected ? "bg-white/10 text-white" : "text-[#BFA993] hover:bg-white/[0.06] hover:text-white"}`}
            >
              <item.icon size={17} className={selected ? "text-[#FFC857]" : "text-[#A08A75]"} />
              <span className="flex-1">{item.label}</span>
              {item.modal && <ArrowUpRight size={13} className="text-[#A08A75]" />}
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-[#FFC857]" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-[#3B241A] p-4">
        <div className="mb-3 flex items-center gap-2 text-[#FFC857]"><Sparkles size={15} /><span className="text-xs font-semibold">BrimLearn insight</span></div>
        <p className="text-xs leading-5 text-[#D9C4B0]">Short, steady practice beats cramming. Your best streaks happen before 9am.</p>
        <button onClick={() => toast("Insights are generated from your learning rhythm.")} className="mt-3 text-xs font-semibold text-[#FFC857]">See how it works <ArrowUpRight className="ml-1 inline" size={12} /></button>
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4 text-[#BFA993]">
        <button className="rounded-lg p-2 hover:bg-white/10" onClick={() => toast("Settings are ready for your school workspace.")}><Settings2 size={16} /></button>
        <button className="rounded-lg p-2 hover:bg-white/10" onClick={() => toast("Help center coming soon.")}><LifeBuoy size={16} /></button>
        {isAuthenticated && <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-[#F28B78] hover:bg-white/10"><LogOut size={15} /> Sign out</button>}
        <span className="ml-auto text-[10px]">v0.1 demo</span>
      </div>
    </aside>
  );
}