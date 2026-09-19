import { BookOpen, Download, FileText, FolderOpen, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type Resource = { id: string; kind: "recording" | "reading" | "material" | "worksheet"; title: string; meta: string; tone: string; Icon: typeof Play };

const resources: Resource[] = [
  { id: "r1", kind: "recording", title: "Multiplication in the market · live", meta: "45 min · 1080p", tone: "bg-[#e5f5ed] text-[#34775e]", Icon: Play },
  { id: "r2", kind: "recording", title: "Comprehension circle · group session", meta: "40 min · 720p", tone: "bg-[#eaf2ff] text-[#3975aa]", Icon: Play },
  { id: "r3", kind: "recording", title: "Fractions visual lab demo", meta: "32 min · 1080p", tone: "bg-[#fff1d7] text-[#b07a1f]", Icon: Play },
  { id: "r4", kind: "reading", title: "The Market Story — chapter 3", meta: "8 pages · 12 min read", tone: "bg-[#fff0ec] text-[#a25142]", Icon: BookOpen },
  { id: "r5", kind: "reading", title: "How numbers moved the world", meta: "Self-study booklet", tone: "bg-[#f3e6ff] text-[#8053a9]", Icon: BookOpen },
  { id: "r6", kind: "material", title: "Term 1 scheme of work (JSS1)", meta: "Curriculum · 47 pages", tone: "bg-[#e7f2ff] text-[#4e91c6]", Icon: FolderOpen },
  { id: "r7", kind: "material", title: "Algebra starter slides", meta: "12 slides", tone: "bg-[#e5f5ed] text-[#34775e]", Icon: FolderOpen },
  { id: "r8", kind: "worksheet", title: "Multiplying by 10s worksheet", meta: "Print-friendly · answers included", tone: "bg-[#fff1d7] text-[#b07a1f]", Icon: FileText },
  { id: "r9", kind: "worksheet", title: "Fractions practice pack", meta: "4 levels · Easiest to Advanced", tone: "bg-[#f3e6ff] text-[#8053a9]", Icon: FileText },
];

const kinds: Array<{ key: "all" | Resource["kind"]; label: string }> = [
  { key: "all", label: "All" },
  { key: "recording", label: "Recorded sessions" },
  { key: "reading", label: "Readings" },
  { key: "material", label: "Course materials" },
  { key: "worksheet", label: "Worksheets" },
];

export function ResourceLibrary() {
  const [filter, setFilter] = useState<"all" | Resource["kind"]>("all");
  const [query, setQuery] = useState("");
  const visible = resources.filter((resource) => (filter === "all" || resource.kind === filter) && resource.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <section className="rounded-[27px] bg-[#174b3a] p-7 text-white shadow-[0_18px_40px_rgba(18,61,48,.14)] sm:p-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]"><Search size={13} /> Resource library</div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">Everything you need, in one shelf.</h1>
            <p className="mt-3 text-sm leading-6 text-[#c4ded0]">Recorded sessions, readings, course materials, and worksheets — kept tidy for your next revision.</p>
          </div>
          <div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d958b]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the library…" className="w-full rounded-full border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#a7c4b8] outline-none focus:border-[#d8f36a] md:w-72" /></div>
        </div>
      </section>

      <section className="mt-7 rounded-[27px] border border-[#e3e8df] bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.map((kind) => <button key={kind.key} onClick={() => setFilter(kind.key)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === kind.key ? "bg-[#173f31] text-white" : "bg-[#f4f7ef] text-[#527064] hover:bg-[#eef4ea]"}`}>{kind.label}</button>)}
          <span className="ml-auto text-xs font-semibold text-[#8aa096]">{visible.length} item{visible.length === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((resource) => {
            const Icon = resource.Icon;
            return (
              <div key={resource.id} className="group rounded-[22px] border border-[#e9eee5] p-5 transition hover:-translate-y-0.5 hover:border-[#c9d8cc] hover:shadow-[0_14px_25px_rgba(26,53,40,.08)]">
                <div className="flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${resource.tone}`}><Icon size={18} /></div><button onClick={() => toast(`"${resource.title}" ready to download.`)} className="rounded-full bg-[#f4f7ef] p-2 text-[#527064] transition group-hover:bg-[#eaf2e6]"><Download size={15} /></button></div>
                <div className="mt-5 text-sm font-semibold leading-6 text-[#25483c]">{resource.title}</div>
                <div className="mt-1.5 text-xs text-[#8aa096]">{resource.meta}</div>
                <div className="mt-4"><button onClick={() => toast(`Opening ${resource.title}.`)} className="rounded-full bg-[#173f31] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#286b51]">{resource.kind === "recording" ? "Watch" : resource.kind === "reading" ? "Read" : resource.kind === "worksheet" ? "Open worksheet" : "Open"}</button></div>
              </div>
            );
          })}
          {visible.length === 0 && <div className="col-span-full rounded-2xl bg-[#f6f8f3] p-8 text-center text-sm text-[#7d958b]">No resources match your search.</div>}
        </div>
      </section>
    </>
  );
}