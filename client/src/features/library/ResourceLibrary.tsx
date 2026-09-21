import { BookOpen, Download, FileText, FolderOpen, Play, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api, type Resource } from "@/_core/api";
import { buildYouTubeEmbedUrl } from "@shared/resource";

type Category = "recording" | "reading" | "material" | "worksheet";

type ViewResource = {
  id: string;
  category: Category;
  title: string;
  meta: string;
  tone: string;
  Icon: typeof Play;
  action: "watch" | "download" | "demo";
  youtubeId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
};

const kinds: Array<{ key: "all" | Category; label: string }> = [
  { key: "all", label: "All" },
  { key: "recording", label: "Recorded sessions" },
  { key: "reading", label: "Readings" },
  { key: "material", label: "Course materials" },
  { key: "worksheet", label: "Worksheets" },
];

const toneFor: Record<Category, string> = {
  recording: "bg-[#e5f5ed] text-[#34775e]",
  reading: "bg-[#fff0ec] text-[#a25142]",
  material: "bg-[#e7f2ff] text-[#4e91c6]",
  worksheet: "bg-[#fff1d7] text-[#b07a1f]",
};

const iconFor: Record<Category, typeof Play> = {
  recording: Play,
  reading: BookOpen,
  material: FolderOpen,
  worksheet: FileText,
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Offline demo content — shown only when there is no backend/session to reach.
const demoResources: ViewResource[] = [
  { id: "d1", category: "recording", title: "Multiplication in the market · live", meta: "45 min · demo", tone: "bg-[#e5f5ed] text-[#34775e]", Icon: Play, action: "demo" },
  { id: "d2", category: "reading", title: "The Market Story — chapter 3", meta: "8 pages · demo", tone: "bg-[#fff0ec] text-[#a25142]", Icon: BookOpen, action: "demo" },
  { id: "d3", category: "material", title: "Term 1 scheme of work (JSS1)", meta: "Curriculum · demo", tone: "bg-[#e7f2ff] text-[#4e91c6]", Icon: FolderOpen, action: "demo" },
  { id: "d4", category: "worksheet", title: "Multiplying by 10s worksheet", meta: "Print-friendly · demo", tone: "bg-[#fff1d7] text-[#b07a1f]", Icon: FileText, action: "demo" },
];

function mapResource(resource: Resource): ViewResource {
  const isVideo = resource.kind === "video";
  return {
    id: resource.id,
    category: resource.category,
    title: resource.title,
    meta: isVideo
      ? `YouTube · by ${resource.createdByName ?? "your teacher"}`
      : `${resource.fileName ?? "file"} · ${formatBytes(resource.size)}`,
    tone: toneFor[resource.category] ?? toneFor.material,
    Icon: isVideo ? Play : iconFor[resource.category] ?? FileText,
    action: isVideo ? "watch" : "download",
    youtubeId: resource.youtubeId ?? undefined,
    fileName: resource.fileName ?? undefined,
    mimeType: resource.mimeType ?? undefined,
    size: resource.size,
  };
}

export function ResourceLibrary() {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<ViewResource[]>([]);
  const [ready, setReady] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [preview, setPreview] = useState<ViewResource | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .listResources()
      .then((list) => {
        if (!mounted) return;
        const mapped = list.map(mapResource);
        setResources(mapped);
        setIsDemo(mapped.length === 0);
      })
      .catch(() => {
        if (!mounted) return;
        setResources(demoResources);
        setIsDemo(true);
      })
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  const visible = resources.filter(
    (resource) => (filter === "all" || resource.category === filter) && resource.title.toLowerCase().includes(query.toLowerCase())
  );

  async function download(resource: ViewResource) {
    if (resource.action === "demo" || !resource.fileName) {
      toast(`"${resource.title}" ready to download.`);
      return;
    }
    try {
      const full = await api.getResource(resource.id);
      if (!full.dataBase64) {
        toast.error("This resource has no file content.");
        return;
      }
      const binary = atob(full.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      const url = URL.createObjectURL(new Blob([bytes], { type: full.mimeType || "application/octet-stream" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = full.fileName || `resource-${full.id}.bin`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the file.");
    }
  }

  const actionLabel = (resource: ViewResource) => {
    if (resource.action === "demo") return "Open";
    return resource.action === "watch" ? "Watch" : "Download";
  };

  const onAction = (resource: ViewResource) => {
    if (resource.action === "watch" && resource.youtubeId) {
      setPreview(resource);
      return;
    }
    if (resource.action === "download") {
      void download(resource);
      return;
    }
    toast(`"${resource.title}" ready to open.`);
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><Search size={13} /> Resource library</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Everything you need, in one shelf.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Videos and files your teacher has published — watch lessons and download worksheets for revision.</p>
          </div>
          <div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d958b]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the library…" className="w-full rounded-full border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#a7c4b8] outline-none focus:border-[#d8f36a] md:w-72" /></div>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.map((kind) => <button key={kind.key} onClick={() => setFilter(kind.key)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === kind.key ? "bg-[#173f31] text-white" : "bg-[#f4f7ef] text-[#527064] hover:bg-[#eef4ea]"}`}>{kind.label}</button>)}
          <span className="ml-auto text-xs font-semibold text-[#8aa096]">{ready ? `${visible.length} item${visible.length === 1 ? "" : "s"}` : "Loading…"}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((resource) => {
            const Icon = resource.Icon;
            return (
              <div key={resource.id} className="group rounded-[22px] border border-[#e9eee5] p-5 transition hover:-translate-y-0.5 hover:border-[#c9d8cc] hover:shadow-[0_14px_25px_rgba(26,53,40,.08)]">
                <div className="flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${resource.tone}`}><Icon size={18} /></div>{resource.action === "download" && <button onClick={() => void download(resource)} className="rounded-full bg-[#f4f7ef] p-2 text-[#527064] transition group-hover:bg-[#eaf2e6]" title="Download"><Download size={15} /></button>}</div>
                <div className="mt-5 text-sm font-semibold leading-6 text-[#25483c]">{resource.title}</div>
                <div className="mt-1.5 text-xs text-[#8aa096]">{resource.meta}</div>
                <div className="mt-4"><button onClick={() => onAction(resource)} className="rounded-full bg-[#173f31] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#286b51]">{actionLabel(resource)}</button></div>
              </div>
            );
          })}
          {ready && visible.length === 0 && (
            <div className="col-span-full rounded-2xl bg-[#f6f8f3] p-8 text-center text-sm text-[#7d958b]">
              {isDemo ? "No resources published yet — this shelf will fill up as your teacher shares videos and files." : "No resources match your search."}
            </div>
          )}
        </div>
      </section>

      {preview && preview.youtubeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-2xl rounded-[27px] bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-display text-lg font-semibold tracking-[-0.04em] text-[#183c31]">{preview.title}</div><div className="text-xs text-[#8aa096]">Published by your teacher</div></div><button onClick={() => setPreview(null)} className="rounded-full bg-[#f4f7ef] p-2 text-[#527064] hover:bg-[#eaf2e6]"><X size={16} /></button></div>
            <iframe title={preview.title} src={buildYouTubeEmbedUrl(preview.youtubeId)} className="aspect-video w-full rounded-2xl border border-[#e9eee5]" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}
    </>
  );
}