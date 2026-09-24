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
      return "bg-[#E8EFF9] text-[#274852]";
    case "admin":
      return "bg-[#EFE8FC] text-[#8B78C7]";
    case "parent":
      return "bg-[#FFF1CD] text-[#B67A17]";
    case "student":
      return "bg-[#E9EED9] text-[#4B6B3C]";
    default:
      return "bg-[#F7EFE3] text-[#765F4F]";
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
    <header className="flex h-[76px] items-center justify-between border-b border-[#E2CDB8] bg-[#F7F0E6]/90 px-5 backdrop-blur lg:px-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-[#1A1512] hover:bg-[#F3E9DE] lg:hidden"><Menu size={20} /></button>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7361]">{modeMeta[mode].label}</div>
          <div className="mt-1 font-display text-xl font-semibold tracking-[-0.04em] text-[#1A1512]">{mode === "learner" ? `Good morning, ${firstName}` : `${modeMeta[mode].label.replace(" view", "")} dashboard`}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-[#FFF1CD] px-3 py-2 text-xs font-semibold text-[#9A6712] sm:flex"><Flame size={14} fill="currentColor" /> 4 day streak</div>
        <button onClick={() => toast("You are all caught up.")} className="relative rounded-xl p-2.5 text-[#765F4F] hover:bg-[#F3E9DE]"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#F0755C]" /></button>
        {isAuthenticated ? (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-[#F3E9DE]" title={`Signed in as ${roleLabel(user?.role)}`}>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#F28B78] text-xs font-bold text-[#5A2F22]">{firstName.slice(0, 2).toUpperCase()}</div>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold text-[#1A1512]">{firstName}</div>
                <div className={`mt-0.5 rounded px-1.5 py-px text-[10px] font-bold ${roleTone(user?.role)}`}>{roleLabel(user?.role)}</div>
              </div>
              <ChevronDown size={14} className={`text-[#8A7361] transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#E2CDB8] bg-[#FFFDF8] shadow-[0_20px_50px_rgba(55,33,22,.12)]">
                <div className="border-b border-[#F3E9DE] px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#F28B78] text-xs font-bold text-[#5A2F22]">{firstName.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1A1512]">{user?.name ?? "Learner"}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleTone(user?.role)}`}>{roleLabel(user?.role)}</span>
                        <span className="truncate text-[11px] text-[#A08A75]">{user?.email ?? ""}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="py-1.5">
                  <button onClick={() => { setMenuOpen(false); setLocation("/profile"); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#3B241A] hover:bg-[#F7EFE3]"><UserRound size={16} className="text-[#8A7361]" /> Profile</button>
                  <button onClick={() => { setMenuOpen(false); setLocation("/settings"); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#3B241A] hover:bg-[#F7EFE3]"><Settings2 size={16} className="text-[#8A7361]" /> Settings</button>
                  {modeMeta[mode].short === "Class" || modeMeta[mode].short === "Teacher" ? (
                    <button onClick={() => { setMenuOpen(false); toast("Your recent classroom rating is 4.9 / 5 from families."); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#3B241A] hover:bg-[#F7EFE3]"><Star size={16} className="text-[#B67A17]" /> Teacher rating: 4.9</button>
                  ) : null}
                  <div className="my-1.5 border-t border-[#F3E9DE]" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#A94A3D] hover:bg-[#F8EAE3]"><LogOut size={16} /> Sign out</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-full bg-[#FFF1CD] px-3 py-2 text-xs font-semibold text-[#9A6712]">Demo preview</div>
        )}
      </div>
    </header>
  );
}
