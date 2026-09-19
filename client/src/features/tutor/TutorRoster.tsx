import { ArrowLeft, Lightbulb, Medal, Search, Sparkles, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
};

const students: Student[] = [
  {
    id: "amara",
    name: "Amara Okafor",
    initials: "AO",
    tone: "bg-[#d8f36a] text-[#31583f]",
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
  },
  {
    id: "leo",
    name: "Leo Mensah",
    initials: "LM",
    tone: "bg-[#ff9a87] text-[#63382d]",
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
  },
  {
    id: "zuri",
    name: "Zuri Campbell",
    initials: "ZC",
    tone: "bg-[#8f72b4] text-white",
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
  },
  {
    id: "tunde",
    name: "Tunde Bakare",
    initials: "TB",
    tone: "bg-[#eaf2ff] text-[#3975aa]",
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
  },
  {
    id: "nneka",
    name: "Nneka Eze",
    initials: "NE",
    tone: "bg-[#fff1d7] text-[#b07a1f]",
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
  },
];

const scoreTone = (score: number) => score >= 80 ? "bg-[#e5f5ed] text-[#34775e]" : score >= 60 ? "bg-[#fff1d7] text-[#916d22]" : "bg-[#fff0ec] text-[#a25142]";

export function TutorRoster() {
  const [selected, setSelected] = useState<Student | null>(null);
  const [query, setQuery] = useState("");
  const visible = students.filter((student) => student.name.toLowerCase().includes(query.toLowerCase()));

  if (selected) {
    const top = [...selected.topics].sort((a, b) => a.score - b.score)[0];
    return (
      <>
        <section className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-8">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-xs font-semibold text-[#7d958b] hover:text-[#34775e]"><ArrowLeft size={14} /> Back to roster</button>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className={`grid h-16 w-16 place-items-center rounded-full font-display text-xl font-bold ${selected.tone}`}>{selected.initials}</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-semibold tracking-[-0.06em] text-[#183c31]">{selected.name}</h1>
              <p className="mt-1 text-sm text-[#7d958b]">JSS1 · focus: {selected.focus} · differentiated difficulty: <span className="font-semibold text-[#34775e]">{selected.difficulty}</span></p>
            </div>
            <div className="flex gap-2"><button onClick={() => toast(`Assigning a ${selected.difficulty.toLowerCase()} reset lesson to ${selected.name.split(" ")[0]}.`)} className="rounded-full bg-[#173f31] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#286b51]">Assign intervention</button><button onClick={() => toast("Sending profile summary to this learner's parent.")} className="rounded-full border border-[#dce5dc] px-4 py-2.5 text-xs font-semibold text-[#34775e] hover:bg-[#eef4ea]">Share</button></div>
          </div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Learning overview</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Concept strengths and gaps.</h2>
            <div className="mt-5 space-y-3">{selected.topics.map((topic) => <div key={topic.name} className="rounded-2xl bg-[#f6f8f3] p-3.5"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-[#25483c]">{topic.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(topic.score)}`}>{topic.score}%</span></div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#e3eadf]"><div className="h-full rounded-full" style={{ width: `${topic.score}%`, backgroundColor: topic.score >= 70 ? "#3b926f" : topic.score >= 50 ? "#c58e3d" : "#d46a5a" }} /></div></div>)}</div>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f0d6c9] bg-[#fffaf6] p-4"><Lightbulb className="mt-0.5 shrink-0 text-[#c58e3d]" size={17} /><p className="text-sm leading-6 text-[#7c827b]">Lowest area: <span className="font-semibold text-[#a25142]">{top.name}</span> at {top.score}%. A <span className="font-semibold text-[#34775e]">{selected.difficulty}</span> level reset keeps it approachable while building the foundation.</p></div>
          </div>
          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Unique learning needs</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">How {selected.name.split(" ")[0]} learns best.</h2>
            <div className="mt-5 space-y-3">{selected.needs.map((need) => <div key={need} className="flex items-start gap-3 rounded-2xl border border-[#e9eee5] p-3.5"><Sparkles className="mt-0.5 shrink-0 text-[#8f72b4]" size={16} /><p className="text-sm leading-6 text-[#527064]">{need}</p></div>)}</div>
          </div>
        </section>

        <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Recent scores</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Last three assessments.</h2></div><div className="flex items-center gap-2 rounded-full bg-[#f4f7ef] px-3 py-1.5 text-xs font-semibold text-[#527064]"><TrendingUp size={13} className="text-[#3b926f]" /> moving up</div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">{selected.recent.map((entry) => <div key={entry.title} className="rounded-2xl border border-[#e9eee5] p-4"><div className="flex items-center justify-between"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(entry.score)}`}>{entry.score}%</span><span className="text-[10px] text-[#8aa096]">{entry.date}</span></div><div className="mt-3 text-sm font-semibold text-[#25483c]">{entry.title}</div></div>)}</div>
          <div className="mt-5 flex h-20 items-end gap-1.5 rounded-2xl bg-[#f6f8f3] p-3">{selected.trend.map((value, index) => <div key={index} className="flex-1 rounded-t-lg" style={{ height: `${value}%`, backgroundColor: index === selected.trend.length - 1 ? "#3b926f" : "#c9d8cc" }} />)}</div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><Users size={13} /> Student roster</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">One pulse for every learner.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Tap a learner to see their learning overview, unique needs, recent scores, and differentiated difficulty level.</p>
          </div>
          <div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d958b]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search learners…" className="w-full rounded-full border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#a7c4b8] outline-none focus:border-[#d8f36a] lg:w-72" /></div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">{[["28", "learners on path"], ["5", "need a nudge"], ["91%", "assignment complete"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><div className="font-display text-3xl font-semibold tracking-[-0.06em] text-[#d8f36a]">{value}</div><div className="mt-1 text-xs text-[#c4ded0]">{label}</div></div>)}</div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
        <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">JSS1 · {visible.length} learners</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Select a learner to view the profile.</h2></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((student) => (
            <button key={student.id} onClick={() => setSelected(student)} className="rounded-[22px] border border-[#e9eee5] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#c9d8cc] hover:shadow-[0_14px_25px_rgba(26,53,40,.08)]">
              <div className="flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-full text-xs font-bold ${student.tone}`}>{student.initials}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(student.score)}`}>{student.score}%</span></div>
              <div className="mt-4 text-sm font-semibold text-[#25483c]">{student.name}</div>
              <div className="mt-1 text-xs text-[#8aa096]">Focus: {student.focus}</div>
              <div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-[#f4f7ef] px-2.5 py-1 text-[10px] font-semibold text-[#527064]"><Medal size={11} className="mr-1 inline" />{student.difficulty}</span><span className="flex items-end gap-1">{student.trend.slice(-4).map((value, index) => <span key={index} className="w-1.5 rounded-full" style={{ height: `${value / 3}px`, backgroundColor: index === 3 ? "#3b926f" : "#c9d8cc" }} />)}</span></div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}