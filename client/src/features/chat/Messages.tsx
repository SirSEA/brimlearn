import { ArrowLeft, Bell, BellOff, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type ChatMessage = { from: "me" | "them"; text: string; time: string };
type Thread = { id: string; name: string; initials: string; tone: string; lastSeen: string; following?: boolean; messages: ChatMessage[] };

const learnerThreads: Thread[] = [
  {
    id: "sola",
    name: "Ms. Sola · maths coach",
    initials: "MS",
    tone: "bg-[#ff9a87] text-[#63382d]",
    lastSeen: "online now",
    messages: [
      { from: "them", text: "Morning, Amira! You’re 3 concepts from finishing Multiplication. Fancy a quick boost today?", time: "08:02" },
      { from: "me", text: "Morning Ms. Sola! Yes please — the 10s lesson felt much easier this morning.", time: "08:11" },
      { from: "them", text: "Love that. Try the market challenge next — it’s real-world and only 8 minutes. I’ll check your score after.", time: "08:14" },
    ],
  },
  {
    id: "group",
    name: "JSS1 Blue · class group",
    initials: "JB",
    tone: "bg-[#8f72b4] text-white",
    lastSeen: "24 members",
    messages: [
      { from: "them", text: "Reminder: Friday’s live class moves to Google Meet (link in Classroom). See you at 3pm!", time: "Yesterday" },
      { from: "me", text: "Got it — countdown is on! 🔢", time: "Yesterday" },
      { from: "them", text: "Homework: Fractions worksheet due Sunday 6pm. Use the denominator-first tip!", time: "09:40" },
    ],
  },
];

const tutorThreads: Thread[] = [
  {
    id: "amara",
    name: "Amara Okafor",
    initials: "AO",
    tone: "bg-[#d8f36a] text-[#31583f]",
    lastSeen: "online now",
    following: true,
    messages: [
      { from: "them", text: "Hi Ms. Sola, I tried the fraction blocks again. I think I get it now!", time: "09:02" },
      { from: "me", text: "That’s great, Amara — explain it back to me in your own words?", time: "09:10" },
      { from: "them", text: "The denominator shows how many equal parts the whole is split into.", time: "09:12" },
      { from: "me", text: "Exactly right. You’ve earned your Gap closer badge. 🌟", time: "09:13" },
    ],
  },
  {
    id: "leo",
    name: "Leo Mensah",
    initials: "LM",
    tone: "bg-[#ff9a87] text-[#63382d]",
    lastSeen: "active 1h ago",
    following: false,
    messages: [
      { from: "them", text: "Sir, the word-problem pack is confusing me. Which operation do I start with?", time: "07:20" },
      { from: "me", text: "Good question. Underline the key numbers, then ask: is the answer bigger or smaller?", time: "07:28" },
      { from: "them", text: "Bigger… so I add? Let me try again.", time: "07:31" },
    ],
  },
  {
    id: "zuri",
    name: "Zuri Campbell",
    initials: "ZC",
    tone: "bg-[#8f72b4] text-white",
    lastSeen: "active 3h ago",
    messages: [
      { from: "them", text: "Perimeter vs area — I always mix them for rectangles.", time: "Yesterday" },
      { from: "me", text: "Trick: perimeter is the fence, area is the grass. I’ll assign the visual lab.", time: "Yesterday" },
      { from: "them", text: "That helps a lot. Thank you!", time: "Yesterday" },
    ],
  },
];

export function Messages({ variant }: { variant: "learner" | "tutor" }) {
  const [threads, setThreads] = useState<Thread[]>(variant === "tutor" ? tutorThreads : learnerThreads);
  const [activeId, setActiveId] = useState(threads[0].id);
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const active = threads.find((thread) => thread.id === activeId) ?? threads[0];

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setThreads((current) => current.map((thread) => thread.id === active.id ? { ...thread, messages: [...thread.messages, { from: "me" as const, text, time: "now" }] } : thread));
    setDraft("");
    toast.success(`${variant === "tutor" ? "Message sent to" : "Sent to"} ${active.name.split(" ")[0]}.`);
  };

  const threadList = (
    <div className="overflow-y-auto">
      {threads.map((thread) => {
        const selected = thread.id === active.id;
        const last = thread.messages[thread.messages.length - 1];
        return (
          <button key={thread.id} onClick={() => { setActiveId(thread.id); setMobileThreadOpen(true); }} className={`w-full rounded-2xl p-3 text-left transition ${selected ? "bg-[#eef4ea]" : "hover:bg-[#f6f8f3]"}`}>
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${thread.tone}`}>{thread.initials}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#25483c]">{thread.name}</span><span className="flex items-center gap-1.5 shrink-0 text-[10px] text-[#8aa096]">{variant === "tutor" && thread.following && <span className="flex items-center gap-0.5 rounded-full bg-[#e5f5ed] px-1.5 py-0.5 font-bold text-[#34775e]"><Bell size={9} />Following</span>}{last.time}</span></div>
                <div className="mt-0.5 truncate text-xs text-[#7d958b]">{last.from === "me" ? "You: " : ""}{last.text}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const threadView = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[#edf1e9] p-4">
        <button onClick={() => setMobileThreadOpen(false)} className="rounded-lg p-1.5 text-[#527064] hover:bg-[#edf1e9] md:hidden"><ArrowLeft size={16} /></button>
        <div className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${active.tone}`}>{active.initials}</div>
        <div><div className="text-sm font-semibold text-[#25483c]">{active.name}</div><div className="mt-0.5 text-[11px] text-[#7d958b]">{active.lastSeen}</div></div>
        {variant === "tutor" && (
          <button
            onClick={() => {
              const next = !active.following;
              setThreads((current) => current.map((thread) => thread.id === active.id ? { ...thread, following: next } : thread));
              toast.success(next ? `You’re now following ${active.name.split(" ")[0]}'s progress.` : `You’ve stopped following ${active.name.split(" ")[0]}.`);
            }}
            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${active.following ? "bg-[#e5f5ed] text-[#34775e]" : "border border-[#dce5dc] text-[#527064] hover:bg-[#f4f7ef]"}`}
            title={active.following ? "Stop following updates" : "Follow updates from this learner"}
          >
            {active.following ? <Bell size={13} /> : <BellOff size={13} />}
            {active.following ? "Following" : "Follow"}
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {active.messages.map((message, index) => (
          <div key={index} className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${message.from === "me" ? "rounded-br-md bg-[#173f31] text-white" : "rounded-bl-md bg-[#f3f6ef] text-[#25483c]"}`}>{message.text}<div className={`mt-1 text-right text-[10px] ${message.from === "me" ? "text-[#a7c4b8]" : "text-[#8aa096]"}`}>{message.time}</div></div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-[#edf1e9] p-3">
        <button onClick={() => toast("File attachment is available in the resource library.")} className="rounded-xl p-2.5 text-[#7d958b] hover:bg-[#f3f6ef]"><Paperclip size={17} /></button>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder={`Message ${active.name.split(" ")[0]}…`} className="min-w-0 flex-1 rounded-full border border-[#e1e8df] bg-[#fbfcf9] px-4 py-2.5 text-sm text-[#25483c] outline-none focus:border-[#5d9c7d]" />
        <button onClick={send} className="rounded-xl bg-[#173f31] p-2.5 text-white hover:bg-[#286b51]"><Send size={16} /></button>
      </div>
    </div>
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <div className="rounded-[27px] border border-[#e3e8df] bg-white p-4">
        <div className="px-2 pb-3 pt-1"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8aa096]">Messages</div><h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.05em] text-[#183c31]">{variant === "tutor" ? "Inbox" : "Your conversations"}</h2><p className="mt-1.5 text-[11px] leading-5 text-[#8aa096]">{variant === "learner" ? "You chat with your teachers and class group only." : "Follow a learner to keep receiving their progress updates."}</p></div>
        {threadList}
      </div>
      <div className={`rounded-[27px] border border-[#e3e8df] bg-white shadow-[0_12px_30px_rgba(26,53,40,.05)] md:h-[620px] ${mobileThreadOpen ? "block" : "hidden md:block"}`}>{threadView}</div>
    </section>
  );
}