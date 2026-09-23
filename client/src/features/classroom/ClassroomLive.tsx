import { CalendarClock, Clock3, ExternalLink, Video } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { api, type LiveSession } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { isEmbeddedRoom, LIVE_PLATFORM_LABELS, sessionStatus } from "@shared/session";
import { LiveRoom } from "./LiveRoom";

type Session = {
  id: string;
  title: string;
  subject: string;
  platformKey: LiveSession["platform"];
  platform: string;
  tone: string;
  time: string;
  soon: boolean;
  meetingUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

const demoSessions: Session[] = [
  { id: "s1", title: "Multiplication in the market · live", subject: "Mathematics", platformKey: "jitsi", platform: "BrimLearn Live", tone: "bg-[#E8EFF9] text-[#274852]", time: "Today · live now", soon: true, meetingUrl: null, startsAt: null, endsAt: null },
  { id: "s2", title: "Comprehension circle", subject: "English Studies", platformKey: "jitsi", platform: "BrimLearn Live", tone: "bg-[#FFF1CD] text-[#B67A17]", time: "Fri 10:00–10:40am", soon: false, meetingUrl: null, startsAt: null, endsAt: null },
  { id: "s3", title: "States of matter lab demo", subject: "Basic Science", platformKey: "zoom", platform: "Zoom", tone: "bg-[#E9EED9] text-[#4B6B3C]", time: "Mon 2:00–2:40pm", soon: false, meetingUrl: null, startsAt: null, endsAt: null },
  { id: "s4", title: "Literacy coaching · small group", subject: "English Studies", platformKey: "jitsi", platform: "BrimLearn Live", tone: "bg-[#FBEBE5] text-[#B84B3D]", time: "Tue 9:00–9:30am", soon: false, meetingUrl: null, startsAt: null, endsAt: null },
];

function toSession(session: LiveSession): Session {
  return {
    id: session.id,
    title: session.title,
    subject: session.subject ?? "",
    platformKey: session.platform,
    platform: LIVE_PLATFORM_LABELS[session.platform] ?? "Other link",
    tone: "bg-[#E8EFF9] text-[#274852]",
    time: timeLabel(session.startsAt, session.endsAt),
    soon: false,
    meetingUrl: session.meetingUrl && /^https?:\/\//i.test(session.meetingUrl) ? session.meetingUrl : null,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
  };
}

function formatCountdown(millis: number) {
  const total = Math.max(0, Math.floor(millis / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

function timeLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const times = `${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  return `${date} · ${times}`;
}

function runsEmbedded(session: Session): boolean {
  return isEmbeddedRoom({ platform: session.platformKey, meetingUrl: session.meetingUrl });
}

export function ClassroomLive() {
  const { user } = useAuth();
  const [live, setLive] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(demoSessions);
  const [nextUpcoming, setNextUpcoming] = useState<Session | null>(null);
  const nextTarget = useMemo(
    () => (nextUpcoming && nextUpcoming.startsAt ? new Date(nextUpcoming.startsAt) : new Date(Date.now() + 45 * 60 * 1000)),
    [nextUpcoming]
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .listLiveSessions()
      .then((list) => {
        if (!mounted || list.length === 0) return;
        const mapped = list.map(toSession);
        const upcoming = mapped
          .filter((session) => session.startsAt && sessionStatus({ startsAt: session.startsAt, endsAt: session.endsAt ?? session.startsAt } as LiveSession) === "upcoming")
          .sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime());
        setSessions(
          mapped.map((session) => ({
            ...session,
            soon: upcoming[0]?.id === session.id,
          }))
        );
        if (upcoming[0]) setNextUpcoming(upcoming[0]);
      })
      .catch(() => {
        // Offline demo — keep the hardcoded schedule.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openLive = (session: Session) => {
    if (runsEmbedded(session)) {
      setLive(session);
      toast.success("You joined the live classroom. Mute until the teacher opens the floor.");
      return;
    }
    if (session.meetingUrl) {
      window.open(session.meetingUrl, "_blank", "noopener,noreferrer");
      toast.success(`Opening ${session.title} in a new tab.`);
      return;
    }
    toast.info("This class hasn't started yet — the join link will appear when it begins.");
  };

  const leaveLive = () => {
    setLive(null);
    toast("You left the live class. A recording will appear in your library if the teacher shared one.");
  };

  const { days, hours, minutes, seconds } = formatCountdown(nextTarget.getTime() - now);
  const units = [
    { value: days, label: "days" },
    { value: hours, label: "hours" },
    { value: minutes, label: "minutes" },
    { value: seconds, label: "seconds" },
  ];

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><Video size={13} /> Live classroom</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Next class starts soon.</h1>
            <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">Classes run inside the app's live room — video, class chat, and questions in one place. Join from the schedule below.</p>
          </div>
          <div className="flex items-center gap-3">
            {units.map((unit) => <div key={unit.label} className="grid h-[72px] w-[72px] place-items-center rounded-2xl border border-white/10 bg-white/[0.07]"><div className="text-center"><div className="font-display text-2xl font-semibold tracking-[-0.04em] text-[#FFC857]">{unit.value}</div><div className="text-[10px] text-[#D9C4B0]">{unit.label}</div></div></div>)}
          </div>
        </div>
      </section>

      {live && (
        <LiveRoom
          session={{ id: live.id, title: live.title, subject: live.subject, hostName: "Ms. Sola" }}
          displayName={user?.name ?? "Learner"}
          isHost={false}
          onLeave={leaveLive}
        />
      )}

      <section className="mt-7 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Session schedule</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">Weekly live classes.</h2></div><div className="rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]"><CalendarClock size={13} className="mr-1.5 inline" />{sessions.length} this week</div></div>
        <div className="mt-6 space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-4 rounded-2xl border border-[#F3E9DE] p-4 transition hover:border-[#C8B3A0] sm:flex-row sm:items-center">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${session.tone}`}><Video size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[#3B241A]">{session.title}</span>{session.soon && <span className="rounded-full bg-[#FFF1CD] px-2 py-0.5 text-[10px] font-bold text-[#9A6712]">Next up</span>}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#A08A75]"><span className="flex items-center gap-1.5"><CalendarClock size={13} /> {session.time}</span><span className="flex items-center gap-1.5"><ExternalLink size={13} /> {session.platform}</span></div>
              </div>
              <button onClick={() => openLive(session)} className="shrink-0 rounded-full bg-[#C65A2E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A84A22]">Join class</button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#f0d6c9] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F28B78] text-[#69412F]"><Clock3 size={18} /></div><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A86F5E]">In the live room</div><p className="mt-1 text-sm leading-6 text-[#8A7361]">Use the in-built controls for camera, mic, text chat, and hand-raising. Test your camera and mic early, join on time, and stay muted until the teacher opens the floor.</p></div></div>
      </section>
    </>
  );
}