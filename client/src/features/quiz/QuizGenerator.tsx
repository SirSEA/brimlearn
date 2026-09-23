import { ChevronRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api } from "@/_core/api";
import { curriculumSubjects, nerdcUnits } from "@/lib/curriculum";

type QuizHistoryRecord = { date: string; subject: string; grade: string; topic: string; difficulty: string; score: number; total: number };

export function buildLocalQuiz(topic: string, count: number) {
  const bank = [
    { question: `Which statement best describes ${topic}?`, options: [`It is a key idea in this topic`, "It is unrelated to the topic", "It is only used in history", "It cannot be practised"], answer: 0, explanation: `${topic} is the focus of this practice set, so the first option identifies its role.` },
    { question: `What is the best first step when practising ${topic}?`, options: ["Read the question carefully", "Skip every example", "Choose an answer at random", "Ignore the units"], answer: 0, explanation: "Reading carefully helps you identify the information and operation the question requires." },
    { question: `Which habit supports improvement in ${topic}?`, options: ["Explain your method", "Avoid checking work", "Copy without thinking", "Stop after one attempt"], answer: 0, explanation: "Explaining a method makes reasoning visible and helps reveal misconceptions." },
  ];
  return { title: `${topic} practice set`, questions: bank.slice(0, Math.min(count, bank.length)) };
}

export function QuizGenerator({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState("maths");
  const [grade, setGrade] = useState("JSS1");
  const [term, setTerm] = useState("First term");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "advanced">("medium");
  const [quiz, setQuiz] = useState<{ title: string; questions: Array<{ question: string; options: string[]; answer: number; explanation: string }> } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [history, setHistory] = useState<QuizHistoryRecord[]>(() => { try { return JSON.parse(localStorage.getItem("brimlearn-quiz-history") || "[]"); } catch { return []; } });
  const [assignedClass, setAssignedClass] = useState("JSS1 Blue");
  const [assigned, setAssigned] = useState(false);
  const [generating, setGenerating] = useState(false);
  const subjects = curriculumSubjects.filter((item) => item.status === "live");
  const topics = nerdcUnits.filter((unit) => unit.subject === subject && unit.grade === grade && unit.term === term).flatMap((unit) => unit.weeks);
  const selectedTopic = topic || topics[0] || "Curriculum review";
  const handleGenerate = async (count: number) => {
    setGenerating(true);
    try {
      const data = await api.generateQuiz({
        subject,
        grade,
        term,
        topic: selectedTopic,
        count,
        difficulty,
      });
      setQuiz(data);
      setAnswers({});
      setAssigned(false);
      toast.success(`Practice set ready: ${data.title}`);
    } catch {
      const data = buildLocalQuiz(selectedTopic, count);
      setQuiz(data);
      setAnswers({});
      setAssigned(false);
      toast.success(`Practice set ready: ${data.title} (offline mode)`);
    } finally {
      setGenerating(false);
    }
  };
  const score = quiz ? quiz.questions.reduce((total, item, index) => total + (answers[index] === item.answer ? 1 : 0), 0) : 0;
  const answeredCount = Object.keys(answers).length;
  const average = history.length ? Math.round(history.reduce((sum, item) => sum + (item.score / item.total) * 100, 0) / history.length) : 0;

  useEffect(() => {
    if (!quiz || answeredCount !== quiz.questions.length) return;
    const record: QuizHistoryRecord = { date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }), subject, grade, topic: selectedTopic, difficulty, score, total: quiz.questions.length };
    const next = [...history.filter((item) => !(item.topic === record.topic && item.date === record.date)), record].slice(-8);
    setHistory(next);
    localStorage.setItem("brimlearn-quiz-history", JSON.stringify(next));
  }, [answeredCount, quiz, score, selectedTopic, subject, grade, difficulty]);

  const recommendation = quiz && answeredCount === quiz.questions.length && score / quiz.questions.length < 0.7
    ? `Intervention suggested: revisit “${selectedTopic}” with an easy reset, worked example, and 3-question check-in.`
    : quiz && answeredCount === quiz.questions.length ? "On track: move to a hard or advanced practice set after a short explanation task." : "Complete the quiz to receive an automatic intervention recommendation.";

  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#1A1512]/45 p-4" onClick={onClose}><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-6 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]"><Sparkles size={14} /> AI practice studio</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">Generate, assign, and learn from every quiz.</h2><p className="mt-3 text-sm leading-6 text-[#765F4F]">Create NERDC-aligned practice, tune the challenge, and turn the result into a next-best action.</p></div><button onClick={onClose} className="rounded-xl p-2 text-[#A08A75] hover:bg-[#F7EFE3]" aria-label="Close quiz generator"><X size={18} /></button></div>{!quiz ? <><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-semibold text-[#765F4F]">Subject<select value={subject} onChange={(event) => { setSubject(event.target.value); setTopic(""); }} className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]">{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold text-[#765F4F]">Grade<select value={grade} onChange={(event) => { setGrade(event.target.value); setTopic(""); }} className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]">{["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-[#765F4F]">Term<select value={term} onChange={(event) => { setTerm(event.target.value); setTopic(""); }} className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"><option>First term</option><option>Second term</option><option>Third term</option></select></label><label className="text-xs font-semibold text-[#765F4F]">Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="advanced">Advanced / Difficult</option></select></label><label className="text-xs font-semibold text-[#765F4F]">Questions<select defaultValue="5" className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]" id="quiz-count"><option value="3">3 questions</option><option value="5">5 questions</option><option value="8">8 questions</option></select></label></div><label className="mt-5 block text-xs font-semibold text-[#765F4F]">NERDC topic<select value={selectedTopic} onChange={(event) => setTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-3 text-sm font-semibold text-[#3B241A]">{topics.map((item) => <option key={item}>{item}</option>)}</select></label><div className="mt-5 rounded-2xl bg-[#F0F2E4] p-4 text-xs leading-5 text-[#765F4F]"><span className="font-semibold text-[#3B241A]">Performance snapshot:</span> {history.length ? `${average}% average across ${history.length} completed quiz${history.length === 1 ? "" : "zes"}.` : "Complete your first quiz to start a performance timeline."}{history.length > 0 && <div className="mt-4 flex h-20 items-end gap-2">{history.map((item, index) => <div key={`${item.date}-${index}`} className="group relative flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-[#8CAE70] transition group-hover:bg-[#4B6B3C]" style={{ height: `${Math.max(12, (item.score / item.total) * 100)}%` }} /><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-[#765F4F]">{Math.round((item.score / item.total) * 100)}%</span></div>)}</div>}</div><button disabled={topics.length === 0 || generating} onClick={() => { const count = Number((document.getElementById("quiz-count") as HTMLSelectElement)?.value || 5); handleGenerate(count); }} className="mt-6 w-full rounded-full bg-[#C65A2E] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-50">{generating ? "Generating…" : "Generate practice quiz"} {!generating && <ChevronRight className="ml-1 inline" size={15} />}</button></> : <div className="mt-6"><div className="flex flex-col gap-3 rounded-2xl bg-[#C65A2E] p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B9C89B]">{subject === "maths" ? "Mathematics" : "English Studies"} · {grade} · {difficulty}</div><h3 className="mt-1 font-display text-2xl font-semibold">{quiz.title}</h3><div className="mt-1 text-xs text-[#D9C4B0]">{selectedTopic}</div></div><div className="rounded-2xl bg-white/10 px-4 py-3 text-center"><div className="text-2xl font-semibold text-[#FFC857]">{score}/{quiz.questions.length}</div><div className="text-[10px] uppercase tracking-[0.16em] text-[#D9C4B0]">score</div></div></div><div className="mt-5 space-y-4">{quiz.questions.map((item, index) => { const chosen = answers[index]; const answered = chosen !== undefined; return <div key={`${item.question}-${index}`} className="rounded-2xl border border-[#E2CDB8] p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A08A75]">Question {index + 1}</div><div className="mt-2 text-sm font-semibold leading-6 text-[#3B241A]">{item.question}</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{item.options.map((option, optionIndex) => <button key={option} onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))} className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${answered && optionIndex === item.answer ? "border-[#8CAE70] bg-[#E9EED9] text-[#C65A2E]" : answered && chosen === optionIndex ? "border-[#D98A78] bg-[#FBEBE5] text-[#B84B3D]" : "border-[#E2CDB8] text-[#765F4F] hover:border-[#A9BF87]"}`}>{option}</button>)}</div>{answered && <div className="mt-3 rounded-xl bg-[#F7EFE3] p-3 text-xs leading-5 text-[#765F4F]"><span className="font-semibold text-[#4B6B3C]">Explanation:</span> {item.explanation}</div>}</div>; })}</div><div className="mt-5 rounded-2xl bg-[#FFF1CD] p-4 text-xs leading-5 text-[#8A7361]"><span className="font-semibold text-[#5A2F22]">Next best action:</span> {recommendation}</div><div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E2CDB8] p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-[#3B241A]">Assign this quiz to a class</div><div className="mt-1 text-[11px] text-[#A08A75]">Teachers can send the exact topic and difficulty to a specific group.</div></div><select value={assignedClass} onChange={(event) => setAssignedClass(event.target.value)} className="rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2 text-xs font-semibold text-[#765F4F]"><option>JSS1 Blue</option><option>JSS1 Gold</option><option>JSS2 Blue</option><option>SS1 Science</option></select><button onClick={() => { setAssigned(true); toast.success(`${quiz.title} assigned to ${assignedClass}.`); }} className="rounded-full bg-[#C65A2E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A84A22]">{assigned ? "Assigned" : "Assign quiz"}</button></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => { setQuiz(null); setAnswers({}); }} className="rounded-full px-4 py-3 text-sm font-semibold text-[#8A7361] hover:bg-[#F7EFE3]">Generate another</button><button onClick={onClose} className="rounded-full bg-[#C65A2E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#A84A22]">Done</button></div></div>}</div></div>;
}
