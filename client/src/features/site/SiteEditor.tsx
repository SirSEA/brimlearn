import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { defaultLandingContent, type LandingContent, type SiteContentDoc } from "@shared/site";
import { SITE_IMAGE_MAX_BYTES } from "@shared/const";
import { ApiUnavailableError, api, type UploadSiteImageInput } from "@/_core/api";
import { LandingPage } from "@/pages/Landing";
import { Eye, Globe, Image as ImageIcon, Plus, RotateCcw, Save, Send, TriangleAlert, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

function guessPlatform(url: string): string {
  try {
    const { hostname } = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YouTube";
    const parts = hostname.replace(/^www\./, "").split(".");
    return parts.slice(0, -1).join(".") || hostname;
  } catch {
    return "Website";
  }
}

function SectionCard({ number, title, hint, children }: { number: string; title: string; hint: ReactNode; children: ReactNode }) {
  return (
    <section id={`editor-${number}`} className="rounded-[24px] border border-[#E2CDB8] bg-[#FFFDF8] p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#3B241A] text-[11px] font-bold text-[#FFC857]">{number}</span>
        <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{title}</h3>
      </div>
      <div className="mb-5 rounded-xl bg-[#F7EFE3] px-3.5 py-2.5 text-xs leading-5 text-[#765F4F]">{hint}</div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#765F4F]">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-[#A08A75]">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#765F4F]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full resize-y rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
      />
    </label>
  );
}

const emptyCourse = () => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
  title: "",
  description: "",
  category: "",
  platform: "Website",
  url: "",
  imageUrl: null,
});

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const isSiteImageUrl = (value: string | null | undefined) =>
  Boolean(value && value.startsWith("/site-images/"));

function ImageInput({
  label,
  value,
  onChange,
  placeholder = "https://… (publicly accessible image)",
  hint,
  onUploading,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  hint?: string;
  onUploading?: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const pickFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Use a PNG, JPG, WebP, or GIF image.");
      return;
    }
    if (file.size > SITE_IMAGE_MAX_BYTES) {
      toast.error("That image is too large — keep it under 480 KB. Compress it, or paste a public image URL instead.");
      return;
    }
    setUploading(true);
    onUploading?.(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read the file"));
        reader.readAsDataURL(file);
      });
      const dataBase64 = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
      const input: UploadSiteImageInput = { fileName: file.name, mimeType: file.type as UploadSiteImageInput["mimeType"], dataBase64 };
      const uploaded = await api.uploadSiteImage(input);
      onChange(uploaded.url);
      toast.success("Image uploaded. Save the draft to keep it.");
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server to upload images." : "Upload failed. Check the file size and try again.");
    } finally {
      setUploading(false);
      onUploading?.(false);
    }
  };

  return (
    <div>
      <span className="text-xs font-semibold text-[#765F4F]">{label}</span>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value || null)}
          className="min-w-0 flex-1 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm font-medium text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
        />
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#765F4F] transition hover:border-[#A9BF87] hover:text-[#3B241A]",
            uploading && "cursor-wait opacity-60"
          )}
        >
          <Upload size={13} /> {uploading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold text-[#B84B3D] transition hover:bg-[#F7E0D9]"
            title="Clear this image"
          >
            <X size={14} /> Remove
          </button>
        )}
      </div>
      {value && (
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-12 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#E2CDB8] bg-[#F7EFE3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" onError={(event) => (event.currentTarget.style.opacity = "0.4")} />
          </div>
          <span className="text-[11px] leading-4 text-[#A08A75]">{isSiteImageUrl(value) ? "Uploaded to BrimLearn — stored with your site." : "External URL — this loads from the link you pasted."}</span>
        </div>
      )}
      {hint && <span className="mt-1 block text-[11px] leading-4 text-[#A08A75]">{hint}</span>}
    </div>
  );
}

function WarningNote() {
  return (
    <div className="rounded-[20px] border border-[#FFE7A8] bg-[#FFFDF8] p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-[#9A6712]">
        <TriangleAlert size={16} /> How the landing page is structured — read before you edit
      </div>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-[#8A7361]">
        <li className="flex gap-2"><span className="shrink-0 font-bold text-[#9A6712]">Fixed order</span> The live page always renders: <b>Nav</b> → <b>Hero</b> → <b>Why BrimLearn (feature cards)</b> → <b>Courses &amp; lessons (carousel)</b> → <b>About</b> → <b>Final call-to-action</b> → <b>Footer</b>. You edit the text inside each section — the sections and their positions cannot be reordered here.</li>
        <li className="flex gap-2"><span className="shrink-0 font-bold text-[#9A6712]">Length matters</span> Keep the hero headline short (one line, ~90 characters max), the subheadline to two sentences, and course/feature descriptions to one or two sentences so cards stay aligned in the grid.</li>
        <li className="flex gap-2"><span className="shrink-0 font-bold text-[#9A6712]">Images</span> Use the <b>Upload image</b> button for PNG/JPG/WebP/GIF up to 480 KB, or paste a public <code className="rounded bg-[#F3E4BE] px-1">https://…</code> URL. The hero image sits beside the text on wide screens and stacks above it on phones; the about image sits beside the text; course and feature images fill the card tops.</li>
        <li className="flex gap-2"><span className="shrink-0 font-bold text-[#9A6712]">Carousel links</span> Every course must be a real, public lesson (YouTube, Khan Academy, BBC Bitesize…). Avoid links that require a login — learners open them in a new tab.</li>
        <li className="flex gap-2"><span className="shrink-0 font-bold text-[#9A6712]">Publish</span> Edits go to a private draft. <b>Preview</b> first, then click <b>Publish to live site</b> for visitors to see them. <b>Revert</b> rolls back to the last published version.</li>
      </ul>
    </div>
  );
}

export function SiteEditor() {
  const [doc, setDoc] = useState<SiteContentDoc | null>(null);
  const [draft, setDraft] = useState<LandingContent>(defaultLandingContent());
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => {
    const loaded = await api.getSiteContent();
    if (loaded) {
      setDoc(loaded);
      setDraft(loaded.content);
    }
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load the website content."));
  }, [load]);

  const patch = (updater: (current: LandingContent) => LandingContent) => setDraft((current) => updater(current));

  const saveDraft = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSiteContent(draft);
      setDoc(updated);
      setDraft(updated.content);
      toast.success("Draft saved. Preview it, then publish when you're happy.");
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server to save changes." : "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const updated = await api.publishSiteContent();
      setDoc(updated);
      setDraft(updated.content);
      toast.success("Website published. Visitors now see this version.");
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server to publish." : "Could not publish the website.");
    } finally {
      setPublishing(false);
    }
  };

  const revert = async () => {
    if (!doc?.previous) return;
    if (!window.confirm("Roll the working draft back to the last published version? Unsaved edits will be lost.")) return;
    try {
      const updated = await api.revertSiteContent();
      setDoc(updated);
      setDraft(updated.content);
      toast.success("Reverted to the last published version.");
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server to revert." : "Could not revert the website.");
    }
  };

  const moveCourse = (index: number, direction: -1 | 1) =>
    patch((current) => {
      const courses = [...current.courses];
      const target = index + direction;
      if (target < 0 || target >= courses.length) return current;
      [courses[index], courses[target]] = [courses[target], courses[index]];
      return { ...current, courses };
    });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">
            <Globe size={13} /> Website editor
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">Edit the public landing page</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#765F4F]">
            Each section below updates a different part of the landing page. Save a draft, preview exactly what visitors see, then publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", doc?.status === "published" ? "bg-[#E9EED9] text-[#4B6B3C]" : "bg-[#FFF1CD] text-[#9A6712]")}>
            {doc?.status === "published" ? "Live website" : "Unpublished draft"}
          </span>
          {doc?.previous && (
            <button onClick={revert} disabled={uploadingImage} className="flex items-center gap-1.5 rounded-full border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#765F4F] transition hover:border-[#A9BF87] hover:text-[#3B241A]">
              <RotateCcw size={13} /> Revert
            </button>
          )}
        </div>
      </div>

      <div className="mt-6"><WarningNote /></div>

      {doc && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#A08A75]">
          <span>Updated: {new Date(doc.updatedAt).toLocaleString()}</span>
          <span>by {doc.updatedByName ?? "system"}</span>
          {doc.publishedAt && <span>Published {new Date(doc.publishedAt).toLocaleString()}</span>}
        </div>
      )}

      <div className="sticky top-2 z-30 mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2CDB8] bg-white/95 p-2 backdrop-blur">
        <button onClick={() => setPreview(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3B241A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A84A22]">
          <Eye size={15} /> Preview landing page
        </button>
        <button
          onClick={saveDraft}
          disabled={saving || uploadingImage}
          className="flex items-center gap-2 rounded-xl border border-[#3B241A] px-4 py-2.5 text-sm font-semibold text-[#3B241A] transition hover:bg-[#F3E9DE] disabled:opacity-60"
        >
          <Save size={15} /> {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={publish}
          disabled={publishing || uploadingImage}
          className="flex items-center gap-2 rounded-xl bg-[#FFC857] px-4 py-2.5 text-sm font-semibold text-[#1A1512] shadow-[0_4px_0_#2A1D16] transition hover:bg-[#FFC857] disabled:opacity-60"
        >
          <Send size={15} /> {publishing ? "Publishing…" : "Publish to live site"}
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <SectionCard number="1" title="Brand" hint="Shown in the top-left of the landing nav and across the page footer.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Brand name" value={draft.brand.name} onChange={(v) => patch((c) => ({ ...c, brand: { ...c.brand, name: v } }))} />
            <TextInput label="Tagline" value={draft.brand.tagline} onChange={(v) => patch((c) => ({ ...c, brand: { ...c.brand, tagline: v } }))} />
          </div>
        </SectionCard>

        <SectionCard number="2" title="Hero" hint="The first thing visitors see. Keep the headline short and the subheadline to one or two sentences.">
          <TextInput label="Eyebrow chip" value={draft.hero.eyebrow} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, eyebrow: v } }))} />
          <TextArea label="Headline" value={draft.hero.headline} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, headline: v } }))} rows={2} />
          <TextArea label="Subheadline" value={draft.hero.subheadline} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, subheadline: v } }))} rows={3} />
          <ImageInput
            label="Hero image"
            value={draft.hero.imageUrl}
            placeholder="https://… (publicly accessible image)"
            hint="Optional. When blank, a built-in graphic is shown instead. The image sits on the right of the hero on wide screens and stacks above the text on smaller devices."
            onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, imageUrl: v } }))}
            onUploading={setUploadingImage}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Primary button label" value={draft.hero.primaryCtaLabel} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, primaryCtaLabel: v } }))} />
            <TextInput label="Primary button link" value={draft.hero.primaryCtaHref} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, primaryCtaHref: v } }))} hint="e.g. /signup" />
            <TextInput label="Secondary button label" value={draft.hero.secondaryCtaLabel} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, secondaryCtaLabel: v } }))} />
            <TextInput label="Secondary button link" value={draft.hero.secondaryCtaHref} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, secondaryCtaHref: v } }))} hint="e.g. /login" />
          </div>
        </SectionCard>

        <SectionCard number="3" title="About section" hint="One paragraph describing what the project does. The right-side panel shows the brand tagline when no image is set.">
          <TextInput label="Heading" value={draft.about.heading} onChange={(v) => patch((c) => ({ ...c, about: { ...c.about, heading: v } }))} />
          <TextArea label="Body" value={draft.about.body} onChange={(v) => patch((c) => ({ ...c, about: { ...c.about, body: v } }))} rows={5} />
          <ImageInput
            label="About image"
            value={draft.about.imageUrl}
            hint="Optional. When blank, the brand tagline panel is shown instead."
            onChange={(v) => patch((c) => ({ ...c, about: { ...c.about, imageUrl: v } }))}
            onUploading={setUploadingImage}
          />
        </SectionCard>

        <SectionCard number="4" title="Feature cards" hint="The four cards under “Why BrimLearn”. Pick the three or four features you want to lead with.">
          {draft.features.map((feature, index) => (
            <div key={index} className="rounded-2xl border border-[#F3E9DE] bg-[#FFFDF8] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-[#4B6B3C]">Card {index + 1}</span>
                <button
                  onClick={() => patch((c) => ({ ...c, features: c.features.filter((_, i) => i !== index) }))}
                  className="grid h-7 w-7 place-items-center rounded-lg text-[#B84B3D] transition hover:bg-[#F7E0D9]"
                  aria-label={`Remove card ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput label="Heading" value={feature.heading} onChange={(v) => patch((c) => ({ ...c, features: c.features.map((f, i) => (i === index ? { ...f, heading: v } : f)) }))} />
                <TextArea label="Body" rows={2} value={feature.body} onChange={(v) => patch((c) => ({ ...c, features: c.features.map((f, i) => (i === index ? { ...f, body: v } : f)) }))} />
                <div className="lg:col-span-2">
                  <ImageInput
                    label="Card image (optional)"
                    value={feature.imageUrl}
                    hint="Optional. When set, the image fills the top of the card."
                    onChange={(v) => patch((c) => ({ ...c, features: c.features.map((f, i) => (i === index ? { ...f, imageUrl: v } : f)) }))}
                    onUploading={setUploadingImage}
                  />
                </div>
              </div>
            </div>
          ))}
          {draft.features.length < 8 && (
            <button
              onClick={() => patch((c) => ({ ...c, features: [...c.features, { heading: "New feature", body: "Describe the benefit in one or two sentences.", imageUrl: null }] }))}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#A9BF87] px-4 py-2.5 text-sm font-semibold text-[#4B6B3C] transition hover:bg-[#F7EFE3]"
            >
              <Plus size={15} /> Add feature card
            </button>
          )}
        </SectionCard>

        <SectionCard
          number="5"
          title="Courses & lessons carousel"
          hint={
            <span>
              <span className="flex items-center gap-1.5 font-bold text-[#9A6712]"><TriangleAlert size={14} /> Important — how course links must look</span>
              <br />
              The carousel only shows <b>real, open lessons</b> that learners can open from any device. Use a YouTube video/playlist, a course page, or an exercise on a trusted platform (Khan Academy, BBC Bitesize, etc.). The link opens in a new tab. Keep the title short, the description one or two sentences, and pick a category (e.g. Mathematics). Platforms are auto-labelled from the link, and links work best when they don't require a login.
            </span>
          }
        >
          {draft.courses.map((course, index) => (
            <div key={course.id} className="rounded-2xl border border-[#F3E9DE] bg-[#FFFDF8] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B6B3C]"><ImageIcon size={13} /> Course {index + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => moveCourse(index, -1)} disabled={index === 0} className="rounded-lg border border-[#E2CDB8] px-2 py-1 text-xs font-semibold text-[#765F4F] disabled:opacity-40" aria-label="Move up">↑</button>
                  <button onClick={() => moveCourse(index, 1)} disabled={index === draft.courses.length - 1} className="rounded-lg border border-[#E2CDB8] px-2 py-1 text-xs font-semibold text-[#765F4F] disabled:opacity-40" aria-label="Move down">↓</button>
                  <button onClick={() => patch((c) => ({ ...c, courses: c.courses.filter((_, i) => i !== index) }))} className="grid h-7 w-7 place-items-center rounded-lg text-[#B84B3D] transition hover:bg-[#F7E0D9]" aria-label="Remove course"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput label="Title" value={course.title} onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, title: v } : x)) }))} />
                <TextInput label="Category" value={course.category} placeholder="Mathematics" onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, category: v } : x)) }))} />
                <TextInput
                  label="Course / lesson link"
                  value={course.url}
                  placeholder="https://youtube.com/watch?v=… or any platform page"
                  onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, url: v, platform: guessPlatform(v) } : x)) }))}
                />
                <TextInput label="Platform label" value={course.platform} onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, platform: v } : x)) }))} />
                <div className="lg:col-span-2">
                  <TextArea label="Description" rows={2} value={course.description} onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, description: v } : x)) }))} />
                </div>
                <div className="lg:col-span-2">
                  <ImageInput
                    label="Card image (optional)"
                    value={course.imageUrl}
                    hint="Optional. When blank, the platform label chip is shown instead."
                    onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, imageUrl: v } : x)) }))}
                    onUploading={setUploadingImage}
                  />
                </div>
              </div>
            </div>
          ))}
          {draft.courses.length < 40 && (
            <button
              onClick={() => patch((c) => ({ ...c, courses: [...c.courses, emptyCourse()] }))}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#A9BF87] px-4 py-2.5 text-sm font-semibold text-[#4B6B3C] transition hover:bg-[#F7EFE3]"
            >
              <Plus size={15} /> Add course link
            </button>
          )}
        </SectionCard>

        <SectionCard number="6" title="Final call-to-action" hint="The green band before the footer. Keep the ask simple — usually a single 'Create account' button.">
          <TextInput label="Heading" value={draft.cta.heading} onChange={(v) => patch((c) => ({ ...c, cta: { ...c.cta, heading: v } }))} />
          <TextArea label="Body" rows={2} value={draft.cta.body} onChange={(v) => patch((c) => ({ ...c, cta: { ...c.cta, body: v } }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Button label" value={draft.cta.buttonLabel} onChange={(v) => patch((c) => ({ ...c, cta: { ...c.cta, buttonLabel: v } }))} />
            <TextInput label="Button link" value={draft.cta.buttonHref} onChange={(v) => patch((c) => ({ ...c, cta: { ...c.cta, buttonHref: v } }))} />
          </div>
        </SectionCard>

        <SectionCard number="7" title="Footer" hint="Small print at the bottom of every page: accreditation line and an optional contact email.">
          <TextInput label="Tagline" value={draft.footer.tagline} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, tagline: v } }))} />
          <TextInput label="Contact email (optional)" value={draft.footer.contactEmail ?? ""} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, contactEmail: v || null } }))} />
        </SectionCard>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-2 pb-10">
        <button onClick={() => setPreview(true)} className="flex items-center gap-2 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#765F4F] transition hover:border-[#A9BF87]">
          <Eye size={15} /> Preview
        </button>
        <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#3B241A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A84A22] disabled:opacity-60">
          <Save size={15} /> {saving ? "Saving…" : "Save draft"}
        </button>
        <button onClick={publish} disabled={publishing} className="flex items-center gap-2 rounded-xl bg-[#FFC857] px-4 py-2.5 text-sm font-semibold text-[#1A1512] shadow-[0_4px_0_#2A1D16] transition hover:bg-[#FFC857] disabled:opacity-60">
          <Send size={15} /> {publishing ? "Publishing…" : "Publish to live site"}
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#1A1512]/70 backdrop-blur-sm">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#3B241A] px-5 py-3 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold"><Eye size={15} /> Live preview — this is exactly what visitors see</div>
            <button onClick={() => setPreview(false)} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20">
              <X size={14} /> Close preview
            </button>
          </div>
          <div className="mx-auto max-w-[1180px] pb-16">
            <LandingPage content={draft} />
          </div>
        </div>
      )}
    </div>
  );
}