import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { defaultLandingContent, type LandingContent, type SiteContentDoc } from "@shared/site";
import { ApiUnavailableError, api } from "@/_core/api";
import { LandingPage } from "@/pages/Landing";
import { ArrowRight, Check, Eye, Globe, Image as ImageIcon, Info, Link2, Plus, RotateCcw, Save, Send, Sparkles, Trash2, X } from "lucide-react";
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
    <section id={`editor-${number}`} className="rounded-[24px] border border-[#e2e8df] bg-white p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#123d30] text-[11px] font-bold text-[#d8f36a]">{number}</span>
        <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{title}</h3>
      </div>
      <div className="mb-5 rounded-xl bg-[#f3f6f1] px-3.5 py-2.5 text-xs leading-5 text-[#648075]">{hint}</div>
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
      <span className="text-xs font-semibold text-[#527064]">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#e1e8df] bg-white px-3.5 py-2.5 text-sm font-medium text-[#25483c] outline-none transition focus:border-[#6b9f88] focus:ring-2 focus:ring-[#d8f36a]/40"
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-[#9aaca2]">{hint}</span>}
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
      <span className="text-xs font-semibold text-[#527064]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full resize-y rounded-xl border border-[#e1e8df] bg-white px-3.5 py-2.5 text-sm font-medium text-[#25483c] outline-none transition focus:border-[#6b9f88] focus:ring-2 focus:ring-[#d8f36a]/40"
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

export function SiteEditor() {
  const [doc, setDoc] = useState<SiteContentDoc | null>(null);
  const [draft, setDraft] = useState<LandingContent>(defaultLandingContent());
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34775e]">
            <Globe size={13} /> Website editor
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">Edit the public landing page</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#648075]">
            Each section below updates a different part of the landing page. Save a draft, preview exactly what visitors see, then publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", doc?.status === "published" ? "bg-[#e5f5ed] text-[#2f7a57]" : "bg-[#fff5d6] text-[#8a6d1f]")}>
            {doc?.status === "published" ? "Live website" : "Unpublished draft"}
          </span>
          {doc?.previous && (
            <button onClick={revert} className="flex items-center gap-1.5 rounded-full border border-[#e1e8df] bg-white px-3 py-1.5 text-xs font-semibold text-[#527064] transition hover:border-[#99bda8] hover:text-[#25483c]">
              <RotateCcw size={13} /> Revert
            </button>
          )}
        </div>
      </div>

      {doc && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#8aa096]">
          <span>Updated: {new Date(doc.updatedAt).toLocaleString()}</span>
          <span>by {doc.updatedByName ?? "system"}</span>
          {doc.publishedAt && <span>Published {new Date(doc.publishedAt).toLocaleString()}</span>}
        </div>
      )}

      <div className="sticky top-2 z-30 mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dfe5d9] bg-white/95 p-2 backdrop-blur">
        <button onClick={() => setPreview(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#123d30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#286b51]">
          <Eye size={15} /> Preview landing page
        </button>
        <button
          onClick={saveDraft}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-[#123d30] px-4 py-2.5 text-sm font-semibold text-[#123d30] transition hover:bg-[#edf1e9] disabled:opacity-60"
        >
          <Save size={15} /> {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={publish}
          disabled={publishing}
          className="flex items-center gap-2 rounded-xl bg-[#d8f36a] px-4 py-2.5 text-sm font-semibold text-[#133d2f] shadow-[0_4px_0_#0c3428] transition hover:bg-[#e1fa8c] disabled:opacity-60"
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
          <TextInput
            label="Hero image URL"
            value={draft.hero.imageUrl ?? ""}
            placeholder="https://… (publicly accessible image)"
            hint="Optional. When blank, a built-in graphic is shown instead."
            onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, imageUrl: v || null } }))}
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
          <TextInput label="About image URL" value={draft.about.imageUrl ?? ""} onChange={(v) => patch((c) => ({ ...c, about: { ...c.about, imageUrl: v || null } }))} />
        </SectionCard>

        <SectionCard number="4" title="Feature cards" hint="The four cards under “Why BrimLearn”. Pick the three or four features you want to lead with.">
          {draft.features.map((feature, index) => (
            <div key={index} className="rounded-2xl border border-[#edf1e9] bg-[#fbfcf9] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-[#34775e]">Card {index + 1}</span>
                <button
                  onClick={() => patch((c) => ({ ...c, features: c.features.filter((_, i) => i !== index) }))}
                  className="grid h-7 w-7 place-items-center rounded-lg text-[#c0564a] transition hover:bg-[#fbe1dc]"
                  aria-label={`Remove card ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput label="Heading" value={feature.heading} onChange={(v) => patch((c) => ({ ...c, features: c.features.map((f, i) => (i === index ? { ...f, heading: v } : f)) }))} />
                <TextArea label="Body" rows={2} value={feature.body} onChange={(v) => patch((c) => ({ ...c, features: c.features.map((f, i) => (i === index ? { ...f, body: v } : f)) }))} />
              </div>
            </div>
          ))}
          {draft.features.length < 8 && (
            <button
              onClick={() => patch((c) => ({ ...c, features: [...c.features, { heading: "New feature", body: "Describe the benefit in one or two sentences.", imageUrl: null }] }))}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#99bda8] px-4 py-2.5 text-sm font-semibold text-[#34775e] transition hover:bg-[#f3f6f1]"
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
              <span className="flex items-center gap-1.5 font-semibold text-[#40602a]"><Info size={13} /> Requirements for course links</span>
              Each entry must point to a real, open lesson — a YouTube video/playlist, a course page, or an exercise on a trusted platform (Khan Academy, BBC Bitesize, etc.). The link opens in a new tab. Keep the title short, the description one or two sentences, and pick a category (e.g. Mathematics). Platforms are auto-labelled from the link, and links work best when they don't require a login.
            </span>
          }
        >
          {draft.courses.map((course, index) => (
            <div key={course.id} className="rounded-2xl border border-[#edf1e9] bg-[#fbfcf9] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#34775e]"><ImageIcon size={13} /> Course {index + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => moveCourse(index, -1)} disabled={index === 0} className="rounded-lg border border-[#dfe5d9] px-2 py-1 text-xs font-semibold text-[#527064] disabled:opacity-40" aria-label="Move up">↑</button>
                  <button onClick={() => moveCourse(index, 1)} disabled={index === draft.courses.length - 1} className="rounded-lg border border-[#dfe5d9] px-2 py-1 text-xs font-semibold text-[#527064] disabled:opacity-40" aria-label="Move down">↓</button>
                  <button onClick={() => patch((c) => ({ ...c, courses: c.courses.filter((_, i) => i !== index) }))} className="grid h-7 w-7 place-items-center rounded-lg text-[#c0564a] transition hover:bg-[#fbe1dc]" aria-label="Remove course"><Trash2 size={14} /></button>
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
                  <TextInput label="Card image URL (optional)" value={course.imageUrl ?? ""} onChange={(v) => patch((c) => ({ ...c, courses: c.courses.map((x, i) => (i === index ? { ...x, imageUrl: v || null } : x)) }))} />
                </div>
              </div>
            </div>
          ))}
          {draft.courses.length < 40 && (
            <button
              onClick={() => patch((c) => ({ ...c, courses: [...c.courses, emptyCourse()] }))}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#99bda8] px-4 py-2.5 text-sm font-semibold text-[#34775e] transition hover:bg-[#f3f6f1]"
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
        <button onClick={() => setPreview(true)} className="flex items-center gap-2 rounded-xl border border-[#e1e8df] bg-white px-4 py-2.5 text-sm font-semibold text-[#527064] transition hover:border-[#99bda8]">
          <Eye size={15} /> Preview
        </button>
        <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#123d30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#286b51] disabled:opacity-60">
          <Save size={15} /> {saving ? "Saving…" : "Save draft"}
        </button>
        <button onClick={publish} disabled={publishing} className="flex items-center gap-2 rounded-xl bg-[#d8f36a] px-4 py-2.5 text-sm font-semibold text-[#133d2f] shadow-[0_4px_0_#0c3428] transition hover:bg-[#e1fa8c] disabled:opacity-60">
          <Send size={15} /> {publishing ? "Publishing…" : "Publish to live site"}
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0b241c]/70 backdrop-blur-sm">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#123d30] px-5 py-3 text-white">
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