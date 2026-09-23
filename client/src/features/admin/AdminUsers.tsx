import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type AdminUser, type AuthRole, api } from "@/_core/api";
import { Users } from "lucide-react";

const ROLES: AuthRole[] = ["user", "student", "parent", "tutor", "admin"];
const ROLE_LABEL: Record<AuthRole, string> = {
  user: "User",
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Admin",
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});

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

  const changeRole = async (user: AdminUser, role: AuthRole) => {
    if (role === user.role) return;
    setPending((current) => ({ ...current, [user.id]: true }));
    try {
      const updated = await api.setAdminUserRole(user.id, role);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`${updated.name ?? "User"} is now ${ROLE_LABEL[role].toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change that role.");
    } finally {
      setPending((current) => ({ ...current, [user.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <Users size={13} /> Team &amp; access
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">Who has access, and how.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Everyone with an account, newest first. Promote a tutor to admin to let them manage the website, or demote anyone who no longer needs access.
          The workspace owner keeps the admin role and cannot be demoted.
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        {!loaded ? (
          <p className="text-sm text-[#A08A75]">Loading accounts…</p>
        ) : users.length === 0 ? (
          <p className="rounded-2xl bg-[#F7EFE3] p-4 text-sm text-[#765F4F]">No accounts yet. Accounts appear here as soon as people sign up.</p>
        ) : (
          <div className="divide-y divide-[#F3E9DE]">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#3B241A]">{user.name ?? "Unnamed user"}</span>
                    <span className="rounded-full bg-[#F3E9DE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#765F4F]">{ROLE_LABEL[user.role]}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-[#A08A75]">
                    {user.email ?? "—"} · signed in via {user.loginMethod ?? "—"} · joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <select
                  value={user.role}
                  disabled={Boolean(pending[user.id])}
                  onChange={(event) => changeRole(user, event.target.value as AuthRole)}
                  className="shrink-0 self-start rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2 text-xs font-semibold text-[#765F4F] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40 disabled:opacity-60 sm:self-auto"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}