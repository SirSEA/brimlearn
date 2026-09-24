import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type AdminUser, type AuthRole, type AuthStatus, type ClassGroup } from "@/_core/api";
import { X, Mail, KeyRound, ShieldCheck, ShieldAlert, Trash2, BookOpen, GraduationCap, Plus, LogOut } from "lucide-react";

const ROLE_LABEL: Record<AuthRole, string> = {
  user: "User",
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Admin",
};

type UserDetailModalProps = {
  user: AdminUser;
  isSelf: boolean;
  onClose: () => void;
  onChanged: (updated: AdminUser) => void;
  onRemoved: (openId: string) => void;
};

export function UserDetailModal({ user, isSelf, onClose, onChanged, onRemoved }: UserDetailModalProps) {
  const [role, setRole] = useState<AuthRole>(user.role);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    api
      .listAdminClasses()
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  const busyWith = (key: string) => (busy === null ? setBusy(key) : toast.error("One action at a time."));

  const saveRole = async () => {
    if (role === user.role || user.isOwner) return;
    busyWith("role");
    try {
      const updated = await api.setAdminUserRole(user.id, role);
      onChanged(updated);
      toast.success(`${updated.name ?? "User"} is now ${ROLE_LABEL[role].toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change that role.");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async () => {
    if (user.isOwner) return;
    const next: AuthStatus = user.status === "suspended" ? "active" : "suspended";
    busyWith("status");
    try {
      const updated = await api.setAdminUserStatus(user.id, next);
      onChanged(updated);
      toast.success(next === "suspended" ? "Account suspended. Sign-in is now blocked." : "Account reactivated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that account.");
    } finally {
      setBusy(null);
    }
  };

  const sendReset = async () => {
    busyWith("reset");
    try {
      const result = await api.sendAdminUserReset(user.id);
      if (result.demoMode && result.resetUrl) {
        navigator.clipboard?.writeText(result.resetUrl).catch(() => undefined);
        toast.info("No mail server is configured. The reset link was copied to your clipboard — send it to the user.");
      } else {
        toast.success("Password reset email sent.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send a reset email.");
    } finally {
      setBusy(null);
    }
  };

  const sendComposerMail = async () => {
    busyWith("mail");
    try {
      const result = await api.sendAdminUserEmail({ openId: user.id, subject: subject.trim(), body: body.trim() });
      if (!result.delivered) {
        const mailto = `mailto:${user.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        toast.info("No mail server is configured. Opening your mail app instead…");
        window.location.href = mailto;
      } else {
        toast.success(`Message sent to ${user.email}.`);
      }
      setComposerOpen(false);
      setSubject("");
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send that message.");
    } finally {
      setBusy(null);
    }
  };

  const assignClass = async (classId: string, classData: ClassGroup) => {
    busyWith(`assign-${classId}`);
    try {
      if (user.role === "tutor") {
        const updated = await api.updateAdminClass(classId, { tutorId: user.id, tutorName: user.name });
        setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Class assigned to this teacher.");
      } else if (user.role === "student") {
        const studentIds = Array.from(new Set([...classData.studentIds, user.id]));
        const updated = await api.updateAdminClass(classId, { studentIds });
        setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Student added to the class.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign the class.");
    } finally {
      setBusy(null);
    }
  };

  const unassignClass = async (classId: string) => {
    busyWith(`unassign-${classId}`);
    try {
      if (user.role === "tutor") {
        const updated = await api.updateAdminClass(classId, { tutorId: null, tutorName: null });
        setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Class unassigned.");
      } else if (user.role === "student") {
        const classData = classes.find((item) => item.id === classId);
        if (!classData) return;
        const updated = await api.updateAdminClass(classId, { studentIds: classData.studentIds.filter((id) => id !== user.id) });
        setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Student removed from the class.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the class.");
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    busyWith("delete");
    try {
      await api.removeAdminUser(user.id);
      toast.success(`${user.name ?? "The account"} was deleted.`);
      onRemoved(user.id);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the account.");
      setDeleteArmed(false);
    } finally {
      setBusy(null);
    }
  };

  const tutorClasses = classes.filter((item) => item.tutorId === user.id);
  const studentClasses = classes.filter((item) => item.studentIds.includes(user.id));
  const assignableClasses =
    user.role === "tutor"
      ? classes.filter((item) => item.tutorId !== user.id)
      : user.role === "student"
        ? classes.filter((item) => !item.studentIds.includes(user.id))
        : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button className="absolute inset-0 bg-[#1A1512]/50" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[27px] bg-[#FFFDF8] shadow-2xl sm:rounded-[27px]">
        <div className="flex items-start justify-between gap-4 bg-[#3B241A] p-6 text-white sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFC857] text-base font-bold text-[#1A1512]">
              {(user.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-display text-xl font-semibold tracking-[-0.02em]">{user.name ?? "Unnamed user"}</span>
                {user.isOwner && (
                  <span className="rounded-full bg-[#FFC857]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFC857]">Owner</span>
                )}
                {isSelf && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#D9C4B0]">You</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#D9C4B0]">
                <span className="flex items-center gap-1"><Mail size={12} /> {user.email ?? "No email"}</span>
                <span className="flex items-center gap-1"><LogOut size={12} /> {user.loginMethod ?? "unknown"}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[#D9C4B0] hover:bg-white/10 hover:text-white"><X size={17} /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-7">
          <div className="grid gap-3 rounded-2xl bg-[#F7EFE3] p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A08A75]">Joined</span>
              <span className="font-semibold text-[#3B241A]">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A08A75]">Last sign-in</span>
              <span className="font-semibold text-[#3B241A]">{new Date(user.lastSignedIn).toLocaleDateString()}</span>
            </div>
          </div>

          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Role</div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select
                value={role}
                disabled={user.isOwner || busy !== null}
                onChange={(event) => setRole(event.target.value as AuthRole)}
                className="rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#765F4F] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40 disabled:opacity-60"
              >
                {(Object.keys(ROLE_LABEL) as AuthRole[]).map((item) => (
                  <option key={item} value={item}>{ROLE_LABEL[item]}</option>
                ))}
              </select>
              <button
                onClick={saveRole}
                disabled={role === user.role || user.isOwner || busy !== null}
                className="rounded-full bg-[#3B241A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2E1B12] disabled:opacity-50"
              >
                Apply role
              </button>
              {user.isOwner && <span className="text-xs text-[#A08A75]">The owner's role is locked.</span>}
            </div>
          </section>

          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Account status</div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${
                  user.status === "suspended" ? "bg-[#F8EAE3] text-[#A94A3D]" : "bg-[#E7F0DD] text-[#4B6B3C]"
                }`}
              >
                {user.status === "suspended" ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
                {user.status === "suspended" ? "Suspended" : "Active"}
              </span>
              <button
                onClick={toggleStatus}
                disabled={user.isOwner || busy !== null}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  user.status === "suspended"
                    ? "bg-[#E7F0DD] text-[#2E4523] hover:bg-[#D9E8C8]"
                    : "border border-[#C97064] text-[#A94A3D] hover:bg-[#F8EAE3]"
                }`}
              >
                {user.status === "suspended" ? "Reactivate account" : "Suspend account"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[#A08A75]">
              Suspended users can't sign in and lose access to the workspace until reactivated.
            </p>
          </section>

          {(user.role === "tutor" || user.role === "student") && (
            <section>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
                <BookOpen size={14} />
                {user.role === "tutor" ? "Classes they teach" : "Classes they're in"}
              </div>
              <div className="mt-3 space-y-2">
                {(user.role === "tutor" ? tutorClasses : studentClasses).length === 0 && (
                  <p className="rounded-2xl bg-[#F7EFE3] px-4 py-3 text-sm text-[#765F4F]">
                    {user.role === "tutor" ? "No classes assigned yet." : "Not enrolled in any classes yet."}
                  </p>
                )}
                {(user.role === "tutor" ? tutorClasses : studentClasses).map((classData) => (
                  <div key={classData.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7EFE3] px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 truncate text-sm font-semibold text-[#3B241A]">
                        <GraduationCap size={15} className="shrink-0 text-[#8A7361]" />
                        <span className="truncate">{classData.name}</span>
                        {classData.subject && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#765F4F]">{classData.subject}</span>}
                      </div>
                      <div className="mt-0.5 pl-[23px] text-xs text-[#A08A75]">
                        {classData.studentIds.length} students · {classData.grade ?? "All grades"}
                      </div>
                    </div>
                    <button onClick={() => unassignClass(classData.id)} disabled={busy !== null} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-[#A94A3D] transition hover:bg-[#F8EAE3] disabled:opacity-50">
                      Remove
                    </button>
                  </div>
                ))}
                {assignableClasses.length > 0 && (
                  <button
                    onClick={() => {
                      const target = assignableClasses[0];
                      assignClass(target.id, target);
                    }}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#8CAE70] px-3 py-2 text-xs font-semibold text-[#4B6B3C] transition hover:bg-[#E7F0DD] disabled:opacity-50"
                  >
                    <Plus size={13} /> Assign next: {assignableClasses[0].name}
                  </button>
                )}
                {assignableClasses.length > 1 && (
                  <p className="text-xs text-[#A08A75]">{assignableClasses.length - 1} more unassigned class{assignableClasses.length - 1 > 1 ? "es" : ""} on the Classes tab.</p>
                )}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
              <Mail size={14} /> Send an email
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={sendReset}
                  disabled={busy !== null || user.loginMethod !== "email"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#3B241A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2E1B12] disabled:opacity-50"
                >
                  <KeyRound size={14} /> Send password reset
                </button>
                <button
                  onClick={() => setComposerOpen((value) => !value)}
                  className="rounded-full border border-[#E2CDB8] px-4 py-2 text-sm font-semibold text-[#765F4F] transition hover:bg-[#F7EFE3]"
                >
                  {composerOpen ? "Hide composer" : "Write a message"}
                </button>
              </div>
              {user.loginMethod !== "email" && (
                <p className="text-xs text-[#A08A75]">Password reset is only for email accounts — this user signs in with Google.</p>
              )}
              {composerOpen && (
                <div className="space-y-3 rounded-2xl border border-[#E2CDB8] p-4">
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Subject"
                    maxLength={120}
                    className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
                  />
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={`Message to ${user.name ?? "this user"}…`}
                    maxLength={4000}
                    rows={4}
                    className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={sendComposerMail}
                      disabled={busy !== null || !subject.trim() || !body.trim() || !user.email}
                      className="rounded-full bg-[#FFC857] px-4 py-2 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857] disabled:opacity-50"
                    >
                      Send message
                    </button>
                    {!user.email && <span className="text-xs text-[#A08A75]">This user has no email address to send to.</span>}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={`rounded-2xl border p-4 ${deleteArmed ? "border-[#C97064] bg-[#F8EAE3]" : "border-[#F3E9DE]"}`}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A94A3D]">
              <Trash2 size={14} /> Danger zone
            </div>
            <p className="mt-2 text-xs text-[#8A7361]">
              Deletes the account, removes the user from all classes, and can't be undone. The workspace owner and your own account are protected.
            </p>
            {!deleteArmed ? (
              <button
                onClick={() => setDeleteArmed(true)}
                disabled={user.isOwner || isSelf || busy !== null}
                className="mt-3 rounded-full border border-[#C97064] px-4 py-2 text-sm font-semibold text-[#A94A3D] transition hover:bg-[#F8EAE3] disabled:opacity-50"
              >
                Delete account…
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#A94A3D]">Type <span className="rounded bg-white px-1.5 py-0.5 font-mono">delete</span> to confirm:</span>
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="delete"
                  autoFocus
                  className="w-32 rounded-xl border border-[#C97064] bg-white px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={deleteAccount}
                  disabled={confirmText.toLowerCase() !== "delete" || busy !== null}
                  className="rounded-full bg-[#A94A3D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E3A30] disabled:opacity-50"
                >
                  {busy === "delete" ? "Deleting…" : "Permanently delete"}
                </button>
                <button onClick={() => setDeleteArmed(false)} className="rounded-full px-3 py-2 text-sm font-semibold text-[#765F4F] hover:bg-white/60">
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}