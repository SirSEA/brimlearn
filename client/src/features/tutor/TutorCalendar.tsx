import { CalendarDays, CheckCircle2, Clock3, Plus, Users2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type CalendarEvent = { id: string; dateOffset: number; time: string; kind: "live" | "deadline" | "meeting"; title: string; meta: string; tone: string };

const seedEvents: CalendarEvent[] = [
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
const kindTone: Record<CalendarEvent["kind"], string> = { live: "bg-[#eaf2ff] text-[#3975aa]", deadline: "bg-[#fff1d7] text-[#916d22]", meeting: "bg-[#e5f5ed] text-[#34775e]" };

export function TutorCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [filter, setFilter] = useState<"all" | CalendarEvent["kind"]>("all");
  const [scheduling, setScheduling] = useState(false);
  const [kind, setKind] = useState<CalendarEvent["kind"]>("live");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("03:00 PM");
  const [dateOffset, setDateOffset] = useState(0);
  const [meta, setMeta] = useState("");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
  const visible = events.filter((event) => filter === "all" || event.kind === filter);

  const save = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast("Give the new slot a title first.");
      return;
    }
    if (!time.trim()) {
      toast("Pick a time for the slot.");
      return;
    }
    setEvents((current) => [...current, {
      id: `new-${Date.now()}`,
      dateOffset,
      time: time.trim(),
      kind,
      title: trimmedTitle,
      meta: meta.trim() || (kind === "live" ? "JSS1 · Google Meet" : kind === "meeting" ? "Video call · 30 min" : "Whole class · auto-marked"),
      tone: kindTone[kind],
    }]);
    setScheduling(false);
    setTitle("");
    setMeta("");
    setTime("03:00 PM");
    setDateOffset(0);
    setKind("live");
    toast.success("Slot scheduled — it’s now on the class calendar.");
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><CalendarDays size={13} /> Class calendar</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Sessions, deadlines, and catch-ups.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Book live classes, keep deadlines visible, and set parent meetings without the back-and-forth.</p>
          </div>
          <button onClick={() => setScheduling(true)} className="rounded-full bg-[#d8f36a] px-5 py-3 text-sm font-semibold text-[#173c2e] hover:bg-[#e4fb8b]"><Plus className="mr-1.5 inline" size={15} /> Schedule new</button>
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

      {scheduling && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0e2b22]/45 p-4" onClick={() => setScheduling(false)}>
          <div className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Class calendar</div>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#183c31]">Schedule a new slot.</h2>
                <p className="mt-2 text-sm leading-6 text-[#648075]">Pick a kind, a day in the next week, and a time. It will appear instantly on the calendar.</p>
              </div>
              <button onClick={() => setScheduling(false)} className="rounded-xl p-2 text-[#8aa096] hover:bg-[#f4f7ef]" aria-label="Close scheduling"><X size={18} /></button>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold text-[#527064]">What kind of slot?</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([["live", "Live session", Video], ["deadline", "Deadline", CheckCircle2], ["meeting", "Parent meeting", Users2]] as Array<[CalendarEvent["kind"], string, typeof Video]>).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setKind(key)} className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold transition ${kind === key ? "border-[#3b926f] bg-[#e5f5ed] text-[#34775e]" : "border-[#e3e8df] bg-[#fbfcf9] text-[#527064] hover:border-[#99bda8]"}`}><Icon size={17} />{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[#527064]">Title<span className="mt-1.5 block"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "live" ? "e.g. Live class · Ratios intro" : kind === "deadline" ? "e.g. Worksheet due" : "e.g. Parent check-in · name"} className="w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c] outline-none placeholder:font-medium placeholder:text-[#a7b5ad] focus:border-[#5d9c7d]" /></span></label>
              <label className="block text-xs font-semibold text-[#527064]">Day<span className="mt-1.5 block"><select value={dateOffset} onChange={(event) => setDateOffset(Number(event.target.value))} className="w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c]">{days.map((day, index) => <option key={index} value={index}>{day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></span></label>
              <label className="block text-xs font-semibold text-[#527064]">Time<span className="mt-1.5 block"><input type="time" list="calendar-times" value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c] outline-none focus:border-[#5d9c7d]" /></span><datalist id="calendar-times"><option value="09:00 AM" /><option value="10:00 AM" /><option value="11:00 AM" /><option value="01:00 PM" /><option value="02:00 PM" /><option value="03:00 PM" /><option value="04:00 PM" /><option value="05:00 PM" /></datalist></label>
              <label className="block text-xs font-semibold text-[#527064]">Details (optional)<span className="mt-1.5 block"><input value={meta} onChange={(event) => setMeta(event.target.value)} placeholder={kind === "live" ? "JSS1 · Google Meet" : kind === "meeting" ? "Video call · 30 min" : "Whole class · auto-marked"} className="w-full rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#25483c] outline-none placeholder:font-medium placeholder:text-[#a7b5ad] focus:border-[#5d9c7d]" /></span></label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setScheduling(false)} className="rounded-full px-4 py-3 text-sm font-semibold text-[#7d958b] hover:bg-[#f4f7ef]">Cancel</button>
              <button onClick={save} className="rounded-full bg-[#173f31] px-5 py-3 text-sm font-semibold text-white hover:bg-[#286b51]">Schedule slot</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}