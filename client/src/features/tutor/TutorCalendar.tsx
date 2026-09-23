import { CalendarDays, CheckCircle2, Clock3, Plus, Users2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { api, type LiveSession } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { isEmbeddedRoom, LIVE_PLATFORM_LABELS } from "@shared/session";
import { LiveRoom } from "@/features/classroom/LiveRoom";

type CalendarEvent = { id: string; dateOffset: number; time: string; kind: "live" | "deadline" | "meeting"; title: string; meta: string; tone: string; url: string | null };

const seedEvents: CalendarEvent[] = [
  { id: "e1", dateOffset: 0, time: "03:00 PM", kind: "live", title: "Live class · Multiplication in the market", meta: "JSS1 · BrimLearn Live", tone: "bg-[#E8EFF9] text-[#274852]", url: null },
  { id: "e2", dateOffset: 0, time: "06:00 PM", kind: "deadline", title: "Fractions worksheet due", meta: "Whole class · auto-marked", tone: "bg-[#FFF1CD] text-[#9A6712]", url: null },
  { id: "e3", dateOffset: 1, time: "04:00 PM", kind: "meeting", title: "Parent check-in · Amara Okafor", meta: "Video call · 30 min", tone: "bg-[#E9EED9] text-[#4B6B3C]", url: null },
  { id: "e4", dateOffset: 2, time: "10:00 AM", kind: "live", title: "Comprehension circle · small group", meta: "JSS1 · BrimLearn Live", tone: "bg-[#E8EFF9] text-[#274852]", url: null },
  { id: "e5", dateOffset: 2, time: "01:00 PM", kind: "meeting", title: "Curriculum planning · English dept", meta: "Meeting room · 45 min", tone: "bg-[#E9EED9] text-[#4B6B3C]", url: null },
  { id: "e6", dateOffset: 4, time: "11:00 AM", kind: "deadline", title: "Weekend practice pack due", meta: "Whole class · 3 subjects", tone: "bg-[#FFF1CD] text-[#9A6712]", url: null },
  { id: "e7", dateOffset: 5, time: "02:00 PM", kind: "live", title: "States of matter lab demo", meta: "JSS1 · BrimLearn Live", tone: "bg-[#E8EFF9] text-[#274852]", url: null },
];

const kinds: Array<{ key: "all" | CalendarEvent["kind"]; label: string }> = [
  { key: "all", label: "Everything" },
  { key: "live", label: "Live sessions" },
  { key: "deadline", label: "Deadlines" },
  { key: "meeting", label: "Parent meetings" },
];

const kindIcon = { live: Video, deadline: CheckCircle2, meeting: Users2 };
const kindTone: Record<CalendarEvent["kind"], string> = { live: "bg-[#E8EFF9] text-[#274852]", deadline: "bg-[#FFF1CD] text-[#9A6712]", meeting: "bg-[#E9EED9] text-[#4B6B3C]" };

/** Converts an ISO session into a calendar event (on today's 7-day window). */
function sessionToEvent(session: LiveSession): CalendarEvent {
  const start = new Date(session.startsAt);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = Math.round((start.getTime() - midnight.getTime()) / 86_400_000);
  return {
    id: session.id,
    dateOffset: day < 0 ? 0 : day < 7 ? day : -1,
    time: start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    kind: "live",
    title: session.title,
    meta: `${session.subject ?? "Class"} · ${LIVE_PLATFORM_LABELS[session.platform] ?? session.platform}`,
    tone: kindTone.live,
    url: session.meetingUrl && /^https?:\/\//i.test(session.meetingUrl) ? session.meetingUrl : null,
  };
}

/** Builds an ISO start/end pair from a day offset + "hh:mm AM/PM" time label. */
function toIsoRange(dateOffset: number, timeLabel: string, durationMinutes = 45): { startsAt: string; endsAt: string } {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dateOffset);
  let hour = 15;
  let minute = 0;
  const match = timeLabel.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
  if (match) {
    let hours = Number(match[1]) % 12;
    if (/PM/i.test(match[3])) hours += 12;
    hour = hours;
    minute = Number(match[2]);
  } else {
    const parts = timeLabel.split(":").map(Number);
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      hour = parts[0];
      minute = parts[1];
    }
  }
  day.setHours(hour, minute, 0, 0);
  const start = day;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function TutorCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [filter, setFilter] = useState<"all" | CalendarEvent["kind"]>("all");
  const [scheduling, setScheduling] = useState(false);
  const [hosting, setHosting] = useState<CalendarEvent | null>(null);
  const [kind, setKind] = useState<CalendarEvent["kind"]>("live");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("15:00");
  const [dateOffset, setDateOffset] = useState(0);
  const [meta, setMeta] = useState("");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
  const visible = events.filter((event) => filter === "all" || event.kind === filter);

  const refresh = useCallback(() => {
    api
      .listLiveSessions()
      .then((list) => {
        const liveEvents = list.map(sessionToEvent).filter((event) => event.dateOffset >= 0);
        setEvents([...liveEvents, ...seedEvents.filter((event) => event.kind !== "live")]);
      })
      .catch(() => {
        // Offline demo — keep the hardcoded schedule.
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const joinEvent = (event: CalendarEvent) => {
    if (event.kind === "meeting") {
      toast("Meeting room opened — invite sent.");
      return;
    }
    if (event.kind === "deadline") {
      toast("Deadline reminder sent to the class.");
      return;
    }

    // Zoom / Google Meet links can't be embedded — open them in a new tab.
    if (event.url && !isEmbeddedRoom({ platform: "other", meetingUrl: event.url })) {
      window.open(event.url, "_blank", "noopener,noreferrer");
      toast.success("Meeting link opened in a new tab. You can now start as the host.");
      return;
    }

    setHosting(event);
    toast.success("Live room opened — you joined as the host. Learners can now join the same room.");
  };

  const save = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast("Give the new slot a title first.");
      return;
    }
    if (!time.trim()) {
      toast("Pick a time for the slot.");
      return;
    }
    if (kind === "live") {
      const { startsAt, endsAt } = toIsoRange(dateOffset, time);
      try {
        const created = await api.createLiveSession({
          title: trimmedTitle,
          description: meta.trim(),
          platform: "jitsi",
          subject: "Mathematics",
          subjectId: "maths",
          grade: "JSS1",
          term: "First term",
          week: "1",
          startsAt,
          endsAt,
        });
        const event = sessionToEvent(created);
        if (event) setEvents((current) => [...current.filter((item) => item.kind !== "live"), event]);
        toast.success("Live class scheduled — learners can join it from their Classroom tab.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not schedule the live session right now.");
      }
    } else {
      setEvents((current) => [...current, {
        id: `new-${Date.now()}`,
        dateOffset,
        time: time.trim(),
        kind,
        title: trimmedTitle,
        meta: meta.trim() || (kind === "meeting" ? "Video call · 30 min" : "Whole class · auto-marked"),
        tone: kindTone[kind],
        url: null,
      }]);
      toast.success("Slot scheduled — it’s now on the class calendar.");
    }
    setScheduling(false);
    setTitle("");
    setMeta("");
    setTime("15:00");
    setDateOffset(0);
    setKind("live");
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><CalendarDays size={13} /> Class calendar</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Sessions, deadlines, and catch-ups.</h1>
            <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">Book live classes, keep deadlines visible, and set parent meetings without the back-and-forth.</p>
          </div>
          <button onClick={() => setScheduling(true)} className="rounded-full bg-[#FFC857] px-5 py-3 text-sm font-semibold text-[#3B241A] hover:bg-[#FFC857]"><Plus className="mr-1.5 inline" size={15} /> Schedule new</button>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.map((kind) => <button key={kind.key} onClick={() => setFilter(kind.key)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === kind.key ? "bg-[#C65A2E] text-white" : "bg-[#F7EFE3] text-[#765F4F] hover:bg-[#EFEFDD]"}`}>{kind.label}</button>)}
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-[#A08A75]"><Clock3 size={13} /> {visible.length} upcoming</span>
        </div>
        <div className="mt-6 space-y-2.5">
          {days.map((day, dayIndex) => {
            const dayEvents = visible.filter((event) => event.dateOffset === dayIndex).sort((a, b) => a.time.localeCompare(b.time));
            if (dayEvents.length === 0) return null;
            const label = day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
            const isToday = dayIndex === 0;
            return (
              <div key={day.toISOString()} className="rounded-2xl border border-[#F3E9DE] p-4">
                <div className="flex items-center gap-2"><Clock3 size={13} className="text-[#A08A75]" /><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#765F4F]">{label}</span>{isToday && <span className="rounded-full bg-[#FFF1CD] px-2 py-0.5 text-[10px] font-bold text-[#9A6712]">Today</span>}</div>
                <div className="mt-3 space-y-2">
                  {dayEvents.map((event) => {
                    const Icon = kindIcon[event.kind];
                    return (
                      <div key={event.id} className="flex flex-col gap-3 rounded-xl bg-[#FFFDF8] p-3 sm:flex-row sm:items-center">
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${event.tone}`}><Icon size={16} /></div>
                        <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[#3B241A]">{event.title}</div><div className="mt-0.5 text-xs text-[#A08A75]">{event.meta}</div></div>
                        <div className="flex items-center gap-3"><span className="rounded-full bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#765F4F] shadow-sm">{event.time}</span><button onClick={() => joinEvent(event)} className="rounded-full bg-[#C65A2E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A84A22]">{event.kind === "live" ? "Start teaching" : event.kind === "meeting" ? "Open" : "Remind"}</button></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {days.length === 0 && <div className="rounded-2xl bg-[#F7EFE3] p-8 text-center text-sm text-[#8A7361]">Nothing scheduled in this window.</div>}
        </div>
      </section>

      {scheduling && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#1A1512]/45 p-4" onClick={() => setScheduling(false)}>
          <div className="w-full max-w-lg rounded-[28px] bg-[#FFFDF8] p-7 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Class calendar</div>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">Schedule a new slot.</h2>
                <p className="mt-2 text-sm leading-6 text-[#765F4F]">Pick a kind, a day in the next week, and a time. It will appear instantly on the calendar.</p>
              </div>
              <button onClick={() => setScheduling(false)} className="rounded-xl p-2 text-[#A08A75] hover:bg-[#F7EFE3]" aria-label="Close scheduling"><X size={18} /></button>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold text-[#765F4F]">What kind of slot?</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([["live", "Live session", Video], ["deadline", "Deadline", CheckCircle2], ["meeting", "Parent meeting", Users2]] as Array<[CalendarEvent["kind"], string, typeof Video]>).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setKind(key)} className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold transition ${kind === key ? "border-[#4B6B3C] bg-[#E9EED9] text-[#4B6B3C]" : "border-[#E2CDB8] bg-[#FFFDF8] text-[#765F4F] hover:border-[#A9BF87]"}`}><Icon size={17} />{label}</button>
                ))}
              </div>
              {kind === "live" && <div className="mt-3 rounded-2xl bg-[#E8EFF9] p-3 text-[11px] leading-5 text-[#274852]">Live sessions run in BrimLearn's embedded classroom. You start it as host; learners join the same room from their Classroom tab — video, chat, and hand-raising included.</div>}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[#765F4F]">Title<span className="mt-1.5 block"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "live" ? "e.g. Live class · Ratios intro" : kind === "deadline" ? "e.g. Worksheet due" : "e.g. Parent check-in · name"} className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none placeholder:font-medium placeholder:text-[#B3A089] focus:border-[#8CAE70]" /></span></label>
              <label className="block text-xs font-semibold text-[#765F4F]">Day<span className="mt-1.5 block"><select value={dateOffset} onChange={(event) => setDateOffset(Number(event.target.value))} className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]">{days.map((day, index) => <option key={index} value={index}>{day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></span></label>
              <label className="block text-xs font-semibold text-[#765F4F]">Time<span className="mt-1.5 block"><input type="time" list="calendar-times" value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70]" /></span><datalist id="calendar-times"><option value="09:00 AM" /><option value="10:00 AM" /><option value="11:00 AM" /><option value="01:00 PM" /><option value="02:00 PM" /><option value="03:00 PM" /><option value="04:00 PM" /><option value="05:00 PM" /></datalist></label>
              <label className="block text-xs font-semibold text-[#765F4F]">Details (optional)<span className="mt-1.5 block"><input value={meta} onChange={(event) => setMeta(event.target.value)} placeholder={kind === "live" ? "JSS1 · BrimLearn Live (embedded room)" : kind === "meeting" ? "Video call · 30 min" : "Whole class · auto-marked"} className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none placeholder:font-medium placeholder:text-[#B3A089] focus:border-[#8CAE70]" /></span></label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setScheduling(false)} className="rounded-full px-4 py-3 text-sm font-semibold text-[#8A7361] hover:bg-[#F7EFE3]">Cancel</button>
              <button onClick={save} className="rounded-full bg-[#C65A2E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#A84A22]">Schedule slot</button>
            </div>
          </div>
        </div>
      )}

      {hosting && (
        <LiveRoom
          session={{ id: hosting.id, title: hosting.title, subject: "", hostName: "You" }}
          displayName={user?.name ?? "Teacher"}
          isHost
          onLeave={() => setHosting(null)}
        />
      )}
    </>
  );
}