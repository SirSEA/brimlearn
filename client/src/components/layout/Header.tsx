import { Bell, Flame, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Mode, modeMeta } from "./shell";

export function Header({ mode, setMobileOpen }: { mode: Mode; setMobileOpen: (open: boolean) => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const firstName = user?.name?.split(" ")[0] || "Amira";

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out. See you soon.");
    } catch {
      toast("Signed out locally.");
    }
    setLocation("/login");
  };

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#dfe5d9] bg-[#fbfbf6]/90 px-5 backdrop-blur lg:px-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-[#345d4f] hover:bg-[#edf1e9] lg:hidden"><Menu size={20} /></button>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d958b]">{modeMeta[mode].label}</div>
          <div className="mt-1 font-display text-xl font-semibold tracking-[-0.04em] text-[#183c31]">{mode === "learner" ? `Good morning, ${firstName}` : `${modeMeta[mode].label.replace(" view", "")} dashboard`}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-[#fff1c9] px-3 py-2 text-xs font-semibold text-[#916d22] sm:flex"><Flame size={14} fill="currentColor" /> 4 day streak</div>
        <button onClick={() => toast("You are all caught up.")} className="relative rounded-xl p-2.5 text-[#527064] hover:bg-[#edf1e9]"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ff7b66]" /></button>
        {isAuthenticated ? (
          <>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ff9a87] text-xs font-bold text-[#63382d]">{firstName.slice(0, 2).toUpperCase()}</div>
            <button onClick={handleLogout} title="Sign out" className="rounded-xl p-2.5 text-[#527064] hover:bg-[#edf1e9]"><LogOut size={18} /></button>
          </>
        ) : (
          <div className="rounded-full bg-[#fff1c9] px-3 py-2 text-xs font-semibold text-[#916d22]">Demo preview</div>
        )}
      </div>
    </header>
  );
}