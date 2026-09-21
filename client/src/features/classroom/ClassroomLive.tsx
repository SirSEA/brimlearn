import { CalendarClock, Clock3, ExternalLink, MessageSquare, Mic, MicOff, PhoneOff, Signal, Video, VideoOff, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

type Session = { id: string; title: string; subject: string; platform: string; tone: string; time: string; soon: boolean };

const sessions: Session[] = [
  { id: "s1", title: "Multiplication in the market · live", subject: "Mathematics", platform: "Google Meet", tone: "bg-[#eaf2ff] text-[#3975aa]", time: "Wed 3:00–3:45pm", soon: true },
  { id: "s2", title: "Comprehension circle", subject: "English Studies", platform: "Zoom", tone: "bg-[#fff1d7] text-[#b07a1f]", time: "Fri 10:00–10:40am", soon: false },
  { id: "s3", title: "States of matter lab demo", subject: "Basic Science", platform: "Google Meet", tone: "bg-[#e5f5ed] text-[#34775e]", time: "Mon 2:00–2:40pm", soon: false },
  { id: "s4", title: "Literacy coaching · small group", subject: "English Studies", platform: "Zoom", tone: "bg-[#fff0ec] text-[#a25142]", time: "Tue 9:00–9:30am", soon: false },
];

function formatCountdown(millis: number) {
  const total = Math.max(0, Math.floor(millis / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

export function ClassroomLive() {
  const [live, setLive] = useState<Session | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [lapsedAt, setLapsedAt] = useState(0);
  const nextTarget = useMemo(() => {
    const target = new Date();
    target.setHours(15, 0, 0, 0);
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
    return target;
  }, []);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (live) {
      const elapsed = window.setInterval(() => setLapsedAt((seconds) => seconds + 1), 1000);
      return () => window.clearInterval(elapsed);
    }
    setLapsedAt(0);
  }, [live]);

  const openLive = (session: Session) => {
    setLive(session);
    setMuted(false);
    setCameraOff(false);
    toast.success(`Joined ${session.title}.`);
  };

  const leaveLive = () => {
    setLive(null);
    toast("You left the live class. Recording will appear in your library soon.");
  };

  const { days, hours, minutes, seconds } = formatCountdown(nextTarget.getTime() - now);
  const units = [
    { value: days, label: "days" },
    { value: hours, label: "hours" },
    { value: minutes, label: "minutes" },
    { value: seconds, label: "seconds" },
  ];
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><Video size={13} /> Live classroom</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Next class starts soon.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Maths with Ms. Sola, Wednesday 3:00pm on Google Meet. The join link appears 10 minutes before start.</p>
          </div>
          <div className="flex items-center gap-3">
            {units.map((unit) => <div key={unit.label} className="grid h-[72px] w-[72px] place-items-center rounded-2xl border border-white/10 bg-white/[0.07]"><div className="text-center"><div className="font-display text-2xl font-semibold tracking-[-0.04em] text-[#d8f36a]">{unit.value}</div><div className="text-[10px] text-[#c4ded0]">{unit.label}</div></div></div>)}
          </div>
        </div>
      </section>

      {live && (
        <section className="mt-7 overflow-hidden rounded-[27px] border border-[#e3e8df] bg-white shadow-[0_18px_40px_rgba(18,61,48,.1)]">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1">
              <div className="relative aspect-video bg-[#0f2b22]">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white/5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d4d]/30" />
                    <Video size={34} className="text-[#c4ded0]" />
                  </div>
                </div>
                <div className="absolute left-4 top-4 flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-full bg-[#ff4d4d] px-2.5 py-1 text-[10px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE</span><span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white">{pad(Math.floor(lapsedAt / 60))}:{pad(lapsedAt % 60)}</span></div>
                <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">{[["Ms. Sola", live.tone], ["12 others", "bg-white/10 text-white"]].map(([label, tone]) => <span key={label} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-[#3b926f]" />{label}</span>)}</div>
                <div className="absolute bottom-4 left-4"><div className="text-white"><div className="text-xs font-semibold text-[#d8f36a]">{live.title}</div><div className="text-[10px] text-[#c4ded0]">{live.subject} · {live.platform}</div></div></div>
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-semibold text-white"><Signal size={13} className="text-[#3b926f]" /> Stable 1080p · low latency</div>
              </div>
              <div className="flex items-center justify-center gap-3 border-t border-[#e9eee5] bg-[#fbfcf9] p-4">
                <button onClick={() => { setMuted((value) => !value); }} className={`grid h-11 w-11 place-items-center rounded-full transition ${muted ? "bg-white text-[#a25142] shadow-sm" : "bg-[#173f31] text-white hover:bg-[#286b51]"}`} title={muted ? "Unmute" : "Mute"}>{muted ? <MicOff size={17} /> : <Mic size={17} />}</button>
                <button onClick={() => { setCameraOff((value) => !value); }} className={`grid h-11 w-11 place-items-center rounded-full transition ${cameraOff ? "bg-white text-[#a25142] shadow-sm" : "bg-[#173f31] text-white hover:bg-[#286b51]"}`} title={cameraOff ? "Camera on" : "Camera off"}>{cameraOff ? <VideoOff size={17} /> : <Video size={17} />}</button>
                <button onClick={() => toast.info("Chat is shared with the class — keep questions on topic.")} className="grid h-11 w-11 place-items-center rounded-full bg-[#173f31] text-white transition hover:bg-[#286b51]" title="Open chat"><MessageSquare size={17} /></button>
                <button onClick={leaveLive} className="ml-2 flex items-center gap-2 rounded-full bg-[#d9533f] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#c1402e]"><PhoneOff size={14} /> Leave class</button>
              </div>
            </div>
            <aside className="w-full border-t border-[#e9eee5] bg-[#fbfcf9] p-5 lg:w-72 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between"><div className="text-xs font-semibold text-[#25483c]">Class chat</div><button onClick={() => setLive(null)} className="rounded-lg p-1.5 text-[#8aa096] hover:bg-[#eef4ea]" aria-label="Close live class"><X size={15} /></button></div>
              <div className="mt-4 space-y-3">{[[ "Ms. Sola", "Welcome back! Turn sound on for the warm-up.", "bg-[#eaf2ff] text-[#3975aa]" ], ["Amara", "Hi ma, ready for the ×10 trick!", "bg-[#d8f36a] text-[#31583f]" ], ["Ms. Sola", "Great — watch the board, then try the market challenge.", "bg-[#eaf2ff] text-[#3975aa]" ]].map(([name, text, tone], index) => <div key={index} className="flex items-start gap-2.5"><div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold ${tone}`}>{String(name).split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="min-w-0"><div className="text-[10px] font-semibold text-[#527064]">{name}</div><div className="mt-0.5 text-xs leading-5 text-[#25483c]">{text}</div></div></div>)}</div>
              <div className="mt-4 flex items-center gap-2"><input placeholder="Say something…" className="min-w-0 flex-1 rounded-full border border-[#e1e8df] bg-white px-3 py-2 text-xs text-[#25483c] outline-none focus:border-[#5d9c7d]" /><button onClick={() => toast.success("Message sent to the class.")} className="shrink-0 rounded-full bg-[#173f31] px-3 py-2 text-xs font-semibold text-white hover:bg-[#286b51]">Send</button></div>
            </aside>
          </div>
        </section>
      )}

      <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
        <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Session schedule</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#183c31]">Weekly live classes.</h2></div><div className="rounded-full bg-[#f4f7ef] px-3 py-1.5 text-xs font-semibold text-[#527064]"><CalendarClock size={13} className="mr-1.5 inline" />4 this week</div></div>
        <div className="mt-6 space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-4 rounded-2xl border border-[#e9eee5] p-4 transition hover:border-[#c9d8cc] sm:flex-row sm:items-center">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${session.tone}`}><Video size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[#25483c]">{session.title}</span>{session.soon && <span className="rounded-full bg-[#fff1c9] px-2 py-0.5 text-[10px] font-bold text-[#916d22]">Next up</span>}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#8aa096]"><span className="flex items-center gap-1.5"><CalendarClock size={13} /> {session.time}</span><span className="flex items-center gap-1.5"><ExternalLink size={13} /> {session.platform}</span></div>
              </div>
              <button onClick={() => openLive(session)} className="shrink-0 rounded-full bg-[#173f31] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#286b51]">Join class</button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#f0d6c9] bg-[#fffaf6] p-6 sm:p-7">
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ff9a87] text-[#713b2f]"><Clock3 size={18} /></div><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a36b5c]">Before you join</div><p className="mt-1 text-sm leading-6 text-[#7c827b]">Test your camera and mic early, join on time, and mute until you raise your hand. Recordings land in your resource library within 2 hours.</p></div></div>
      </section>
    </>
  );
}