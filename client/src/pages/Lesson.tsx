import {
  AlarmClockCheck,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  KeyRound,
  Lightbulb,
  MonitorPlay,
  Presentation,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";

/** The fixed 15–20 minute teaching video in the lesson player. */
const LESSON_VIDEO = {
  youtubeId: "d0V_w6PBM9A",
  title: "Multiply by 10, 100 and 1,000",
  duration: "15 min",
};

/** A worksheet delivers the same objective at three levels, so every child
 *  is carried along — regardless of where they start. */
type WorksheetLevel = "core" | "support" | "challenge";

const worksheetMeta: Record<
  WorksheetLevel,
  { label: string; blurb: string; tone: string; chip: string }
> = {
  core: {
    label: "Core",
    blurb: "The standard worksheet. Enough to hit the objective solidly.",
    tone: "bg-[#173f31] text-white",
    chip: "bg-[#e5f5ed] text-[#2f7a57]",
  },
  support: {
    label: "Support",
    blurb:
      "Extra step-by-step guidance, worked examples and fewer numbers per row — for anyone who needs a lighter runway.",
    tone: "bg-[#4e91c6] text-white",
    chip: "bg-[#e7f2ff] text-[#3774ac]",
  },
  challenge: {
    label: "Challenge",
    blurb:
      "Harder, multi-step and real-world questions — for learners ready to push beyond the standard.",
    tone: "bg-[#a25142] text-white",
    chip: "bg-[#fff0ec] text-[#a25142]",
  },
};

const OBJECTIVES = [
  "Use counting in 10s to find batches of 10.",
  "Explain that multiplying by 10 shifts every digit one place to the left.",
  "Scale up a known fact (3 × 10 → 30) and use it for 12 × 10, 12 × 100.",
];

const KEY_WORDS = ["times", "multiply", "place value", "10s", "scale up", "hundreds"];

/** Materials a learner should have ready before starting this lesson. */
const REQUIREMENTS = [
  { icon: "🧮", label: "Abacus or place-value chart" },
  { icon: "📘", label: "Graph book" },
  { icon: "✏️", label: "Pencil, ruler and drawing materials" },
  { icon: "✂️", label: "Scissors (for the cut-and-stick worksheet)" },
];

export default function Lesson() {
  const [, setLocation] = useLocation();
  const [level, setLevel] = useState<WorksheetLevel>("core");
  const [objectivesDone, setObjectivesDone] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  const startObjective = () => {
    setObjectivesDone(true);
    toast.success("Learning objectives marked done. Next up: the video.");
  };

  return (
    <div className="min-h-screen bg-[#fbfbf6] text-[#183c31]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#dfe5d9] bg-[#fbfbf6] px-5 lg:px-10">
        <button
          onClick={() => setLocation("/learner")}
          className="flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold text-[#527064] hover:bg-[#edf1e9]"
        >
          <ArrowLeft size={17} /> Exit lesson
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full bg-[#e5f5ed] px-3 py-1.5 text-xs font-semibold text-[#2f7a57]">
            Week 1 · Lesson 2
          </span>
          <span className="text-[#8aa096]">/</span>
          <span className="text-xs font-semibold text-[#8aa096]">Multiply by 10s</span>
        </div>
        </header>

      <main className="mx-auto grid max-w-6xl gap-7 px-5 py-8 lg:grid-cols-[1fr_330px] lg:px-10 lg:py-12">
        <section className="space-y-7">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">
              Lesson topic
            </div>
            <h1 className="mt-1 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.065em] text-[#183c31] sm:text-[46px]">
              Multiplying by 10 <span className="text-[#3b926f]">is a scale-up.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#7d958b]">
              We turn a number you already know into a ten-times-bigger number — the same
              move a market trader makes every day.
            </p>
          </div>

          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">
                  Learning objectives
                </div>
                <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.05em] text-[#183c31]">
                  What you’ll be able to do
                </h2>
              </div>
              <button
                onClick={startObjective}
                disabled={objectivesDone}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                  objectivesDone
                    ? "bg-[#e5f5ed] text-[#2f7a57]"
                    : "bg-[#173f31] text-white hover:bg-[#286b51]"
                }`}
              >
                {objectivesDone ? <Check size={13} /> : <Target size={13} />}
                {objectivesDone ? "Marked complete" : "Mark complete"}
              </button>
            </div>
            <ul className="mt-5 space-y-3">
              {OBJECTIVES.map((objective) => (
                <li key={objective} className="flex items-start gap-3 text-sm leading-6 text-[#3d5a4f]">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e5f5ed] text-[#2f7a57]">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {objective}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">
              <KeyRound size={13} /> Key words
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {KEY_WORDS.map((word) => (
                <span
                  key={word}
                  className="rounded-full border border-[#e3e8df] bg-[#f6f8f3] px-3 py-1.5 text-xs font-semibold text-[#527064]"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[27px] border border-[#e6e7dc] bg-[#fcf9ef] p-6 sm:p-7">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a7a43]">
              <AlarmClockCheck size={14} /> Before you start — have ready
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {REQUIREMENTS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-[#eee7cf] bg-white/70 px-4 py-3 text-sm text-[#5a5237]"
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">
                <MonitorPlay size={13} /> Lesson video · {LESSON_VIDEO.duration}
              </div>
              <span className="rounded-full bg-[#fff1d7] px-3 py-1.5 text-xs font-semibold text-[#916d22]">
                One pass is enough
              </span>
            </div>
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-[#0e2b22]">
              <iframe
                title={LESSON_VIDEO.title}
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${LESSON_VIDEO.youtubeId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <div className="font-semibold text-[#183c31]">{LESSON_VIDEO.title}</div>
              <button
                onClick={() => setVideoWatched(true)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  videoWatched
                    ? "bg-[#e5f5ed] text-[#2f7a57]"
                    : "bg-[#f6f8f3] text-[#527064] hover:bg-[#edf1e9]"
                }`}
              >
                {videoWatched ? <Check size={12} /> : <Sparkles size={12} />}
                {videoWatched ? "Watched" : "Mark watched"}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[27px] border border-[#e3e8df] bg-white p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">
              <ClipboardList size={13} /> Practice
            </div>
            <p className="mt-3 text-sm leading-6 text-[#7d958b]">
              One objective, three levels — pick the sheet that matches your confidence,
              then move up.
            </p>
            <div className="mt-4 grid gap-2">
              {(Object.keys(worksheetMeta) as WorksheetLevel[]).map((key) => {
                const meta = worksheetMeta[key];
                const active = level === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setLevel(key);
                      toast(`${meta.label} worksheet selected.`, { description: meta.blurb });
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#173f31] bg-[#f3f8ef]"
                        : "border-[#e3e8df] bg-white hover:border-[#bcd0c4]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}>
                        {meta.label}
                      </span>
                      <ChevronRight size={15} className="text-[#8aa096]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#8aa096]">{meta.blurb}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => toast("Worksheet opens here once attached by your tutor.")}
                className="flex w-full items-center justify-between rounded-2xl border border-[#e3e8df] bg-[#fbfcf9] px-4 py-3 text-left text-sm font-semibold text-[#527064] hover:border-[#bcd0c4]"
              >
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-[#3b926f]" />
                  {worksheetMeta[level].label} worksheet PDF
                </span>
                <span className="text-xs text-[#8aa096]">attach</span>
              </button>
              <button
                onClick={() => toast("PowerPoint opens here once attached by your tutor.")}
                className="flex w-full items-center justify-between rounded-2xl border border-[#e3e8df] bg-[#fbfcf9] px-4 py-3 text-left text-sm font-semibold text-[#527064] hover:border-[#bcd0c4]"
              >
                <span className="flex items-center gap-2">
                  <Presentation size={15} className="text-[#c58e3d]" />
                  Lesson PowerPoint
                </span>
                <span className="text-xs text-[#8aa096]">attach</span>
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-[#f4f7ef] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#527064]">
                <Trophy size={14} className="text-[#c58e3d]" /> After you finish
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#8aa096]">
                Complete this lesson to unlock Week 1’s next lesson — and keep your streak
                alive.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
