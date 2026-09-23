import { ArrowUpRight, BookOpen, Check, ChevronRight, MessageCircle, MoreHorizontal, Play, Sparkles, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function ProgressRing({ value, color = "#FFC857" }: { value: number; color?: string }) {
  return (
    <div
      className="relative grid h-16 w-16 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,.1) 0deg)` }}
    >
      <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[#3B241A] text-[11px] font-semibold text-white">
        {value}%
      </div>
    </div>
  );
}

export function LearnerDashboard({ setLocation, onViewGrades, onViewFullMap }: { setLocation: (path: string) => void; onViewGrades?: () => void; onViewFullMap?: () => void }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [interventionDone, setInterventionDone] = useState(false);
  const [scoreImproved, setScoreImproved] = useState(false);
  const missions = [
    { id: "warmup", icon: Zap, title: "Number sense warm-up", meta: "5 min · easy", color: "bg-[#E8EFF9] text-[#274852]" },
    { id: "lesson", icon: BookOpen, title: "Multiply by 10s", meta: "12 min · core lesson", color: "bg-[#EFE8FC] text-[#8B78C7]" },
    { id: "challenge", icon: Trophy, title: "The market challenge", meta: "8 min · real world", color: "bg-[#FFF1CD] text-[#B67A17]" },
  ];
  const completeMission = (id: string, title: string) => {
    if (id === "lesson") { setLocation("/lesson"); return; }
    setCompleted((items) => {
      const next = items.includes(id) ? items : [...items, id];
      if (next.length === 3) toast.success("All missions done — Streak keeper badge earned. Keep it up tomorrow!");
      return next;
    });
    toast.success(`${title} added to your completed practice.`);
  };

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
        <div className="relative min-h-[250px] overflow-hidden rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
          <div className="relative z-10 max-w-[500px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><Sparkles size={13} /> Up next on your path</div>
            <h1 className="max-w-[460px] font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[42px]">Make 10s your<br /><span className="text-[#FFC857]">new best friend.</span></h1>
            <p className="mt-4 max-w-[390px] text-sm leading-6 text-[#D9C4B0]">A quick visual lesson to make multiplying by 10, 100, and 1,000 feel automatic.</p>
            <Button onClick={() => setLocation("/lesson")} className="mt-6 h-11 rounded-full bg-[#FFC857] px-5 text-sm font-semibold text-[#3B241A] hover:bg-[#FFC857]"><Play className="mr-2" size={15} fill="currentColor" /> Resume lesson <ChevronRight className="ml-2" size={15} /></Button>
          </div>
          <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[22px] border-[#E3A72F]/20" />
          <div className="absolute -bottom-28 right-8 h-64 w-64 rounded-full border-[45px] border-[#E3A72F]/10" />
          <div className="absolute bottom-6 right-8 hidden h-28 w-28 rotate-12 rounded-[30px] border border-white/20 bg-white/[0.05] p-3 sm:block"><div className="flex h-full flex-col justify-between"><span className="font-display text-3xl text-[#FFC857]">×10</span><span className="text-[10px] text-[#D9C4B0]">scale factor</span></div></div>
        </div>

        <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 shadow-[0_12px_30px_rgba(55,33,22,.05)] sm:p-7">
          <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Your rhythm</div><div className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">You’re building a habit.</div></div><ProgressRing value={68} color="#F28B78" /></div>
          <div className="mt-7 flex items-end justify-between gap-3"><div><div className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#1A1512]">4<span className="text-lg text-[#A08A75]"> / 5</span></div><div className="mt-1 text-xs text-[#8A7361]">days practiced this week</div></div><div className="flex items-end gap-1.5">{[28, 44, 36, 64, 48, 76, 32].map((height, index) => <div key={index} className={`w-2.5 rounded-full ${index === 3 ? "bg-[#F28B78]" : "bg-[#E2CDB8]"}`} style={{ height }} />)}</div></div>
          <div className="mt-6 rounded-2xl bg-[#F7EFE3] p-3 text-xs leading-5 text-[#765F4F]"><TrendingUp className="mr-1.5 inline text-[#4B6B3C]" size={14} /> 18% more consistent than last week</div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Your path</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Small steps, big jumps.</h2></div><button onClick={() => onViewFullMap?.()} className="hidden text-xs font-semibold text-[#4B6B3C] sm:block">See full map <ArrowUpRight className="ml-1 inline" size={13} /></button></div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Fractions & decimals", sub: "6 of 8 concepts", value: 72, tone: "bg-[#E8EFF9]", accent: "#33647A", icon: "⅜" },
            { label: "Multiplication", sub: "8 of 8 concepts", value: 100, tone: "bg-[#EFE8FC]", accent: "#8B78C7", icon: "×" },
            { label: "Geometry lab", sub: "3 of 9 concepts", value: 35, tone: "bg-[#FFF1CD]", accent: "#B67A17", icon: "△" },
          ].map((item) => <div key={item.label} className="group rounded-[22px] border border-[#E2CDB8] bg-[#FFFDF8] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_25px_rgba(55,33,22,.08)]"><div className="flex items-center justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone} font-display text-xl font-semibold`} style={{ color: item.accent }}>{item.icon}</div><span className="text-xs font-semibold" style={{ color: item.accent }}>{item.value}%</span></div><div className="mt-5 font-semibold text-[#3B241A]">{item.label}</div><div className="mt-1 text-xs text-[#A08A75]">{item.sub}</div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#F3E9DE]"><div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.accent }} /></div></div>)}
        </div>
      </section>

      <section className="mt-8 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Grade book</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Overall, you’re cruising at a B+.</h2><p className="mt-2 text-sm text-[#8A7361]">Term average with current grades across your active subjects.</p></div><button onClick={() => onViewGrades?.()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#C65A2E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A84A22]">Open grade book <ArrowUpRight size={13} /></button></div><div className="mt-6 grid gap-3 md:grid-cols-4"><div className="rounded-2xl bg-[#F7EFE3] p-4"><div className="font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">76%</div><div className="mt-1 text-xs text-[#8A7361]">overall average</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2CDB8]"><div className="h-full w-[76%] rounded-full bg-[#4B6B3C]" /></div></div>{[{ name: "Mathematics", score: 78, grade: "B+", accent: "#8B78C7" }, { name: "English Studies", score: 84, grade: "A", accent: "#33647A" }, { name: "Basic Science", score: 71, grade: "B", accent: "#4B6B3C" }].map((subject) => <div key={subject.name} className="rounded-2xl border border-[#F3E9DE] p-4"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#3B241A]">{subject.name}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: subject.accent }}>{subject.grade}</span></div><div className="mt-3 flex items-end justify-between"><span className="font-display text-2xl font-semibold tracking-[-0.04em]" style={{ color: subject.accent }}>{subject.score}%</span><span className="text-[11px] text-[#A08A75]">current</span></div></div>)}</div></section>

      <section className="mt-8 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Your rewards</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Progress deserves a high five.</h2><p className="mt-2 text-sm text-[#8A7361]">Earn badges by completing your recommended intervention and improving your next quiz score.</p></div><Trophy className="text-[#B67A17]" size={24} /></div><div className="mt-6 grid gap-3 md:grid-cols-2"><div className={`rounded-2xl border p-4 ${interventionDone ? "border-[#BDCB9C] bg-[#E9EED9]" : "border-[#E2CDB8] bg-[#FFFDF8]"}`}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF1CD] text-[#B67A17]"><Target size={19} /></div><div><div className="text-sm font-semibold text-[#3B241A]">Gap closer</div><div className="text-xs text-[#A08A75]">Complete a recommended intervention lesson</div></div></div><button disabled={interventionDone} onClick={() => { setInterventionDone(true); toast.success("Badge earned: Gap closer."); }} className="mt-4 rounded-full bg-[#C65A2E] px-3 py-2 text-xs font-semibold text-white disabled:bg-[#8CAE70]">{interventionDone ? "Badge earned" : "Complete intervention"}</button></div><div className={`rounded-2xl border p-4 ${scoreImproved ? "border-[#BDCB9C] bg-[#E9EED9]" : "border-[#E2CDB8] bg-[#FFFDF8]"}`}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8EFF9] text-[#33647A]"><TrendingUp size={19} /></div><div><div className="text-sm font-semibold text-[#3B241A]">Level up</div><div className="text-xs text-[#A08A75]">Improve your score on the next quiz</div></div></div><button disabled={scoreImproved} onClick={() => { setScoreImproved(true); toast.success("Badge earned: Level up."); }} className="mt-4 rounded-full bg-[#C65A2E] px-3 py-2 text-xs font-semibold text-white disabled:bg-[#8CAE70]">{scoreImproved ? "Badge earned" : "Log improved score"}</button></div></div></section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7"><div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Today’s missions</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">A little practice, on purpose.</h2></div><div className="rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]">{completed.length}/3 done</div></div><div className="mt-5 divide-y divide-[#F3E9DE]">{missions.map((mission) => { const done = completed.includes(mission.id); const Icon = mission.icon; return <div key={mission.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${mission.color}`}><Icon size={18} /></div><div className="min-w-0 flex-1"><div className={`truncate text-sm font-semibold ${done ? "text-[#A08A75] line-through" : "text-[#3B241A]"}`}>{mission.title}</div><div className="mt-1 text-xs text-[#A08A75]">{mission.meta}</div></div><button onClick={() => completeMission(mission.id, mission.title)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${done ? "bg-[#DFE9CE] text-[#4B6B3C]" : "bg-[#C65A2E] text-white hover:bg-[#A84A22]"}`}>{done ? <Check size={13} /> : <Play size={13} fill="currentColor" />}{done ? "Done" : "Start"}</button></div> })}</div></div>
        <div className="rounded-[27px] bg-[#FBEBDD] p-6 sm:p-7"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F28B78] text-[#69412F]"><MessageCircle size={18} /></div><button onClick={() => toast("Your teacher can send you a nudge here.")} className="rounded-full bg-white/70 p-2 text-[#A05D4E] hover:bg-[#FFFDF8]"><MoreHorizontal size={16} /></button></div><div className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A86F5E]">Coach note</div><p className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-[-0.04em] text-[#5A2F22]">“Try explaining your answer out loud. That’s how mathematicians make ideas stick.”</p><div className="mt-5 flex items-center gap-2 text-xs text-[#A86F5E]"><div className="grid h-7 w-7 place-items-center rounded-full bg-[#EFC4B8] text-[10px] font-bold text-[#69412F]">MS</div> Ms. Sola · your maths coach</div></div>
      </section>
    </>
  );
}
