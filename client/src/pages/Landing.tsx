import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { defaultLandingContent, type LandingContent } from "@shared/site";
import { api } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrimMark } from "@/components/layout/BrimMark";
import { ContactForm } from "@/features/contact/ContactForm";
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
    <div className="min-h-screen bg-[#F7EFE3] text-[#1A1512]">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#3B241A]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-left" aria-label={content.brand.name}>
            <BrimMark />
          </button>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#F3E5D5] md:flex">
            <a href="#features" className="transition hover:text-white">Why BrimLearn</a>
            <a href="#courses" className="transition hover:text-white">Courses & lessons</a>
            <a href="#contact" className="transition hover:text-white">About & contact</a>
          </nav>
          <div className="flex items-center gap-2.5">
            {authLoading ? null : user ? (
              <button
                onClick={() => setLocation(roleHomePath(user.role))}
                className="flex items-center gap-1.5 rounded-full bg-[#FFC857] px-4 py-2 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857]"
              >
                Open my dashboard <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setLocation("/login")}
                  className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#F3E5D5] transition hover:bg-white/10 hover:text-white sm:block"
                >
                  Sign in
                </button>
                <button
                  onClick={() => setLocation("/signup")}
                  className="rounded-full bg-[#FFC857] px-4 py-2 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857]"
                >
                  Start learning free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#3B241A] text-white">
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
              <Sparkles size={13} /> {content.hero.eyebrow}
            </div>
            <h1 className="font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[56px]">{content.hero.headline}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#D9C4B0]">{content.hero.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={content.hero.primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#FFC857] px-6 py-3 text-sm font-semibold text-[#1A1512] shadow-[0_6px_0_#2A1D16] transition hover:bg-[#FFC857]"
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
            <div className="mt-9 flex flex-wrap gap-4 text-xs font-semibold text-[#E7D8C8]">
              <span className="inline-flex items-center gap-1.5"><Timer size={13} /> 10-minute daily practice</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap size={13} /> JSS1 – SS3</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Curriculum-aligned</span>
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-center">
            {content.hero.imageUrl ? (
              <img src={content.hero.imageUrl} alt="" className="h-[380px] w-full rounded-[32px] object-cover shadow-[0_30px_80px_rgba(0,0,0,.35)]" />
            ) : (
              <div className="relative h-[340px] w-full overflow-hidden rounded-[32px] bg-[#3B241A]">
                <div className="absolute -right-14 -top-10 h-60 w-60 rounded-full border-[26px] border-[#E3A72F]/20" />
                <div className="absolute -bottom-20 right-10 h-60 w-60 rounded-full border-[40px] border-[#E3A72F]/10" />
                <div className="absolute bottom-8 left-8 rounded-[22px] bg-[#FFC857] p-6 text-[#1A1512] shadow-xl">
                  <div className="font-display text-3xl font-semibold tracking-[-0.04em]">Practice in small, steady steps</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A1512]">JSS1 · Maths · Week 2</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">Why BrimLearn</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Everything is built for one thing: practice that lasts.</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.features.map((feature, index) => (
            <div key={index} className="overflow-hidden rounded-[24px] border border-[#E2CDB8] bg-[#FFFDF8]">
              {feature.imageUrl && (
                <div className="h-28 w-full overflow-hidden bg-[#F3E9DE]">
                  <img src={feature.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#F3E9DE] text-[#4B6B3C]">
                  {index % 2 === 0 ? <Sparkles size={17} /> : <BookOpen size={17} />}
                </div>
                <div className="mt-4 font-display text-lg font-semibold tracking-[-0.03em]">{feature.heading}</div>
                <p className="mt-2 text-sm leading-6 text-[#765F4F]">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Courses & lessons */}
      <section id="courses" className="bg-[#F3E9DE] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">Courses & lessons</div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Explore hand-picked lessons and courses.</h2>
              <p className="mt-3 text-sm leading-6 text-[#765F4F]">
                Every card links out to a real lesson — a video, a course, or an exercise on another trusted platform.
              </p>
              <p className="mt-2 rounded-xl bg-[#FFC857]/40 px-3 py-2 text-xs leading-5 text-[#5A7A40]">
                These entries are managed by your school admin from the Website tab in the admin console — badges for admins.
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button onClick={() => scrollByCard(-1)} aria-label="Previous courses" className="grid h-10 w-10 place-items-center rounded-full border border-[#E6D6BF] bg-[#FFFDF8] text-[#765F4F] transition hover:border-[#A9BF87] hover:text-[#3B241A]"><ChevronLeft size={18} /></button>
              <button onClick={() => scrollByCard(1)} aria-label="Next courses" className="grid h-10 w-10 place-items-center rounded-full border border-[#E6D6BF] bg-[#FFFDF8] text-[#765F4F] transition hover:border-[#A9BF87] hover:text-[#3B241A]"><ChevronRight size={18} /></button>
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
                  className="group block w-[290px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-[#E2CDB8] bg-[#FFFDF8] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(50,28,20,.12)]"
                >
                  <div className="flex h-32 items-center justify-center bg-[#F3E9DE]">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center gap-2 rounded-full bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-semibold text-[#765F4F]"><Icon size={13} /> {course.platform}</span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4B6B3C]">
                      <span>{course.category}</span>
                      {course.imageUrl && <span className="inline-flex items-center gap-1 text-[#A08A75]"><Icon size={11} /> {course.platform}</span>}
                    </div>
                    <div className="mt-2 font-display text-lg font-semibold leading-snug tracking-[-0.03em]">{course.title}</div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#765F4F]">{course.description}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#4B6B3C] group-hover:underline">
                      Open lesson <ExternalLink size={13} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact us & About */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <ContactForm />
          </div>
          <div className="order-1 lg:order-2">
            <div className="rounded-[28px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-8">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">About {content.brand.name}</div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{content.about.heading}</h2>
              <p className="mt-4 text-base leading-7 text-[#765F4F]">{content.about.body}</p>
              {content.about.imageUrl && <img src={content.about.imageUrl} alt={content.about.heading} className="mt-6 h-56 w-full rounded-[24px] object-cover" />}
              <div className="mt-7 flex flex-wrap gap-2">
                {["BECE", "WAEC", "NECO", "JAMB"].map((exam) => (
                  <span key={exam} className="rounded-full border border-[#E2CDB8] bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#4B6B3C]">{exam}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="relative overflow-hidden rounded-[32px] bg-[#FFC857] px-6 py-12 text-[#1A1512] sm:px-12">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/20" />
          <h2 className="font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{content.cta.heading}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#1A1512]">{content.cta.body}</p>
          <a href={content.cta.buttonHref} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#C65A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22]">
            {content.cta.buttonLabel} <ArrowUpRight size={15} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#3B241A] text-[#EDDED0]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <BrimMark />
            <p className="mt-4 text-xs leading-6 text-[#D9C4B0]">{content.footer.tagline}</p>
            {content.footer.contactEmail && (
              <p className="mt-2 text-xs text-[#D9C4B0]">Contact: <span className="font-semibold text-[#F3E5D5]">{content.footer.contactEmail}</span></p>
            )}
          </div>
          <div className="flex gap-14 text-sm">
            <div className="flex flex-col gap-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D9C4B0]">Product</div>
              <a href="#features" className="transition hover:text-white">Why BrimLearn</a>
              <a href="#courses" className="transition hover:text-white">Courses</a>
              <a href="#contact" className="transition hover:text-white">About & contact</a>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D9C4B0]">Account</div>
              <button onClick={() => setLocation("/login")} className="text-left transition hover:text-white">Sign in</button>
              <button onClick={() => setLocation("/signup")} className="text-left transition hover:text-white">Create account</button>
              <button onClick={() => setLocation("/admin/login")} className="flex items-center gap-1 text-left transition hover:text-white">Admin console <ArrowUpRight size={12} /></button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D9C4B0]">
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