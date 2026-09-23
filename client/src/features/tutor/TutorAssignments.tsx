import { CheckCircle2, ClipboardList, FileText, GraduationCap, Sparkles, Target, User, Users, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { api, type Assignment, type AssignmentDifficulty, type AssignmentType, type CreateAssignmentInput } from "@/_core/api";
import { publishAssignment } from "@/lib/assignmentStore";

type Audience = "class" | "group" | "individual";
type TeacherType = AssignmentType;
type AssignmentItem = {
  id: string;
  type: TeacherType;
  title: string;
  subject: string;
  audience: string;
  difficulty: AssignmentDifficulty;
  due: string;
  status: "Scheduled" | "In review";
};

const levels: AssignmentDifficulty[] = ["Easy", "Medium", "Hard", "Advanced"];

const learnerDefaults: Record<string, AssignmentDifficulty> = {
  "Amara Okafor": "Easy",
  "Leo Mensah": "Medium",
  "Zuri Campbell": "Advanced",
  "Tunde Bakare": "Advanced",
  "Nneka Eze": "Medium",
};

const defaultAssignments: AssignmentItem[] = [
  { id: "a1", type: "Quiz", title: "Fractions check-in", subject: "Mathematics", audience: "Whole class", difficulty: "Easy", due: "Wed · 6pm", status: "Scheduled" },
  { id: "a2", type: "Lesson", title: "Perimeter vs area · visual lab", subject: "Mathematics", audience: "Zuri + 2 more", difficulty: "Medium", due: "Thu · 9am", status: "In review" },
];

const allToNames = (audience: Audience, selected: string[]) => {
  if (audience === "class") return Object.keys(learnerDefaults);
  if (audience === "group") return ["Amara Okafor", "Leo Mensah", "Nneka Eze"];
  return selected;
};

function toItem(assignment: Assignment): AssignmentItem {
  return {
    id: assignment.id,
    type: assignment.type,
    title: assignment.title,
    subject: assignment.subject,
    audience: assignment.audience,
    difficulty: assignment.difficulty,
    due: assignment.due && assignment.due.trim().length > 0 ? assignment.due.replace(/^Due\s+/i, "") : "No due date",
    status: assignment.status,
  };
}

export function TutorAssignments() {
  const [type, setType] = useState<TeacherType>("Worksheet");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [audience, setAudience] = useState<Audience>("class");
  const [selected, setSelected] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<AssignmentDifficulty>("Medium");
  const [due, setDue] = useState("Sun, Sep 27");
  const [assignments, setAssignments] = useState<AssignmentItem[]>(defaultAssignments);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .listAssignments()
      .then((list) => {
        if (list.length > 0) setAssignments(list.map(toItem));
      })
      .catch(() => {
        // Offline demo — keep the local defaults.
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const previewLearners = allToNames(audience, selected);

  const assign = async () => {
    if (!title.trim()) {
      toast("Give the assignment a title first.");
      return;
    }
    const audienceLabel = audience === "class" ? "Whole class" : audience === "group" ? `Group (${previewLearners.length})` : selected.join(", ");
    const isPractice = type === "Practice";
    const assignedDue = isPractice ? "No due date" : due;

    const input: CreateAssignmentInput = {
      type,
      title: title.trim(),
      subject,
      audience: audienceLabel,
      audienceKey: audience,
      learnerIds: audience === "individual" ? selected : [],
      difficulty,
      due: isPractice ? null : due,
    };

    try {
      const created = await api.createAssignment(input);
      setAssignments((current) => [toItem(created), ...current.filter((item) => !item.id.startsWith("a"))]);
      toast.success(isPractice
        ? `${type} pushed to learners — practice, no deadline. It now appears in their Tracker.`
        : `${type} assigned to ${audienceLabel} — saved to the class, learners see it in their Tracker.`);
    } catch {
      publishAssignment({ title: input.title, subject, audience: audienceLabel, difficulty, due: isPractice ? null : due });
      setAssignments((current) => [{ id: `pub-${Date.now()}`, type, title: input.title, subject, audience: audienceLabel, difficulty, due: assignedDue, status: "Scheduled" }, ...current]);
      toast.success(isPractice
        ? `${type} pushed locally (offline demo) — it will sync when the backend is reachable.`
        : `${type} saved locally (offline demo) — it will sync when the backend is reachable.`);
    }
    setTitle("");
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><ClipboardList size={13} /> Assignment studio</div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Assign work that fits each learner.</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">Worksheets, quizzes, and lessons — sent to the whole class, a group, or one learner, tuned to their understanding.</p>
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Create assignment</div>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">What are you assigning?</h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["Worksheet", "Quiz", "Lesson", "Practice"] as TeacherType[]).map((item) => {
              const Icon = item === "Worksheet" ? FileText : item === "Quiz" ? Sparkles : item === "Lesson" ? GraduationCap : Target;
              const isPractice = item === "Practice";
              return (
                <button key={item} onClick={() => { setType(item); if (isPractice) setDue(""); else if (!due) setDue("Sun, Sep 27"); }} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${type === item ? "border-[#4B6B3C] bg-[#E9EED9]" : "border-[#F3E9DE] bg-[#FFFDF8] hover:border-[#C8B3A0]"}`}><Icon size={18} className={type === item ? "text-[#4B6B3C]" : "text-[#8A7361]"} /><span className="text-sm font-semibold text-[#3B241A]">{item}</span></button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-[#765F4F]">Title<span className="mt-1.5 block"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Multiplying by 10s" className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70]" /></span></label>
            <label className="text-xs font-semibold text-[#765F4F]">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"><option>Mathematics</option><option>English Studies</option><option>Basic Science</option><option>Social Studies</option></select></label>
            <label className="text-xs font-semibold text-[#765F4F]">Due date{type === "Practice" && <span className="ml-1.5 rounded bg-[#EFE8FC] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#8B78C7]">practice · no deadline</span>}<input value={due} disabled={type === "Practice"} onChange={(event) => setDue(event.target.value)} placeholder={type === "Practice" ? "No due date" : "Sun, Sep 27"} className={`mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70] ${type === "Practice" ? "opacity-50" : ""}`} /></label>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[#765F4F]">Who is it for?</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["class", "Whole class", Users], ["group", "Group", Users2], ["individual", "Individual", User]] as Array<[Audience, string, typeof Users]>).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setAudience(key)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${audience === key ? "border-[#4B6B3C] bg-[#E9EED9] text-[#4B6B3C]" : "border-[#E2CDB8] text-[#765F4F] hover:bg-[#F7EFE3]"}`}><Icon size={14} />{label}</button>
              ))}
            </div>
          </div>

          {audience === "individual" && (
            <div className="mt-4 rounded-2xl bg-[#F7EFE3] p-4">
              <div className="text-xs font-semibold text-[#765F4F]">Choose a learner</div>
              <div className="mt-2 flex flex-wrap gap-2">{Object.keys(learnerDefaults).map((learner) => <button key={learner} onClick={() => setSelected((current) => current.includes(learner) ? [] : [learner])} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${selected.includes(learner) ? "bg-[#C65A2E] text-white" : "bg-[#FFFDF8] text-[#765F4F] shadow-sm hover:bg-[#EFEFDD]"}`}>{learner}</button>)}</div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#F3E9DE] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#765F4F]"><Sparkles size={14} className="text-[#8B78C7]" /> Challenge level</div>
            <p className="mt-1 text-xs text-[#A08A75]">BrimLearn differentiates the questions for each learner — this is the cap so nobody is pushed past their understanding.</p>
            <div className="mt-3 flex flex-wrap gap-2">{levels.map((level) => <button key={level} onClick={() => setDifficulty(level)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${difficulty === level ? "bg-[#8B78C7] text-white" : "bg-[#F7EFE3] text-[#765F4F] hover:bg-[#EFEFDD]"}`}>{level}</button>)}</div>
          </div>

          <button onClick={assign} className="mt-6 w-full rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#A84A22] sm:w-auto sm:px-6">Assign {type.toLowerCase()}</button>
        </div>

        <div className="space-y-5">
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Differentiation preview</div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.05em] text-[#1A1512]">How each learner gets this.</h2>
            <div className="mt-4 space-y-2.5">
              {previewLearners.map((learner) => <div key={learner} className="flex items-center justify-between rounded-xl bg-[#F7EFE3] p-3"><span className="text-sm font-semibold text-[#3B241A]">{learner}</span><span className="rounded-full bg-[#FFFDF8] px-2.5 py-1 text-[10px] font-bold text-[#8B78C7] shadow-sm">{learnerDefaults[learner]}</span></div>)}
            </div>
          </div>
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="flex items-center justify-between"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Recent assignments</div><span className="rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]">{loading ? "…" : assignments.length}</span></div>
            <div className="mt-4 space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="rounded-2xl border border-[#F3E9DE] p-3.5"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#3B241A]">{assignment.title}</div><div className="mt-0.5 truncate text-xs text-[#A08A75]">{assignment.type} · {assignment.subject} · {assignment.audience}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${assignment.status === "Scheduled" ? "bg-[#E9EED9] text-[#4B6B3C]" : "bg-[#FFF1CD] text-[#9A6712]"}`}>{assignment.status}</span></div><div className="mt-2.5 flex items-center gap-2 text-[10px] text-[#A08A75]"><CheckCircle2 size={12} className="text-[#4B6B3C]" /> {assignment.difficulty} cap{assignment.due === "No due date" ? <span className="rounded bg-[#EFE8FC] px-1.5 py-0.5 font-bold text-[#8B78C7]">no due date</span> : <span>due {assignment.due}</span>}</div></div>)}</div>
            {!loading && assignments.length === 0 && <div className="mt-3 rounded-2xl bg-[#F7EFE3] p-5 text-center text-sm text-[#8A7361]">No assignments yet. Create one above and it will show up here and on every learner’s Tracker.</div>}
          </div>
        </div>
      </section>
    </>
  );
}