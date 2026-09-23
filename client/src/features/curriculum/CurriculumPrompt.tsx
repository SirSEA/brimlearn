import { ArrowUpRight, CheckCircle2, ChevronRight, ClipboardList, Info, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Scheme } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageCurriculum } from "@/lib/roles";
import { SCHEME_MAX_BASE64_CHARS, SCHEME_TOO_LARGE_MSG } from "@shared/const";
import { curriculumSource, curriculumSourceNote, curriculumSubjects, nerdcUnits } from "@/lib/curriculum";

function readFileAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const marker = ";base64,";
      const index = result.indexOf(marker);
      resolve(index >= 0 ? result.slice(index + marker.length) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(blob);
  });
}

export function CurriculumPrompt({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const canManage = canManageCurriculum(user?.role);
  const [tab, setTab] = useState<"library" | "add">("library");
  const [subject, setSubject] = useState("maths");
  const [grade, setGrade] = useState("JSS1");
  const [term, setTerm] = useState("First term");
  const [curriculum, setCurriculum] = useState("");
  const [fileName, setFileName] = useState("");
  const [received, setReceived] = useState(false);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<File | null>(null);
  const selectedSubject = curriculumSubjects.find((item) => item.id === subject) || curriculumSubjects[0];
  const visibleUnits = nerdcUnits.filter((unit) => unit.subject === subject && unit.grade === grade && unit.term === term);
  const currentUnits = visibleUnits[0]?.weeks || [];
  const grades = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

  const refreshSchemes = useCallback(() => {
    api
      .listSchemes()
      .then((list) => setSchemes(Array.isArray(list) ? list : []))
      .catch(() => setSchemes([]));
  }, []);

  useEffect(() => {
    refreshSchemes();
  }, [refreshSchemes]);

  const submit = async () => {
    const file = fileRef.current;
    if (file) {
      if (!/\.pdf$/i.test(file.name)) {
        toast.info("Only PDF files are parsed right now — paste the curriculum instead, or export it to PDF.");
        return;
      }
      setImporting(true);
      try {
        const dataBase64 = await readFileAsBase64(file);
        if (dataBase64.length > SCHEME_MAX_BASE64_CHARS) {
          toast.error(SCHEME_TOO_LARGE_MSG);
          return;
        }
        const imported = await api.importSchemes({
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          dataBase64,
        });
        if (!imported.length) {
          toast.error("No scheme of work could be read from that file. Check the subject/class heading and the week rows.");
          return;
        }
        setReceived(true);
        refreshSchemes();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not import that curriculum file right now.");
      } finally {
        setImporting(false);
      }
      return;
    }
    if (curriculum.trim()) setReceived(true);
    else toast.info("Paste the curriculum or upload a PDF file first.");
  };

  if (received) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-[#1A1512]/45 p-4" onClick={onClose}>
        <div className="w-full max-w-lg rounded-[28px] bg-[#FFFDF8] p-7 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E9EED9] text-[#4B6B3C]"><CheckCircle2 size={22} /></div>
          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Curriculum received</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">Ready to turn your content into learning paths.</h2>
          <p className="mt-3 text-sm leading-6 text-[#765F4F]">BrimLearn will keep your new subject in the same grade, term, strand, lesson, and intervention model as the NERDC library.</p>
          <div className="mt-6 rounded-2xl bg-[#F7EFE3] p-4 text-xs text-[#765F4F]"><span className="font-semibold text-[#3B241A]">Next mapping pass:</span> identify strands, objectives, prerequisites, and assessment checkpoints.</div>
          <button onClick={onClose} className="mt-6 w-full rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#A84A22]">Back to curriculum library</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#1A1512]/45 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-6 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]"><ClipboardList size={14} /> Curriculum library</div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">NERDC content, organised for learning.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#765F4F]">Maths and English are loaded from your supplied reference. The subject model is ready for Physics, Chemistry, Biology, History, and more.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[#A08A75] hover:bg-[#F7EFE3]" aria-label="Close curriculum library"><X size={18} /></button>
        </div>

        <div className="mt-6 flex gap-2 rounded-2xl bg-[#F7EFE3] p-1">
          <button onClick={() => setTab("library")} className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${tab === "library" ? "bg-[#FFFDF8] text-[#3B241A] shadow-sm" : "text-[#A08A75]"}`}>Browse loaded curriculum</button>
          {canManage && (
            <button onClick={() => setTab("add")} className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${tab === "add" ? "bg-[#FFFDF8] text-[#3B241A] shadow-sm" : "text-[#A08A75]"}`}>Add upcoming subject</button>
          )}
        </div>

        {tab === "library" ? (
          <div className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {curriculumSubjects.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.status === "live") {
                      setSubject(item.id);
                    } else if (canManage) {
                      setTab("add");
                    } else {
                      toast.info(`${item.name} is coming soon — your teacher will release it here when ready.`);
                    }
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${subject === item.id ? "border-[#8CAE70] bg-[#F0F2E4]" : "border-[#E2CDB8] bg-[#FFFDF8] hover:border-[#A9BF87]"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl text-xs font-bold" style={{ backgroundColor: `${item.accent}22`, color: item.accent }}>{item.short}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === "live" ? "bg-[#E9EED9] text-[#4B6B3C]" : "bg-[#FFF1CD] text-[#B67A17]"}`}>{item.status === "live" ? "Loaded" : "Coming soon"}</span>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-[#3B241A]">{item.name}</div>
                  <div className="mt-1 text-xs leading-5 text-[#A08A75]">{item.description}</div>
</button>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-[#F3E9DE] bg-[#FFFDF8] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">Imported scheme of work</div>
                  <span className="rounded-full bg-[#E9EED9] px-3 py-1.5 text-xs font-semibold text-[#4B6B3C]">{schemes.length} in the school library</span>
                </div>
                <div className="mt-3 space-y-2">
                  {schemes.length === 0 && <div className="rounded-2xl bg-[#F7EFE3] p-4 text-xs text-[#A08A75]">Nothing imported yet. Admin or teachers can upload a NERDC scheme-of-work PDF in the “Add upcoming subject” tab.</div>}
                  {schemes.map((scheme) => (
                    <div key={scheme.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#FFFDF8] p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#3B241A]">{scheme.subject} · {scheme.grade}</div>
                        <div className="mt-0.5 text-xs text-[#A08A75]">{scheme.term} · {scheme.weeks.length} weeks{scheme.sourceFile ? ` · ${scheme.sourceFile}` : ""}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#F7EFE3] px-2.5 py-1 text-[10px] font-bold text-[#765F4F]">Week {scheme.currentWeek ? scheme.currentWeek.replace(/\D+/g, "") : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

            <div className="mt-6 rounded-2xl border border-[#E2CDB8] bg-[#FFFDF8] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">{selectedSubject.name} · NERDC scheme of work</div>
                  <div className="mt-1 text-xs text-[#765F4F]">{curriculumSourceNote}</div>
                </div>
                <div className="flex gap-2">
                  <select value={grade} onChange={(event) => setGrade(event.target.value)} className="rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2 text-xs font-semibold text-[#765F4F]">{grades.map((item) => <option key={item}>{item}</option>)}</select>
                  <select value={term} onChange={(event) => setTerm(event.target.value)} className="rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2 text-xs font-semibold text-[#765F4F]"><option>First term</option><option>Second term</option><option>Third term</option></select>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {currentUnits.length ? currentUnits.map((unit, index) => (
                  <div key={`${unit}-${index}`} className="rounded-xl bg-[#FFFDF8] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A08A75]">Week {index + 1}</div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-[#3B241A]">{unit}</div>
                  </div>
                )) : <div className="col-span-full rounded-xl bg-[#FFFDF8] p-4 text-xs text-[#A08A75]">This term is ready for the full NERDC mapping pass.</div>}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#A08A75]">
                <span>Source: {curriculumSource}</span>
                {canManage && (
                  <button onClick={() => toast("Curriculum mapping view is ready for teacher review.")} className="font-semibold text-[#4B6B3C]">Review mapping <ArrowUpRight className="ml-1 inline" size={13} /></button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="rounded-2xl bg-[#FFF1CD] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B67A17]">Future-ready subject model</div>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#5A2F22]">Add Physics, Chemistry, Biology, History, or another subject.</h3>
              <p className="mt-2 text-sm leading-6 text-[#8A7361]">Each subject will use the same structure: grade band, term, strand, learning objective, lesson, practice, and intervention recommendation.</p>
            </div>

            <div className="mt-5 rounded-2xl border border-[#DDE4CC] bg-[#F0F2E4] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#4B6B3C]"><Info size={14} /> How to prepare your curriculum file</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#765F4F]">
                <li>Include the <span className="font-semibold text-[#3B241A]">subject</span> (e.g. Physics) and <span className="font-semibold text-[#3B241A]">class</span> (e.g. SS1) in the heading.</li>
                <li>Use rows or headings marked <span className="font-semibold text-[#3B241A]">Week 1, Week 2 … Week 13</span> so topics map to the right week.</li>
                <li>List the <span className="font-semibold text-[#3B241A]">topic</span> and the <span className="font-semibold text-[#3B241A]">learning objective / content</span> under each week.</li>
                <li>Keep the NERDC rhythm: <span className="font-semibold text-[#3B241A]">Week 5 = Mid-term exam</span>, <span className="font-semibold text-[#3B241A]">Week 7 = Mid-term break</span>, <span className="font-semibold text-[#3B241A]">Week 12 = Exams</span>.</li>
                <li>PDF works best — we extract the table automatically and load it here. Pasting the curriculum text directly also works.</li>
              </ul>
            </div>

            <textarea value={curriculum} onChange={(event) => setCurriculum(event.target.value)} placeholder="Paste the next supplied curriculum here…" className="mt-5 min-h-[150px] w-full resize-y rounded-2xl border border-[#E2CDB8] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#3B241A] outline-none placeholder:text-[#A08A75] focus:border-[#8CAE70] focus:ring-2 focus:ring-[#E6EBD4]" />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E2CDB8] px-4 py-2.5 text-xs font-semibold text-[#765F4F] hover:bg-[#F7EFE3]"><Upload size={14} /> {fileName || "Upload a subject curriculum (PDF)"}<input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => { fileRef.current = event.target.files?.[0] || null; setFileName(event.target.files?.[0]?.name || ""); }} /></label>
              <span className="text-xs text-[#A08A75]">PDF only — we extract the scheme table automatically</span>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setTab("library")} className="rounded-full px-4 py-3 text-sm font-semibold text-[#8A7361] hover:bg-[#F7EFE3]">Back to library</button>
              <button disabled={(!curriculum.trim() && !fileName) || importing} onClick={submit} className="rounded-full bg-[#C65A2E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-40">{importing ? "Reading curriculum…" : "Add subject curriculum"} <ChevronRight className="ml-1 inline" size={15} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
