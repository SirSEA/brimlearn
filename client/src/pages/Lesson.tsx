import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, ChevronRight, Lightbulb, RotateCcw, X } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard" | "advanced";

const difficultyMeta: Record<Difficulty, { label: string; chip: string }> = {
  easy: { label: "Easy", chip: "bg-[#e5f5ed] text-[#34775e]" },
  medium: { label: "Medium", chip: "bg-[#fff1d7] text-[#916d22]" },
  hard: { label: "Hard", chip: "bg-[#fff0ec] text-[#a25142]" },
  advanced: { label: "Difficult", chip: "bg-[#f3e6ff] text-[#8053a9]" },
};

const checkpoints: Record<Difficulty, { question: string; choices: string[]; correct: string; explain: string }> = {
  easy: { question: "What is 3 × 10?", choices: ["13", "30", "300", "40"], correct: "30", explain: "Each of the 3 ones becomes one ten. That gives you 30." },
  medium: { question: "What is 12 × 10?", choices: ["120", "12", "1,200", "30"], correct: "120", explain: "Each of the 12 ones becomes one ten. That gives you 120." },
  hard: { question: "What is 12 × 100?", choices: ["120", "1,200", "12,000", "120,000"], correct: "1,200", explain: "Multiplying by 100 moves every digit two places to the left: 12 → 1,200." },
  advanced: { question: "A crate holds 12 bags, and each bag holds 10 oranges. How many oranges are in 3 crates?", choices: ["360", "120", "30", "3600"], correct: "360", explain: "12 × 10 = 120 oranges per crate, then × 3 crates = 360. Scale in steps." },
};

export default function Lesson() {
  const [, setLocation] = useLocation();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const active = checkpoints[difficulty];
  const correct = selected === active.correct;

  const choose = (choice: string) => {
    if (completed) return;
    setSelected(choice);
    if (choice === active.correct) toast.success("Exactly. You scaled it up one place.");
  };

  const changeDifficulty = (next: Difficulty) => {
    setDifficulty(next);
    setSelected(null);
    setCompleted(false);
    toast(`Checkpoint set to ${difficultyMeta[next].label} for ${next === "advanced" ? "difficult " : ""}practice.`);
  };

  const next = () => {
    if (!correct) {
      toast("Try the visual model again — count the tens, not just the zeros.");
      return;
    }
    setCompleted(true);
    toast.success("Lesson checkpoint complete. +40 XP");
  };

  return <div className="min-h-screen bg-[#fbfbf6] text-[#183c31]">
    <header className="flex h-[76px] items-center justify-between border-b border-[#dfe5d9] bg-[#fbfbf6] px-5 lg:px-10">
      <button onClick={() => setLocation("/")} className="flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold text-[#527064] hover:bg-[#edf1e9]"><ArrowLeft size={17} /> Exit lesson</button>
      <div className="hidden items-center gap-2 sm:flex"><div className="h-2 w-20 overflow-hidden rounded-full bg-[#e3eadf]"><div className="h-full w-[58%] rounded-full bg-[#3b926f]" /></div><span className="text-xs font-semibold text-[#527064]">3 of 5</span></div>
      <div className="flex items-center gap-2">
        {(["easy", "medium", "hard", "advanced"] as Difficulty[]).map((level) => <button key={level} onClick={() => changeDifficulty(level)} className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${difficulty === level ? difficultyMeta[level].chip : "bg-[#eef1ec] text-[#7d958b] hover:bg-[#e3e9e2]"}`}>{level === "advanced" ? "Difficult" : difficultyMeta[level].label}</button>)}
        <div className="ml-1 rounded-full bg-[#fff1c9] px-3 py-1.5 text-xs font-semibold text-[#916d22]">+40 XP available</div>
      </div>
    </header>

    <main className="mx-auto grid max-w-6xl gap-7 px-5 py-8 lg:grid-cols-[1fr_330px] lg:px-10 lg:py-12">
      <section>
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa096]"><span className={`rounded-full px-3 py-1 ${difficultyMeta[difficulty].chip}`}>{difficultyMeta[difficulty].label}</span><span>·</span><span>Core lesson</span><span>·</span><span>Multiplication</span></div>
        <h1 className="max-w-2xl font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.065em] text-[#183c31] sm:text-[58px]">Multiplying by 10 is a <span className="text-[#3b926f]">scale-up.</span></h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#648075]">When you multiply by 10, every digit moves one place to the left — the value gets ten times bigger.</p>

        <div className="mt-9 rounded-[28px] border border-[#e3e8df] bg-white p-6 shadow-[0_15px_34px_rgba(26,53,40,.06)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Checkpoint</div><div className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">{active.question}</div></div><div className="rounded-full bg-[#f6f8f3] px-3 py-1.5 text-xs font-semibold text-[#527064]">1 point</div></div>
          <div className="mt-7 grid grid-cols-2 gap-3"><div className="col-span-2 rounded-2xl bg-[#174b3a] p-5 text-white"><div className="text-xs text-[#c4ded0]">Build it with tens</div><div className="mt-4 flex items-end gap-2">{Array.from({ length: difficulty === "easy" ? 3 : difficulty === "hard" || difficulty === "advanced" ? 12 : 12 }).map((_, index) => <div key={index} className={`h-8 w-2 rounded-full ${index % 2 === 0 ? "bg-[#d8f36a]" : "bg-[#9ed63f]"}`} />)}<div className="ml-2 text-xs text-[#c4ded0]">× {difficulty === "hard" || difficulty === "advanced" ? 100 : 10}</div></div><div className="mt-4 text-xs text-[#c4ded0]">{difficulty === "easy" ? "3 ones → 3 tens → 30" : difficulty === "hard" ? "12 ones → 12 hundreds → 1,200" : difficulty === "advanced" ? "12 × 10 per crate → 120, then × 3 crates" : "12 ones → 12 tens → 120"}</div></div>{active.choices.map((choice) => { const picked = selected === choice; const isCorrect = picked && choice === active.correct; const isWrong = picked && choice !== active.correct; return <button key={choice} onClick={() => choose(choice)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${isCorrect ? "border-[#3b926f] bg-[#e8f7ec] text-[#23734e]" : isWrong ? "border-[#ff9a87] bg-[#fff0ec] text-[#a25142]" : picked ? "border-[#6b9f88] bg-[#f2f8ef]" : "border-[#e5ebe3] bg-[#fbfcf9] text-[#25483c] hover:border-[#99bda8] hover:bg-[#f3f8ef]"}`}><span className="font-display text-xl font-semibold tracking-[-0.04em]">{choice}</span>{isCorrect ? <Check size={18} /> : isWrong ? <X size={18} /> : <span className="h-5 w-5 rounded-full border border-[#ccd9ce]" />}</button>; })}</div>
          {selected && <div className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 ${correct ? "bg-[#e8f7ec] text-[#327651]" : "bg-[#fff2e9] text-[#9a5b4d]"}`}>{correct ? <Check className="mt-0.5 shrink-0" size={17} /> : <Lightbulb className="mt-0.5 shrink-0" size={17} />}<div><span className="font-semibold">{correct ? "Nice scaling." : "Close — use the model."}</span> {correct ? active.explain : "Multiplying by 10 makes the number ten times larger, not ten less."}</div></div>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button onClick={() => { setSelected(null); setCompleted(false); }} className="flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[#7d958b] hover:bg-[#f4f7ef]"><RotateCcw size={14} /> Reset</button><Button onClick={next} className="h-11 rounded-full bg-[#173f31] px-5 text-sm font-semibold text-white hover:bg-[#286b51]">{completed ? "Checkpoint complete" : "Continue"}<ChevronRight className="ml-2" size={16} /></Button></div>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-[26px] bg-[#fff1e9] p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff9a87] text-[#713b2f]"><Lightbulb size={18} /></div><div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a36b5c]">Try this</div><p className="mt-2 font-display text-xl font-semibold leading-tight tracking-[-0.04em] text-[#63382d]">Say the sentence: “{difficulty === "advanced" ? "12 × 10 is 120 per crate, times 3 crates." : difficulty === "hard" ? "12 × 100 is 12 hundreds — 1,200." : "12 × 10 is 12 tens."}”</p><p className="mt-3 text-xs leading-5 text-[#a36b5c]">When you explain the move, your brain stores the idea — not just the answer.</p></div>
        <div className="rounded-[26px] border border-[#e3e8df] bg-white p-6"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Column · {difficultyMeta[difficulty].label} band</div><div className="mt-5 space-y-4">{["Warm-up: number lines", "Scale by 10", "Scale by 100", "Real-world challenge"].map((item, index) => <div key={item} className="flex items-center gap-3 text-sm"><div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${index < 2 ? "bg-[#e5f5ed] text-[#34775e]" : "bg-[#f6f8f3] text-[#9aaca2]"}`}>{index < 2 ? <Check size={13} /> : index + 1}</div><span className={index === 1 ? "font-semibold text-[#25483c]" : "text-[#8aa096]"}>{item}</span></div>)}</div></div>
      </aside>
    </main>
  </div>;
}