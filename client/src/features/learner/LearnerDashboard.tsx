import { ArrowUpRight, BookOpen, Check, ChevronRight, MessageCircle, MoreHorizontal, Play, Sparkles, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function ProgressRing({ value, color = "#d8f36a" }: { value: number; color?: string }) {
  return (
    <div
      className="relative grid h-16 w-16 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,.1) 0deg)` }}
    >
      <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[#174b3a] text-[11px] font-semibold text-white">
        {value}%
      </div>
    </div>
  );
}

export function LearnerDashboard({ setLocation, onViewGrades }: { setLocation: (path: string) => void; onViewGrades?: () => void }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [interventionDone, setInterventionDone] = useState(false);
  const [scoreImproved, setScoreImproved] = useState(false);
  const missions = [
    { id: "warmup", icon: Zap, title: "Number sense warm-up", meta: "5 min · easy", color: "bg-[#e4f1ff] text-[#3975aa]" },
    { id: "lesson", icon: BookOpen, title: "Multiply by 10s", meta: "12 min · core lesson", color: "bg-[#f3e6ff] text-[#8053a9]" },
    { id: "challenge", icon: Trophy, title: "The market challenge", meta: "8 min · real world", color: "bg-[#fff0cf] text-[#a87521]" },
  ];
  const completeMission = (id: string, title: string) => {
    if (id === "lesson") { setLocation("/lesson"); return; }
    setCompleted((items) => items.includes(id) ? items : [...items, id]);
    toast.success(`${title} added to your completed practice.`);
  };

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
        <div className="relative min-h-[250px] overflow-hidden rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
          <div className="relative z-10 max-w-[500px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><Sparkles size={13} /> Up next on your path</div>
            <h1 className="max-w-[460px] font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[42px]">Make 10s your<br /><span className="text-[#d8f36a]">new best friend.</span></h1>
            <p className="mt-4 max-w-[390px] text-sm leading-6 text-[#c4ded0]">A quick visual lesson to make multiplying by 10, 100, and 1,000 feel automatic.</p>
            <Button onClick={() => setLocation("/lesson")} className="mt-6 h-11 rounded-full bg-[#d8f36a] px-5 text-sm font-semibold text-[#173c2e] hover:bg-[#e4fb8b]"><Play className="mr-2" size={15} fill="currentColor" /> Resume lesson <ChevronRight className="ml-2" size={15} /></Button>
          </div>
          <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[22px] border-[#c9e95b]/20" />
          <div className="absolute -bottom-28 right-8 h-64 w-64 rounded-full border-[45px] border-[#c9e95b]/10" />
          <div className="absolute bottom-6 right-8 hidden h-28 w-28 rotate-12 rounded-[30px] border border-white/20 bg-white/[0.05] p-3 sm:block"><div className="flex h-full flex-col justify-between"><span className="font-display text-3xl text-[#d8f36a]">×10</span><span className="text-[10px] text-[#c4ded0]">scale factor</span></div></div>
        </div>

        <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 shadow-[0_12px_30px_rgba(26,53,40,.05)] sm:p-7">
          <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Your rhythm</div><div className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">You’re building a habit.</div></div><ProgressRing value={68} color="#ff9a87" /></div>
          <div className="mt-7 flex items-end justify-between gap-3"><div><div className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#183c31]">4<span className="text-lg text-[#8aa096]"> / 5</span></div><div className="mt-1 text-xs text-[#7d958b]">days practiced this week</div></div><div className="flex items-end gap-1.5">{[28, 44, 36, 64, 48, 76, 32].map((height, index) => <div key={index} className={`w-2.5 rounded-full ${index === 3 ? "bg-[#ff9a87]" : "bg-[#e3eadf]"}`} style={{ height }} />)}</div></div>
          <div className="mt-6 rounded-2xl bg-[#f4f7ef] p-3 text-xs leading-5 text-[#527064]"><TrendingUp className="mr-1.5 inline text-[#3b926f]" size={14} /> 18% more consistent than last week</div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Your path</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Small steps, big jumps.</h2></div><button onClick={() => toast("Full learning map coming soon.")} className="hidden text-xs font-semibold text-[#34775e] sm:block">See full map <ArrowUpRight className="ml-1 inline" size={13} /></button></div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Fractions & decimals", sub: "6 of 8 concepts", value: 72, tone: "bg-[#e7f2ff]", accent: "#4e91c6", icon: "⅜" },
            { label: "Multiplication", sub: "8 of 8 concepts", value: 100, tone: "bg-[#f7edff]", accent: "#9a6dc1", icon: "×" },
            { label: "Geometry lab", sub: "3 of 9 concepts", value: 35, tone: "bg-[#fff1d7]", accent: "#c58e3d", icon: "△" },
          ].map((item) => <div key={item.label} className="group rounded-[22px] border border-[#e3e8df] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_25px_rgba(26,53,40,.08)]"><div className="flex items-center justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone} font-display text-xl font-semibold`} style={{ color: item.accent }}>{item.icon}</div><span className="text-xs font-semibold" style={{ color: item.accent }}>{item.value}%</span></div><div className="mt-5 font-semibold text-[#25483c]">{item.label}</div><div className="mt-1 text-xs text-[#8aa096]">{item.sub}</div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf1e9]"><div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.accent }} /></div></div>)}
        </div>
      </section>

      <section className="mt-8 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Grade book</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Overall, you’re cruising at a B+.</h2><p className="mt-2 text-sm text-[#7d958b]">Term average with current grades across your active subjects.</p></div><button onClick={() => onViewGrades?.()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#173f31] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#286b51]">Open grade book <ArrowUpRight size={13} /></button></div><div className="mt-6 grid gap-3 md:grid-cols-4"><div className="rounded-2xl bg-[#f6f8f3] p-4"><div className="font-display text-3xl font-semibold tracking-[-0.06em] text-[#183c31]">76%</div><div className="mt-1 text-xs text-[#7d958b]">overall average</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e3eadf]"><div className="h-full w-[76%] rounded-full bg-[#3b926f]" /></div></div>{[{ name: "Mathematics", score: 78, grade: "B+", accent: "#9a6dc1" }, { name: "English Studies", score: 84, grade: "A", accent: "#4e91c6" }, { name: "Basic Science", score: 71, grade: "B", accent: "#3b926f" }].map((subject) => <div key={subject.name} className="rounded-2xl border border-[#e9eee5] p-4"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#25483c]">{subject.name}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: subject.accent }}>{subject.grade}</span></div><div className="mt-3 flex items-end justify-between"><span className="font-display text-2xl font-semibold tracking-[-0.04em]" style={{ color: subject.accent }}>{subject.score}%</span><span className="text-[11px] text-[#8aa096]">current</span></div></div>)}</div></section>

      <section className="mt-8 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Your rewards</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Progress deserves a high five.</h2><p className="mt-2 text-sm text-[#7d958b]">Earn badges by completing your recommended intervention and improving your next quiz score.</p></div><Trophy className="text-[#c58e3d]" size={24} /></div><div className="mt-6 grid gap-3 md:grid-cols-2"><div className={`rounded-2xl border p-4 ${interventionDone ? "border-[#a7d1b6] bg-[#e5f5ed]" : "border-[#e3e8df] bg-[#fbfcf9]"}`}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1d7] text-[#c58e3d]"><Target size={19} /></div><div><div className="text-sm font-semibold text-[#25483c]">Gap closer</div><div className="text-xs text-[#8aa096]">Complete a recommended intervention lesson</div></div></div><button disabled={interventionDone} onClick={() => { setInterventionDone(true); toast.success("Badge earned: Gap closer."); }} className="mt-4 rounded-full bg-[#173f31] px-3 py-2 text-xs font-semibold text-white disabled:bg-[#75a889]">{interventionDone ? "Badge earned" : "Complete intervention"}</button></div><div className={`rounded-2xl border p-4 ${scoreImproved ? "border-[#a7d1b6] bg-[#e5f5ed]" : "border-[#e3e8df] bg-[#fbfcf9]"}`}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f2ff] text-[#4e91c6]"><TrendingUp size={19} /></div><div><div className="text-sm font-semibold text-[#25483c]">Level up</div><div className="text-xs text-[#8aa096]">Improve your score on the next quiz</div></div></div><button disabled={scoreImproved} onClick={() => { setScoreImproved(true); toast.success("Badge earned: Level up."); }} className="mt-4 rounded-full bg-[#173f31] px-3 py-2 text-xs font-semibold text-white disabled:bg-[#75a889]">{scoreImproved ? "Badge earned" : "Log improved score"}</button></div></div></section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Today’s missions</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">A little practice, on purpose.</h2></div><div className="rounded-full bg-[#f4f7ef] px-3 py-1.5 text-xs font-semibold text-[#527064]">{completed.length}/3 done</div></div><div className="mt-5 divide-y divide-[#edf1e9]">{missions.map((mission) => { const done = completed.includes(mission.id); const Icon = mission.icon; return <div key={mission.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${mission.color}`}><Icon size={18} /></div><div className="min-w-0 flex-1"><div className={`truncate text-sm font-semibold ${done ? "text-[#8aa096] line-through" : "text-[#25483c]"}`}>{mission.title}</div><div className="mt-1 text-xs text-[#8aa096]">{mission.meta}</div></div><button onClick={() => completeMission(mission.id, mission.title)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${done ? "bg-[#e1f3e8] text-[#32805a]" : "bg-[#173f31] text-white hover:bg-[#286b51]"}`}>{done ? <Check size={13} /> : <Play size={13} fill="currentColor" />}{done ? "Done" : "Start"}</button></div> })}</div></div>
        <div className="rounded-[27px] bg-[#fff1e9] p-6 sm:p-7"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff9a87] text-[#713b2f]"><MessageCircle size={18} /></div><button onClick={() => toast("Your teacher can send you a nudge here.")} className="rounded-full bg-white/70 p-2 text-[#9a5b4d] hover:bg-white"><MoreHorizontal size={16} /></button></div><div className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a36b5c]">Coach note</div><p className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-[-0.04em] text-[#63382d]">“Try explaining your answer out loud. That’s how mathematicians make ideas stick.”</p><div className="mt-5 flex items-center gap-2 text-xs text-[#a36b5c]"><div className="grid h-7 w-7 place-items-center rounded-full bg-[#f8c0b3] text-[10px] font-bold text-[#713b2f]">MS</div> Ms. Sola · your maths coach</div></div>
      </section>
    </>
  );
}
