import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type AdminUser, type AuthRole, api } from "@/_core/api";
import { Users, Search, ShieldAlert } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { UserDetailModal } from "./UserDetailModal";
import { useAuth } from "@/_core/hooks/useAuth";

const ROLE_LABEL: Record<AuthRole, string> = {
  user: "User",
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Admin",
};

const ROLE_RANK: Record<AuthRole, number> = { admin: 0, tutor: 1, parent: 2, student: 3, user: 4 };

type Filter = "all" | AuthRole | "suspended" | "active";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admins" },
  { key: "tutor", label: "Teachers" },
  { key: "student", label: "Students" },
  { key: "parent", label: "Parents" },
  { key: "suspended", label: "Suspended" },
];

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoaded(true);
    try {
      setUsers(await api.listAdminUsers());
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server to view the team." : "Could not load accounts.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users
      .filter((user) => {
        if (filter === "suspended") return user.status === "suspended";
        if (filter === "active") return user.status === "active";
        if (filter !== "all") return user.role === filter;
        return true;
      })
      .filter((user) => {
        if (!needle) return true;
        return (user.name ?? "").toLowerCase().includes(needle) || (user.email ?? "").toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
        const rankDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [users, query, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateUser = (updated: AdminUser) => {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelected(updated);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <Users size={13} /> Users
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">Who has access, and how.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Every account, newest first. Click anyone for the full profile: change roles, suspend or reactivate, send a reset link or a message,
          assign classes to teachers and students, or delete an account. The workspace owner keeps admin forever.
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08A75]" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] py-2.5 pl-9 pr-3 text-sm text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => { setFilter(item.key); setPage(1); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === item.key ? "bg-[#3B241A] text-white" : "bg-[#F3E9DE] text-[#765F4F] hover:bg-[#EADDCB]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {!loaded ? (
            <p className="text-sm text-[#A08A75]">Loading accounts…</p>
          ) : visible.length === 0 ? (
            <p className="rounded-2xl bg-[#F7EFE3] p-4 text-sm text-[#765F4F]">
              {users.length === 0 ? "No accounts yet. Accounts appear here as soon as people sign up." : "No accounts match that filter."}
            </p>
          ) : (
            <>
              <div className="divide-y divide-[#F3E9DE]">
                {pageItems.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelected(user)}
                  className="flex w-full flex-col gap-3 py-3.5 text-left transition hover:bg-[#FDF9F1] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E9DE] text-sm font-bold text-[#765F4F]">
                      {(user.name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[#3B241A]">{user.name ?? "Unnamed user"}</span>
                        <span className="rounded-full bg-[#F3E9DE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#765F4F]">
                          {ROLE_LABEL[user.role]}
                        </span>
                        {user.isOwner && (
                          <span className="rounded-full bg-[#3B241A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFC857]">Owner</span>
                        )}
                        {user.status === "suspended" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F8EAE3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A94A3D]">
                            <ShieldAlert size={10} /> Suspended
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-xs text-[#A08A75]">
                        {user.email ?? "—"} · {user.loginMethod ?? "—"} · joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-[52px] sm:pl-0">
                    <span className="text-[11px] font-semibold text-[#8A7361]">View profile →</span>
                  </div>
                </button>
              ))}
              </div>
              <Pagination page={currentPage} pageSize={pageSize} total={visible.length} onPageChange={setPage} />
            </>
          )}
        </div>
      </section>

      {selected && (
        <UserDetailModal
          user={selected}
          isSelf={currentUser?.id === selected.id}
          onClose={() => setSelected(null)}
          onChanged={updateUser}
          onRemoved={(openId) => setUsers((current) => current.filter((item) => item.id !== openId))}
        />
      )}
    </div>
  );
}