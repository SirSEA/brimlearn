import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Flame, LogOut, Menu, Settings2, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Mode, modeMeta } from "./shell";

function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "tutor":
      return "Teacher";
    case "admin":
      return "Admin";
    case "parent":
      return "Parent";
    case "student":
      return "Student";
    default:
      return "Learner";
  }
}

function roleTone(role: string | null | undefined): string {
  switch (role) {
    case "tutor":
      return "bg-[#e7f2ff] text-[#3774ac]";
    case "admin":
      return "bg-[#f3e6ff] text-[#8053a9]";
    case "parent":
      return "bg-[#fff1d7] text-[#b07a1f]";
    case "student":
      return "bg-[#e5f5ed] text-[#2f7a57]";
    default:
      return "bg-[#f4f7ef] text-[#527064]";
  }
}

export function Header({ mode, setMobileOpen }: { mode: Mode; setMobileOpen: (open: boolean) => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstName = user?.name?.split(" ")[0] || "Amira";

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
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
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-[#edf1e9]" title={`Signed in as ${roleLabel(user?.role)}`}>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ff9a87] text-xs font-bold text-[#63382d]">{firstName.slice(0, 2).toUpperCase()}</div>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold text-[#183c31]">{firstName}</div>
                <div className={`mt-0.5 rounded px-1.5 py-px text-[10px] font-bold ${roleTone(user?.role)}`}>{roleLabel(user?.role)}</div>
              </div>
              <ChevronDown size={14} className={`text-[#7d958b] transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e3e8df] bg-white shadow-[0_20px_50px_rgba(26,53,40,.12)]">
                <div className="border-b border-[#eef1ea] px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ff9a87] text-xs font-bold text-[#63382d]">{firstName.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#183c31]">{user?.name ?? "Learner"}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleTone(user?.role)}`}>{roleLabel(user?.role)}</span>
                        <span className="truncate text-[11px] text-[#8aa096]">{user?.email ?? ""}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="py-1.5">
                  <button onClick={() => { setMenuOpen(false); toast("Profile editing is in the settings tab."); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#3a5c4f] hover:bg-[#f4f7f1]"><UserRound size={16} className="text-[#7d958b]" /> Profile</button>
                  <button onClick={() => { setMenuOpen(false); toast("Settings are ready for your school workspace."); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#3a5c4f] hover:bg-[#f4f7f1]"><Settings2 size={16} className="text-[#7d958b]" /> Settings</button>
                  {modeMeta[mode].short === "Class" || modeMeta[mode].short === "Teacher" ? (
                    <button onClick={() => { setMenuOpen(false); toast("Your recent classroom rating is 4.9 / 5 from families."); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#3a5c4f] hover:bg-[#f4f7f1]"><Star size={16} className="text-[#c58e3d]" /> Teacher rating: 4.9</button>
                  ) : null}
                  <div className="my-1.5 border-t border-[#eef1ea]" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#b0533f] hover:bg-[#fdf3ef]"><LogOut size={16} /> Sign out</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-full bg-[#fff1c9] px-3 py-2 text-xs font-semibold text-[#916d22]">Demo preview</div>
        )}
      </div>
    </header>
  );
}
