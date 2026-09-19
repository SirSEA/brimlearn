import { AlarmClock, CalendarClock, Check, CheckCheck, Flag } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

type Task = { id: string; title: string; subject: string; due: string; status: "overdue" | "today" | "upcoming" | "done" };

const initialTasks: Task[] = [
  { id: "t1", title: "Fractions worksheet (page 2)", subject: "Mathematics", due: "Due yesterday, 6pm", status: "overdue" },
  { id: "t2", title: "10s practice set · Easy", subject: "Mathematics", due: "Due today, 4pm", status: "today" },
  { id: "t3", title: "Read ‘The Market Story’ chapter", subject: "English Studies", due: "Due today, 7pm", status: "today" },
  { id: "t4", title: "States of matter lab prep", subject: "Basic Science", due: "Tue · 9am", status: "upcoming" },
  { id: "t5", title: "Map-reading homework", subject: "Social Studies", due: "Thu · 5pm", status: "upcoming" },
  { id: "t6", title: "Weekend quiz · Medium", subject: "Mathematics", due: "Sun · 6pm", status: "upcoming" },
];

export function Tracker() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const done = tasks.filter((task) => task.status === "done").length;
  const total = tasks.length;

  useEffect(() => {
    tasks.filter((task) => task.status === "overdue").forEach((task) => toast.warning(`${task.title} is overdue.`, { description: task.subject }));
    tasks.filter((task) => task.status === "today").forEach((task) => toast.info(`Deadline today: ${task.title}`, { description: task.due }));
  }, []);

  const toggle = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === "done" ? "today" : "done" } : task));
    const task = tasks.find((item) => item.id === id);
    if (task && task.status !== "done") toast.success(`${task.title} completed. +20 XP`);
  };

  const lists: Array<{ title: string; tone: string; items: Task[] }> = [
    { title: "Overdue", tone: "text-[#a25142]", items: tasks.filter((task) => task.status === "overdue") },
    { title: "Due today", tone: "text-[#25483c]", items: tasks.filter((task) => task.status === "today") },
    { title: "Upcoming", tone: "text-[#7d958b]", items: tasks.filter((task) => task.status === "upcoming") },
  ];

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><CalendarClock size={13} /> Weekly tracker</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Small tasks, on schedule.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Your checklist for this week — clear the overdue ones first, then stay ahead of today’s deadlines.</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center"><div className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#d8f36a]">{done}<span className="text-lg text-[#c4ded0]">/{total}</span></div><div className="text-xs text-[#c4ded0]">tasks done</div></div>
            <div className="w-40 rounded-full bg-white/10"><div className="h-3 rounded-full bg-[#d8f36a]" style={{ width: `${(done / total) * 100}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        {lists.map((list) => {
          const ListIcon = list.title === "Overdue" ? AlarmClock : list.title === "Due today" ? CalendarClock : Flag;
          return (
          <div key={list.title} className="rounded-[27px] border border-[#e3e8df] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><ListIcon size={15} className={list.tone} /><h2 className={`font-display text-lg font-semibold tracking-[-0.04em] ${list.tone}`}>{list.title}</h2><span className="ml-auto rounded-full bg-[#f4f7ef] px-2 py-0.5 text-[10px] font-semibold text-[#527064]">{list.items.length}</span></div>
            <div className="mt-4 space-y-2.5">
              {list.items.length === 0 && <div className="rounded-2xl bg-[#f6f8f3] p-4 text-xs text-[#8aa096]"><CheckCheck size={14} className="mr-1.5 inline text-[#3b926f]" />All clear here.</div>}
              {list.items.map((task) => (
                <div key={task.id} className="rounded-2xl border border-[#e9eee5] p-3.5 transition hover:border-[#c9d8cc]">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggle(task.id)} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${task.status === "done" ? "border-[#3b926f] bg-[#e5f5ed] text-[#3b926f]" : "border-[#ccd9ce] text-transparent hover:border-[#3b926f]"}`}><Check size={13} strokeWidth={3} /></button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${task.status === "done" ? "text-[#8aa096] line-through" : "text-[#25483c]"}`}>{task.title}</div>
                      <div className="mt-0.5 text-xs text-[#8aa096]">{task.subject} · <span className={task.status === "overdue" ? "font-semibold text-[#a25142]" : ""}>{task.due}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </section>
    </>
  );
}