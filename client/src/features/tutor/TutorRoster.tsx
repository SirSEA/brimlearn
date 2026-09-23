import { ArrowLeft, Lightbulb, Mail, Medal, Search, Sparkles, TrendingUp, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type ParentLink = { name: string; email: string };

type Student = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  focus: string;
  score: number;
  trend: number[];
  topics: Array<{ name: string; score: number }>;
  needs: string[];
  difficulty: "Easy" | "Medium" | "Hard" | "Advanced";
  recent: Array<{ title: string; score: number; date: string }>;
  parent: ParentLink | null;
};

const students: Student[] = [
  {
    id: "amara",
    name: "Amara Okafor",
    initials: "AO",
    tone: "bg-[#FFC857] text-[#1A1512]",
    focus: "Fractions & decimals",
    score: 79,
    trend: [38, 42, 46, 51, 56, 63, 70, 79],
    topics: [
      { name: "Fractions & decimals", score: 42 },
      { name: "Multiplication", score: 68 },
      { name: "Geometry lab", score: 76 },
    ],
    needs: ["Prefers visual fraction models over number lines", "Denominator-first reasoning still slips under pressure", "Builds confidence with worked examples first"],
    difficulty: "Easy",
    recent: [
      { title: "Fraction check-in", score: 64, date: "Sep 17" },
      { title: "Visual reset · fractions", score: 82, date: "Sep 12" },
      { title: "Multiplication practice", score: 71, date: "Sep 5" },
    ],
    parent: { name: "Aminat Okafor", email: "aminat.okafor@gmail.com" },
  },
  {
    id: "leo",
    name: "Leo Mensah",
    initials: "LM",
    tone: "bg-[#F28B78] text-[#5A2F22]",
    focus: "Multiplication word problems",
    score: 72,
    trend: [52, 55, 58, 61, 64, 66, 70, 72],
    topics: [
      { name: "Multiplication", score: 48 },
      { name: "Fractions & decimals", score: 64 },
      { name: "Geometry lab", score: 79 },
    ],
    needs: ["Facts are secure, application to word problems is shaky", "Rushes to compute before reading the question", "Responds well to real-world market scenarios"],
    difficulty: "Medium",
    recent: [
      { title: "Word-problem pack", score: 45, date: "Sep 16" },
      { title: "Market challenge", score: 78, date: "Sep 10" },
      { title: "Number facts drill", score: 90, date: "Sep 3" },
    ],
    parent: { name: "Kwame Mensah", email: "kwame.mensah@gmail.com" },
  },
  {
    id: "zuri",
    name: "Zuri Campbell",
    initials: "ZC",
    tone: "bg-[#8B78C7] text-white",
    focus: "Geometry lab",
    score: 74,
    trend: [44, 46, 50, 55, 58, 64, 68, 74],
    topics: [
      { name: "Geometry lab", score: 45 },
      { name: "Fractions & decimals", score: 69 },
      { name: "Multiplication", score: 77 },
    ],
    needs: ["Confuses perimeter with area on rectangles", "Strong visual reasoning once shown the difference", "Reaches extension work quickly when focused"],
    difficulty: "Advanced",
    recent: [
      { title: "Perimeter vs area", score: 40, date: "Sep 15" },
      { title: "Shape vocabulary", score: 88, date: "Sep 8" },
      { title: "Area lab", score: 73, date: "Sep 1" },
    ],
    parent: { name: "Ngozi Campbell", email: "ngozi.campbell@gmail.com" },
  },
  {
    id: "tunde",
    name: "Tunde Bakare",
    initials: "TB",
    tone: "bg-[#E8EFF9] text-[#274852]",
    focus: "Across all strands",
    score: 88,
    trend: [62, 66, 71, 73, 78, 82, 85, 88],
    topics: [
      { name: "Multiplication", score: 92 },
      { name: "Fractions & decimals", score: 86 },
      { name: "Geometry lab", score: 84 },
    ],
    needs: ["Ahead of the class, needs stretch to stay engaged", "Enjoys explaining methods to peers", "Should spend time on multi-step reasoning and Advanced sets"],
    difficulty: "Advanced",
    recent: [
      { title: "Stretch quiz", score: 90, date: "Sep 16" },
      { title: "Fractions mastery", score: 88, date: "Sep 9" },
      { title: "Geometry challenge", score: 86, date: "Sep 2" },
    ],
    parent: null,
  },
  {
    id: "nneka",
    name: "Nneka Eze",
    initials: "NE",
    tone: "bg-[#FFF1CD] text-[#B67A17]",
    focus: "English Studies",
    score: 81,
    trend: [58, 60, 64, 67, 71, 75, 78, 81],
    topics: [
      { name: "Comprehension", score: 84 },
      { name: "Grammar", score: 76 },
      { name: "Creative writing", score: 70 },
    ],
    needs: ["Strong reader, needs scaffolds to start writing", "Learns best in small-group circles", "Builds stamina with timed warm-ups"],
    difficulty: "Medium",
    recent: [
      { title: "Comprehension circle", score: 86, date: "Sep 14" },
      { title: "Grammar check-in", score: 74, date: "Sep 7" },
      { title: "Writing prompt", score: 68, date: "Sep 1" },
    ],
    parent: { name: "Adaeze Eze", email: "adaeze.eze@gmail.com" },
  },
];

const scoreTone = (score: number) => score >= 80 ? "bg-[#E9EED9] text-[#4B6B3C]" : score >= 60 ? "bg-[#FFF1CD] text-[#9A6712]" : "bg-[#FBEBE5] text-[#B84B3D]";

export function TutorRoster() {
  const [selected, setSelected] = useState<Student | null>(null);
  const [query, setQuery] = useState("");
  const [links, setLinks] = useState<Record<string, ParentLink>>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [shared, setShared] = useState(false);
  const visible = students.filter((student) => student.name.toLowerCase().includes(query.toLowerCase()));

  const openProfile = (student: Student) => {
    setShared(false);
    setLinkOpen(false);
    setLinkName("");
    setLinkEmail("");
    setSelected(student);
  };

  if (selected) {
    const top = [...selected.topics].sort((a, b) => a.score - b.score)[0];
    const parent = selected.parent ?? links[selected.id] ?? null;
    return (
      <>
        <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-8">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-xs font-semibold text-[#8A7361] hover:text-[#4B6B3C]"><ArrowLeft size={14} /> Back to roster</button>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className={`grid h-16 w-16 place-items-center rounded-full font-display text-xl font-bold ${selected.tone}`}>{selected.initials}</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">{selected.name}</h1>
              <p className="mt-1 text-sm text-[#8A7361]">JSS1 · focus: {selected.focus} · differentiated difficulty: <span className="font-semibold text-[#4B6B3C]">{selected.difficulty}</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast(`Assigning a ${selected.difficulty.toLowerCase()} reset lesson to ${selected.name.split(" ")[0]}.`)} className="rounded-full bg-[#C65A2E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A84A22]">Assign intervention</button>
              {parent ? (
                <button
                  onClick={() => {
                    setShared(true);
                    toast.success(`Profile summary sent to ${parent.name} (${parent.email}).`);
                  }}
                  disabled={shared}
                  className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition ${shared ? "border-[#DDE5C9] bg-[#E9EED9] text-[#4B6B3C]" : "border-[#E2CDB8] text-[#4B6B3C] hover:bg-[#EFEFDD]"}`}
                >
                  {shared ? "Shared with parent ✓" : <><Mail size={13} className="mr-1 inline" /> Share with {parent.name.split(" ")[0]}</>}
                </button>
              ) : linkOpen ? (
                <button onClick={() => setLinkOpen(false)} className="rounded-full border border-[#E2CDB8] px-4 py-2.5 text-xs font-semibold text-[#8A7361] hover:bg-[#F7EFE3]">Cancel linking</button>
              ) : (
                <button onClick={() => setLinkOpen(true)} className="rounded-full border border-[#E7DFF4] px-4 py-2.5 text-xs font-semibold text-[#8B78C7] hover:bg-[#EFE8FC]"><UserPlus size={13} className="mr-1 inline" /> Link a parent</button>
              )}
            </div>
          </div>
          {!parent && linkOpen && (
            <div className="mt-5 rounded-2xl border border-[#E7DFF4] bg-[#F1EAFB] p-4">
              <div className="text-xs font-semibold text-[#5C4A7A]">No parent is linked for {selected.name.split(" ")[0]} yet — add one so progress can be shared privately.</div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Parent name (e.g. Dapo Bakare)" aria-label="Parent name" className="min-w-0 flex-1 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm text-[#3B241A] outline-none placeholder:text-[#B3A089] focus:border-[#8B78C7] focus:ring-2 focus:ring-[#EFE8FC]/60" />
                <input value={linkEmail} onChange={(event) => setLinkEmail(event.target.value)} placeholder="Parent email" aria-label="Parent email" className="min-w-0 flex-1 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm text-[#3B241A] outline-none placeholder:text-[#B3A089] focus:border-[#8B78C7] focus:ring-2 focus:ring-[#EFE8FC]/60" />
                <button
                  onClick={() => {
                    if (!linkName.trim() || !linkEmail.trim()) {
                      toast.error("Enter both the parent's name and email.");
                      return;
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkEmail.trim())) {
                      toast.error("Enter a valid email address.");
                      return;
                    }
                    setLinks((current) => ({ ...current, [selected.id]: { name: linkName.trim(), email: linkEmail.trim() } }));
                    setLinkOpen(false);
                    toast.success(`${linkName.trim()} is now linked to ${selected.name.split(" ")[0]}.`);
                  }}
                  className="rounded-full bg-[#6E5BAE] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#8B78C7]"
                >
                  Link parent
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Learning overview</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Concept strengths and gaps.</h2>
            <div className="mt-5 space-y-3">{selected.topics.map((topic) => <div key={topic.name} className="rounded-2xl bg-[#F7EFE3] p-3.5"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-[#3B241A]">{topic.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(topic.score)}`}>{topic.score}%</span></div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E2CDB8]"><div className="h-full rounded-full" style={{ width: `${topic.score}%`, backgroundColor: topic.score >= 70 ? "#4B6B3C" : topic.score >= 50 ? "#B67A17" : "#C46857" }} /></div></div>)}</div>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f0d6c9] bg-[#FFFDF8] p-4"><Lightbulb className="mt-0.5 shrink-0 text-[#B67A17]" size={17} /><p className="text-sm leading-6 text-[#8A7361]">Lowest area: <span className="font-semibold text-[#B84B3D]">{top.name}</span> at {top.score}%. A <span className="font-semibold text-[#4B6B3C]">{selected.difficulty}</span> level reset keeps it approachable while building the foundation.</p></div>
          </div>
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Unique learning needs</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">How {selected.name.split(" ")[0]} learns best.</h2>
            <div className="mt-5 space-y-3">{selected.needs.map((need) => <div key={need} className="flex items-start gap-3 rounded-2xl border border-[#F3E9DE] p-3.5"><Sparkles className="mt-0.5 shrink-0 text-[#8B78C7]" size={16} /><p className="text-sm leading-6 text-[#765F4F]">{need}</p></div>)}</div>
          </div>
        </section>

        <section className="mt-7 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
          <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Recent scores</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Last three assessments.</h2></div><div className="flex items-center gap-2 rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]"><TrendingUp size={13} className="text-[#4B6B3C]" /> moving up</div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">{selected.recent.map((entry) => <div key={entry.title} className="rounded-2xl border border-[#F3E9DE] p-4"><div className="flex items-center justify-between"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(entry.score)}`}>{entry.score}%</span><span className="text-[10px] text-[#A08A75]">{entry.date}</span></div><div className="mt-3 text-sm font-semibold text-[#3B241A]">{entry.title}</div></div>)}</div>
          <div className="mt-5 flex h-20 items-end gap-1.5 rounded-2xl bg-[#F7EFE3] p-3">{selected.trend.map((value, index) => <div key={index} className="flex-1 rounded-t-lg" style={{ height: `${value}%`, backgroundColor: index === selected.trend.length - 1 ? "#4B6B3C" : "#C8B3A0" }} />)}</div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><Users size={13} /> Student roster</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Personalize learning at a glance.</h1>
            <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">Understand every learners progress, needs, strength and next steps from a single view.</p>
          </div>
          <div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7361]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search learners…" className="w-full rounded-full border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#BFA993] outline-none focus:border-[#FFC857] lg:w-72" /></div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">{[["28", "learners on path"], ["5", "need a nudge"], ["91%", "assignment complete"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><div className="font-display text-3xl font-semibold tracking-[-0.06em] text-[#FFC857]">{value}</div><div className="mt-1 text-xs text-[#D9C4B0]">{label}</div></div>)}</div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">JSS1 · {visible.length} learners</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Select a learner to view the profile.</h2></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((student) => {
            const linkedParent = student.parent ?? links[student.id] ?? null;
            return (
              <button key={student.id} onClick={() => openProfile(student)} className="rounded-[22px] border border-[#F3E9DE] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#C8B3A0] hover:shadow-[0_14px_25px_rgba(55,33,22,.08)]">
                <div className="flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-full text-xs font-bold ${student.tone}`}>{student.initials}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(student.score)}`}>{student.score}%</span></div>
                <div className="mt-4 text-sm font-semibold text-[#3B241A]">{student.name}</div>
                <div className="mt-1 text-xs text-[#A08A75]">Focus: {student.focus}</div>
                <div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-[#F7EFE3] px-2.5 py-1 text-[10px] font-semibold text-[#765F4F]"><Medal size={11} className="mr-1 inline" />{student.difficulty}</span><span className="flex items-end gap-1">{student.trend.slice(-4).map((value, index) => <span key={index} className="w-1.5 rounded-full" style={{ height: `${value / 3}px`, backgroundColor: index === 3 ? "#4B6B3C" : "#C8B3A0" }} />)}</span></div>
                <div className="mt-3 border-t border-[#F3E9DE] pt-2.5">
                  {linkedParent ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#4B6B3C]"><Mail size={11} /> Linked: {linkedParent.name}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#B3A089]"><UserPlus size={11} /> No parent linked</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}