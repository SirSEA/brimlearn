import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type AdminOverview, api } from "@/_core/api";
import { BookOpen, ClipboardList, Globe, Users, Video, type LucideIcon } from "lucide-react";

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E2CDB8] bg-[#FFFDF8] p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A08A75]">
        <Icon size={13} className="text-[#4B6B3C]" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">{value}</div>
    </div>
  );
}

export function AdminToday() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoaded(true);
    try {
      setOverview(await api.getAdminOverview());
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server to see live numbers." : "Could not load the overview right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats: Array<{ icon: LucideIcon; label: string; value: number }> = [
    { icon: Users, label: "Accounts", value: overview?.users ?? 0 },
    { icon: BookOpen, label: "Resources", value: overview?.resources ?? 0 },
    { icon: Video, label: "Live sessions", value: overview?.liveSessions ?? 0 },
    { icon: Globe, label: "Schemes of work", value: overview?.schemes ?? 0 },
    { icon: ClipboardList, label: "Assignments", value: overview?.assignments ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
            <Users size={13} /> School live overview
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">The whole school, at a glance.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
            Live counts from your workspace. Use the <span className="font-semibold text-white">Website</span> tab to edit the public landing page and the{" "}
            <span className="font-semibold text-white">Users</span> tab to manage roles, suspend accounts, and assign classes.
          </p>
        </div>
        {!loaded ? (
          <div className="mt-8 text-sm text-[#D9C4B0]">Loading live counts…</div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Newest accounts</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Recently joined.</h2>
          </div>
        </div>
        {!loaded ? (
          <p className="mt-4 text-sm text-[#A08A75]">Loading…</p>
        ) : overview?.recentUsers.length ? (
          <div className="mt-5 divide-y divide-[#F3E9DE]">
            {overview.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#3B241A]">{user.name ?? "Unnamed learner"}</div>
                  <div className="mt-0.5 truncate text-xs text-[#A08A75]">{user.email ?? "—"} · {user.loginMethod ?? "unknown"} · joined {new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
                <span className="shrink-0 rounded-full bg-[#F3E9DE] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#765F4F]">{user.role}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-[#F7EFE3] p-4 text-sm text-[#765F4F]">No accounts yet. Once learners, parents, and tutors sign up they appear here.</p>
        )}
      </section>
    </div>
  );
}