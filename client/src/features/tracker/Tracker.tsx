import {
  AlarmClock,
  CalendarClock,
  Check,
  CheckCheck,
  FileText,
  Flag,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api, type Assignment } from "@/_core/api";
import { publishedAssignments } from "@/lib/assignmentStore";
import { QuizTakeOverlay } from "@/features/tracker/QuizTakeOverlay";

type Task = {
  id: string;
  title: string;
  subject: string;
  due: string;
  status: "overdue" | "today" | "upcoming" | "done";
};

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Fractions worksheet (page 2)",
    subject: "Mathematics",
    due: "Due yesterday, 6pm",
    status: "overdue",
  },
  {
    id: "t2",
    title: "10s practice set · Easy",
    subject: "Mathematics",
    due: "Due today, 4pm",
    status: "today",
  },
  {
    id: "t3",
    title: "Read 'The Market Story' chapter",
    subject: "English Studies",
    due: "Due today, 7pm",
    status: "today",
  },
  {
    id: "t4",
    title: "States of matter lab prep",
    subject: "Basic Science",
    due: "Tue · 9am",
    status: "upcoming",
  },
  {
    id: "t5",
    title: "Map-reading homework",
    subject: "Social Studies",
    due: "Thu · 5pm",
    status: "upcoming",
  },
  {
    id: "t6",
    title: "Weekend quiz · Medium",
    subject: "Mathematics",
    due: "Sun · 6pm",
    status: "upcoming",
  },
];

function toTeacherTask(
  assignment: {
    id: string;
    title: string;
    subject: string;
    due: string | null;
  },
  index: number,
): Task {
  return {
    id: assignment.id,
    title: assignment.title,
    subject: `${assignment.subject} · from your teacher`,
    due:
      assignment.due && assignment.due.trim().length > 0
        ? `Due ${assignment.due.replace(/^Due\s+/i, "")}`
        : "Practice — no due date",
    status: index === 0 ? "today" : "upcoming",
  };
}

const localTeacherTasks: Task[] = publishedAssignments().map(
  (assignment, index) => toTeacherTask(assignment, index),
);

export function Tracker() {
  const [teacherTasks, setTeacherTasks] = useState<Task[]>(localTeacherTasks);
  const [tasks, setTasks] = useState<Task[]>([
    ...initialTasks,
    ...localTeacherTasks,
  ]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Assignment | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .listAssignments()
      .then((all) => {
        if (!mounted) return;
        setAssignments(all);
        const fromBackend = all.map((assignment, index) =>
          toTeacherTask(assignment, index),
        );
        const fallbackIds = new Set(localTeacherTasks.map((task) => task.id));
        setTeacherTasks(fromBackend);
        setTasks([
          ...initialTasks,
          ...fromBackend.filter((task) => !fallbackIds.has(task.id)),
          ...localTeacherTasks,
        ]);
      })
      .catch(() => {
        // Offline demo — localStorage assignments and placeholders still show.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const done = tasks.filter((task) => task.status === "done").length;
  const total = tasks.length;
  const isTeacherTask = (id: string) =>
    teacherTasks.some((task) => task.id === id);
  const quizFor = (id: string) => {
    const assignment = assignments.find((item) => item.id === id);
    return assignment && (assignment.questions?.length ?? 0) > 0
      ? assignment
      : null;
  };
  const fileFor = (id: string) =>
    assignments.find((item) => item.id === id && item.fileUrl) ?? null;

  const finishQuiz = (
    assignment: Assignment,
    score: number,
    questionCount: number,
  ) => {
    setActiveQuiz(null);
    setTasks((current) =>
      current.map((task) =>
        task.id === assignment.id ? { ...task, status: "done" } : task,
      ),
    );
    toast.success(
      `${assignment.title} completed · ${score}/${questionCount} correct`,
      {
        description:
          score === questionCount
            ? "+20 XP · perfect score"
            : "+20 XP · review the explanations above",
      },
    );
  };

  useEffect(() => {
    tasks
      .filter((task) => task.status === "overdue")
      .forEach((task) =>
        toast.warning(`${task.title} is overdue.`, {
          description: task.subject,
        }),
      );
    tasks
      .filter((task) => task.status === "today")
      .forEach((task) =>
        toast.info(`Deadline today: ${task.title}`, { description: task.due }),
      );
  }, []);

  const toggle = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, status: task.status === "done" ? "today" : "done" }
          : task,
      ),
    );
    const task = tasks.find((item) => item.id === id);
    if (task && task.status !== "done")
      toast.success(`${task.title} completed. +20 XP`);
  };

  const lists: Array<{ title: string; tone: string; items: Task[] }> = [
    {
      title: "Overdue",
      tone: "text-[#B84B3D]",
      items: tasks.filter((task) => task.status === "overdue"),
    },
    {
      title: "Due today",
      tone: "text-[#3B241A]",
      items: tasks.filter((task) => task.status === "today"),
    },
    {
      title: "Upcoming",
      tone: "text-[#8A7361]",
      items: tasks.filter((task) => task.status === "upcoming"),
    },
  ];

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
              <CalendarClock size={13} /> Weekly tracker
            </div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">
              Small tasks, on schedule.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">
              Your checklist for this week — clear the overdue ones first, then
              stay ahead of today’s deadlines.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#FFC857]">
                {done}
                <span className="text-lg text-[#D9C4B0]">/{total}</span>
              </div>
              <div className="text-xs text-[#D9C4B0]">tasks done</div>
            </div>
            <div className="w-40 rounded-full bg-white/10">
              <div
                className="h-3 rounded-full bg-[#FFC857]"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        {lists.map((list) => {
          const ListIcon =
            list.title === "Overdue"
              ? AlarmClock
              : list.title === "Due today"
                ? CalendarClock
                : Flag;
          return (
            <div
              key={list.title}
              className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-5 sm:p-6"
            >
              <div className="flex items-center gap-2">
                <ListIcon size={15} className={list.tone} />
                <h2
                  className={`font-display text-lg font-semibold tracking-[-0.04em] ${list.tone}`}
                >
                  {list.title}
                </h2>
                <span className="ml-auto rounded-full bg-[#F7EFE3] px-2 py-0.5 text-[10px] font-semibold text-[#765F4F]">
                  {list.items.length}
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {list.items.length === 0 && (
                  <div className="rounded-2xl bg-[#F7EFE3] p-4 text-xs text-[#A08A75]">
                    <CheckCheck
                      size={14}
                      className="mr-1.5 inline text-[#4B6B3C]"
                    />
                    All clear here.
                  </div>
                )}
                {list.items.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-[#F3E9DE] p-3.5 transition hover:border-[#C8B3A0]"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggle(task.id)}
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${task.status === "done" ? "border-[#4B6B3C] bg-[#E9EED9] text-[#4B6B3C]" : "border-[#DCE2C8] text-transparent hover:border-[#4B6B3C]"}`}
                      >
                        <Check size={13} strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-semibold ${task.status === "done" ? "text-[#A08A75] line-through" : "text-[#3B241A]"}`}
                        >
                          {task.title}
                        </div>
                        <div className="mt-0.5 text-xs text-[#A08A75]">
                          {task.subject}
                          {isTeacherTask(task.id) && (
                            <span className="ml-1.5 rounded bg-[#EFEFDD] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#4B6B3C]">
                              new from teacher
                            </span>
                          )}{" "}
                          ·{" "}
                          <span
                            className={
                              task.status === "overdue"
                                ? "font-semibold text-[#B84B3D]"
                                : ""
                            }
                          >
                            {task.due}
                          </span>
                        </div>
                        {task.status !== "done" && quizFor(task.id) && (
                          <button
                            onClick={() => setActiveQuiz(quizFor(task.id))}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFC857] px-3 py-1.5 text-[11px] font-bold text-[#1A1512] transition hover:bg-[#FFC857]"
                          >
                            <PlayCircle size={13} /> Start quiz in-app
                          </button>
                        )}
                        {task.status !== "done" && fileFor(task.id) && (
                          <a
                            href={fileFor(task.id)?.fileUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EFE8FC] px-3 py-1.5 text-[11px] font-bold text-[#8B78C7] transition hover:bg-[#E4D9F7]"
                          >
                            <FileText size={13} /> Open worksheet
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {activeQuiz && (
        <QuizTakeOverlay
          assignment={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onFinish={(score, questionCount) =>
            finishQuiz(activeQuiz, score, questionCount)
          }
        />
      )}
    </>
  );
}
