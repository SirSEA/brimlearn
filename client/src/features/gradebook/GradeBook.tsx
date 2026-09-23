import { Award, BookOpenCheck, FileDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const subjects = [
  { name: "English Studies", score: 84, grade: "A", tone: "#33647A", trend: [62, 70, 74, 80, 78, 84], note: "Strong comprehension; keep reading aloud" },
  { name: "Mathematics", score: 78, grade: "B+", tone: "#8B78C7", trend: [54, 60, 63, 70, 72, 78], note: "Multiplication is now secure" },
  { name: "Basic Science", score: 71, grade: "B", tone: "#4B6B3C", trend: [58, 62, 60, 66, 69, 71], note: "Revise the states of matter lab" },
  { name: "Information Technology", score: 82, grade: "A", tone: "#B67A17", trend: [70, 72, 76, 74, 80, 82], note: "Keyboard mastery improving fast" },
  { name: "Social Studies", score: 66, grade: "C+", tone: "#C46857", trend: [52, 55, 58, 61, 64, 66], note: "Focus on map-reading next" },
];

const gradeFor = (score: number) => score >= 75 ? "bg-[#E9EED9] text-[#4B6B3C]" : score >= 60 ? "bg-[#FFF1CD] text-[#9A6712]" : "bg-[#FBEBE5] text-[#B84B3D]";

const reportRows = [
  { name: "Week 1 check-in", score: 62, date: "Sep 3", tone: "#8B78C7" },
  { name: "Week 4 check-in", score: 68, date: "Sep 10", tone: "#B67A17" },
  { name: "Mid-term examination", score: 72, date: "Sep 20", tone: "#C46857" },
  { name: "Week 8 check-in", score: 75, date: "Oct 1", tone: "#4B6B3C" },
  { name: "Week 11 practice set", score: 78, date: "Oct 8", tone: "#33647A" },
];

export function GradeBook() {
  const [report, setReport] = useState<(typeof subjects)[number] | null>(null);
  const overall = 76;
  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><BookOpenCheck size={13} /> Grade book curve</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Your current grades, one calm view.</h1>
            <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">Overall term average across your active subjects — with the fastest growing area highlighted.</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="grid h-[104px] w-[104px] place-items-center rounded-full" style={{ background: "conic-gradient(#FFC857 273.6deg, rgba(255,255,255,.12) 0deg)" }}>
              <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-[#3B241A]"><div className="text-center"><div className="font-display text-2xl font-semibold tracking-[-0.04em]">76%</div><div className="text-[10px] text-[#D9C4B0]">overall</div></div></div>
            </div>
            <div className="space-y-2 text-sm"><div className="flex items-center gap-2 text-[#D9C4B0]"><Award size={15} className="text-[#FFC857]" /> Term 1 · First term</div><div className="flex items-center gap-2 text-[#D9C4B0]"><TrendingUp size={15} className="text-[#FFC857]" /> +12 pts vs last term</div></div>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">All subjects</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Where you stand now.</h2></div><div className="rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]">5 active subjects</div></div>
        <div className="mt-6 space-y-3">
          {subjects.map((subject) => (
            <div key={subject.name} className="rounded-2xl border border-[#F3E9DE] p-4 transition hover:border-[#C8B3A0] hover:shadow-[0_8px_18px_rgba(55,33,22,.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full font-display text-sm font-semibold" style={{ backgroundColor: `${subject.tone}1a`, color: subject.tone }}>{subject.name[0]}</span><span className="font-semibold text-[#3B241A]">{subject.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gradeFor(subject.score)}`}>Grade {subject.grade}</span></div>
                  <div className="mt-2 text-xs text-[#8A7361]">{subject.note}</div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex h-8 items-end gap-1">{subject.trend.map((value, index) => <div key={index} className="w-1.5 rounded-full" style={{ height: `${value / 2}px`, backgroundColor: index === subject.trend.length - 1 ? subject.tone : "#E2CDB8" }} />)}</div>
                  <div className="text-right"><div className="font-display text-2xl font-semibold tracking-[-0.04em]" style={{ color: subject.tone }}>{subject.score}%</div><div className="text-[10px] text-[#A08A75]">current score</div></div>
                  <button onClick={() => setReport(subject)} className="rounded-full border border-[#E2CDB8] px-4 py-2 text-xs font-semibold text-[#4B6B3C] hover:bg-[#EFEFDD]">View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {report && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#1A1512]/45 p-4" onClick={() => setReport(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-7 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Term 1 · {report.name} report</div>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">Here’s the detail behind the grade.</h2>
                <p className="mt-2 text-sm leading-6 text-[#765F4F]">{report.note}</p>
              </div>
              <button onClick={() => setReport(null)} className="rounded-xl p-2 text-[#A08A75] hover:bg-[#F7EFE3]" aria-label="Close report"><X size={18} /></button>
            </div>

            <div className="mt-6 flex items-center gap-5 rounded-2xl bg-[#F7EFE3] p-4">
              <div className="text-center">
                <div className="font-display text-4xl font-semibold tracking-[-0.06em]" style={{ color: report.tone }}>{report.score}%</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#765F4F]">term score</div>
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-[#E2CDB8]"><div className="h-full rounded-full" style={{ width: `${report.score}%`, backgroundColor: report.tone }} /></div>
                <div className="mt-2 flex justify-between text-[10px] text-[#A08A75]"><span>{report.grade}</span><span>{report.score >= 75 ? "Achieving well" : report.score >= 60 ? "On track" : "Needs attention"}</span></div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold text-[#765F4F]">Assessment breakdown</div>
              <div className="mt-3 space-y-2">
                {reportRows.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-xl border border-[#F3E9DE] px-3.5 py-2.5">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#3B241A]">{row.name}</div><div className="text-[10px] text-[#A08A75]">{row.date}</div></div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.score >= 75 ? "bg-[#E9EED9] text-[#4B6B3C]" : row.score >= 60 ? "bg-[#FFF1CD] text-[#9A6712]" : "bg-[#FBEBE5] text-[#B84B3D]"}`}>{row.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => toast(`${report.name} report downloading…`)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#A84A22]"><FileDown size={15} /> Download report</button>
          </div>
        </div>
      )}
    </>
  );
}