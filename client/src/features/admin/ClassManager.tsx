import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type AdminUser, type ClassGroup, api } from "@/_core/api";
import { Layers3, GraduationCap, Trash2, Plus, BookOpen, Users } from "lucide-react";

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

type Draft = { name: string; grade: string; subject: string };

export function ClassManager() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>({ name: "", grade: "", subject: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoaded(true);
    try {
      const [classList, userList] = await Promise.all([api.listAdminClasses(), api.listAdminUsers()]);
      setClasses(classList);
      setUsers(userList);
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server." : "Could not load classes.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tutors = useMemo(() => users.filter((user) => user.role === "tutor"), [users]);
  const students = useMemo(() => users.filter((user) => user.role === "student"), [users]);
  const studentsById = useMemo(() => new Map(students.map((item) => [item.id, item])), [students]);

  const createClass = async () => {
    if (!draft.name.trim()) {
      toast.error("Give the class a name.");
      return;
    }
    setPending("create");
    try {
      const created = await api.createAdminClass({
        name: draft.name.trim(),
        grade: draft.grade || null,
        subject: draft.subject.trim() || null,
      });
      setClasses((current) => [created, ...current]);
      setDraft({ name: "", grade: "", subject: "" });
      setCreating(false);
      setExpanded(created.id);
      toast.success("Class created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the class.");
    } finally {
      setPending(null);
    }
  };

  const assignTutor = async (classId: string, tutorId: string) => {
    const tutor = users.find((user) => user.id === tutorId);
    setPending(`tutor-${classId}`);
    try {
      const updated = await api.updateAdminClass(classId, { tutorId: tutorId || null, tutorName: tutor?.name ?? null });
      setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(tutorId ? "Teacher assigned." : "Teacher unassigned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign the teacher.");
    } finally {
      setPending(null);
    }
  };

  const toggleStudent = async (classData: ClassGroup, studentId: string) => {
    const enrolled = classData.studentIds.includes(studentId);
    const studentIds = enrolled ? classData.studentIds.filter((id) => id !== studentId) : [...classData.studentIds, studentId];
    setPending(`student-${studentId}`);
    try {
      const updated = await api.updateAdminClass(classData.id, { studentIds });
      setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the roster.");
    } finally {
      setPending(null);
    }
  };

  const deleteClass = async (classData: ClassGroup) => {
    setPending(`delete-${classData.id}`);
    try {
      await api.removeAdminClass(classData.id);
      setClasses((current) => current.filter((item) => item.id !== classData.id));
      toast.success("Class deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the class.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <Layers3 size={13} /> Classes
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">Who's learning with who.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Create class groups, assign a teacher, and add students. Teachers see their classes in the Tutor workspace and can build quizzes around them.
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        {creating ? (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-[#F7EFE3] p-4">
            <label className="block text-xs font-semibold text-[#765F4F]">
              Class name
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="E.g. Year 7 — Mr Ahuja"
                className="mt-2 w-52 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none"
              />
            </label>
            <label className="block text-xs font-semibold text-[#765F4F]">
              Grade
              <select
                value={draft.grade}
                onChange={(event) => setDraft({ ...draft, grade: event.target.value })}
                className="mt-2 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#765F4F] outline-none"
              >
                <option value="">All grades</option>
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#765F4F]">
              Subject
              <input
                value={draft.subject}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                placeholder="E.g. Mathematics"
                className="mt-2 w-44 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={createClass}
                disabled={pending !== null}
                className="rounded-full bg-[#FFC857] px-4 py-2.5 text-sm font-semibold text-[#1A1512] transition disabled:opacity-50"
              >
                {pending === "create" ? "Creating…" : "Create class"}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-full px-3 py-2.5 text-sm font-semibold text-[#765F4F] hover:bg-[#F7EFE3]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#3B241A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2E1B12]"
          >
            <Plus size={15} /> New class
          </button>
        )}

        <div className="mt-6">
          {!loaded ? (
            <p className="text-sm text-[#A08A75]">Loading classes…</p>
          ) : classes.length === 0 ? (
            <p className="rounded-2xl bg-[#F7EFE3] p-4 text-sm text-[#765F4F]">
              No classes yet. Create one, assign a teacher, and add students.
            </p>
          ) : (
            <div className="space-y-3">
              {classes.map((classData) => {
                const open = expanded === classData.id;
                return (
                  <div key={classData.id} className="rounded-2xl border border-[#F3E9DE] bg-[#FFFDF8]">
                    <button
                      onClick={() => setExpanded(open ? null : classData.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E9DE] text-[#765F4F]">
                          <GraduationCap size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[#3B241A]">{classData.name}</span>
                            {classData.subject && (
                              <span className="rounded-full bg-[#F3E9DE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#765F4F]">{classData.subject}</span>
                            )}
                            {classData.grade && (
                              <span className="rounded-full bg-[#E7F0DD] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4B6B3C]">Grade {classData.grade}</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-[#A08A75]">
                            {classData.tutorName ?? "No teacher assigned"} · {classData.studentIds.length} student{classData.studentIds.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#8A7361]">{open ? "Collapse" : "Manage →"}</span>
                    </button>

                    {open && (
                      <div className="border-t border-[#F3E9DE] px-4 py-4">
                        <div className="grid gap-5 lg:grid-cols-2">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
                              <BookOpen size={14} /> Teacher
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <select
                                value={classData.tutorId ?? ""}
                                onChange={(event) => assignTutor(classData.id, event.target.value)}
                                disabled={pending !== null}
                                className="flex-1 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#765F4F] outline-none disabled:opacity-60"
                              >
                                <option value="">— No teacher —</option>
                                {tutors.map((tutor) => (
                                  <option key={tutor.id} value={tutor.id}>{tutor.name ?? "Unnamed teacher"}</option>
                                ))}
                              </select>
                            </div>
                            {tutors.length === 0 && (
                              <p className="mt-2 text-xs text-[#A08A75]">No teacher accounts yet — add a teacher on the Users tab before assigning classes.</p>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
                              <Users size={14} /> Roster ({classData.studentIds.length})
                            </div>
                            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                              {students.length === 0 ? (
                                <p className="rounded-xl bg-[#F7EFE3] px-3 py-2.5 text-xs text-[#765F4F]">
                                  No student accounts yet. Students appear here once they sign up.
                                </p>
                              ) : students.length === classData.studentIds.length ? (
                                <p className="rounded-xl bg-[#F7EFE3] px-3 py-2.5 text-xs text-[#765F4F]">Every student is enrolled.</p>
                              ) : (
                                students.map((student) => {
                                  const enrolled = classData.studentIds.includes(student.id);
                                  return (
                                    <label
                                      key={student.id}
                                      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-[#F7EFE3]"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={enrolled}
                                          onChange={() => toggleStudent(classData, student.id)}
                                          className="h-4 w-4 accent-[#4B6B3C]"
                                        />
                                        <span className="truncate text-[#3B241A]">{student.name ?? "Unnamed student"}</span>
                                        <span className="hidden text-xs text-[#A08A75] sm:inline">{student.email}</span>
                                      </span>
                                      {enrolled && (
                                        <span className="rounded-full bg-[#4B6B3C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">In</span>
                                      )}
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#F7EFE3] px-4 py-3">
                          <span className="text-xs text-[#765F4F]">
                            {classData.tutorName
                              ? `${classData.tutorName} teaches ${classData.studentIds.length} student${classData.studentIds.length === 1 ? "" : "s"} in ${classData.name}.`
                              : "Assign a teacher and roster to see the summary."}
                          </span>
                          <button
                            onClick={() => deleteClass(classData)}
                            disabled={pending !== null}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#C97064] px-3 py-1.5 text-xs font-semibold text-[#A94A3D] transition hover:bg-[#F8EAE3] disabled:opacity-50"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}