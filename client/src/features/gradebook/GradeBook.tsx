import { Award, BookOpenCheck, FileDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const subjects = [
  { name: "English Studies", score: 84, grade: "A", tone: "#4e91c6", trend: [62, 70, 74, 80, 78, 84], note: "Strong comprehension; keep reading aloud" },
  { name: "Mathematics", score: 78, grade: "B+", tone: "#9a6dc1", trend: [54, 60, 63, 70, 72, 78], note: "Multiplication is now secure" },
  { name: "Basic Science", score: 71, grade: "B", tone: "#3b926f", trend: [58, 62, 60, 66, 69, 71], note: "Revise the states of matter lab" },
  { name: "Information Technology", score: 82, grade: "A", tone: "#c58e3d", trend: [70, 72, 76, 74, 80, 82], note: "Keyboard mastery improving fast" },
  { name: "Social Studies", score: 66, grade: "C+", tone: "#d46a5a", trend: [52, 55, 58, 61, 64, 66], note: "Focus on map-reading next" },
];

const gradeFor = (score: number) => score >= 75 ? "bg-[#e5f5ed] text-[#34775e]" : score >= 60 ? "bg-[#fff1d7] text-[#916d22]" : "bg-[#fff0ec] text-[#a25142]";

const reportRows = [
  { name: "Week 1 check-in", score: 62, date: "Sep 3", tone: "#9a6dc1" },
  { name: "Week 4 check-in", score: 68, date: "Sep 10", tone: "#c58e3d" },
  { name: "Mid-term examination", score: 72, date: "Sep 20", tone: "#d46a5a" },
  { name: "Week 8 check-in", score: 75, date: "Oct 1", tone: "#3b926f" },
  { name: "Week 11 practice set", score: 78, date: "Oct 8", tone: "#4e91c6" },
];

export function GradeBook() {
  const [report, setReport] = useState<(typeof subjects)[number] | null>(null);
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
                  <button onClick={() => setReport(subject)} className="rounded-full border border-[#dce5dc] px-4 py-2 text-xs font-semibold text-[#34775e] hover:bg-[#eef4ea]">View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {report && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0e2b22]/45 p-4" onClick={() => setReport(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-7 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Term 1 · {report.name} report</div>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#183c31]">Here’s the detail behind the grade.</h2>
                <p className="mt-2 text-sm leading-6 text-[#648075]">{report.note}</p>
              </div>
              <button onClick={() => setReport(null)} className="rounded-xl p-2 text-[#8aa096] hover:bg-[#f4f7ef]" aria-label="Close report"><X size={18} /></button>
            </div>

            <div className="mt-6 flex items-center gap-5 rounded-2xl bg-[#f6f8f3] p-4">
              <div className="text-center">
                <div className="font-display text-4xl font-semibold tracking-[-0.06em]" style={{ color: report.tone }}>{report.score}%</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#527064]">term score</div>
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-[#e3eadf]"><div className="h-full rounded-full" style={{ width: `${report.score}%`, backgroundColor: report.tone }} /></div>
                <div className="mt-2 flex justify-between text-[10px] text-[#8aa096]"><span>{report.grade}</span><span>{report.score >= 75 ? "Achieving well" : report.score >= 60 ? "On track" : "Needs attention"}</span></div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold text-[#527064]">Assessment breakdown</div>
              <div className="mt-3 space-y-2">
                {reportRows.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-xl border border-[#e9eee5] px-3.5 py-2.5">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#25483c]">{row.name}</div><div className="text-[10px] text-[#8aa096]">{row.date}</div></div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.score >= 75 ? "bg-[#e5f5ed] text-[#34775e]" : row.score >= 60 ? "bg-[#fff1d7] text-[#916d22]" : "bg-[#fff0ec] text-[#a25142]"}`}>{row.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => toast(`${report.name} report downloading…`)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#173f31] px-4 py-3 text-sm font-semibold text-white hover:bg-[#286b51]"><FileDown size={15} /> Download report</button>
          </div>
        </div>
      )}
    </>
  );
}