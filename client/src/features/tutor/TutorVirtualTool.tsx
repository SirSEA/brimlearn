import { CheckCircle2, Eraser, FileUp, Paperclip, Pencil, Play, Presentation, StopCircle, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

const colors = ["#C65A2E", "#4B6B3C", "#FFC857", "#F28B78", "#33647A", "#8B78C7"];

type SharedFile = { name: string; size: string; from: string };
type Recording = { title: string; length: string; date: string; shared?: boolean };

export function TutorVirtualTool() {
  const [tab, setTab] = useState<"board" | "files" | "recordings">("board");
  const [color, setColor] = useState(colors[0]);
  const [files, setFiles] = useState<SharedFile[]>([
    { name: "Fractions-blocks-reset.pdf", size: "1.2 MB", from: "You" },
    { name: "week-4-lesson-slides.pptx", size: "4.8 MB", from: "You" },
    { name: "market-story-chapter-3.docx", size: "310 KB", from: "English dept" },
  ]);
  const [recordings, setRecordings] = useState<Recording[]>([
    { title: "Fractions visual lab · Sep 12", length: "32:14", date: "Sep 12" },
    { title: "Group circle · Sep 8", length: "41:02", date: "Sep 8" },
  ]);
  const [recordingLength, setRecordingLength] = useState(0);
  const [recordingTitle, setRecordingTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [renamedTitle, setRenamedTitle] = useState("");
  const [screenSharing, setScreenSharing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [tab === "board"]);

  useEffect(() => {
    if (recordingTitle !== "active") return;
    const timer = window.setInterval(() => setRecordingLength((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recordingTitle]);

  const draw = (x: number, y: number, clear = false) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    if (clear) {
      ctx.beginPath();
      ctx.moveTo(lastRef.current?.x ?? x, lastRef.current?.y ?? y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    toast("Whiteboard cleared for the next learner.");
  };

  const fmt = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><Presentation size={13} /> Virtual tool</div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Teach with the whole canvas.</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">A live whiteboard, secure file sharing, and session recording — everything a session needs in one backstage.</p>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {([["board", "Whiteboard", Presentation], ["files", "File sharing", Paperclip], ["recordings", "Recordings", Video]] as Array<["board" | "files" | "recordings", string, typeof Presentation]>).map(([key, label, Icon]) => <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${tab === key ? "bg-[#C65A2E] text-white" : "bg-[#F7EFE3] text-[#765F4F] hover:bg-[#EFEFDD]"}`}><Icon size={14} />{label}</button>)}
        </div>

        {tab === "board" && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
              {colors.map((swatch) => <button key={swatch} onClick={() => setColor(swatch)} aria-label={`Pick ${swatch}`} className={`h-8 w-8 rounded-full border-2 transition ${color === swatch ? "scale-110 border-[#C65A2E]" : "border-white shadow-sm"}`} style={{ backgroundColor: swatch }} />)}
              <div className="ml-auto flex gap-2"><button onClick={clearBoard} className="flex items-center gap-1.5 rounded-full bg-[#FBEBE5] px-3.5 py-2 text-xs font-semibold text-[#B84B3D] hover:bg-[#FBE3DC]"><Eraser size={14} /> Clear</button><button onClick={() => { setScreenSharing((value) => !value); toast.success(screenSharing ? "Screen share stopped." : "Screen sharing to the live class."); }} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${screenSharing ? "bg-[#E9EED9] text-[#4B6B3C]" : "bg-[#F7EFE3] text-[#765F4F] hover:bg-[#EFEFDD]"}`}><Presentation size={14} /> {screenSharing ? "Screen shared ✓" : "Share screen"}</button><button onClick={() => toast("Board snapshot saved to the lesson notes.")} className="rounded-full bg-[#C65A2E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A84A22]">Save snapshot</button></div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#F3E9DE]"><canvas ref={canvasRef} width={960} height={480} className="h-[320px] w-full touch-none bg-[#FFFDF8] sm:h-[420px]" onPointerDown={(event) => { event.preventDefault(); canvasRef.current?.setPointerCapture(event.pointerId); const { x, y } = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }; drawingRef.current = true; lastRef.current = { x, y }; draw(x, y); }} onPointerMove={(event) => { if (!drawingRef.current) return; const { x, y } = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }; draw(x, y, true); lastRef.current = { x, y }; }} onPointerUp={() => { drawingRef.current = false; lastRef.current = null; }} onPointerLeave={() => { drawingRef.current = false; lastRef.current = null; }} /></div>
          </div>
        )}

        {tab === "files" && (
          <div className="mt-6">
            <div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-[#3B241A]">Secure class files</div><p className="mt-1 text-xs text-[#A08A75]">Shared with this class only — learners see them in their resource library.</p></div><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-full bg-[#C65A2E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A84A22]"><FileUp size={14} /> Upload file</button><input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFiles((current) => [{ name: file.name, size: `${(file.size / 1048576).toFixed(1)} MB`, from: "You" }, ...current]); toast.success(`${file.name} shared with the class.`); } event.currentTarget.value = ""; }} /></div>
            <div className="mt-5 space-y-2.5">{files.map((file) => <div key={file.name} className="flex items-center gap-3 rounded-2xl border border-[#F3E9DE] p-3.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EFE8FC] text-[#8B78C7]"><Paperclip size={15} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-[#3B241A]">{file.name}</div><div className="text-xs text-[#A08A75]">{file.size} · shared by {file.from}</div></div><button onClick={() => toast(`${file.name} link copied.`)} className="rounded-full bg-[#F7EFE3] px-3 py-2 text-xs font-semibold text-[#4B6B3C] hover:bg-[#EFEFDD]">Copy link</button></div>)}</div>
          </div>
        )}

        {tab === "recordings" && (
          <div className="mt-6">
            <div className="flex items-center justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold text-[#3B241A]">{recordingTitle === "active" && <span className="flex items-center gap-1.5 rounded-full bg-[#E55048] px-2 py-0.5 text-[10px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FFFDF8]" /> REC</span>}Session recording</div><p className="mt-1 text-xs text-[#A08A75]">Screen-records the session with consent, then it lands in the class library for revision.</p></div>{recordingTitle === "active" ? <button onClick={() => { const title = `Session ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`; setRecordings((current) => [{ title, length: fmt(recordingLength), date: "Just now" }, ...current]); setRecordingTitle(""); setRecordingLength(0); toast.success("Recording stopped and saved to the library."); }} className="flex items-center gap-2 rounded-full bg-[#FBEBE5] px-4 py-2.5 text-xs font-semibold text-[#B84B3D] hover:bg-[#FBE3DC]"><StopCircle size={14} /> Stop · {fmt(recordingLength)}</button> : <button onClick={() => { setRecordingTitle("active"); toast("Screen recording in progress — consent banner shown to learners."); }} className="flex items-center gap-2 rounded-full bg-[#C65A2E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A84A22]"><Play size={14} fill="currentColor" /> Start recording</button>}</div>
            <div className="mt-5 space-y-2.5">{recordings.map((recording) => (
              <div key={recording.title} className="flex items-center gap-3 rounded-2xl border border-[#F3E9DE] p-3.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8EFF9] text-[#274852]"><Video size={15} /></div>
                <div className="min-w-0 flex-1">
                  {editingTitle === recording.title ? (
                    <input
                      value={renamedTitle}
                      onChange={(event) => setRenamedTitle(event.target.value)}
                      onBlur={() => { const next = renamedTitle.trim(); if (next) setRecordings((current) => current.map((item) => item.title === recording.title ? { ...item, title: next } : item)); setEditingTitle(null); }}
                      onKeyDown={(event) => { if (event.key === "Enter") setEditingTitle(""); if (event.key === "Escape") { setRenamedTitle(""); setEditingTitle(null); } }}
                      autoFocus
                      className="w-full rounded-lg border border-[#8B78C7] bg-[#FFFDF8] px-2 py-1 text-sm font-semibold text-[#3B241A] outline-none"
                    />
                  ) : (
                    <div className="truncate text-sm font-semibold text-[#3B241A]">{recording.title}</div>
                  )}
                  <div className="text-xs text-[#A08A75]">{recording.length} · {recording.date}</div>
                </div>
                <button onClick={() => { setEditingTitle(recording.title); setRenamedTitle(recording.title); }} className="rounded-full p-2 text-[#765F4F] hover:bg-[#EFEFDD]" title="Rename recording"><Pencil size={14} /></button>
                <button
                  onClick={() => {
                    const next = recording.shared;
                    setRecordings((current) => current.map((item) => item.title === recording.title ? { ...item, shared: !next } : item));
                    toast.success(next ? "Recording removed from the class library." : `${recording.title} shared with the class.`);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${recording.shared ? "bg-[#E9EED9] text-[#4B6B3C] hover:bg-[#DDE5C9]" : "bg-[#F7EFE3] text-[#4B6B3C] hover:bg-[#EFEFDD]"}`}
                >
                  <CheckCircle2 size={13} /> {recording.shared ? "Shared" : "Share"}
                </button>
                <button onClick={() => setRecordings((current) => current.filter((item) => item.title !== recording.title))} className="rounded-full p-2 text-[#E2C7C8] hover:bg-[#FBEBE5]"><Trash2 size={14} /></button>
              </div>
            ))}</div>
          </div>
        )}
      </section>
    </>
  );
}