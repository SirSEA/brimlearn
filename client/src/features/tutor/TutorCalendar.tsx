import { CalendarDays, CheckCircle2, Clock3, Users2, Video } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type CalendarEvent = { id: string; dateOffset: number; time: string; kind: "live" | "deadline" | "meeting"; title: string; meta: string; tone: string };

const events: CalendarEvent[] = [
  { id: "e1", dateOffset: 0, time: "03:00 PM", kind: "live", title: "Live class · Multiplication in the market", meta: "JSS1 · Google Meet", tone: "bg-[#eaf2ff] text-[#3975aa]" },
  { id: "e2", dateOffset: 0, time: "06:00 PM", kind: "deadline", title: "Fractions worksheet due", meta: "Whole class · auto-marked", tone: "bg-[#fff1d7] text-[#916d22]" },
  { id: "e3", dateOffset: 1, time: "04:00 PM", kind: "meeting", title: "Parent check-in · Amara Okafor", meta: "Video call · 30 min", tone: "bg-[#e5f5ed] text-[#34775e]" },
  { id: "e4", dateOffset: 2, time: "10:00 AM", kind: "live", title: "Comprehension circle · small group", meta: "JSS1 · Zoom", tone: "bg-[#eaf2ff] text-[#3975aa]" },
  { id: "e5", dateOffset: 2, time: "01:00 PM", kind: "meeting", title: "Curriculum planning · English dept", meta: "Meeting room · 45 min", tone: "bg-[#e5f5ed] text-[#34775e]" },
  { id: "e6", dateOffset: 4, time: "11:00 AM", kind: "deadline", title: "Weekend practice pack due", meta: "Whole class · 3 subjects", tone: "bg-[#fff1d7] text-[#916d22]" },
  { id: "e7", dateOffset: 5, time: "02:00 PM", kind: "live", title: "States of matter lab demo", meta: "JSS1 · Google Meet", tone: "bg-[#eaf2ff] text-[#3975aa]" },
];

const kinds: Array<{ key: "all" | CalendarEvent["kind"]; label: string }> = [
  { key: "all", label: "Everything" },
  { key: "live", label: "Live sessions" },
  { key: "deadline", label: "Deadlines" },
  { key: "meeting", label: "Parent meetings" },
];

const kindIcon = { live: Video, deadline: CheckCircle2, meeting: Users2 };

export function TutorCalendar() {
  const [filter, setFilter] = useState<"all" | CalendarEvent["kind"]>("all");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
  const visible = events.filter((event) => filter === "all" || event.kind === filter);

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><CalendarDays size={13} /> Class calendar</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Sessions, deadlines, and catch-ups.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Book live classes, keep deadlines visible, and set parent meetings without the back-and-forth.</p>
          </div>
          <button onClick={() => toast("Booking a new slot — you can pick a time from the next 7 days.")} className="rounded-full bg-[#d8f36a] px-5 py-3 text-sm font-semibold text-[#173c2e] hover:bg-[#e4fb8b]">Schedule new</button>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.map((kind) => <button key={kind.key} onClick={() => setFilter(kind.key)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === kind.key ? "bg-[#173f31] text-white" : "bg-[#f4f7ef] text-[#527064] hover:bg-[#eef4ea]"}`}>{kind.label}</button>)}
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-[#8aa096]"><Clock3 size={13} /> {visible.length} upcoming</span>
        </div>
        <div className="mt-6 space-y-2.5">
          {days.map((day, dayIndex) => {
            const dayEvents = visible.filter((event) => event.dateOffset === dayIndex).sort((a, b) => a.time.localeCompare(b.time));
            if (dayEvents.length === 0) return null;
            const label = day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
            const isToday = dayIndex === 0;
            return (
              <div key={day.toISOString()} className="rounded-2xl border border-[#e9eee5] p-4">
                <div className="flex items-center gap-2"><Clock3 size={13} className="text-[#8aa096]" /><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#527064]">{label}</span>{isToday && <span className="rounded-full bg-[#fff1c9] px-2 py-0.5 text-[10px] font-bold text-[#916d22]">Today</span>}</div>
                <div className="mt-3 space-y-2">
                  {dayEvents.map((event) => {
                    const Icon = kindIcon[event.kind];
                    return (
                      <div key={event.id} className="flex flex-col gap-3 rounded-xl bg-[#fafbf8] p-3 sm:flex-row sm:items-center">
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${event.tone}`}><Icon size={16} /></div>
                        <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[#25483c]">{event.title}</div><div className="mt-0.5 text-xs text-[#8aa096]">{event.meta}</div></div>
                        <div className="flex items-center gap-3"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#527064] shadow-sm">{event.time}</span><button onClick={() => toast(event.kind === "live" ? "Join link prepared for the live session." : event.kind === "meeting" ? "Meeting room opened — invite sent." : "Deadline reminder sent to the class.")} className="rounded-full bg-[#173f31] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#286b51]">{event.kind === "live" ? "Join" : event.kind === "meeting" ? "Open" : "Remind"}</button></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {days.length === 0 && <div className="rounded-2xl bg-[#f6f8f3] p-8 text-center text-sm text-[#7d958b]">Nothing scheduled in this window.</div>}
        </div>
      </section>
    </>
  );
}