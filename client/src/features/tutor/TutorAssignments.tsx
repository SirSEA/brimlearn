import { CheckCircle2, ClipboardList, FileText, GraduationCap, Sparkles, User, Users, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type Audience = "class" | "group" | "individual";
type Difficulty = "Easy" | "Medium" | "Hard" | "Advanced";
type Assignment = { id: string; type: string; title: string; subject: string; audience: string; difficulty: Difficulty; due: string; status: "Scheduled" | "In review" };

const levels: Difficulty[] = ["Easy", "Medium", "Hard", "Advanced"];

const learnerDefaults: Record<string, Difficulty> = {
  "Amara Okafor": "Easy",
  "Leo Mensah": "Medium",
  "Zuri Campbell": "Advanced",
  "Tunde Bakare": "Advanced",
  "Nneka Eze": "Medium",
};

const allToNames = (audience: Audience, selected: string[]) => {
  if (audience === "class") return Object.keys(learnerDefaults);
  if (audience === "group") return ["Amara Okafor", "Leo Mensah", "Nneka Eze"];
  return selected;
};

export function TutorAssignments() {
  const [type, setType] = useState("Worksheet");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [audience, setAudience] = useState<Audience>("class");
  const [selected, setSelected] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [due, setDue] = useState("Sun, Sep 27");
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: "a1", type: "Quiz", title: "Fractions check-in", subject: "Mathematics", audience: "Whole class", difficulty: "Easy", due: "Wed · 6pm", status: "Scheduled" },
    { id: "a2", type: "Lesson", title: "Perimeter vs area · visual lab", subject: "Mathematics", audience: "Zuri + 2 more", difficulty: "Medium", due: "Thu · 9am", status: "In review" },
  ]);

  const previewLearners = allToNames(audience, selected);

  const assign = () => {
    if (!title.trim()) {
      toast("Give the assignment a title first.");
      return;
    }
    const audienceLabel = audience === "class" ? "Whole class" : audience === "group" ? `Group (${previewLearners.length})` : selected.join(", ");
    setAssignments((current) => [{ id: `a${Date.now()}`, type, title: title.trim(), subject, audience: audienceLabel, difficulty, due, status: "Scheduled" }, ...current]);
    setTitle("");
    toast.success(`${type} assigned to ${audienceLabel} — differentiated across learners.`);
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><ClipboardList size={13} /> Assignment studio</div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Assign work that fits each learner.</h1>
          <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Worksheets, quizzes, and lessons — sent to the whole class, a group, or one learner, tuned to their understanding.</p>
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Create assignment</div>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">What are you assigning?</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Worksheet", "Quiz", "Lesson"].map((item) => {
              const Icon = item === "Worksheet" ? FileText : item === "Quiz" ? Sparkles : GraduationCap;
              return (
                <button key={item} onClick={() => setType(item)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${type === item ? "border-[#3b926f] bg-[#e5f5ed]" : "border-[#e9eee5] bg-[#fbfcf9] hover:border-[#c9d8cc]"}`}><Icon size={18} className={type === item ? "text-[#34775e]" : "text-[#7d958b]"} /><span className="text-sm font-semibold text-[#25483c]">{item}</span></button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-[#527064]">Title<span className="mt-1.5 block"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Multiplying by 10s" className="w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c] outline-none focus:border-[#5d9c7d]" /></span></label>
            <label className="text-xs font-semibold text-[#527064]">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c]"><option>Mathematics</option><option>English Studies</option><option>Basic Science</option><option>Social Studies</option></select></label>
            <label className="text-xs font-semibold text-[#527064]">Due date<input value={due} onChange={(event) => setDue(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c] outline-none focus:border-[#5d9c7d]" /></label>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[#527064]">Who is it for?</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["class", "Whole class", Users], ["group", "Group", Users2], ["individual", "Individual", User]] as Array<[Audience, string, typeof Users]>).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setAudience(key)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${audience === key ? "border-[#3b926f] bg-[#e5f5ed] text-[#34775e]" : "border-[#dce5dc] text-[#527064] hover:bg-[#f4f7ef]"}`}><Icon size={14} />{label}</button>
              ))}
            </div>
          </div>

          {audience === "individual" && (
            <div className="mt-4 rounded-2xl bg-[#f6f8f3] p-4">
              <div className="text-xs font-semibold text-[#527064]">Choose a learner</div>
              <div className="mt-2 flex flex-wrap gap-2">{Object.keys(learnerDefaults).map((learner) => <button key={learner} onClick={() => setSelected((current) => current.includes(learner) ? [] : [learner])} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${selected.includes(learner) ? "bg-[#173f31] text-white" : "bg-white text-[#527064] shadow-sm hover:bg-[#eef4ea]"}`}>{learner}</button>)}</div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#e9eee5] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#527064]"><Sparkles size={14} className="text-[#8f72b4]" /> Challenge level</div>
            <p className="mt-1 text-xs text-[#8aa096]">BrimLearn differentiates the questions for each learner — this is the cap so nobody is pushed past their understanding.</p>
            <div className="mt-3 flex flex-wrap gap-2">{levels.map((level) => <button key={level} onClick={() => setDifficulty(level)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${difficulty === level ? "bg-[#8f72b4] text-white" : "bg-[#f6f8f3] text-[#527064] hover:bg-[#eef4ea]"}`}>{level}</button>)}</div>
          </div>

          <button onClick={assign} className="mt-6 w-full rounded-full bg-[#173f31] px-4 py-3 text-sm font-semibold text-white hover:bg-[#286b51] sm:w-auto sm:px-6">Assign {type.toLowerCase()}</button>
        </div>

        <div className="space-y-5">
          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Differentiation preview</div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.05em] text-[#183c31]">How each learner gets this.</h2>
            <div className="mt-4 space-y-2.5">
              {previewLearners.map((learner) => <div key={learner} className="flex items-center justify-between rounded-xl bg-[#f6f8f3] p-3"><span className="text-sm font-semibold text-[#25483c]">{learner}</span><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#8f72b4] shadow-sm">{learnerDefaults[learner]}</span></div>)}
            </div>
          </div>
          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Recent assignments</div><span className="rounded-full bg-[#f4f7ef] px-3 py-1.5 text-xs font-semibold text-[#527064]">{assignments.length}</span></div>
            <div className="mt-4 space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="rounded-2xl border border-[#e9eee5] p-3.5"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#25483c]">{assignment.title}</div><div className="mt-0.5 truncate text-xs text-[#8aa096]">{assignment.type} · {assignment.subject} · {assignment.audience}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${assignment.status === "Scheduled" ? "bg-[#e5f5ed] text-[#34775e]" : "bg-[#fff1d7] text-[#916d22]"}`}>{assignment.status}</span></div><div className="mt-2.5 flex items-center gap-2 text-[10px] text-[#8aa096]"><CheckCircle2 size={12} className="text-[#3b926f]" /> {assignment.difficulty} cap · due {assignment.due}</div></div>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}