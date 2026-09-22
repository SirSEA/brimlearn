import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { defaultLandingContent, type LandingContent } from "@shared/site";
import { api } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrimMark } from "@/components/layout/BrimMark";
import { roleHomePath } from "@/lib/roles";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, ExternalLink, Globe, GraduationCap, Play, ShieldCheck, Sparkles, Timer } from "lucide-react";

function platformIcon(platform: string) {
  return /youtube/i.test(platform) ? Play : /www\.|website|academy|bitesize|edpuzzle|classroom/i.test(platform) ? BookOpen : Globe;
}

export function LandingPage({ content }: { content: LandingContent }) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-course-card]");
    const step = (card?.offsetWidth ?? 320) + 20;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f5f7f2] text-[#183c31]">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#123d30]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-left" aria-label={content.brand.name}>
            <BrimMark />
          </button>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#c4ded0] md:flex">
            <a href="#features" className="transition hover:text-white">Why BrimLearn</a>
            <a href="#courses" className="transition hover:text-white">Courses & lessons</a>
            <a href="#about" className="transition hover:text-white">About</a>
          </nav>
          <div className="flex items-center gap-2.5">
            {authLoading ? null : user ? (
              <button
                onClick={() => setLocation(roleHomePath(user.role))}
                className="flex items-center gap-1.5 rounded-full bg-[#d8f36a] px-4 py-2 text-sm font-semibold text-[#133d2f] transition hover:bg-[#e1fa8c]"
              >
                Open my dashboard <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setLocation("/login")}
                  className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#c4ded0] transition hover:bg-white/10 hover:text-white sm:block"
                >
                  Sign in
                </button>
                <button
                  onClick={() => setLocation("/signup")}
                  className="rounded-full bg-[#d8f36a] px-4 py-2 text-sm font-semibold text-[#133d2f] transition hover:bg-[#e1fa8c]"
                >
                  Start learning free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#123d30] text-white">
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]">
              <Sparkles size={13} /> {content.hero.eyebrow}
            </div>
            <h1 className="font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[56px]">{content.hero.headline}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#c4ded0]">{content.hero.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={content.hero.primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#d8f36a] px-6 py-3 text-sm font-semibold text-[#133d2f] shadow-[0_6px_0_#0c3428] transition hover:bg-[#e1fa8c]"
              >
                {content.hero.primaryCtaLabel} <ArrowRight size={15} />
              </a>
              <a
                href={content.hero.secondaryCtaHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {content.hero.secondaryCtaLabel}
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-4 text-xs font-semibold text-[#82a79a]">
              <span className="inline-flex items-center gap-1.5"><Timer size={13} /> 10-minute daily practice</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap size={13} /> JSS1 – SS3</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Curriculum-aligned</span>
            </div>
          </div>
          <div className="relative z-10 hidden items-center justify-center lg:flex">
            {content.hero.imageUrl ? (
              <img src={content.hero.imageUrl} alt="" className="h-[380px] w-full rounded-[32px] object-cover shadow-[0_30px_80px_rgba(0,0,0,.35)]" />
            ) : (
              <div className="relative h-[340px] w-full overflow-hidden rounded-[32px] bg-[#1b4f3f]">
                <div className="absolute -right-14 -top-10 h-60 w-60 rounded-full border-[26px] border-[#c9e95b]/20" />
                <div className="absolute -bottom-20 right-10 h-60 w-60 rounded-full border-[40px] border-[#c9e95b]/10" />
                <div className="absolute bottom-8 left-8 rounded-[22px] bg-[#d8f36a] p-6 text-[#133d2f] shadow-xl">
                  <div className="font-display text-3xl font-semibold tracking-[-0.04em]">Practice in small, steady steps</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#31502f]">JSS1 · Maths · Week 2</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34775e]">Why BrimLearn</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Everything is built for one thing: practice that lasts.</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.features.map((feature, index) => (
            <div key={index} className="rounded-[24px] border border-[#e2e8df] bg-white p-6">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#edf1e9] text-[#2f7a57]">
                {index % 2 === 0 ? <Sparkles size={17} /> : <BookOpen size={17} />}
              </div>
              <div className="mt-4 font-display text-lg font-semibold tracking-[-0.03em]">{feature.heading}</div>
              <p className="mt-2 text-sm leading-6 text-[#648075]">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Courses & lessons */}
      <section id="courses" className="bg-[#eef2eb] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34775e]">Courses & lessons</div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Explore hand-picked lessons and courses.</h2>
              <p className="mt-3 text-sm leading-6 text-[#648075]">
                Every card links out to a real lesson — a video, a course, or an exercise on another trusted platform.
              </p>
              <p className="mt-2 rounded-xl bg-[#d8f36a]/40 px-3 py-2 text-xs leading-5 text-[#40602a]">
                These entries are managed by your school admin from the Website tab in the admin console — badges for admins.
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button onClick={() => scrollByCard(-1)} aria-label="Previous courses" className="grid h-10 w-10 place-items-center rounded-full border border-[#d3dcd0] bg-white text-[#527064] transition hover:border-[#99bda8] hover:text-[#25483c]"><ChevronLeft size={18} /></button>
              <button onClick={() => scrollByCard(1)} aria-label="Next courses" className="grid h-10 w-10 place-items-center rounded-full border border-[#d3dcd0] bg-white text-[#527064] transition hover:border-[#99bda8] hover:text-[#25483c]"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div ref={carouselRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:thin]" style={{ scrollbarWidth: "thin" }}>
            {content.courses.map((course) => {
              const Icon = platformIcon(course.platform);
              return (
                <a
                  key={course.id}
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-course-card
                  className="group block w-[290px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-[#dfe5d9] bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(24,80,63,.12)]"
                >
                  <div className="flex h-32 items-center justify-center bg-[#e9f0e6]">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#527064]"><Icon size={13} /> {course.platform}</span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#34775e]">
                      <span>{course.category}</span>
                      {course.imageUrl && <span className="inline-flex items-center gap-1 text-[#8aa096]"><Icon size={11} /> {course.platform}</span>}
                    </div>
                    <div className="mt-2 font-display text-lg font-semibold leading-snug tracking-[-0.03em]">{course.title}</div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#648075]">{course.description}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#2f7a57] group-hover:underline">
                      Open lesson <ExternalLink size={13} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            {content.about.imageUrl ? (
              <img src={content.about.imageUrl} alt={content.about.heading} className="h-[320px] w-full rounded-[28px] object-cover" />
            ) : (
              <div className="grid h-[320px] place-items-center rounded-[28px] bg-[#123d30] text-center">
                <div className="px-8">
                  <BrimMark />
                  <div className="mt-6 text-sm leading-7 text-[#c4ded0]">{content.brand.tagline}</div>
                </div>
              </div>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34775e]">About {content.brand.name}</div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{content.about.heading}</h2>
            <p className="mt-4 text-base leading-7 text-[#527064]">{content.about.body}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["BECE", "WAEC", "NECO", "JAMB"].map((exam) => (
                <span key={exam} className="rounded-full border border-[#d8e0d5] bg-white px-3 py-1.5 text-xs font-semibold text-[#34775e]">{exam}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="relative overflow-hidden rounded-[32px] bg-[#d8f36a] px-6 py-12 text-[#133d2f] sm:px-12">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/20" />
          <h2 className="font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{content.cta.heading}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#31502f]">{content.cta.body}</p>
          <a href={content.cta.buttonHref} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#173f31] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#286b51]">
            {content.cta.buttonLabel} <ArrowUpRight size={15} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#123d30] text-[#c4ded0]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <BrimMark />
            <p className="mt-4 text-xs leading-6 text-[#82a79a]">{content.footer.tagline}</p>
            {content.footer.contactEmail && (
              <p className="mt-2 text-xs text-[#82a79a]">Contact: <span className="font-semibold text-[#c4ded0]">{content.footer.contactEmail}</span></p>
            )}
          </div>
          <div className="flex gap-14 text-sm">
            <div className="flex flex-col gap-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#82a79a]">Product</div>
              <a href="#features" className="transition hover:text-white">Why BrimLearn</a>
              <a href="#courses" className="transition hover:text-white">Courses</a>
              <a href="#about" className="transition hover:text-white">About</a>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#82a79a]">Account</div>
              <button onClick={() => setLocation("/login")} className="text-left transition hover:text-white">Sign in</button>
              <button onClick={() => setLocation("/signup")} className="text-left transition hover:text-white">Create account</button>
              <button onClick={() => setLocation("/admin/login")} className="flex items-center gap-1 text-left transition hover:text-white">Admin console <ArrowUpRight size={12} /></button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#82a79a]">
          BrimLearn · JSS1 – SS3 · learner · parent · tutor
        </div>
      </footer>
    </div>
  );
}

export default function Landing() {
  const [content, setContent] = useState<LandingContent>(defaultLandingContent());

  useEffect(() => {
    let mounted = true;
    api.getSiteContent().then((doc) => {
      if (mounted && doc?.content) setContent(doc.content);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return <LandingPage content={content} />;
}