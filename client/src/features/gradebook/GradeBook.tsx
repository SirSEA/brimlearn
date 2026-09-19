import { Award, BookOpenCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const subjects = [
  { name: "English Studies", score: 84, grade: "A", tone: "#4e91c6", trend: [62, 70, 74, 80, 78, 84], note: "Strong comprehension; keep reading aloud" },
  { name: "Mathematics", score: 78, grade: "B+", tone: "#9a6dc1", trend: [54, 60, 63, 70, 72, 78], note: "Multiplication is now secure" },
  { name: "Basic Science", score: 71, grade: "B", tone: "#3b926f", trend: [58, 62, 60, 66, 69, 71], note: "Revise the states of matter lab" },
  { name: "Information Technology", score: 82, grade: "A", tone: "#c58e3d", trend: [70, 72, 76, 74, 80, 82], note: "Keyboard mastery improving fast" },
  { name: "Social Studies", score: 66, grade: "C+", tone: "#d46a5a", trend: [52, 55, 58, 61, 64, 66], note: "Focus on map-reading next" },
];

const gradeFor = (score: number) => score >= 75 ? "bg-[#e5f5ed] text-[#34775e]" : score >= 60 ? "bg-[#fff1d7] text-[#916d22]" : "bg-[#fff0ec] text-[#a25142]";

export function GradeBook() {
  const overall = 76;
  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><BookOpenCheck size={13} /> Grade book curve</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Your current grades, one calm view.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Overall term average across your active subjects — with the fastest growing area highlighted.</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="grid h-[104px] w-[104px] place-items-center rounded-full" style={{ background: "conic-gradient(#d8f36a 273.6deg, rgba(255,255,255,.12) 0deg)" }}>
              <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-[#20523f]"><div className="text-center"><div className="font-display text-2xl font-semibold tracking-[-0.04em]">76%</div><div className="text-[10px] text-[#c4ded0]">overall</div></div></div>
            </div>
            <div className="space-y-2 text-sm"><div className="flex items-center gap-2 text-[#c4ded0]"><Award size={15} className="text-[#d8f36a]" /> Term 1 · First term</div><div className="flex items-center gap-2 text-[#c4ded0]"><TrendingUp size={15} className="text-[#d8f36a]" /> +12 pts vs last term</div></div>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
        <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">All subjects</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Where you stand now.</h2></div><div className="rounded-full bg-[#f4f7ef] px-3 py-1.5 text-xs font-semibold text-[#527064]">5 active subjects</div></div>
        <div className="mt-6 space-y-3">
          {subjects.map((subject) => (
            <div key={subject.name} className="rounded-2xl border border-[#e9eee5] p-4 transition hover:border-[#c9d8cc] hover:shadow-[0_8px_18px_rgba(26,53,40,.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full font-display text-sm font-semibold" style={{ backgroundColor: `${subject.tone}1a`, color: subject.tone }}>{subject.name[0]}</span><span className="font-semibold text-[#25483c]">{subject.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gradeFor(subject.score)}`}>Grade {subject.grade}</span></div>
                  <div className="mt-2 text-xs text-[#7d958b]">{subject.note}</div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex h-8 items-end gap-1">{subject.trend.map((value, index) => <div key={index} className="w-1.5 rounded-full" style={{ height: `${value / 2}px`, backgroundColor: index === subject.trend.length - 1 ? subject.tone : "#dce5dc" }} />)}</div>
                  <div className="text-right"><div className="font-display text-2xl font-semibold tracking-[-0.04em]" style={{ color: subject.tone }}>{subject.score}%</div><div className="text-[10px] text-[#8aa096]">current score</div></div>
                  <button onClick={() => toast(`${subject.name} report card downloading…`)} className="rounded-full border border-[#dce5dc] px-3 py-2 text-xs font-semibold text-[#34775e] hover:bg-[#eef4ea]">View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}