import {
  Clapperboard,
  Download,
  FileText,
  FileUp,
  Library,
  Link2,
  Play,
  Plus,
  Square,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type CreateResourceInput, type Resource, type ResourceCategory, type ResourceKind } from "@/_core/api";
import { RESOURCE_MAX_BYTES } from "@shared/const";
import { buildYouTubeEmbedUrl, parseYouTubeId, sanitizeFileName } from "@shared/resource";

type PublishTab = "video" | "file" | "record";

const tabs: Array<{ key: PublishTab; label: string; Icon: typeof Video }> = [
  { key: "video", label: "YouTube link", Icon: Link2 },
  { key: "file", label: "Upload PDF / file", Icon: FileUp },
  { key: "record", label: "Record a clip", Icon: Video },
];

const categories: Array<{ key: ResourceCategory; label: string }> = [
  { key: "recording", label: "Recorded session" },
  { key: "reading", label: "Reading" },
  { key: "material", label: "Course material" },
  { key: "worksheet", label: "Worksheet" },
];

const inputClass =
  "w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70]";
const labelClass = "text-xs font-semibold text-[#765F4F]";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

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

export function TutorResources() {
  const [tab, setTab] = useState<PublishTab>("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("recording");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<{ name: string; mime: string; size: number; base64: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<Resource | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recorded, setRecorded] = useState<{ blob: Blob; previewUrl: string } | null>(null);

  const refresh = useCallback(() => {
    api
      .listResources()
      .then((list) => setResources(list))
      .catch(() => setResources([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const youtubeId = parseYouTubeId(videoUrl);

  const resetDraft = () => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setFile(null);
    setRecorded((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setCategory("recording");
  };

  async function publish(input: Omit<CreateResourceInput, "kind" | "title" | "description" | "category"> & { kind: ResourceKind }) {
    if (!title.trim()) {
      toast("Give the resource a title first.");
      return;
    }
    setPublishing(true);
    try {
      const created = await api.createResource({
        kind: input.kind,
        category,
        title: title.trim(),
        description: description.trim(),
        grade: input.grade ?? null,
        subjectId: input.subjectId ?? null,
        subject: input.subject ?? null,
        term: input.term ?? null,
        week: input.week ?? null,
        youtubeId: input.kind === "video" ? input.youtubeId : null,
        fileName: input.kind === "file" ? input.fileName : null,
        mimeType: input.kind === "file" ? input.mimeType : null,
        dataBase64: input.kind === "file" ? input.dataBase64 : null,
      });
      setResources((current) => [created, ...current]);
      toast.success("Published to the learner resource library.");
      resetDraft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish the resource.");
    } finally {
      setPublishing(false);
    }
  }

  const publishVideo = () => {
    if (!youtubeId) {
      toast.error("Paste a valid YouTube link (watch, shorts, or youtu.be).");
      return;
    }
    publish({ kind: "video", youtubeId });
  };

  async function publishFile() {
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    publish({ kind: "file", fileName: sanitizeFileName(file.name), mimeType: file.mime, dataBase64: file.base64 });
  }

  async function publishRecording() {
    if (!recorded) {
      toast.error("Record a clip first.");
      return;
    }
    const base64 = await readFileAsBase64(recorded.blob);
    publish({ kind: "file", fileName: `recording-${Date.now()}.webm`, mimeType: recorded.blob.type || "video/webm", dataBase64: base64 });
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    if (picked.size > RESOURCE_MAX_BYTES) {
      toast.error("That file is over 512 KB. Compress it first, or use a YouTube link instead.");
      return;
    }
    event.target.value = "";
    readFileAsBase64(picked)
      .then((base64) => setFile({ name: picked.name, mime: picked.type || "application/octet-stream", size: picked.size, base64 }))
      .catch(() => toast.error("Could not read that file."));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: mime });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunks, { type: mime });
        if (blob.size > RESOURCE_MAX_BYTES) {
          toast.error("That clip is over 512 KB. Keep recordings short, or use a YouTube link instead.");
          return;
        }
        setRecorded((current) => {
          if (current) URL.revokeObjectURL(current.previewUrl);
          return { blob, previewUrl: URL.createObjectURL(blob) };
        });
      };
      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      setIsRecording(true);
      toast("Recording… stop to review your clip.");
    } catch {
      toast.error("Camera or microphone is not available in this browser.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }

  async function download(file: Resource) {
    try {
      const resource = await api.getResource(file.id);
      if (!resource.dataBase64) {
        toast.error("No file content for this resource.");
        return;
      }
      const binary = atob(resource.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      const url = URL.createObjectURL(new Blob([bytes], { type: resource.mimeType || "application/octet-stream" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = resource.fileName || `resource-${resource.id}.bin`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloading ${resource.fileName}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the file.");
    }
  }

  async function remove(resource: Resource) {
    try {
      await api.removeResource(resource.id);
      setResources((current) => current.filter((item) => item.id !== resource.id));
      toast.success(`"${resource.title}" removed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the resource.");
    }
  }

  const categoryLabel = (key: ResourceCategory) => categories.find((item) => item.key === key)?.label ?? key;

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]"><Library size={13} /> Resource studio</div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Share what your class needs.</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">Publish lessons and worksheets as YouTube links, PDFs, or short recorded clips — every learner in the resource library can watch or download them.</p>
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Publish to the class library</div>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">What are you adding?</h2>

          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === key ? "border-[#4B6B3C] bg-[#E9EED9] text-[#4B6B3C]" : "border-[#E2CDB8] text-[#765F4F] hover:bg-[#F7EFE3]"}`}><Icon size={14} />{label}</button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Title<span className="mt-1.5 block"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Perimeter vs area · visual lab" className={inputClass} /></span></label>
            <label className={labelClass}>Category<select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory)} className={`mt-1.5 ${inputClass}`}>{categories.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Description<span className="mt-1.5 block"><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note for learners…" className={inputClass} /></span></label>
          </div>

          {tab === "video" && (
            <div className="mt-5 rounded-2xl border border-[#F3E9DE] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#765F4F]"><Link2 size={14} className="text-[#B84B3D]" /> YouTube link</div>
              <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/watch?v=… or https://youtu.be/…" className={`mt-2 ${inputClass}`} />
              {youtubeId && (
                <iframe title="YouTube preview" src={buildYouTubeEmbedUrl(youtubeId)} className="mt-3 h-44 w-full rounded-2xl border border-[#F3E9DE]" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              )}
            </div>
          )}

          {tab === "file" && (
            <div className="mt-5 rounded-2xl border border-[#F3E9DE] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#765F4F]"><FileUp size={14} className="text-[#4B6B3C]" /> File to share (512 KB max)</div>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#DCE2C8] bg-[#FFFDF8] px-4 py-6 text-sm font-semibold text-[#765F4F] transition hover:border-[#8CAE70] hover:bg-[#F7EFE3]"><UploadCloud size={16} />{file ? file.name : "Choose a PDF, worksheet, or slides"}{"\u00A0"}                <input type="file" onChange={onPickFile} className="sr-only" />
              </label>
              {file && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F7EFE3] p-3 text-xs text-[#765F4F]"><span className="truncate font-semibold text-[#3B241A]">{file.name}</span><span className="shrink-0 rounded-full bg-[#FFFDF8] px-2.5 py-1 text-[10px] font-bold text-[#4B6B3C] shadow-sm">{formatBytes(file.size)}</span></div>
              )}
            </div>
          )}

          {tab === "record" && (
            <div className="mt-5 rounded-2xl border border-[#F3E9DE] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#765F4F]"><Video size={14} className="text-[#8B78C7]" /> Record a short clip (512 KB max)</div>
              <p className="mt-1 text-xs text-[#A08A75]">Camera + microphone recording, saved as a webm file learners can download. For full lessons, use a YouTube link instead.</p>
              <div className="mt-3 flex items-center gap-3">
                {isRecording ? (
                  <button onClick={stopRecording} className="flex items-center gap-2 rounded-full bg-[#B84B3D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E3A2F]"><Square size={13} /> Stop recording</button>
                ) : (
                  <button onClick={startRecording} className="flex items-center gap-2 rounded-full bg-[#C65A2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84A22]"><Clapperboard size={13} /> Start recording</button>
                )}
              </div>
              {recorded && <video src={recorded.previewUrl} controls className="mt-3 max-h-44 w-full rounded-2xl border border-[#F3E9DE] bg-black" />}
            </div>
          )}

          <button onClick={tab === "video" ? publishVideo : tab === "file" ? () => void publishFile() : () => void publishRecording()} disabled={publishing} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#C65A2E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#A84A22] disabled:opacity-60 sm:w-auto"><Plus size={15} />{publishing ? "Publishing…" : "Publish to library"}</button>
        </div>

        <div className="space-y-5">
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="flex items-center justify-between"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Published resources</div><span className="rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]">{resources.length}</span></div>
            <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto pr-1">
              {loaded && resources.length === 0 && <div className="rounded-2xl bg-[#F7EFE3] p-6 text-center text-sm text-[#8A7361]">Nothing published yet. Add a video or file above and it will appear here for learners.</div>}
              {!loaded && <div className="rounded-2xl bg-[#F7EFE3] p-6 text-center text-sm text-[#8A7361]">Loading resources…</div>}
              {resources.map((resource) => {
                const isVideo = resource.kind === "video";
                return (
                  <div key={resource.id} className="rounded-2xl border border-[#F3E9DE] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isVideo ? "bg-[#E9EED9] text-[#4B6B3C]" : "bg-[#FFF1CD] text-[#B67A17]"}`}>{isVideo ? <Play size={15} /> : <FileText size={15} />}</span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#3B241A]">{resource.title}</div>
                          <div className="mt-0.5 truncate text-xs text-[#A08A75]">{categoryLabel(resource.category)} · {isVideo ? "YouTube video" : `${resource.fileName ?? "file"} · ${formatBytes(resource.size)}`}</div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#F7EFE3] px-2.5 py-1 text-[10px] font-bold text-[#765F4F]">{resource.createdByName ? resource.createdByName.split(" ")[0] : ""}</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      {isVideo ? (
                        <button onClick={() => setPreview(resource)} className="rounded-full bg-[#C65A2E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A84A22]">Preview</button>
                      ) : (
                        <button onClick={() => void download(resource)} className="flex items-center gap-1.5 rounded-full bg-[#C65A2E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A84A22]"><Download size={12} /> Download</button>
                      )}
                      <button onClick={() => void remove(resource)} className="ml-auto flex items-center gap-1.5 rounded-full border border-[#EAD0C8] px-3 py-1.5 text-xs font-semibold text-[#A94A3D] transition hover:bg-[#FBEBE5]"><Trash2 size={12} /> Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-2xl rounded-[27px] bg-[#FFFDF8] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-display text-lg font-semibold tracking-[-0.04em] text-[#1A1512]">{preview.title}</div><div className="text-xs text-[#A08A75]">{categoryLabel(preview.category)} · waiting for class playback</div></div><button onClick={() => setPreview(null)} className="rounded-full bg-[#F7EFE3] p-2 text-[#765F4F] hover:bg-[#E9EED9]"><X size={16} /></button></div>
            {preview.youtubeId && <iframe title={preview.title} src={buildYouTubeEmbedUrl(preview.youtubeId)} className="aspect-video w-full rounded-2xl border border-[#F3E9DE]" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
          </div>
        </div>
      )}
    </>
  );
}